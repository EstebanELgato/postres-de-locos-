"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Section = "productos" | "pedido" | "other";
type Scene = "peek" | "walk" | "fly" | "roll" | "hang" | "eat";

/** Frases generales que invitan a comprar. */
const MSG_GENERAL: string[] = [
  "¡Llévate 2 sabores y duplica la felicidad! 🧁🧁",
  "El Chocolate nuevo está volando… ¡pide el tuyo! 🍫",
  "Un postre hoy = un día perfecto. ¡Ordena ya! ✨",
  "¿Y si mejor pides 3? Nadie se arrepiente 😏",
  "¡Haz tu pedido ahora y endulza tu semana! 🎉",
  "Regala un postre, gana un abrazo 🥰",
  "Los mejores planes empiezan con un postre 💛",
  "Antojo detectado 🚨 ¡Corre a hacer tu pedido!"
];

/** Frases cuando el usuario está viendo los sabores. */
const MSG_PRODUCTOS: string[] = [
  "Yo pediría más de este 😋",
  "¿Y si pruebas este otro sabor? 👀",
  "Este combina delicioso con el Oreo 🍪",
  "Mmm… a mí se me antojó 🤤",
  "Agrega 2 y te sale más rico el plan 😏",
  "Este es de mis favoritos, ¡pídelo! 💛",
  "No te quedes con las ganas… ¡agrégalo! 🧁",
  "Un clásico que nunca falla 🌟"
];

/** Frases breves durante el formulario (sin molestar). */
const MSG_PEDIDO: string[] = [
  "¡Ya casi! Estás a un clic 🎉",
  "Buena elección 😉",
  "¡Yo llevo tu pedido volando! 🚀",
  "¡Gracias por pedir! 💛"
];

function pick<T>(arr: T[], not?: T): T {
  let v = arr[Math.floor(Math.random() * arr.length)];
  if (not !== undefined && arr.length > 1) while (v === not) v = arr[Math.floor(Math.random() * arr.length)];
  return v;
}

const SCENES_GENERAL: Scene[] = ["peek", "walk", "fly", "roll", "hang", "eat"];
const SCENES_PRODUCTOS: Scene[] = ["peek", "eat", "peek"]; // quieto, sugiriendo
const SCENES_PEDIDO: Scene[] = ["walk", "fly", "roll"];     // solo de paso, no molesta

const SHOW_MS = 10000;
const GAP_MS = 2000;

function currentSection(): Section {
  if (typeof window === "undefined") return "other";
  const mid = window.innerHeight / 2;
  const inMid = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top <= mid && r.bottom >= mid;
  };
  if (inMid("pedido")) return "pedido";
  if (inMid("productos")) return "productos";
  return "other";
}

export default function Mascota() {
  const [visible, setVisible] = useState(false);
  const [scene, setScene] = useState<Scene>("peek");
  const [message, setMessage] = useState(MSG_GENERAL[0]);
  const [seed, setSeed] = useState(0.5);
  const [vw, setVw] = useState(1200);
  const [dismissed, setDismissed] = useState(false);
  const reduce = useReducedMotion();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const cycle = useCallback(() => {
    setVw(window.innerWidth);
    setSeed(Math.random());
    const section = currentSection();
    const scenes = reduce
      ? ["peek" as Scene]
      : section === "productos"
        ? SCENES_PRODUCTOS
        : section === "pedido"
          ? SCENES_PEDIDO
          : SCENES_GENERAL;
    const msgs = section === "productos" ? MSG_PRODUCTOS : section === "pedido" ? MSG_PEDIDO : MSG_GENERAL;
    setScene((prev) => pick(scenes, prev));
    setMessage((prev) => pick(msgs, prev));
    setVisible(true);
    const hide = setTimeout(() => {
      setVisible(false);
      timers.current.push(setTimeout(cycle, GAP_MS));
    }, SHOW_MS);
    timers.current.push(hide);
  }, [reduce]);

  const started = useRef(false);
  useEffect(() => {
    if (dismissed) {
      clearTimers();
      setVisible(false);
      return;
    }
    if (started.current) return; // el bucle arranca una sola vez
    started.current = true;
    timers.current.push(setTimeout(cycle, 2500));
    return clearTimers;
  }, [cycle, dismissed]);

  if (dismissed) return null;

  const cross = { duration: SHOW_MS / 1000, ease: "linear" as const };
  const spring = { type: "spring" as const, stiffness: 140, damping: 16 };

  const bubble = (extra = "") => (
    <motion.div
      className={`pointer-events-auto relative max-w-[200px] rounded-2xl border border-caramel/20 bg-white px-3.5 py-2.5 text-[13px] font-bold leading-5 text-cocoa shadow-lift sm:max-w-[240px] sm:text-sm ${extra}`}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.35, type: "spring", stiffness: 260, damping: 18 }}
    >
      <button
        type="button"
        aria-label="Ocultar mascota"
        onClick={() => setDismissed(true)}
        className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-cocoa text-xs font-black text-white shadow-soft transition hover:bg-berry"
      >
        ×
      </button>
      {message}
    </motion.div>
  );

  // Personaje con halo de color detrás para que resalte sobre cualquier fondo.
  const img = () => (
    <span className="relative block h-full w-full">
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 h-[115%] w-[115%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,183,47,0.55),rgba(195,107,32,0.18)_45%,rgba(245,183,47,0)_72%)] blur-md"
      />
      <Image
        src="/images/mascota.png"
        alt="Mascota Postres de Locos"
        width={248}
        height={309}
        className="h-auto w-full drop-shadow-[0_12px_18px_rgba(50,24,8,0.30)]"
      />
    </span>
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40 select-none overflow-hidden">
      <AnimatePresence mode="wait">
        {visible && scene === "peek" ? (
          <motion.div
            key="peek"
            className="absolute bottom-0 flex items-end gap-2 p-3"
            style={{ left: `${6 + seed * 42}%` }}
            initial={{ opacity: 0, y: 150, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={spring}
          >
            <motion.div
              className="w-[92px] sm:w-[122px]"
              animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, -2.5, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              {img()}
            </motion.div>
            {bubble("mb-5")}
          </motion.div>
        ) : null}

        {visible && scene === "walk" ? (
          <motion.div
            key="walk"
            className="absolute bottom-1 flex items-end gap-2"
            initial={{ x: -240, opacity: 1 }}
            animate={{ x: vw + 60 }}
            exit={{ opacity: 0 }}
            transition={cross}
          >
            <motion.div
              className="w-[82px] sm:w-[106px]"
              animate={{ y: [0, -9, 0], rotate: [-4, 4, -4] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
            >
              {img()}
            </motion.div>
            {bubble("mb-6")}
          </motion.div>
        ) : null}

        {visible && scene === "fly" ? (
          <motion.div
            key="fly"
            className="absolute flex items-start gap-2"
            style={{ top: `${8 + seed * 12}%` }}
            initial={{ x: -260, opacity: 1 }}
            animate={{ x: vw + 60 }}
            exit={{ opacity: 0 }}
            transition={cross}
          >
            <motion.div
              className="relative w-[78px] sm:w-[102px]"
              animate={{ y: [0, -16, 0], rotate: [-7, -3, -7] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 text-3xl sm:text-4xl">🎈</span>
              <span className="absolute -top-3 left-1/2 z-10 h-4 w-px -translate-x-1/2 bg-cocoa/40" />
              {img()}
            </motion.div>
            {bubble("mt-8")}
          </motion.div>
        ) : null}

        {visible && scene === "roll" ? (
          <motion.div
            key="roll"
            className="absolute top-[3%] flex items-start gap-2"
            initial={{ x: -240, opacity: 1 }}
            animate={{ x: vw + 60 }}
            exit={{ opacity: 0 }}
            transition={cross}
          >
            <motion.div className="w-[74px] sm:w-[98px]" animate={{ rotate: 360 * 5 }} transition={cross}>
              {img()}
            </motion.div>
            {bubble("mt-4")}
          </motion.div>
        ) : null}

        {visible && scene === "hang" ? (
          <motion.div
            key="hang"
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${12 + seed * 60}%` }}
            initial={{ y: -340, opacity: 1 }}
            animate={{ y: 0 }}
            exit={{ y: -340 }}
            transition={spring}
          >
            <motion.div
              className="flex origin-top flex-col items-center"
              animate={reduce ? undefined : { rotate: [-7, 7, -7] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="h-16 w-1 rounded-b bg-caramel/70 sm:h-24" />
              <div className="flex items-start gap-2">
                <div className="w-[82px] -rotate-3 sm:w-[106px]">{img()}</div>
                {bubble("mt-6")}
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {visible && scene === "eat" ? (
          <motion.div
            key="eat"
            className="absolute bottom-0 flex items-end gap-2 p-3"
            style={{ left: `${6 + seed * 40}%` }}
            initial={{ opacity: 0, y: 120 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 120 }}
            transition={spring}
          >
            <div className="relative">
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-4xl sm:text-5xl">🪑</span>
              <motion.div
                className="relative w-[86px] rotate-3 sm:w-[110px]"
                animate={reduce ? undefined : { rotate: [3, 6, 3], y: [0, -2, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              >
                {img()}
                <motion.span
                  className="absolute -left-3 bottom-8 z-10 text-2xl sm:text-3xl"
                  animate={{ scale: [1, 0.8, 0.6, 0.4, 0.2, 0], opacity: [1, 1, 1, 1, 1, 0] }}
                  transition={{ duration: SHOW_MS / 1000 - 1, ease: "easeInOut" }}
                >
                  🍨
                </motion.span>
              </motion.div>
            </div>
            {bubble("mb-8")}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

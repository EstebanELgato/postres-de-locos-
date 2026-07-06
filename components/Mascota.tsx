"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** Mensajes que invitan a comprar. */
const MESSAGES: string[] = [
  "¡Llévate 2 sabores y duplica la felicidad! 🧁🧁",
  "El Chocolate nuevo está volando… ¡pide el tuyo! 🍫",
  "Un postre hoy = un día perfecto. ¡Ordena ya! ✨",
  "¿Y si mejor pides 3? Nadie se arrepiente 😏",
  "Arequipe cremosito te está esperando… 🤤",
  "¡Haz tu pedido ahora y endulza tu semana! 🎉",
  "Regala un postre, gana un abrazo 🥰",
  "Oreo + Mora = combo ganador. ¡Pídelos! 🍪🫐",
  "Tu antojo no se va a pedir solo 😜 ¡Dale clic!",
  "Maracuyá tropical, felicidad total. ¡Ordena! 🌴",
  "Los mejores planes empiezan con un postre 💛",
  "¡Pide para toda la familia y sé el héroe de hoy! 🦸",
  "Leche Klim: pruébalo una vez, lo pedirás siempre 🥛",
  "Antojo detectado 🚨 ¡Corre a hacer tu pedido!",
  "Limón fresquito para este calor… ¡pídelo ya! 🍋",
  "5 postres máximo por sabor… ¡reta el límite! 😎"
];

type Scene = "peek" | "walk" | "fly" | "roll" | "hang" | "eat";
const SCENES: Scene[] = ["peek", "walk", "fly", "roll", "hang", "eat"];

function pick<T>(arr: T[], not?: T): T {
  let v = arr[Math.floor(Math.random() * arr.length)];
  if (not !== undefined && arr.length > 1) {
    while (v === not) v = arr[Math.floor(Math.random() * arr.length)];
  }
  return v;
}

const SHOW_MS = 10000;
const GAP_MS = 2200;

export default function Mascota() {
  const [visible, setVisible] = useState(false);
  const [scene, setScene] = useState<Scene>("peek");
  const [message, setMessage] = useState(MESSAGES[0]);
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
    setScene((prev) => (reduce ? "peek" : pick(SCENES, prev)));
    setMessage((prev) => pick(MESSAGES, prev));
    setVisible(true);
    const hide = setTimeout(() => {
      setVisible(false);
      timers.current.push(setTimeout(cycle, GAP_MS));
    }, SHOW_MS);
    timers.current.push(hide);
  }, [reduce]);

  useEffect(() => {
    if (dismissed) {
      clearTimers();
      setVisible(false);
      return;
    }
    timers.current.push(setTimeout(cycle, 2500));
    return clearTimers;
  }, [cycle, dismissed]);

  if (dismissed) return null;

  const cross = { duration: SHOW_MS / 1000, ease: "linear" as const };
  const spring = { type: "spring" as const, stiffness: 140, damping: 16 };

  const bubble = (extra = "") => (
    <motion.div
      className={`pointer-events-auto relative max-w-[200px] rounded-2xl border border-caramel/15 bg-white px-3.5 py-2.5 text-[13px] font-bold leading-5 text-cocoa shadow-lift sm:max-w-[240px] sm:text-sm ${extra}`}
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

  const img = (w: number) => (
    <Image
      src="/images/mascota.png"
      alt="Mascota Postres de Locos"
      width={248}
      height={322}
      className="h-auto w-full drop-shadow-[0_14px_20px_rgba(50,24,8,0.28)]"
      style={{ width: "100%" }}
      sizes={`${w}px`}
    />
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40 select-none overflow-hidden">
      <AnimatePresence>
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
              className="w-[88px] sm:w-[116px]"
              animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, -2.5, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              {img(116)}
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
              className="w-[80px] sm:w-[104px]"
              animate={{ y: [0, -9, 0], rotate: [-4, 4, -4] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
            >
              {img(104)}
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
              className="relative w-[76px] sm:w-[100px]"
              animate={{ y: [0, -16, 0], rotate: [-7, -3, -7] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 text-3xl sm:text-4xl">🎈</span>
              <span className="absolute -top-3 left-1/2 h-4 w-px -translate-x-1/2 bg-cocoa/40" />
              {img(100)}
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
            <motion.div
              className="w-[72px] sm:w-[96px]"
              animate={{ rotate: 360 * 5 }}
              transition={cross}
            >
              {img(96)}
            </motion.div>
            {bubble("mt-4")}
          </motion.div>
        ) : null}

        {visible && scene === "hang" ? (
          <motion.div
            key="hang"
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${12 + seed * 60}%` }}
            initial={{ y: -320, opacity: 1 }}
            animate={{ y: 0 }}
            exit={{ y: -320 }}
            transition={spring}
          >
            <motion.div
              className="flex origin-top flex-col items-center"
              animate={reduce ? undefined : { rotate: [-7, 7, -7] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="h-16 w-1 rounded-b bg-caramel/70 sm:h-24" />
              <div className="flex items-start gap-2">
                <div className="w-[80px] -rotate-3 sm:w-[104px]">{img(104)}</div>
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
                className="relative w-[84px] rotate-3 sm:w-[108px]"
                animate={reduce ? undefined : { rotate: [3, 6, 3], y: [0, -2, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              >
                {img(108)}
                <motion.span
                  className="absolute -left-3 bottom-8 text-2xl sm:text-3xl"
                  animate={{ scale: [1, 0.85, 0.7, 0.55, 0.4, 0.2, 0], opacity: [1, 1, 1, 1, 1, 1, 0] }}
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

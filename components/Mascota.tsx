"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** Mensajes aleatorios: promos de sabores, sugerencias y palabras agradables. */
const MESSAGES: string[] = [
  "¿Ya probaste el nuevo sabor Chocolate? 🍫",
  "¡Tienes un gusto increíble! 😍",
  "El de Arequipe está para chuparse los dedos 🤤",
  "¡Hoy es un buen día para un postre! 🧁",
  "¿Un antojito? Yo te acompaño 😋",
  "El Maracuyá es puro sabor tropical 🌴",
  "Te ves genial eligiendo postres 💛",
  "Pssst… el Oreo es un clásico que no falla 🍪",
  "¡Gracias por visitarnos! Eres lo máximo ✨",
  "¿Mora o Limón? ¡Los dos son deliciosos! 🫐🍋",
  "Date ese gusto, te lo mereces 🥰",
  "Leche Klim: cremosito y perfecto 🥛",
  "¡Haz tu pedido y yo lo celebro por ti! 🎉",
  "Un postre siempre es buena idea 💫",
  "¡Se me antojó a mí también! 😅"
];

function pickMessage(exclude: string): string {
  let next = exclude;
  while (next === exclude && MESSAGES.length > 1) {
    next = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  }
  return next;
}

export default function Mascota() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  const [dismissed, setDismissed] = useState(false);
  const reduce = useReducedMotion();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const cycle = useCallback(() => {
    setMessage((prev) => pickMessage(prev));
    setVisible(true);
    const hide = setTimeout(() => {
      setVisible(false);
      const gap = 12000 + Math.random() * 9000; // 12-21s oculto
      const again = setTimeout(cycle, gap);
      timers.current.push(again);
    }, 8000); // 8s visible
    timers.current.push(hide);
  }, []);

  useEffect(() => {
    if (dismissed) {
      clearTimers();
      setVisible(false);
      return;
    }
    const first = setTimeout(cycle, 3500);
    timers.current.push(first);
    return clearTimers;
  }, [cycle, dismissed]);

  if (dismissed) return null;

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 z-40 select-none">
      <AnimatePresence>
        {visible ? (
          <motion.div
            className="flex items-end gap-2 p-3 sm:gap-3 sm:p-4"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 140, rotate: -6 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, rotate: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 140, rotate: -4 }}
            transition={{ type: "spring", stiffness: 140, damping: 16 }}
          >
            {/* Personaje con leve balanceo idle */}
            <motion.div
              className="relative w-[92px] shrink-0 drop-shadow-[0_14px_20px_rgba(50,24,8,0.28)] sm:w-[124px]"
              animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, -2.5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src="/images/mascota.png"
                alt="Mascota Postres de Locos"
                width={248}
                height={322}
                className="h-auto w-full"
              />
            </motion.div>

            {/* Globo de mensaje */}
            <motion.div
              className="pointer-events-auto relative mb-4 max-w-[220px] rounded-2xl rounded-bl-sm border border-caramel/15 bg-white px-4 py-3 text-sm font-bold leading-5 text-cocoa shadow-lift sm:max-w-[260px]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, x: -8 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.22, type: "spring", stiffness: 260, damping: 18 }}
            >
              {/* Colita del globo apuntando al personaje */}
              <span className="absolute -left-1.5 bottom-3 h-3 w-3 rotate-45 border-b border-l border-caramel/15 bg-white" />
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

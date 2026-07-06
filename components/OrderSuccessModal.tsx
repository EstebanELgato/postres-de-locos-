"use client";

import { AnimatePresence, motion } from "framer-motion";

type OrderSuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const confetti = [
  { left: "12%", top: "22%", color: "bg-honey", delay: 0 },
  { left: "25%", top: "14%", color: "bg-berry", delay: 0.08 },
  { left: "36%", top: "28%", color: "bg-caramel", delay: 0.16 },
  { left: "54%", top: "12%", color: "bg-pistachio", delay: 0.04 },
  { left: "68%", top: "24%", color: "bg-honey", delay: 0.12 },
  { left: "82%", top: "18%", color: "bg-berry", delay: 0.2 },
  { left: "18%", top: "72%", color: "bg-pistachio", delay: 0.18 },
  { left: "78%", top: "70%", color: "bg-caramel", delay: 0.1 }
];

export default function OrderSuccessModal({ isOpen, onClose }: OrderSuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto overscroll-contain bg-cocoa/60 px-4 pb-10 pt-6 backdrop-blur-sm sm:items-center sm:py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-success-title"
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-honey/25 bg-cream p-6 text-center shadow-[0_30px_90px_rgba(50,24,8,0.32)] sm:p-8"
            initial={{ opacity: 0, scale: 0.88, y: 34 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 18 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
          >
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-honey/30 to-transparent" />

            {confetti.map((particle, index) => (
              <motion.span
                key={`${particle.left}-${particle.top}`}
                className={`absolute h-2.5 w-2.5 rounded-full ${particle.color}`}
                style={{ left: particle.left, top: particle.top }}
                initial={{ opacity: 0, y: -8, scale: 0.4, rotate: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [-8, 18, 36, 46],
                  scale: [0.4, 1, 0.9, 0.4],
                  rotate: [0, 80, 160, 240]
                }}
                transition={{
                  duration: 1.8,
                  delay: particle.delay,
                  repeat: 1,
                  repeatDelay: 0.2,
                  ease: "easeOut"
                }}
                aria-hidden="true"
              />
            ))}

            <motion.div
              className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-pistachio shadow-soft ring-8 ring-honey/20"
              initial={{ scale: 0.35, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.08 }}
            >
            <motion.svg
              viewBox="0 0 64 64"
              className="h-14 w-14"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M18 33.5 28 43l19-22"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.58, delay: 0.2, ease: "easeOut" }}
              />
            </motion.svg>
            </motion.div>

            <div className="relative mt-7">
              <h2 id="order-success-title" className="font-display text-3xl font-black leading-tight text-cocoa sm:text-4xl">
                ¡Tu pedido se ha realizado exitosamente!
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base leading-7 text-cocoa/75 sm:text-lg">
                Gracias por confiar en nosotros. Muy pronto prepararemos tu pedido con mucho amor.
              </p>
            </div>

            <motion.button
              type="button"
              onClick={onClose}
              className="motion-button relative mt-8 inline-flex w-full items-center justify-center rounded-full bg-berry px-8 py-4 text-base font-black text-white shadow-glow transition hover:bg-caramel sm:w-auto"
              whileTap={{ scale: 0.97 }}
            >
              Cerrar
            </motion.button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

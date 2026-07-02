"use client";

import { motion } from "framer-motion";

export default function DeliveryNotice() {
  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-20 z-30 mx-auto flex w-[calc(100%-2rem)] max-w-2xl justify-center px-2 sm:top-24"
      initial={{ opacity: 0, y: -18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 18, delay: 0.55 }}
    >
      <motion.div
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-[#7a3b12]/40 bg-gradient-to-r from-[#5b2c0e] via-[#7a3b12] to-[#3c1d08] px-5 py-3 text-center text-sm font-black text-honey shadow-soft backdrop-blur sm:px-7 sm:text-base"
        animate={{ y: [0, -6, 0], scale: [1, 1.03, 1], boxShadow: [
          "0 18px 55px rgba(50, 24, 8, 0.18)",
          "0 26px 75px rgba(123, 59, 18, 0.42)",
          "0 18px 55px rgba(50, 24, 8, 0.18)"
        ] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-lg">🍫</span>
        ¡Nuevo sabor de postre: CHOCOLATE!
        <span className="text-lg">🍫</span>
      </motion.div>
    </motion.div>
  );
}

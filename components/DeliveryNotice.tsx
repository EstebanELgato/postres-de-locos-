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
        className="pointer-events-auto rounded-full border border-honey/40 bg-white/95 px-4 py-3 text-center text-sm font-black text-cocoa shadow-soft backdrop-blur sm:px-6 sm:text-base"
        animate={{ y: [0, -6, 0], boxShadow: [
          "0 18px 55px rgba(50, 24, 8, 0.12)",
          "0 24px 70px rgba(195, 107, 32, 0.24)",
          "0 18px 55px rgba(50, 24, 8, 0.12)"
        ] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        Los postres se harán y entregarán durante las primeras 2 semanas de junio
      </motion.div>
    </motion.div>
  );
}

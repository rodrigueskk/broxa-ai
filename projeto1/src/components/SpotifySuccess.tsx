import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

export function SpotifySuccess() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="relative">
        {/* Background confetti/burst effect */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [1, 1, 0],
              x: Math.cos(i * 60 * Math.PI / 180) * 60,
              y: Math.sin(i * 60 * Math.PI / 180) * 60,
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 w-3 h-3 bg-[var(--color-sec)] rounded-full -translate-x-1/2 -translate-y-1/2"
          />
        ))}

        {/* Main Checkmark Circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 10 }}
          className="relative w-16 h-16 bg-[var(--color-sec)] rounded-full flex items-center justify-center shadow-lg shadow-[var(--color-sec)]/20 z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
          >
            <Check className="w-8 h-8 text-white" strokeWidth={3} />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

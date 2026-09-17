"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Logo } from "@/app/components/Logo";
import { EASE, EASE_IN_OUT } from "./motion";

const SEEN_KEY = "bewerbify_intro_seen";

/**
 * First-visit intro: the logo settles in, a hairline fills, then the whole
 * curtain lifts off the hero.
 *
 * It runs once per tab (sessionStorage) — an intro that replays on every
 * navigation stops being delightful by about the third time. It also skips
 * itself entirely under prefers-reduced-motion, and it never blocks the page
 * underneath: the hero is already mounted and interactive behind it.
 */
export function Preloader({ onDone }: { onDone: () => void }) {
  const shouldReduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Private mode / blocked storage — treat as seen and skip the intro.
    }

    if (seen || shouldReduce) {
      onDone();
      return;
    }

    setVisible(true);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* not worth failing the intro over */
    }

    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 1850);
    return () => clearTimeout(timer);
  }, [shouldReduce, onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: EASE_IN_OUT }}
        >
          {/* Soft radial glow so the logo doesn't sit on flat black */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 45%, rgba(37,99,235,0.28) 0%, rgba(2,6,23,0) 70%)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.86, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.85, ease: EASE }}
            className="relative"
          >
            <Logo tone="light" className="text-5xl sm:text-6xl" />
          </motion.div>

          <div className="relative mt-8 h-px w-40 overflow-hidden bg-white/10">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.25, ease: EASE, delay: 0.15 }}
              style={{ originX: 0 }}
            />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="relative mt-5 text-[11px] uppercase tracking-[0.35em] text-slate-500"
          >
            Bewerbungen, die ankommen
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

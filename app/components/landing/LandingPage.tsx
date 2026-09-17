"use client";

import { useCallback, useState } from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";
import { Preloader } from "./Preloader";
import { LandingNav } from "./LandingNav";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { About, DataUsage } from "./Story";
import { Faq } from "./Faq";
import { FinalCta, LandingFooter } from "./LandingFooter";

const FIELDS = [
  "Fachinformatiker/in",
  "Kaufmann/-frau für Büromanagement",
  "Mechatroniker/in",
  "Pflegefachkraft",
  "Elektroniker/in",
  "Hotelfachmann/-frau",
  "Industriekaufmann/-frau",
  "Anlagenmechaniker/in",
  "Medizinische/r Fachangestellte/r",
  "Koch/Köchin",
];

/** Edge-to-edge reading-progress bar pinned to the very top of the viewport. */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX, originX: 0 }}
      className="fixed inset-x-0 top-0 z-[70] h-0.5 bg-gradient-to-r from-blue-500 via-sky-400 to-blue-600"
    />
  );
}

/**
 * Infinite marquee of Ausbildung fields.
 *
 * The track holds the list twice and translates by exactly -50%, so the second
 * copy lands where the first began and the loop has no visible seam. It's
 * decorative, so it's hidden from assistive tech and frozen under
 * prefers-reduced-motion rather than animated slower.
 */
function FieldMarquee() {
  const shouldReduce = useReducedMotion();
  const items = [...FIELDS, ...FIELDS];

  return (
    <div
      aria-hidden
      className="relative overflow-hidden border-y border-slate-200/80 bg-white py-5 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Fade the ends so items enter and leave instead of being cut off */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-32 dark:from-slate-900" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-32 dark:from-slate-900" />

      <motion.div
        className="flex w-max gap-3"
        animate={shouldReduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
      >
        {items.map((field, i) => (
          <span
            key={`${field}-${i}`}
            className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          >
            {field}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function LandingPage() {
  // The hero holds its entrance until the intro curtain is on its way out, so
  // the two don't play over each other.
  const [revealed, setRevealed] = useState(false);
  const handleDone = useCallback(() => setRevealed(true), []);

  return (
    <div className="landing-type min-h-screen scroll-smooth bg-[#f8fafc] font-sans antialiased dark:bg-slate-950">
      <Preloader onDone={handleDone} />
      <ScrollProgress />
      <LandingNav revealed={revealed} />

      <main>
        <Hero revealed={revealed} />
        <FieldMarquee />
        <HowItWorks />
        <About />
        <DataUsage />
        <Faq />
        <FinalCta />
      </main>

      <LandingFooter />
    </div>
  );
}

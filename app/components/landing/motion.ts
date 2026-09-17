import type { Variants, Transition } from "framer-motion";

/**
 * Shared motion vocabulary for the landing page.
 *
 * Two rules everything here follows:
 *  - one easing curve and a small set of durations, so the whole page feels
 *    like one object rather than a pile of separately-tuned animations;
 *  - nothing animates `width`, `height`, `top` or `left` — only `transform`
 *    and `opacity`, which the compositor can handle without relayout.
 */

/** Custom cubic-bezier: quick out of the gate, long gentle settle. */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  fast: 0.28,
  base: 0.55,
  slow: 0.85,
  reveal: 1.1,
} as const;

export const spring: Transition = { type: "spring", stiffness: 260, damping: 26, mass: 0.9 };

/** Rise-and-fade — the page's default entrance. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.slow, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: DURATION.slow, ease: EASE } },
};

/** Parent that walks its children in one after another. */
export const stagger = (delayChildren = 0, staggerChildren = 0.08): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
});

/**
 * Word-by-word headline reveal. Each word is clipped by its parent span and
 * slides up from below the baseline, which reads as typesetting rather than
 * as a generic fade.
 */
export const wordReveal: Variants = {
  hidden: { y: "110%", opacity: 0 },
  show: { y: "0%", opacity: 1, transition: { duration: DURATION.reveal, ease: EASE } },
};

/** Standard viewport trigger — fires once, slightly before the element is centred. */
export const inView = { once: true, amount: 0.25, margin: "0px 0px -80px 0px" } as const;

/**
 * Collapses every variant above to a plain cross-fade. Framer reads
 * `prefers-reduced-motion` for us on transform/layout animations, but the
 * hand-rolled pieces (marquee, float loops, the preloader) need an explicit
 * switch, so the page asks this once and passes the answer down.
 */
export function reduce<T extends Variants>(variants: T, shouldReduce: boolean | null): Variants {
  if (!shouldReduce) return variants;
  return {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.2 } },
  };
}

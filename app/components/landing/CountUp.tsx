"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { EASE } from "./motion";

/**
 * Counts from zero to `to` the first time it scrolls into view.
 *
 * It renders the final value on the server and on the first client paint, so
 * the number is correct before any JavaScript animates it, and it settles on
 * the exact target rather than a rounded approximation. Under
 * prefers-reduced-motion it simply shows the value.
 */
export function CountUp({
  to,
  duration = 1.6,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const shouldReduce = useReducedMotion();
  const [value, setValue] = useState(to);

  // Drop to zero once mounted, so the pre-hydration paint still shows the real
  // number and only an animating client rewinds it.
  useEffect(() => {
    if (!shouldReduce) setValue(0);
  }, [shouldReduce]);

  useEffect(() => {
    if (!inView || shouldReduce) return;

    let frame = 0;
    const start = performance.now();
    // The y-component of the page's shared easing curve, sampled on the
    // parameter. Monotonic and lands exactly on 1, which is all a counter
    // needs, and it avoids pulling in a solver for one number.
    const [, y1, , y2] = EASE;
    const ease = (t: number) => {
      const u = 1 - t;
      return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
    };

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / (duration * 1000));
      setValue(to * ease(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, shouldReduce, to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString("de-DE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

"use client";

import { Fragment, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight, Play, Sparkles, ShieldCheck, CalendarClock } from "lucide-react";
import { EASE, DURATION, wordReveal, fadeUp, stagger } from "./motion";

const HEADLINE = ["Deine", "Bewerbung.", "In", "60", "Sekunden", "unterwegs."];

const CHIPS = [
  { icon: Sparkles, label: "Individuell pro Unternehmen" },
  { icon: ShieldCheck, label: "Versand über dein Gmail" },
  { icon: CalendarClock, label: "Versand planbar" },
];

export function Hero({ revealed }: { revealed: boolean }) {
  const shouldReduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  // Gentle parallax: the video drifts slower than the copy as you scroll out,
  // which gives the section depth without hijacking the scroll.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-slate-950 pb-20 pt-28 sm:pb-28 sm:pt-32"
    >
      {/* ── Background video ─────────────────────────────────────────────── */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={shouldReduce ? undefined : { y: videoY, scale: videoScale }}
      >
        <video
          // Framed right-of-centre so the subject sits beside the headline
          // rather than behind it; on phones the copy stacks over her anyway,
          // where the scrim does the work.
          className="h-full w-full object-cover object-[52%_center] lg:object-[62%_center]"
          src="/landing/hero.mp4"
          poster="/landing/hero-airport.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        {/* Legibility scrims — vertical for the copy, plus a warm vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/55 to-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/40" />
      </motion.div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <motion.div
        style={shouldReduce ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative mx-auto w-full max-w-6xl px-5 sm:px-8"
      >
        <motion.div
          initial="hidden"
          animate={revealed ? "show" : "hidden"}
          variants={stagger(0.15, 0.09)}
        >
          {/* Eyebrow */}
          <motion.div variants={fadeUp} className="mb-6 flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" />
              </span>
              KI-Bewerbungen für deine Ausbildung
            </span>
          </motion.div>

          {/* Headline — each word rides up out of its own clipping mask */}
          <h1 className="max-w-3xl text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl lg:text-[4.5rem]">
            {HEADLINE.map((word, i) => (
              // The trailing {" "} is a real space, so selecting or reading the
              // headline aloud doesn't run every word together.
              <Fragment key={`${word}-${i}`}>
                <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                  <motion.span
                    variants={shouldReduce ? fadeUp : wordReveal}
                    className={`inline-block ${
                      word === "60" || word === "Sekunden"
                        ? "bg-gradient-to-r from-blue-300 via-sky-200 to-blue-400 bg-clip-text text-transparent"
                        : ""
                    }`}
                  >
                    {word}
                  </motion.span>
                </span>{" "}
              </Fragment>
            ))}
          </h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:mt-8 sm:text-lg"
          >
            Bewerbify schreibt dein Anschreiben, fügt es zu fertigen Bewerbungsunterlagen
            zusammen und verschickt sie über <strong className="font-semibold text-white">dein eigenes
            Gmail-Konto</strong> — individuell für jedes Unternehmen.
          </motion.p>

          {/* Calls to action */}
          <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/40 active:scale-[0.98]"
            >
              Kostenlos starten
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/v2/apply"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10 active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-current" />
              Ohne Anmeldung ansehen
            </Link>
          </motion.div>

          {/* Value chips — subtle idle float so the section is never fully still */}
          <motion.ul variants={fadeUp} className="mt-10 flex flex-wrap gap-2 sm:mt-14 sm:gap-3">
            {CHIPS.map((chip, i) => (
              <motion.li
                key={chip.label}
                animate={shouldReduce ? undefined : { y: [0, -5, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3.5 py-2.5 text-xs font-medium text-slate-200 backdrop-blur-md sm:text-sm"
              >
                <chip.icon className="h-4 w-4 shrink-0 text-blue-300" />
                {chip.label}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.a
        href="#so-funktionierts"
        aria-label="Weiter zu: So funktioniert's"
        initial={{ opacity: 0 }}
        animate={revealed ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.2, duration: DURATION.base, ease: EASE }}
        className="absolute inset-x-0 bottom-6 mx-auto hidden h-10 w-6 justify-center rounded-full border border-white/25 sm:flex"
      >
        <motion.span
          aria-hidden
          animate={shouldReduce ? undefined : { y: [6, 16, 6], opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
          className="mt-1.5 block h-1.5 w-1 rounded-full bg-white/80"
        />
      </motion.a>
    </section>
  );
}

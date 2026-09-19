"use client";

import { Fragment, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { wordReveal, fadeUp, stagger } from "./motion";

const HEADLINE = ["Deine", "Bewerbung.", "In", "60", "Sekunden", "unterwegs."];

export function Hero({ revealed, appHref }: { revealed: boolean; appHref: string }) {
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
      data-nav-tone="dark"
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
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/20 to-slate-950/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/20 to-transparent" />
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
          {/* Headline: each word rides up out of its own clipping mask */}
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
                        ? "bg-gradient-to-r from-brand-400 via-[#ff8a3d] to-gold-400 bg-clip-text text-transparent"
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
            Gmail-Konto</strong>, individuell für jedes Unternehmen.
          </motion.p>

          {/* Calls to action */}
          <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-2 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98]"
            >
              Kostenlos starten
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href={appHref}
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-current px-7 py-4 text-base font-semibold text-white transition-colors hover:text-brand-300"
            >
              <Play className="h-4 w-4 fill-current transition-transform duration-300 group-hover:scale-110" />
              Ohne Anmeldung ansehen
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>

    </section>
  );
}

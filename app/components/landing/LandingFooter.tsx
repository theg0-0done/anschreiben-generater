"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/app/components/Logo";
import { fadeUp, stagger, inView } from "./motion";

const COLUMNS = [
  {
    title: "Entdecken",
    links: [
      { label: "So funktioniert's", href: "#so-funktionierts" },
      { label: "Über Bewerbify", href: "#ueber" },
      { label: "Deine Daten", href: "#daten" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "App",
    links: [
      { label: "Neue Bewerbung", href: "/v2/apply" },
      { label: "Geplante Mails", href: "/v2/scheduled" },
      { label: "Profil", href: "/v2/profile/user" },
      { label: "Anmelden", href: "/login" },
    ],
  },
  {
    title: "Rechtliches",
    links: [
      { label: "Datenschutzerklärung", href: "/privacy" },
      { label: "Nutzungsbedingungen", href: "/terms" },
      { label: "Kontakt", href: "mailto:contact@fatehsaid.com" },
    ],
  },
];

/** Closing call to action, sitting directly above the footer. */
export function FinalCta() {
  const shouldReduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-28 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={inView}
          variants={stagger()}
          data-nav-tone="dark"
          className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-14 text-center sm:px-14 sm:py-20"
        >
          {/* Photo wash behind the copy */}
          <Image
            src="/landing/station.webp"
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="object-cover opacity-70"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/55 to-slate-950/75" />

          <div className="relative">
            <motion.h2
              variants={fadeUp}
              className="mx-auto max-w-2xl text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] text-white sm:text-5xl"
            >
              Die nächste Bewerbung ist in einer Minute raus.
            </motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-lg text-base text-slate-300">
              Anmelden mit Google, Unterlagen einmal hinterlegen, und ab da nur noch Firma eintragen
              und senden.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-blue-500 active:scale-[0.98] sm:w-auto"
              >
                Kostenlos starten
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/v2/apply"
                className="inline-flex w-full items-center justify-center rounded-full border border-current px-7 py-4 text-base font-semibold text-white transition-colors hover:text-blue-300 sm:w-auto"
              >
                Erst ansehen
              </Link>
            </motion.div>

            {/* Slow ambient drift so the block isn't static */}
            <motion.div
              aria-hidden
              animate={shouldReduce ? undefined : { opacity: [0.35, 0.6, 0.35] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-blue-500/30 blur-[90px]"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-[#f8fafc] py-14 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={inView}
          variants={stagger()}
          className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]"
        >
          <motion.div variants={fadeUp}>
            <Logo className="text-3xl" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              KI-gestützte Bewerbungen für Ausbildung und Beruf: geschrieben, zusammengestellt und
              über dein eigenes Gmail-Konto versendet.
            </p>
          </motion.div>

          {COLUMNS.map((col) => (
            <motion.div key={col.title} variants={fadeUp}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center text-sm text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                    >
                      {link.label}
                      <ArrowRight className="ml-1 h-3 w-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row dark:border-slate-800">
          <p>&copy; {new Date().getFullYear()} Bewerbify. Alle Rechte vorbehalten.</p>
          <p>Gebaut für alle, die gerade den nächsten Schritt suchen.</p>
        </div>
      </div>
    </footer>
  );
}

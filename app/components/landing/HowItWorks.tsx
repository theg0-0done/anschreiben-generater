"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileText, Building2, Send, Check, Sparkles, Clock } from "lucide-react";
import { EASE, fadeUp, stagger, inView } from "./motion";

/* ────────────────────────────────────────────────────────────────────────────
   Step illustrations.

   These are drawn in JSX rather than pasted as screenshots: a screenshot goes
   stale the moment the app changes, and a looping illustration carries the
   idea of the step better than a still frame. Everything moves on transform
   and opacity only.
   ──────────────────────────────────────────────────────────────────────────── */

const loop = (duration: number, delay = 0) => ({
  duration,
  repeat: Infinity,
  repeatDelay: 1.2,
  ease: EASE,
  delay,
});

/** Step 1 — documents dropping into place, then a confirmation tick. */
function SetupMock({ still }: { still: boolean }) {
  const docs = ["Lebenslauf.pdf", "Zeugnisse.pdf", "Anschreiben-Vorlage"];
  return (
    <div className="relative flex h-44 flex-col justify-center gap-2 px-1">
      {docs.map((doc, i) => (
        <motion.div
          key={doc}
          initial={still ? false : { opacity: 0, y: 14, scale: 0.97 }}
          animate={still ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          transition={still ? undefined : loop(0.6, i * 0.18)}
          className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <FileText className="h-4 w-4 shrink-0 text-blue-500" />
          <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">{doc}</span>
          <motion.span
            initial={still ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={still ? undefined : loop(0.4, 0.7 + i * 0.18)}
            className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500"
          >
            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
          </motion.span>
        </motion.div>
      ))}
    </div>
  );
}

/** Step 2 — a company name types itself, then generated lines fill in. */
function WriteMock({ still }: { still: boolean }) {
  const lines = [88, 96, 72, 90, 60];
  return (
    <div className="relative flex h-44 flex-col justify-center gap-3 px-1">
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Building2 className="h-4 w-4 shrink-0 text-blue-500" />
        <span className="overflow-hidden whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
          <motion.span
            initial={still ? false : { width: 0 }}
            animate={{ width: "auto" }}
            transition={still ? undefined : loop(1.1)}
            className="inline-block overflow-hidden align-bottom"
          >
            Muster Technik GmbH
          </motion.span>
        </span>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/40">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-300">
          <Sparkles className="h-3 w-3" />
          Anschreiben wird geschrieben
        </div>
        <div className="space-y-1.5">
          {lines.map((w, i) => (
            <motion.div
              key={i}
              initial={still ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={still ? undefined : loop(0.5, 1.2 + i * 0.16)}
              style={{ width: `${w}%`, originX: 0 }}
              className="h-1.5 rounded-full bg-blue-300/70 dark:bg-blue-700/70"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Step 3 — the finished mail lifts off, a scheduled slot slides in behind it. */
function SendMock({ still }: { still: boolean }) {
  return (
    <div className="relative flex h-44 items-center justify-center px-1">
      <motion.div
        initial={still ? false : { y: 8, opacity: 0 }}
        animate={still ? { opacity: 1 } : { y: [8, 0, 0, -46], opacity: [0, 1, 1, 0] }}
        transition={
          still ? undefined : { duration: 2.4, times: [0, 0.2, 0.7, 1], repeat: Infinity, repeatDelay: 0.9, ease: EASE }
        }
        className="absolute w-full rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <Send className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
              Bewerbung als Fachinformatiker
            </p>
            <p className="truncate text-[10px] text-slate-400">an bewerbung@muster-technik.de</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={still ? false : { opacity: 0, y: 20 }}
        animate={still ? { opacity: 1 } : { opacity: [0, 0, 1, 1], y: [20, 20, 0, 0] }}
        transition={
          still ? undefined : { duration: 2.4, times: [0, 0.55, 0.8, 1], repeat: Infinity, repeatDelay: 0.9, ease: EASE }
        }
        className="absolute bottom-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40"
      >
        <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
          Geplant für Montag, 08:00
        </span>
      </motion.div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Einmal einrichten",
    body: "Lebenslauf und Bewerbungsunterlagen hochladen, Ausbildungsberuf wählen, Vorlage hinterlegen. Das machst du genau einmal.",
    Mock: SetupMock,
  },
  {
    n: "02",
    title: "Unternehmen eintragen",
    body: "Firma, Ansprechpartner und die Stellenanzeige einfügen. Die KI schreibt daraus ein Anschreiben, das wirklich zu dieser Stelle passt.",
    Mock: WriteMock,
  },
  {
    n: "03",
    title: "Senden oder planen",
    body: "Fertiges PDF prüfen und sofort verschicken — oder auf Montagfrüh um 8 legen, wenn die Mail oben im Postfach landen soll.",
    Mock: SendMock,
  },
];

export function HowItWorks() {
  const shouldReduce = useReducedMotion();
  const still = !!shouldReduce;

  return (
    <section id="so-funktionierts" className="relative bg-[#f8fafc] py-20 sm:py-28 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="show" viewport={inView} variants={stagger()}>
          <motion.span
            variants={fadeUp}
            className="text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400"
          >
            So funktioniert&rsquo;s
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 max-w-2xl text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] text-slate-900 sm:text-5xl dark:text-white"
          >
            Drei Schritte zwischen dir und der nächsten Bewerbung.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 max-w-xl text-base text-slate-500 dark:text-slate-400">
            Der erste kostet dich fünf Minuten. Jede weitere Bewerbung danach kostet dich eine.
          </motion.p>
        </motion.div>

        <motion.ol
          initial="hidden"
          whileInView="show"
          viewport={inView}
          variants={stagger(0.1, 0.14)}
          className="mt-12 grid gap-5 sm:mt-16 md:grid-cols-3 md:gap-6"
        >
          {STEPS.map((step) => (
            <motion.li
              key={step.n}
              variants={fadeUp}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-600/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900"
            >
              {/* Hover wash */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50/0 to-blue-50/60 opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:to-blue-950/30"
              />

              <div className="relative">
                <span className="text-xs font-bold tracking-[0.2em] text-blue-600/70 dark:text-blue-400/70">
                  {step.n}
                </span>
                <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{step.body}</p>
              </div>

              <div className="relative mt-6 rounded-2xl bg-slate-50/80 p-3 dark:bg-slate-800/40">
                <step.Mock still={still} />
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}

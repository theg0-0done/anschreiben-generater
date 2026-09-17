"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Lock, MailX, KeyRound, Ban, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { fadeUp, scaleIn, stagger, inView } from "./motion";

/* ── About ─────────────────────────────────────────────────────────────── */

export function About() {
  const shouldReduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // The two photos drift at different rates as the section passes, so the
  // collage reads as layered depth rather than a flat pair of rectangles.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const backY = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);
  const frontY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section id="ueber" className="relative overflow-hidden bg-white py-20 sm:py-28 dark:bg-slate-900">
      <div ref={ref} className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        {/* Copy */}
        <motion.div initial="hidden" whileInView="show" viewport={inView} variants={stagger()}>
          <motion.span
            variants={fadeUp}
            className="text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400"
          >
            Über Bewerbify
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] text-slate-900 sm:text-4xl lg:text-[2.75rem] dark:text-white"
          >
            Der Ausbildungsplatz scheitert selten am Können. Er scheitert an der Anzahl.
          </motion.h2>

          <motion.div variants={fadeUp} className="mt-6 space-y-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              Wer eine Ausbildung sucht, schreibt keine drei Bewerbungen. Er schreibt dreißig. Und
              weil jede einzelne Firma, Ansprechpartner und Stellenanzeige anders ist, wird aus
              dreißig Bewerbungen dreißigmal dieselbe Fleißarbeit — bis irgendwann die Copy-Paste-Version
              rausgeht, in der noch der Name der letzten Firma steht.
            </p>
            <p>
              Bewerbify nimmt dir genau diesen Teil ab. Deine Unterlagen liegen einmal im Profil.
              Für jede neue Stelle entsteht daraus ein eigenes Anschreiben, ein fertiges PDF und eine
              E-Mail, die aus <strong className="font-semibold text-slate-900 dark:text-white">deinem
              Postfach</strong> kommt — mit deiner Adresse, deiner Signatur, deinem Namen.
            </p>
          </motion.div>

          <motion.dl variants={fadeUp} className="mt-8 grid grid-cols-3 gap-4 border-t border-slate-200 pt-8 dark:border-slate-800">
            {[
              { k: "1×", v: "einrichten" },
              { k: "~60 s", v: "pro Bewerbung" },
              { k: "0", v: "Mails gelesen" },
            ].map((stat) => (
              <div key={stat.v}>
                <dt className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  {stat.k}
                </dt>
                <dd className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.v}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        {/* Photo collage */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={inView}
          variants={scaleIn}
          className="relative mx-auto aspect-[4/5] w-full max-w-md lg:max-w-none"
        >
          <motion.div
            style={shouldReduce ? undefined : { y: backY }}
            className="absolute right-0 top-0 h-[74%] w-[78%] overflow-hidden rounded-3xl shadow-2xl shadow-slate-900/10"
          >
            <Image
              src="/landing/workshop.webp"
              alt="Zwei Auszubildende arbeiten gemeinsam an einer Maschine in einer modernen Werkstatt"
              fill
              sizes="(max-width: 1024px) 80vw, 40vw"
              className="object-cover"
            />
          </motion.div>

          <motion.div
            style={shouldReduce ? undefined : { y: frontY }}
            className="absolute bottom-0 left-0 h-[58%] w-[62%] overflow-hidden rounded-3xl border-4 border-white shadow-2xl shadow-slate-900/20 dark:border-slate-900"
          >
            <Image
              src="/landing/desk.webp"
              alt="Person am Schreibtisch mit Laptop und Bewerbungsunterlagen"
              fill
              sizes="(max-width: 1024px) 60vw, 30vw"
              className="object-cover"
            />
          </motion.div>

          {/* Floating accent card */}
          <motion.div
            animate={shouldReduce ? undefined : { y: [0, -9, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-2 top-[68%] rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-800/95"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Bewerbung gesendet
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Google data usage ─────────────────────────────────────────────────── */

const DATA_POINTS = [
  {
    icon: KeyRound,
    title: "Genau eine Berechtigung",
    body: "Bewerbify fragt ausschließlich den Bereich gmail.send ab — die Erlaubnis, in deinem Namen zu senden. Mehr wird nicht angefordert.",
  },
  {
    icon: MailX,
    title: "Wir lesen keine E-Mails",
    body: "Dein Posteingang, deine Kontakte und dein Verlauf bleiben für Bewerbify unsichtbar. Der Zugriff kann nichts lesen, auflisten oder verändern.",
  },
  {
    icon: Lock,
    title: "Tokens verschlüsselt gespeichert",
    body: "Der Google-Zugriffstoken liegt AES-256-GCM-verschlüsselt in unserer Datenbank und wird nur zum Versand deiner eigenen Bewerbung entschlüsselt.",
  },
  {
    icon: Ban,
    title: "Keine Weitergabe, kein Training",
    body: "Deine Daten werden nicht verkauft, nicht für Werbung genutzt und nicht zum Trainieren von KI-Modellen verwendet.",
  },
];

export function DataUsage() {
  return (
    <section id="daten" className="relative overflow-hidden bg-slate-950 py-20 sm:py-28">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 0%, rgba(37,99,235,0.22) 0%, rgba(2,6,23,0) 65%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="show" viewport={inView} variants={stagger()} className="max-w-2xl">
          <motion.span variants={fadeUp} className="text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-400">
            Deine Daten
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] text-white sm:text-5xl"
          >
            Was mit deinen Google-Daten passiert.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-slate-400">
            Bewerbify verschickt deine Bewerbung über dein eigenes Gmail-Konto. Damit das geht,
            brauchen wir eine Berechtigung von dir — und wirklich nur diese eine.
          </motion.p>
        </motion.div>

        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={inView}
          variants={stagger(0.1, 0.1)}
          className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2"
        >
          {DATA_POINTS.map((point) => (
            <motion.li
              key={point.title}
              variants={fadeUp}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-colors duration-500 hover:border-blue-500/40 hover:bg-white/[0.07]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-300 ring-1 ring-inset ring-blue-500/20">
                <point.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{point.body}</p>
            </motion.li>
          ))}
        </motion.ul>

        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={inView}
          variants={fadeUp}
          className="mt-8 text-sm text-slate-400"
        >
          Die vollständigen Angaben — inklusive der Google&nbsp;API Services User Data Policy und
          ihrer Limited-Use-Anforderungen — stehen in der{" "}
          <Link
            href="/privacy"
            className="inline-flex items-center gap-0.5 font-semibold text-blue-300 underline underline-offset-4 transition-colors hover:text-blue-200"
          >
            Datenschutzerklärung
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          .
        </motion.p>
      </div>
    </section>
  );
}

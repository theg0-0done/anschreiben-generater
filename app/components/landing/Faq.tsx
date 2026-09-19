"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { EASE, fadeUp, stagger, inView } from "./motion";

const FAQS = [
  {
    q: "Wie werden meine Google-Daten verwendet?",
    a: "Bewerbify fordert genau eine Google-Berechtigung an: gmail.send. Damit darf die App in deinem Namen eine E-Mail versenden, nämlich die Bewerbung, die du zuvor in der App erstellt und freigegeben hast. Dein Posteingang, deine Kontakte und dein E-Mail-Verlauf werden nicht gelesen, nicht gespeichert und nicht verändert. Dein Google-Zugriffstoken wird AES-256-GCM-verschlüsselt gespeichert und ausschließlich für diesen Versand entschlüsselt. Es findet keine Weitergabe an Dritte statt, die Daten werden nicht für Werbung genutzt und nicht zum Trainieren von KI-Modellen verwendet. Bewerbify hält sich dabei an die Google API Services User Data Policy einschließlich der Limited-Use-Anforderungen. Du kannst den Zugriff jederzeit in deinem Google-Konto widerrufen.",
  },
  {
    q: "Warum wird die Mail über mein eigenes Konto verschickt?",
    a: "Weil eine Bewerbung von dir kommen sollte, nicht von einem Dienst. Die E-Mail landet beim Unternehmen mit deiner Adresse als Absender, taucht in deinem Gmail-Ordner „Gesendet“ auf, und eine Antwort geht direkt an dich zurück, ganz ohne Weiterleitung über uns.",
  },
  {
    q: "Schreibt die KI für jedes Unternehmen einen eigenen Text?",
    a: "Ja. Aus der Stellenanzeige, dem Unternehmensnamen und deinem Profil entsteht für jede Bewerbung ein eigenes Anschreiben. Du siehst das fertige PDF vor dem Versand und kannst es jederzeit neu erzeugen oder herunterladen und selbst anpassen.",
  },
  {
    q: "Kann ich den Versandzeitpunkt festlegen?",
    a: "Ja. Neben „sofort senden“ kannst du jede Bewerbung auf einen Zeitpunkt legen: morgen früh, Montag um 8 Uhr oder ein frei gewähltes Datum. Geplante Mails findest du unter „Geplante Mails“, wo du sie verschieben, abbrechen oder nach einem Fehlversuch erneut senden kannst.",
  },
  {
    q: "Was passiert mit meinen hochgeladenen Unterlagen?",
    a: "Lebenslauf und Bewerbungsunterlagen liegen in deinem eigenen, zugriffsgeschützten Bereich und werden nur genutzt, um daraus deine Bewerbungs-PDFs zu bauen. Versendete Anhänge werden nach zwei Tagen automatisch aus dem Speicher gelöscht. Dein Konto und alle zugehörigen Daten kannst du jederzeit entfernen lassen.",
  },
  {
    q: "Brauche ich ein Gmail-Konto?",
    a: "Für den automatischen Versand ja, der läuft über die Gmail-Schnittstelle. Ohne Anmeldung kannst du dir die App trotzdem ansehen, und die fertigen Bewerbungsunterlagen lassen sich auch einfach als PDF herunterladen und von Hand verschicken.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-[#f8fafc] py-20 sm:py-28 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="show" viewport={inView} variants={stagger()} className="text-center">
          <motion.span
            variants={fadeUp}
            className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400"
          >
            FAQ
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] text-slate-900 sm:text-5xl dark:text-white"
          >
            Häufige Fragen
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={inView}
          variants={stagger(0.1, 0.07)}
          className="mt-12 space-y-3"
        >
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={faq.q}
                variants={fadeUp}
                className={`group overflow-hidden rounded-[1.75rem] border bg-white transition-all duration-300 hover:border-brand-200 dark:bg-slate-900 dark:hover:border-brand-900 ${
                  isOpen
                    ? "border-brand-200 shadow-lg shadow-brand-600/5 dark:border-brand-900"
                    : "border-slate-200/80 dark:border-slate-800"
                }`}
              >
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left sm:px-6"
                  >
                    <span className="text-base font-semibold text-slate-900 transition-transform duration-300 group-hover:translate-x-1 sm:text-lg dark:text-white">
                      {faq.q}
                    </span>
                    <motion.span
                      aria-hidden
                      animate={{ rotate: isOpen ? 135 : 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isOpen ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </motion.span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-panel-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-6 text-sm leading-relaxed text-slate-600 sm:px-6 sm:text-[15px] dark:text-slate-400">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

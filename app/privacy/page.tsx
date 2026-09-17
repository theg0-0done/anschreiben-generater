import Link from "next/link";
import { ArrowLeft, Shield, Lock, Database, Mail, Eye, UserCheck, Sparkles } from "lucide-react";
import { Logo } from "@/app/components/Logo";

export const metadata = {
  title: "Datenschutzerklärung – Bewerbify",
  description: "Datenschutzerklärung für die Bewerbify-Plattform.",
};

function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Startseite
          </Link>
          <Logo className="text-2xl" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 mb-6">
            <Shield className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
            Datenschutzerklärung
          </h1>
          <p className="text-slate-500 text-base sm:text-lg">Zuletzt aktualisiert: September 2026</p>
        </div>

        <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-sm text-emerald-800 leading-relaxed">
            Bewerbify verkauft keine Daten und gibt keine Daten zu Werbezwecken weiter. Der Zugriff
            auf Gmail beschränkt sich darauf, genau die Bewerbung zu versenden, die Sie in der App
            erstellt und freigegeben haben.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-8 sm:p-12 space-y-10">
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">1. Welche Daten wir erheben</h2>
              </div>
              <div className="space-y-4 text-slate-600">
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Profildaten</h3>
                  <Bullets
                    color="bg-blue-400"
                    items={[
                      "Name, E-Mail-Adresse, Telefonnummer und Anschrift",
                      "Ausbildungsberuf und optionale persönliche Links",
                      "Optionales Profilbild",
                    ]}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Von Ihnen hochgeladene Dokumente</h3>
                  <Bullets
                    color="bg-blue-400"
                    items={[
                      "Lebenslauf und vollständige Bewerbungsunterlagen (PDF)",
                      "Daraus erzeugte Anschreiben-Vorlagen und generierte Bewerbungs-PDFs",
                    ]}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Nutzungsdaten</h3>
                  <Bullets
                    color="bg-blue-400"
                    items={[
                      "Angaben zu den Unternehmen, bei denen Sie sich bewerben",
                      "Betreff und Text Ihrer Bewerbungs-E-Mails",
                      "Geplante, gesendete und fehlgeschlagene Sendungen inklusive Zeitpunkt",
                    ]}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Google-Kontodaten</h3>
                  <Bullets
                    color="bg-blue-400"
                    items={[
                      "E-Mail-Adresse und Name Ihres Google-Kontos zur Anmeldung",
                      "OAuth-Token für die Berechtigung gmail.send, verschlüsselt gespeichert",
                    ]}
                  />
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  2. Nutzung von Google-Nutzerdaten (Gmail)
                </h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-3">
                Bewerbify fordert genau eine Google-Berechtigung an:{" "}
                <code className="text-sm bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono">
                  https://www.googleapis.com/auth/gmail.send
                </code>
                . Sie erlaubt ausschließlich das Senden von E-Mails und gewährt keinen Lesezugriff
                auf Ihr Postfach.
              </p>
              <Bullets
                color="bg-emerald-400"
                items={[
                  "Verwendung nur, um eine von Ihnen erstellte und freigegebene Bewerbung zu versenden – sofort oder zum geplanten Zeitpunkt",
                  "Wir lesen, durchsuchen und speichern keine vorhandenen E-Mails",
                  "Keine Weitergabe von Google-Nutzerdaten an Dritte",
                  "Keine Nutzung von Google-Nutzerdaten für Werbung",
                  "Keine Nutzung von Google-Nutzerdaten zum Trainieren von KI- oder ML-Modellen",
                ]}
              />
              <p className="mt-4 text-slate-600 leading-relaxed">
                Die Nutzung und Übertragung von Informationen, die Bewerbify über Google-APIs
                erhält, erfüllt die{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
                >
                  Google API Services User Data Policy
                </a>{" "}
                einschließlich der Limited-Use-Anforderungen.
              </p>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">In English: </span>
                Bewerbify&apos;s use and transfer of information received from Google APIs to any other
                app adheres to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Sie können den Zugriff jederzeit unter{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
                >
                  myaccount.google.com/permissions
                </a>{" "}
                widerrufen. Danach kann Bewerbify keine E-Mails mehr in Ihrem Namen versenden.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4 text-violet-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">3. Wie wir Ihre Daten verwenden</h2>
              </div>
              <Bullets
                color="bg-violet-400"
                items={[
                  "Erstellen personalisierter Anschreiben und Bewerbungs-PDFs",
                  "Versenden und Planen Ihrer Bewerbungs-E-Mails",
                  "Speichern Ihrer Unterlagen, damit sie für weitere Bewerbungen verfügbar sind",
                  "Betrieb, Fehlerbehebung und Absicherung des Dienstes",
                ]}
              />
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">4. Einsatz von KI</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Zum Formulieren der Anschreiben wird die API von Anthropic (Claude) genutzt. Dabei
                werden der Text Ihres Lebenslaufs sowie die von Ihnen eingegebenen
                Unternehmensinformationen übermittelt, um daraus den Anschreiben-Text zu erzeugen.
                Es werden <strong>keine</strong> Daten aus Ihrem Gmail-Postfach übermittelt und
                keine Ihrer Daten zum Trainieren von KI-Modellen verwendet.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">5. Dienstleister</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-3">
                Wir verkaufen Ihre Daten nicht. Zur Bereitstellung des Dienstes setzen wir
                folgende Auftragsverarbeiter ein:
              </p>
              <Bullets
                color="bg-amber-400"
                items={[
                  "Vercel – Hosting der Anwendung",
                  "Supabase – Datenbank, Authentifizierung und Dateispeicher",
                  "Anthropic – Erzeugung der Anschreiben-Texte",
                  "Google – Versand der E-Mails über Ihr Gmail-Konto",
                ]}
              />
              <p className="mt-3 text-slate-600 leading-relaxed">
                Eine Weitergabe darüber hinaus erfolgt nur, wenn wir gesetzlich dazu verpflichtet
                sind.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">6. Datensicherheit</h2>
              </div>
              <Bullets
                color="bg-emerald-400"
                items={[
                  "HTTPS-Verschlüsselung für alle übertragenen Daten",
                  "OAuth-Token werden mit AES-256-GCM verschlüsselt gespeichert",
                  "Row Level Security: Jede Abfrage ist auf Ihr eigenes Konto beschränkt",
                  "Hochgeladene Dokumente liegen in einem privaten, nicht öffentlich abrufbaren Speicher",
                  "Zugangsdaten und API-Schlüssel ausschließlich in Umgebungsvariablen, nie im Quellcode",
                ]}
              />
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4 text-slate-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  7. Speicherdauer und Löschung
                </h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Ihre Daten werden gespeichert, solange Sie den Dienst nutzen. Der Anhang einer
                geplanten Bewerbung wird nach dem Versand automatisch aus dem Speicher gelöscht.
                Einzelne Ausbildungen samt zugehöriger Dokumente können Sie jederzeit in der App
                löschen. Für die vollständige Löschung Ihres Kontos genügt eine kurze Nachricht an
                die unten genannte Adresse.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-rose-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">8. Ihre Rechte</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-3">
                Nach der DSGVO haben Sie folgende Rechte:
              </p>
              <Bullets
                color="bg-rose-400"
                items={[
                  "Auskunft über die zu Ihrer Person gespeicherten Daten",
                  "Berichtigung unrichtiger Daten",
                  "Löschung Ihrer Daten",
                  "Einschränkung der Verarbeitung",
                  "Datenübertragbarkeit",
                  "Widerspruch gegen die Verarbeitung",
                ]}
              />
            </section>

            <section className="pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">9. Kontakt</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Für Anfragen zum Datenschutz oder zur Löschung Ihres Kontos:{" "}
                <a
                  href="mailto:bosssaid2005@gmail.com"
                  className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
                >
                  bosssaid2005@gmail.com
                </a>
              </p>
            </section>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
          <Link href="/terms" className="hover:text-slate-600 transition-colors">
            Nutzungsbedingungen
          </Link>
          <span>&middot;</span>
          <Link href="/" className="hover:text-slate-600 transition-colors">
            Startseite
          </Link>
        </div>
      </main>
    </div>
  );
}

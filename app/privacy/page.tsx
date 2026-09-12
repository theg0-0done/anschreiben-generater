import Link from "next/link";
import { ArrowLeft, Shield, Lock, Database, Mail, Eye, UserCheck } from "lucide-react";

export const metadata = {
  title: "Datenschutzerklaerung - Anschreibify",
  description: "Datenschutzerklaerung fuer die Anschreibify-Plattform.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link
            href="/v2/apply"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurueck zur App
          </Link>
          <span className="font-modak text-2xl text-slate-800 tracking-wide select-none leading-none">
            Anschreibify
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 mb-6">
            <Shield className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
            Datenschutzerklaerung
          </h1>
          <p className="text-slate-500 text-base sm:text-lg">
            Zuletzt aktualisiert: September 2026
          </p>
        </div>

        {/* Intro banner */}
        <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-sm text-emerald-800 leading-relaxed">
            Ihre Privatsphaere ist uns wichtig. Diese Erklaerung beschreibt, wie Anschreibify Ihre Daten erhebt,
            verwendet und schuetzt. Wir verkaufen Ihre Daten niemals an Dritte.
          </p>
        </div>

        {/* Content card */}
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
                  <ul className="space-y-1.5">
                    {[
                      "Name, E-Mail-Adresse und Kontaktinformationen",
                      "Lebenslaufdaten und berufliche Qualifikationen",
                      "Ausbildungsinformationen und Stellenbezeichnungen",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Nutzungsdaten</h3>
                  <ul className="space-y-1.5">
                    {[
                      "Generierte Anschreiben und zugehoerige Metadaten",
                      "Geplante und gesendete E-Mails",
                      "Hochgeladene Dokumente (Lebenslauf, Anhange)",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Google-/Gmail-Daten</h3>
                  <ul className="space-y-1.5">
                    {[
                      "Gmail-E-Mail-Adresse zur Authentifizierung",
                      "OAuth-Token zum Senden von E-Mails in Ihrem Namen",
                      "Wir lesen keine Ihrer bestehenden E-Mails",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4 text-violet-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">2. Wie wir Ihre Daten verwenden</h2>
              </div>
              <ul className="space-y-2 text-slate-600">
                {[
                  "Generierung personalisierter Bewerbungsanschreiben",
                  "Versand und Planung von Bewerbungs-E-Mails ueber Gmail",
                  "Speicherung Ihrer Bewerbungsunterlagen in der Cloud (Vercel Blob)",
                  "Verbesserung des Dienstes und Fehlerbehebung",
                  "Kommunikation mit Ihnen bei wichtigen Aenderungen",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">3. Datenweitergabe an Dritte</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-3">
                Wir geben Ihre personenbezogenen Daten <strong>nicht</strong> an Dritte weiter, ausser in folgenden Faellen:
              </p>
              <ul className="space-y-2 text-slate-600">
                {[
                  "Dienstleister (z.B. Vercel fuer Hosting, Supabase fuer Datenbank) – nur im notwendigen Umfang",
                  "Anthropic Claude / KI-API – nur der Anschreiben-Kontext ohne persoenliche Identifikatoren",
                  "Gesetzliche Verpflichtungen oder behoerdliche Anordnungen",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">4. Datensicherheit</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Wir implementieren branchenuebliche Sicherheitsmassnahmen:
              </p>
              <ul className="mt-3 space-y-2 text-slate-600">
                {[
                  "HTTPS-Verschluesselung fuer alle Daten in der Uebertragung",
                  "Sichere Speicherung von OAuth-Tokens als verschluesselte Cookies",
                  "Umgebungsvariablen fuer alle API-Schluessel (nie im Code)",
                  "Row-Level Security in der Supabase-Datenbank",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-rose-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">5. Ihre Rechte</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-3">
                Sie haben gemaess DSGVO folgende Rechte:
              </p>
              <ul className="space-y-2 text-slate-600">
                {[
                  "Auskunft ueber die zu Ihrer Person gespeicherten Daten",
                  "Berichtigung unrichtiger Daten",
                  "Loeschung Ihrer Daten (Recht auf Vergessenwerden)",
                  "Einschraenkung der Verarbeitung",
                  "Datenuebertragbarkeit",
                  "Widerspruch gegen die Verarbeitung",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4 text-slate-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">6. Datenspeicherung und -loeschung</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Ihre Daten werden gespeichert, solange Sie den Dienst aktiv nutzen. Sie koennen jederzeit die
                Loeschung Ihrer Daten beantragen. Gmail-Verbindungen koennen jederzeit in der App unter dem
                Gmail-Status-Badge getrennt werden. OAuth-Tokens werden damit sofort ungueltig gemacht.
              </p>
            </section>

            <section className="pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">7. Kontakt Datenschutz</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Fuer Anfragen zum Datenschutz wenden Sie sich an:{" "}
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

        {/* Footer links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
          <Link href="/terms" className="hover:text-slate-600 transition-colors">
            Nutzungsbedingungen
          </Link>
          <span>&middot;</span>
          <Link href="/v2/apply" className="hover:text-slate-600 transition-colors">
            Zurueck zur App
          </Link>
        </div>
      </main>
    </div>
  );
}

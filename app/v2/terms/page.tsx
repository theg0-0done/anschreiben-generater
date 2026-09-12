import Link from "next/link";
import { FileText, ArrowLeft, Shield, AlertCircle, Mail, Scale } from "lucide-react";

export const metadata = {
  title: "Nutzungsbedingungen – Anschreibify",
  description: "Nutzungsbedingungen fuer die Anschreibify-Plattform.",
};

export default function TermsPage() {
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 mb-6">
            <Scale className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
            Nutzungsbedingungen
          </h1>
          <p className="text-slate-500 text-base sm:text-lg">
            Zuletzt aktualisiert: September 2026
          </p>
        </div>

        {/* Content card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-8 sm:p-12 space-y-10">

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">1. Akzeptanz der Bedingungen</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Durch die Nutzung von <strong>Anschreibify</strong> erklaeren Sie sich mit diesen Nutzungsbedingungen einverstanden.
                Wenn Sie diesen Bedingungen nicht zustimmen, duerfen Sie die Plattform nicht nutzen.
                Diese Bedingungen gelten fuer alle Nutzer, Besucher und Personen, die auf den Dienst zugreifen.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">2. Beschreibung des Dienstes</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Anschreibify ist ein KI-gestuetzter Generator fuer Bewerbungsanschreiben. Die Plattform ermoeglicht es Nutzern:
              </p>
              <ul className="mt-3 space-y-2 text-slate-600">
                {[
                  "Personalisierte Bewerbungsanschreiben auf Basis von Profildaten zu erstellen",
                  "E-Mails direkt ueber Gmail zu versenden oder zu planen",
                  "Bewerbungsunterlagen zu verwalten und zu speichern",
                  "KI-generierte Inhalte zu ueberpruefen und anzupassen",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-violet-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">3. Nutzerpflichten</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">Sie stimmen zu:</p>
              <ul className="mt-3 space-y-2 text-slate-600">
                {[
                  "Wahrheitsgemaesse und vollstaendige Angaben zu machen",
                  "Den Dienst nicht fuer rechtswidrige Zwecke zu nutzen",
                  "Keine automatisierten Systeme zu nutzen, die den Dienst beeintraechtigen",
                  "Die Zugangsdaten vertraulich zu halten",
                  "Den Dienst nicht zu missbrauchen, um Spam-Mails zu versenden",
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
                  <Scale className="w-4 h-4 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">4. KI-generierte Inhalte</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Die von Anschreibify generierten Anschreiben werden mithilfe von KI-Modellen erstellt. Wir uebernehmen
                keine Garantie fuer die Richtigkeit, Vollstaendigkeit oder Eignung der generierten Inhalte. Es liegt
                in der Verantwortung des Nutzers, alle generierten Inhalte vor dem Versand zu pruefen und anzupassen.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">5. Haftungsausschluss</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Anschreibify wird ohne jede Gewaehrleistung bereitgestellt. Wir uebernehmen keine Haftung fuer:
              </p>
              <ul className="mt-3 space-y-2 text-slate-600">
                {[
                  "Datenverluste oder Unterbrechungen des Dienstes",
                  "Fehler oder Ungenauigkeiten in generierten Inhalten",
                  "Entscheidungen, die auf Basis unserer generierten Inhalte getroffen werden",
                  "Schaeden, die durch die Nutzung oder Nichtnutzbarkeit des Dienstes entstehen",
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
                  <FileText className="w-4 h-4 text-slate-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">6. Aenderungen der Bedingungen</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu aendern. Aenderungen werden
                auf dieser Seite veroeffentlicht. Die weitere Nutzung nach Aenderungen gilt als Zustimmung.
              </p>
            </section>

            <section className="pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">7. Kontakt</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Bei Fragen zu diesen Nutzungsbedingungen wenden Sie sich bitte an:{" "}
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
          <Link href="/v2/privacy" className="hover:text-slate-600 transition-colors">
            Datenschutzerklaerung
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

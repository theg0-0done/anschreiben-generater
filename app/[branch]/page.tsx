"use client";

import { useState, useEffect, use } from "react";
import { BranchToggle } from "../components/BranchToggle";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormFields {
  branch: "informatik" | "gastronomie";
  companyName: string;
  companyStreet: string;
  companyZipCity: string;
  contactPerson: string;
  contactSalutation: string;
  jobTitle: string;
  companyEmail: string;
  companyPhone: string;
  companyFocus: string;
  companyTech: string;
  department: string;
  companyBesonderheit: string;
  personalMotivation: string;
  ausbildungStart: string;
  mode: "cover-letter" | "full-resume";
}

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; blobUrl: string; fileName: string }
  | { status: "error"; message: string };

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_FIELDS_INFORMATIK: FormFields = {
  branch: "informatik",
  companyName: "",
  companyStreet: "",
  companyZipCity: "",
  contactPerson: "",
  contactSalutation: "",
  jobTitle: "Fachinformatiker für Anwendungsentwicklung",
  companyEmail: "",
  companyPhone: "",
  companyFocus: "",
  companyTech: "",
  department: "",
  companyBesonderheit: "",
  personalMotivation: "",
  ausbildungStart: "",
  mode: "cover-letter",
};

const DEFAULT_FIELDS_GASTRONOMIE: FormFields = {
  branch: "gastronomie",
  companyName: "",
  companyStreet: "",
  companyZipCity: "",
  contactPerson: "",
  contactSalutation: "",
  jobTitle: "Hotelfachmann",
  companyEmail: "",
  companyPhone: "",
  companyFocus: "",
  companyTech: "",
  department: "Hotel",
  companyBesonderheit: "modernes Business",
  personalMotivation:
    "exzellenten Service und den Umgang mit internationalen Gästen",
  ausbildungStart: "",
  mode: "cover-letter",
};

// ─── Field component ─────────────────────────────────────────────────────────

function Field({
  label,
  name,
  value,
  onChange,
  required,
  placeholder,
  disabled,
}: {
  label: string;
  name: keyof FormFields;
  value: string;
  onChange: (name: keyof FormFields, value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 transition-shadow"
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BranchPage({
  params,
}: {
  params: Promise<{ branch: string }>;
}) {
  const resolvedParams = use(params);
  const branch = resolvedParams.branch as "informatik" | "gastronomie";

  const [fields, setFields] = useState<FormFields>(
    branch === "gastronomie"
      ? DEFAULT_FIELDS_GASTRONOMIE
      : DEFAULT_FIELDS_INFORMATIK,
  );
  const [state, setState] = useState<AppState>({ status: "idle" });

  // Update fields when branch changes
  useEffect(() => {
    setFields(
      branch === "gastronomie"
        ? DEFAULT_FIELDS_GASTRONOMIE
        : DEFAULT_FIELDS_INFORMATIK,
    );
    setState({ status: "idle" });
  }, [branch]);

  const isLoading = state.status === "loading";

  function setField(name: keyof FormFields, value: string) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (state.status === "success") {
      URL.revokeObjectURL(state.blobUrl);
    }

    setState({ status: "loading" });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setState({
          status: "error",
          message: data.error ?? `Serverfehler ${res.status}`,
        });
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const fileName = decodeURIComponent(
        res.headers.get("X-File-Name") ?? "Anschreiben.pdf",
      );

      setState({ status: "success", blobUrl, fileName });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
  }

  function triggerDownload() {
    if (state.status !== "success") return;
    const a = document.createElement("a");
    a.href = state.blobUrl;
    a.download = state.fileName;
    a.click();
  }

  function handleReset() {
    if (state.status === "success") URL.revokeObjectURL(state.blobUrl);
    setState({ status: "idle" });
    setFields(
      branch === "gastronomie"
        ? DEFAULT_FIELDS_GASTRONOMIE
        : DEFAULT_FIELDS_INFORMATIK,
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-10 flex justify-center">
        <BranchToggle />
      </div>

      <div className="w-full text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">
          Anschreiben Generator
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          {branch === "informatik"
            ? "Informatik Bereich"
            : "Gastronomie Bereich"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Form */}
        <div className="lg:col-span-6 space-y-8">
          <form
            onSubmit={handleSubmit}
            className="space-y-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm"
          >
            {/* ── Company info ── */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-500">
                Unternehmen
              </h2>

              <Field
                label="Unternehmensname"
                name="companyName"
                value={fields.companyName}
                onChange={setField}
                required
                placeholder="z.B. Muster Gastronomie GmbH"
                disabled={isLoading}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Straße &amp; Hausnummer"
                  name="companyStreet"
                  value={fields.companyStreet}
                  onChange={setField}
                  placeholder="z.B. Musterstraße 12"
                  disabled={isLoading}
                />
                <Field
                  label="PLZ &amp; Ort (Standort)"
                  name="companyZipCity"
                  value={fields.companyZipCity}
                  onChange={setField}
                  required={branch === "gastronomie"}
                  placeholder="z.B. 10115 Berlin"
                  disabled={isLoading}
                />
              </div>

              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-500 pt-2">
                Ansprechperson (optional)
              </h2>

              <div className="flex gap-4 items-end">
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Anrede
                  </label>
                  <select
                    value={fields.contactSalutation}
                    onChange={(e) =>
                      setField("contactSalutation", e.target.value)
                    }
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 bg-white"
                  >
                    <option value=""></option>
                    <option value="Herr">Herr</option>
                    <option value="Frau">Frau</option>
                  </select>
                </div>
                <div className="w-2/3">
                  <Field
                    label="Name"
                    name="contactPerson"
                    value={fields.contactPerson}
                    onChange={setField}
                    placeholder="z.B. Müller"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </section>

            {/* ── Contact ── */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-500 pt-2">
                Kontakt (optional)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="E-Mail"
                  name="companyEmail"
                  value={fields.companyEmail}
                  onChange={setField}
                  placeholder="jobs@firma.de"
                  disabled={isLoading}
                />
                <Field
                  label="Telefon"
                  name="companyPhone"
                  value={fields.companyPhone}
                  onChange={setField}
                  placeholder="+49 30 12345678"
                  disabled={isLoading}
                />
              </div>
            </section>

            {/* ── Job info ── */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-500 pt-2">
                Stelle
              </h2>

              <Field
                label="Stelle / Angebot"
                name="jobTitle"
                value={fields.jobTitle}
                onChange={setField}
                required
                placeholder={
                  branch === "informatik"
                    ? "z.B. Fachinformatiker"
                    : "z.B. Hotelfachmann"
                }
                disabled={isLoading}
              />

              {branch === "gastronomie" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Abteilung / Betriebstyp
                  </label>
                  <select
                    value={fields.department}
                    onChange={(e) => setField("department", e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Hotel">Hotel</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Café">Café</option>
                    <option value="Bäckerei">Bäckerei</option>
                    <option value="Bar">Bar</option>
                    <option value="Catering">Catering</option>
                    <option value="Küche">Küche</option>
                    <option value="Service">Service</option>
                  </select>
                </div>
              )}

              <Field
                label="Ausbildungsbeginn"
                name="ausbildungStart"
                value={fields.ausbildungStart}
                onChange={setField}
                placeholder="z.B. September 2026 oder ab sofort"
                disabled={isLoading}
              />
            </section>

            {/* ── Motivation / Tone ── */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-500 pt-2">
                Motivation & Besonderheiten
              </h2>

              {branch === "informatik" ? (
                <>
                  <Field
                    label="Fokus des Unternehmens"
                    name="companyFocus"
                    value={fields.companyFocus}
                    onChange={setField}
                    placeholder="z.B. Cloud-Architekturen"
                    disabled={isLoading}
                  />
                  <Field
                    label="Technologien & Grund"
                    name="companyTech"
                    value={fields.companyTech}
                    onChange={setField}
                    placeholder="z.B. Java"
                    disabled={isLoading}
                  />
                </>
              ) : (
                <div className="space-y-4">
                  <Field
                    label="Besonderheit des Betriebs"
                    name="companyBesonderheit"
                    value={fields.companyBesonderheit}
                    onChange={setField}
                    placeholder="z.B. exzellenten Service"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 -mt-2">
                    Eingabe: "über Ihr <strong>[Eingabe]</strong> informiert"
                  </p>

                  <Field
                    label="Persönlicher Grund / Motivation"
                    name="personalMotivation"
                    value={fields.personalMotivation}
                    onChange={setField}
                    placeholder="z.B. Leidenschaft für Kundenkontakt"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 -mt-2">
                    Eingabe: "beeindruckt mich Ihr Fokus auf <strong>[Eingabe]</strong>"
                  </p>
                </div>
              )}
            </section>

            {/* ── Mode + submit ── */}
            <div className="flex flex-col items-end gap-4 pt-4">
              <div className="w-full md:flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ausgabe
                </label>
                <select
                  value={fields.mode}
                  onChange={(e) =>
                    setField(
                      "mode",
                      e.target.value as "cover-letter" | "full-resume",
                    )
                  }
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="cover-letter">Nur Anschreiben</option>
                  <option value="full-resume">Vollständige Bewerbung</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full md:flex-none px-8 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
              >
                {isLoading ? "Wird erstellt…" : "PDF erstellen"}
              </button>
            </div>
          </form>

          {/* Error */}
          {state.status === "error" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm font-semibold text-red-700">Fehler</p>
              <p className="text-sm text-red-600 mt-1">{state.message}</p>
              <button
                onClick={() => setState({ status: "idle" })}
                className="mt-3 text-xs text-red-500 underline"
              >
                Zurücksetzen
              </button>
            </div>
          )}
        </div>

        {/* Right column: Preview & Loading */}
        <div className="lg:col-span-6 lg:sticky lg:top-10 space-y-6">
          {/* Loading */}
          {state.status === "loading" && (
            <div className="flex items-center justify-center h-[600px] border border-gray-100 rounded-xl bg-white shadow-sm gap-3 text-gray-500 text-sm">
              <svg
                className="animate-spin h-5 w-5 text-blue-500"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              PDF wird generiert…
            </div>
          )}

          {/* Success */}
          {state.status === "success" && (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    PDF erfolgreich erstellt
                  </p>
                  <p className="text-xs text-green-600 mt-0.5 font-mono">
                    {state.fileName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={triggerDownload}
                    className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Download
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-white text-gray-500 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Neu
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden h-[750px] w-full bg-white shadow-lg">
                <iframe
                  src={`${state.blobUrl}#view=FitH`}
                  title="PDF Vorschau"
                  className="w-full h-full border-none"
                />
              </div>
            </div>
          )}

          {/* Idle state */}
          {state.status === "idle" && (
            <div className="h-[750px] border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm bg-gray-50/50">
              Vorschau erscheint hier nach der Erstellung
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="w-full text-gray-400 text-center mt-10">
        Said Fateh · Bewerbung Tool · {new Date().getFullYear()}
      </p>
    </main>
  );
}

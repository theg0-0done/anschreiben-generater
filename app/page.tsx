"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormFields {
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
  ausbildungStart: string;
  mode: "cover-letter" | "full-resume";
}

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; blobUrl: string; fileName: string }
  | { status: "error"; message: string };

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_FIELDS: FormFields = {
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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [fields, setFields] = useState<FormFields>(DEFAULT_FIELDS);
  const [state, setState] = useState<AppState>({ status: "idle" });

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
    setFields(DEFAULT_FIELDS);
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Anschreiben Generator
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Fülle die Felder aus und lade dein fertiges PDF herunter.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Company info ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Unternehmen
          </h2>

          <Field
            label="Firmenname"
            name="companyName"
            value={fields.companyName}
            onChange={setField}
            required
            placeholder="z.B. Musterfirma GmbH"
            disabled={isLoading}
          />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Ansprechperson (optional)
          </h2>

          <div className="flex gap-2 items-end">
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anrede
              </label>
              <select
                value={fields.contactSalutation}
                onChange={(e) => setField("contactSalutation", e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value=""></option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
              </select>
            </div>
            <div className="w-2/3">
              <Field
                label="Name der Ansprechperson"
                name="contactPerson"
                value={fields.contactPerson}
                onChange={setField}
                placeholder="z.B. Müller"
                disabled={isLoading}
              />
            </div>
          </div>
          <Field
            label="Straße &amp; Hausnummer"
            name="companyStreet"
            value={fields.companyStreet}
            onChange={setField}
            placeholder="z.B. Musterstraße 12"
            disabled={isLoading}
          />
          <Field
            label="PLZ &amp; Ort"
            name="companyZipCity"
            value={fields.companyZipCity}
            onChange={setField}
            placeholder="z.B. 10115 Berlin"
            disabled={isLoading}
          />
        </section>

        {/* ── Contact ── */}
        <section className="space-y-3">
          <Field
            label="E-Mail des Unternehmens"
            name="companyEmail"
            value={fields.companyEmail}
            onChange={setField}
            placeholder="z.B. jobs@musterfirma.de"
            disabled={isLoading}
          />
          <Field
            label="Telefon des Unternehmens"
            name="companyPhone"
            value={fields.companyPhone}
            onChange={setField}
            placeholder="z.B. +49 30 12345678"
            disabled={isLoading}
          />
        </section>

        {/* ── Job info ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Stelle
          </h2>

          <Field
            label="Stellenbezeichnung"
            name="jobTitle"
            value={fields.jobTitle}
            onChange={setField}
            required
            placeholder="z.B. Fachinformatiker für Anwendungsentwicklung"
            disabled={isLoading}
          />
          <Field
            label="Ausbildungsbeginn (optional)"
            name="ausbildungStart"
            value={fields.ausbildungStart}
            onChange={setField}
            placeholder="z.B. September 2026"
            disabled={isLoading}
          />
        </section>

        {/* ── Motivation (Optional) ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Motivation (Optional)
          </h2>

          <div>
            <Field
              label="Fokus des Unternehmens"
              name="companyFocus"
              value={fields.companyFocus}
              onChange={setField}
              placeholder="z.B. Cloud-Architekturen"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Wird eingefügt als: &quot;Besonders Ihr Fokus auf{" "}
              <strong>[Eingabe]</strong> hat mein Interesse geweckt.&quot;
            </p>
          </div>

          <div>
            <Field
              label="Technologien & Grund"
              name="companyTech"
              value={fields.companyTech}
              onChange={setField}
              placeholder="z.B. Java spricht mich besonders an, da ich..."
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Wird eingefügt als: &quot;Ihre Arbeit mit{" "}
              <strong>[Eingabe]</strong>&quot;
            </p>
          </div>
        </section>

        {/* ── Mode + submit ── */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cover-letter">Nur Anschreiben</option>
              <option value="full-resume">
                Vollständige Bewerbung (ersetzt Seite 2)
              </option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex-none px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Wird erstellt…" : "PDF erstellen"}
          </button>
        </div>
      </form>

      {/* Loading */}
      {state.status === "loading" && (
        <div className="mt-8 flex items-center gap-3 text-gray-500 text-sm">
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

      {/* Error */}
      {state.status === "error" && (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
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

      {/* Success */}
      {state.status === "success" && (
        <div className="mt-8 space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-semibold text-green-800">PDF fertig</p>
            <p className="text-xs text-green-700 mt-1 font-mono break-all">
              {state.fileName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerDownload}
              className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Herunterladen
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Neues Anschreiben
            </button>
          </div>

          <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden h-[600px] w-full bg-gray-50">
            <iframe
              src={`${state.blobUrl}#view=FitH`}
              title="PDF Vorschau"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="mt-16 text-xs text-gray-400 text-center">
        Said Fateh · Ausbildung Application Tool · {new Date().getFullYear()}
      </p>
    </main>
  );
}

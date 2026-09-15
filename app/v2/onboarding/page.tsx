"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, UploadCloud, ChevronRight, File as FileIcon } from "lucide-react";
import {
  createContext,
  saveContext,
  saveProfile,
  getProfile,
  uploadJobDocument,
  fileToBase64,
  setActiveContextId,
} from "@/lib/data";
import { LoadingState } from "@/app/components/LoadingState";

const REQUIRED_PROFILE_FIELDS = ["first_name", "last_name", "email", "street_house", "postal_city"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Files
  const [resume, setResume] = useState<File | null>(null);
  const [cv, setCv] = useState<File | null>(null);

  // Drag states
  const [isCvDragging, setIsCvDragging] = useState(false);
  const [isResumeDragging, setIsResumeDragging] = useState(false);

  // Form State
  const [jobTitle, setJobTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [streetHouse, setStreetHouse] = useState("");
  const [postalCity, setPostalCity] = useState("");
  const [personalLinks, setPersonalLinks] = useState("");
  const [coverLetterPageNumber, setCoverLetterPageNumber] = useState("1");

  // If the user already completed their personal info before (e.g. they're
  // signed in and adding another job title), skip straight to step 2.
  useEffect(() => {
    getProfile().then((profile) => {
      if (profile) {
        setFirstName(profile.first_name ?? "");
        setLastName(profile.last_name ?? "");
        setEmail(profile.email ?? "");
        setPhone(profile.phone ?? "");
        setStreetHouse(profile.street_house ?? "");
        setPostalCity(profile.postal_city ?? "");
        setPersonalLinks(profile.personal_links ?? "");

        const isComplete = REQUIRED_PROFILE_FIELDS.every((field) => !!profile[field]);
        if (isComplete) setStep(2);
      }
      setCheckingProfile(false);
    });
  }, []);

  const handleSavePersonalInfo = async () => {
    if (!firstName || !lastName || !email || !streetHouse || !postalCity) {
      setErrorMsg("Bitte füllen Sie alle erforderlichen Felder aus.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      await saveProfile({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        street_house: streetHouse,
        postal_city: postalCity,
        personal_links: personalLinks,
      });
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File) => void) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setter(file);
    } else {
      alert("Bitte laden Sie eine gültige PDF-Datei hoch.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, setDragging: (b: boolean) => void) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent, setDragging: (b: boolean) => void) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent, setter: (f: File) => void, setDragging: (b: boolean) => void) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        setter(file);
      } else {
        alert("Bitte laden Sie eine gültige PDF-Datei hoch.");
      }
    }
  };

  const handleComplete = async () => {
    if (!jobTitle || !cv || !resume) {
      setErrorMsg("Bitte füllen Sie den Ausbildungsberuf aus und laden Sie beide PDF-Dateien hoch.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      // 1. Get Base64 of the CV directly from the in-memory file, for the AI call
      const cvBase64 = await fileToBase64(cv);

      // 2. Generate AI cover-letter template from the CV
      const res = await fetch("/api/generate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetJob: jobTitle, resumeBase64: cvBase64, firstName, lastName }),
      });

      if (!res.ok) {
        let errorMsg = "Anschreiben-Vorlage konnte nicht generiert werden.";
        try {
          const text = await res.text();
          const errorData = JSON.parse(text);
          errorMsg = errorData.error || errorMsg;
        } catch {
          // Server returned HTML (e.g. 500 page) — use generic message
        }
        throw new Error(errorMsg);
      }

      const { template, fallbackHook } = await res.json();

      // 3. Create the job-title context (owned by the signed-in user via RLS)
      const newContext = await createContext({
        job_title: jobTitle,
        cover_letter_template: template,
        cover_letter_page_number: parseInt(coverLetterPageNumber, 10) || 1,
        fallback_hook: fallbackHook || "",
        cv_file_name: cv.name,
        resume_file_name: resume.name,
      });

      // 4. Upload the PDFs to Supabase Storage under this context, then record their paths
      const [cvPath, resumePath] = await Promise.all([
        uploadJobDocument(newContext.id, "cv", cv),
        uploadJobDocument(newContext.id, "resume", resume),
      ]);
      await saveContext(newContext.id, {
        cv_storage_path: cvPath,
        resume_storage_path: resumePath,
      });

      setActiveContextId(newContext.id);
      router.push("/v2/apply");

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ein unerwarteter Fehler ist aufgetreten. Überprüfen Sie die Konsole.");
      setLoading(false);
    }
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] to-[#e0e8f0] flex items-center justify-center p-4">
        <LoadingState message="Wird geladen..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] to-[#e0e8f0] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/50 p-8 md:p-12"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Ausbildung hinzufügen</h1>
          <p className="text-slate-500 mt-2">Richten Sie einen neuen Ausbildungskontext für Ihre perfekten Anschreiben ein.</p>
        </div>

        {/* Step 1: Persönliche Infos */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
             <h2 className="text-xl font-semibold text-slate-700 mb-6 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Persönliche Infos
            </h2>

            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{errorMsg}</div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vorname</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nachname</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefonnummer</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Straße und Hausnummer</label>
                  <input type="text" value={streetHouse} onChange={(e) => setStreetHouse(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PLZ und Ort</label>
                  <input type="text" value={postalCity} onChange={(e) => setPostalCity(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
                </div>
              </div>

               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Persönliche Links</label>
                <input type="text" value={personalLinks} onChange={(e) => setPersonalLinks(e.target.value)} placeholder="z.B. GitHub, LinkedIn, Portfolio" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button onClick={handleSavePersonalInfo} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all active:scale-95">
                Weiter <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Ausbildung */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-semibold text-slate-700 mb-6 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              Ausbildung
            </h2>

            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{errorMsg}</div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ziel-Ausbildungsberuf</label>
                <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="z.B. Fachinformatiker für Anwendungsentwicklung" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Anschreiben-Seite im Lebenslauf</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={coverLetterPageNumber}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, "");
                    setCoverLetterPageNumber(digitsOnly);
                  }}
                  onBlur={() => {
                    if (!coverLetterPageNumber || parseInt(coverLetterPageNumber, 10) < 1) setCoverLetterPageNumber("1");
                  }}
                  placeholder="z.B. 1 oder 2"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CV (1-2 pages) */}
              <label
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, setIsCvDragging)}
                onDragLeave={(e) => handleDragLeave(e, setIsCvDragging)}
                onDrop={(e) => handleDrop(e, setCv, setIsCvDragging)}
                className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors relative h-full flex flex-col justify-center ${
                  isCvDragging
                    ? "border-purple-500 bg-purple-100/50"
                    : "border-purple-200 bg-purple-50/50 hover:bg-purple-50"
                }`}
              >
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileChange(e, setCv)} />
                {cv ? (
                  <div className="flex flex-col items-center">
                    <FileIcon className="w-10 h-10 text-purple-600 mb-3" />
                    <p className="text-sm font-medium text-slate-800 line-clamp-2">{cv.name}</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-10 h-10 text-purple-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700">Lebenslauf</p>
                    <p className="text-xs text-slate-500 mt-1">Nur Text für die KI (1-2 S.).</p>
                  </>
                )}
              </label>

              {/* Full Resume */}
              <label
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, setIsResumeDragging)}
                onDragLeave={(e) => handleDragLeave(e, setIsResumeDragging)}
                onDrop={(e) => handleDrop(e, setResume, setIsResumeDragging)}
                className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors relative h-full flex flex-col justify-center ${
                  isResumeDragging
                    ? "border-emerald-500 bg-emerald-100/50"
                    : "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                }`}
              >
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileChange(e, setResume)} />
                {resume ? (
                  <div className="flex flex-col items-center">
                    <FileIcon className="w-10 h-10 text-emerald-600 mb-3" />
                    <p className="text-sm font-medium text-slate-800 line-clamp-2">{resume.name}</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700">Bewerbungsunterlagen</p>
                    <p className="text-xs text-slate-500 mt-1">Volles Dokument (inkl. Zeugnisse).</p>
                  </>
                )}
              </label>
            </div>

            <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-3">
              <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-700 font-medium disabled:opacity-50" disabled={loading}>Zurück</button>
              <button onClick={handleComplete} disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white px-8 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/30">
                {loading ? (
                   <span className="flex items-center gap-2">
                     <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                     KI generiert Pitch...
                   </span>
                ) : (
                  <>Einrichtung abschließen <CheckCircle className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

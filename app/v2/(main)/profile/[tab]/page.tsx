"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getActiveContext, saveContext,
  getProfile, saveProfile, uploadAvatar,
  getJobDocumentBlob, uploadJobDocument, fileToBase64,
  JobContext, Profile,
} from "@/lib/data";
import { User, Briefcase, FileText as FileTextIcon, Mail, CheckCircle, XCircle, RefreshCcw, Camera, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingState } from "@/app/components/LoadingState";
import { isValidEmail, EMAIL_ERROR_MESSAGE } from "@/lib/validation";

type Tab = "user" | "ausbildung" | "email";
const VALID_TABS: Tab[] = ["user", "ausbildung", "email"];

// Deterministic truncation so a long filename never overflows its card,
// regardless of screen width — keeps the extension visible.
function truncateFileName(name: string, keep: number = 8): string {
  const dotIdx = name.lastIndexOf(".");
  const ext = dotIdx > -1 ? name.slice(dotIdx) : "";
  const base = dotIdx > -1 ? name.slice(0, dotIdx) : name;
  if (base.length <= keep) return name;
  return `${base.slice(0, keep)}....${ext}`;
}

export default function ProfilePage() {
  const params = useParams<{ tab: string }>();
  const tab: Tab = (VALID_TABS as string[]).includes(params.tab) ? (params.tab as Tab) : "user";

  const [context, setContext] = useState<JobContext | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [coverLetterPageInput, setCoverLetterPageInput] = useState("1");
  const [userEmailError, setUserEmailError] = useState("");

  // Ausbildung tab state
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [genericResumeUrl, setGenericResumeUrl] = useState<string | null>(null);
  const [template, setTemplate] = useState("");
  const [originalTemplate, setOriginalTemplate] = useState("");
  const [isTemplateSaved, setIsTemplateSaved] = useState(false);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [isCvDragging, setIsCvDragging] = useState(false);
  const [isResumeDragging, setIsResumeDragging] = useState(false);
  const [isGenericDragging, setIsGenericDragging] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [isUploadingGeneric, setIsUploadingGeneric] = useState(false);

  useEffect(() => {
    getActiveContext().then(active => {
      setContext(active);
      if (active) {
        setTemplate(active.cover_letter_template || "");
        setOriginalTemplate(active.cover_letter_template || "");
        setCoverLetterPageInput(String(active.cover_letter_page_number || 1));
        loadDocuments(active);
      }
    });
    getProfile().then(setProfile);
  }, []);

  const loadDocuments = async (ctx: JobContext) => {
    if (ctx.resume_storage_path) {
      const blob = await getJobDocumentBlob(ctx.resume_storage_path);
      if (blob) setResumeUrl(URL.createObjectURL(blob));
    }
    if (ctx.cv_storage_path) {
      const blob = await getJobDocumentBlob(ctx.cv_storage_path);
      if (blob) setCvUrl(URL.createObjectURL(blob));
    }
    if (ctx.generic_resume_storage_path) {
      const blob = await getJobDocumentBlob(ctx.generic_resume_storage_path);
      if (blob) setGenericResumeUrl(URL.createObjectURL(blob));
    }
  };

  const flashSuccess = (msg: string) => {
    setErrorMsg("");
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const flashError = (msg: string) => {
    setSuccessMsg("");
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 4000);
  };

  // ── Avatar ──────────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again still fires this handler.
    e.target.value = "";
    if (!file) return;
    // Some mobile browsers/webviews (e.g. camera captures) don't set a MIME
    // type at all — only reject when a type IS reported and it isn't an image.
    if (file.type && !file.type.startsWith("image/")) {
      flashError("Bitte wählen Sie eine gültige Bilddatei aus.");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      setProfile(prev => prev ? { ...prev, avatar_url: url } : prev);
      flashSuccess("Profilbild erfolgreich aktualisiert!");
    } catch (err) {
      console.error(err);
      flashError("Profilbild konnte nicht hochgeladen werden.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ── User-Infos tab ──────────────────────────────────────────────────────
  const handleSaveUserInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (profile.email && !isValidEmail(profile.email)) {
      setUserEmailError(EMAIL_ERROR_MESSAGE);
      flashError(EMAIL_ERROR_MESSAGE);
      return;
    }
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await saveProfile({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        street_house: profile.street_house,
        postal_city: profile.postal_city,
        personal_links: profile.personal_links,
      });
      flashSuccess("Benutzerinfos erfolgreich gespeichert!");
    } catch (err) {
      console.error(err);
      flashError("Fehler beim Speichern.");
    } finally {
      setLoading(false);
    }
  };

  // ── Ausbildung tab ──────────────────────────────────────────────────────
  const handleSaveAusbildungInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    const pageNumber = parseInt(coverLetterPageInput, 10) || 1;
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await saveContext(context.id, {
        job_title: context.job_title,
        cover_letter_page_number: pageNumber,
      });
      setContext({ ...context, cover_letter_page_number: pageNumber });
      flashSuccess("Ausbildungsdetails erfolgreich gespeichert!");
    } catch (err) {
      console.error(err);
      flashError("Fehler beim Speichern.");
    } finally {
      setLoading(false);
    }
  };

  const processFile = async (file: File, type: "resume" | "cv" | "generic") => {
    if (!context) return;
    if (file.type !== "application/pdf") {
      flashError("Bitte laden Sie eine gültige PDF-Datei hoch.");
      return;
    }

    if (type === "generic") {
      setIsUploadingGeneric(true);
      try {
        const path = await uploadJobDocument(context.id, "generic", file);
        setGenericResumeUrl(URL.createObjectURL(file));
        await saveContext(context.id, { generic_resume_storage_path: path, generic_resume_file_name: file.name });
        setContext({ ...context, generic_resume_storage_path: path, generic_resume_file_name: file.name });
        flashSuccess("Allgemeine Bewerbung erfolgreich aktualisiert!");
      } catch (err) {
        console.error(err);
        flashError("Upload fehlgeschlagen. Bitte versuchen Sie es erneut.");
      } finally {
        setIsUploadingGeneric(false);
      }
      return;
    }

    if (type === "resume") {
      setIsUploadingResume(true);
      try {
        const path = await uploadJobDocument(context.id, "resume", file);
        setResumeUrl(URL.createObjectURL(file));
        await saveContext(context.id, { resume_storage_path: path, resume_file_name: file.name });
        setContext({ ...context, resume_storage_path: path, resume_file_name: file.name });
        flashSuccess("Bewerbungsunterlagen erfolgreich aktualisiert!");
      } catch (err) {
        console.error(err);
        flashError("Upload fehlgeschlagen. Bitte versuchen Sie es erneut.");
      } finally {
        setIsUploadingResume(false);
      }
    } else {
      setIsUploadingCv(true);
      try {
        const path = await uploadJobDocument(context.id, "cv", file);
        setCvUrl(URL.createObjectURL(file));
        let updatedContext = { ...context, cv_storage_path: path, cv_file_name: file.name };
        await saveContext(context.id, { cv_storage_path: path, cv_file_name: file.name });
        setContext(updatedContext);

        setIsGeneratingTemplate(true);
        const cvBase64 = await fileToBase64(file);
        const res = await fetch("/api/generate-pitch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetJob: updatedContext.job_title,
            resumeBase64: cvBase64,
            firstName: profile?.first_name,
            lastName: profile?.last_name,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setTemplate(data.template);
          const fallbackHook = data.fallbackHook || updatedContext.fallback_hook || "";
          await saveContext(context.id, { cover_letter_template: data.template, fallback_hook: fallbackHook });
          setContext({ ...updatedContext, cover_letter_template: data.template, fallback_hook: fallbackHook });
          setOriginalTemplate(data.template);
          setIsTemplateSaved(true);
          setTimeout(() => setIsTemplateSaved(false), 2000);
        } else {
          flashError("Fehler bei der KI-Generierung. Bitte versuchen Sie es erneut.");
        }
      } catch (err) {
        console.error(err);
        flashError("Es gab einen Fehler bei der Verbindung zur KI.");
      } finally {
        setIsGeneratingTemplate(false);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>, type: "resume" | "cv" | "generic") => {
    const file = e.target.files?.[0];
    // Reset so re-selecting the same file (e.g. a corrected re-upload with an
    // unchanged name) still fires this handler next time.
    e.target.value = "";
    if (file) await processFile(file, type);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragEnter = (e: React.DragEvent, setDragging: (b: boolean) => void) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent, setDragging: (b: boolean) => void) => { e.preventDefault(); setDragging(false); };
  const handleDrop = async (e: React.DragEvent, type: "resume" | "cv" | "generic", setDragging: (b: boolean) => void) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type === "application/pdf") await processFile(file, type);
      else flashError("Bitte laden Sie eine gültige PDF-Datei hoch.");
    }
  };

  const handleSaveTemplate = async () => {
    if (context && template !== originalTemplate) {
      await saveContext(context.id, { cover_letter_template: template });
      setContext({ ...context, cover_letter_template: template });
      setOriginalTemplate(template);
      setIsTemplateSaved(true);
      setTimeout(() => setIsTemplateSaved(false), 2000);
    }
  };

  // ── E-Mail-Vorlage tab ──────────────────────────────────────────────────
  const handleSaveEmailTemplate = async () => {
    if (!context) return;
    setLoading(true);
    try {
      await saveContext(context.id, { email_subject: context.email_subject, email_body: context.email_body });
      flashSuccess("E-Mail-Vorlage gespeichert!");
    } catch (err) {
      console.error(err);
      flashError("Fehler beim Speichern.");
    } finally {
      setLoading(false);
    }
  };

  if (!context || !profile) return <LoadingState message="Lade Benutzerinfos..." />;

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: "user", label: "Benutzerinfos", icon: User },
    { id: "ausbildung", label: "Ausbildung", icon: Briefcase },
    { id: "email", label: "E-Mail-Vorlage", icon: Mail },
  ];

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-full space-y-3 sm:space-y-6">

      {/* Pill tabs — outside the card, always one row, routed via URL */}
      <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <Link
            key={t.id}
            href={`/v2/profile/${t.id}`}
            className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <t.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {t.label}
          </Link>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 sm:p-6 md:p-8 flex flex-col">

        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-2xl flex items-center gap-2 text-sm font-medium">
                <XCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Benutzerinfos ────────────────────────────────────────────── */}
        {tab === "user" && (
          <form onSubmit={handleSaveUserInfo}>
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-2xl">
                    {profile.first_name?.charAt(0) || "U"}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                  title="Profilbild ändern"
                >
                  {isUploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{profile.first_name} {profile.last_name}</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">{profile.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Vorname / Nachname — always one row */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Vorname</label>
                  <input
                    type="text"
                    value={profile.first_name ?? ""}
                    onChange={e => setProfile({...profile, first_name: e.target.value})}
                    required
                    className="w-full px-3 sm:px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Nachname</label>
                  <input
                    type="text"
                    value={profile.last_name ?? ""}
                    onChange={e => setProfile({...profile, last_name: e.target.value})}
                    required
                    className="w-full px-3 sm:px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">E-Mail</label>
                  <input
                    type="email"
                    value={profile.email ?? ""}
                    onChange={e => { setProfile({...profile, email: e.target.value}); if (userEmailError) setUserEmailError(""); }}
                    onBlur={() => { if (profile.email && !isValidEmail(profile.email)) setUserEmailError(EMAIL_ERROR_MESSAGE); }}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-full focus:bg-white dark:focus:bg-slate-700 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                      userEmailError ? "border-rose-400 dark:border-rose-600 focus:ring-2 focus:ring-rose-400" : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                    }`}
                  />
                  {userEmailError && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{userEmailError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Telefonnummer</label>
                  <input
                    type="tel"
                    value={profile.phone ?? ""}
                    onChange={e => setProfile({...profile, phone: e.target.value})}
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Straße / PLZ — always one row */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Straße und Hausnummer</label>
                  <input
                    type="text"
                    value={profile.street_house ?? ""}
                    onChange={e => setProfile({...profile, street_house: e.target.value})}
                    required
                    className="w-full px-3 sm:px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">PLZ und Ort</label>
                  <input
                    type="text"
                    value={profile.postal_city ?? ""}
                    onChange={e => setProfile({...profile, postal_city: e.target.value})}
                    required
                    className="w-full px-3 sm:px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 flex justify-between">
                  Persönliche Links
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Optional</span>
                </label>
                <input
                  type="text"
                  value={profile.personal_links ?? ""}
                  onChange={e => setProfile({...profile, personal_links: e.target.value})}
                  placeholder="z.B. GitHub, LinkedIn, Portfolio"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70"
              >
                {loading ? (<><RefreshCcw className="w-5 h-5 animate-spin" /> Speichern...</>) : "Änderungen speichern"}
              </button>
            </div>
          </form>
        )}

        {/* ── Ausbildung ───────────────────────────────────────────────── */}
        {tab === "ausbildung" && (
          <div className="space-y-6">
            <form onSubmit={handleSaveAusbildungInfo} className="bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Ausbildungsdetails</h3>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-full text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-70 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Speichern
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Ausbildungsberuf</label>
                  <input
                    type="text"
                    value={context.job_title}
                    onChange={e => setContext({...context, job_title: e.target.value})}
                    required
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Anschreiben-Seite im Lebenslauf</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={coverLetterPageInput}
                    onChange={e => setCoverLetterPageInput(e.target.value.replace(/\D/g, ""))}
                    onBlur={() => {
                      if (!coverLetterPageInput || parseInt(coverLetterPageInput, 10) < 1) setCoverLetterPageInput("1");
                    }}
                    required
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>
            </form>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-4 sm:p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Lebenslauf</h3>
                    <label htmlFor="cv-upload-input" className="cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-1.5 rounded-full text-sm font-medium transition-colors">
                      ändern
                    </label>
                    <input id="cv-upload-input" type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileInput(e, "cv")} />
                  </div>
                  <label
                    htmlFor="cv-upload-input"
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, setIsCvDragging)}
                    onDragLeave={(e) => handleDragLeave(e, setIsCvDragging)}
                    onDrop={(e) => handleDrop(e, "cv", setIsCvDragging)}
                    className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 min-h-[140px] transition-all cursor-pointer ${
                      isCvDragging ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {isUploadingCv ? (
                      <div className="flex flex-col items-center gap-2 text-purple-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-sm font-medium">Lädt hoch...</span>
                      </div>
                    ) : cvUrl ? (
                      <div className="flex flex-col items-center gap-2 text-slate-600 dark:text-slate-300 max-w-full px-2">
                        <Check className="w-8 h-8 text-purple-500" />
                        <span className="font-bold text-sm text-center">{truncateFileName(context.cv_file_name || "Lebenslauf.pdf")}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                        <FileTextIcon className="w-8 h-8 opacity-50" />
                        <span className="text-sm">Kein Lebenslauf gefunden</span>
                      </div>
                    )}
                  </label>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-4 sm:p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Komplette Unterlagen</h3>
                    <label htmlFor="resume-upload-input" className="cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-1.5 rounded-full text-sm font-medium transition-colors">
                      ändern
                    </label>
                    <input id="resume-upload-input" type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileInput(e, "resume")} />
                  </div>
                  <label
                    htmlFor="resume-upload-input"
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, setIsResumeDragging)}
                    onDragLeave={(e) => handleDragLeave(e, setIsResumeDragging)}
                    onDrop={(e) => handleDrop(e, "resume", setIsResumeDragging)}
                    className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 min-h-[140px] transition-all cursor-pointer ${
                      isResumeDragging ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {isUploadingResume ? (
                      <div className="flex flex-col items-center gap-2 text-emerald-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-sm font-medium">Lädt hoch...</span>
                      </div>
                    ) : resumeUrl ? (
                      <div className="flex flex-col items-center gap-2 text-slate-600 dark:text-slate-300 max-w-full px-2">
                        <Check className="w-8 h-8 text-emerald-500" />
                        <span className="font-bold text-sm text-center">{truncateFileName(context.resume_file_name || "")}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                        <FileTextIcon className="w-8 h-8 opacity-50" />
                        <span className="text-sm">Keine Unterlagen</span>
                      </div>
                    )}
                  </label>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-4 sm:p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Allgemeine Bewerbung</h3>
                    <label htmlFor="generic-upload-input" className="cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-1.5 rounded-full text-sm font-medium transition-colors">
                      ändern
                    </label>
                    <input id="generic-upload-input" type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileInput(e, "generic")} />
                  </div>
                  <label
                    htmlFor="generic-upload-input"
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, setIsGenericDragging)}
                    onDragLeave={(e) => handleDragLeave(e, setIsGenericDragging)}
                    onDrop={(e) => handleDrop(e, "generic", setIsGenericDragging)}
                    className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 min-h-[140px] transition-all cursor-pointer ${
                      isGenericDragging ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {isUploadingGeneric ? (
                      <div className="flex flex-col items-center gap-2 text-blue-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-sm font-medium">Lädt hoch...</span>
                      </div>
                    ) : genericResumeUrl ? (
                      <div className="flex flex-col items-center gap-2 text-slate-600 dark:text-slate-300 max-w-full px-2">
                        <Check className="w-8 h-8 text-blue-500" />
                        <span className="font-bold text-sm text-center">{truncateFileName(context.generic_resume_file_name || "")}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                        <FileTextIcon className="w-8 h-8 opacity-50" />
                        <span className="text-sm text-center px-2">Für Massenbewerbungen ohne Firmenbezug, auch im Bewerbungsbereich generierbar</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Anschreiben-Vorlage</h3>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={template === originalTemplate || isGeneratingTemplate}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                      isTemplateSaved ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300" :
                      template === originalTemplate || isGeneratingTemplate ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed" :
                      "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    }`}
                  >
                    {isTemplateSaved ? <><Check className="w-4 h-4" /> Gespeichert</> : "Speichern"}
                  </button>
                </div>
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-700 flex flex-col min-h-[350px]">
                  {isGeneratingTemplate && (
                    <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">KI generiert neue Vorlage...</span>
                    </div>
                  )}
                  <textarea
                    className="w-full h-full p-6 bg-transparent resize-none focus:outline-none text-slate-700 dark:text-slate-200 leading-relaxed font-sans"
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    placeholder="Ihre generierte Anschreiben-Vorlage erscheint hier..."
                    disabled={isGeneratingTemplate}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── E-Mail-Vorlage ───────────────────────────────────────────── */}
        {tab === "email" && (
          <div className="flex flex-col space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Betreff</label>
              <input
                type="text"
                value={context.email_subject || `Bewerbung als ${context.job_title}, ${profile.first_name} ${profile.last_name}`}
                onChange={e => setContext({...context, email_subject: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex-1 flex flex-col min-h-[280px]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 flex justify-between items-center">
                Nachricht
                <div className="text-[10px] text-slate-400 dark:text-slate-500 space-x-1">
                  <span title="Anrede generiert sich automatisch">[Salutation]</span>
                  <span title="Ihr Jobtitel">[JobTitle]</span>
                </div>
              </label>
              <textarea
                value={context.email_body || `[Salutation],\n\nhiermit bewerbe ich mich auf die Stelle als [JobTitle].\nErbeten finden Sie meine Bewerbungsunterlagen im Anhang.\n\nMit freundlichen Grüßen\n[FirstName] [LastName]\n[Phone]\n[Email]`}
                onChange={e => setContext({...context, email_body: e.target.value})}
                className="w-full flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveEmailTemplate}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70"
              >
                {loading ? (<><RefreshCcw className="w-5 h-5 animate-spin" /> Speichern...</>) : "Vorlage speichern"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

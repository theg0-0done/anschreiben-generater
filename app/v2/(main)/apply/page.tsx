"use client";

import { useState, useEffect, useRef } from "react";
import { getActiveContext, getProfile, getJobDocumentBlob, uploadScheduledPdf, JobContext, Profile } from "@/lib/data";
import { insertCoverLetterPage } from "@/lib/pdf-merger";
import { Toast } from "@/app/components/Toast";
import { LoadingState } from "@/app/components/LoadingState";
import { Loader2, Zap, ChevronDown, Mail, Send, Clock, X, Calendar, Building2, User, MapPin } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function ApplyPage() {
  const [context, setContext] = useState<JobContext | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [contactSalutation, setContactSalutation] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [street, setStreet] = useState("");
  const [postalCity, setPostalCity] = useState("");
  const [companyInfo, setCompanyInfo] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdatingPdf, setIsUpdatingPdf] = useState(false);
  const [hook, setHook] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [mode, setMode] = useState<"cover-letter" | "full-resume">("cover-letter");
  const [pdfUrl, setPdfUrl] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastCompanyKey, setLastCompanyKey] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customScheduleDate, setCustomScheduleDate] = useState("");
  const [customScheduleTime, setCustomScheduleTime] = useState("08:00");
  const scheduleMenuRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Load context and restored state
  useEffect(() => {
    getActiveContext().then(setContext);
    getProfile().then(setProfile);
    const saved = sessionStorage.getItem("dashboardState");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompanyName(parsed.companyName || "");
        setContactSalutation(parsed.contactSalutation || "");
        setContactPerson(parsed.contactPerson || "");
        setStreet(parsed.street || "");
        setPostalCity(parsed.postalCity || "");
        setCompanyInfo(parsed.companyInfo || "");
        setHook(parsed.hook || "");
        setShowPreview(parsed.showPreview || false);
        setMode(parsed.mode || "cover-letter");
        setLastCompanyKey(parsed.lastCompanyKey || "");
        setCompanyEmail(parsed.companyEmail || "");
        if (parsed.pdfUrl) {
          setPdfUrl(parsed.pdfUrl);
        }
      } catch (e) {
        console.error("Failed to parse dashboard state");
      }
    }
    // Check Gmail auth status
    fetch("/api/auth/status")
      .then(res => res.json())
      .then(data => setGmailConnected(data.authenticated))
      .catch(() => setGmailConnected(false));
    setIsLoaded(true);
  }, []);

  // Close the schedule dropdown when clicking outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (scheduleMenuRef.current && !scheduleMenuRef.current.contains(event.target as Node)) {
        setShowScheduleMenu(false);
        setShowCustomDatePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save state on change
  useEffect(() => {
    if (!isLoaded) return;
    const state = {
      companyName,
      contactSalutation,
      contactPerson,
      street,
      postalCity,
      companyInfo,
      hook,
      showPreview,
      mode,
      pdfUrl,
      lastCompanyKey,
      companyEmail
    };
    sessionStorage.setItem("dashboardState", JSON.stringify(state));
  }, [isLoaded, companyName, contactSalutation, contactPerson, street, postalCity, companyInfo, hook, showPreview, mode, pdfUrl, lastCompanyKey, companyEmail]);

  const generatePdf = async (currentHook: string, currentMode: string) => {
    if (!context) return;
    setIsUpdatingPdf(true);
    try {
      // For full-resume mode, just pass the Blob URL — no upload needed
      if (currentMode === "full-resume" && !context.resume_storage_path) {
        alert("Kein Lebenslauf gefunden. Bitte laden Sie Ihren Lebenslauf unter Benutzerinfos > Dokumente hoch.");
        setIsUpdatingPdf(false);
        return;
      }

      const branchStr = (context.job_title.toLowerCase().includes("hotel") || context.job_title.toLowerCase().includes("gastro")) ? "gastronomie" : "informatik";
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: branchStr,
          companyName,
          jobTitle: context.job_title,
          companyStreet: street,
          companyZipCity: postalCity,
          contactPerson,
          contactSalutation,
          mode: "cover-letter", // Server only generates the cover letter now
          coverLetterPageNumber: context.cover_letter_page_number || 1,
          customHook: currentHook,
          coverLetterTemplate: context.cover_letter_template,
        }),
      });
      if (!res.ok) throw new Error("Fehler bei der PDF-Generierung");

      let finalBlob = await res.blob();

      // Client-side merging for Vercel speed
      if (currentMode === "full-resume" && context.resume_storage_path) {
        const coverBuffer = new Uint8Array(await finalBlob.arrayBuffer());
        const resumeBlob = await getJobDocumentBlob(context.resume_storage_path);
        if (!resumeBlob) throw new Error("Fehler beim Herunterladen des Lebenslaufs");
        const resumeBuffer = new Uint8Array(await resumeBlob.arrayBuffer());
        
        const insertIndex = Math.max(0, (context.cover_letter_page_number || 1) - 1);
        const mergedBytes = await insertCoverLetterPage(coverBuffer, resumeBuffer, branchStr, insertIndex);
        finalBlob = new Blob([mergedBytes as any], { type: "application/pdf" });
      }

      const url = window.URL.createObjectURL(finalBlob);
      setPdfUrl(prev => {
        if (prev) window.URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      console.error(err);
      alert("Fehler bei der PDF-Generierung.");
    } finally {
      setIsUpdatingPdf(false);
    }
  };

  const handleGenerate = async () => {
    if (!context) return;
    if (!companyName) {
      alert("Bitte füllen Sie den Firmennamen aus.");
      return;
    }

    // ── Fast path: no companyInfo → use fallback hook immediately ─────────────
    if (!companyInfo.trim()) {
      const resolvedFallback = (context.fallback_hook || "")
        .replace(/\[companyName\]/g, companyName);
      await generatePdf(resolvedFallback, mode);
      setHook(resolvedFallback);
      setShowPreview(true);
      return;
    }

    const currentKey = `${companyName}-${companyInfo}`;
    if (currentKey === lastCompanyKey && hook) {
      // Re-use cached hook — just regenerate the PDF
      await generatePdf(hook, mode);
      setShowPreview(true);
      return;
    }
    
    setIsGenerating(true);
    try {
      // For full-resume mode, just pass the Blob URL — no upload needed
      if (mode === "full-resume" && !context.resume_storage_path) {
        alert("Kein Lebenslauf gefunden. Bitte laden Sie Ihren Lebenslauf unter Benutzerinfos > Dokumente hoch.");
        setIsGenerating(false);
        return;
      }

      const branchStr = (context.job_title.toLowerCase().includes("hotel") || context.job_title.toLowerCase().includes("gastro")) ? "gastronomie" : "informatik";
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: branchStr,
          companyName,
          jobTitle: context.job_title,
          companyStreet: street,
          companyZipCity: postalCity,
          contactPerson,
          contactSalutation,
          mode: "cover-letter", // Server only generates the cover letter
          coverLetterPageNumber: context.cover_letter_page_number || 1,
          coverLetterTemplate: context.cover_letter_template,
          // Pass companyInfo + names so the server generates the hook inline
          companyInfo,
          firstName: profile?.first_name,
          lastName: profile?.last_name,
        }),
      });

      if (!res.ok) throw new Error("Fehler bei der Generierung");

      // Extract the generated hook from the response header
      const hookHeader = res.headers.get("X-Generated-Hook");
      let newHook = hookHeader ? decodeURIComponent(hookHeader) : "";

      // ── Fallback: if AI didn't return a hook, use the pre-generated one ───────
      if (!newHook && context.fallback_hook) {
        newHook = context.fallback_hook.replace(/\[companyName\]/g, companyName);
        console.log("[dashboard] Using fallback hook (AI returned empty)");
      }

      setHook(newHook);
      setLastCompanyKey(currentKey);

      let finalBlob = await res.blob();

      // Client-side merging for Vercel speed
      if (mode === "full-resume" && context.resume_storage_path) {
        const coverBuffer = new Uint8Array(await finalBlob.arrayBuffer());
        const resumeBlob = await getJobDocumentBlob(context.resume_storage_path);
        if (!resumeBlob) throw new Error("Fehler beim Herunterladen des Lebenslaufs");
        const resumeBuffer = new Uint8Array(await resumeBlob.arrayBuffer());
        
        const insertIndex = Math.max(0, (context.cover_letter_page_number || 1) - 1);
        const mergedBytes = await insertCoverLetterPage(coverBuffer, resumeBuffer, branchStr, insertIndex);
        finalBlob = new Blob([mergedBytes as any], { type: "application/pdf" });
      }

      const url = window.URL.createObjectURL(finalBlob);
      setPdfUrl(prev => {
        if (prev) window.URL.revokeObjectURL(prev);
        return url;
      });
      setShowPreview(true);
    } catch (error) {
      console.error(error);
      alert("Es gab einen Fehler bei der KI-Generierung.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Automatically update the PDF if the mode changes and we already have a preview
  useEffect(() => {
    if (showPreview && hook) {
      generatePdf(hook, mode);
    }
  }, [mode]);

  // Smoothly scroll to the preview once a (new or updated) PDF is ready —
  // most useful on mobile, where the form and preview stack vertically.
  // Skip the very first run so restoring a saved pdfUrl from sessionStorage
  // on mount doesn't yank the page down before the user's done anything.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (pdfUrl) {
      previewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pdfUrl]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    
    const filename = mode === "cover-letter" 
      ? `Anschreiben_${companyName.replace(/\s+/g, '_')}_${profile?.first_name}_${profile?.last_name}.pdf` 
      : `Bewerbungsunterlagen_${companyName.replace(/\s+/g, '_')}_${profile?.first_name}_${profile?.last_name}.pdf`;
      
    a.download = filename;
    a.click();
  };

  const handleReset = () => {
    setCompanyName("");
    setContactSalutation("");
    setContactPerson("");
    setStreet("");
    setPostalCity("");
    setCompanyInfo("");
    setHook("");
    setLastCompanyKey("");
    setShowPreview(false);
    setPdfUrl("");
    setCompanyEmail("");
    sessionStorage.removeItem("dashboardState");
  };

  // ── Shared: build the subject/body/fileName from current state ───────────
  const buildEmailContent = () => {
    const salutation = contactPerson
      ? `Sehr geehrte${contactSalutation === "Frau" ? " Frau" : "r Herr"} ${contactPerson}`
      : "Sehr geehrte Damen und Herren";

    let subject = context!.email_subject || `Bewerbung als ${context!.job_title} – ${profile?.first_name} ${profile?.last_name}`;
    let emailBody = context!.email_body || `[Salutation],\n\nhiermit bewerbe ich mich auf die Stelle als [JobTitle].\nErbeten finden Sie meine Bewerbungsunterlagen im Anhang.\n\nMit freundlichen Grüßen\n[FirstName] [LastName]\n[Phone]\n[Email]`;

    const replacements: Record<string, string> = {
      "\\[Salutation\\]": salutation,
      "\\[JobTitle\\]": context!.job_title,
      "\\[CompanyName\\]": companyName || "das Unternehmen",
      "\\[FirstName\\]": profile?.first_name || "",
      "\\[LastName\\]": profile?.last_name || "",
      "\\[Phone\\]": profile?.phone || "",
      "\\[Email\\]": profile?.email || "",
    };

    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(key, "gi");
      subject = subject.replace(regex, value);
      emailBody = emailBody.replace(regex, value);
    }

    const fileName =
      `Bewerbungsunterlagen_${companyName.replace(/\s+/g, "_")}_${profile?.first_name}_${profile?.last_name}.pdf`;

    return { subject, body: emailBody, fileName };
  };

  // Instant send: attaches the PDF as base64 in the request straight to Gmail.
  const buildEmailPayload = async () => {
    if (!context || !pdfUrl || !companyEmail) return null;
    const pdfResponse = await fetch(pdfUrl);
    const pdfBlob = await pdfResponse.blob();
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const CHUNK = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const pdfBase64 = window.btoa(binary);

    const { subject, body, fileName } = buildEmailContent();
    return { to: companyEmail, subject, body, pdfBase64, fileName };
  };

  // Scheduled send: uploads the PDF straight to Storage from the browser (one
  // hop) instead of round-tripping a base64-inflated copy through our server
  // (two hops) — this is what made scheduling take 30-40s for a multi-MB file.
  const buildSchedulePayload = async () => {
    if (!context || !pdfUrl || !companyEmail) return null;
    const t0 = performance.now();
    const pdfResponse = await fetch(pdfUrl);
    const pdfBlob = await pdfResponse.blob();
    const t1 = performance.now();
    const pdfStoragePath = await uploadScheduledPdf(pdfBlob);
    const t2 = performance.now();
    console.log(
      `[schedule] blob read: ${(t1 - t0).toFixed(0)}ms, storage upload: ${(t2 - t1).toFixed(0)}ms, size: ${(pdfBlob.size / 1024).toFixed(0)}KB`
    );

    const { subject, body, fileName } = buildEmailContent();
    return { to: companyEmail, subject, body, pdfStoragePath, fileName };
  };

  const handleSendEmail = async () => {
    if (!context || !pdfUrl || !companyEmail) return;
    setIsSending(true);
    try {
      const payload = await buildEmailPayload();
      if (!payload) throw new Error("Payload konnte nicht erstellt werden.");

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Senden");
      }

      setToast({ message: "✅ E-Mail erfolgreich gesendet!", type: "success" });
    } catch (err: any) {
      console.error("Send email error:", err);
      setToast({ message: `❌ ${err.message || "Fehler beim Senden. Bitte erneut versuchen."}`, type: "error" });
    } finally {
      setIsSending(false);
    }
  };

  const handleScheduleSend = async (scheduledAt: Date) => {
    if (!context || !pdfUrl || !companyEmail) return;
    setIsScheduling(true);
    setShowScheduleMenu(false);
    setShowCustomDatePicker(false);
    try {
      const payload = await buildSchedulePayload();
      if (!payload) throw new Error("Payload konnte nicht erstellt werden.");

      const locationParts = [street, postalCity].filter(Boolean);
      const fullLocation = locationParts.length > 0 ? locationParts.join(", ") : "Deutschland";

      const attachmentsList = mode === "full-resume"
        ? ["Anschreiben", "Lebenslauf & Zeugnisse"]
        : ["Anschreiben (PDF)"];

      const metadata = {
        companyName: companyName.trim() || "Unternehmen",
        contactPerson: contactPerson.trim() || "Personalabteilung",
        contactSalutation: contactSalutation || "",
        location: fullLocation,
        jobTitle: context.job_title || "Bewerbung",
        contextId: context.id,
        attachments: attachmentsList,
      };

      const res = await fetch("/api/send-email/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          scheduledAt: scheduledAt.toISOString(),
          metadata,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Planen");
      }

      const fmt = scheduledAt.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      setToast({ message: `⏰ E-Mail geplant für ${fmt}`, type: "success" });
    } catch (err: any) {
      console.error("Schedule email error:", err);
      setToast({ message: `❌ ${err.message || "Fehler beim Planen."}`, type: "error" });
    } finally {
      setIsScheduling(false);
    }
  };

  // ── Pre-computed schedule options (mirrors Gmail) ─────────────────────────
  const getScheduleOptions = () => {
    const now = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tomorrowMorning = new Date(now); tomorrowMorning.setDate(now.getDate() + 1); tomorrowMorning.setHours(8, 0, 0, 0);
    const tomorrowAfternoon = new Date(now); tomorrowAfternoon.setDate(now.getDate() + 1); tomorrowAfternoon.setHours(13, 0, 0, 0);
    const day = now.getDay(); // 0=Sun, 1=Mon...6=Sat
    const daysToMonday = day === 0 ? 1 : day === 6 ? 2 : 8 - day;
    const mondayMorning = new Date(now); mondayMorning.setDate(now.getDate() + daysToMonday); mondayMorning.setHours(8, 0, 0, 0);
    const fmtDate = (d: Date) => d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "short" });
    const fmtTime = (d: Date) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    return [
      { label: "Morgen früh", date: tomorrowMorning, detail: `${fmtDate(tomorrowMorning)}, ${fmtTime(tomorrowMorning)}` },
      { label: "Morgen Mittag", date: tomorrowAfternoon, detail: `${fmtDate(tomorrowAfternoon)}, ${fmtTime(tomorrowAfternoon)}` },
      ...(day !== 1 ? [{ label: "Montag früh", date: mondayMorning, detail: `${fmtDate(mondayMorning)}, ${fmtTime(mondayMorning)}` }] : []),
    ];
  };

  if (!context) return <LoadingState message="Daten werden geladen..." />;

  return (
    <>
    <div className="h-full w-full max-w-[1600px] mx-auto flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 flex-1">
        
        {/* Left Form Panel */}
        <div className="lg:col-span-1 flex flex-col h-full overflow-y-auto no-scrollbar pb-8 lg:pb-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 md:p-8 flex flex-col shrink-0 min-h-full">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Unternehmensinfos</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">Angaben zur Zielposition für Ihre Bewerbung</p>
              </div>
            </div>

            <div className="space-y-5 flex flex-col flex-1">
              {/* Section: Unternehmen */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-0.5">Unternehmen</p>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Unternehmensname"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <div className="relative w-1/3">
                    <select
                      value={contactSalutation}
                      onChange={(e) => setContactSalutation(e.target.value)}
                      className="w-full h-full pl-3 pr-7 sm:px-4 sm:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 appearance-none"
                    >
                      <option value=""></option>
                      <option value="Herr">Herr</option>
                      <option value="Frau">Frau</option>
                    </select>
                    <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  </div>
                  <div className="relative w-2/3">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Ansprechpartner (Nachname)"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full pl-10 pr-3 sm:pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Adresse */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-0.5">Adresse</p>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Straße & Hausnr."
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="PLZ & Stadt"
                    value={postalCity}
                    onChange={(e) => setPostalCity(e.target.value)}
                    className="w-full px-3 sm:px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Section: Kontakt */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-0.5">Kontakt</p>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="E-Mail des Unternehmens"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Section: Stellenbeschreibung */}
              <div className="flex-1 flex flex-col space-y-3">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-0.5">Stellenbeschreibung</p>
                <div className="flex-1 flex flex-col relative">
                  <textarea
                    rows={6}
                    placeholder="Unternehmensinfos (z.B. aus der Stellenanzeige kopieren)"
                    value={companyInfo}
                    onChange={(e) => {
                      const text = e.target.value;
                      const words = text.trim().split(/\s+/).filter(Boolean);
                      if (words.length <= 400 || text.length < companyInfo.length) {
                        setCompanyInfo(text);
                      }
                    }}
                    className="w-full flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none min-h-[150px] pb-8"
                  />
                  <div className="absolute bottom-3 right-4 text-xs font-medium text-slate-400 dark:text-slate-500">
                    {companyInfo.trim().split(/\s+/).filter(Boolean).length} / 400 Wörter
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 flex flex-col sm:flex-row gap-4 sm:items-center shrink-0">
              <div className="relative w-full sm:w-56">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "cover-letter" | "full-resume")}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none pr-10"
                >
                  <option value="cover-letter">Nur Anschreiben</option>
                  <option value="full-resume">Bewerbungsunterlagen</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || isUpdatingPdf}
                className="w-full sm:flex-1 whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70"
              >
                {isGenerating || isUpdatingPdf ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Wird generiert...</>
                ) : (
                  <><Zap className="w-5 h-5" /> PDF erstellen</>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Right Preview Panel */}
        <div ref={previewSectionRef} className="lg:col-span-1 flex flex-col h-full pb-8 lg:pb-0">
           {showPreview && (
             <div className="mb-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
               <div className="min-w-0 flex-1 w-full sm:w-auto">
                 <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Generierte Datei</p>
                 <p className="text-sm font-mono font-medium text-slate-800 dark:text-slate-100 truncate" title={mode === "cover-letter" ? `Anschreiben_${companyName.toLowerCase().replace(/\s+/g, '_') || "unbekannt"}_${profile?.last_name || "Fateh"}.pdf` : `Bewerbungsunterlagen_${companyName.toLowerCase().replace(/\s+/g, '_') || "unbekannt"}_${profile?.last_name || "Fateh"}.pdf`}>
                   {mode === "cover-letter" 
                     ? `Anschreiben_${companyName.toLowerCase().replace(/\s+/g, '_') || "unbekannt"}_${profile?.last_name || "Fateh"}.pdf` 
                     : `Bewerbungsunterlagen_${companyName.toLowerCase().replace(/\s+/g, '_') || "unbekannt"}_${profile?.last_name || "Fateh"}.pdf`}
                 </p>
               </div>
               <div className="flex gap-2 w-full sm:w-auto shrink-0">
                 <button 
                   onClick={handleDownload}
                   className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 disabled:opacity-75 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                 >
                   Herunterladen
                 </button>

                 {/* Send + Schedule: only shown when Gmail connected, full-resume mode AND company email entered */}
                 {gmailConnected && mode === "full-resume" && companyEmail && (
                   <div className="relative flex" ref={scheduleMenuRef}>
                     {/* Send now */}
                     <button
                       onClick={handleSendEmail}
                       disabled={isSending || isScheduling}
                       className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white pl-4 pr-2 py-2.5 rounded-l-xl text-sm font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 border-r border-emerald-500"
                     >
                       {isSending ? (
                         <><Loader2 className="w-4 h-4 animate-spin" /> Wird gesendet...</>
                       ) : (
                         <><Send className="w-4 h-4" /> Senden</>
                       )}
                     </button>
                     {/* Schedule dropdown arrow */}
                     <button
                       onClick={() => { setShowScheduleMenu(v => !v); setShowCustomDatePicker(false); }}
                       disabled={isSending || isScheduling}
                       title="Geplanten Sendezeitpunkt wählen"
                       className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-2 py-2.5 rounded-r-xl text-sm font-semibold flex items-center gap-0.5 transition-all shadow-md active:scale-95"
                     >
                       {isScheduling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
                     </button>

                     {/* Schedule dropdown */}
                     <AnimatePresence>
                       {showScheduleMenu && (
                         <motion.div
                           initial={{ opacity: 0, y: 8, scale: 0.97 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, y: 8, scale: 0.97 }}
                           transition={{ duration: 0.15 }}
                           className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 w-[min(360px,calc(100vw-2rem))]"
                         >
                           <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                             <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Geplanter Versand</span>
                             <button onClick={() => setShowScheduleMenu(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-0.5">
                               <X className="w-3.5 h-3.5" />
                             </button>
                           </div>
                           <div className="text-[10px] text-slate-400 dark:text-slate-500 px-4 pb-2">{Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
                           <div className="divide-y divide-slate-50">
                             {getScheduleOptions().map((opt) => (
                               <button
                                 key={opt.label}
                                 onClick={() => handleScheduleSend(opt.date)}
                                 className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-4"
                               >
                                 <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{opt.label}</span>
                                 <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{opt.detail}</span>
                               </button>
                             ))}
                           </div>
                           <div className="border-t border-slate-100 dark:border-slate-800 p-2">
                             {!showCustomDatePicker ? (
                               <button
                                 onClick={() => setShowCustomDatePicker(true)}
                                 className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                               >
                                 <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Datum &amp; Uhrzeit wählen
                               </button>
                             ) : (
                               <div className="p-2 space-y-2">
                                 <input
                                   type="date"
                                   value={customScheduleDate}
                                   onChange={e => setCustomScheduleDate(e.target.value)}
                                   min={new Date().toISOString().split("T")[0]}
                                   className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                                 />
                                 <input
                                   type="time"
                                   value={customScheduleTime}
                                   onChange={e => setCustomScheduleTime(e.target.value)}
                                   className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                                 />
                                 <button
                                   onClick={() => {
                                     if (!customScheduleDate) return;
                                     const d = new Date(`${customScheduleDate}T${customScheduleTime}`);
                                     if (isNaN(d.getTime()) || d <= new Date()) {
                                       alert("Bitte ein Datum in der Zukunft wählen.");
                                       return;
                                     }
                                     handleScheduleSend(d);
                                   }}
                                   className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                                 >
                                   Planen
                                 </button>
                               </div>
                             )}
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                 )}

                 <button 
                   onClick={handleReset}
                   className="flex-1 sm:flex-initial bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
                 >
                   Neu
                 </button>
               </div>
             </div>
           )}

           <div className="bg-slate-200 dark:bg-slate-700 rounded-2xl border border-slate-300 dark:border-slate-600 flex flex-col flex-1 h-full min-h-[500px] lg:min-h-0 overflow-hidden relative w-full mx-auto">
             
             {showPreview && pdfUrl ? (
               <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden">
                 {isUpdatingPdf && (
                   <div className="absolute inset-0 z-10 bg-slate-200/50 backdrop-blur-sm flex items-center justify-center">
                     <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                   </div>
                 )}
                 <iframe 
                   src={`${pdfUrl}#toolbar=0&view=FitH`} 
                   className="w-full h-full border-none" 
                 />
               </div>
             ) : (
               <div className="flex-1 flex items-center justify-center">
                 <h2 className="text-4xl font-bold text-slate-400 dark:text-slate-500 opacity-50">PDF-Vorschau</h2>
               </div>
             )}

           </div>
        </div>

      </div>
    </div>

    {/* Toast Notification */}
    <AnimatePresence>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AnimatePresence>
    </>
  );
}

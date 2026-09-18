"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getActiveContext, getProfile, getJobDocumentBlob, uploadScheduledPdf, deleteScheduledPdf, saveContext, uploadJobDocument, JobContext, Profile } from "@/lib/data";
import { insertCoverLetterPage } from "@/lib/pdf-merger";
import { isValidEmail, EMAIL_ERROR_MESSAGE } from "@/lib/validation";
import { Toast } from "@/app/components/Toast";
import { LoadingState } from "@/app/components/LoadingState";
import { Loader2, Zap, ChevronDown, Mail, Send, Clock, X, Calendar, Building2, User, MapPin, Sparkles, UploadCloud, Check, Lock, LogIn } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useIsSignedIn } from "../auth-state";

/**
 * Stand-in context for the signed-out preview. There is no Ausbildung to load
 * without an account, but the page is built around one — giving it an empty
 * placeholder keeps every render path identical instead of forking the whole
 * component into a second "preview" version that would drift out of sync.
 */
const PREVIEW_CONTEXT: JobContext = {
  id: "",
  user_id: "",
  job_title: "Ihre Ausbildung",
  branch: null,
  cv_storage_path: null,
  resume_storage_path: null,
  cv_file_name: null,
  resume_file_name: null,
  cover_letter_template: null,
  cover_letter_page_number: 1,
  fallback_hook: null,
  email_subject: null,
  email_body: null,
  generic_resume_storage_path: null,
  generic_resume_file_name: null,
};

export default function ApplyPage() {
  // Signed-out visitors may browse and fill the form; anything that costs
  // credits or touches their Gmail asks them to sign in first.
  const isLocked = !useIsSignedIn();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

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
  const [companyEmailError, setCompanyEmailError] = useState("");
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

  // ── Generic ("mass-apply") mode — one reusable resume, no company fields ──
  const [isGenericMode, setIsGenericMode] = useState(false);
  const [genericSetupOpen, setGenericSetupOpen] = useState(false);
  const [genericPdfUrl, setGenericPdfUrl] = useState("");
  const [isGeneratingGeneric, setIsGeneratingGeneric] = useState(false);
  const [isUploadingGeneric, setIsUploadingGeneric] = useState(false);
  const genericFileInputRef = useRef<HTMLInputElement>(null);

  // Attachment pre-upload: the ~2.4MB PDF is pushed to Storage in the
  // background as soon as it exists, so pressing Send/Schedule doesn't have
  // to wait for the whole transfer. (This is why Gmail feels instant — it
  // uploads your attachment while you're still typing, not on send.)
  const attachmentUploadRef = useRef<{ url: string; promise: Promise<string> } | null>(null);
  const [isAttachmentReady, setIsAttachmentReady] = useState(false);

  const genericReady = !!context?.generic_resume_storage_path;
  const showGenericSetup = !genericReady || genericSetupOpen;
  // Whichever PDF is actually relevant right now — the per-company one or
  // the reusable generic one — so download/send/schedule share one code path.
  const activePdfUrl = isGenericMode ? genericPdfUrl : pdfUrl;
  // Generic applications are always the full merged document — derive this
  // instead of overwriting `mode` itself, which would otherwise clobber the
  // user's per-company mode preference the moment they flip the toggle.
  const effectiveMode = isGenericMode ? "full-resume" : mode;

  const startAttachmentUpload = (url: string) => {
    setIsAttachmentReady(false);

    // A previous pre-upload for an older PDF is now dead weight — bin it so
    // speculative uploads can't pile up in the bucket.
    const superseded = attachmentUploadRef.current;
    if (superseded) {
      superseded.promise.then((path) => deleteScheduledPdf(path)).catch(() => {});
    }

    const promise = (async () => {
      const t0 = performance.now();
      const blob = await (await fetch(url)).blob();
      const path = await uploadScheduledPdf(blob);
      console.log(
        `[attachment] pre-uploaded ${(blob.size / 1024 / 1024).toFixed(2)}MB in ${(performance.now() - t0).toFixed(0)}ms`
      );
      return path;
    })();
    promise.then(() => setIsAttachmentReady(true)).catch(() => {});
    attachmentUploadRef.current = { url, promise };
    return promise;
  };

  // Kick the upload off the moment a PDF is ready, not when Send is pressed.
  // Generic mode is excluded: that PDF already lives in Storage, so the server
  // reads it from there and there is nothing to pre-upload.
  useEffect(() => {
    if (isGenericMode || !activePdfUrl) return;
    if (attachmentUploadRef.current?.url === activePdfUrl) return;
    startAttachmentUpload(activePdfUrl);
  }, [activePdfUrl, isGenericMode]);

  // Load context and restored state
  useEffect(() => {
    if (isLocked) {
      setContext(PREVIEW_CONTEXT);
    } else {
      getActiveContext().then(setContext);
      getProfile().then(setProfile);
    }
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
        setIsGenericMode(parsed.isGenericMode || false);
        if (parsed.pdfUrl) {
          setPdfUrl(parsed.pdfUrl);
        }
      } catch (e) {
        console.error("Failed to parse dashboard state");
      }
    }
    // Check Gmail auth status
    if (!isLocked) {
      fetch("/api/auth/status")
        .then(res => res.json())
        .then(data => setGmailConnected(data.authenticated))
        .catch(() => setGmailConnected(false));
    }
    setIsLoaded(true);
  }, [isLocked]);

  // Lazily fetch the stored generic resume the first time generic mode is
  // opened (or on a later visit, once) rather than on every mount.
  useEffect(() => {
    if (isGenericMode && context?.generic_resume_storage_path && !genericPdfUrl) {
      getJobDocumentBlob(context.generic_resume_storage_path).then((blob) => {
        if (blob) setGenericPdfUrl(URL.createObjectURL(blob));
      });
    }
  }, [isGenericMode, context?.generic_resume_storage_path, genericPdfUrl]);

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
      companyEmail,
      isGenericMode
    };
    sessionStorage.setItem("dashboardState", JSON.stringify(state));
  }, [isLoaded, companyName, contactSalutation, contactPerson, street, postalCity, companyInfo, hook, showPreview, mode, pdfUrl, lastCompanyKey, companyEmail, isGenericMode]);

  const generatePdf = async (currentHook: string, currentMode: string) => {
    if (!context) return;
    setIsUpdatingPdf(true);
    try {
      // For full-resume mode, just pass the Blob URL — no upload needed
      if (currentMode === "full-resume" && !context.resume_storage_path) {
        alert("Kein Lebenslauf gefunden. Bitte laden Sie Ihren Lebenslauf unter Ausbildung hoch.");
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
    if (isLocked) { setShowLoginPrompt(true); return; }
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
        alert("Kein Lebenslauf gefunden. Bitte laden Sie Ihren Lebenslauf unter Ausbildung hoch.");
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
    if (isGenericMode) return; // generic mode has its own pre-built PDF
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
    if (activePdfUrl) {
      previewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activePdfUrl]);

  /**
   * iOS Safari ignores the `download` attribute on a blob: URL, so the old
   * anchor click did nothing at all on an iPhone. It also wants the anchor to
   * actually be in the document before a synthetic click counts.
   *
   * Order of preference: the share sheet (keeps the file name and offers
   * "Save to Files"), then a real anchor, then opening the PDF in a new tab so
   * the viewer's own share button can save it.
   */
  const handleDownload = async () => {
    if (!activePdfUrl) return;

    const filename = isGenericMode
      ? (context?.generic_resume_file_name || genericResumeFileName())
      : mode === "cover-letter"
        ? `Anschreiben_${companyName.replace(/\s+/g, '_')}_${profile?.first_name}_${profile?.last_name}.pdf`
        : `Bewerbungsunterlagen_${companyName.replace(/\s+/g, '_')}_${profile?.first_name}_${profile?.last_name}.pdf`;

    // iPadOS reports itself as a Mac, so touch support is part of the test.
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOS) {
      try {
        const blob = await (await fetch(activePdfUrl)).blob();
        const file = new File([blob], filename, { type: "application/pdf" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
          return;
        }
      } catch (err) {
        // Cancelling the share sheet throws too, so don't fall through to the
        // new tab in that case.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
      window.open(activePdfUrl, "_blank", "noopener");
      return;
    }

    const a = document.createElement("a");
    a.href = activePdfUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
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
    setCompanyEmailError("");
    sessionStorage.removeItem("dashboardState");
  };

  // After a send/schedule goes through, empty the fields so the next
  // application can be started right away. The scheduled-mails page is the
  // source of truth for what actually happened, so nothing is lost here.
  const clearAfterSend = () => {
    setCompanyEmail("");
    setCompanyEmailError("");
    if (!isGenericMode) {
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
    }
  };

  const handleCompanyEmailChange = (value: string) => {
    setCompanyEmail(value);
    if (companyEmailError) setCompanyEmailError("");
  };

  const handleCompanyEmailBlur = () => {
    if (companyEmail && !isValidEmail(companyEmail)) {
      setCompanyEmailError(EMAIL_ERROR_MESSAGE);
    }
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

    const fileName = isGenericMode
      ? (context!.generic_resume_file_name || "Bewerbungsunterlagen.pdf")
      : `Bewerbungsunterlagen_${companyName.trim() ? companyName.replace(/\s+/g, "_") : "Allgemein"}_${profile?.first_name}_${profile?.last_name}.pdf`;

    return { subject, body: emailBody, fileName };
  };

  // Shared by instant send and scheduling: uploads the PDF straight to
  // Storage from the browser (one hop) instead of base64-inflating it and
  // round-tripping that through our server as JSON (two hops, ~33% bigger,
  // plus a slow byte-by-byte encode in the browser) — this is what made
  // sending/scheduling a multi-MB file take up to 40s instead of 1-2s.
  const buildAttachmentPayload = async () => {
    if (!context || !activePdfUrl || !companyEmail) return null;
    const { subject, body, fileName } = buildEmailContent();
    const base = { to: companyEmail, subject, body, fileName };

    // A generic application is already sitting in Storage from the day it was
    // created. Uploading those same megabytes again on every send is what made
    // the attachment take twenty seconds to "prepare"; naming the stored copy
    // instead costs nothing and the server resolves it.
    if (isGenericMode) {
      return { ...base, genericContextId: context.id };
    }

    const t0 = performance.now();

    // Normally already finished in the background, so this just picks up the
    // result. Only falls back to uploading now if the pre-upload never ran or
    // failed, for instance on a dropped connection.
    const cached = attachmentUploadRef.current;
    let pdfStoragePath: string;
    try {
      pdfStoragePath =
        cached?.url === activePdfUrl ? await cached.promise : await startAttachmentUpload(activePdfUrl);
    } catch {
      pdfStoragePath = await startAttachmentUpload(activePdfUrl);
    }
    console.log(`[send] attachment ready after ${(performance.now() - t0).toFixed(0)}ms`);

    // This copy now belongs to the sent or scheduled mail, so queue a fresh
    // one for the next application rather than pointing two rows at one file.
    attachmentUploadRef.current = null;

    return { ...base, pdfStoragePath };
  };

  // What the scheduled-mails list shows for this application. Sent and
  // scheduled mails both land in that list, so both carry the same metadata.
  const buildApplicationMetadata = (fileName: string) => {
    const locationParts = [street, postalCity].filter(Boolean);

    // Generic sends have no company name — use the recipient's email domain
    // instead so the scheduled-mails list still shows something meaningful.
    const genericCompanyLabel = companyEmail.split("@")[1] || "Unbekanntes Unternehmen";

    return {
      companyName: isGenericMode ? genericCompanyLabel : (companyName.trim() || "Unternehmen"),
      contactPerson: contactPerson.trim() || "Personalabteilung",
      contactSalutation: contactSalutation || "",
      location: locationParts.length > 0 ? locationParts.join(", ") : "Deutschland",
      jobTitle: context!.job_title || "Bewerbung",
      contextId: context!.id,
      // Show the actual generated file name instead of a generic label.
      attachments: [fileName],
    };
  };

  const handleSendEmail = async () => {
    if (isLocked) { setShowLoginPrompt(true); return; }
    if (!context || !activePdfUrl || !companyEmail) return;
    setIsSending(true);
    try {
      const payload = await buildAttachmentPayload();
      if (!payload) throw new Error("Payload konnte nicht erstellt werden.");

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, metadata: buildApplicationMetadata(payload.fileName) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Senden");
      }

      setToast({ message: "E-Mail erfolgreich gesendet!", type: "success" });
      clearAfterSend();
    } catch (err: any) {
      console.error("Send email error:", err);
      setToast({ message: `${err.message || "Fehler beim Senden. Bitte erneut versuchen."}`, type: "error" });
    } finally {
      setIsSending(false);
    }
  };

  const handleScheduleSend = async (scheduledAt: Date) => {
    if (isLocked) { setShowLoginPrompt(true); return; }
    if (!context || !activePdfUrl || !companyEmail) return;
    setIsScheduling(true);
    setShowScheduleMenu(false);
    setShowCustomDatePicker(false);
    try {
      const payload = await buildAttachmentPayload();
      if (!payload) throw new Error("Payload konnte nicht erstellt werden.");

      const res = await fetch("/api/send-email/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          scheduledAt: scheduledAt.toISOString(),
          metadata: buildApplicationMetadata(payload.fileName),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Planen");
      }

      const fmt = scheduledAt.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      setToast({ message: `E-Mail geplant für ${fmt}`, type: "success" });
      clearAfterSend();
    } catch (err: any) {
      console.error("Schedule email error:", err);
      setToast({ message: `${err.message || "Fehler beim Planen."}`, type: "error" });
    } finally {
      setIsScheduling(false);
    }
  };

  // ── Generic ("mass-apply") resume: generate once, reuse for every send ───
  const genericResumeFileName = () =>
    `Bewerbungsunterlagen_${profile?.first_name || "Bewerbung"}_${profile?.last_name || ""}`.replace(/_+$/, "") + ".pdf";

  const saveGenericResume = async (blobOrFile: Blob, fileName: string) => {
    if (!context) return;
    const path = await uploadJobDocument(context.id, "generic", blobOrFile);
    await saveContext(context.id, { generic_resume_storage_path: path, generic_resume_file_name: fileName });
    setContext(prev => prev ? { ...prev, generic_resume_storage_path: path, generic_resume_file_name: fileName } : prev);
    setGenericPdfUrl(prev => {
      if (prev) window.URL.revokeObjectURL(prev);
      return URL.createObjectURL(blobOrFile);
    });
    setGenericSetupOpen(false);
  };

  const handleGenerateGenericResume = async () => {
    if (isLocked) { setShowLoginPrompt(true); return; }
    if (!context) return;
    if (!context.resume_storage_path) {
      setToast({ message: "Bitte laden Sie zuerst Ihre vollständigen Bewerbungsunterlagen unter Ausbildung hoch.", type: "error" });
      return;
    }
    setIsGeneratingGeneric(true);
    try {
      const branchStr = (context.job_title.toLowerCase().includes("hotel") || context.job_title.toLowerCase().includes("gastro")) ? "gastronomie" : "informatik";
      // Reuse the same company-agnostic hook already used for the "no company
      // info entered" fast path — just swap in a neutral phrase instead of a
      // real company name.
      const genericHook = (context.fallback_hook || "").replace(/\[companyName\]/g, "Ihrem Unternehmen");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: branchStr,
          companyName: "",
          jobTitle: context.job_title,
          companyStreet: "",
          companyZipCity: "",
          contactPerson: "",
          contactSalutation: "",
          mode: "cover-letter",
          coverLetterPageNumber: context.cover_letter_page_number || 1,
          customHook: genericHook,
          coverLetterTemplate: context.cover_letter_template,
        }),
      });
      if (!res.ok) throw new Error("Fehler bei der PDF-Generierung");

      const coverBlob = await res.blob();
      const coverBuffer = new Uint8Array(await coverBlob.arrayBuffer());
      const resumeBlob = await getJobDocumentBlob(context.resume_storage_path);
      if (!resumeBlob) throw new Error("Fehler beim Herunterladen des Lebenslaufs");
      const resumeBuffer = new Uint8Array(await resumeBlob.arrayBuffer());

      const insertIndex = Math.max(0, (context.cover_letter_page_number || 1) - 1);
      const mergedBytes = await insertCoverLetterPage(coverBuffer, resumeBuffer, branchStr, insertIndex);
      const mergedBlob = new Blob([mergedBytes as any], { type: "application/pdf" });

      await saveGenericResume(mergedBlob, genericResumeFileName());
      setToast({ message: "Allgemeine Bewerbung erfolgreich erstellt!", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Fehler bei der Erstellung der allgemeinen Bewerbung.", type: "error" });
    } finally {
      setIsGeneratingGeneric(false);
    }
  };

  const handleGenericFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) { setShowLoginPrompt(true); return; }
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setToast({ message: "Bitte laden Sie eine gültige PDF-Datei hoch.", type: "error" });
      return;
    }
    setIsUploadingGeneric(true);
    try {
      await saveGenericResume(file, file.name);
      setToast({ message: "Allgemeine Bewerbung erfolgreich hochgeladen!", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Upload fehlgeschlagen. Bitte versuchen Sie es erneut.", type: "error" });
    } finally {
      setIsUploadingGeneric(false);
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

  // Shared Send + Schedule control — rendered next to "Herunterladen" for a
  // per-company application, or under the email field in generic mode.
  const renderSendScheduleActions = (fullWidth = false) => {
    if (!(gmailConnected && effectiveMode === "full-resume")) return null;
    // Always on screen: a button that only appears once the address parses
    // leaves people wondering whether sending is possible at all.
    const emailInvalid = !companyEmail.trim() || !isValidEmail(companyEmail);
    return (
      <div className={`relative flex ${fullWidth ? "w-full" : ""}`} ref={scheduleMenuRef}>
        {/* Send now */}
        <button
          onClick={handleSendEmail}
          disabled={isSending || isScheduling || emailInvalid}
          title={emailInvalid ? EMAIL_ERROR_MESSAGE : undefined}
          className={`bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white pl-4 pr-2 py-2.5 rounded-l-full pl-5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 border-r border-emerald-500 ${fullWidth ? "flex-1" : ""}`}
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
          disabled={isSending || isScheduling || emailInvalid}
          title={emailInvalid ? EMAIL_ERROR_MESSAGE : "Geplanten Sendezeitpunkt wählen"}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2.5 rounded-r-full text-sm font-semibold flex items-center gap-0.5 transition-all active:scale-95"
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
              className="fixed inset-x-4 bottom-4 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 sm:w-[360px]"
            >
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Geplanter Versand</span>
                <button onClick={() => setShowScheduleMenu(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 px-4 pb-2">{Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
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
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
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
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-full bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                    />
                    <input
                      type="time"
                      value={customScheduleTime}
                      onChange={e => setCustomScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-full bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
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
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
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
    );
  };

  if (!context) return <LoadingState message="Daten werden geladen..." />;

  return (
    <>
    <div className="h-full w-full max-w-[1600px] mx-auto flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 flex-1 lg:min-h-0">
        
        {/* Left Form Panel */}
        <div className="lg:col-span-1 flex flex-col h-full min-h-0 overflow-y-auto no-scrollbar pb-6 lg:pb-0">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 md:p-5 flex flex-col shrink-0 min-h-full lg:min-h-0 lg:flex-1 lg:shrink">
            {/* Header. The mass-apply switch lives up here on the right rather
                than in a full-width bar of its own, which cost a row of height
                the page does not have to spare. */}
            <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">Unternehmensinfos</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {isGenericMode ? "Eine Bewerbung für alle Unternehmen" : "Angaben zur Zielposition"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isGenericMode}
                  aria-label="Allgemeine Bewerbung"
                  onClick={() => setIsGenericMode(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isGenericMode ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isGenericMode ? "translate-x-5" : ""}`} />
                </button>
                <span className={`text-[11px] font-medium leading-tight text-right transition-colors ${isGenericMode ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>
                  Allgemeine<br />Bewerbung
                </span>
              </div>
            </div>

            <motion.div layout transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} className="flex flex-col flex-1">
            <AnimatePresence mode="wait" initial={false}>
            {!isGenericMode ? (
            <motion.div key="company-fields" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-3 flex flex-col flex-1 min-h-0">
              {/* Section: Unternehmen */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-0.5">Unternehmen</p>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Unternehmensname"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <div className="relative w-1/3">
                    <select
                      value={contactSalutation}
                      onChange={(e) => setContactSalutation(e.target.value)}
                      className="w-full h-full pl-3 pr-7 sm:px-4 sm:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 appearance-none"
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
                      className="w-full pl-10 pr-3 sm:pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Adresse */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-0.5">Adresse</p>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Straße & Hausnr."
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="PLZ & Stadt"
                    value={postalCity}
                    onChange={(e) => setPostalCity(e.target.value)}
                    className="w-full px-3 sm:px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Section: Kontakt */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-0.5">Kontakt</p>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="E-Mail des Unternehmens"
                    value={companyEmail}
                    onChange={(e) => handleCompanyEmailChange(e.target.value)}
                    onBlur={handleCompanyEmailBlur}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-full focus:bg-white dark:focus:bg-slate-700 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                      companyEmailError
                        ? "border-rose-400 dark:border-rose-600 focus:ring-2 focus:ring-rose-400"
                        : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                    }`}
                  />
                </div>
                {companyEmailError && <p className="text-xs text-rose-600 dark:text-rose-400 px-0.5">{companyEmailError}</p>}
              </div>

              {/* Section: Stellenbeschreibung */}
              <div className="flex-1 min-h-0 flex flex-col space-y-2">
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
                    className="w-full flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none min-h-[72px] pb-7"
                  />
                  <div className="absolute bottom-3 right-4 text-xs font-medium text-slate-400 dark:text-slate-500">
                    {companyInfo.trim().split(/\s+/).filter(Boolean).length} / 400 Wörter
                  </div>
                </div>
              </div>
            </motion.div>
            ) : (
            <motion.div key="generic-setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col">
              {showGenericSetup ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
                  <div className="w-14 h-14 rounded-3xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="max-w-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {genericReady ? "Allgemeine Bewerbung ändern" : "Noch keine allgemeine Bewerbung"}
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                      Einmal erstellen — hochgeladen oder mit KI generiert — und für jede Massenbewerbung wiederverwenden.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
                    <button
                      onClick={handleGenerateGenericResume}
                      disabled={isGeneratingGeneric || isUploadingGeneric}
                      className="flex-1 sm:flex-initial whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-full font-medium flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] disabled:opacity-70"
                    >
                      {isGeneratingGeneric ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Wird generiert...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Mit KI generieren</>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (isLocked) { setShowLoginPrompt(true); return; }
                        genericFileInputRef.current?.click();
                      }}
                      disabled={isGeneratingGeneric || isUploadingGeneric}
                      className="flex-1 sm:flex-initial whitespace-nowrap bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-full font-medium flex items-center justify-center gap-2 transition-all border border-slate-200 dark:border-slate-700 active:scale-[0.98] disabled:opacity-70"
                    >
                      {isUploadingGeneric ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Wird hochgeladen...</>
                      ) : (
                        <><UploadCloud className="w-4 h-4" /> PDF hochladen</>
                      )}
                    </button>
                    <input ref={genericFileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleGenericFileSelect} />
                  </div>
                  {genericReady && (
                    <button
                      onClick={() => setGenericSetupOpen(false)}
                      className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 pt-1"
                    >
                      Abbrechen
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">E-Mail des Unternehmens</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                      <input
                        type="email"
                        placeholder="kontakt@unternehmen.de"
                        value={companyEmail}
                        onChange={(e) => handleCompanyEmailChange(e.target.value)}
                        onBlur={handleCompanyEmailBlur}
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-full focus:bg-white dark:focus:bg-slate-700 focus:outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                          companyEmailError
                            ? "border-rose-400 dark:border-rose-600 focus:ring-2 focus:ring-rose-400"
                            : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                        }`}
                      />
                    </div>
                    {companyEmailError && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{companyEmailError}</p>}
                  </div>

                  {renderSendScheduleActions(true)}
                </div>
              )}
            </motion.div>
            )}
            </AnimatePresence>
            </motion.div>

            {!isGenericMode && (
            <div className="mt-auto pt-3 flex flex-col sm:flex-row gap-2.5 sm:items-center shrink-0">
              <div className="relative w-full sm:w-52">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "cover-letter" | "full-resume")}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-700 dark:text-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none pr-10"
                >
                  <option value="cover-letter">Nur Anschreiben</option>
                  <option value="full-resume">Bewerbungsunterlagen</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || isUpdatingPdf}
                className="w-full sm:flex-1 whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70"
              >
                {isGenerating || isUpdatingPdf ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Wird generiert...</>
                ) : (
                  <><Zap className="w-5 h-5" /> PDF erstellen</>
                )}
              </button>
            </div>
            )}

          </div>
        </div>

        {/* Right Preview Panel */}
        <div ref={previewSectionRef} className="lg:col-span-1 flex flex-col h-full min-h-0 pb-6 lg:pb-0">
           {(isGenericMode ? genericReady && !genericSetupOpen : showPreview) && (
             <div className="mb-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
               <div className="min-w-0 flex-1 w-full sm:w-auto">
                 <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                   {isGenericMode ? "Allgemeine Bewerbung" : "Generierte Datei"}
                 </p>
                 <p className="text-sm font-mono font-medium text-slate-800 dark:text-slate-100 truncate" title={isGenericMode ? (context.generic_resume_file_name || genericResumeFileName()) : mode === "cover-letter" ? `Anschreiben_${companyName.toLowerCase().replace(/\s+/g, '_') || "unbekannt"}_${profile?.last_name || "Fateh"}.pdf` : `Bewerbungsunterlagen_${companyName.toLowerCase().replace(/\s+/g, '_') || "unbekannt"}_${profile?.last_name || "Fateh"}.pdf`}>
                   {isGenericMode
                     ? (context.generic_resume_file_name || genericResumeFileName())
                     : mode === "cover-letter"
                       ? `Anschreiben_${companyName.toLowerCase().replace(/\s+/g, '_') || "unbekannt"}_${profile?.last_name || "Fateh"}.pdf`
                       : `Bewerbungsunterlagen_${companyName.toLowerCase().replace(/\s+/g, '_') || "unbekannt"}_${profile?.last_name || "Fateh"}.pdf`}
                 </p>
               </div>
               <div className="flex gap-2 w-full sm:w-auto shrink-0">
                 <button
                   onClick={handleDownload}
                   className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 disabled:opacity-75 text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                 >
                   Herunterladen
                 </button>

                 {isGenericMode && (
                   <button
                     onClick={() => setGenericSetupOpen(true)}
                     className="flex-1 sm:flex-initial bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
                   >
                     Ändern
                   </button>
                 )}

                 {/* Send + Schedule live under the email field for generic mode instead */}
                 {!isGenericMode && renderSendScheduleActions()}

                 {!isGenericMode && (
                   <button
                     onClick={handleReset}
                     className="flex-1 sm:flex-initial bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
                   >
                     Neu
                   </button>
                 )}
               </div>
             </div>
           )}

           <div className="bg-slate-200 dark:bg-slate-700 rounded-3xl border border-slate-300 dark:border-slate-600 flex flex-col flex-1 h-full min-h-[420px] lg:min-h-0 overflow-hidden relative w-full mx-auto">

             {activePdfUrl ? (
               <div className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden">
                 {isUpdatingPdf && (
                   <div className="absolute inset-0 z-10 bg-slate-200/50 backdrop-blur-sm flex items-center justify-center">
                     <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                   </div>
                 )}
                 <iframe
                   src={`${activePdfUrl}#toolbar=0&view=FitH`}
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

    {/* Sign-in required — the form is free to explore, the actions are not */}
    <AnimatePresence>
      {showLoginPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowLoginPrompt(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-sm overflow-hidden"
          >
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Anmeldung erforderlich</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Zum Erstellen und Versenden Ihrer Bewerbung benötigen Sie ein Konto. Bewerbify
                nutzt Ihr Gmail-Konto ausschließlich, um Ihre eigene Bewerbung in Ihrem Namen
                zu versenden.
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                Abbrechen
              </button>
              <Link
                href="/login"
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full text-sm transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Anmelden
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

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

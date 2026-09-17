"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  CalendarClock,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Pencil,
  Trash2,
  FileText,
  MapPin,
  ExternalLink,
  X,
  User,
  Calendar,
  Eye,
  Loader2,
  Mail,
  RotateCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Toast } from "@/app/components/Toast";
import { getActiveContext, JobContext } from "@/lib/data";

interface ScheduledItem {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  file_name: string;
  scheduled_at: string;
  created_at: string;
  status: "pending" | "processing" | "sent" | "failed" | "cancelled";
  error?: string;
  sent_at?: string;
  /** Set once the attachment has been swept from Storage — no preview, no resend. */
  pdf_deleted_at?: string | null;
  metadata?: {
    companyName?: string;
    contactPerson?: string;
    contactSalutation?: string;
    location?: string;
    jobTitle?: string;
    contextId?: string;
    attachments?: string[];
  };
}

export default function ScheduledEmailsPage() {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [activeContext, setActiveContext] = useState<JobContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "sent" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [rescheduleItem, setRescheduleItem] = useState<ScheduledItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("08:30");
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [deleteItem, setDeleteItem] = useState<ScheduledItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [retryingId, setRetryingId] = useState<string | null>(null);

  const [previewItem, setPreviewItem] = useState<ScheduledItem | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/send-email/schedule");
      const data = await res.json();
      if (data.scheduled) {
        setItems(data.scheduled);
      }
    } catch (err) {
      console.error("Failed to load scheduled emails:", err);
      setToast({ message: "Fehler beim Laden der geplanten E-Mails", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getActiveContext().then(setActiveContext);
    fetchItems();

    // Vercel Cron only runs in production, so nothing processes due emails
    // while developing locally. Nudge the processor whenever this page is
    // open — catches anything already due on load, then every 30s after.
    const processDue = () =>
      fetch("/api/send-email/schedule/process", { method: "POST" })
        .then((res) => res.json())
        .then((result) => {
          if (result?.processed > 0) fetchItems();
        })
        .catch(() => {});

    processDue();
    const interval = setInterval(processDue, 30000);
    return () => clearInterval(interval);
  }, []);

  // Scope to the currently active Ausbildung context. Emails scheduled before this
  // field existed have no contextId, so they're matched by jobTitle as a fallback.
  const contextItems = useMemo(() => {
    if (!activeContext) return items;
    return items.filter((item) => {
      if (item.metadata?.contextId) return item.metadata.contextId === activeContext.id;
      return item.metadata?.jobTitle === activeContext.job_title;
    });
  }, [items, activeContext]);

  /** Still on its way out: queued, or already claimed by the send worker. */
  const isInFlight = (item: ScheduledItem) =>
    item.status === "pending" || item.status === "processing";

  // Filtered items (searches exclusively through company names)
  const filteredItems = useMemo(() => {
    return contextItems.filter((item) => {
      // Status filter — "processing" is a pending row the worker has already
      // claimed, so it belongs under Geplant rather than in its own tab.
      if (statusFilter === "pending" && !isInFlight(item)) return false;
      if (statusFilter === "sent" && item.status !== "sent") return false;
      if (statusFilter === "cancelled" && item.status !== "cancelled" && item.status !== "failed") return false;

      // Search filter - ONLY through company names
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const company = (item.metadata?.companyName || "").toLowerCase();
        return company.includes(q);
      }

      return true;
    });
  }, [contextItems, statusFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: contextItems.length,
      pending: contextItems.filter(isInFlight).length,
      sent: contextItems.filter((i) => i.status === "sent").length,
      cancelled: contextItems.filter((i) => i.status === "cancelled" || i.status === "failed").length,
    };
  }, [contextItems]);

  // Open reschedule modal
  const handleOpenReschedule = (item: ScheduledItem) => {
    setRescheduleItem(item);
    const date = new Date(item.scheduled_at);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    setRescheduleDate(`${yyyy}-${mm}-${dd}`);
    setRescheduleTime(`${hh}:${min}`);
  };

  // Submit reschedule
  const handleSubmitReschedule = async () => {
    if (!rescheduleItem || !rescheduleDate || !rescheduleTime) return;
    setIsRescheduling(true);
    try {
      const scheduledDateTime = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      if (isNaN(scheduledDateTime.getTime()) || scheduledDateTime.getTime() <= Date.now()) {
        throw new Error("Bitte ein zukünftiges Datum und Uhrzeit wählen.");
      }

      const res = await fetch("/api/send-email/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rescheduleItem.id,
          scheduledAt: scheduledDateTime.toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Verschieben");
      }

      setToast({ message: "Sendezeitpunkt erfolgreich aktualisiert!", type: "success" });
      setRescheduleItem(null);
      await fetchItems();
    } catch (err: any) {
      setToast({ message: err.message || "Fehler beim Verschieben", type: "error" });
    } finally {
      setIsRescheduling(false);
    }
  };

  // A failed send can go out again as long as its attachment is still around.
  const canRetry = (item: ScheduledItem) => item.status === "failed" && !item.pdf_deleted_at;

  // Re-queue a failed send, then poke the processor so it goes out now rather
  // than on the next scheduled tick.
  const handleRetry = async (item: ScheduledItem) => {
    setRetryingId(item.id);
    try {
      const res = await fetch("/api/send-email/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, retry: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erneutes Senden fehlgeschlagen");
      }

      await fetch("/api/send-email/schedule/process", { method: "POST" }).catch(() => {});
      await fetchItems();
      setToast({ message: "E-Mail wird erneut gesendet.", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Erneutes Senden fehlgeschlagen", type: "error" });
    } finally {
      setRetryingId(null);
    }
  };

  // Preset time buttons
  const applyPreset = (daysOffset: number, hours: number, minutes: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    setRescheduleDate(`${yyyy}-${mm}-${dd}`);
    setRescheduleTime(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
  };

  // Submit cancel/delete
  const handleSubmitDelete = async (permanent: boolean) => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/send-email/schedule?id=${deleteItem.id}&permanent=${permanent}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Ausführen");
      }

      setToast({
        message: permanent ? "E-Mail endgültig gelöscht." : "Geplante E-Mail abgebrochen.",
        type: "success",
      });
      setDeleteItem(null);
      await fetchItems();
    } catch (err: any) {
      setToast({ message: err.message || "Fehler beim Löschen", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date helper
  const formatDateTime = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleString("de-DE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // Relative time helper
  const getRelativeTime = (iso: string, status: string) => {
    if (status !== "pending") return null;
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return "Fällig";
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 1) return `in ${days} Tagen`;
    if (days === 1) return "Morgen";
    if (hours > 0) return `in ${hours} Std.`;
    return `in ${minutes} Min.`;
  };

  // Render Status Badge
  const renderStatus = (status: ScheduledItem["status"]) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Geplant
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Loader2 className="w-3 h-3 animate-spin" />
            Wird gesendet
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Gesendet
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Abgebrochen
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Fehlgeschlagen
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#f8fafc] dark:bg-slate-950">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Top Header & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2.5">
              <CalendarClock className="w-7 h-7 text-blue-600" />
              Geplante E-Mails
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Verwalten und überwachen Sie alle terminierten Bewerbungen und deren Versandstatus.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Unternehmen suchen..."
                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 z-10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs (Screenshot inspired) */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 dark:border-slate-700 pb-1.5 sm:pb-2 overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "Alle Mails", count: counts.all },
            { id: "pending", label: "Geplant", count: counts.pending },
            { id: "sent", label: "Gesendet", count: counts.sent },
            { id: "cancelled", label: "Abgebrochen / Fehler", count: counts.cancelled },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`shrink-0 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  isActive
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/60"
                }`}
              >
                {tab.label}
                <span
                  className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                    isActive ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Structured Table (inspired by attached screenshot) — desktop/tablet only */}
        <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3.5 pl-6 pr-4 font-semibold">Unternehmen & Kontakt</th>
                  <th className="py-3.5 px-4 font-semibold">E-Mail</th>
                  <th className="py-3.5 px-4 font-semibold">Anhänge</th>
                  <th className="py-3.5 px-4 font-semibold">Geplantes Senden</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 pr-6 pl-4 text-right font-semibold">Aktionen</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                      Lade geplante E-Mails...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 mb-3">
                          <CalendarClock className="w-6 h-6" />
                        </div>
                        <p className="font-semibold text-slate-700 dark:text-slate-200">Keine E-Mails gefunden</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {searchQuery
                            ? "Keine E-Mails entsprechen Ihrer Suchanfrage."
                            : "Sie haben aktuell keine E-Mails in diesem Status geplant."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isOverdueOrFailed = item.status === "failed";
                    const company = item.metadata?.companyName || "Unternehmen";
                    const contact = item.metadata?.contactPerson || "Personalabteilung";
                    const initial = company.charAt(0).toUpperCase() || "U";
                    const relativeTime = getRelativeTime(item.scheduled_at, item.status);

                    return (
                      <tr
                        key={item.id}
                        className={`group transition-colors ${
                          isOverdueOrFailed
                            ? "bg-rose-50/40 dark:bg-rose-950/30 hover:bg-rose-50/70 dark:hover:bg-rose-950/50"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/80"
                        }`}
                      >
                        {/* Name / Company (Dual-Line with Avatar) */}
                        <td className="py-4 pl-6 pr-4">
                          <div
                            onClick={() => setPreviewItem(item)}
                            className="flex items-center gap-3 cursor-pointer group/link"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-slate-50 group-hover/link:text-blue-600 transition-colors truncate max-w-[200px]">
                                {company}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                                {contact}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Company Email */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs">
                            <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <a
                              href={`mailto:${item.to_email}`}
                              title={item.to_email}
                              className="truncate max-w-[180px] hover:text-blue-600 transition-colors font-mono"
                            >
                              {item.to_email}
                            </a>
                          </div>
                        </td>

                        {/* Attachments */}
                        <td className="py-4 px-4">
                          <div
                            onClick={() => setPreviewItem(item)}
                            className="flex flex-wrap items-center gap-1.5 cursor-pointer"
                          >
                            {item.metadata?.attachments && item.metadata.attachments.length > 0 ? (
                              item.metadata.attachments.map((att, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200/60 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                  title={att}
                                >
                                  <FileText className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                  <span className="truncate max-w-[220px]">{att}</span>
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200/60 dark:border-slate-700">
                                <FileText className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                {item.file_name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Scheduled Time & Countdown */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div>
                            <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100 text-xs">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                              {formatDateTime(item.scheduled_at)}
                            </div>
                            {relativeTime && (
                              <span className="inline-block mt-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded">
                                {relativeTime}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 whitespace-nowrap">{renderStatus(item.status)}</td>

                        {/* Actions (Pencil / Edit & Trash / Delete) */}
                        <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Preview Button */}
                            <button
                              onClick={() => setPreviewItem(item)}
                              title="Details & PDF anzeigen"
                              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-full transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Reschedule Button (Pencil Icon) */}
                            {item.status === "pending" && (
                              <button
                                onClick={() => handleOpenReschedule(item)}
                                title="Sendezeitpunkt verschieben"
                                className="p-1.5 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 rounded-full transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}

                            {/* Resend (failed sends only) */}
                            {canRetry(item) && (
                              <button
                                onClick={() => handleRetry(item)}
                                disabled={retryingId === item.id}
                                title="Erneut senden"
                                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition-colors disabled:opacity-50"
                              >
                                {retryingId === item.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCw className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {/* Trash / Cancel Button */}
                            <button
                              onClick={() => setDeleteItem(item)}
                              title={item.status === "pending" ? "Planung abbrechen" : "Löschen"}
                              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card List — small screens only */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
              Lade geplante E-Mails...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="max-w-sm mx-auto space-y-2 px-4">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 mb-3">
                  <CalendarClock className="w-6 h-6" />
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-200">Keine E-Mails gefunden</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {searchQuery
                    ? "Keine E-Mails entsprechen Ihrer Suchanfrage."
                    : "Sie haben aktuell keine E-Mails in diesem Status geplant."}
                </p>
              </div>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isOverdueOrFailed = item.status === "failed";
              const company = item.metadata?.companyName || "Unternehmen";
              const contact = item.metadata?.contactPerson || "Personalabteilung";
              const initial = company.charAt(0).toUpperCase() || "U";
              const relativeTime = getRelativeTime(item.scheduled_at, item.status);
              const isExpanded = expandedCardId === item.id;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border shadow-sm overflow-hidden transition-colors ${
                    isOverdueOrFailed
                      ? "bg-rose-50/40 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left"
                  >
                    {/* Left: avatar + company + contact */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-50 truncate">{company}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{contact}</p>
                      </div>
                    </div>

                    {/* Right: status only */}
                    <div className="shrink-0">
                      {renderStatus(item.status)}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3">
                          {/* Scheduled date/time */}
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs pt-3">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            {formatDateTime(item.scheduled_at)}
                            {relativeTime && (
                              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded">
                                {relativeTime}
                              </span>
                            )}
                          </div>

                          {/* E-Mail */}
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs">
                            <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <a
                              href={`mailto:${item.to_email}`}
                              className="truncate hover:text-blue-600 transition-colors font-mono"
                            >
                              {item.to_email}
                            </a>
                          </div>

                          {/* Attachments */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {item.metadata?.attachments && item.metadata.attachments.length > 0 ? (
                              item.metadata.attachments.map((att, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200/60 dark:border-slate-700"
                                >
                                  <FileText className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                  <span className="truncate max-w-[180px]">{att}</span>
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200/60 dark:border-slate-700">
                                <FileText className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                {item.file_name}
                              </span>
                            )}
                          </div>

                          {/* Actions — icon-only so three buttons always fit */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => setPreviewItem(item)}
                              title="Details & PDF anzeigen"
                              className="flex-1 flex items-center justify-center p-2.5 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {item.status === "pending" && (
                              <button
                                onClick={() => handleOpenReschedule(item)}
                                title="Sendezeitpunkt verschieben"
                                className="flex-1 flex items-center justify-center p-2.5 text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-xl hover:bg-cyan-100 dark:hover:bg-cyan-950/70 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}

                            {canRetry(item) && (
                              <button
                                onClick={() => handleRetry(item)}
                                disabled={retryingId === item.id}
                                title="Erneut senden"
                                className="flex-1 flex items-center justify-center p-2.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors disabled:opacity-50"
                              >
                                {retryingId === item.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCw className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            <button
                              onClick={() => setDeleteItem(item)}
                              title={item.status === "pending" ? "Planung abbrechen" : "Löschen"}
                              className="flex-1 flex items-center justify-center p-2.5 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── RESCHEDULE MODAL ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {rescheduleItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setRescheduleItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-50">Sendezeitpunkt anpassen</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {rescheduleItem.metadata?.companyName || "Unternehmen"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRescheduleItem(null)}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Presets */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                    Schnellauswahl
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset(1, 8, 30)}
                      className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-left transition-colors"
                    >
                      🌅 Morgen um 08:30 Uhr
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(1, 14, 0)}
                      className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-left transition-colors"
                    >
                      ☀️ Morgen um 14:00 Uhr
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(2, 9, 0)}
                      className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-left transition-colors"
                    >
                      📅 In 2 Tagen um 09:00 Uhr
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(7, 9, 0)}
                      className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-left transition-colors"
                    >
                      💼 In 1 Woche um 09:00 Uhr
                    </button>
                  </div>
                </div>

                {/* Custom Pickers */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-200 block mb-1">Datum</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-200 block mb-1">Uhrzeit</label>
                    <input
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRescheduleItem(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReschedule}
                  disabled={isRescheduling}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isRescheduling && <Loader2 className="w-4 h-4 animate-spin" />}
                  Speichern
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CANCEL / DELETE MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg">Geplante E-Mail löschen?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Möchten Sie den geplanten Versand an{" "}
                  <strong>{deleteItem.metadata?.companyName || deleteItem.to_email}</strong> wirklich
                  abbrechen?
                </p>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                {deleteItem.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => handleSubmitDelete(false)}
                    disabled={isDeleting}
                    className="w-full py-2.5 px-4 bg-amber-600 text-white font-medium rounded-xl text-sm hover:bg-amber-700 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Als abgebrochen markieren (Status behalten)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSubmitDelete(true)}
                  disabled={isDeleting}
                  className="w-full py-2.5 px-4 bg-rose-600 text-white font-medium rounded-xl text-sm hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  Endgültig löschen (inkl. PDF Datei)
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteItem(null)}
                  className="w-full py-2 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                >
                  Zurück
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DETAILS & PDF PREVIEW SLIDE-OVER DRAWER ────────────────────────── */}
      <AnimatePresence>
        {previewItem && (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {previewItem.metadata?.companyName?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900 dark:text-slate-50 text-lg truncate">
                      {previewItem.metadata?.companyName || "Unternehmen"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {previewItem.metadata?.location || "Deutschland"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {renderStatus(previewItem.status)}
                  <button
                    onClick={() => setPreviewItem(null)}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Meta details — flat icon rows, no card boxes */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    {previewItem.metadata?.contactPerson || "Personalabteilung"}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    An {previewItem.to_email}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    Am {formatDateTime(previewItem.scheduled_at)}
                  </div>
                </div>

                {/* Subject & Body */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    E-Mail Betreff & Inhalt
                  </h4>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                      {previewItem.subject}
                    </p>
                    <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
                      {previewItem.body}
                    </div>
                  </div>
                </div>

                {/* Why it failed — the whole reason the resend button is there */}
                {previewItem.status === "failed" && previewItem.error && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="min-w-0">{previewItem.error}</span>
                  </div>
                )}

                {/* PDF Document Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Bewerbungsunterlagen (PDF)
                    </h4>
                    {!previewItem.pdf_deleted_at && (
                      <a
                        href={`/api/send-email/schedule?id=${previewItem.id}&pdf=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        Im neuen Tab öffnen
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {previewItem.pdf_deleted_at ? (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 p-6 text-center space-y-1">
                      <FileText className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {previewItem.file_name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Der Anhang wurde nach zwei Tagen automatisch gelöscht.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 h-96 shadow-inner">
                      <iframe
                        src={`/api/send-email/schedule?id=${previewItem.id}&pdf=true`}
                        className="w-full h-full"
                        title="PDF Preview"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {previewItem.status === "pending" && (
                    <button
                      onClick={() => {
                        const itm = previewItem;
                        setPreviewItem(null);
                        handleOpenReschedule(itm);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-xl hover:bg-cyan-100 transition-colors flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Verschieben
                    </button>
                  )}
                  {canRetry(previewItem) && (
                    <button
                      onClick={() => {
                        const itm = previewItem;
                        setPreviewItem(null);
                        handleRetry(itm);
                      }}
                      disabled={retryingId === previewItem.id}
                      className="px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Erneut senden
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const itm = previewItem;
                      setPreviewItem(null);
                      setDeleteItem(itm);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {previewItem.status === "pending" ? "Abbrechen" : "Löschen"}
                  </button>
                </div>

                <button
                  onClick={() => setPreviewItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

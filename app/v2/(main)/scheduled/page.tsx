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
  ChevronRight,
  X,
  Building2,
  User,
  Calendar,
  Eye,
  Loader2,
  Mail,
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
  status: "pending" | "sent" | "failed" | "cancelled";
  error?: string;
  sent_at?: string;
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [rescheduleItem, setRescheduleItem] = useState<ScheduledItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("08:30");
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [deleteItem, setDeleteItem] = useState<ScheduledItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [previewItem, setPreviewItem] = useState<ScheduledItem | null>(null);

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

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  // Filtered items (searches exclusively through company names)
  const filteredItems = useMemo(() => {
    return contextItems.filter((item) => {
      // Status filter
      if (statusFilter === "pending" && item.status !== "pending") return false;
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

  // Instant matches for the search dropdown window
  const companyMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return contextItems.filter((item) => {
      const company = (item.metadata?.companyName || "").toLowerCase();
      return company.includes(q);
    });
  }, [contextItems, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: contextItems.length,
      pending: contextItems.filter((i) => i.status === "pending").length,
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
            <div className="relative w-full sm:w-80" ref={searchContainerRef}>
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                placeholder="Unternehmen suchen..."
                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchFocused(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 z-10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Instant Search Dropdown Window */}
              <AnimatePresence>
                {isSearchFocused && searchQuery.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-50 max-h-80 flex flex-col"
                  >
                    <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <span>Ergebnisse ({companyMatches.length})</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Klicken für Details</span>
                    </div>

                    <div className="overflow-y-auto p-1.5 divide-y divide-slate-50">
                      {companyMatches.length === 0 ? (
                        <div className="p-6 text-center space-y-1.5">
                          <Building2 className="w-6 h-6 text-slate-300 mx-auto" />
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Kein Unternehmen gefunden</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            Keine Treffer für &ldquo;<span className="text-slate-600 dark:text-slate-300 font-medium">{searchQuery}</span>&rdquo;
                          </p>
                        </div>
                      ) : (
                        companyMatches.map((match) => {
                          const company = match.metadata?.companyName || "Unternehmen";
                          const initial = company.charAt(0).toUpperCase() || "U";
                          return (
                            <div
                              key={match.id}
                              onClick={() => {
                                setPreviewItem(match);
                                setIsSearchFocused(false);
                              }}
                              className="p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                                  {initial}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 truncate">
                                    {company}
                                  </p>
                                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                    {match.metadata?.jobTitle || match.subject}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                {renderStatus(match.status)}
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Filter Tabs (Screenshot inspired) */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto">
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
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/60"
                }`}
              >
                {tab.label}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Structured Table (inspired by attached screenshot) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
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
                                  <span className="truncate max-w-[110px]">{att}</span>
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
      </div>

      {/* ─── RESCHEDULE MODAL ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {rescheduleItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
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
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {previewItem.metadata?.companyName?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-slate-50 text-lg">
                      {previewItem.metadata?.companyName || "Unternehmen"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Empfänger: {previewItem.to_email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Meta details cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      Status
                    </span>
                    <div>{renderStatus(previewItem.status)}</div>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      Geplanter Versand
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {formatDateTime(previewItem.scheduled_at)}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      Ansprechpartner
                    </span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {previewItem.metadata?.contactPerson || "Personalabteilung"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      Standort
                    </span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {previewItem.metadata?.location || "Deutschland"}
                    </span>
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

                {/* PDF Document Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Bewerbungsunterlagen (PDF)
                    </h4>
                    <a
                      href={`/api/send-email/schedule?id=${previewItem.id}&pdf=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      Im neuen Tab öffnen
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 h-96 shadow-inner">
                    <iframe
                      src={`/api/send-email/schedule?id=${previewItem.id}&pdf=true`}
                      className="w-full h-full"
                      title="PDF Preview"
                    />
                  </div>
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

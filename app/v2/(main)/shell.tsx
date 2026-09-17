"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, ChevronDown, ChevronRight, Plus, PanelLeft, X, CalendarClock, User, Moon, Trash2, Lock, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getContexts, getActiveContextId, setActiveContextId, deleteContext, getProfile, JobContext, Profile } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { getStoredTheme, applyTheme } from "@/lib/theme";
import { rememberAccount } from "@/lib/rememberedAccounts";
import { Logo } from "@/app/components/Logo";

export default function DashboardShell({
  isSignedIn,
  children,
}: {
  isSignedIn: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Signed-out visitors get the same shell in a locked state: the app is
  // visible and the apply form is usable, but anything tied to an account
  // (scheduled mails, the Ausbildung picker, the profile menu) is replaced
  // by a prompt to sign in.
  const isLocked = !isSignedIn;

  const [contexts, setContexts] = useState<JobContext[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteConfirmContext, setDeleteConfirmContext] = useState<JobContext | null>(null);
  const [isDeletingContext, setIsDeletingContext] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Nothing here is readable without a session — skip the round trips (and
    // the console noise) entirely in the locked preview.
    if (isLocked) return;

    getContexts().then(setContexts);
    getProfile().then((p) => {
      setProfile(p);
      if (p?.email) {
        rememberAccount({
          email: p.email,
          name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email,
          avatarUrl: p.avatar_url,
        });
      }
    });
    setActiveId(getActiveContextId());

    // Check scheduled pending count
    fetch("/api/send-email/schedule")
      .then(res => res.json())
      .then(data => {
        if (data.scheduled) {
          const count = data.scheduled.filter((s: any) => s.status === "pending").length;
          setPendingCount(count);
        }
      })
      .catch(() => {});
  }, [pathname, isLocked]);

  useEffect(() => {
    const theme = getStoredTheme();
    applyTheme(theme);
    setIsDarkMode(theme === "dark");
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // If the browser restores this page from bfcache (e.g. pressing "back"
  // after signing out), force a real reload so middleware re-checks the
  // session instead of showing a stale, no-longer-authenticated page.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleToggleDarkMode = () => {
    const next = isDarkMode ? "light" : "dark";
    applyTheme(next);
    setIsDarkMode(next === "dark");
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // Full navigation (not router.push) so the old session's client-router
      // cache and history entry can't be replayed via the back button.
      window.location.href = "/login";
    } catch (err) {
      console.error("Failed to sign out", err);
    }
  };

  const handleSelectContext = (id: string) => {
    setActiveContextId(id);
    setDropdownOpen(false);
    window.location.reload(); // Quick refresh to update all children with new active context
  };

  const handleAddAusbildung = () => {
    setDropdownOpen(false);
    router.push("/v2/onboarding");
  };

  const handleConfirmDeleteContext = async () => {
    if (!deleteConfirmContext) return;
    setIsDeletingContext(true);
    try {
      await deleteContext(deleteConfirmContext.id);
      const remaining = contexts.filter(c => c.id !== deleteConfirmContext.id);
      const wasActive = deleteConfirmContext.id === activeId;
      setContexts(remaining);
      setDeleteConfirmContext(null);

      if (remaining.length === 0) {
        router.push("/v2/onboarding");
        return;
      }
      if (wasActive) {
        setActiveContextId(remaining[0].id);
        window.location.reload(); // refresh children to pick up the new active context
      }
    } catch (err) {
      console.error("Failed to delete context", err);
    } finally {
      setIsDeletingContext(false);
    }
  };

  const navigation = [
    { name: "Neue Bewerbung", href: "/v2/apply", icon: LayoutDashboard },
    { name: "Geplante Mails", href: "/v2/scheduled", icon: CalendarClock },
  ];

  const activeContext = contexts.find(c => c.id === activeId);
  const displayName = profile?.first_name ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : "Benutzer";

  const Avatar = ({ size }: { size: "sm" | "md" }) => {
    const dim = size === "sm" ? "w-8 h-8 text-sm" : "w-9 h-9 text-sm";
    return profile?.avatar_url ? (
      <img src={profile.avatar_url} alt="" className={`${dim} rounded-full object-cover shrink-0`} />
    ) : (
      <div className={`${dim} rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold shrink-0`}>
        {profile?.first_name?.charAt(0) || "U"}
      </div>
    );
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between">
        <Link href="/v2/apply" className="flex items-center gap-2 group">
          <Logo className="text-3xl" />
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          // Only /v2/apply is open to signed-out visitors — the rest of the
          // nav is shown but inert, so the app's shape stays visible.
          const locked = isLocked && item.href !== "/v2/apply";
          if (locked) {
            return (
              <div
                key={item.name}
                aria-disabled="true"
                title="Melden Sie sich an, um Ihre geplanten Mails zu sehen."
                className="flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm text-slate-300 dark:text-slate-600 cursor-not-allowed select-none"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                  <span>{item.name}</span>
                </div>
                <Lock className="w-3.5 h-3.5 shrink-0" />
              </div>
            );
          }
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${isActive ? "text-blue-600 dark:text-blue-300" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </div>
              {item.href === "/v2/scheduled" && pendingCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 mt-auto" ref={accountMenuRef}>
        {isLocked ? (
          <Link
            href="/login"
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-md shadow-blue-500/20 active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            Anmelden
          </Link>
        ) : (
        <>
        <button
          onClick={() => setAccountMenuOpen(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 min-w-0 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Avatar size="sm" />
          <span className="flex-1 text-left text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{displayName}</span>
          <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${accountMenuOpen ? "rotate-90" : ""}`} />
        </button>

        <AnimatePresence initial={false}>
          {accountMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-1 pb-1 space-y-0.5">
                <Link
                  href="/v2/profile/user"
                  onClick={() => { setAccountMenuOpen(false); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Profil
                </Link>
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-3">
                    <Moon className="w-4 h-4 text-slate-400" />
                    Dark Mode
                  </span>
                  <button
                    onClick={handleToggleDarkMode}
                    role="switch"
                    aria-checked={isDarkMode}
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${isDarkMode ? "bg-blue-600" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isDarkMode ? "translate-x-4" : ""}`} />
                  </button>
                </div>
                <button
                  onClick={() => { setAccountMenuOpen(false); setShowLogoutConfirm(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Abmelden
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}

        <div className="flex items-center justify-center gap-3 px-4 pt-2">
          <Link href="/terms" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Nutzungsbedingungen
          </Link>
          <span className="text-slate-200 dark:text-slate-700 text-xs">·</span>
          <Link href="/privacy" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Datenschutz
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-screen bg-[#f8fafc] dark:bg-slate-950 flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex-col hidden md:flex fixed h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col z-50 md:hidden shadow-2xl"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Logout confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto">
                  <LogOut className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Abmelden?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Möchten Sie sich wirklich von Bewerbify abmelden?
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl text-sm transition-colors"
                >
                  Abmelden
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete job-title confirmation */}
      <AnimatePresence>
        {deleteConfirmContext && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteConfirmContext(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Ausbildung löschen?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Möchten Sie <strong>{deleteConfirmContext.job_title}</strong> wirklich löschen? Dokumente und Vorlagen dieser Ausbildung gehen dabei verloren.
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  onClick={() => setDeleteConfirmContext(null)}
                  disabled={isDeletingContext}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleConfirmDeleteContext}
                  disabled={isDeletingContext}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {isDeletingContext ? "Löschen..." : "Löschen"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-w-0 md:ml-64 relative h-screen flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20 flex shrink-0 items-center justify-between px-4 sm:px-8">

          {/* Mobile Menu Button & Logo */}
          <div className="flex items-center gap-3 md:hidden min-w-0 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 -ml-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <PanelLeft className="w-6 h-6" />
            </button>
            <Link href="/v2/apply" className="flex items-center gap-2">
              <Logo className="text-2xl" />
            </Link>
          </div>

          <h1 className="text-lg font-semibold text-slate-800 dark:text-white hidden md:block">
            {navigation.find(n => n.href === pathname)?.name || "Übersicht"}
          </h1>

          <div className="flex items-center gap-3 sm:gap-6 ml-auto shrink-0 pl-2">
             {isLocked ? (
               <button
                 type="button"
                 disabled
                 title="Melden Sie sich an, um eine Ausbildung zu wählen."
                 className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl font-medium text-xs sm:text-sm border border-slate-200 dark:border-slate-700 cursor-not-allowed"
               >
                 <span className="whitespace-nowrap">Ausbildung</span>
                 <Lock className="w-3.5 h-3.5 shrink-0" />
               </button>
             ) : (
             /* Context Dropdown */
             <div className="relative flex flex-col" ref={dropdownRef}>
               {/* Invisible block to force container width to the widest possible option. Hidden on mobile to prevent overflow. */}
               <div className="invisible h-0 overflow-hidden pointer-events-none hidden md:block" aria-hidden="true">
                 {contexts.map(c => (
                   <div key={`inv-${c.id}`} className="px-4 py-2 flex items-center gap-4 text-sm font-medium border border-transparent">
                     <span className="whitespace-nowrap">{c.job_title}</span>
                     <ChevronDown className="w-4 h-4 shrink-0" />
                   </div>
                 ))}
                 <div className="px-4 py-2 flex items-center gap-4 text-sm font-medium border border-transparent">
                   <span className="whitespace-nowrap flex items-center gap-2">
                     <Plus className="w-4 h-4 shrink-0" />
                     Neue Ausbildung hinzufügen
                   </span>
                   <ChevronDown className="w-4 h-4 shrink-0" />
                 </div>
               </div>

               <button
                 onClick={() => setDropdownOpen(!dropdownOpen)}
                 className="flex items-center justify-between gap-1.5 sm:gap-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-colors font-medium text-xs sm:text-sm border border-slate-200 dark:border-slate-700 w-full min-w-0"
               >
                 {/* Compact on mobile — first word only, to save space in the header */}
                 <span className="whitespace-nowrap truncate max-w-[90px] md:max-w-none md:hidden">
                   {activeContext ? `${activeContext.job_title.trim().split(/\s+/)[0]}...` : "Wählen"}
                 </span>
                 <span className="hidden md:inline whitespace-nowrap truncate">
                   {activeContext?.job_title || "Ausbildung wählen"}
                 </span>
                 <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" />
               </button>

               <AnimatePresence>
                 {dropdownOpen && (
                   <motion.div
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 10 }}
                     transition={{ duration: 0.15 }}
                     className="absolute right-0 top-full mt-2 w-max min-w-[240px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden z-30"
                   >
                     <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                       {contexts.map(c => (
                         <div
                           key={c.id}
                           className={`group flex items-center gap-1 rounded-xl transition-colors ${
                             c.id === activeId
                               ? "bg-blue-50 dark:bg-blue-950"
                               : "hover:bg-slate-50 dark:hover:bg-slate-800"
                           }`}
                         >
                           <button
                             onClick={() => handleSelectContext(c.id)}
                             className={`flex-1 min-w-0 text-left px-4 py-2.5 text-sm truncate ${
                               c.id === activeId
                                 ? "text-blue-700 dark:text-blue-300 font-medium"
                                 : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                             }`}
                           >
                             {c.job_title}
                           </button>
                           <button
                             onClick={() => setDeleteConfirmContext(c)}
                             title="Ausbildung löschen"
                             className="p-2 mr-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       ))}
                     </div>
                     <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                       <button
                         onClick={handleAddAusbildung}
                         className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-xl text-sm font-medium transition-colors"
                       >
                         <Plus className="w-4 h-4 shrink-0" />
                         Neue Ausbildung hinzufügen
                       </button>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
             )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-2 sm:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

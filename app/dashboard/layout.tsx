"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, UploadCloud, LayoutDashboard, LogOut, ChevronDown, Plus, PanelLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getContexts, getActiveContextId, setActiveContextId, AusbildungContext } from "../../lib/storage";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [contexts, setContexts] = useState<AusbildungContext[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContexts(getContexts());
    setActiveId(getActiveContextId());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectContext = (id: string) => {
    setActiveContextId(id);
    setDropdownOpen(false);
    window.location.reload(); // Quick refresh to update all children with new active context
  };

  const handleAddAusbildung = () => {
    setDropdownOpen(false);
    router.push("/onboarding");
  };

  const navigation = [
    { name: "Neue Bewerbung", href: "/dashboard", icon: LayoutDashboard },
    { name: "Benutzerinfos", href: "/dashboard/profile", icon: User },
    { name: "Dokumente", href: "/dashboard/uploads", icon: UploadCloud },
  ];

  const activeContext = contexts.find(c => c.id === activeId);

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">Invo.</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(false)} 
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                isActive 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              {item.name}
              {isActive && (
                <motion.div layoutId="sidebar-indicator" className="absolute left-0 w-1 h-8 bg-blue-600 rounded-r-full hidden md:block" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 mt-auto">
        <div className="flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
            {activeContext?.firstName?.charAt(0) || "U"}
          </div>
          <span className="text-sm font-medium text-slate-700 truncate">
            {activeContext ? `${activeContext.firstName} ${activeContext.lastName}` : "Benutzer"}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-screen bg-[#f8fafc] flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 flex-col hidden md:flex fixed h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
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
            className="fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-100 flex flex-col z-50 md:hidden shadow-2xl"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-w-0 md:ml-64 relative h-screen flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-20 flex shrink-0 items-center justify-between px-4 sm:px-8">
          
          {/* Mobile Menu Button & Logo */}
          <div className="flex items-center gap-3 md:hidden min-w-0 shrink-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 -ml-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <PanelLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-slate-800 tracking-tight">Invo.</span>
            </div>
          </div>

          <h1 className="text-lg font-semibold text-slate-800 hidden md:block">
            {navigation.find(n => n.href === pathname)?.name || "Übersicht"}
          </h1>
          
          <div className="flex items-center gap-6 ml-auto shrink-0 pl-2">
             {/* Context Dropdown */}
             <div className="relative flex flex-col" ref={dropdownRef}>
               {/* Invisible block to force container width to the widest possible option. Hidden on mobile to prevent overflow. */}
               <div className="invisible h-0 overflow-hidden pointer-events-none hidden sm:block" aria-hidden="true">
                 {contexts.map(c => (
                   <div key={`inv-${c.id}`} className="px-4 py-2 flex items-center gap-4 text-sm font-medium border border-transparent">
                     <span className="whitespace-nowrap">{c.jobTitle}</span>
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
                 className="flex items-center justify-between gap-2 sm:gap-4 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 sm:px-4 rounded-xl transition-colors font-medium text-sm border border-slate-200 w-full min-w-0"
               >
                 <span className="whitespace-nowrap truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                   {activeContext?.jobTitle || "Ausbildung wählen"}
                 </span>
                 <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
               </button>

               <AnimatePresence>
                 {dropdownOpen && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 10 }}
                     transition={{ duration: 0.15 }}
                     className="absolute right-0 top-full mt-2 w-max min-w-[240px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-30"
                   >
                     <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                       {contexts.map(c => (
                         <button
                           key={c.id}
                           onClick={() => handleSelectContext(c.id)}
                           className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                             c.id === activeId 
                               ? "bg-blue-50 text-blue-700 font-medium" 
                               : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                           }`}
                         >
                           {c.jobTitle}
                         </button>
                       ))}
                     </div>
                     <div className="p-2 border-t border-slate-100 bg-slate-50">
                       <button
                         onClick={handleAddAusbildung}
                         className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-medium transition-colors"
                       >
                         <Plus className="w-4 h-4 shrink-0" />
                         Neue Ausbildung hinzufügen
                       </button>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
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

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, UploadCloud, LayoutDashboard, LogOut, ChevronDown, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getContexts, getActiveContextId, setActiveContextId, AusbildungContext } from "../../lib/storage";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [contexts, setContexts] = useState<AusbildungContext[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    { name: "Uploads", href: "/dashboard/uploads", icon: UploadCloud },
  ];

  const activeContext = contexts.find(c => c.id === activeId);

  return (
    <div className="h-screen bg-[#f8fafc] flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col hidden md:flex fixed h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">Invo.</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  isActive 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                {item.name}
                {isActive && (
                  <motion.div layoutId="sidebar-indicator" className="absolute left-0 w-1 h-8 bg-blue-600 rounded-r-full" />
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
              {activeContext ? `${activeContext.firstName} ${activeContext.lastName}` : "User"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 relative h-screen flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-20 flex shrink-0 items-center justify-between px-8">
          <h1 className="text-lg font-semibold text-slate-800 hidden sm:block">
            {navigation.find(n => n.href === pathname)?.name || "Dashboard"}
          </h1>
          
          <div className="flex items-center gap-6 ml-auto">
             {/* Context Dropdown */}
             <div className="relative flex flex-col" ref={dropdownRef}>
               {/* Invisible block to force container width to the widest possible option */}
               <div className="invisible h-0 overflow-hidden pointer-events-none" aria-hidden="true">
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
                 className="flex items-center justify-between gap-4 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-colors font-medium text-sm border border-slate-200 w-full"
               >
                 <span className="whitespace-nowrap">
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
                     className="absolute right-0 top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-30"
                   >
                     <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                       {contexts.map(c => (
                         <button
                           key={c.id}
                           onClick={() => handleSelectContext(c.id)}
                           className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap ${
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
                         className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
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
        <div className="flex-1 p-8 overflow-y-auto">
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

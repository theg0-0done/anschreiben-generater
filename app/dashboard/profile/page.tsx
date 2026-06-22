"use client";

import { useState, useEffect } from "react";
import { getActiveContext, saveActiveContext, AusbildungContext } from "../../../lib/storage";
import { User, CheckCircle, RefreshCcw } from "lucide-react";

export default function ProfilePage() {
  const [context, setContext] = useState<AusbildungContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const active = getActiveContext();
    if (active) setContext(active);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setLoading(true);
    setSuccessMsg("");
    
    // Simulate slight delay for UX
    setTimeout(() => {
      saveActiveContext(context);
      setLoading(false);
      setSuccessMsg("Benutzerinfos erfolgreich gespeichert!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }, 500);
  };

  if (!context) return <div className="p-8">Lade Benutzerinfos...</div>;

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-full space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Benutzerinfos
          </h2>
          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg">
            {context.jobTitle}
          </span>
        </div>
        
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ausbildungsberuf (Job Title)</label>
              <input 
                type="text" 
                value={context.jobTitle} 
                onChange={e => setContext({...context, jobTitle: e.target.value})}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Anschreiben-Seite im Lebenslauf</label>
              <input 
                type="number" 
                min="1"
                value={context.coverLetterPageNumber || 1} 
                onChange={e => setContext({...context, coverLetterPageNumber: parseInt(e.target.value) || 1})}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vorname</label>
              <input 
                type="text" 
                value={context.firstName} 
                onChange={e => setContext({...context, firstName: e.target.value})}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nachname</label>
              <input 
                type="text" 
                value={context.lastName} 
                onChange={e => setContext({...context, lastName: e.target.value})}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail</label>
              <input 
                type="email" 
                value={context.email} 
                onChange={e => setContext({...context, email: e.target.value})}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefonnummer</label>
              <input 
                type="tel" 
                value={context.phone} 
                onChange={e => setContext({...context, phone: e.target.value})}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Straße und Hausnummer</label>
              <input 
                type="text" 
                value={context.streetHouse} 
                onChange={e => setContext({...context, streetHouse: e.target.value})}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PLZ und Ort</label>
              <input 
                type="text" 
                value={context.postalCity} 
                onChange={e => setContext({...context, postalCity: e.target.value})}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
              Persönliche Links
              <span className="text-xs text-slate-400 font-normal">Optional</span>
            </label>
            <input 
              type="text" 
              value={context.personalLinks} 
              onChange={e => setContext({...context, personalLinks: e.target.value})}
              placeholder="z.B. GitHub, LinkedIn, Portfolio"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" 
            />
          </div>

          <div className="pt-6 flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <>
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  Änderungen speichern
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

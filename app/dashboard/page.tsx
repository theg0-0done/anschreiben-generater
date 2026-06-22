"use client";

import { useState, useEffect } from "react";
import { getActiveContext, AusbildungContext, getPDFAsBase64 } from "../../lib/storage";
import { PDFViewer } from "@react-pdf/renderer";
import { CoverLetterPDF } from "../../components/CoverLetterPDF";
import { Loader2, Zap, ChevronDown } from "lucide-react";

export default function DashboardPage() {
  const [context, setContext] = useState<AusbildungContext | null>(null);

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

  // Load context and restored state
  useEffect(() => {
    setContext(getActiveContext());
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
        if (parsed.pdfUrl) {
          setPdfUrl(parsed.pdfUrl);
        }
      } catch (e) {
        console.error("Failed to parse dashboard state");
      }
    }
    setIsLoaded(true);
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
      lastCompanyKey
    };
    sessionStorage.setItem("dashboardState", JSON.stringify(state));
  }, [isLoaded, companyName, contactSalutation, contactPerson, street, postalCity, companyInfo, hook, showPreview, mode, pdfUrl, lastCompanyKey]);

  const generatePdf = async (currentHook: string, currentMode: string) => {
    if (!context) return;
    setIsUpdatingPdf(true);
    try {
      let resumeBase64 = undefined;
      if (currentMode === "full-resume" && context.resumeId) {
        resumeBase64 = await getPDFAsBase64(context.resumeId);
      }

      const branchStr = (context.jobTitle.toLowerCase().includes("hotel") || context.jobTitle.toLowerCase().includes("gastro")) ? "gastronomie" : "informatik";
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: branchStr,
          companyName,
          jobTitle: context.jobTitle,
          companyStreet: street,
          companyZipCity: postalCity,
          contactPerson,
          contactSalutation,
          mode: currentMode,
          coverLetterPageNumber: context.coverLetterPageNumber || 1,
          customHook: currentHook,
          coverLetterTemplate: context.coverLetterTemplate,
          resumeBase64
        }),
      });
      if (!res.ok) throw new Error("Fehler bei der PDF-Generierung");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
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
    if (!companyName || !companyInfo) {
      alert("Bitte füllen Sie den Firmennamen und die Firmeninfos aus.");
      return;
    }
    
    const currentKey = `${companyName}-${companyInfo}`;
    if (currentKey === lastCompanyKey && hook) {
      // Just re-generate PDF with the existing hook instead of running AI again
      await generatePdf(hook, mode);
      setShowPreview(true);
      return;
    }
    
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyInfo,
          firstName: context.firstName,
          lastName: context.lastName,
          targetJob: context.jobTitle,
        }),
      });

      if (!res.ok) throw new Error("Fehler bei der Generierung");

      const data = await res.json();
      const newHook = data.hook;
      setHook(newHook);
      setLastCompanyKey(currentKey);
      
      await generatePdf(newHook, mode);
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

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    
    const filename = mode === "cover-letter" 
      ? `Anschreiben_${companyName.replace(/\s+/g, '_')}_${context?.firstName}_${context?.lastName}.pdf` 
      : `Bewerbungsunterlagen_${companyName.replace(/\s+/g, '_')}_${context?.firstName}_${context?.lastName}.pdf`;
      
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
    sessionStorage.removeItem("dashboardState");
  };

  if (!context) return <div className="p-8">Lade Daten...</div>;

  return (
    <div className="h-full w-full max-w-[1600px] mx-auto flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
        
        {/* Left Form Panel */}
        <div className="lg:col-span-1 flex flex-col h-full overflow-y-auto no-scrollbar pb-8 lg:pb-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 flex flex-col shrink-0 min-h-full">
            <h2 className="text-xl font-bold text-slate-800 mb-6 shrink-0">Company Infos:</h2>

            <div className="space-y-4 flex flex-col flex-1">
              <div>
                <input 
                  type="text" 
                  placeholder="Company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
                />
              </div>

              <div className="flex gap-4">
                <div className="relative w-1/3">
                  <select 
                    value={contactSalutation} 
                    onChange={(e) => setContactSalutation(e.target.value)}
                    className="w-full h-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm appearance-none pr-10"
                  >
                    <option value=""></option>
                    <option value="Herr">Herr</option>
                    <option value="Frau">Frau</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <input 
                  type="text" 
                  placeholder="Ansprechpartner (Nachname)"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-2/3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Straße & Hausnr."
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
                />
                <input 
                  type="text" 
                  placeholder="PLZ & Stadt"
                  value={postalCity}
                  onChange={(e) => setPostalCity(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
                />
              </div>

              <div className="flex-1 flex flex-col">
                <textarea 
                  rows={6}
                  placeholder="Company Infos (z.B. aus der Stellenanzeige kopieren)"
                  value={companyInfo}
                  onChange={(e) => setCompanyInfo(e.target.value)}
                  className="w-full flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm resize-none min-h-[150px]"
                />
              </div>
            </div>

            <div className="mt-auto pt-6 flex gap-4 items-center shrink-0">
              <div className="relative w-56">
                <select 
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "cover-letter" | "full-resume")}
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none pr-10"
                >
                  <option value="cover-letter">Anschreiben only</option>
                  <option value="full-resume">Bewerbungsunterlagen</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || isUpdatingPdf}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70"
              >
                {isGenerating || isUpdatingPdf ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generiere...</>
                ) : (
                  <><Zap className="w-5 h-5" /> PDF erstellen</>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="lg:col-span-1 flex flex-col h-full pb-8 lg:pb-0">
           {showPreview && (
             <div className="mb-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
               <div className="min-w-0 flex-1 w-full sm:w-auto">
                 <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Generierte Datei</p>
                 <p className="text-sm font-mono font-medium text-slate-800 truncate" title={mode === "cover-letter" ? `Anschreiben_${companyName.toLowerCase().replace(/\s+/g, '_') || "unbekannt"}_${context.lastName || "Fateh"}.pdf` : `Bewerbungsunterlagen_${companyName.toLowerCase().replace(/\s+/g, '_') || "unbekannt"}_${context.lastName || "Fateh"}.pdf`}>
                   {mode === "cover-letter" 
                     ? `Anschreiben_${companyName.toLowerCase().replace(/\s+/g, '_') || "unbekannt"}_${context.lastName || "Fateh"}.pdf` 
                     : `Bewerbungsunterlagen_${companyName.toLowerCase().replace(/\s+/g, '_') || "unbekannt"}_${context.lastName || "Fateh"}.pdf`}
                 </p>
               </div>
               <div className="flex gap-2 w-full sm:w-auto shrink-0">
                 <button 
                   onClick={handleDownload}
                   className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 disabled:opacity-75 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                 >
                   Herunterladen
                 </button>
                 <button 
                   onClick={handleReset}
                   className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-200 active:scale-95"
                 >
                   Neu
                 </button>
               </div>
             </div>
           )}

           <div className="bg-slate-200 rounded-2xl border border-slate-300 flex flex-col flex-1 h-full min-h-[500px] lg:min-h-0 overflow-hidden relative w-full mx-auto">
             
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
                 <h2 className="text-4xl font-bold text-slate-400 opacity-50">PDF Preview</h2>
               </div>
             )}

           </div>
        </div>

      </div>
    </div>
  );
}

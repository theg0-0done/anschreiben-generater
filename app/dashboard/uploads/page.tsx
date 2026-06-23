"use client";

import { useState, useEffect } from "react";
import { getActiveContext, getPDF, savePDF, AusbildungContext, saveActiveContext, getPDFAsBase64 } from "../../../lib/storage";
import { UploadCloud, FileText, Check, Loader2 } from "lucide-react";

export default function UploadsPage() {
  const [context, setContext] = useState<AusbildungContext | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [template, setTemplate] = useState("");
  const [originalTemplate, setOriginalTemplate] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Drag states
  const [isCvDragging, setIsCvDragging] = useState(false);
  const [isResumeDragging, setIsResumeDragging] = useState(false);

  useEffect(() => {
    const active = getActiveContext();
    setContext(active);
    if (active) {
      setTemplate(active.coverLetterTemplate || "");
      setOriginalTemplate(active.coverLetterTemplate || "");
      loadPDFs(active);
    }
  }, []);

  const loadPDFs = async (ctx: AusbildungContext) => {
    if (ctx.resumeId) {
      const rBuffer = await getPDF(ctx.resumeId);
      if (rBuffer) {
        const rBlob = new Blob([rBuffer], { type: "application/pdf" });
        setResumeUrl(URL.createObjectURL(rBlob));
      }
    }
    if (ctx.cvId) {
      const cvBuffer = await getPDF(ctx.cvId);
      if (cvBuffer) {
        const cvBlob = new Blob([cvBuffer], { type: "application/pdf" });
        setCvUrl(URL.createObjectURL(cvBlob));
      }
    }
  };

  const processFile = async (file: File, type: "resume" | "cv") => {
    if (file.type !== "application/pdf" || !context) return;

    if (type === "resume" && context.resumeId) {
      await savePDF(context.resumeId, file);
      const rBuffer = await getPDF(context.resumeId);
      if (rBuffer) setResumeUrl(URL.createObjectURL(new Blob([rBuffer], { type: "application/pdf" })));
      
      const updatedContext = { ...context, resumeFileName: file.name, hasCustomResume: true };
      saveActiveContext(updatedContext);
      setContext(updatedContext);
    } else if (type === "cv" && context.cvId) {
      await savePDF(context.cvId, file);
      const cvBuffer = await getPDF(context.cvId);
      if (cvBuffer) setCvUrl(URL.createObjectURL(new Blob([cvBuffer], { type: "application/pdf" })));

      let updatedContext = { ...context, cvFileName: file.name };
      saveActiveContext(updatedContext);
      setContext(updatedContext);

      // Generate new template based on the new CV
      setIsGenerating(true);
      try {
        const cvBase64 = await getPDFAsBase64(context.cvId);
        const res = await fetch("/api/generate-pitch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            targetJob: updatedContext.jobTitle, 
            resumeBase64: cvBase64, 
            firstName: updatedContext.firstName, 
            lastName: updatedContext.lastName 
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setTemplate(data.template);
          
          // Auto-save the new template
          const finalContext = { ...updatedContext, coverLetterTemplate: data.template };
          saveActiveContext(finalContext);
          setContext(finalContext);
          setOriginalTemplate(data.template);
          
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2000);
        } else {
          alert("Fehler bei der KI-Generierung. Bitte versuchen Sie es erneut.");
        }
      } catch (err) {
        console.error(err);
        alert("Es gab einen Fehler bei der Verbindung zur KI.");
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "resume" | "cv") => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file, type);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, setDragging: (b: boolean) => void) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent, setDragging: (b: boolean) => void) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = async (e: React.DragEvent, type: "resume" | "cv", setDragging: (b: boolean) => void) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        await processFile(file, type);
      } else {
        alert("Bitte laden Sie eine gültige PDF-Datei hoch.");
      }
    }
  };

  const handleSaveTemplate = () => {
    if (context && template !== originalTemplate) {
      const updatedContext = { ...context, coverLetterTemplate: template };
      saveActiveContext(updatedContext);
      setContext(updatedContext);
      setOriginalTemplate(template);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  if (!context) return <div className="p-8">Lade Uploads...</div>;

  return (
    <div className="h-full w-full max-w-[1600px] mx-auto flex flex-col space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        
        {/* Left Column: PDFs */}
        <div className="lg:col-span-1 flex flex-col gap-6 h-full">
          
          {/* Top Card: CV */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-base font-bold text-slate-800">Resume (CV)</h3>
              <label htmlFor="cv-upload-input" className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-xl text-sm font-medium transition-colors">
                ändern
              </label>
              <input id="cv-upload-input" type="file" accept="application/pdf" className="hidden" onChange={(e) => handleUpload(e, "cv")} />
            </div>
            
            <label 
              htmlFor="cv-upload-input"
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, setIsCvDragging)}
              onDragLeave={(e) => handleDragLeave(e, setIsCvDragging)}
              onDrop={(e) => handleDrop(e, "cv", setIsCvDragging)}
              className={`flex-1 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 transition-all duration-200 cursor-pointer ${
                isCvDragging 
                  ? "border-purple-500 bg-purple-50/50" 
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
               {cvUrl ? (
                 <span className="font-bold text-slate-600 text-sm">{context.cvFileName || "Lebenslauf.pdf"}</span>
               ) : (
                 <div className="flex flex-col items-center gap-2 text-slate-400">
                   <FileText className="w-8 h-8 opacity-50" />
                   <span className="text-sm">Kein CV gefunden</span>
                 </div>
               )}
            </label>
          </div>

          {/* Bottom Card: Full Resume */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-base font-bold text-slate-800">Vollständige resume</h3>
              <label htmlFor="resume-upload-input" className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-xl text-sm font-medium transition-colors">
                ändern
              </label>
              <input id="resume-upload-input" type="file" accept="application/pdf" className="hidden" onChange={(e) => handleUpload(e, "resume")} />
            </div>
            
            <label 
              htmlFor="resume-upload-input"
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, setIsResumeDragging)}
              onDragLeave={(e) => handleDragLeave(e, setIsResumeDragging)}
              onDrop={(e) => handleDrop(e, "resume", setIsResumeDragging)}
              className={`flex-1 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 transition-all duration-200 cursor-pointer ${
                isResumeDragging 
                  ? "border-emerald-500 bg-emerald-50/50" 
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
               {resumeUrl ? (
                 <span className="font-bold text-slate-600 text-sm">{context.resumeFileName || "bewerbungsunterlagen.pdf"}</span>
               ) : (
                 <div className="flex flex-col items-center gap-2 text-slate-400">
                   <FileText className="w-8 h-8 opacity-50" />
                   <span className="text-sm">Keine Unterlagen</span>
                 </div>
               )}
            </label>
          </div>

        </div>

        {/* Right Column: Anschreiben Template */}
        <div className="lg:col-span-2 flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-lg font-bold text-slate-800">Anschreiben</h3>
            <button 
              onClick={handleSaveTemplate}
              disabled={template === originalTemplate || isGenerating}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                isSaved ? "bg-green-100 text-green-700" : 
                template === originalTemplate || isGenerating ? "bg-slate-100 text-slate-400 cursor-not-allowed" : 
                "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              }`}
            >
              {isSaved ? <><Check className="w-4 h-4" /> Gespeichert</> : "Speichern"}
            </button>
          </div>
          
          <div className="flex-1 bg-slate-50 rounded-xl overflow-hidden relative border border-slate-200 flex flex-col min-h-[400px]">
            {isGenerating && (
              <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-sm font-medium text-slate-600">KI generiert neue Vorlage...</span>
              </div>
            )}
            <textarea
              className="w-full h-full p-6 bg-transparent resize-none focus:outline-none text-slate-700 leading-relaxed font-sans relative z-0"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Ihre generierte Anschreiben-Vorlage erscheint hier..."
              disabled={isGenerating}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

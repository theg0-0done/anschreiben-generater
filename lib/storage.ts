import localforage from "localforage";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AusbildungContext {
  id: string;
  jobTitle: string; 
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetHouse: string;
  postalCity: string;
  personalLinks: string;
  cvId: string | null;
  resumeId: string | null;
  coverLetterTemplate: string;
  coverLetterPageNumber: number;
  aiPitch?: string;
  aiClosing?: string;
  fallbackHook?: string;  // AI-generated hook with [companyName] placeholder, used when companyInfo is empty or hook fails
  cvFileName?: string;
  resumeFileName?: string;
  resumeBlobUrl?: string;  // Vercel Blob URL for the user's full resume (set after onboarding/re-upload)
  hasCustomResume?: boolean; // kept for legacy compat
}

// ─── localforage Setup (IndexedDB for heavy files) ──────────────────────────
const pdfStore = localforage.createInstance({
  name: "InvoApp",
  storeName: "pdfs",
});

export async function savePDF(key: string, file: File): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  await pdfStore.setItem(key, arrayBuffer);
}

export async function getPDF(key: string): Promise<ArrayBuffer | null> {
  return await pdfStore.getItem<ArrayBuffer>(key);
}

export async function deletePDF(key: string): Promise<void> {
  await pdfStore.removeItem(key);
}

export async function getPDFAsBase64(key: string): Promise<string | null> {
  const buffer = await getPDF(key);
  if (!buffer) return null;
  // Fast Base64 encoding using chunked processing (avoids main-thread freeze
  // that occurs when building a giant string character-by-character in a loop).
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return window.btoa(binary);
}

// ─── Ausbildung Contexts ────────────────────────────────────────────────────

export function getContexts(): AusbildungContext[] {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem("ausbildungContexts");
    if (data) return JSON.parse(data) as AusbildungContext[];
  }
  return [];
}

export function saveContexts(contexts: AusbildungContext[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("ausbildungContexts", JSON.stringify(contexts));
  }
}

export function getActiveContextId(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("activeContextId");
  }
  return null;
}

export function setActiveContextId(id: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("activeContextId", id);
  }
}

export function getActiveContext(): AusbildungContext | null {
  const id = getActiveContextId();
  if (!id) return null;
  return getContexts().find(c => c.id === id) || null;
}

export function saveActiveContext(context: AusbildungContext): void {
  const contexts = getContexts();
  const index = contexts.findIndex(c => c.id === context.id);
  if (index !== -1) {
    contexts[index] = context;
    saveContexts(contexts);
  }
}

// ─── App Global State ───────────────────────────────────────────────────────

export async function markAsOnboarded(): Promise<void> {
  await localforage.setItem("hasOnboarded", true);
}

export async function checkHasOnboarded(): Promise<boolean> {
  const value = await localforage.getItem("hasOnboarded");
  return !!value;
}

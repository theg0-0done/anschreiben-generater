import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  street_house: string | null;
  postal_city: string | null;
  personal_links: string | null;
  avatar_url: string | null;
}

export interface JobContext {
  id: string;
  user_id: string;
  job_title: string;
  branch: string | null;
  cv_storage_path: string | null;
  resume_storage_path: string | null;
  cv_file_name: string | null;
  resume_file_name: string | null;
  cover_letter_template: string | null;
  cover_letter_page_number: number;
  fallback_hook: string | null;
  email_subject: string | null;
  email_body: string | null;
}

const BUCKET = "job-documents";

// ─── Profile (shared personal info, one row per user) ───────────────────────

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
}

export async function saveProfile(updates: Partial<Omit<Profile, "id">>): Promise<void> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Nicht angemeldet");
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) throw error;
}

// ─── Job contexts (many per user — one per job title) ───────────────────────

export async function getContexts(): Promise<JobContext[]> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return [];
  const { data } = await supabase
    .from("job_contexts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function hasAnyContext(): Promise<boolean> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return false;
  // Only counts once documents actually made it to Storage — a context row can
  // exist with null paths if upload failed mid-onboarding.
  const { count } = await supabase
    .from("job_contexts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("resume_storage_path", "is", null)
    .not("cv_storage_path", "is", null);
  return !!count && count > 0;
}

export async function getActiveContext(): Promise<JobContext | null> {
  const id = getActiveContextId();
  const supabase = createClient();

  if (id) {
    const { data } = await supabase.from("job_contexts").select("*").eq("id", id).maybeSingle();
    if (data) return data;
    // Stale pointer (e.g. this context was deleted, or points at a different
    // browser/origin's id) — fall through and pick a real one instead.
  }

  // No active pointer yet — default to the user's first context instead of
  // leaving every page stuck on "loading" with nothing selected.
  const contexts = await getContexts();
  if (contexts.length === 0) return null;
  setActiveContextId(contexts[0].id);
  return contexts[0];
}

export async function createContext(
  input: Partial<Omit<JobContext, "id" | "user_id">> & { job_title: string }
): Promise<JobContext> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Nicht angemeldet");
  const { data, error } = await supabase
    .from("job_contexts")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error || !data) throw error || new Error("Konnte Ausbildung nicht erstellen");
  return data;
}

export async function saveContext(id: string, updates: Partial<JobContext>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("job_contexts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteContext(id: string): Promise<void> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (user) {
    await supabase.storage
      .from(BUCKET)
      .remove([`${user.id}/${id}/cv.pdf`, `${user.id}/${id}/resume.pdf`])
      .catch(() => {});
  }
  await supabase.from("job_contexts").delete().eq("id", id);
}

// ─── Active context pointer (per-browser convenience, not synced data) ──────

export function getActiveContextId(): string | null {
  if (typeof window !== "undefined") return localStorage.getItem("activeContextId");
  return null;
}

export function setActiveContextId(id: string): void {
  if (typeof window !== "undefined") localStorage.setItem("activeContextId", id);
}

// ─── Job documents (CV / full resume PDFs) in Supabase Storage ──────────────

export async function uploadJobDocument(
  contextId: string,
  slot: "cv" | "resume",
  file: File
): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Nicht angemeldet");
  const path = `${user.id}/${contextId}/${slot}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: "application/pdf",
  });
  if (error) throw error;
  return path;
}

export async function getJobDocumentBlob(storagePath: string): Promise<Blob | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error) return null;
  return data;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return window.btoa(binary);
}

export async function fileToBase64(file: File): Promise<string> {
  return arrayBufferToBase64(await file.arrayBuffer());
}

// ─── Scheduled-email PDFs — uploaded directly from the browser to Storage so a
// multi-MB file makes one hop (client → Storage) instead of two (client →
// our server → Storage) via a base64-inflated JSON body. ────────────────────

export async function uploadScheduledPdf(blob: Blob): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Nicht angemeldet");

  const path = `${user.id}/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from("scheduled-pdfs").upload(path, blob, {
    contentType: "application/pdf",
  });
  if (error) throw error;
  return path;
}

// ─── Avatar (public bucket — served directly, no signed URL needed) ─────────

export async function uploadAvatar(file: File): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Nicht angemeldet");

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/avatar.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // Cache-bust so the new image shows immediately even though the path is stable
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
  await saveProfile({ avatar_url: avatarUrl });
  return avatarUrl;
}

export async function getJobDocumentBase64(storagePath: string): Promise<string | null> {
  const blob = await getJobDocumentBlob(storagePath);
  if (!blob) return null;
  return arrayBufferToBase64(await blob.arrayBuffer());
}

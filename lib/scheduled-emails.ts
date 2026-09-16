import { google } from "googleapis";
import { buildMimeMessage, sendMimeMessage, getOAuth2ClientForUser, saveGmailCredentialsForUser } from "./gmail";
import { supabase } from "./supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmailMetadata {
  companyName?: string;
  contactPerson?: string;
  contactSalutation?: string;
  location?: string;
  jobTitle?: string;
  contextId?: string; // id of the JobContext this email was scheduled under
  attachments?: string[];
}

export interface ScheduledEmail {
  id: string;
  user_id: string;
  context_id: string | null;
  to_email: string;
  subject: string;
  body: string;
  pdf_storage_path: string;
  file_name: string;
  scheduled_at: string;
  created_at: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  error?: string;
  sent_at?: string;
  metadata?: EmailMetadata | null;
}

// ─── Fallback Parser for Older Records ────────────────────────────────────────

function extractMetadataFromRow(row: {
  subject?: string;
  body?: string;
  file_name?: string;
}): EmailMetadata {
  let companyName = "";
  let contactPerson = "";
  let jobTitle = "";

  if (row.file_name) {
    const match = row.file_name.match(/^Bewerbungsunterlagen_(.+?)_[^_]+_[^_]+\.pdf$/i);
    if (match && match[1]) {
      companyName = match[1].replace(/_/g, " ");
    }
  }

  if (row.subject) {
    const jobMatch = row.subject.match(/als\s+([^–-]+)/i);
    if (jobMatch && jobMatch[1]) {
      jobTitle = jobMatch[1].trim();
    }
  }

  if (row.body) {
    const salutationMatch = row.body.match(/Sehr geehrte[rn]?\s+(Frau|Herr)\s+([^,\n]+)/i);
    if (salutationMatch && salutationMatch[2]) {
      contactPerson = `${salutationMatch[1]} ${salutationMatch[2].trim()}`;
    }
  }

  return {
    companyName: companyName || "Unternehmen",
    contactPerson: contactPerson || "Personalabteilung",
    jobTitle: jobTitle || "Bewerbung",
    location: "Deutschland",
    attachments: ["Anschreiben & Lebenslauf (PDF)"],
  };
}

// ─── Save ─────────────────────────────────────────────────────────────────────
// The PDF is uploaded directly from the browser to Storage before this runs
// (see lib/data.ts's uploadScheduledPdf) — this just records the row, so it's
// a single insert instead of insert+upload+update.

export async function saveScheduledEmail(email: {
  userId: string;
  contextId?: string | null;
  to: string;
  subject: string;
  body: string;
  pdfStoragePath: string;
  fileName: string;
  scheduledAt: string;
  metadata?: EmailMetadata;
}): Promise<ScheduledEmail> {
  const { data: row, error } = await supabase
    .from("scheduled_emails")
    .insert({
      user_id: email.userId,
      context_id: email.contextId ?? null,
      to_email: email.to,
      subject: email.subject,
      body: email.body,
      pdf_storage_path: email.pdfStoragePath,
      file_name: email.fileName,
      scheduled_at: email.scheduledAt,
      metadata: email.metadata ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error || !row) {
    throw new Error(error?.message || "Failed to insert scheduled email");
  }

  return row as ScheduledEmail;
}

// ─── List (sanitized — no raw storage path exposed) ─────────────────────────

export type PublicScheduledEmail = Omit<ScheduledEmail, "pdf_storage_path">;

export async function getAllScheduledEmails(userId: string): Promise<PublicScheduledEmail[]> {
  const { data, error } = await supabase
    .from("scheduled_emails")
    .select("id, user_id, context_id, to_email, subject, body, file_name, scheduled_at, created_at, status, error, sent_at, metadata")
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    ...row,
    metadata: row.metadata && Object.keys(row.metadata).length > 0 ? row.metadata : extractMetadataFromRow(row),
  }));
}

// ─── Cancel ──────────────────────────────────────────────────────────────────

export async function cancelScheduledEmail(id: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("scheduled_emails")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "pending");

  return !error;
}

// ─── Reschedule ──────────────────────────────────────────────────────────────

export async function rescheduleScheduledEmail(id: string, userId: string, newScheduledAt: string): Promise<boolean> {
  const { error } = await supabase
    .from("scheduled_emails")
    .update({
      scheduled_at: newScheduledAt,
      status: "pending",
      error: null,
    })
    .eq("id", id)
    .eq("user_id", userId);

  return !error;
}

// ─── Delete (Cancelled or Permanent) ──────────────────────────────────────────

export async function deleteScheduledEmail(id: string, userId: string, permanent = false): Promise<boolean> {
  if (permanent) {
    const { data } = await supabase
      .from("scheduled_emails")
      .select("pdf_storage_path")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (data?.pdf_storage_path) {
      await supabase.storage.from("scheduled-pdfs").remove([data.pdf_storage_path]);
    }

    const { error } = await supabase.from("scheduled_emails").delete().eq("id", id).eq("user_id", userId);
    return !error;
  } else {
    return cancelScheduledEmail(id, userId);
  }
}

// ─── Download Stored PDF Preview ─────────────────────────────────────────────

export async function getScheduledEmailPdf(
  id: string,
  userId: string
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const { data: row, error: rowErr } = await supabase
    .from("scheduled_emails")
    .select("pdf_storage_path, file_name")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (rowErr || !row?.pdf_storage_path) return null;

  const { data: fileData, error: fileErr } = await supabase.storage
    .from("scheduled-pdfs")
    .download(row.pdf_storage_path);

  if (fileErr || !fileData) return null;

  const arrayBuffer = await fileData.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    fileName: row.file_name || "Bewerbungsunterlagen.pdf",
  };
}

// ─── Process Due Emails ───────────────────────────────────────────────────────
// Runs as the service role across ALL users' due rows (that's the one place
// this module legitimately needs to cross user boundaries) — Gmail send
// credentials are looked up per-row from gmail_credentials, not a stale
// snapshot, so a refreshed/reconnected token is always used.

/** How long a row may sit in 'processing' before it's treated as abandoned. */
const STUCK_PROCESSING_MINUTES = 15;

export async function processDueEmails(): Promise<{
  processed: number;
  sent: string[];
  failed: string[];
}> {
  const now = new Date().toISOString();

  // Atomically claim due rows by flipping pending -> processing in one UPDATE.
  // This is what makes concurrent triggers (multiple open tabs/devices each
  // polling the processor) safe: a plain UPDATE ... WHERE status = 'pending'
  // is a single atomic statement at the Postgres level, so two overlapping
  // calls can never both claim the same row — whichever commits first wins,
  // the other's WHERE clause simply matches nothing for that row anymore.
  // First, surface anything a previous run claimed but never finished — a
  // timed-out/killed worker leaves rows stuck in 'processing' forever, where
  // they'd otherwise be silently never sent and never reported. They're
  // marked failed rather than auto-retried: the send may well have reached
  // Gmail before the worker died, and a duplicate application is worse than
  // a visible error the user can act on.
  const stuckCutoff = new Date(Date.now() - STUCK_PROCESSING_MINUTES * 60_000).toISOString();
  const { data: stuckRows } = await supabase
    .from("scheduled_emails")
    .update({
      status: "failed",
      error:
        "Versand wurde unterbrochen. Bitte im Gmail-Ordner „Gesendet“ prüfen und bei Bedarf neu planen.",
    })
    .eq("status", "processing")
    .lt("processing_started_at", stuckCutoff)
    .select("id");

  if (stuckRows?.length) {
    console.warn(`[scheduled-emails] Recovered ${stuckRows.length} stuck row(s) from a dead worker`);
  }

  const { data: dueEmails, error: fetchError } = await supabase
    .from("scheduled_emails")
    .update({ status: "processing", processing_started_at: now })
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .select("*");

  if (fetchError) throw new Error(fetchError.message);
  if (!dueEmails || dueEmails.length === 0) {
    return { processed: 0, sent: [], failed: [] };
  }

  const sentIds: string[] = [];
  const failedIds: string[] = [];

  for (const item of dueEmails as ScheduledEmail[]) {
    try {
      if (!item.user_id) {
        throw new Error("Scheduled email has no owning user — cannot look up Gmail credentials.");
      }

      // 1. Download PDF from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("scheduled-pdfs")
        .download(item.pdf_storage_path);

      if (downloadError || !fileData) {
        throw new Error(`PDF download failed: ${downloadError?.message}`);
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");

      // 2. Get the user's current Gmail credentials (not a stale schedule-time snapshot)
      const credentials = await getOAuth2ClientForUser(item.user_id);
      if (!credentials) {
        throw new Error("Kein Gmail-Zugriff für diesen Nutzer verbunden.");
      }
      const { oauth2Client, tokens } = credentials;

      let refreshedTokens: any = null;
      oauth2Client.on("tokens", (newTokens) => {
        refreshedTokens = { ...(tokens as any), ...newTokens };
      });

      // 3. Send via Gmail API
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      await sendMimeMessage(
        gmail,
        buildMimeMessage(item.to_email, item.subject, item.body, pdfBase64, item.file_name)
      );

      if (refreshedTokens) {
        await saveGmailCredentialsForUser(item.user_id, refreshedTokens);
      }

      // 4. Mark as sent
      await supabase
        .from("scheduled_emails")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", item.id);

      // 5. Delete PDF from storage to free space
      await supabase.storage
        .from("scheduled-pdfs")
        .remove([item.pdf_storage_path]);

      sentIds.push(item.id);
    } catch (err: any) {
      console.error(`[scheduled-emails] Failed to send ${item.id}:`, err);

      await supabase
        .from("scheduled_emails")
        .update({
          status: "failed",
          error: err?.message || "Unknown error",
        })
        .eq("id", item.id);

      failedIds.push(item.id);
    }
  }

  return {
    processed: sentIds.length + failedIds.length,
    sent: sentIds,
    failed: failedIds,
  };
}

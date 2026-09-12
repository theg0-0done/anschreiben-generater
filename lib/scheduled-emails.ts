import { google } from "googleapis";
import { getOAuth2Client, buildRawEmail } from "./gmail";
import { supabase } from "./supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmailMetadata {
  companyName?: string;
  contactPerson?: string;
  contactSalutation?: string;
  location?: string;
  jobTitle?: string;
  attachments?: string[];
}

export interface ScheduledEmail {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  pdf_storage_path: string;
  file_name: string;
  scheduled_at: string;
  created_at: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  tokens: object;
  error?: string;
  sent_at?: string;
  metadata?: EmailMetadata;
}

// ─── Ensure storage bucket exists ────────────────────────────────────────────

async function ensureBucket(): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === "scheduled-pdfs");
  if (!exists) {
    const { error } = await supabase.storage.createBucket("scheduled-pdfs", {
      public: false,
    });
    if (error) throw new Error(`Failed to create storage bucket: ${error.message}`);
  }
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

  // 1. Try file_name e.g. Bewerbungsunterlagen_CompanyName_FirstName_LastName.pdf
  if (row.file_name) {
    const match = row.file_name.match(/^Bewerbungsunterlagen_(.+?)_[^_]+_[^_]+\.pdf$/i);
    if (match && match[1]) {
      companyName = match[1].replace(/_/g, " ");
    }
  }

  // 2. Try subject e.g. Bewerbung [um eine Ausbildung] als [JobTitle] – [Name]
  if (row.subject) {
    const jobMatch = row.subject.match(/als\s+([^–-]+)/i);
    if (jobMatch && jobMatch[1]) {
      jobTitle = jobMatch[1].trim();
    }
  }

  // 3. Try body salutation e.g. Sehr geehrte(r) Frau/Herr [Name],
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

export async function saveScheduledEmail(email: {
  to: string;
  subject: string;
  body: string;
  pdfBase64: string;
  fileName: string;
  scheduledAt: string;
  tokens: object;
  metadata?: EmailMetadata;
}): Promise<ScheduledEmail> {
  const enrichedTokens = {
    ...email.tokens,
    ...(email.metadata ? { metadata: email.metadata } : {}),
  };

  // 1. Insert a placeholder row first to get the UUID
  const { data: row, error: insertError } = await supabase
    .from("scheduled_emails")
    .insert({
      to_email: email.to,
      subject: email.subject,
      body: email.body,
      pdf_storage_path: "pending", // temporary, updated below
      file_name: email.fileName,
      scheduled_at: email.scheduledAt,
      tokens: enrichedTokens,
      status: "pending",
    })
    .select()
    .single();

  if (insertError || !row) {
    throw new Error(insertError?.message || "Failed to insert scheduled email");
  }

  // 2. Upload PDF to Supabase Storage using the row's UUID
  const pdfBuffer = Buffer.from(email.pdfBase64, "base64");
  const storagePath = `${row.id}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("scheduled-pdfs")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    // Clean up the row if upload fails
    await supabase.from("scheduled_emails").delete().eq("id", row.id);
    throw new Error(`PDF upload failed: ${uploadError.message}`);
  }

  // 3. Update the row with the real storage path
  const { data: updated, error: updateError } = await supabase
    .from("scheduled_emails")
    .update({ pdf_storage_path: storagePath })
    .eq("id", row.id)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || "Failed to update pdf_storage_path");
  }

  return {
    ...updated,
    metadata: email.metadata,
  } as ScheduledEmail;
}

// ─── List (sanitized — no raw tokens/PDF path exposed) ─────────────────────────

export type PublicScheduledEmail = Omit<ScheduledEmail, "tokens" | "pdf_storage_path">;

export async function getAllScheduledEmails(): Promise<PublicScheduledEmail[]> {
  const { data, error } = await supabase
    .from("scheduled_emails")
    .select("id, to_email, subject, body, file_name, scheduled_at, created_at, status, error, sent_at, tokens")
    .order("scheduled_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const rawMeta = row.tokens?.metadata;
    const metadata = rawMeta && Object.keys(rawMeta).length > 0 ? rawMeta : extractMetadataFromRow(row);
    return {
      id: row.id,
      to_email: row.to_email,
      subject: row.subject,
      body: row.body,
      file_name: row.file_name,
      scheduled_at: row.scheduled_at,
      created_at: row.created_at,
      status: row.status,
      error: row.error,
      sent_at: row.sent_at,
      metadata,
    };
  });
}

// ─── Cancel ──────────────────────────────────────────────────────────────────

export async function cancelScheduledEmail(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("scheduled_emails")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "pending");

  return !error;
}

// ─── Reschedule ──────────────────────────────────────────────────────────────

export async function rescheduleScheduledEmail(id: string, newScheduledAt: string): Promise<boolean> {
  const { error } = await supabase
    .from("scheduled_emails")
    .update({
      scheduled_at: newScheduledAt,
      status: "pending",
      error: null,
    })
    .eq("id", id);

  return !error;
}

// ─── Delete (Cancelled or Permanent) ──────────────────────────────────────────

export async function deleteScheduledEmail(id: string, permanent = false): Promise<boolean> {
  if (permanent) {
    const { data } = await supabase
      .from("scheduled_emails")
      .select("pdf_storage_path")
      .eq("id", id)
      .single();

    if (data?.pdf_storage_path) {
      await supabase.storage.from("scheduled-pdfs").remove([data.pdf_storage_path]);
    }

    const { error } = await supabase.from("scheduled_emails").delete().eq("id", id);
    return !error;
  } else {
    return cancelScheduledEmail(id);
  }
}

// ─── Download Stored PDF Preview ─────────────────────────────────────────────

export async function getScheduledEmailPdf(
  id: string
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const { data: row, error: rowErr } = await supabase
    .from("scheduled_emails")
    .select("pdf_storage_path, file_name")
    .eq("id", id)
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

export async function processDueEmails(): Promise<{
  processed: number;
  sent: string[];
  failed: string[];
}> {
  const now = new Date().toISOString();

  // Fetch all pending emails that are due
  const { data: dueEmails, error: fetchError } = await supabase
    .from("scheduled_emails")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now);

  if (fetchError) throw new Error(fetchError.message);
  if (!dueEmails || dueEmails.length === 0) {
    return { processed: 0, sent: [], failed: [] };
  }

  const sentIds: string[] = [];
  const failedIds: string[] = [];

  for (const item of dueEmails as ScheduledEmail[]) {
    try {
      // 1. Download PDF from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("scheduled-pdfs")
        .download(item.pdf_storage_path);

      if (downloadError || !fileData) {
        throw new Error(`PDF download failed: ${downloadError?.message}`);
      }

      // Convert Blob → base64
      const arrayBuffer = await fileData.arrayBuffer();
      const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");

      // 2. Get a fresh access token using the stored refresh_token
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(item.tokens as any);
      // googleapis will auto-refresh using refresh_token if access_token is expired

      // 3. Send via Gmail API
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      const raw = buildRawEmail(
        item.to_email,
        item.subject,
        item.body,
        pdfBase64,
        item.file_name
      );

      await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });

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

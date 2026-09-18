import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuth2ClientForUser, saveGmailCredentialsForUser, buildMimeMessage, sendMimeMessage } from "@/lib/gmail";
import { createClient } from "@/lib/supabase/server";
import { recordInstantSend } from "@/lib/scheduled-emails";
import { parseAttachmentRef, readAttachment, materializeForSchedule } from "@/lib/attachments";

export async function POST(request: NextRequest) {
  const t0 = performance.now();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const t1 = performance.now();

  const payload = await request.json();
  const { to, subject, body, fileName, metadata } = payload;

  if (!to || !subject || !body || !fileName) {
    return NextResponse.json(
      { error: "Fehlende Felder: to, subject, body und fileName erforderlich." },
      { status: 400 }
    );
  }

  const attachment = parseAttachmentRef(payload, user.id);
  if (!attachment) {
    return NextResponse.json({ error: "Ungültiger Dateipfad." }, { status: 400 });
  }

  // Everything from here on is recorded in scheduled_emails either way, so a
  // send that fails still shows up in the list with its attachment intact and
  // can be retried from there.
  // The history row keeps a real path, so a failed send stays retryable. For a
  // generic application that means snapshotting the stored resume, which is a
  // server side copy and costs the sender nothing.
  const record = async (error?: string) => {
    const path =
      attachment.kind === "uploaded"
        ? attachment.path
        : await materializeForSchedule(attachment, user.id);
    if (!path) return;

    await recordInstantSend({
      userId: user.id,
      contextId: metadata?.contextId ?? null,
      to,
      subject,
      body,
      pdfStoragePath: path,
      fileName,
      metadata,
      error,
    });
  };

  try {
    const credentials = await getOAuth2ClientForUser(user.id);
    if (!credentials) {
      await record("Nicht mit Gmail verbunden.");
      return NextResponse.json(
        { error: "Nicht mit Gmail verbunden. Bitte erneut anmelden." },
        { status: 401 }
      );
    }
    const { oauth2Client, tokens } = credentials;

    // Read the PDF out of Storage and base64-encode it server side (fast,
    // native Buffer conversion) instead of the browser doing a slow
    // byte-by-byte encode and shipping an inflated JSON body.
    const pdfBytes = await readAttachment(attachment, user.id);
    if (!pdfBytes) {
      await record("PDF konnte nicht geladen werden.");
      return NextResponse.json({ error: "PDF konnte nicht geladen werden." }, { status: 502 });
    }
    const pdfBase64 = pdfBytes.toString("base64");
    const t2 = performance.now();

    // Listen for token refresh events to persist the new access token
    let refreshedTokens: any = null;
    oauth2Client.on("tokens", (newTokens) => {
      refreshedTokens = { ...(tokens as any), ...newTokens };
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    await sendMimeMessage(gmail, buildMimeMessage(to, subject, body, pdfBase64, fileName));
    const t3 = performance.now();
    console.log(`[send-email] auth: ${(t1 - t0).toFixed(0)}ms, pdf download: ${(t2 - t1).toFixed(0)}ms, gmail send: ${(t3 - t2).toFixed(0)}ms, total: ${(t3 - t0).toFixed(0)}ms`);

    // If tokens were refreshed during the request, persist them
    if (refreshedTokens) {
      await saveGmailCredentialsForUser(user.id, refreshedTokens);
    }

    // The attachment stays in Storage so the sent application can still be
    // opened from the scheduled-mails page; it's swept once the retention
    // window is up.
    await record();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send email error:", error);

    // If the error is an auth error, suggest re-authentication
    const isAuthError =
      error?.code === 401 ||
      error?.response?.status === 401 ||
      error?.response?.data?.error === "invalid_grant";

    const message = isAuthError
      ? "Gmail-Zugriff ist abgelaufen oder wurde widerrufen. Bitte melde dich ab und erneut mit Google an."
      : error?.message || "Fehler beim Senden der E-Mail.";

    await record(message);
    return NextResponse.json({ error: message }, { status: isAuthError ? 401 : 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuth2ClientForUser, saveGmailCredentialsForUser, buildMimeMessage, sendMimeMessage } from "@/lib/gmail";
import { createClient } from "@/lib/supabase/server";
import { supabase as supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const t0 = performance.now();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    const t1 = performance.now();

    const credentials = await getOAuth2ClientForUser(user.id);
    if (!credentials) {
      return NextResponse.json(
        { error: "Nicht mit Gmail verbunden. Bitte erneut anmelden." },
        { status: 401 }
      );
    }
    const { oauth2Client, tokens } = credentials;

    const { to, subject, body, pdfStoragePath, fileName } = await request.json();

    if (!to || !subject || !body || !pdfStoragePath || !fileName) {
      return NextResponse.json(
        { error: "Fehlende Felder: to, subject, body, pdfStoragePath, fileName erforderlich." },
        { status: 400 }
      );
    }

    // The client uploads directly to Storage under its own user_id folder —
    // reject anything that doesn't match, so nobody can point at someone
    // else's (or an arbitrary) storage path.
    if (typeof pdfStoragePath !== "string" || !pdfStoragePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Ungültiger Dateipfad." }, { status: 400 });
    }

    // Download the already-uploaded PDF from Storage and base64-encode it
    // server-side (fast, native Buffer conversion) instead of the browser
    // doing a slow byte-by-byte encode and shipping an inflated JSON body.
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("scheduled-pdfs")
      .download(pdfStoragePath);
    if (downloadError || !fileData) {
      return NextResponse.json({ error: "PDF konnte nicht geladen werden." }, { status: 502 });
    }
    const pdfBase64 = Buffer.from(await fileData.arrayBuffer()).toString("base64");
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

    // One-off attachment, no longer needed once sent.
    await supabaseAdmin.storage.from("scheduled-pdfs").remove([pdfStoragePath]).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send email error:", error);

    // If the error is an auth error, suggest re-authentication
    const isAuthError =
      error?.code === 401 ||
      error?.response?.status === 401 ||
      error?.response?.data?.error === "invalid_grant";
    if (isAuthError) {
      return NextResponse.json(
        { error: "Gmail-Zugriff ist abgelaufen oder wurde widerrufen. Bitte melde dich ab und erneut mit Google an." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Fehler beim Senden der E-Mail." },
      { status: 500 }
    );
  }
}

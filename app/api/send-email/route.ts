import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuth2ClientForUser, saveGmailCredentialsForUser, buildRawEmail } from "@/lib/gmail";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const credentials = await getOAuth2ClientForUser(user.id);
    if (!credentials) {
      return NextResponse.json(
        { error: "Nicht mit Gmail verbunden. Bitte erneut anmelden." },
        { status: 401 }
      );
    }
    const { oauth2Client, tokens } = credentials;

    const { to, subject, body, pdfBase64, fileName } = await request.json();

    if (!to || !subject || !body || !pdfBase64 || !fileName) {
      return NextResponse.json(
        { error: "Fehlende Felder: to, subject, body, pdfBase64, fileName erforderlich." },
        { status: 400 }
      );
    }

    // Listen for token refresh events to persist the new access token
    let refreshedTokens: any = null;
    oauth2Client.on("tokens", (newTokens) => {
      refreshedTokens = { ...(tokens as any), ...newTokens };
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const raw = buildRawEmail(to, subject, body, pdfBase64, fileName);

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    // If tokens were refreshed during the request, persist them
    if (refreshedTokens) {
      await saveGmailCredentialsForUser(user.id, refreshedTokens);
    }

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

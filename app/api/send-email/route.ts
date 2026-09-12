import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuth2Client, getTokensFromCookies, buildRawEmail, encryptTokens, buildTokenCookie } from "../../../lib/gmail";

export async function POST(request: NextRequest) {
  try {
    const tokens = await getTokensFromCookies();
    if (!tokens) {
      return NextResponse.json(
        { error: "Nicht mit Gmail verbunden. Bitte zuerst authentifizieren." },
        { status: 401 }
      );
    }

    const { to, subject, body, pdfBase64, fileName } = await request.json();

    if (!to || !subject || !body || !pdfBase64 || !fileName) {
      return NextResponse.json(
        { error: "Fehlende Felder: to, subject, body, pdfBase64, fileName erforderlich." },
        { status: 400 }
      );
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens as any);

    // Listen for token refresh events to update the cookie
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

    const response = NextResponse.json({ success: true });

    // If tokens were refreshed during the request, update the cookie
    if (refreshedTokens) {
      const encrypted = encryptTokens(refreshedTokens);
      response.headers.set("Set-Cookie", buildTokenCookie(encrypted));
    }

    return response;
  } catch (error: any) {
    console.error("Send email error:", error);

    // If the error is an auth error, suggest re-authentication
    if (error?.code === 401 || error?.response?.status === 401) {
      return NextResponse.json(
        { error: "Gmail-Authentifizierung abgelaufen. Bitte erneut verbinden." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Fehler beim Senden der E-Mail." },
      { status: 500 }
    );
  }
}

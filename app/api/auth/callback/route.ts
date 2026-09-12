import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client, encryptTokens, buildTokenCookie } from "../../../../lib/gmail";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/v2/apply?auth=error", request.url));
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Extract authenticated email from id_token if available
    let email: string | null = null;
    if (tokens.id_token) {
      try {
        const payload = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64").toString("utf8"));
        email = payload.email || null;
      } catch (e) {
        console.error("Failed to decode id_token:", e);
      }
    }

    if (!email && tokens.access_token) {
      try {
        const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
        email = tokenInfo.email || null;
      } catch (e) {
        console.error("Failed to fetch tokenInfo email:", e);
      }
    }

    // Encrypt and store tokens (including email) in an HTTP-only cookie
    const tokensToSave = { ...tokens, email };
    const encrypted = encryptTokens(tokensToSave);
    const response = NextResponse.redirect(new URL("/v2/apply?auth=success", request.url));
    response.headers.set("Set-Cookie", buildTokenCookie(encrypted));

    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/v2/apply?auth=error", request.url));
  }
}

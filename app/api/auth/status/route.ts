import { NextResponse } from "next/server";
import { getTokensFromCookies, getOAuth2Client, encryptTokens, buildTokenCookie } from "../../../../lib/gmail";

export async function GET() {
  const tokens = (await getTokensFromCookies()) as any;
  if (!tokens) {
    return NextResponse.json({ authenticated: false, email: null });
  }

  let email = tokens.email || null;

  // If email was not stored in existing cookie, try resolving via access token
  if (!email && tokens.access_token) {
    try {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(tokens);
      const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
      if (tokenInfo.email) {
        email = tokenInfo.email;
        tokens.email = email;
        const res = NextResponse.json({ authenticated: true, email });
        res.headers.set("Set-Cookie", buildTokenCookie(encryptTokens(tokens)));
        return res;
      }
    } catch {
      // Ignored if token expired or lacks scope
    }
  }

  return NextResponse.json({ authenticated: true, email });
}

import { NextResponse } from "next/server";
import { getOAuth2Client } from "../../../../lib/gmail";

export async function GET() {
  const oauth2Client = getOAuth2Client();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Always show consent to guarantee refresh_token
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });

  return NextResponse.redirect(url);
}

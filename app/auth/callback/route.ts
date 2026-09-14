import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCode } from "@/lib/auth-callback";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const ok = await handleOAuthCode(code);
  if (!ok) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Let the root gate decide onboarding vs. apply based on whether this user
  // already has any job_contexts rows — don't assume "apply" here.
  return NextResponse.redirect(`${origin}/`);
}

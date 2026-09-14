import { NextRequest, NextResponse } from "next/server";
import { processDueEmails } from "@/lib/scheduled-emails";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // 1. Header: x-cron-secret
  const headerSecret = request.headers.get("x-cron-secret");
  if (cronSecret && headerSecret === cronSecret) return true;

  // 2. Header: Authorization: Bearer <CRON_SECRET> (Vercel Cron standard)
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader) {
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (bearer === cronSecret) return true;
  }

  // 3. Query Param: ?secret=<CRON_SECRET> or ?cron_secret=<CRON_SECRET>
  const querySecret =
    request.nextUrl.searchParams.get("secret") ||
    request.nextUrl.searchParams.get("cron_secret");
  if (cronSecret && querySecret === cronSecret) return true;

  // 4. Local dev mode fallback (allow localhost testing — Vercel Cron only
  // runs in production, so this is also what lets the app self-trigger
  // processing while developing)
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueEmails();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Process due emails error:", error);
    return NextResponse.json(
      { error: error?.message || "Fehler beim Verarbeiten fälliger E-Mails" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Allow GET so external services or browser calls can trigger processing
  return POST(request);
}

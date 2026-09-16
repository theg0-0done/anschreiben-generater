import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // `/api` is deliberately excluded: middleware only gates `/v2` pages, so
    // for an API call its getUser() was a pure round-trip to Supabase with no
    // access-control benefit — and each of those routes validates the session
    // itself anyway. Skipping it here cuts a full network round trip off
    // every send/schedule request.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

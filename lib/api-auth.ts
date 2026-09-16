import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Validates the caller's session for an API route.
 *
 * Middleware deliberately skips /api (it only gates /v2 pages), so every
 * route that costs money or touches user data has to check for itself.
 * Returns either the user or a ready-to-return 401.
 */
export async function requireUser(): Promise<
  { user: { id: string; email?: string }; response: null } | { user: null; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }),
    };
  }

  return { user: { id: user.id, email: user.email }, response: null };
}

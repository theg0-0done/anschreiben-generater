"use client";

import { createContext, useContext } from "react";

/**
 * Whether the visitor currently viewing the app shell has a session.
 *
 * Signed-out visitors are allowed into /v2/apply as a locked preview (see
 * lib/supabase/middleware.ts) — they can look around and fill the company
 * form, but every action that costs credits or touches their Google account
 * prompts them to sign in first. Every other /v2 route is still redirected to
 * /login by the middleware, so anything below this provider can treat
 * `false` as "locked preview", never as "half-broken page".
 */
const SignedInContext = createContext(true);

export function SignedInProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return <SignedInContext.Provider value={value}>{children}</SignedInContext.Provider>;
}

export function useIsSignedIn(): boolean {
  return useContext(SignedInContext);
}

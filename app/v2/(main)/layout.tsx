import { createClient } from "@/lib/supabase/server";
import { SignedInProvider } from "./auth-state";
import DashboardShell from "./shell";

/**
 * Resolved on the server so the shell never flashes the signed-in chrome at a
 * signed-out visitor (or vice versa) while a client-side session check
 * resolves. Only /v2/apply is reachable without a session — the middleware
 * redirects every other /v2 route to /login.
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <SignedInProvider value={!!user}>
      <DashboardShell isSignedIn={!!user}>{children}</DashboardShell>
    </SignedInProvider>
  );
}

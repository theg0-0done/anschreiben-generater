import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { handleOAuthCode } from "@/lib/auth-callback";
import { LandingPage } from "@/app/components/landing/LandingPage";

// Self-hosted by next/font, so there's no render-blocking stylesheet request
// and no layout shift when the webfont swaps in.
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bewerbify | KI-Bewerbungen für deine Ausbildung",
  description:
    "Bewerbify schreibt dein Anschreiben, baut daraus fertige Bewerbungsunterlagen und versendet sie über dein eigenes Gmail-Konto — individuell für jedes Unternehmen.",
  openGraph: {
    title: "Bewerbify | KI-Bewerbungen für deine Ausbildung",
    description:
      "Anschreiben schreiben, Unterlagen zusammenstellen und über dein eigenes Gmail-Konto versenden. In etwa einer Minute pro Bewerbung.",
    type: "website",
    locale: "de_DE",
    images: ["/landing/hero-airport.webp"],
  },
};

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Some Supabase project configs return the OAuth code to the Site URL (this
  // page) instead of the exact redirectTo passed at sign-in, so complete the
  // sign-in here too so either configuration works.
  const { code } = await searchParams;
  if (code) {
    await handleOAuthCode(code);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // The landing page is its own destination, not a redirect gate: signed-in
  // visitors see it too, with the call to action pointing back into the app.
  // Each page carries a link to the other, so the two are never a trap.
  let appHref = "/v2/apply";
  if (user) {
    // Only count a context as "onboarded" once its documents actually made it
    // to Storage. A context row can exist with null paths if an upload failed
    // mid-onboarding, and sending that user to the apply page would strand
    // them on a loading state.
    const { count } = await supabase
      .from("job_contexts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("resume_storage_path", "is", null)
      .not("cv_storage_path", "is", null);

    appHref = count && count > 0 ? "/v2/apply" : "/v2/onboarding";
  }

  return (
    <div className={`${display.variable} ${body.variable}`}>
      <LandingPage isSignedIn={!!user} appHref={appHref} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { handleOAuthCode } from "@/lib/auth-callback";

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Some Supabase project configs return the OAuth code to the Site URL (this
  // page) instead of the exact redirectTo passed at sign-in — complete the
  // sign-in here too so either configuration works.
  const { code } = await searchParams;
  if (code) {
    await handleOAuthCode(code);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Signed out visitors land on the apply page in a locked preview state
  // rather than a login wall — they can look around and fill the form, and
  // are prompted to sign in only when they try to generate or send. This
  // also keeps the homepage publicly reachable, which Google's OAuth
  // verification requires.
  if (!user) {
    redirect("/v2/apply");
  }

  // Only count a context as "onboarded" once its documents actually made it to
  // Storage — a context row can exist with null paths if upload failed mid-onboarding.
  const { count } = await supabase
    .from("job_contexts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("resume_storage_path", "is", null)
    .not("cv_storage_path", "is", null);

  if (count && count > 0) {
    redirect("/v2/apply");
  } else {
    redirect("/v2/onboarding");
  }
}

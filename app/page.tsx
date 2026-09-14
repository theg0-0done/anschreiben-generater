import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { handleOAuthCode } from "@/lib/auth-callback";

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Some Supabase project configs redirect the OAuth code to the Site URL
  // (this root page) instead of the exact redirectTo passed at sign-in —
  // handle it here too so sign-in still completes either way.
  const { code } = await searchParams;
  if (code) {
    await handleOAuthCode(code);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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

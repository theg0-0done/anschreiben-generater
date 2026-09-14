import { createClient } from "@/lib/supabase/server";
import { supabase as supabaseAdmin } from "@/lib/supabase";
import { encryptTokens } from "@/lib/gmail";

/**
 * Exchanges a Supabase OAuth `code` for a session and captures the Google
 * refresh token into gmail_credentials. Shared by /auth/callback and the root
 * page, since some Supabase project configs redirect the code to the Site URL
 * (root) instead of the exact redirectTo passed at sign-in.
 */
export async function handleOAuthCode(code: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    console.error("Auth callback error:", error);
    return false;
  }

  const { session, user } = data;

  if (session.provider_refresh_token) {
    const tokensToEncrypt = {
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token,
      scope: "https://www.googleapis.com/auth/gmail.send",
      token_type: "Bearer",
      expiry_date: Date.now() + 3600 * 1000,
      email: user.email,
    };

    const { error: upsertError } = await supabaseAdmin
      .from("gmail_credentials")
      .upsert(
        {
          user_id: user.id,
          encrypted_tokens: encryptTokens(tokensToEncrypt),
          google_email: user.email,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Failed to store Gmail credentials:", upsertError);
    }
  } else {
    const { data: existing } = await supabaseAdmin
      .from("gmail_credentials")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      console.warn(`No Gmail refresh token available for user ${user.id} and none stored.`);
    }
  }

  return true;
}

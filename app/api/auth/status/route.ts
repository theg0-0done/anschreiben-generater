import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabase as supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, email: null });
  }

  const { data } = await supabaseAdmin
    .from("gmail_credentials")
    .select("google_email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ authenticated: false, email: null });
  }

  return NextResponse.json({ authenticated: true, email: data.google_email });
}

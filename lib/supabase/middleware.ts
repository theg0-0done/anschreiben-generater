import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Required: refreshes the session token and re-sets cookies before they expire.
  // Do not remove — without this, sessions silently stop refreshing.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // /v2/apply is deliberately public: signed-out visitors get a locked
  // preview of the app (form fillable, generating/sending prompts sign-in).
  // Everything else under /v2 still requires a session, including direct
  // URL access to /v2/scheduled, /v2/profile/* and /v2/onboarding.
  const isPublicAppPreview = path === "/v2/apply";
  const isProtected = path.startsWith("/v2") && !isPublicAppPreview;
  const isLoginPage = path === "/login";

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/v2/apply";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

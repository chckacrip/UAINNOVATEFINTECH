import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { logAuth } from "@/lib/logger";

/**
 * Supabase redirects here after email confirmation or OAuth with ?code=...
 * We exchange the code for a session and set cookies, then redirect to app.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const type = requestUrl.searchParams.get("type"); // e.g. "recovery" for password reset

  if (code) {
    const url = new URL(next, requestUrl.origin);
    if (type === "recovery") {
      url.searchParams.set("message", "Password updated. Sign in with your new password.");
    }

    const response = NextResponse.redirect(url);

    const supabase = createServerClient(
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: "", ...options });
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logAuth("login_failure", { reason: "callback_exchange", message: error.message });
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  // No code: redirect to login
  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}

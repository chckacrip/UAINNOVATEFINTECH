import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Why: env vars use fallback pattern — SUPABASE_URL for Lambda,
// NEXT_PUBLIC_SUPABASE_URL for Next.js. Both work in either environment.

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

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
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refresh session if possible (e.g. expired access token but valid refresh token)
  await supabase.auth.getSession();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname === "/login";
  const isPublicPage =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname === "/privacy" ||
    request.nextUrl.pathname === "/terms";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const isAuthCallback = request.nextUrl.pathname === "/auth/callback";

  if (isApiRoute || isAuthCallback) {
    return response;
  }

  // Auth error (expired/invalid token): redirect unless already on login (avoids redirect loop)
  if (authError && !isPublicPage && !isAuthPage) {
    const message = (authError.message ?? "").toLowerCase();
    const isExpired =
      message.includes("expired") || message.includes("jwt") || message.includes("refresh");
    const url = new URL(isExpired ? "/" : "/login", request.url);
    if (isExpired) url.searchParams.set("session_expired", "1");
    return NextResponse.redirect(url);
  }

  if (!user && !isAuthPage && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

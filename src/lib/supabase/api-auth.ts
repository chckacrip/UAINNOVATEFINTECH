import { NextRequest, NextResponse } from "next/server";
import { createSupabaseFromToken, extractToken } from "./server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";

interface AuthResult {
  supabase: SupabaseClient;
  user: User;
}

/**
 * Authenticate an API request. Stateless and Lambda-compatible.
 *
 * Priority:
 * 1. Authorization: Bearer <jwt> header (Lambda / API Gateway path)
 * 2. Cookie-based session (Next.js dev / SSR fallback)
 *
 * Returns { supabase, user } or throws a NextResponse error.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult | NextResponse> {
  const token = extractToken(request);

  if (token) {
    const supabase = createSupabaseFromToken(token);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    return { supabase, user };
  }

  // Fallback: cookie-based auth for Next.js SSR dev mode
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }); } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: "", ...options }); } catch {}
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return { supabase, user };
}

/** Type guard: check if authenticateRequest returned an error response */
export function isAuthError(
  result: AuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

import { createClient } from "@/lib/supabase/client";

/**
 * Fetch wrapper that attaches the Supabase JWT to API requests.
 *
 * Why: In Lambda + API Gateway, there are no cookies. The frontend
 * must pass the JWT in the Authorization header on every request.
 * This also works in Next.js dev mode (cookie auth as fallback).
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}

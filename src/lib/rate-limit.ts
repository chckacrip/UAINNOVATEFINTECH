/**
 * In-memory rate limiter. Use per-route (e.g. /api/chat, /api/upload).
 * In production with multiple instances, use Redis or similar for shared state.
 */

const store = new Map<
  string,
  { count: number; resetAt: number }
>();

const WINDOW_MS = 60 * 1000; // 1 minute

function getKey(identifier: string, route: string): string {
  return `${route}:${identifier}`;
}

function getIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() ?? realIp ?? "unknown";
  return ip;
}

export type RateLimitConfig = {
  /** Max requests per window (default 60) */
  max?: number;
  /** Window in ms (default 60000) */
  windowMs?: number;
};

/**
 * Returns null if under limit, or a 429 NextResponse if over limit.
 * Call at the start of a POST handler: const res = await rateLimit(request, "chat"); if (res) return res;
 */
export async function rateLimit(
  request: Request,
  route: string,
  config: RateLimitConfig = {}
): Promise<Response | null> {
  const { max = 60, windowMs = WINDOW_MS } = config;
  const key = getKey(getIdentifier(request), route);
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
  } else {
    entry.count++;
  }

  if (entry.count > max) {
    const { NextResponse } = await import("next/server");
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      }
    );
  }

  return null;
}

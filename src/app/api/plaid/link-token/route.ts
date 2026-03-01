import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/supabase/api-auth";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const { user } = auth;

  const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
  const PLAID_SECRET = process.env.PLAID_SECRET;
  const PLAID_ENV = process.env.PLAID_ENV || "sandbox";

  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return NextResponse.json(
      { error: "Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to your environment." },
      { status: 501 }
    );
  }

  const baseUrl =
    PLAID_ENV === "production"
      ? "https://production.plaid.com"
      : PLAID_ENV === "development"
        ? "https://development.plaid.com"
        : "https://sandbox.plaid.com";

  const res = await fetch(`${baseUrl}/link/token/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      user: { client_user_id: user.id },
      client_name: "MotionFi",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.error_message || "Plaid error" }, { status: 502 });
  }

  return NextResponse.json({ link_token: data.link_token });
}

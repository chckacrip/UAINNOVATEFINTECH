import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/supabase/api-auth";
import { categorizeTransactions } from "@/lib/categorize";
import { transactionHash } from "@/lib/tx-hash";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const { public_token, institution } = await request.json();

  const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
  const PLAID_SECRET = process.env.PLAID_SECRET;
  const PLAID_ENV = process.env.PLAID_ENV || "sandbox";

  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return NextResponse.json({ error: "Plaid not configured" }, { status: 501 });
  }

  const baseUrl =
    PLAID_ENV === "production"
      ? "https://production.plaid.com"
      : PLAID_ENV === "development"
        ? "https://development.plaid.com"
        : "https://sandbox.plaid.com";

  // Exchange public token for access token
  const exchangeRes = await fetch(`${baseUrl}/item/public_token/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      public_token,
    }),
  });

  const exchangeData = await exchangeRes.json();
  if (!exchangeRes.ok) {
    return NextResponse.json({ error: exchangeData.error_message || "Exchange failed" }, { status: 502 });
  }

  const { access_token, item_id } = exchangeData;

  // Save the Plaid item
  await supabase.from("plaid_items").upsert({
    user_id: user.id,
    access_token,
    item_id,
    institution_name: institution?.name || "Unknown",
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "item_id" });

  // Sync initial transactions
  const syncResult = await syncTransactions(baseUrl, PLAID_CLIENT_ID, PLAID_SECRET, access_token, user.id, supabase);

  return NextResponse.json({
    success: true,
    institution: institution?.name,
    synced: syncResult.count,
  });
}

async function syncTransactions(
  baseUrl: string,
  clientId: string,
  secret: string,
  accessToken: string,
  userId: string,
  supabase: any // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  const txRes = await fetch(`${baseUrl}/transactions/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      access_token: accessToken,
      count: 500,
    }),
  });

  const txData = await txRes.json();
  if (!txRes.ok) return { count: 0 };

  const added = txData.added || [];
  if (added.length === 0) return { count: 0 };

  const descriptions = added.map((t: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    description: t.name || t.merchant_name || "",
    amount: -t.amount,
  }));

  const categorized = await categorizeTransactions(descriptions);

  const rows = added.map((t: any, i: number) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: transactionHash(userId, t.date, -t.amount, t.name || ""),
    user_id: userId,
    posted_at: t.date,
    description: t.name || t.merchant_name || "",
    amount: -t.amount,
    currency: t.iso_currency_code || "USD",
    category: categorized[i].category,
    merchant: categorized[i].merchant || t.merchant_name || "",
    source_file: "plaid",
  }));

  const { data } = await supabase
    .from("transactions")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
    .select("id");

  return { count: data?.length ?? 0 };
}

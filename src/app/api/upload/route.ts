import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/supabase/api-auth";
import { parseCSV, parseCSVWithMapping, normalizeRows, COULD_NOT_IDENTIFY_COLUMNS } from "@/lib/csv-parser";
import { inferCSVMapping } from "@/lib/csv-infer";
import { categorizeTransactions } from "@/lib/categorize";
import { transactionHash } from "@/lib/tx-hash";

// Why: removed cookie-based getSupabase(). API routes now use JWT auth
// via authenticateRequest(), making each invocation fully stateless
// and Lambda cold-start safe.

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const accountId = formData.get("account_id") as string | null;
  if (!file) {
    return NextResponse.json(
      { success: false, inserted: 0, errors: ["No file provided"] },
      { status: 400 }
    );
  }

  // Why: file processed entirely in-memory — no fs writes.
  const csvText = await file.text();
  let result = parseCSV(csvText);
  let { rows, errors } = result;

  // If heuristic column detection failed, use GPT to infer column mapping.
  if (rows.length === 0 && errors.some((e) => e.includes(COULD_NOT_IDENTIFY_COLUMNS))) {
    try {
      const mapping = await inferCSVMapping(csvText);
      if (mapping) {
        result = parseCSVWithMapping(csvText, mapping);
        rows = result.rows;
        errors = result.errors;
      }
    } catch {
      // Keep original errors if GPT inference fails
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({
      success: false,
      inserted: 0,
      errors: errors.length > 0 ? errors : ["No valid rows found"],
    });
  }

  const normalized = normalizeRows(rows);
  const categorized = await categorizeTransactions(
    normalized.map((r) => ({ description: r.description, amount: r.amount }))
  );
  const { data: profile } = await supabase.from("profiles").select("merchant_rules").eq("id", user.id).single();
  const rules = (profile?.merchant_rules as { pattern: string; category: string }[]) ?? [];
  const { applyUserMerchantRules } = await import("@/lib/categorize");
  const overriddenCategories = applyUserMerchantRules(
    normalized.map((r) => ({ description: r.description })),
    categorized.map((c) => c.category),
    rules
  );

  // Why: deterministic IDs from hash of user+date+amount+description.
  // ON CONFLICT DO NOTHING ensures retried uploads are idempotent.
  const transactions = normalized.map((row, i) => ({
    id: transactionHash(user.id, row.posted_at, row.amount, row.description),
    user_id: user.id,
    posted_at: row.posted_at,
    description: row.description,
    amount: row.amount,
    currency: "USD",
    category: overriddenCategories[i] ?? categorized[i].category,
    merchant: categorized[i].merchant,
    source_file: file.name,
    ...(accountId ? { account_id: accountId } : {}),
  }));

  const batchSize = 500;
  let insertedCount = 0;
  const insertErrors: string[] = [];

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    // Why: upsert with ignoreDuplicates makes ingestion idempotent.
    const { error, data } = await supabase
      .from("transactions")
      .upsert(batch, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error) {
      insertErrors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
    } else {
      insertedCount += data?.length ?? 0;
    }
  }

  return NextResponse.json({
    success: insertedCount > 0,
    inserted: insertedCount,
    errors: [...errors, ...insertErrors],
  });
}

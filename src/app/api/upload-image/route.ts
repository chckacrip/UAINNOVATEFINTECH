import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/supabase/api-auth";
import OpenAI from "openai";
import { categorizeTransactions } from "@/lib/categorize";
import { transactionHash } from "@/lib/tx-hash";

// Why: removed cookie-based getSupabase(). Uses JWT auth for Lambda compat.
// Why: OpenAI client created per-request inside handler, not at module level.

const EXTRACTION_PROMPT = `You are a bank statement OCR tool. Extract every transaction visible in this image.

Return ONLY a valid JSON array where each object has:
- "date": string in YYYY-MM-DD format (infer the year if not shown)
- "description": the merchant/payee/description text exactly as shown
- "amount": number — negative for debits/purchases/payments, positive for credits/deposits/income

Rules:
- Extract ALL visible transactions, don't skip any
- If the amount column shows debits separately, make those negative
- If you can't determine the sign, assume purchases/payments are negative
- Clean up the description but keep the merchant name intact
- If the image is unclear or not a bank statement, return an empty array []

Return ONLY the JSON array, nothing else.`;

const RECEIPT_PROMPT = `You are a receipt OCR tool. This image is a single receipt (photo or scan).

Extract exactly ONE transaction. Return ONLY a valid JSON object (not an array) with:
- "date": string in YYYY-MM-DD (use today if not on receipt)
- "description": short description of what was bought
- "amount": number — negative for the total paid (e.g. -42.50)
- "merchant": business/store name from the receipt

If the image is not a receipt or you cannot read it, return {"error": "not a receipt"}.

Return ONLY the JSON object, nothing else.`;

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const isReceipt = formData.get("receipt") === "true";
  if (!file) {
    return NextResponse.json(
      { success: false, inserted: 0, errors: ["No file provided"] },
      { status: 400 }
    );
  }

  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({
      success: false,
      inserted: 0,
      errors: ["Unsupported image format. Use PNG, JPG, or WebP."],
    }, { status: 400 });
  }

  // Why: image processed entirely in-memory via ArrayBuffer — no temp files.
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  // Why: client created per-request from env var, not cached at module level.
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let extracted: { date: string; description: string; amount: number; merchant?: string }[];
  try {
    const prompt = isReceipt ? RECEIPT_PROMPT : EXTRACTION_PROMPT;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: isReceipt ? 512 : 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUri, detail: "high" } },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? (isReceipt ? "{}" : "[]");
    const cleaned = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();

    if (isReceipt) {
      const obj = JSON.parse(cleaned);
      if (obj.error) {
        return NextResponse.json({
          success: false,
          inserted: 0,
          errors: [obj.error === "not a receipt" ? "Could not read receipt. Try a clearer photo." : "Could not extract receipt."],
        });
      }
      extracted = [{
        date: obj.date || new Date().toISOString().slice(0, 10),
        description: obj.description || obj.merchant || "Receipt",
        amount: typeof obj.amount === "number" ? obj.amount : -Math.abs(parseFloat(obj.amount) || 0),
        merchant: obj.merchant,
      }];
    } else {
      extracted = JSON.parse(cleaned);
      if (!Array.isArray(extracted)) {
        return NextResponse.json({
          success: false,
          inserted: 0,
          errors: ["Could not extract transactions from this image. Try a clearer screenshot."],
        });
      }
      if (extracted.length === 0) {
        return NextResponse.json({
          success: false,
          inserted: 0,
          errors: ["No transactions found in this image. Try a clearer screenshot."],
        });
      }
    }
  } catch {
    return NextResponse.json({
      success: false,
      inserted: 0,
      errors: [isReceipt ? "Failed to process receipt image." : "Failed to process image. Make sure it's a clear screenshot of a bank statement."],
    });
  }

  const categorized = await categorizeTransactions(
    extracted.map((r) => ({ description: r.description || r.merchant || "", amount: r.amount }))
  );
  const { data: profile } = await supabase.from("profiles").select("merchant_rules").eq("id", user.id).single();
  const rules = (profile?.merchant_rules as { pattern: string; category: string }[]) ?? [];
  const { applyUserMerchantRules } = await import("@/lib/categorize");
  const overriddenCategories = applyUserMerchantRules(
    extracted.map((r) => ({ description: r.description || r.merchant || "" })),
    categorized.map((c) => c.category),
    rules
  );

  const transactions = extracted.map((row, i) => ({
    id: transactionHash(user.id, row.date, row.amount, row.description || row.merchant || String(i)),
    user_id: user.id,
    posted_at: row.date,
    description: row.description || row.merchant || "Receipt",
    amount: row.amount,
    currency: "USD",
    category: overriddenCategories[i] ?? categorized[i].category,
    merchant: (row.merchant || categorized[i].merchant) ?? "",
    source_file: isReceipt ? `receipt:${file.name}` : `screenshot:${file.name}`,
  }));

  const { error, data } = await supabase
    .from("transactions")
    .upsert(transactions, { onConflict: "id", ignoreDuplicates: true })
    .select("id");

  if (error) {
    return NextResponse.json({
      success: false,
      inserted: 0,
      errors: [error.message],
    });
  }

  return NextResponse.json({
    success: true,
    inserted: data?.length ?? 0,
    extracted: extracted.length,
    errors: [],
  });
}

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

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const formData = await request.formData();
  const file = formData.get("file") as File;
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

  let extracted: { date: string; description: string; amount: number }[];
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            { type: "image_url", image_url: { url: dataUri, detail: "high" } },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "[]";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    extracted = JSON.parse(cleaned);

    if (!Array.isArray(extracted)) {
      return NextResponse.json({
        success: false,
        inserted: 0,
        errors: ["Could not extract transactions from this image. Try a clearer screenshot."],
      });
    }
  } catch {
    return NextResponse.json({
      success: false,
      inserted: 0,
      errors: ["Failed to process image. Make sure it's a clear screenshot of a bank statement."],
    });
  }

  if (extracted.length === 0) {
    return NextResponse.json({
      success: false,
      inserted: 0,
      errors: ["No transactions found in this image. Try a clearer screenshot."],
    });
  }

  const categorized = await categorizeTransactions(
    extracted.map((r) => ({ description: r.description, amount: r.amount }))
  );

  // Why: deterministic IDs prevent duplicates on retry.
  const transactions = extracted.map((row, i) => ({
    id: transactionHash(user.id, row.date, row.amount, row.description),
    user_id: user.id,
    posted_at: row.date,
    description: row.description,
    amount: row.amount,
    currency: "USD",
    category: categorized[i].category,
    merchant: categorized[i].merchant,
    source_file: `screenshot:${file.name}`,
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

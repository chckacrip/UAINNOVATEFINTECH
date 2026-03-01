import { getOpenAI } from "./openai";

export type CSVColumnMapping = {
  date: string;
  description: string;
  amount?: string;
  credit?: string;
  debit?: string;
};

const INFER_SYSTEM = `You are a CSV column detector for bank/transaction exports.
Given a CSV sample (header row + a few data rows), identify columns for:
- date: transaction or posting date (any date format)
- description: memo, narrative, payee, or transaction description
- amount/credit/debit: either (1) a single "amount" column (signed: negative = outflow, positive = inflow), or (2) separate "credit" and "debit" columns where each row has a value in one and empty in the other (credits = money in, debits = money out)

Respond with JSON only. Use exact column headers as they appear (case-sensitive).
Option A — single amount column: { "date": "<header>", "description": "<header>", "amount": "<header>" }
Option B — credits and debits: { "date": "<header>", "description": "<header>", "credit": "<header>", "debit": "<header>" }
We need date and description plus either amount OR both credit and debit. Use null for any key you cannot identify.`;

/**
 * Uses GPT to infer which CSV columns map to date, description, and amount.
 * Pass a sample: header row + first few rows (e.g. first 2000 chars).
 */
export async function inferCSVMapping(csvSample: string): Promise<CSVColumnMapping | null> {
  const openai = getOpenAI();
  const sample = csvSample.slice(0, 2500).trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: INFER_SYSTEM },
      {
        role: "user",
        content: `Identify the column mapping for this CSV:\n\n${sample}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(text) as Record<string, string | null>;
    const date = parsed.date ?? null;
    const description = parsed.description ?? null;
    const amount = parsed.amount ?? null;
    const credit = parsed.credit ?? null;
    const debit = parsed.debit ?? null;
    if (date && description && (amount || (credit && debit))) {
      return { date, description, ...(amount ? { amount } : { credit: credit!, debit: debit! }) };
    }
  } catch {
    // ignore
  }
  return null;
}

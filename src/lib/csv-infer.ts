import { getOpenAI } from "./openai";

export type CSVColumnMapping = {
  date: string;
  description: string;
  amount: string;
};

const INFER_SYSTEM = `You are a CSV column detector for bank/transaction exports.
Given a CSV sample (header row + a few data rows), identify which column is:
- date: transaction or posting date (any date format)
- description: memo, narrative, payee, or transaction description
- amount: money amount (may be debit/credit, one column or two; if two, prefer a single "amount" column or use the one that represents the transaction value)

Respond with JSON only: { "date": "<exact header name>", "description": "<exact header name>", "amount": "<exact header name>" }
Use the exact column headers as they appear in the CSV (case-sensitive). If you cannot identify a column, use null for that key. We need all three.`;

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
    if (date && description && amount) {
      return { date, description, amount };
    }
  } catch {
    // ignore
  }
  return null;
}

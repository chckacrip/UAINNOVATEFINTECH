import Papa from "papaparse";
import { z } from "zod";

const TransactionRowSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  amount: z.number(),
});

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
}

const DATE_COLUMN_NAMES = ["date", "posted_at", "posted", "transaction_date", "trans_date", "posting_date"];
const DESC_COLUMN_NAMES = ["description", "desc", "memo", "narrative", "details", "transaction", "name"];
const AMOUNT_COLUMN_NAMES = ["amount", "total", "value", "sum", "debit", "credit"];

function findColumn(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().replace(/[^a-z_]/g, ""));
  for (const candidate of candidates) {
    const idx = lower.findIndex((h) => h.includes(candidate));
    if (idx >= 0) return headers[idx];
  }
  return null;
}

export function parseCSV(csvText: string): { rows: ParsedRow[]; errors: string[] } {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    return {
      rows: [],
      errors: result.errors.map((e) => `Row ${e.row}: ${e.message}`),
    };
  }

  const headers = result.meta.fields ?? [];
  const dateCol = findColumn(headers, DATE_COLUMN_NAMES);
  const descCol = findColumn(headers, DESC_COLUMN_NAMES);
  const amountCol = findColumn(headers, AMOUNT_COLUMN_NAMES);

  if (!dateCol || !descCol || !amountCol) {
    return {
      rows: [],
      errors: [
        `Could not identify required columns. Found: [${headers.join(", ")}]. ` +
          `Need columns for date (${DATE_COLUMN_NAMES.join("/")}), ` +
          `description (${DESC_COLUMN_NAMES.join("/")}), ` +
          `amount (${AMOUNT_COLUMN_NAMES.join("/")}).`,
      ],
    };
  }

  const rows: ParsedRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < result.data.length; i++) {
    const raw = result.data[i] as Record<string, string>;
    try {
      const amountStr = (raw[amountCol] || "").replace(/[$,\s]/g, "");
      const amount = parseFloat(amountStr);

      const parsed = TransactionRowSchema.parse({
        date: raw[dateCol]?.trim(),
        description: raw[descCol]?.trim(),
        amount: isNaN(amount) ? undefined : amount,
      });
      rows.push(parsed);
    } catch {
      errors.push(`Row ${i + 2}: Invalid data — skipped`);
    }
  }

  return { rows, errors };
}

function normalizeDate(dateStr: string): string {
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,       // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/,       // MM/DD/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/,         // MM-DD-YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, // M/D/YY or M/D/YYYY
  ];

  for (const fmt of formats) {
    const match = dateStr.match(fmt);
    if (match) {
      if (fmt === formats[0]) return dateStr;
      let year = match[3];
      if (year.length === 2) year = `20${year}`;
      const month = match[1].padStart(2, "0");
      const day = match[2].padStart(2, "0");
      // For MM/DD/YYYY and MM-DD-YYYY formats
      if (fmt === formats[0]) return dateStr;
      return `${year}-${month}-${day}`;
    }
  }

  // Fallback: try native parsing
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return dateStr;
}

export function normalizeRows(
  rows: ParsedRow[]
): { posted_at: string; description: string; amount: number }[] {
  return rows.map((r) => ({
    posted_at: normalizeDate(r.date),
    description: r.description,
    amount: r.amount,
  }));
}

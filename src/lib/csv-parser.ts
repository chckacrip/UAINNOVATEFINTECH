import Papa from "papaparse";
import { z } from "zod";
import type { CSVColumnMapping } from "./csv-infer";

const TransactionRowSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  amount: z.number(),
});

export interface ParsedRow {
  date: string;
  description: string;
  amount: number;
}

const DATE_COLUMN_NAMES = ["date", "posted_at", "posted", "transaction_date", "trans_date", "posting_date"];
const DESC_COLUMN_NAMES = ["description", "desc", "memo", "narrative", "details", "transaction", "name"];
const AMOUNT_COLUMN_NAMES = ["amount", "total", "value", "sum"];
const CREDIT_COLUMN_NAMES = ["credit", "credits", "deposits", "inflow", "in"];
const DEBIT_COLUMN_NAMES = ["debit", "debits", "withdrawals", "outflow", "out", "payment"];

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
  const creditCol = findColumn(headers, CREDIT_COLUMN_NAMES);
  const debitCol = findColumn(headers, DEBIT_COLUMN_NAMES);

  const hasAmount = !!amountCol;
  const hasCreditDebit = !!creditCol && !!debitCol;

  if (!dateCol || !descCol) {
    return {
      rows: [],
      errors: [
        `Could not identify required columns. Found: [${headers.join(", ")}]. ` +
          `Need date (${DATE_COLUMN_NAMES.join("/")}), description (${DESC_COLUMN_NAMES.join("/")}), ` +
          `and either amount (${AMOUNT_COLUMN_NAMES.join("/")}) or both credit (${CREDIT_COLUMN_NAMES.join("/")}) and debit (${DEBIT_COLUMN_NAMES.join("/")}).`,
      ],
    };
  }

  if (hasAmount) {
    return parseWithColumns(result.data as Record<string, string>[], dateCol, descCol, amountCol, null, null);
  }
  if (hasCreditDebit) {
    return parseWithColumns(result.data as Record<string, string>[], dateCol, descCol, null, creditCol!, debitCol!);
  }
  return {
    rows: [],
    errors: [
      `Could not identify amount columns. Found: [${headers.join(", ")}]. ` +
        `Need amount (${AMOUNT_COLUMN_NAMES.join("/")}) or both credit and debit.`,
    ],
  };
}

/** Whether the parse failed because required columns could not be identified (so GPT inference can be tried). */
export const COULD_NOT_IDENTIFY_COLUMNS = "Could not identify required columns";

export function parseCSVWithMapping(csvText: string, mapping: CSVColumnMapping): { rows: ParsedRow[]; errors: string[] } {
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
  const resolve = (name: string) => headers.find((h) => h === name) ?? headers.find((h) => h.toLowerCase() === name.toLowerCase());
  const dateCol = resolve(mapping.date);
  const descCol = resolve(mapping.description);
  const amountCol = mapping.amount ? resolve(mapping.amount) : null;
  const creditCol = mapping.credit ? resolve(mapping.credit) : null;
  const debitCol = mapping.debit ? resolve(mapping.debit) : null;

  if (!dateCol || !descCol) {
    return {
      rows: [],
      errors: [`Mapping columns not found. Need date and description. Found: [${headers.join(", ")}].`],
    };
  }
  if (amountCol) {
    return parseWithColumns(result.data as Record<string, string>[], dateCol, descCol, amountCol, null, null);
  }
  if (creditCol && debitCol) {
    return parseWithColumns(result.data as Record<string, string>[], dateCol, descCol, null, creditCol, debitCol);
  }
  return {
    rows: [],
    errors: [`Mapping requires amount or both credit and debit. Found: [${headers.join(", ")}].`],
  };
}

function parseAmount(raw: string): number {
  const s = (raw ?? "").replace(/[$,\s]/g, "");
  return parseFloat(s);
}

function parseWithColumns(
  data: Record<string, string>[],
  dateCol: string,
  descCol: string,
  amountCol: string | null,
  creditCol: string | null,
  debitCol: string | null
): { rows: ParsedRow[]; errors: string[] } {
  const rows: ParsedRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const raw = data[i];
    try {
      let amount: number;
      if (amountCol) {
        amount = parseAmount(raw[amountCol] ?? "");
      } else if (creditCol != null && debitCol != null) {
        const credit = parseAmount(raw[creditCol] ?? "");
        const debit = parseAmount(raw[debitCol] ?? "");
        // Credits = money in (positive), debits = money out (store as negative)
        amount = (Number.isNaN(credit) ? 0 : credit) - (Number.isNaN(debit) ? 0 : debit);
      } else {
        throw new Error("Missing amount or credit/debit columns");
      }

      if (Number.isNaN(amount)) amount = 0;

      const parsed = TransactionRowSchema.parse({
        date: raw[dateCol]?.trim(),
        description: raw[descCol]?.trim(),
        amount,
      });
      rows.push(parsed);
    } catch {
      errors.push(`Row ${i + 2}: Invalid data — skipped`);
    }
  }

  return { rows, errors };
}

function normalizeDate(dateStr: string): string {
  const trimmed = dateStr.trim();
  // YYYY-MM-DD (and validate)
  const isoDash = /^(\d{4})-(\d{2})-(\d{2})$/;
  let m = trimmed.match(isoDash);
  if (m) {
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return trimmed;
  }

  // YYYY/MM/DD — must come before M/D/YY so "2025/03/01" isn't parsed as month=2025, year=01
  const isoSlash = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;
  m = trimmed.match(isoSlash);
  if (m) {
    const year = m[1];
    const month = m[2].padStart(2, "0");
    const day = m[3].padStart(2, "0");
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const formats = [
    { re: /^(\d{2})\/(\d{2})\/(\d{4})$/, sep: true },
    { re: /^(\d{2})-(\d{2})-(\d{4})$/, sep: true },
    { re: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, sep: false }, // M/D/YY — only when first group <= 12 (month)
  ];

  for (const { re, sep } of formats) {
    const match = trimmed.match(re);
    if (match) {
      const first = parseInt(match[1], 10);
      if (!sep && first > 12) continue; // avoid matching YYYY/MM/DD as M/D/YY
      let year = match[3];
      if (year.length === 2) year = `20${year}`;
      const month = match[1].padStart(2, "0");
      const day = match[2].padStart(2, "0");
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  const validYYYYMMDD = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (validYYYYMMDD.test(trimmed)) return trimmed;

  return new Date().toISOString().split("T")[0];
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

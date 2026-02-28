import { Transaction } from "./types";

export function exportToCSV(transactions: Transaction[], filename = "transactions.csv") {
  const headers = ["Date", "Merchant", "Description", "Category", "Amount", "Currency"];
  const rows = transactions.map((t) => [
    t.posted_at,
    t.merchant || "",
    `"${t.description.replace(/"/g, '""')}"`,
    t.category,
    t.amount.toFixed(2),
    t.currency || "USD",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadBlob(csv, filename, "text/csv");
}

export function exportToPrintPDF() {
  window.print();
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

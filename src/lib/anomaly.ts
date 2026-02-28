import { Transaction } from "./types";

export interface Anomaly {
  transaction: Transaction;
  reason: string;
  severity: "warning" | "alert";
}

export function detectAnomalies(transactions: Transaction[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const merchantAvg: Record<string, { sum: number; count: number }> = {};

  for (const t of transactions) {
    if (t.amount >= 0) continue;
    const key = (t.merchant || t.description).toLowerCase();
    if (!merchantAvg[key]) merchantAvg[key] = { sum: 0, count: 0 };
    merchantAvg[key].sum += Math.abs(t.amount);
    merchantAvg[key].count += 1;
  }

  for (const t of transactions) {
    if (t.amount >= 0) continue;
    const key = (t.merchant || t.description).toLowerCase();
    const stats = merchantAvg[key];
    if (!stats || stats.count < 2) continue;

    const avg = stats.sum / stats.count;
    const absAmount = Math.abs(t.amount);

    if (absAmount > avg * 3 && absAmount > 50) {
      anomalies.push({
        transaction: t,
        reason: `$${absAmount.toFixed(2)} is ${(absAmount / avg).toFixed(1)}x your average of $${avg.toFixed(2)} at ${t.merchant || t.description}`,
        severity: absAmount > avg * 5 ? "alert" : "warning",
      });
    }
  }

  // Flag large charges at new merchants (only 1 occurrence, >$200)
  for (const t of transactions) {
    if (t.amount >= 0) continue;
    const key = (t.merchant || t.description).toLowerCase();
    const stats = merchantAvg[key];
    if (stats && stats.count === 1 && Math.abs(t.amount) > 200) {
      anomalies.push({
        transaction: t,
        reason: `First-time charge of $${Math.abs(t.amount).toFixed(2)} at ${t.merchant || t.description}`,
        severity: Math.abs(t.amount) > 500 ? "alert" : "warning",
      });
    }
  }

  return anomalies
    .sort((a, b) => Math.abs(b.transaction.amount) - Math.abs(a.transaction.amount))
    .slice(0, 10);
}

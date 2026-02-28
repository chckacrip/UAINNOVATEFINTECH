"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MonthlySummary } from "@/lib/types";

interface TrendChartProps {
  months: MonthlySummary[];
}

export function TrendChart({ months }: TrendChartProps) {
  const data = [...months].reverse().map((m) => ({
    month: m.month.slice(5),
    Income: Math.round(m.total_income),
    Expenses: Math.round(m.total_expenses),
    Net: Math.round(m.net_cashflow),
  }));

  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Not enough data for trends.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: 10, right: 10, top: 5 }}>
        <XAxis dataKey="month" fontSize={12} />
        <YAxis tickFormatter={(v) => `$${v}`} fontSize={12} width={60} />
        <Tooltip
          formatter={(value) => [`$${Number(value).toLocaleString()}`, undefined]}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}
        />
        <Legend />
        <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="Net" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#d97706",
  "#65a30d", "#0891b2", "#4f46e5", "#be185d", "#059669",
  "#dc2626", "#6366f1", "#64748b",
];

interface SpendingChartProps {
  data: [string, number][];
}

export function SpendingChart({ data }: SpendingChartProps) {
  const chartData = data.map(([name, value]) => ({
    name: name.length > 12 ? name.slice(0, 12) + "…" : name,
    value: Math.round(value * 100) / 100,
  }));

  if (chartData.length === 0) {
    return <p className="text-sm text-slate-500">No spending data for this month.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
        <XAxis type="number" tickFormatter={(v) => `$${v}`} fontSize={12} />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          fontSize={12}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, "Amount"]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            fontSize: "13px",
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

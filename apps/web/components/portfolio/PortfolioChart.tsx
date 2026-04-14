"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PortfolioHolding } from "@finance/types";

const COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#84cc16", // lime-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
];

interface PortfolioChartProps {
  holdings: PortfolioHolding[];
}

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
    notation: "compact",
    compactDisplay: "short",
  }).format(val);

interface TooltipPayload {
  name: string;
  value: number;
  payload: PortfolioHolding & { color: string };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0];
  if (!d) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold mb-1.5">{d.payload.ticker}</p>
      <p className="text-muted-foreground text-xs truncate mb-2">{d.payload.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Value</span>
          <span className="font-medium">{formatIDR(d.value)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Allocation</span>
          <span className="font-medium">{d.payload.allocationPercent.toFixed(1)}%</span>
        </div>
        <div
          className={`flex justify-between gap-4 ${d.payload.gain >= 0 ? "text-emerald-600" : "text-rose-600"}`}
        >
          <span>P&amp;L</span>
          <span className="font-medium">
            {d.payload.gain >= 0 ? "+" : ""}
            {d.payload.gainPercent.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function PortfolioChart({ holdings }: PortfolioChartProps) {
  if (holdings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No holdings to display
      </div>
    );
  }

  const data = holdings
    .filter((h) => h.currentValue > 0)
    .sort((a, b) => b.currentValue - a.currentValue);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="currentValue"
          nameKey="ticker"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.id}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

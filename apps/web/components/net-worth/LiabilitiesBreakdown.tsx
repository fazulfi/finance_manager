"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface BreakdownItem {
  name: string;
  value: number;
  percentage: number;
}

interface LiabilitiesBreakdownProps {
  items: BreakdownItem[];
}

const COLORS = ["#dc2626", "#f97316", "#d97706", "#b91c1c", "#7f1d1d", "#9f1239"];

function toLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: BreakdownItem }>;
}) {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{toLabel(item.name)}</p>
      <p className="text-muted-foreground">{formatCurrency(item.value)}</p>
      <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
    </div>
  );
}

export function LiabilitiesBreakdown({ items }: LiabilitiesBreakdownProps) {
  const data = items.filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No liabilities recorded.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={64}
          outerRadius={104}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((item, index) => (
            <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

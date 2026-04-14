"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface BreakdownItem {
  name: string;
  value: number;
  percentage: number;
}

interface AssetsBreakdownProps {
  items: BreakdownItem[];
}

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#0891b2"];

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
      <p className="font-medium">{item.name}</p>
      <p className="text-muted-foreground">{formatCurrency(item.value)}</p>
      <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
    </div>
  );
}

export function AssetsBreakdown({ items }: AssetsBreakdownProps) {
  const data = items.filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No asset allocation data yet.
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

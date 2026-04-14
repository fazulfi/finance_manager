"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatTypeLabel } from "@/components/investments/types";

interface AllocationItem {
  type: string;
  currentValue: number;
  allocationPercent: number;
}

interface AssetAllocationProps {
  items: AllocationItem[];
}

const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

function formatCompactCurrency(value: number): string {
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
  payload?: Array<{ payload: AllocationItem; value: number }>;
}) {
  if (!active || !payload || payload.length === 0 || !payload[0]) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{formatTypeLabel(item.type)}</p>
      <p className="text-muted-foreground">{formatCompactCurrency(item.currentValue)}</p>
      <p className="text-xs text-muted-foreground">{item.allocationPercent.toFixed(1)}%</p>
    </div>
  );
}

export function AssetAllocation({ items }: AssetAllocationProps) {
  const data = items.filter((item) => item.currentValue > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No allocation data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="currentValue"
          nameKey="type"
          innerRadius={64}
          outerRadius={104}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((item, index) => (
            <Cell key={item.type} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

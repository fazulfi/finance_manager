"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface HistoryPoint {
  id: string;
  label: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  growthRate: number;
  isSnapshot: boolean;
}

interface NetWorthChartProps {
  items: HistoryPoint[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: HistoryPoint }>;
  label?: string;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="text-emerald-600">Net Worth: {formatCurrency(point.netWorth)}</p>
      <p className="text-muted-foreground">Assets: {formatCurrency(point.assets)}</p>
      <p className="text-muted-foreground">Liabilities: {formatCurrency(point.liabilities)}</p>
      <p className={`${point.growthRate >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
        Growth: {point.growthRate >= 0 ? "+" : ""}
        {point.growthRate.toFixed(2)}%
      </p>
      {!point.isSnapshot && <p className="text-xs text-amber-600">Live (not snapshot)</p>}
    </div>
  );
}

export function NetWorthChart({ items }: NetWorthChartProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        No net worth history yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={items}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(value) =>
            new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(
              value,
            )
          }
          width={72}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="netWorth"
          stroke="#10b981"
          strokeWidth={3}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

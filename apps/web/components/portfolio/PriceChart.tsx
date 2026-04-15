"use client";

import { api } from "@finance/api/react";
import type { PriceHistoryPeriod } from "@finance/types";
import { Skeleton } from "@finance/ui";
import { format } from "date-fns";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PERIODS: { label: string; value: PriceHistoryPeriod }[] = [
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
  { label: "5Y", value: "5y" },
];

interface PriceChartProps {
  ticker: string;
  currency?: string;
}

function formatPrice(val: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(val);
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  currency: string;
}

function CustomTooltip({ active, payload, label, currency }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  if (value === undefined) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="font-semibold">{formatPrice(value, currency)}</p>
    </div>
  );
}

export function PriceChart({ ticker, currency = "IDR" }: PriceChartProps) {
  const [period, setPeriod] = useState<PriceHistoryPeriod>("1y");

  const { data: history, isLoading, isError } = api.stock.getStockHistory.useQuery(
    { ticker, period },
    { staleTime: 15 * 60 * 1000 }, // 15-min cache matches Yahoo Finance delay
  );

  const chartData = (history ?? []).map((row) => ({
    date: format(new Date(row.date), period === "1mo" || period === "3mo" ? "dd MMM" : "MMM yy"),
    close: row.close,
  }));

  // Calculate if trend is positive (first vs last close)
  const isPositive =
    chartData.length > 1
      ? (chartData[chartData.length - 1]?.close ?? 0) >= (chartData[0]?.close ?? 0)
      : true;

  const strokeColor = isPositive ? "#10b981" : "#f43f5e";
  const gradientColor = isPositive ? "#10b981" : "#f43f5e";

  if (isLoading) {
    return <Skeleton className="w-full h-64" />;
  }

  if (isError || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Price history unavailable for {ticker}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="flex gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              period === p.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(v)
            }
            width={55}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#grad-${ticker})`}
            dot={false}
            activeDot={{ r: 4, fill: strokeColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

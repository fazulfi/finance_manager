// apps/web/components/dashboard/CashFlowChart.tsx
"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CashFlowDataPoint {
  date: string;
  value: number;
}

interface CashFlowChartProps {
  data: CashFlowDataPoint[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(payload[0].payload.date);
      const formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{formattedDate}</p>
          <p
            className={`text-xs font-medium ${
              payload[0].value >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {payload[0].value >= 0 ? "+" : ""}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const formattedData = data.map((item) => ({
    ...item,
    value: Number(item.value.toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(date) => {
            const d = new Date(date);
            return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
          }}
          stroke="#94a3b8"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(value) =>
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(value)
          }
          stroke="#94a3b8"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
        <defs>
          <linearGradient id="fillPositive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillNegative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stackId="1"
          stroke={data[0]?.value !== undefined && data[0].value >= 0 ? "#10b981" : "#f43f5e"}
          fill={
            data[0]?.value !== undefined && data[0].value >= 0
              ? "url(#fillPositive)"
              : "url(#fillNegative)"
          }
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

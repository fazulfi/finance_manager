// apps/web/components/dashboard/BudgetProgressChart.tsx
"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface BudgetDataPoint {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
}

interface BudgetProgressChartProps {
  data: BudgetDataPoint[];
}

export function BudgetProgressChart({ data }: BudgetProgressChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{item.category}</p>
          <p className="text-xs text-muted-foreground">
            Budgeted:{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(item.budgeted)}
          </p>
          <p className="text-xs text-muted-foreground">
            Spent:{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(item.spent)}
          </p>
          <p
            className={`text-xs font-medium ${
              item.remaining < 0 ? "text-rose-500" : "text-emerald-500"
            }`}
          >
            Remaining:{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(item.remaining)}
          </p>
        </div>
      );
    }
    return null;
  };

  const formattedData = data.map((item) => ({
    ...item,
    budgeted: Number(item.budgeted.toFixed(2)),
    spent: Number(item.spent.toFixed(2)),
    remaining: Number(item.remaining.toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 12 }}
          stroke="#94a3b8"
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-45}
          textAnchor="end"
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
        <Bar dataKey="budgeted" fill="#94a3b8" barSize={40} radius={[4, 4, 0, 0]} name="Budgeted" />
        <Bar dataKey="spent" fill="#f59e0b" barSize={40} radius={[4, 4, 0, 0]} name="Spent" />
        <Bar
          dataKey="remaining"
          fill="#10b981"
          barSize={40}
          radius={[4, 4, 0, 0]}
          name="Remaining"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

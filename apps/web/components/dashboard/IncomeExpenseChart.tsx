// apps/web/components/dashboard/IncomeExpenseChart.tsx
"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartDataPoint {
  date: string;
  income: number;
  expense: number;
}

interface IncomeExpenseChartProps {
  data: ChartDataPoint[];
}

export function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  // Custom tooltip with formatter
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // Simple date formatting (YYYY-MM-DD)
      const date = new Date(payload[0].payload.date);
      const formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{formattedDate}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-xs"
              style={{
                color: entry.color,
              }}
            >
              {entry.name}:{" "}
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex gap-4 text-xs">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const formattedData = data.map((item) => ({
    ...item,
    income: Number(item.income.toFixed(2)),
    expense: Number(item.expense.toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
        <Legend content={<CustomLegend />} />
        <Line
          type="monotone"
          dataKey="income"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: "#10b981", r: 4 }}
          activeDot={{ r: 6 }}
          name="Income"
        />
        <Line
          type="monotone"
          dataKey="expense"
          stroke="#f43f5e"
          strokeWidth={2}
          dot={{ fill: "#f43f5e", r: 4 }}
          activeDot={{ r: 6 }}
          name="Expense"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

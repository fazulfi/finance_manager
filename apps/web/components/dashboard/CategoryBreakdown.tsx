// apps/web/components/dashboard/CategoryBreakdown.tsx
"use client";

import * as React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CategoryDataPoint {
  name: string;
  value: number;
}

interface CategoryBreakdownProps {
  data: CategoryDataPoint[];
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  // Generate category colors
  const categoryColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f97316",
    "#14b8a6",
    "#84cc16",
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = payload[0].payload.value;
      const percentage = ((payload[0].value / total) * 100).toFixed(1);

      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{payload[0].payload.name}</p>
          <p className="text-xs text-muted-foreground">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(payload[0].value)}
          </p>
          <p className="text-xs text-muted-foreground">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const chartData = data.map((item) => ({
    ...item,
    value: Number(item.value.toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }: any) =>
            percent > 0.1 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} cursor={{ fillOpacity: 0.8 }} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

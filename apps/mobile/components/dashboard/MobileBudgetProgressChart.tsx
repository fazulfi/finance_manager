// apps/mobile/components/dashboard/MobileBudgetProgressChart.tsx
import React from "react";
import { View } from "react-native";
import { VictoryBar, VictoryChart, VictoryTheme } from "victory-native";

export interface ChartDataPoint {
  label: string;
  value: number;
  status: "under" | "approaching" | "exceeded";
}

interface MobileBudgetProgressChartProps {
  data: ChartDataPoint[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "under":
      return "#10b981"; // emerald-500
    case "approaching":
      return "#f59e0b"; // amber-500
    case "exceeded":
      return "#f43f5e"; // rose-500
    default:
      return "#6366f1"; // indigo-500
  }
};

export function MobileBudgetProgressChart({ data }: MobileBudgetProgressChartProps) {
  const chartData = data.map((item) => ({
    x: item.label,
    y: item.value,
    fill: getStatusColor(item.status),
  }));

  // Limit to max 5 bars for compact view
  const limitedData = chartData.slice(0, 5);

  if (limitedData.length === 0) {
    return null;
  }

  return (
    <View className="w-full h-[120px]">
      <VictoryChart
        theme={VictoryTheme.material}
        height={120}
        width={300}
        padding={{ top: 20, right: 20, bottom: 20, left: 10 }}
      >
        <VictoryBar
          data={limitedData}
          horizontal
          barWidth={({ index }) => (index === 0 ? 40 : 35)}
          style={{
            data: {
              fill: ({ datum }) => datum.fill,
            },
            labels: {
              fontSize: 10,
              fill: "#6b7280",
              fontWeight: "600",
            },
          }}
          labels={({ datum }) => `${datum.y}`}
        />
      </VictoryChart>
    </View>
  );
}

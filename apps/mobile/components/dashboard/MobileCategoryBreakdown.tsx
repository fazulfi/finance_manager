// apps/mobile/components/dashboard/MobileCategoryBreakdown.tsx
import React from "react";
import { View } from "react-native";
import { VictoryPie, VictoryChart, VictoryTheme, VictoryLegend } from "victory-native";

export interface ChartDataPoint {
  label: string;
  value: number;
  color: string;
}

interface MobileCategoryBreakdownProps {
  data: ChartDataPoint[];
}

export function MobileCategoryBreakdown({ data }: MobileCategoryBreakdownProps) {
  // Limit to top 5 categories for compact view
  const limitedData = data.slice(0, 5);

  if (limitedData.length === 0) {
    return null;
  }

  const chartData = limitedData.map((item) => ({
    x: item.label,
    y: item.value,
    fill: item.color,
  }));

  const total = chartData.reduce((sum, item) => sum + item.y, 0);

  return (
    <View className="w-full h-[120px]">
      <VictoryChart
        theme={VictoryTheme.material}
        height={120}
        width={300}
        padding={{ top: 20, right: 60, bottom: 20, left: 10 }}
      >
        <VictoryPie
          data={chartData}
          labels={({ datum }) => `${datum.x}: ${Math.round((datum.y / total) * 100)}%`}
          labelRadius={50}
          innerRadius={20}
          style={{
            data: {
              stroke: "#ffffff",
              strokeWidth: 2,
            },
            labels: {
              fontSize: 8,
              fill: "#6b7280",
              fontWeight: "600",
            },
          }}
          origin={{ x: 150, y: 60 }}
          animate={{ duration: 500 }}
        />
        <VictoryLegend
          orientation="horizontal"
          x={10}
          y={80}
          itemsPerRow={2}
          colorScale={limitedData.map((item) => item.color)}
          data={limitedData.map((item) => ({
            name: item.label,
            symbol: { fill: item.color },
          }))}
        />
      </VictoryChart>
    </View>
  );
}

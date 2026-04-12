import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ProjectStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";

interface ProjectProgressProps {
  percentage: number;
  spent: number;
  budget?: number | null;
  status: ProjectStatus;
  size?: number;
}

function getStatusTone(status: ProjectStatus, percentage: number) {
  if (status === "CANCELLED") {
    return { color: "#64748b", soft: "rgba(100, 116, 139, 0.35)", label: "Cancelled" };
  }

  if (status === "PAUSED") {
    return { color: "#f59e0b", soft: "rgba(245, 158, 11, 0.4)", label: "Paused" };
  }

  if (status === "COMPLETED") {
    return { color: "#10b981", soft: "rgba(16, 185, 129, 0.45)", label: "Completed" };
  }

  if (percentage >= 100) {
    return { color: "#f43f5e", soft: "rgba(244, 63, 94, 0.45)", label: "Over budget" };
  }

  if (percentage >= 80) {
    return { color: "#f59e0b", soft: "rgba(245, 158, 11, 0.4)", label: "At risk" };
  }

  return { color: "#3b82f6", soft: "rgba(59, 130, 246, 0.45)", label: "On track" };
}

export function ProjectProgress({
  percentage,
  spent,
  budget,
  status,
  size = 84,
}: ProjectProgressProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0));
  const tone = getStatusTone(status, percentage);
  const strokeWidth = 8;
  const textPercent = Math.max(0, Math.round(percentage));

  return (
    <View className="items-center gap-2">
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: "#334155",
          backgroundColor: "#0f172a",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: `${clamped}%`,
            backgroundColor: tone.soft,
          }}
        />

        <View
          style={[
            styles.center,
            {
              top: strokeWidth,
              left: strokeWidth,
              right: strokeWidth,
              bottom: strokeWidth,
              borderRadius: (size - strokeWidth * 2) / 2,
            },
          ]}
        >
          <Text style={[styles.percentText, { color: tone.color }]}>{textPercent}%</Text>
        </View>
      </View>

      <Text style={[styles.statusText, { color: tone.color }]}>{tone.label}</Text>
      <Text className="text-[11px] text-muted-foreground">
        {spent.toLocaleString("id-ID")} / {(budget ?? 0).toLocaleString("id-ID")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  percentText: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

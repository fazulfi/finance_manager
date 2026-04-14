// apps/mobile/components/dashboard/ChartCard.tsx
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, children, className }: ChartCardProps) {
  return (
    <View className={`flex-1 bg-white rounded-xl p-4 ${className || ""}`}>
      <Text className="text-sm font-semibold text-gray-900 mb-3">{title}</Text>
      <View className="bg-gray-50 rounded-2xl h-44 justify-center items-center border border-gray-200">
        {children}
      </View>
    </View>
  );
}

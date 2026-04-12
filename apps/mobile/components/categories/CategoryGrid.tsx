// apps/mobile/components/categories/CategoryGrid.tsx
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { Category } from "@finance/types";
import { cn } from "@finance/utils";
import { CategoryType } from "@finance/types/src/enums";
import React, { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

interface CategoryGridProps {
  categories: (Category & { usageCount?: number })[];
  onCategoryPress: (category: Category & { usageCount?: number }) => void;
  onDelete?: (category: Category) => void;
  isLoading?: boolean;
  className?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Icon mapping for default categories
const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  "💼": "wallet",
  "💻": "laptop",
  "📈": "trending-up",
  "💰": "cash",
  "🏠": "home",
  "🍽️": "restaurant",
  "🚗": "car",
  "🏥": "medkit",
  "📚": "book",
  "🎬": "play",
  "🛍️": "cart",
  "💡": "flash",
  "🛡️": "shield",
  "💆": "person",
  "✈️": "airplane",
  "📱": "phone-portrait",
  "🏦": "build",
  "📊": "stats-chart",
  "📌": "pin",
  food: "restaurant",
  home: "home",
  transport: "car",
  shopping: "cart",
  entertainment: "play",
  health: "medkit",
  bills: "document-text",
  salary: "wallet",
  investment: "trending-up",
  transfer: "swap-horizontal",
  other: "ellipsis-horizontal-circle",
};

export function CategoryGrid({
  categories,
  onCategoryPress,
  onDelete,
  isLoading = false,
  className,
}: CategoryGridProps) {
  const scale = useSharedValue(1);

  // Paginate categories to 50 items max
  const paginatedCategories = useMemo(() => {
    return categories.slice(0, 50);
  }, [categories]);

  // Calculate display categories (handle both emojis and names)
  const displayCategories = useMemo(() => {
    return paginatedCategories.map((cat) => {
      const icon = cat.icon || "grid";
      const iconName = ICON_MAP[icon] || "grid";
      const color = cat.color || (cat.type === CategoryType.EXPENSE ? "#ef4444" : "#10b981");
      return {
        ...cat,
        iconName,
        color,
      };
    });
  }, [paginatedCategories]);

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getCategoryCard = (
    item: Category & { usageCount?: number; iconName?: string; color?: string },
  ) => (
    <AnimatedView>
      <AnimatedPressable
        accessibilityLabel={`${item.name} ${item.type} category`}
        accessibilityRole="button"
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          // Light feedback for selection
          Haptics.impactAsync("light");
          onCategoryPress(item);
        }}
        className="w-36 h-32 rounded-2xl bg-card border border-border shadow-sm"
        style={[styles.pressableAnimated, animatedStyle]}
      >
        <View className="flex-col h-full items-center justify-center gap-2 px-2">
          {/* Color Indicator */}
          <View className="rounded-full p-2.5" style={{ backgroundColor: item.color }}>
            <Ionicons name={item.iconName || ("grid" as any)} size={24} color="#fff" />
          </View>

          {/* Category Info */}
          <View className="flex-col items-center gap-1 w-full">
            <Text
              className={`text-xs font-medium text-foreground truncate text-center ${
                item.isDefault && "opacity-60"
              }`}
              numberOfLines={2}
            >
              {item.name}
            </Text>

            {/* Type Badge */}
            <View className="flex-row items-center gap-1">
              <View
                className="h-4 px-1.5 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor:
                    item.type === CategoryType.EXPENSE
                      ? "rgba(239, 68, 68, 0.1)"
                      : "rgba(16, 185, 129, 0.1)",
                }}
              >
                <Text
                  className="text-[9px]"
                  style={{
                    color: item.type === CategoryType.EXPENSE ? "#ef4444" : "#10b981",
                  }}
                >
                  {"expense"}
                </Text>
              </View>
            </View>

            {/* Usage Count Badge */}
            {item.usageCount !== undefined && item.usageCount > 0 && (
              <View className="flex-row items-center gap-0.5 bg-muted rounded-full px-2 py-0.5">
                <Ionicons name="finger-print" size={10} color="#94a3b8" />
                <Text className="text-[9px] text-muted-foreground font-medium">
                  {item.usageCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </AnimatedPressable>
    </AnimatedView>
  );

  const renderSkeleton = () => (
    <AnimatedView className="w-36 h-32 rounded-2xl bg-muted border border-border opacity-50 animate-pulse" />
  );

  return (
    <View className={cn("flex-col gap-4", className)}>
      {isLoading ? (
        <FlatList
          data={Array(6).fill(null)}
          renderItem={() => <View style={{ width: 144 }}>{renderSkeleton()}</View>}
          keyExtractor={(item, index) => `skeleton-${index}`}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 4 }}
        />
      ) : (
        <FlatList
          data={displayCategories}
          renderItem={({ item }) => getCategoryCard(item)}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={paginatedCategories.length > 4}
          contentContainerStyle={{ gap: 4 }}
          ListEmptyComponent={
            <View className="flex-col items-center justify-center py-16">
              <View className="w-20 h-20 rounded-full bg-muted items-center justify-center mb-4">
                <Ionicons name="grid-outline" size={40} color="#94a3b8" />
              </View>
              <Text className="text-sm font-medium text-foreground mb-1">No categories found</Text>
              <Text className="text-xs text-muted-foreground text-center max-w-[200px]">
                {displayCategories.length === 0
                  ? "Get started by creating your first category"
                  : "Try adjusting your filters"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pressableAnimated: {},
});

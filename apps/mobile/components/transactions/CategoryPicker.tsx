// apps/mobile/components/transactions/CategoryPicker.tsx
import { Ionicons } from "@expo/vector-icons";
import type { TransactionType } from "@finance/types";
import { cn } from "@finance/utils";
import React, { useState } from "react";
import { StyleSheet, FlatList, View, Text, Pressable, TextInput } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

interface CategoryPickerProps {
  categories: Category[];
  selectedCategory: Category | null;
  onCategorySelect: (category: Category) => void;
  transactionType: TransactionType;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  className?: string;
}

const ICONS = {
  Home: "home",
  Food: "restaurant",
  Transport: "car",
  Shopping: "cart",
  Entertainment: "game-controller",
  Health: "medical",
  Bills: "document-text",
  Salary: "cash",
  Investment: "trending-up",
  Transfer: "swap-horizontal",
} as const;

const COLORS: Record<string, string> = {
  Home: "#3b82f6",
  Food: "#f59e0b",
  Transport: "#6366f1",
  Shopping: "#ec4899",
  Entertainment: "#8b5cf6",
  Health: "#ef4444",
  Bills: "#06b6d4",
  Salary: "#10b981",
  Investment: "#14b8a6",
  Transfer: "#64748b",
};

export function CategoryPicker({
  categories,
  selectedCategory,
  onCategorySelect,
  transactionType,
  searchQuery,
  onSearchChange,
  className,
}: CategoryPickerProps) {
  const scale = useSharedValue(1);

  const filteredCategories = categories.filter(
    (cat) =>
      cat.type === transactionType && cat.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const selectedIcon = selectedCategory?.icon || "grid";

  const handlePress = (category: Category) => {
    onCategorySelect(category);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const CategoryIcon = ICONS[selectedIcon as keyof typeof ICONS] ?? "grid";

  const renderItem = ({ item }: { item: Category }) => {
    const isSelected = selectedCategory?.id === item.id;

    const rowAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View style={rowAnimatedStyle}>
        <Pressable
          accessibilityLabel={`${item.name} category`}
          accessibilityRole="button"
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => handlePress(item)}
          className={cn(
            "w-20 h-20 rounded-2xl bg-card border-2 items-center justify-center",
            isSelected ? "border-primary bg-primary/10" : "border-transparent",
          )}
        >
          <Animated.View
            className={cn("rounded-full p-3", isSelected ? "bg-primary/20" : "bg-muted")}
            style={animatedStyle}
          >
            <Ionicons
              name={(ICONS[item.icon as keyof typeof ICONS] ?? "grid") as any}
              size={24}
              color={isSelected ? "#fff" : COLORS[item.icon]}
            />
          </Animated.View>
        </Pressable>
        <Text
          className={`text-center text-xs mt-2 ${
            isSelected ? "text-primary font-medium" : "text-muted-foreground"
          }`}
        >
          {item.name}
        </Text>
      </Animated.View>
    );
  };

  return (
    <View className={cn("flex-col gap-4", className)}>
      {/* Search Bar */}
      <View className="flex-row items-center bg-muted rounded-xl px-4 py-3">
        <Ionicons
          name="search"
          size={20}
          color="#94a3b8"
          accessibilityLabel="Search categories"
          accessibilityRole="button"
        />
        <TextInput
          accessibilityLabel="Search categories input"
          accessibilityRole="search"
          placeholder="Search categories..."
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholderTextColor="#94a3b8"
          className="flex-1 ml-3 text-sm text-foreground"
          style={{ fontFamily: "Inter" }}
        />
      </View>

      {/* Category Grid */}
      <FlatList
        data={filteredCategories}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={4}
        scrollEnabled={filteredCategories.length > 8}
        contentContainerStyle={{ paddingBottom: 80 }}
        className="pb-20"
      />

      {filteredCategories.length === 0 && (
        <View className="flex-col items-center justify-center py-10">
          <Ionicons name="search" size={48} color="#334155" />
          <Text className="text-sm text-muted-foreground mt-2">No categories found</Text>
        </View>
      )}
    </View>
  );
}

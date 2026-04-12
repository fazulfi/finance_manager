// apps/mobile/components/categories/CategoryCard.tsx
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { Category } from "@finance/types";
import { cn } from "@finance/utils";
import { CategoryType } from "@finance/types/src/enums";
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

interface CategoryCardProps {
  category: Category & { usageCount?: number };
  onPress: (category: Category & { usageCount?: number }) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  isDefault?: boolean;
  className?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedText = Animated.createAnimatedComponent(Text);

// Icon mapping - using Ionicons names matching the emoji icons
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

export function CategoryCard({
  category,
  onPress,
  onDelete,
  isDeleting = false,
  isDefault = false,
  className,
}: CategoryCardProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  // Determine if category is expense (default is EXPENSE)
  const isExpense = category.type === CategoryType.EXPENSE;
  const amountColor = isExpense ? "#ef4444" : "#10b981";

  // Get icon and color
  const icon = category.icon || "grid";
  const iconName = ICON_MAP[icon] || "grid";
  const color = category.color || amountColor;

  // Handle press animations
  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    onPress(category);
  };

  // Delete gesture handler
  const deleteGesture = Gesture.Pan()
    .onStart(() => {
      if (isDeleting) return;
      translateX.value = withSpring(-120, { damping: 15 });
    })
    .onUpdate((gestureState) => {
      if (isDeleting || !gestureState) return;
      if (gestureState.translationX < -50) {
        translateX.value = withSpring(-120, { damping: 15 });
      }
    })
    .onEnd(() => {
      if (translateX.value < -80 && onDelete && !isDefault) {
        // Medium feedback for delete action
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        runOnJS(onDelete)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={deleteGesture}>
        <AnimatedView
          className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
          style={animatedContainerStyle}
        >
          {/* Delete Button */}
          {onDelete && !isDefault && (
            <AnimatedPressable
              accessibilityLabel="Delete category"
              accessibilityRole="button"
              onPress={onDelete}
              hitSlop={10}
              className="absolute left-0 top-0 bottom-0 w-20 bg-destructive justify-center items-center"
            >
              {isDeleting ? (
                <AnimatedText className="text-white font-medium text-sm">Delete</AnimatedText>
              ) : (
                <Ionicons name="trash-outline" size={20} color="white" />
              )}
            </AnimatedPressable>
          )}

          {/* Main Card Content */}
          <Pressable
            accessibilityLabel={`${category.name} ${category.type} category`}
            accessibilityRole="button"
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            className="flex-1 px-4 py-3 flex-row items-center justify-between"
            style={[styles.pressableAnimated, animatedStyle]}
          >
            <View className="flex-row items-center gap-3 flex-1">
              {/* Color Indicator */}
              <View className="rounded-full p-2.5" style={{ backgroundColor: color }}>
                <Ionicons name={iconName as any} size={20} color="#fff" />
              </View>

              {/* Category Info */}
              <View className="flex-col gap-0.5 flex-1">
                <Text
                  className={`text-sm font-medium text-foreground truncate ${
                    isDefault && "opacity-60"
                  }`}
                  numberOfLines={1}
                >
                  {category.name}
                </Text>
                <View className="flex-row items-center gap-2">
                  {/* Type Badge */}
                  <View
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isExpense
                        ? "rgba(239, 68, 68, 0.1)"
                        : "rgba(16, 185, 129, 0.1)",
                    }}
                  >
                    <Text
                      className="text-[10px]"
                      style={{ color: isExpense ? "#ef4444" : "#10b981" }}
                    >
                      {"expense"}
                    </Text>
                  </View>

                  {/* Usage Count Badge */}
                  {category.usageCount !== undefined && category.usageCount > 0 && (
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="finger-print" size={12} color="#94a3b8" />
                      <Text className="text-[10px] text-muted-foreground">
                        {category.usageCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Pressable>
        </AnimatedView>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  pressableAnimated: {},
});

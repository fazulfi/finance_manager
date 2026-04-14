// apps/mobile/components/goals/GoalCard.tsx
import React, { useState } from "react";
import { View, Text } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import type { SavingsGoal } from "@finance/types";
import { GoalStatus } from "@finance/types";
import { cn } from "@finance/utils";

interface GoalCardProps {
  goal: SavingsGoal;
  onContribute?: (goal: SavingsGoal) => void;
  onComplete?: (goal: SavingsGoal) => void;
  className?: string;
}

const AnimatedView = Animated.createAnimatedComponent(Animated.View);

export function GoalCard({ goal, onContribute, onComplete, className }: GoalCardProps) {
  const [isSwiping, setIsSwiping] = useState(false);

  const translateX = useSharedValue(0);
  const isCompleted = goal.status === GoalStatus.COMPLETED;
  const percentage = Math.max(0, Math.min(100, (goal.currentAmount / goal.targetAmount) * 100));

  // Milestone colors based on progress
  const getMilestoneColor = () => {
    if (isCompleted) return "bg-emerald-500";
    if (percentage >= 75) return "bg-blue-600";
    if (percentage >= 50) return "bg-blue-500";
    if (percentage >= 25) return "bg-amber-500";
    return "bg-gray-300";
  };

  const milestoneColor = getMilestoneColor();

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleGestureUpdate = (event: any) => {
    if (isSwiping || isCompleted) return;

    // Swipe left to contribute
    if (event.translationX < -50) {
      translateX.value = withSpring(-120, { damping: 15 });
    } else if (event.translationX > 50) {
      // Swipe right (optional future functionality)
      translateX.value = withSpring(0, { damping: 15 });
    }
  };

  const handleEndGesture = () => {
    if (translateX.value < -80) {
      // Trigger contribute
      if (onContribute && !isCompleted) {
        runOnJS(onContribute)(goal);
      }
      translateX.value = withTiming(0, { duration: 200 });
    } else {
      // Reset position
      translateX.value = withSpring(0);
    }
  };

  const formatDate = () => {
    if (!goal.deadline) return "";
    const date = new Date(goal.deadline);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow =
      new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString() === date.toDateString();

    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const getIcon = () => {
    if (goal.status === GoalStatus.COMPLETED) return "checkmark-circle";
    if (percentage >= 75) return "trending-up";
    if (percentage >= 50) return "trending-up";
    return "flag";
  };

  const handleContributeComplete = () => {
    // Check for milestone achievement and trigger haptic feedback
    if (percentage >= 25 && percentage < 50) {
      console.log("Milestone reached: 25%");
    } else if (percentage >= 50 && percentage < 75) {
      console.log("Milestone reached: 50%");
    } else if (percentage >= 75 && percentage < 100) {
      console.log("Milestone reached: 75%");
    } else if (percentage === 100) {
      console.log("Goal completed!");
    }
  };

  return (
    <GestureHandlerRootView>
      <GestureDetector
        gesture={Gesture.Pan().onUpdate(handleGestureUpdate).onEnd(handleEndGesture)}
      >
        <AnimatedView
          className={cn(
            "relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm",
            isCompleted ? "border-2 border-emerald-200" : "border border-gray-100",
            className,
          )}
          style={animatedContainerStyle}
        >
          {/* Swipe Action Button */}
          {!isCompleted && (
            <AnimatedView
              className="absolute right-0 top-0 bottom-0 w-28 bg-blue-500 items-center justify-center"
              style={{ transform: [{ translateX: 0 }] }}
            >
              <Ionicons name="add-circle" size={28} color="white" />
            </AnimatedView>
          )}

          <View className="flex-col gap-4">
            {/* Header */}
            <View className="flex-row items-center justify-between">
              <View className="flex-col gap-1">
                <Text className="text-lg font-semibold text-foreground">{goal.name}</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs text-muted-foreground">{formatDate()}</Text>
                  <View
                    className={cn(
                      "rounded-full px-2 py-0.5",
                      isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : percentage >= 75
                          ? "bg-blue-100 text-blue-700"
                          : percentage >= 50
                            ? "bg-blue-100 text-blue-700"
                            : percentage >= 25
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-600",
                    )}
                  >
                    <Text className="text-[10px] font-medium uppercase tracking-wide">
                      {isCompleted
                        ? "Completed"
                        : percentage >= 75
                          ? "Almost there"
                          : percentage >= 50
                            ? "On track"
                            : percentage >= 25
                              ? "Started"
                              : "New"}
                    </Text>
                  </View>
                </View>
              </View>
              <View className="rounded-full bg-muted p-3">
                <Ionicons name={getIcon() as any} size={24} color={milestoneColor} />
              </View>
            </View>

            {/* Circular Progress */}
            <View className="items-center gap-3">
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  borderWidth: 8,
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
                    height: `${percentage}%`,
                    backgroundColor: milestoneColor,
                  }}
                />

                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    right: 8,
                    bottom: 8,
                    borderRadius: (100 - 16) / 2,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0f172a",
                  }}
                >
                  <Text
                    className="text-xl font-bold"
                    style={{
                      color:
                        milestoneColor === "bg-gray-300"
                          ? "#9ca3af"
                          : milestoneColor.replace("bg-", "#"),
                    }}
                  >
                    {Math.round(percentage)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Amounts */}
            <View className="flex-col gap-1">
              <View className="flex-row items-center justify-between">
                <View className="flex-col gap-0.5">
                  <Text className="text-xs text-muted-foreground">Current</Text>
                  <Text className="text-sm font-medium tabular-nums text-foreground">
                    {goal.currentAmount.toLocaleString("id-ID")}
                  </Text>
                </View>
                <View className="flex-col items-end gap-0.5">
                  <Text className="text-xs text-muted-foreground">Target</Text>
                  <Text className="text-sm font-medium tabular-nums text-foreground">
                    {goal.targetAmount.toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action hint */}
            {!isCompleted && (
              <View className="flex-row items-center justify-center gap-1.5 py-2">
                <Ionicons name="hand-right-outline" size={16} color="#64748b" />
                <Text className="text-xs text-muted-foreground">Swipe left to contribute</Text>
              </View>
            )}
          </View>
        </AnimatedView>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

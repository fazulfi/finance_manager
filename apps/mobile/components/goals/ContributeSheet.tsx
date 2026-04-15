// apps/mobile/components/goals/ContributeSheet.tsx
import { Ionicons } from "@expo/vector-icons";
import type { SavingsGoal } from "@finance/types";
import { cn } from "@finance/utils";
import React, { useState, useTransition } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";

interface ContributeSheetProps {
  visible: boolean;
  goal?: SavingsGoal | null;
  onClose: () => void;
  onContribute: (amount: number) => void;
  onSubmitting?: (isSubmitting: boolean) => void;
  className?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ContributeSheet({
  visible,
  goal,
  onClose,
  onContribute,
  onSubmitting,
  className,
}: ContributeSheetProps) {
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickAmounts = [1000, 5000, 10000, 25000];

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const handleSubmit = () => {
    if (!amount || isSubmitting) return;

    setIsSubmitting(true);
    if (onSubmitting) onSubmitting(true);

    // Simulate submission (replace with actual API call)
    setTimeout(() => {
      onContribute(parseFloat(amount));
      setAmount("");
      setIsSubmitting(false);
      if (onSubmitting) onSubmitting(false);
    }, 500);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setAmount("");
    onClose();
  };

  const getMilestoneColor = (currentPercentage: number) => {
    if (!goal) return "bg-emerald-500";

    if (currentPercentage >= 75) return "bg-blue-600";
    if (currentPercentage >= 50) return "bg-blue-500";
    if (currentPercentage >= 25) return "bg-amber-500";
    return "bg-gray-300";
  };

  const percentage = goal
    ? Math.max(0, Math.min(100, (goal.currentAmount / goal.targetAmount) * 100))
    : 0;

  const milestoneColor = getMilestoneColor(percentage);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable className="flex-1 bg-black/50" onPress={handleClose}>
        <AnimatedView
          entering={SlideInUp.springify()}
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-8",
            className,
          )}
        >
          <View className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

          {/* Header */}
          <View className="flex-col gap-2 mb-6">
            <View className="flex-row items-center justify-between">
              <View className="flex-col gap-0.5">
                <AnimatedText className="text-xl font-semibold text-foreground">
                  Add Contribution
                </AnimatedText>
                {goal && (
                  <AnimatedText className="text-sm text-muted-foreground">{goal.name}</AnimatedText>
                )}
              </View>
              <Pressable
                onPress={handleClose}
                className="rounded-full p-2 bg-gray-100"
                disabled={isSubmitting}
              >
                <Ionicons name="close-outline" size={24} color="#64748b" />
              </Pressable>
            </View>

            {/* Progress preview */}
            {goal && (
              <View className="flex-col gap-2 mt-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">Progress</Text>
                  <Text className="text-xs font-medium tabular-nums">
                    {Math.round(percentage)}%
                  </Text>
                </View>
                <View
                  className="h-2 bg-gray-100 rounded-full overflow-hidden"
                  style={{ backgroundColor: "#e2e8f0" }}
                >
                  <AnimatedView
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: milestoneColor,
                      width: `${percentage}%`,
                    }}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Amount Input */}
          <View className="flex-col gap-3 mb-6">
            <View className="relative">
              <Text className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                IDR
              </Text>
              <TextInput
                className="flex-1 bg-gray-50 rounded-xl pl-12 pr-4 py-4 text-foreground text-lg font-medium"
                placeholder="Enter amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                editable={!isSubmitting}
              />
            </View>

            {/* Quick Amounts */}
            <View className="flex-row gap-2 flex-wrap">
              {quickAmounts.map((val) => (
                <AnimatedPressable
                  key={val}
                  entering={FadeIn.delay(val * 50)}
                  className={cn(
                    "px-4 py-3 rounded-xl",
                    isSubmitting ? "opacity-50" : "",
                    amount === val.toString() ? "bg-gray-100" : "bg-gray-50",
                  )}
                  onPress={() => handleQuickAmount(val)}
                  disabled={isSubmitting}
                  hitSlop={10}
                >
                  <Text
                    className={cn(
                      "text-sm font-medium",
                      amount === val.toString() ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {val.toLocaleString("id-ID")}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <AnimatedPressable
            entering={FadeIn.delay(600)}
            className={cn(
              "w-full py-4 rounded-xl flex-row items-center justify-center gap-2",
              isSubmitting ? "bg-gray-300" : "bg-foreground",
              !amount || isSubmitting ? "opacity-60" : "",
            )}
            onPress={handleSubmit}
            disabled={!amount || isSubmitting}
            hitSlop={10}
          >
            {isSubmitting ? (
              <>
                <AnimatedText className="text-white font-medium text-sm">
                  Processing...
                </AnimatedText>
              </>
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="white" />
                <AnimatedText className="text-white font-semibold">Contribute Now</AnimatedText>
              </>
            )}
          </AnimatedPressable>
        </AnimatedView>
      </Pressable>
    </Modal>
  );
}

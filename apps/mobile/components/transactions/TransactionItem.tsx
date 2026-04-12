// apps/mobile/components/transactions/TransactionItem.tsx
import { Ionicons } from "@expo/vector-icons";
import type { Transaction} from "@finance/types";
import { TransactionType } from "@finance/types";
import { cn } from "@finance/utils";
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type {
  GestureState} from "react-native-gesture-handler";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

interface TransactionItemProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  onSwipeRight?: (transaction: Transaction) => void;
  onSwipeLeft?: (transaction: Transaction) => void;
  className?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedText = Animated.createAnimatedComponent(Text);

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
  onSwipeRight,
  onSwipeLeft,
  className,
}: TransactionItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const translateX = useSharedValue(0);
  const deleteTranslate = useSharedValue(0);
  const editTranslate = useSharedValue(0);

  const isExpense = transaction.type === TransactionType.EXPENSE;
  const isIncome = transaction.type === TransactionType.INCOME;

  const containerStyle = isExpense
    ? "bg-red-50 border-l-red-500"
    : isIncome
      ? "bg-emerald-50 border-l-emerald-500"
      : "bg-blue-50 border-l-blue-500";

  const amountColor = isExpense ? "#ef4444" : isIncome ? "#10b981" : "#3b82f6";
  const amountSign = isIncome ? "+" : "-";

  const getIcon = () => {
    switch (transaction.type) {
      case TransactionType.INCOME:
        return "trending-up";
      case TransactionType.EXPENSE:
        return "trending-down";
      case TransactionType.TRANSFER:
        return "swap-horizontal";
      default:
        return "receipt";
    }
  };

  const formatDate = () => {
    const date = new Date(transaction.date);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    }

    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const handleDelete = () => {
    setIsDeleting(true);
    deleteTranslate.value = withSpring(-300, {
      damping: 15,
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    editTranslate.value = withSpring(300, {
      damping: 15,
    });
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedDeleteStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: deleteTranslate.value }],
  }));

  const animatedEditStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: editTranslate.value }],
  }));

  const handleGestureEvent = (gestureState: GestureState | null) => {
    if (isDeleting || isEditing || !gestureState) return;

    // Detect swipe direction
    if (gestureState.translationX < -50) {
      // Swipe left - Show delete button
      translateX.value = withSpring(-120, { damping: 15 });
    } else if (gestureState.translationX > 50) {
      // Swipe right - Show edit button
      translateX.value = withSpring(120, { damping: 15 });
    }
  };

  const handleEndGesture = () => {
    if (translateX.value < -80) {
      // Delete
      if (onDelete) {
        runOnJS(onDelete)(transaction);
      }
      deleteTranslate.value = withTiming(0, { duration: 200 });
      editTranslate.value = withTiming(0, { duration: 200 });
    } else if (translateX.value > 80) {
      // Edit
      if (onEdit) {
        runOnJS(onEdit)(transaction);
      }
      deleteTranslate.value = withTiming(0, { duration: 200 });
      editTranslate.value = withTiming(0, { duration: 200 });
    } else {
      // Reset position
      translateX.value = withSpring(0);
    }
  };

  const resetPosition = () => {
    translateX.value = withSpring(0);
    deleteTranslate.value = withTiming(0, { duration: 200 });
    editTranslate.value = withTiming(0, { duration: 200 });
    setIsDeleting(false);
    setIsEditing(false);
  };

  return (
    <GestureHandlerRootView>
      <GestureDetector
        gesture={Gesture.Pan().onGestureEvent(handleGestureEvent).onEnd(handleEndGesture)}
      >
        <AnimatedView
          style={[
            containerStyle,
            "border-l-4",
            "rounded-r-lg",
            "px-4",
            "py-3",
            "shadow-sm",
            animatedContainerStyle,
          ].join(" ")}
        >
          {/* Delete Button */}
          <AnimatedPressable
            accessibilityLabel="Delete transaction"
            accessibilityRole="button"
            onPress={handleDelete}
            hitSlop={10}
            style={[
              "absolute left-0 top-0 bottom-0 w-24 bg-red-500",
              animatedDeleteStyle,
              isDeleting ? "justify-center" : "items-center",
            ]}
          >
            {isDeleting ? (
              <AnimatedText className="text-white font-medium text-sm">Delete</AnimatedText>
            ) : (
              <Ionicons name="trash-outline" size={24} color="white" />
            )}
          </AnimatedPressable>

          {/* Edit Button */}
          <AnimatedPressable
            accessibilityLabel="Edit transaction"
            accessibilityRole="button"
            onPress={handleEdit}
            hitSlop={10}
            style={[
              "absolute right-0 top-0 bottom-0 w-24 bg-blue-500",
              animatedEditStyle,
              isEditing ? "justify-center" : "items-center",
            ]}
          >
            {isEditing ? (
              <AnimatedText className="text-white font-medium text-sm">Edit</AnimatedText>
            ) : (
              <Ionicons name="create-outline" size={24} color="white" />
            )}
          </AnimatedPressable>

          <View className="flex-row items-center justify-between flex-1">
            <View className="flex-col gap-1 flex-1">
              <View className="flex-row items-center gap-2">
                <View className="rounded-full bg-muted p-2">
                  <Ionicons name={getIcon() as any} size={20} color={amountColor} />
                </View>
                <View className="flex-col gap-0.5 flex-1">
                  <AnimatedText className="text-sm font-medium text-foreground truncate">
                    {transaction.category}
                  </AnimatedText>
                  <AnimatedText className="text-xs text-muted-foreground">
                    {transaction.subcategory || transaction.description || ""}
                  </AnimatedText>
                </View>
              </View>
            </View>

            <View className="flex-col items-end gap-0.5">
              <AnimatedText className={`text-sm font-semibold tabular-nums ${amountColor}`}>
                {amountSign}
                {transaction.amount.toFixed(2)}
              </AnimatedText>
              <AnimatedText className="text-xs text-muted-foreground">{formatDate()}</AnimatedText>
            </View>
          </View>
        </AnimatedView>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

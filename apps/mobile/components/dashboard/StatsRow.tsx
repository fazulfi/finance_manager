// apps/mobile/components/dashboard/StatsRow.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedView = Animated.createAnimatedComponent(View);

interface StatCardProps {
  label: string;
  value: string;
  isPositive?: boolean;
}

const StatCard = ({ label, value, isPositive }: StatCardProps) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <View className="flex-shrink-0 w-[80%] bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
        <Text className="text-xs text-gray-500 mb-1">{label}</Text>
        <View className="flex-row items-center gap-1">
          <Ionicons
            name={isPositive ? "arrow-up" : "arrow-down"}
            size={14}
            color={isPositive ? "#10b981" : "#ef4444"}
          />
          <Text
            className={`text-lg font-bold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}
          >
            {value}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface StatsRowProps {
  stats: Array<{
    label: string;
    value: string;
    isPositive?: boolean;
  }>;
}

export function StatsRow({ stats }: StatsRowProps) {
  const screenWidth = Dimensions.get("window").width;
  const scrollViewRef = React.useRef<ScrollView>(null);

  const handleSwipe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      translateX.value = 0;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd(() => {
      if (translateX.value < -50) {
        translateX.value = withSpring(-300);
        handleSwipe();
      } else if (translateX.value > 50) {
        translateX.value = withSpring(300);
        handleSwipe();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-4 py-3"
    >
      <GestureDetector gesture={panGesture}>
        <AnimatedView className="flex-row items-center gap-3" style={animatedStyle}>
          <StatCard label="Income" value="Rp 5.2M" isPositive={true} />
          <StatCard label="Expenses" value="Rp 3.8M" isPositive={false} />
          <StatCard label="Savings" value="Rp 1.4M" isPositive={true} />
          <StatCard label="Investments" value="Rp 0.8M" isPositive={true} />
        </AnimatedView>
      </GestureDetector>
    </ScrollView>
  );
}

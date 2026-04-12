// apps/mobile/components/transactions/AmountInput.tsx
import { Ionicons } from "@expo/vector-icons";
import { cn } from "@finance/utils";
import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, TextInput, View, Text, Pressable, Keyboard } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: string;
  autoFocus?: boolean;
  className?: string;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function AmountInput({
  value,
  onChange,
  currency = "IDR",
  autoFocus = false,
  className,
}: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState("0");

  // Animate the button on tap
  const buttonScale = useSharedValue(1);
  const inputValue = useSharedValue(0);

  // Auto-format on value change
  useEffect(() => {
    const formatted = formatDisplayValue(value);
    setDisplayValue(formatted);

    // Animate the input
    inputValue.value = withTiming(formatted.length, {
      duration: 150,
    });
  }, [value]);

  const formatDisplayValue = (amount: number): string => {
    // Strip trailing zeros and decimal point if not needed
    const str = amount.toFixed(2);
    const withoutTrailingZeros = str.replace(/\.?0+$/, "");
    return withoutTrailingZeros || "0";
  };

  const formatInputValue = (text: string): string => {
    // Remove non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, "");

    // Validate decimal format (only one decimal point)
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("");
    }

    // Validate max 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + "." + parts[1].slice(0, 2);
    }

    // Validate range (0 to 999,999,999.99)
    const number = parseFloat(cleaned);
    if (number < 0) return "0";
    if (number > 999999999.99) return "999999999.99";

    return cleaned;
  };

  const parseAmount = (text: string): number => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  };

  const handleInputChange = (text: string) => {
    const formatted = formatInputValue(text);
    setDisplayValue(formatted);
    const amount = parseAmount(formatted);
    onChange(amount);
  };

  const handlePressIn = () => {
    buttonScale.value = withSequence(
      withSpring(0.9),
      withTiming(1, { duration: 100 }),
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 }),
    );
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };

  const handleClear = () => {
    setDisplayValue("0");
    onChange(0);
    Keyboard.dismiss();
  };

  const handleButtonPress = () => {
    if (displayValue === "0") {
      setDisplayValue("");
    } else {
      const amount = parseFloat(displayValue);
      onChange(amount);
    }
    Keyboard.dismiss();
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const animatedInputStyle = useAnimatedStyle(() => ({
    opacity: inputValue.value,
  }));

  return (
    <View className={cn("flex-col gap-2", className)}>
      <Text className="text-sm text-muted-foreground">Amount</Text>
      <View className="relative">
        <View className="flex-row items-center bg-muted rounded-xl px-4 py-3">
          <Text className="text-lg font-semibold text-foreground mr-2">{currency}</Text>
          <AnimatedTextInput
            style={[animatedInputStyle, { fontFamily: "Inter" }]}
            value={displayValue}
            onChangeText={handleInputChange}
            placeholder="0.00"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            autoFocus={autoFocus}
            className="flex-1 text-lg font-semibold text-foreground"
          />
        </View>

        {/* Clear Button */}
        {value > 0 && (
          <Pressable
            accessibilityLabel="Clear amount input"
            accessibilityRole="button"
            onPress={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2"
            style={animatedButtonStyle}
          >
            <Ionicons name="close-circle" size={20} color="#ef4444" />
          </Pressable>
        )}
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-2 mt-2">
        <Pressable
          accessibilityLabel="Input amount"
          accessibilityRole="button"
          onPress={handleButtonPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          className="flex-1 bg-card border-2 border-muted rounded-xl py-3 flex-row items-center justify-center gap-2"
          style={animatedButtonStyle}
        >
          <Ionicons
            name={displayValue === "0" ? "finger-print" : "arrow-up-circle"}
            size={20}
            color="#6366f1"
          />
          <Text className="text-sm font-medium text-foreground">Input</Text>
        </Pressable>
      </View>
    </View>
  );
}

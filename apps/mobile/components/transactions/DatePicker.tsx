// apps/mobile/components/transactions/DatePicker.tsx
import { Ionicons } from "@expo/vector-icons";
import { cn } from "@finance/utils";
import {
  format,
  startOfMonth,
  getDaysInMonth,
  addMonths,
  subMonths,
  isToday,
  startOfWeek,
  isSameDay,
  addDays,
} from "date-fns";
import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

interface Day {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function DatePicker({
  selectedDate,
  onDateChange,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [viewMonth, setViewMonth] = useState(startOfMonth(selectedDate));
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

  const scale = useSharedValue(1);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const generateMonthDays = useCallback((): Day[] => {
    const days: Day[] = [];
    const firstDayOfMonth = startOfMonth(viewMonth);
    const startDay = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = getDaysInMonth(viewMonth);

    // Get start of week for current view month (Monday or Sunday)
    const startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 });
    const startDayOffset = startDate.getDay(); // Adjust for weekStartsOn

    // Calculate padding days
    const paddingDays = startDay;

    for (let i = 0; i < paddingDays; i++) {
      const dayDate = addDays(startDate, i);
      days.push({
        day: dayDate.getDate(),
        date: dayDate,
        isCurrentMonth: false,
        isToday: isToday(dayDate),
        isSelected: isSameDay(dayDate, currentDate),
      });
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = addDays(firstDayOfMonth, i - 1);
      days.push({
        day: i,
        date: dayDate,
        isCurrentMonth: true,
        isToday: isToday(dayDate),
        isSelected: isSameDay(dayDate, currentDate),
      });
    }

    return days;
  }, [viewMonth, currentDate]);

  const handleMonthChange = (direction: "prev" | "next") => {
    const newDate = direction === "next" ? addMonths(viewMonth, 1) : subMonths(viewMonth, 1);
    setViewMonth(newDate);
    setViewYear(newDate.getFullYear());
  };

  const handleDayPress = (day: Day) => {
    scale.value = withSequence(withSpring(0.9), withSpring(1));
    setCurrentDate(day.date);
    onDateChange(day.date);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isOutOfRange = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isDisabled = (day: Day): boolean => {
    if (!day.isCurrentMonth) return true;
    if (minDate && day.date < minDate) return true;
    if (maxDate && day.date > maxDate) return true;
    return false;
  };

  return (
    <View className={cn("flex-col gap-3", className)}>
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          onPress={() => handleMonthChange("prev")}
          disabled={minDate !== undefined && viewMonth <= minDate}
          className="p-2 rounded-lg"
          style={minDate !== undefined && viewMonth <= minDate ? "opacity-30" : "active:opacity-70"}
        >
          <Ionicons name="chevron-back" size={24} color="#64748b" />
        </Pressable>

        <View className="flex-col items-center gap-1">
          <Text className="text-lg font-semibold text-foreground">
            {format(viewMonth, "MMMM yyyy")}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Next month"
          accessibilityRole="button"
          onPress={() => handleMonthChange("next")}
          disabled={maxDate !== undefined && viewMonth >= maxDate}
          className="p-2 rounded-lg"
          style={maxDate !== undefined && viewMonth >= maxDate ? "opacity-30" : "active:opacity-70"}
        >
          <Ionicons name="chevron-forward" size={24} color="#64748b" />
        </Pressable>
      </View>

      {/* Days of Week */}
      <View className="flex-row justify-between">
        {daysOfWeek.map((day, index) => (
          <Text
            key={day}
            className={cn("text-xs font-medium text-muted-foreground", "w-10 text-center")}
          >
            {day.substring(0, 3)}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View className="flex-col gap-2">
        {generateMonthDays().map((day) => (
          <Pressable
            key={day.day}
            accessibilityLabel={`${day.day} ${format(day.date, "MMMM dd, yyyy")}`}
            accessibilityRole="button"
            onPress={() => handleDayPress(day)}
            disabled={isDisabled(day)}
            className="w-12 h-12 rounded-xl items-center justify-center flex-col"
            style={[
              isDisabled(day) ? "opacity-30" : "active:bg-muted",
              day.isSelected ? "bg-primary active:bg-primary/80" : "bg-card",
              day.isToday && !day.isSelected ? "border-2 border-primary" : "",
            ]}
          >
            <Text
              className="text-sm font-medium"
              style={[
                day.isSelected ? "text-white" : "text-foreground",
                day.isToday && !day.isSelected ? "text-primary font-bold" : "",
              ]}
            >
              {day.day}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

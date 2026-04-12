// apps/mobile/components/dashboard/HomeDashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import { cn } from "@finance/utils";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const AnimatedView = Animated.createAnimatedComponent(View);

interface Transaction {
  id: string;
  category: string;
  amount: number;
  date: Date;
}

interface HomeDashboardProps {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  recentTransactions: Transaction[];
  className?: string;
}

export function HomeDashboard({
  balance,
  totalIncome,
  totalExpenses,
  netCashFlow,
  recentTransactions,
  className,
}: HomeDashboardProps) {
  const router = useRouter();
  const fabScale = useSharedValue(1);
  const fabRotate = useSharedValue(0);

  const isPositiveCashFlow = netCashFlow >= 0;

  const handleFabPressIn = () => {
    fabScale.value = withSequence(
      withSpring(0.9),
      withTiming(1.1, { duration: 100 }),
      withTiming(0.9, { duration: 100 }),
      withTiming(1.1, { duration: 100 }),
      withTiming(1, { duration: 100 }),
    );
    fabRotate.value = withTiming(Math.PI * 2, { duration: 300 });
  };

  const handleFabPressOut = () => {
    fabScale.value = withSpring(1);
    fabRotate.value = withSpring(0);
  };

  const handleFabPress = () => {
    router.push("/transactions/new");
  };

  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }, { rotate: `${fabRotate.value}rad` }],
  }));

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderRecentTransaction = (transaction: Transaction, index: number) => {
    return (
      <View
        key={transaction.id}
        className="flex-row items-center justify-between py-3 border-b border-muted last:border-0"
      >
        <View className="flex-row items-center gap-3 flex-1">
          <View className="rounded-full bg-muted p-2">
            <Ionicons name="receipt-outline" size={18} color="#6366f1" />
          </View>
          <View className="flex-col flex-1">
            <Text className="text-sm font-medium text-foreground">{transaction.category}</Text>
            <Text className="text-xs text-muted-foreground">
              {new Date(transaction.date).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              })}
            </Text>
          </View>
        </View>
        <Text
          className={`text-sm font-semibold tabular-nums ${
            transaction.amount >= 0 ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {transaction.amount >= 0 ? "+" : ""}
          {formatCurrency(transaction.amount)}
        </Text>
      </View>
    );
  };

  return (
    <View className={cn("flex-col gap-4", className)}>
      {/* Balance Card */}
      <AnimatedView
        entering={withTiming(1, { duration: 300 })}
        className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 shadow-lg"
      >
        <Text className="text-sm text-indigo-200 font-medium">Total Balance</Text>
        <Text className="text-3xl font-bold text-white mt-1">{formatCurrency(balance)}</Text>
        <View className="flex-row items-center gap-2 mt-4">
          <View className="flex-row items-center gap-1 bg-white/20 rounded-lg px-3 py-1.5">
            <Ionicons name="trending-up" size={14} color="white" />
            <Text className="text-xs text-white font-medium">{formatCurrency(totalIncome)}</Text>
          </View>
          <View className="flex-row items-center gap-1 bg-white/20 rounded-lg px-3 py-1.5">
            <Ionicons name="trending-down" size={14} color="white" />
            <Text className="text-xs text-white font-medium">{formatCurrency(totalExpenses)}</Text>
          </View>
        </View>
      </AnimatedView>

      {/* Net Cash Flow */}
      <View className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <Text className="text-sm text-muted-foreground font-medium">Net Cash Flow</Text>
        <View className="flex-row items-center justify-between mt-2">
          <Text
            className={`text-2xl font-bold tabular-nums ${
              isPositiveCashFlow ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {formatCurrency(netCashFlow)}
          </Text>
          <View
            className={`px-3 py-1 rounded-full ${
              isPositiveCashFlow
                ? "bg-emerald-500/20 text-emerald-500"
                : "bg-rose-500/20 text-rose-500"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                isPositiveCashFlow ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {isPositiveCashFlow ? "Inflow" : "Outflow"}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View className="flex-row gap-2">
        <View className="flex-1 bg-card rounded-xl border border-border p-4 shadow-sm">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="wallet-outline" size={20} color="#6366f1" />
            <Text className="text-sm text-muted-foreground font-medium">Income</Text>
          </View>
          <Text className="text-lg font-bold text-emerald-500 tabular-nums">
            +{formatCurrency(totalIncome)}
          </Text>
        </View>

        <View className="flex-1 bg-card rounded-xl border border-border p-4 shadow-sm">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="cash-outline" size={20} color="#ef4444" />
            <Text className="text-sm text-muted-foreground font-medium">Expenses</Text>
          </View>
          <Text className="text-lg font-bold text-rose-500 tabular-nums">
            {formatCurrency(totalExpenses)}
          </Text>
        </View>
      </View>

      {/* Recent Transactions */}
      <View className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-foreground">Recent Transactions</Text>
          <Pressable
            onPress={() => router.push("/transactions")}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <Text className="text-xs text-primary font-medium">See all</Text>
            <Ionicons name="chevron-forward" size={16} color="#6366f1" />
          </Pressable>
        </View>
        <View>
          {recentTransactions.length === 0 ? (
            <View className="flex-col items-center justify-center py-4">
              <Ionicons name="receipt-outline" size={32} color="#334155" />
              <Text className="text-xs text-muted-foreground mt-2">No transactions yet</Text>
            </View>
          ) : (
            <View>{recentTransactions.map(renderRecentTransaction)}</View>
          )}
        </View>
      </View>

      {/* FAB for Add Transaction */}
      <TouchableOpacity
        onPressIn={handleFabPressIn}
        onPressOut={handleFabPressOut}
        onPress={handleFabPress}
        className={[
          "absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full shadow-lg items-center justify-center",
          animatedFabStyle,
        ].join(" ")}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}

// apps/mobile/components/dashboard/Dashboard.tsx
import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@finance/api/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ChartCard } from "./ChartCard.js";
import { MobileBudgetProgressChart } from "./MobileBudgetProgressChart.js";
import { MobileCategoryBreakdown } from "./MobileCategoryBreakdown.js";
import { StatsRow } from "./StatsRow.js";
import { TransactionsList } from "./TransactionsList.js";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

export function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = api.dashboard.getAnalytics.useQuery({});

  // Fetch recent transactions
  const { data: recentTransactionsResult, refetch: refetchTransactions } =
    api.dashboard.getRecentTransactions.useQuery({
      limit: 15,
    });

  // Fetch quick actions
  const { data: quickActions } = api.dashboard.getQuickActions.useQuery();

  // Extract transactions array from result
  const recentTransactions = recentTransactionsResult?.items || [];

  const handleFabPress = () => {
    router.push("/transactions/new");
  };

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "Rp 0";

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleRefresh = async () => {
    await refetchTransactions();
  };

  return (
    <View className="flex-1 bg-gray-50 pt-5 pb-32">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Text className="text-2xl font-bold text-gray-900">Hello, User</Text>
        <TouchableOpacity className="w-11 h-11 rounded-full bg-white justify-center items-center shadow-sm border border-gray-200">
          <Ionicons name="notifications-outline" size={24} color="#6366d1" />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <StatsRow
        stats={[
          { label: "Income", value: formatCurrency(analytics?.totalIncome), isPositive: true },
          { label: "Expenses", value: formatCurrency(analytics?.totalExpense), isPositive: false },
          { label: "Savings", value: formatCurrency(analytics?.netCashFlow), isPositive: true },
          { label: "Investments", value: "Rp 800K", isPositive: true },
        ]}
      />

      {/* Budget Progress Chart */}
      <ChartCard title="Budget Progress" className="mb-4">
        <MobileBudgetProgressChart
          data={[
            { label: "Food", value: 1500000, status: "approaching" },
            { label: "Transport", value: 800000, status: "under" },
            { label: "Shopping", value: 2500000, status: "exceeded" },
            { label: "Entertainment", value: 500000, status: "under" },
            { label: "Utilities", value: 1200000, status: "under" },
          ]}
        />
      </ChartCard>

      {/* Category Breakdown */}
      <ChartCard title="Category Breakdown" className="mb-4">
        <MobileCategoryBreakdown
          data={[
            { label: "Food", value: 3500000, color: "#10b981" },
            { label: "Transport", value: 1800000, color: "#f59e0b" },
            { label: "Shopping", value: 3200000, color: "#ef4444" },
            { label: "Entertainment", value: 900000, color: "#8b5cf6" },
            { label: "Utilities", value: 2000000, color: "#3b82f6" },
          ]}
        />
      </ChartCard>

      {/* Recent Transactions */}
      <ChartCard title="Recent Transactions" className="mb-4">
        <TransactionsList transactions={recentTransactions || []} onRefresh={handleRefresh} />
      </ChartCard>

      {/* Category Breakdown */}
      <ChartCard title="Category Breakdown" className="mb-4">
        <MobileCategoryBreakdown
          data={[
            { label: "Food", value: 3500000, color: "#10b981" },
            { label: "Transport", value: 1800000, color: "#f59e0b" },
            { label: "Shopping", value: 3200000, color: "#ef4444" },
            { label: "Entertainment", value: 900000, color: "#8b5cf6" },
            { label: "Utilities", value: 2000000, color: "#3b82f6" },
          ]}
        />
      </ChartCard>

      {/* Recent Transactions */}
      <ChartCard title="Recent Transactions" className="mb-4">
        <TransactionsList transactions={recentTransactions || []} onRefresh={handleRefresh} />
      </ChartCard>

      {/* FAB for Add Transaction */}
      <TouchableOpacity
        onPress={handleFabPress}
        activeOpacity={0.8}
        className="absolute bottom-[24px] right-[24px] w-14 h-14 rounded-full bg-indigo-600 justify-center items-center shadow-lg shadow-indigo-200"
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}

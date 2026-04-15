// apps/mobile/components/dashboard/TransactionsList.tsx
import { Ionicons } from "@expo/vector-icons";
import type { Transaction } from "@finance/types";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

interface TransactionItemProps {
  transaction: Transaction;
  index: number;
}

const TransactionItem = ({ transaction, index }: TransactionItemProps) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isExpense = transaction.amount < 0;

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 100)} className="mb-3">
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <View className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="w-9 h-9 rounded-xl bg-gray-100 justify-center items-center">
              <Ionicons
                name={isExpense ? "arrow-down" : "arrow-up"}
                size={18}
                color={isExpense ? "#ef4444" : "#10b981"}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">{transaction.category}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {new Date(transaction.date).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text
              className={`text-sm font-semibold ${isExpense ? "text-rose-500" : "text-emerald-500"}`}
            >
              {isExpense ? "-" : "+"}
              {formatCurrency(Math.abs(transaction.amount))}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface TransactionsListProps {
  transactions: any[]; // Will be cast to Transaction type internally
  onRefresh?: () => Promise<void>;
}

export function TransactionsList({ transactions, onRefresh }: TransactionsListProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [animating, setAnimating] = useState(false);

  const onRefreshHandler = async () => {
    if (onRefresh) {
      setRefreshing(true);
      setAnimating(true);

      await onRefresh();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      setRefreshing(false);
      setAnimating(false);
    }
  };

  const formattedTransactions = (transactions.slice(0, 15) as Transaction[]).map((t) => ({
    ...t,
    id: typeof t.id === "string" ? t.id : JSON.stringify(t.id),
    category: t.category || "General",
    amount: typeof t.amount === "number" ? t.amount : 0,
    date: new Date(t.date || Date.now()),
  }));

  const renderItem = ({ item, index }: { item: Transaction; index: number }) => (
    <TransactionItem transaction={item} index={index} />
  );

  return (
    <View className="bg-white rounded-2xl my-2">
      {formattedTransactions.length === 0 ? (
        <View className="items-center justify-center py-12">
          <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
          <Text className="text-sm text-gray-500 mt-3 font-medium">No transactions</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={formattedTransactions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={!animating}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefreshHandler}
              tintColor="#6366d1"
            />
          }
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

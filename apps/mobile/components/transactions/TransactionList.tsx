// apps/mobile/components/transactions/TransactionList.tsx
import { Ionicons } from "@expo/vector-icons";
import type { Transaction } from "@finance/types";
import { cn } from "@finance/utils";
import React, { useState, useCallback, useLayoutEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, FlatList } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

import { useTransactionSync } from "../../hooks/useTransactionSync";

import { TransactionItem } from "./TransactionItem";

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  onRefresh: () => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  onSwipeRight?: (transaction: Transaction) => void;
  onSwipeLeft?: (transaction: Transaction) => void;
  className?: string;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Transaction>);

export function TransactionList({
  transactions,
  isLoading,
  onRefresh,
  onEdit,
  onDelete,
  onSwipeRight,
  onSwipeLeft,
  className,
}: TransactionListProps) {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { syncStatus, triggerSync, retrySync } = useTransactionSync();

  const [fabY, setFabY] = useState(0);

  // Get FAB position using useLayoutEffect
  useLayoutEffect(() => {
    // We'll handle FAB positioning in parent component
    // This is a placeholder for when we need dynamic positioning
  }, []);

  const renderTransactionItem = useCallback(
    ({ item }: { item: Transaction }) => {
      return (
        <TransactionItem
          transaction={item}
          {...(onEdit && { onEdit })}
          {...(onDelete && { onDelete })}
          {...(onSwipeRight && { onSwipeRight })}
          {...(onSwipeLeft && { onSwipeLeft })}
        />
      );
    },
    [onEdit, onDelete, onSwipeRight, onSwipeLeft],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    await onRefresh();
    setIsRefreshing(false);
  }, [onRefresh]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [isLoading, hasMore]);

  const handleEndReached = useCallback(() => {
    // Only trigger load more if we have more data and aren't syncing
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [isLoading, hasMore]);

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: fabY }],
  }));

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => {
      return (
        <View>
          <TransactionItem
            transaction={item}
            {...(onEdit && { onEdit })}
            {...(onDelete && { onDelete })}
            {...(onSwipeRight && { onSwipeRight })}
            {...(onSwipeLeft && { onSwipeLeft })}
          />
        </View>
      );
    },
    [onEdit, onDelete, onSwipeRight, onSwipeLeft],
  );

  return (
    <View className={cn("flex-col gap-2", className)}>
      {/* Sync Status Indicator */}
      {syncStatus.pendingCount > 0 && (
        <TouchableOpacity
          onPress={() => (syncStatus.isOnline ? triggerSync() : retrySync())}
          className="flex-row items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 active:bg-amber-100"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons
              name={syncStatus.isOnline ? "cloud-circle" : "cloud-offline"}
              size={20}
              color="#f59e0b"
            />
            <Text className="text-sm text-amber-900 font-medium">
              {syncStatus.pendingCount} transaction{syncStatus.pendingCount > 1 ? "s" : ""} pending
              sync
            </Text>
          </View>
          {syncStatus.isOnline ? (
            <Text className="text-xs text-amber-700">Tap to sync</Text>
          ) : (
            <Ionicons name="refresh" size={16} color="#f59e0b" />
          )}
        </TouchableOpacity>
      )}

      {/* Transactions List */}
      <AnimatedFlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onRefresh={handleRefresh}
        refreshing={isRefreshing || isLoading}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-24"
      />

      {/* Loading Indicator */}
      {isLoading && !isRefreshing && (
        <View className="py-8">
          <View className="flex-row justify-center gap-2">
            <View className="w-2 h-2 bg-muted rounded-full animate-pulse" />
            <View className="w-2 h-2 bg-muted rounded-full animate-pulse delay-75" />
            <View className="w-2 h-2 bg-muted rounded-full animate-pulse delay-150" />
          </View>
        </View>
      )}

      {/* Empty State */}
      {transactions.length === 0 && !isLoading && (
        <View className="flex-col items-center justify-center py-16">
          <Ionicons name="document-text-outline" size={64} color="#334155" />
          <Text className="text-lg text-foreground font-medium mt-4">No transactions yet</Text>
          <Text className="text-sm text-muted-foreground mt-2 text-center px-8">
            Start by adding your first transaction
          </Text>
        </View>
      )}

      {/* Sync Status in Header */}
      {syncStatus.pendingCount > 0 && transactions.length === 0 && !isLoading && (
        <View className="flex-row items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="cloud-circle" size={20} color="#f59e0b" />
            <Text className="text-sm text-amber-900 font-medium">
              {syncStatus.pendingCount} transaction{syncStatus.pendingCount > 1 ? "s" : ""} pending
              sync
            </Text>
          </View>
          <Text className="text-xs text-amber-700">Tap to sync</Text>
        </View>
      )}
    </View>
  );
}

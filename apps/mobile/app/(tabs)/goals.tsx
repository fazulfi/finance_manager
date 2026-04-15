"use client";

import { Ionicons } from "@expo/vector-icons";
import { api } from "@finance/api/react";
import { cn } from "@finance/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { View, Text, FlatList, RefreshControl, SafeAreaView } from "react-native";

import { ContributeSheet } from "../../components/goals/ContributeSheet.js";
import { GoalCard } from "../../components/goals/GoalCard.js";

export default function GoalsScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  // Fetch goals list
  const {
    data: goalsResult,
    isLoading,
    isError,
    error,
    refetch,
  } = api.goal.list.useQuery({
    page: 1,
    limit: 50,
  });

  // Contribute mutation
  const contributeMutation = api.goal.contribute.useMutation({
    onSuccess: () => {
      // Invalidate and refetch goals after successful contribution
      queryClient.invalidateQueries({ queryKey: ["goals", "list"] });
    },
  });

  const goals = goalsResult?.items || [];

  const handleContribute = (goal: any) => {
    setSelectedGoal(goal);
  };

  const handleContributeSubmit = (amount: number) => {
    if (selectedGoal) {
      contributeMutation.mutate({
        id: selectedGoal.id,
        amount,
      });
      setSelectedGoal(null);
    }
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const renderGoalItem = ({ item }: { item: any }) => (
    <GoalCard goal={item} onContribute={handleContribute} />
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <View className="bg-muted/50 rounded-full p-6 mb-4">
        <Ionicons name="flag-outline" size={48} color="#64748b" />
      </View>
      <Text className="text-xl font-semibold text-foreground mb-2">No Goals Yet</Text>
      <Text className="text-center text-muted-foreground text-sm mb-6">
        Start saving for your dreams by creating your first savings goal
      </Text>
      <View className="w-full bg-primary/10 rounded-2xl p-6 border border-primary/20">
        <Text className="text-sm text-muted-foreground text-center">
          Swipe any card to the left to contribute
        </Text>
      </View>
    </View>
  );

  const renderLoadingState = () => (
    <View className="flex-1 items-center justify-center bg-background">
      <View className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-primary animate-spin mb-4" />
      <Text className="text-sm text-muted-foreground">Loading goals...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <View className="bg-red-50 rounded-full p-6 mb-4">
        <Ionicons name="warning-outline" size={48} color="#ef4444" />
      </View>
      <Text className="text-xl font-semibold text-foreground mb-2">Something went wrong</Text>
      <Text className="text-center text-muted-foreground text-sm mb-6">
        {error instanceof Error ? error.message : "Unable to load goals. Please try again."}
      </Text>
      <View className="w-full bg-primary rounded-xl p-4">
        <Text onPress={handleRefresh} className="text-white text-center text-sm font-medium">
          Try Again
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-5 pb-3">
        <Text className="text-2xl font-bold text-foreground mb-1">Goals</Text>
        <Text className="text-sm text-muted-foreground">
          {goals.length} savings goal{goals.length !== 1 ? "s" : ""} active
        </Text>
      </View>

      {/* Goals List */}
      <FlatList
        data={goals}
        renderItem={renderGoalItem}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={["#6366f1"]}
          />
        }
        ListEmptyComponent={!isLoading && !isError ? renderEmptyState() : null}
        ListFooterComponent={
          isLoading && goals.length === 0 ? (
            <View className="py-8">
              <View className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-primary animate-spin mx-auto" />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Contribute Sheet */}
      {selectedGoal && (
        <ContributeSheet
          visible={!!selectedGoal}
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onContribute={handleContributeSubmit}
          onSubmitting={(isSubmitting) => {
            // Show/hide modal based on loading state
            if (!isSubmitting) {
              setSelectedGoal(null);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

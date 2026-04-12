import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ProjectProgress } from "../components/projects/ProjectProgress";
import { api } from "../utils/trpc";

type ProjectStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getCompletionCue(status: ProjectStatus, progressPercent: number) {
  if (status === "COMPLETED") {
    return { text: "Project completed", color: "#10b981", icon: "checkmark-circle" as const };
  }

  if (status === "CANCELLED") {
    return { text: "Project cancelled", color: "#64748b", icon: "close-circle" as const };
  }

  if (status === "PAUSED") {
    return { text: "Project paused", color: "#f59e0b", icon: "pause-circle" as const };
  }

  if (progressPercent >= 100) {
    return { text: "Budget exceeded", color: "#f43f5e", icon: "alert-circle" as const };
  }

  if (progressPercent >= 80) {
    return { text: "Nearing budget limit", color: "#f59e0b", icon: "warning" as const };
  }

  return { text: "On track", color: "#3b82f6", icon: "trending-up" as const };
}

function ProjectsSkeleton() {
  return (
    <View style={styles.page}>
      <View className="px-4 py-5 gap-3">
        {[...Array(3)].map((_, index) => (
          <View
            key={`project-skeleton-${index}`}
            className="h-40 rounded-2xl bg-muted border border-border opacity-50 animate-pulse"
          />
        ))}
      </View>
    </View>
  );
}

export default function ProjectsScreen() {
  const { data, error, isLoading, refetch, isRefetching } = api.project.list.useQuery({
    page: 1,
    limit: 50,
  });

  if (isLoading || !data) {
    return <ProjectsSkeleton />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={44} color="#f43f5e" />
        <Text style={styles.errorTitle}>Failed to load projects</Text>
        <Text style={styles.errorSubtext}>{error.message || "Please try again."}</Text>
        <Pressable className="mt-4 px-4 py-2 rounded-lg bg-primary" onPress={() => refetch()}>
          <Text className="text-white font-medium">Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (data.items.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="folder-open-outline" size={48} color="#94a3b8" />
        <Text style={styles.emptyTitle}>No projects yet</Text>
        <Text style={styles.errorSubtext}>Create your first project to track budget progress.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.contentContainer}>
      <View className="px-4 py-5 gap-3">
        {data.items.map((project) => {
          const status = project.status as ProjectStatus;
          const budget = project.budget ?? 0;
          const spent = project.spent ?? 0;
          const progressPercent = budget > 0 ? (spent / budget) * 100 : 0;
          const cue = getCompletionCue(status, progressPercent);

          return (
            <View key={project.id} className="rounded-2xl bg-card border border-border p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                    {project.name}
                  </Text>
                  {project.description ? (
                    <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={2}>
                      {project.description}
                    </Text>
                  ) : null}
                </View>

                <View className="px-2 py-1 rounded-full bg-muted">
                  <Text className="text-[10px] font-semibold text-muted-foreground">{status}</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <ProjectProgress
                  status={status}
                  percentage={progressPercent}
                  spent={spent}
                  budget={budget}
                />

                <View className="flex-1 ml-4 gap-2">
                  <View>
                    <Text className="text-[11px] text-muted-foreground uppercase">Spent</Text>
                    <Text className="text-sm font-semibold text-rose-500">
                      {formatCurrency(spent)}
                    </Text>
                  </View>

                  <View>
                    <Text className="text-[11px] text-muted-foreground uppercase">Budget</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {budget > 0 ? formatCurrency(budget) : "Not set"}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-1">
                    <Ionicons name={cue.icon} size={14} color={cue.color} />
                    <Text style={{ color: cue.color }} className="text-xs font-medium">
                      {cue.text}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {isRefetching ? (
          <Text className="text-xs text-muted-foreground text-center pt-1">
            Refreshing projects...
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  contentContainer: {
    paddingBottom: 28,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  errorTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  errorSubtext: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
  },
});

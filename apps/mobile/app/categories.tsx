// apps/mobile/app/categories.tsx
import { Suspense } from "react";
import { View, Text, StyleSheet } from "react-native";
import { api } from "../utils/trpc";
import { CategoryGrid } from "../components/categories/CategoryGrid";
// Skeleton component for loading state
function CategoryGridSkeleton() {
  return (
    <View style={styles.container}>
      <View className="flex-col gap-4">
        {[...Array(6)].map((_, i) => (
          <View
            key={`skeleton-${i}`}
            className="w-36 h-32 rounded-2xl bg-muted border border-border opacity-50 animate-pulse"
          />
        ))}
      </View>
    </View>
  );
}

// Error fallback component
function CategoryGridError({
  error,
}: {
  error: { message?: string };
}) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Failed to load categories</Text>
      <Text style={styles.errorSubtext}>{error.message || "Please try again later"}</Text>
    </View>
  );
}

function CategoryGridContent() {
  // Server-side tRPC call for expense categories
  const { data, error, isLoading } = api.category.list.useQuery({
    type: "EXPENSE",
    limit: 50,
  });

  if (error) {
    return <CategoryGridError error={error} />;
  }

  if (isLoading || !data) {
    return <CategoryGridSkeleton />;
  }

  return (
    <View style={styles.container}>
      <View className="flex-col gap-4">
        <CategoryGrid
          categories={data.items as any}
          onCategoryPress={(category) => {
            console.log("Category pressed:", category.name);
            // TODO: Navigate to category detail page
          }}
          onDelete={(category) => {
            console.log("Delete category:", category.name);
            // TODO: Implement delete functionality
          }}
        />
      </View>
    </View>
  );
}

export default function CategoriesScreen() {
  return (
    <View style={styles.container}>
      <Suspense fallback={<CategoryGridSkeleton />}>
        <CategoryGridContent />
      </Suspense>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a", // background color
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    color: "#f8fafc", // foreground color
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtext: {
    color: "#94a3b8", // muted-foreground color
    fontSize: 14,
    textAlign: "center",
  },
});

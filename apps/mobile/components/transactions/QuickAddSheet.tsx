// apps/mobile/components/transactions/QuickAddSheet.tsx
import { Ionicons } from "@expo/vector-icons";
import { transactionFormSchema, TransactionType } from "@finance/types";
import { cn } from "@finance/utils";
import React, { useState } from "react";
import { Alert, View, Text, Pressable, KeyboardAvoidingView, Platform, TextInput } from "react-native";

import { api } from "../../utils/trpc";


import { AmountInput } from "./AmountInput";
import { CategoryPicker } from "./CategoryPicker";


interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: "1", name: "Food", type: TransactionType.EXPENSE, icon: "Food", color: "#f59e0b" },
  {
    id: "2",
    name: "Transport",
    type: TransactionType.EXPENSE,
    icon: "Transport",
    color: "#6366f1",
  },
  { id: "3", name: "Shopping", type: TransactionType.EXPENSE, icon: "Shopping", color: "#ec4899" },
  { id: "4", name: "Bills", type: TransactionType.EXPENSE, icon: "Bills", color: "#06b6d4" },
  {
    id: "5",
    name: "Entertainment",
    type: TransactionType.EXPENSE,
    icon: "Entertainment",
    color: "#8b5cf6",
  },
  { id: "6", name: "Health", type: TransactionType.EXPENSE, icon: "Health", color: "#ef4444" },
  { id: "7", name: "Salary", type: TransactionType.INCOME, icon: "Salary", color: "#10b981" },
  {
    id: "8",
    name: "Investment",
    type: TransactionType.INCOME,
    icon: "Investment",
    color: "#14b8a6",
  },
  { id: "9", name: "Transfer", type: TransactionType.TRANSFER, icon: "Transfer", color: "#64748b" },
];

export function QuickAddSheet({ open, onOpenChange, onSuccess }: QuickAddSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [accountId, setAccountId] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [date, setDate] = useState(new Date());
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [project, setProject] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringRule, setRecurringRule] = useState("");

  // Fetch accounts
  const { data: accountsData } = api.account.list.useQuery({ page: 1, limit: 100, isActive: true });

  // Create transaction mutation
  const createTransaction = api.transaction.create.useMutation({
    onSuccess: () => {
      Alert.alert("Transaction created", "Your transaction has been added successfully");
      onSuccess?.();
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Transaction creation error:", error);
      Alert.alert("Error", error.message || "Failed to create transaction. Please try again.");
    },
  });

  const resetForm = () => {
    setAmount(0);
    setType(TransactionType.EXPENSE);
    setCategory(null);
    setSubcategory("");
    setProject("");
    setTags([]);
    setDescription("");
    setTransferTo("");
    setIsRecurring(false);
    setRecurringRule("");
    setAccountId(accountsData?.items[0]?.id || "");
    setDate(new Date());
  };

  const handleSubmit = async () => {
    try {
      // Zod validation
      const validationResult = transactionFormSchema.safeParse({
        accountId,
        date,
        amount,
        currency,
        type,
        category: category?.name || "",
        subcategory: subcategory || undefined,
        project: project || undefined,
        tags: tags || undefined,
        description: description || undefined,
        transferTo: transferTo || undefined,
        isRecurring,
        recurringRule: recurringRule || undefined,
      });

      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message ?? "Validation error";
        Alert.alert("Validation error", errorMessage);
        return;
      }

      setIsSubmitting(true);

      // Create transaction
      await createTransaction.mutateAsync(validationResult.data as any);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-border bg-card">
        <Pressable onPress={() => onOpenChange(false)}>
          <Text className="text-lg font-semibold text-foreground">Add Transaction</Text>
        </Pressable>
        <View
          className={cn(
            "px-3 py-1 rounded-lg",
            type === TransactionType.INCOME
              ? "bg-emerald-500/20"
              : type === TransactionType.EXPENSE
                ? "bg-rose-500/20"
                : "bg-blue-500/20",
          )}
        >
          <Text
            className={cn(
              "text-sm font-medium",
              type === TransactionType.INCOME
                ? "text-emerald-500"
                : type === TransactionType.EXPENSE
                  ? "text-rose-500"
                  : "text-blue-500",
            )}
          >
            {type === TransactionType.INCOME ? "Income" : type === TransactionType.EXPENSE ? "Expense" : "Transfer"}
          </Text>
        </View>
      </View>

      <View className="flex-1 p-4">
        {/* Amount */}
        <AmountInput
          value={amount}
          onChange={setAmount}
          currency={currency}
          autoFocus
          className="mb-4"
        />

        {/* Type */}
        <View className="flex-row gap-2 mb-4">
          {([TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.TRANSFER]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              className={cn(
                "flex-1 py-3 rounded-xl border-2",
                type === t ? "border-primary bg-primary/10" : "border-muted bg-card",
              )}
            >
              <Text
                className={cn(
                  "text-center font-medium text-sm",
                  type === t ? "text-primary" : "text-foreground",
                )}
              >
                {t === TransactionType.INCOME ? "Income" : t === TransactionType.EXPENSE ? "Expense" : "Transfer"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Date */}
        <View className="mb-4">
          <Text className="text-sm text-muted-foreground mb-2">Date</Text>
          <Pressable
            onPress={() => {
              /* TODO: Open date picker */
            }}
            className="flex-row items-center bg-muted rounded-xl px-4 py-3"
          >
            <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
            <Text className="ml-3 text-sm text-foreground">
              {date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </Pressable>
        </View>

        {/* Category Picker */}
        <View className="mb-4">
          <Text className="text-sm text-muted-foreground mb-2">Category</Text>
          <CategoryPicker
            categories={CATEGORIES}
            selectedCategory={category}
            onCategorySelect={setCategory}
            transactionType={type}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            className="mb-2"
          />
        </View>

        {/* Account */}
        <View className="mb-4">
          <Text className="text-sm text-muted-foreground mb-2">Account</Text>
          <View className="bg-muted rounded-xl px-4 py-3">
            <Text className="text-sm text-foreground">
              {accountsData?.items.find((a) => a.id === accountId)?.name || "Select account"}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-sm text-muted-foreground mb-2">Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add a description..."
            placeholderTextColor="#94a3b8"
            className="bg-muted rounded-xl px-4 py-3 text-sm text-foreground"
            style={{ fontFamily: "Inter" }}
          />
        </View>

        {/* Recurring */}
        <View className="flex-row items-center justify-between p-4 bg-muted rounded-xl mb-4">
          <View className="flex-col gap-0.5">
            <Text className="text-sm font-medium text-foreground">Recurring</Text>
            <Text className="text-xs text-muted-foreground">Mark this as recurring</Text>
          </View>
          <Pressable
            onPress={() => setIsRecurring(!isRecurring)}
            className={cn(
              "w-12 h-7 rounded-full border-2 p-1",
              isRecurring ? "border-primary bg-primary" : "border-muted bg-card",
            )}
          >
            <View
              className={cn(
                "w-5 h-5 rounded-full bg-white shadow-sm",
                isRecurring ? "translate-x-5" : "translate-x-0",
              )}
            />
          </Pressable>
        </View>

        {isRecurring && (
          <View className="mb-4">
            <Text className="text-sm text-muted-foreground mb-2">Recurring Rule (optional)</Text>
            <TextInput
              value={recurringRule}
              onChangeText={setRecurringRule}
              placeholder="e.g., Monthly, Every Monday"
              placeholderTextColor="#94a3b8"
              className="bg-muted rounded-xl px-4 py-3 text-sm text-foreground"
              style={{ fontFamily: "Inter" }}
            />
          </View>
        )}

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting || !category || amount <= 0}
          className="w-full py-4 rounded-xl text-white font-semibold mb-4 bg-primary active:bg-primary/80"
        >
          {isSubmitting ? "Creating..." : "Add Transaction"}
        </Pressable>

        {/* Cancel Button */}
        <Pressable
          onPress={() => onOpenChange(false)}
          accessibilityLabel="Cancel adding transaction"
          accessibilityRole="button"
          className="w-full py-4 rounded-xl border-2 border-muted text-foreground font-semibold"
        >
          Cancel
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

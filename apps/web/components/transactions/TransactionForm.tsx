// apps/web/components/transactions/TransactionForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { transactionRouter } from "@finance/api";
import { useToast } from "@finance/ui";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@finance/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@finance/ui";
import { Button } from "@finance/ui";
import { Input } from "@finance/ui";
import { Textarea } from "@finance/ui";
import { Label } from "@finance/ui";
import { Switch } from "@finance/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@finance/ui";
import { useState, useEffect } from "react";
import { Calendar, Tag, Plus, X } from "lucide-react";
import { transactionTypeEnum, currencyEnum, TransactionType } from "@finance/types";

// Form validation schema with proper Zod type transformation
type Currency = "IDR" | "USD" | "EUR" | "SGD" | "JPY" | "CNY" | "AUD" | "CAD";

const transactionFormSchema = z.object({
  accountId: z.object({
    value: z.string(),
    label: z.string(),
  }),
  date: z.string(),
  amount: z.number().positive(),
  currency: currencyEnum,
  type: transactionTypeEnum,
  category: z.string().min(1),
  subcategory: z.string().max(100).nullable().optional(),
  project: z.string().max(100).nullable().optional(),
  tags: z.array(z.string()).default([]),
  description: z.string().max(500).nullable().optional(),
  transferTo: z
    .object({
      value: z.string(),
      label: z.string(),
    })
    .nullable()
    .optional(),
  isRecurring: z.boolean().default(false),
  recurringRule: z.string().max(200).nullable().optional(),
} satisfies z.ZodType<TransactionFormValues>);

type TransactionFormValues = {
  accountId: { value: string; label: string };
  date: string;
  amount: number;
  currency: "IDR" | "USD" | "EUR" | "SGD" | "JPY" | "CNY" | "AUD" | "CAD";
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  category: string;
  subcategory?: string;
  project?: string;
  tags?: string[];
  description?: string;
  transferTo?: { value: string; label: string };
  isRecurring?: boolean;
  recurringRule?: string;
};

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  initialValues?: TransactionFormValues;
  compact?: boolean;
}

export function TransactionForm({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  compact = false,
}: TransactionFormProps): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>(
    [],
  );

  const isSubmitting = form.formState.isSubmitting;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      accountId: initialValues?.accountId,
      date: initialValues?.date || new Date().toISOString(),
      amount: initialValues?.amount || 0,
      currency: initialValues?.currency || "IDR",
      type: initialValues?.type || "EXPENSE",
      category: initialValues?.category || "",
      subcategory: initialValues?.subcategory,
      project: initialValues?.project,
      tags: initialValues?.tags || [],
      description: initialValues?.description,
      transferTo: initialValues?.transferTo,
      isRecurring: initialValues?.isRecurring || false,
      recurringRule: initialValues?.recurringRule,
    },
  });

  useEffect(() => {
    if (open) {
      fetchAccounts();
      fetchCategories();
    }
  }, [open]);

  async function fetchAccounts() {
    try {
      const api = transactionRouter.createCaller({ headers: new Headers() });
      const result = await api.list({ page: 1, limit: 100, isActive: true });
      setAccounts(result.items);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  }

  async function fetchCategories() {
    try {
      const api = transactionRouter.createCaller({ headers: new Headers() });
      const result = await api.list({ page: 1, limit: 100, type: "EXPENSE" });
      setCategories(result.items);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }

  const handleSubmit = async (values: TransactionFormValues) => {
    try {
      await onSubmit(values);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={compact ? "max-w-2xl h-[90vh] overflow-y-auto" : "max-w-2xl"}>
        <DialogHeader>
          <DialogTitle>{initialValues ? "Edit transaction" : "Add transaction"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Account */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const account = accounts.find((a) => a.id === value);
                      field.onChange(
                        account ? { value, label: account.name } : { value, label: "" },
                      );
                    }}
                    value={field.value?.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type and Amount */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {transactionTypeEnum.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Currency */}
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencyEnum.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={field.value.replace("T", " ").slice(0, 16)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category" {...field} />
                  </FormControl>
                  <FormDescription>
                    Use the auto-complete to select from existing categories
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subcategory */}
            <FormField
              control={form.control}
              name="subcategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategory (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Grocery shopping" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project */}
            <FormField
              control={form.control}
              name="project"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Home renovation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="Add tag and press Enter"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const tags = form.getValues("tags") || [];
                            if (field.value && !tags.includes(field.value)) {
                              form.setValue("tags", [...tags, field.value]);
                              field.onChange("");
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.setValue("tags", [])}
                    >
                      Clear
                    </Button>
                  </div>
                  {field.value && field.value.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.value.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const tags = form.getValues("tags") || [];
                              form.setValue(
                                "tags",
                                tags.filter((_, i) => i !== index),
                              );
                            }}
                            className="hover:text-blue-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add a description..." {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Transfer To */}
            {form.watch("type") === "TRANSFER" && (
              <FormField
                control={form.control}
                name="transferTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer to account (optional)</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const account = accounts.find((a) => a.id === value);
                        field.onChange(account ? { value, label: account.name } : undefined);
                      }}
                      value={field.value?.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts
                          .filter((account) => account.id !== form.watch("accountId")?.value)
                          .map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Recurring */}
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Recurring transaction</FormLabel>
                    <FormDescription>
                      Mark this as a recurring transaction that will repeat automatically
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("isRecurring") && (
              <FormField
                control={form.control}
                name="recurringRule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurring rule (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Monthly, Every Monday" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                {isSubmitting ? "Saving..." : initialValues ? "Save changes" : "Add transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

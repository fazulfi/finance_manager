"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@finance/api/react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  buttonVariants,
} from "@finance/ui";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

const budgetFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  type: z.enum(["MONTHLY", "ANNUAL", "CUSTOM"]),
  period: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  startDate: z.date(),
  endDate: z.date().optional(),
  items: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        name: z.string().min(1).max(200),
        budgeted: z.number().positive(),
      }),
    )
    .max(50, "Maximum 50 budget items allowed")
    .default([]),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface BudgetItem {
  categoryId: string;
  name: string;
  budgeted: number;
}

interface BudgetFormProps {
  mode?: "create" | "update";
  budget?: {
    id: string;
    name: string;
    type: BudgetFormValues["type"];
    period: BudgetFormValues["period"];
    startDate: Date;
    endDate?: Date;
    items: BudgetItem[];
  };
  onSubmit: (data: BudgetFormValues) => Promise<void>;
  onCancel: () => void;
}

export function BudgetForm({
  mode = "create",
  budget,
  onSubmit,
  onCancel,
}: BudgetFormProps): React.JSX.Element {
  const router = useRouter();
  const utils = api.useContext();

  const createBudget = api.budget.create.useMutation({
    onSuccess: async (created) => {
      toast({ title: "Budget created", description: `${created.name} is ready to use.` });
      await utils.budget.list.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Failed to create budget",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBudget = api.budget.update.useMutation({
    onSuccess: async () => {
      toast({ title: "Budget updated", description: "Your changes were saved." });
      if (budget) {
        await utils.budget.getById.invalidate({ id: budget.id });
      }
      await utils.budget.list.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Failed to update budget",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isSubmitting = createBudget.isLoading || updateBudget.isLoading;
  const submitError = createBudget.error?.message ?? updateBudget.error?.message;

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: budget?.name ?? "",
      type: (budget?.type as BudgetFormValues["type"]) ?? "MONTHLY",
      period: (budget?.period as BudgetFormValues["period"]) ?? "MONTHLY",
      startDate: budget?.startDate ?? new Date(),
      endDate: budget?.endDate ?? undefined,
      items: budget?.items ?? [],
    },
  });

  const onSubmitForm = async (values: BudgetFormValues) => {
    try {
      if (mode === "update" && budget) {
        await updateBudget.mutateAsync({
          id: budget.id,
          name: values.name,
          type: values.type,
          period: values.period,
          startDate: values.startDate,
          endDate: values.endDate,
          items: values.items,
        });
      } else {
        await createBudget.mutateAsync(values);
      }
      await onSubmit(values);
    } catch (error) {
      console.error("Budget form submission error:", error);
    }
  };

  const handleCancel = () => {
    form.reset();
    onCancel();
  };

  // Get period fields based on type
  const budgetType = form.watch("type");
  const budgetPeriod = form.watch("period");

  // Calculate budget summary
  const totalBudgeted = form.watch("items").reduce((sum, item) => sum + item.budgeted, 0);

  const addItem = () => {
    const items = form.getValues("items");
    if (items.length >= 50) {
      toast({
        title: "Maximum items reached",
        description: "You can add up to 50 budget items",
        variant: "destructive",
      });
      return;
    }
    form.setValue("items", [...items, { categoryId: "", name: "", budgeted: 0 }]);
  };

  const removeItem = (index: number) => {
    const items = form.getValues("items");
    if (items.length > 0) {
      form.setValue(
        "items",
        items.filter((_, i) => i !== index),
      );
    }
  };

  const updateItem = (index: number, field: keyof BudgetItem, value: string | number) => {
    const items = form.getValues("items");
    const updatedItems = [...items];
    const existing = updatedItems[index];
    if (existing) {
      updatedItems[index] = { ...existing, [field]: value };
      form.setValue("items", updatedItems);
    }
  };

  return (
    <Dialog open onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create budget" : "Edit budget"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmitForm)} noValidate>
          {submitError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-1.5">
            <Label htmlFor="budget-name">Name *</Label>
            <Input
              id="budget-name"
              {...form.register("name")}
              disabled={isSubmitting}
              placeholder="e.g., Monthly Living Expenses"
            />
            {form.formState.errors.name && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="budget-type">Type *</Label>
              <Select
                value={budgetType}
                onValueChange={(value) => form.setValue("type", value as BudgetFormValues["type"])}
                disabled={isSubmitting}
              >
                <SelectTrigger id="budget-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budget-period">Period *</Label>
              <Select
                value={budgetPeriod}
                onValueChange={(value) =>
                  form.setValue("period", value as BudgetFormValues["period"])
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="budget-period">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-1.5">
            <Label htmlFor="budget-start-date">Start Date *</Label>
            <input
              id="budget-start-date"
              type="date"
              {...form.register("startDate", { valueAsDate: true })}
              disabled={isSubmitting}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {form.formState.errors.startDate && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.startDate.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget-end-date">End Date (optional)</Label>
            <input
              id="budget-end-date"
              type="date"
              {...form.register("endDate", { valueAsDate: true })}
              disabled={isSubmitting}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Budget Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Budget Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                disabled={isSubmitting || form.getValues("items").length >= 50}
                className="gap-1.5"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M5 12h14"></path>
                  <path d="M12 5v14"></path>
                </svg>
                Add Item
              </Button>
            </div>

            {form.getValues("items").length === 0 && (
              <p className="text-sm text-muted-foreground">
                Add items to define your budget allocation
              </p>
            )}

            <div className="space-y-3">
              {form.getValues("items").map((item, index) => (
                <div key={index} className="flex flex-col gap-2 rounded-lg border bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Item #{index + 1}
                    </span>
                    {form.getValues("items").length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={isSubmitting}
                        className="text-xs text-destructive hover:text-destructive/80"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`item-name-${index}`} className="text-xs">
                        Name *
                      </Label>
                      <Input
                        id={`item-name-${index}`}
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        disabled={isSubmitting}
                        placeholder="e.g., Groceries"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`item-budget-${index}`} className="text-xs">
                        Budgeted Amount *
                      </Label>
                      <Input
                        id={`item-budget-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.budgeted || ""}
                        onChange={(e) =>
                          updateItem(index, "budgeted", parseFloat(e.target.value) || 0)
                        }
                        disabled={isSubmitting}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {form.formState.errors.items?.[index] && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.items[index].message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Budget Summary */}
          {form.getValues("items").length > 0 && (
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Budgeted</span>
                <span className="font-mono text-sm font-bold">{totalBudgeted.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className={buttonVariants({ variant: "outline" })}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {mode === "create" ? "Create budget" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

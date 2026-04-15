"use client";

import { api } from "@finance/api/react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@finance/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const goalFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  targetAmount: z.number().min(1, "Target amount is required"),
  deadline: z.string().optional(),
  accountId: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

interface GoalFormProps {
  mode: "create" | "update";
  goal?: {
    id: string;
    name: string;
    currentAmount: number;
    targetAmount: number;
    deadline: Date | null;
    accountId: string | null;
  };
  onCancel?: () => void;
  onSuccess?: () => void;
}

function toDateInput(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function GoalForm({ mode, goal, onCancel, onSuccess }: GoalFormProps): React.JSX.Element {
  const utils = api.useContext();
  const accountsQuery = api.account.list.useQuery({ page: 1, limit: 100, isActive: true });
  const selectedAccountIdRef = useRef<string | undefined>(goal?.accountId ?? undefined);

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: goal?.name ?? "",
      targetAmount: goal?.targetAmount ?? 0,
      deadline: toDateInput(goal?.deadline ?? null),
      accountId: goal?.accountId ?? undefined,
    },
  });

  const createGoal = api.goal.create.useMutation({
    onSuccess: async () => {
      toast({ title: "Goal created", description: "Your savings goal is ready." });
      await utils.goal.list.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to create goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateGoal = api.goal.update.useMutation({
    onSuccess: async () => {
      toast({ title: "Goal updated", description: "Changes saved." });
      await Promise.all([
        utils.goal.list.invalidate(),
        goal ? utils.goal.getById.invalidate({ id: goal.id }) : Promise.resolve(),
      ]);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to update goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isSubmitting = createGoal.isLoading || updateGoal.isLoading;

  const submitForm = async (values: GoalFormValues) => {
    const targetAmount = Number(values.targetAmount);
    const accountId = values.accountId?.trim();

    if (isNaN(targetAmount) || targetAmount <= 0) {
      form.setError("targetAmount", { message: "Please enter a valid amount" });
      return;
    }

    const baseInput: {
      name: string;
      targetAmount: number;
      currentAmount: number;
      deadline?: Date;
      accountId?: string;
    } = {
      name: values.name,
      targetAmount,
      currentAmount: 0,
    };

    if (values.deadline) {
      baseInput.deadline = new Date(values.deadline);
    }
    if (accountId) {
      baseInput.accountId = accountId;
    }

    if (mode === "create") {
      await createGoal.mutateAsync(baseInput);
      form.reset();
      return;
    }

    if (!goal) {
      return;
    }

    const updateInput: {
      id: string;
      name?: string;
      targetAmount?: number;
      deadline?: Date;
      accountId?: string;
    } = {
      id: goal.id,
    };

    updateInput.name = values.name;
    updateInput.targetAmount = targetAmount;

    if (values.deadline) {
      updateInput.deadline = new Date(values.deadline);
    }
    if (accountId) {
      updateInput.accountId = accountId;
    }

    await updateGoal.mutateAsync(updateInput);
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(submitForm)} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="goal-name">Name</Label>
        <Input
          id="goal-name"
          placeholder="e.g., Emergency Fund, New Car"
          disabled={isSubmitting}
          maxLength={200}
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-target">Target Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
          <Input
            id="goal-target"
            type="number"
            min="0.01"
            step="100"
            placeholder="10000"
            disabled={isSubmitting}
            {...form.register("targetAmount", { valueAsNumber: true })}
            className="pl-7"
          />
        </div>
        {form.formState.errors.targetAmount && (
          <p className="text-xs text-destructive">{form.formState.errors.targetAmount.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-deadline">Target Date (optional)</Label>
        <Input
          id="goal-deadline"
          type="date"
          disabled={isSubmitting}
          {...form.register("deadline")}
        />
      </div>

      {accountsQuery.data?.items && accountsQuery.data.items.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="goal-account">Associated Account (optional)</Label>
          <Select
            value={selectedAccountIdRef.current as string}
            onValueChange={(value) => (selectedAccountIdRef.current = value)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="goal-account">
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {accountsQuery.data.items.map((account: any) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center justify-between">
                    <span>{account.name}</span>
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">
                      {formatMoney(account.balance)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create goal" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

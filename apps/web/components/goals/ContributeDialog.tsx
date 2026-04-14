"use client";

import { api } from "@finance/api/react";
import { cn } from "@finance/ui";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@finance/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Loader2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface ContributeDialogProps {
  goalId: string;
  goalName: string;
  children: React.ReactNode;
}

const contributeFormSchema = z.object({
  contributionAmount: z.number().positive("Amount must be positive"),
});

type ContributeFormValues = z.infer<typeof contributeFormSchema>;

export function ContributeDialog({
  goalId,
  goalName,
  children,
}: ContributeDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  const milestoneThresholds = [25, 50, 75, 100] as const;
  const getMilestone = (percent: number): number => {
    return milestoneThresholds.filter((threshold) => percent >= threshold).at(-1) ?? 0;
  };

  const form = useForm<ContributeFormValues>({
    resolver: zodResolver(contributeFormSchema),
    defaultValues: {
      contributionAmount: 0,
    },
  });

  const contributeMutation = api.goal.contribute.useMutation({
    onSuccess: async (data) => {
      const previousMilestone = getMilestone(data.previousPercentComplete);
      const newMilestone = getMilestone(data.newPercentComplete);

      if (newMilestone > previousMilestone) {
        const milestoneMessages: Record<25 | 50 | 75 | 100, string> = {
          25: "🎉 25% milestone reached!",
          50: "🎉 50% milestone reached!",
          75: "🎉 75% milestone reached!",
          100: "🎉 Goal reached! 100% complete",
        };
        toast({
          title: "Milestone reached!",
          description: milestoneMessages[newMilestone as 25 | 50 | 75 | 100],
          variant: "default",
        });
      } else {
        toast({
          title: "Contribution added!",
          description: `+$${data.contributionAmount.toLocaleString()} added to ${goalName}`,
          variant: "default",
        });
      }

      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to add contribution",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const progressQueryData = api.goal.getProgress.useQuery(
    { id: goalId },
    { enabled: open, refetchOnWindowFocus: false },
  );

  const quickAmounts = [1000, 5000, 10000, 50000];

  const handleQuickAmount = (amount: number) => {
    form.setValue("contributionAmount", amount);
  };

  const handleSubmit = async (values: ContributeFormValues) => {
    contributeMutation.mutate({
      id: goalId,
      amount: values.contributionAmount,
    });
  };

  const currentAmount = progressQueryData?.data?.currentAmount ?? 0;
  const targetAmount = progressQueryData?.data?.targetAmount ?? 0;
  const percentComplete =
    targetAmount > 0 ? Math.min(Math.round((currentAmount / targetAmount) * 100), 100) : 0;
  const progressFillColor = percentComplete >= 100 ? "hsl(var(--accent))" : "hsl(var(--primary))";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{children}</div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contribution to {goalName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Progress Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Current Progress</Label>
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono tabular-nums text-gray-900">
                {formatMoney(currentAmount)} / {formatMoney(targetAmount)}
              </span>
              <span className="font-mono tabular-nums text-gray-900">
                {percentComplete.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(percentComplete, 100)}%`,
                  backgroundColor: progressFillColor,
                }}
              />
            </div>
            {percentComplete >= 100 && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 mt-1">
                <CheckCircle className="h-4 w-4" />
                Goal reached! 🎉
              </div>
            )}
          </div>

          {/* Contribution Amount */}
          <div className="space-y-2">
            <Label htmlFor="contribution-amount">Contribution Amount</Label>
            <Input
              id="contribution-amount"
              type="number"
              min="0.01"
              step="100"
              disabled={contributeMutation.isLoading}
              {...form.register("contributionAmount", { valueAsNumber: true })}
            />
            {form.formState.errors.contributionAmount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.contributionAmount.message}
              </p>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground mb-2 block">
              Quick amounts
            </Label>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(amount)}
                  className={cn("font-mono tabular-nums", {
                    "bg-blue-50 border-blue-200 text-blue-700":
                      form.watch("contributionAmount") === amount,
                  })}
                >
                  ${amount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={contributeMutation.isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={contributeMutation.isLoading || form.watch("contributionAmount") <= 0}
              className="gap-2"
            >
              {contributeMutation.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <TrendingUp className="h-4 w-4" />
              Add Contribution
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

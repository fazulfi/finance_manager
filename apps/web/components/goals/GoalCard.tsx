"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@finance/ui";
import { ArrowLeft, ArrowUpRight, Calendar, Ellipsis, Plus } from "lucide-react";

import { ContributeDialog } from "./ContributeDialog";

interface GoalSummary {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  deadline: Date | null;
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
  accountId: string | null;
}

interface GoalAnalytics {
  percentComplete: number;
  remainingAmount: number;
  daysRemaining: number | null;
  estimatedCompletionDate: Date | null;
  isCompleted: boolean;
  isOverdue: boolean;
}

function deriveAnalytics(goal: GoalSummary): GoalAnalytics {
  const now = new Date();
  const progress =
    goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const isCompleted = progress >= 100;

  let daysRemaining: number | null = null;
  if (goal.deadline !== null && goal.deadline !== undefined) {
    daysRemaining = Math.ceil((goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  const estimatedCompletionDate =
    goal.targetAmount > 0 && remaining > 0 && daysRemaining !== null && daysRemaining > 0
      ? new Date(now.getTime() + (remaining / daysRemaining) * 1000 * 60 * 60 * 24)
      : null;

  const isOverdue = Boolean(goal.deadline && now > new Date(goal.deadline) && !isCompleted);

  return {
    percentComplete: progress,
    remainingAmount: remaining,
    daysRemaining,
    estimatedCompletionDate,
    isCompleted,
    isOverdue,
  };
}

function statusTone(analytics: GoalAnalytics): string {
  if (analytics.isOverdue) return "bg-rose-100 text-rose-700";
  if (analytics.isCompleted) return "bg-emerald-100 text-emerald-700";
  return "bg-blue-100 text-blue-700";
}

function statusLabel(analytics: GoalAnalytics): string {
  if (analytics.isOverdue) return "Overdue";
  if (analytics.isCompleted) return "Completed";
  return "Active";
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function GoalCard({
  goal,
  onDelete,
}: {
  goal: GoalSummary;
  onDelete?: (id: string) => void;
}): React.JSX.Element {
  const derived = deriveAnalytics(goal);
  const progressFillColor =
    derived.percentComplete >= 100 ? "hsl(var(--accent))" : "hsl(var(--primary))";
  const progressTrackColor = "hsl(var(--muted))";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="line-clamp-1">{goal.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {goal.deadline
                ? `Target: ${new Date(goal.deadline).toLocaleDateString()} • ${statusLabel(derived)}`
                : statusLabel(derived)}
            </CardDescription>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(derived)}`}>
            {statusLabel(derived)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Circular Progress */}
        <div className="flex items-center justify-center">
          <div
            className="relative h-24 w-24 rounded-full"
            style={{
              background: `conic-gradient(
                ${progressFillColor} 0% ${derived.percentComplete}%, ${progressTrackColor} ${derived.percentComplete}% 100%
              )`,
            }}
          >
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-white">
              <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">
                {derived.percentComplete.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono tabular-nums text-gray-900">
              {formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}
            </span>
          </div>
          <div className="h-2 rounded-full" style={{ backgroundColor: progressTrackColor }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${derived.percentComplete}%`,
                backgroundColor: progressFillColor,
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Remaining
            </span>
            <span className="font-mono tabular-nums text-gray-900">
              {formatMoney(derived.remainingAmount)}
            </span>
          </div>
          {derived.daysRemaining !== null && derived.daysRemaining > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Days left
              </span>
              <span className="font-mono tabular-nums text-gray-900">
                {derived.daysRemaining} days
              </span>
            </div>
          )}
          {derived.estimatedCompletionDate && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                ETA
              </span>
              <span className="font-mono tabular-nums text-gray-900">
                {new Date(derived.estimatedCompletionDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <ContributeDialog goalId={goal.id} goalName={goal.name}>
            <Button type="button" size="sm" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Contribute
            </Button>
          </ContributeDialog>
          {onDelete && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => onDelete(goal.id)}
            >
              <Ellipsis className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { api } from "@finance/api/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
  toast,
} from "@finance/ui";
import { AlertCircle, Plus } from "lucide-react";
import { useState } from "react";

import { GoalCard } from "./GoalCard";
import { GoalForm } from "./GoalForm";

export interface GoalSummary {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  deadline: Date | null;
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
  accountId: string | null;
}

interface GoalsOverviewProps {
  goals: GoalSummary[];
}

export function GoalsOverview({ goals }: GoalsOverviewProps): React.JSX.Element {
  const utils = api.useContext();
  const goalsQuery = api.goal.list.useQuery({ page: 1, limit: 100 });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalSummary | null>(null);

  const deleteGoal = api.goal.delete.useMutation({
    onSuccess: async () => {
      toast({ title: "Goal deleted", description: "Goal removed." });
      await utils.goal.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Failed to delete goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Use goals passed as props from parent if available, otherwise fetch
  const displayGoals = goals.length > 0 ? goals : (goalsQuery.data?.items ?? []);

  if (goalsQuery.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (goalsQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-5 w-5 text-destructive" aria-hidden="true" />
        <p className="text-sm text-destructive">{goalsQuery.error.message}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => goalsQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New goal
        </Button>
      </div>

      {displayGoals.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-lg font-semibold">No goals yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Set savings goals to track your progress toward financial milestones.
          </p>
          <Button type="button" className="mt-4" onClick={() => setCreateOpen(true)}>
            Create goal
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal as GoalSummary}
              onDelete={(id) => deleteGoal.mutate({ id })}
            />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create savings goal</DialogTitle>
          </DialogHeader>
          <GoalForm
            mode="create"
            onCancel={() => setCreateOpen(false)}
            onSuccess={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingGoal !== null} onOpenChange={() => setEditingGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit savings goal</DialogTitle>
          </DialogHeader>
          {editingGoal && (
            <GoalForm
              mode="update"
              goal={editingGoal}
              onCancel={() => setEditingGoal(null)}
              onSuccess={() => setEditingGoal(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

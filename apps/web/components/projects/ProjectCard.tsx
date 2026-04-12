"use client";

import Link from "next/link";
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
import { ProjectForm } from "./ProjectForm";

type ProjectStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";

interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  budget: number | null;
  spent: number;
  startDate: Date | null;
  targetDate: Date | null;
  status: ProjectStatus;
  color: string | null;
}

interface ProjectAnalytics {
  spent: number;
  budget: number;
  progressPercent: number;
  burnRatePerDay: number;
  estimatedCompletionDate: Date | null;
  timelineDaysRemaining: number | null;
  isCompleted: boolean;
  isOverdue: boolean;
  isAtRisk: boolean;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function deriveAnalytics(project: ProjectSummary): ProjectAnalytics {
  const now = new Date();
  const budget = project.budget ?? 0;
  const spent = project.spent;
  const progressPercent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const start = project.startDate ?? now;
  const elapsedDays = Math.max(
    1,
    Math.ceil((now.getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)),
  );
  const burnRatePerDay = spent > 0 ? spent / elapsedDays : 0;
  const remaining = budget - spent;
  const estimatedCompletionDate =
    budget > 0 && burnRatePerDay > 0 && remaining > 0
      ? new Date(now.getTime() + (remaining / burnRatePerDay) * 1000 * 60 * 60 * 24)
      : remaining <= 0
        ? now
        : null;
  const timelineDaysRemaining = project.targetDate
    ? Math.ceil((new Date(project.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isCompleted = budget > 0 ? spent >= budget : project.status === "COMPLETED";
  const isOverdue = Boolean(
    project.targetDate && now > new Date(project.targetDate) && !isCompleted,
  );
  const isAtRisk = Boolean(
    !isCompleted &&
    project.targetDate &&
    estimatedCompletionDate &&
    estimatedCompletionDate > new Date(project.targetDate),
  );

  return {
    spent,
    budget,
    progressPercent,
    burnRatePerDay,
    estimatedCompletionDate,
    timelineDaysRemaining,
    isCompleted,
    isOverdue,
    isAtRisk,
  };
}

function statusTone(analytics: ProjectAnalytics): string {
  if (analytics.isOverdue) return "bg-rose-100 text-rose-700";
  if (analytics.isCompleted) return "bg-emerald-100 text-emerald-700";
  if (analytics.isAtRisk) return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function statusLabel(analytics: ProjectAnalytics): string {
  if (analytics.isOverdue) return "Overdue";
  if (analytics.isCompleted) return "Completed";
  if (analytics.isAtRisk) return "At-risk";
  return "On track";
}

export function ProjectCard({
  project,
  analytics,
  onEdit,
  onDelete,
}: {
  project: ProjectSummary;
  analytics?: ProjectAnalytics;
  onEdit?: (project: ProjectSummary) => void;
  onDelete?: (id: string) => void;
}): React.JSX.Element {
  const derived = analytics ?? deriveAnalytics(project);
  const progress = Math.min(100, Math.max(0, derived.progressPercent));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{project.name}</CardTitle>
            <CardDescription>{project.description ?? "No description"}</CardDescription>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(derived)}`}>
            {statusLabel(derived)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>Spent / Budget</span>
            <span className="font-mono tabular-nums">
              {formatMoney(derived.spent)} / {formatMoney(derived.budget)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{progress.toFixed(0)}% complete</p>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p>Burn rate: {formatMoney(derived.burnRatePerDay)}/day</p>
          <p>
            Timeline:{" "}
            {derived.timelineDaysRemaining !== null ? `${derived.timelineDaysRemaining} days` : "—"}
          </p>
          <p>
            ETA:{" "}
            {derived.estimatedCompletionDate
              ? new Date(derived.estimatedCompletionDate).toLocaleDateString()
              : "—"}
          </p>
          <p>Status: {statusLabel(derived)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/projects/${project.id}`}>
            <Button size="sm" variant="outline">
              Open
            </Button>
          </Link>
          {onEdit && (
            <Button type="button" size="sm" variant="outline" onClick={() => onEdit(project)}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => onDelete(project.id)}
            >
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectsOverview(): React.JSX.Element {
  const utils = api.useContext();
  const projectsQuery = api.project.list.useQuery({ page: 1, limit: 100 });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(null);

  const deleteProject = api.project.delete.useMutation({
    onSuccess: async () => {
      toast({ title: "Project deleted", description: "Project removed." });
      await utils.project.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Failed to delete project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (projectsQuery.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (projectsQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-5 w-5 text-destructive" aria-hidden="true" />
        <p className="text-sm text-destructive">{projectsQuery.error.message}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => projectsQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const projects = projectsQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-lg font-semibold">No projects yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first project to start tagging related transactions.
          </p>
          <Button type="button" className="mt-4" onClick={() => setCreateOpen(true)}>
            Create project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project as ProjectSummary}
              onEdit={(next) => setEditingProject(next)}
              onDelete={(id) => deleteProject.mutate({ id })}
            />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            mode="create"
            onCancel={() => setCreateOpen(false)}
            onSuccess={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingProject !== null} onOpenChange={() => setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <ProjectForm
              mode="update"
              project={editingProject}
              onCancel={() => setEditingProject(null)}
              onSuccess={() => setEditingProject(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

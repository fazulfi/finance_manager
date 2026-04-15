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
import { useForm } from "react-hook-form";
import { z } from "zod";

type ProjectStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";

interface ProjectFormValues {
  name: string;
  description: string;
  budget: string;
  startDate: string;
  targetDate: string;
  status: ProjectStatus;
  color: string;
}

interface ProjectFormProps {
  mode: "create" | "update";
  project?: {
    id: string;
    name: string;
    description: string | null;
    budget: number | null;
    startDate: Date | null;
    targetDate: Date | null;
    status: ProjectStatus;
    color: string | null;
  };
  onCancel?: () => void;
  onSuccess?: () => void;
}

const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long"),
  budget: z.string(),
  startDate: z.string(),
  targetDate: z.string(),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]),
  color: z.string().max(20, "Color too long"),
});

function toDateInput(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function ProjectForm({
  mode,
  project,
  onCancel,
  onSuccess,
}: ProjectFormProps): React.JSX.Element {
  const utils = api.useContext();
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      budget: project?.budget ? String(project.budget) : "",
      startDate: toDateInput(project?.startDate ?? null),
      targetDate: toDateInput(project?.targetDate ?? null),
      status: project?.status ?? "ACTIVE",
      color: project?.color ?? "",
    },
  });

  const createProject = api.project.create.useMutation({
    onSuccess: async () => {
      await utils.project.list.invalidate();
      toast({ title: "Project created", description: "Your project is ready." });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProject = api.project.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.project.list.invalidate(),
        project ? utils.project.getById.invalidate({ id: project.id }) : Promise.resolve(),
      ]);
      toast({ title: "Project updated", description: "Changes saved." });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to update project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isSubmitting = createProject.isLoading || updateProject.isLoading;

  const submitForm = async (values: ProjectFormValues) => {
    const budget = values.budget.trim() ? Number(values.budget) : undefined;
    const baseInput = {
      name: values.name,
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
      ...(Number.isFinite(budget) && budget !== undefined && budget > 0 ? { budget } : {}),
      ...(values.startDate ? { startDate: new Date(values.startDate) } : {}),
      ...(values.targetDate ? { targetDate: new Date(values.targetDate) } : {}),
      ...(values.color.trim() ? { color: values.color.trim() } : {}),
    };

    if (mode === "create") {
      await createProject.mutateAsync(baseInput);
      form.reset();
      return;
    }

    if (!project) {
      return;
    }

    await updateProject.mutateAsync({
      id: project.id,
      ...baseInput,
      status: values.status,
    });
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(submitForm)} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="project-name">Name</Label>
        <Input id="project-name" disabled={isSubmitting} {...form.register("name")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="project-description">Description</Label>
        <textarea
          id="project-description"
          className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={isSubmitting}
          {...form.register("description")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="project-budget">Budget</Label>
          <Input
            id="project-budget"
            type="number"
            min="0"
            step="0.01"
            disabled={isSubmitting}
            {...form.register("budget")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-color">Color (hex)</Label>
          <Input
            id="project-color"
            placeholder="#3b82f6"
            disabled={isSubmitting}
            {...form.register("color")}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="project-start">Start date</Label>
          <Input
            id="project-start"
            type="date"
            disabled={isSubmitting}
            {...form.register("startDate")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-target">Target date</Label>
          <Input
            id="project-target"
            type="date"
            disabled={isSubmitting}
            {...form.register("targetDate")}
          />
        </div>
      </div>

      {mode === "update" && (
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(value) => form.setValue("status", value as ProjectStatus)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {mode === "create" ? "Create project" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

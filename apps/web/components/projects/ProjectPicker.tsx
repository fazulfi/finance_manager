"use client";

import { api } from "@finance/api/react";
import {
  Button,
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@finance/ui";

interface ProjectPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

const NONE_VALUE = "__none__";

export function ProjectPicker({
  value,
  onChange,
  disabled = false,
  label = "Project",
  description = "Tag this transaction to a project (optional).",
}: ProjectPickerProps): React.JSX.Element {
  const projectsQuery = api.project.list.useQuery({ page: 1, limit: 100, status: "ACTIVE" });

  if (projectsQuery.isError) {
    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-xs text-destructive">Failed to load projects.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => projectsQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      </FormItem>
    );
  }

  const projects = projectsQuery.data?.items ?? [];

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Select
        value={value ?? NONE_VALUE}
        onValueChange={(nextValue) => onChange(nextValue === NONE_VALUE ? null : nextValue)}
        disabled={disabled || projectsQuery.isLoading}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue
              placeholder={projectsQuery.isLoading ? "Loading projects..." : "No project"}
            />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>No project</SelectItem>
          {projects.length === 0 ? (
            <SelectItem value="__empty__" disabled>
              No active projects
            </SelectItem>
          ) : (
            projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <FormDescription>{description}</FormDescription>
      <FormMessage />
    </FormItem>
  );
}

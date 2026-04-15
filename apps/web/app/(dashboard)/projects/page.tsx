import type { Metadata } from "next";

import { ProjectsOverview } from "@/components/projects/ProjectCard";

export const metadata: Metadata = {
  title: "Projects",
  description: "Track project budgets, progress, and timelines",
};

export default function ProjectsPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Track project spending, burn rate, and completion timelines.
        </p>
      </div>

      <ProjectsOverview />
    </div>
  );
}

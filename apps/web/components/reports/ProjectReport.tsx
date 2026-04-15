"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@finance/ui";
import { formatCurrency } from "@finance/utils";

import type { GeneratedReport } from "./types";

function money(amount: number): string {
  return formatCurrency(amount, "IDR", "id-ID");
}

export function ProjectReport({ report }: { report: GeneratedReport }): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Summary</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Project</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Budget</th>
              <th className="py-2 pr-4">Spent</th>
              <th className="py-2 pr-4">Remaining</th>
              <th className="py-2 pr-4">Utilization</th>
              <th className="py-2 pr-4">Period Spent</th>
            </tr>
          </thead>
          <tbody>
            {report.projectSummary.map((project) => (
              <tr key={project.id} className="border-b">
                <td className="py-2 pr-4 font-medium">{project.name}</td>
                <td className="py-2 pr-4">{project.status}</td>
                <td className="py-2 pr-4">{money(project.budget)}</td>
                <td className="py-2 pr-4">{money(project.spent)}</td>
                <td className="py-2 pr-4">{money(project.remaining)}</td>
                <td className="py-2 pr-4">{project.utilizationPercent.toFixed(2)}%</td>
                <td className="py-2 pr-4">{money(project.periodSpent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

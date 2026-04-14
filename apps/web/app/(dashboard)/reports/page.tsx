import type { Metadata } from "next";
import { ReportBuilder } from "@/components/reports/ReportBuilder";

export const metadata: Metadata = {
  title: "Reports",
  description: "Build financial reports and export to PDF, Excel, or CSV",
};

export default function ReportsPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate monthly summaries, category analysis, project status, and cash flow statements.
        </p>
      </div>

      <ReportBuilder />
    </div>
  );
}


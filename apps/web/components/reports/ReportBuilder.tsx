"use client";

import { useMemo, useState } from "react";
import { api } from "@finance/api/react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Tabs, TabsContent, TabsList, TabsTrigger, toast } from "@finance/ui";
import { CashFlowStatement } from "./CashFlowStatement";
import { CategoryReport } from "./CategoryReport";
import { IncomeStatement } from "./IncomeStatement";
import { ProjectReport } from "./ProjectReport";
import type { GeneratedReport, ReportInput, ReportType } from "./types";

const TYPE_OPTIONS: Array<{ value: ReportType; label: string }> = [
  { value: "MONTHLY_SUMMARY", label: "Monthly Summary" },
  { value: "CATEGORY_BREAKDOWN", label: "Category Breakdown" },
  { value: "PROJECT_SUMMARY", label: "Project Summary" },
  { value: "CASH_FLOW_STATEMENT", label: "Cash Flow Statement" },
  { value: "CUSTOM_RANGE", label: "Custom Date Range" },
];

function toDate(value: string): Date | undefined {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00.000Z`);
}

function parseCsvText(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function downloadFile(params: { fileName: string; mimeType: string; contentBase64: string }) {
  const bytes = decodeBase64ToBytes(params.contentBase64);
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: params.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = params.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ReportBuilder(): React.JSX.Element {
  const [reportType, setReportType] = useState<ReportType>("MONTHLY_SUMMARY");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [includeTransfers, setIncludeTransfers] = useState(false);
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [submittedInput, setSubmittedInput] = useState<ReportInput | null>(null);

  const currentInput = useMemo<ReportInput>(
    () => {
      const next: ReportInput = {
        type: reportType,
        filters: {
          categories: parseCsvText(categoryFilter),
          accountIds: parseCsvText(accountFilter),
          projectIds: parseCsvText(projectFilter),
          includeTransfers,
        },
      };

      const parsedDateFrom = toDate(dateFrom);
      const parsedDateTo = toDate(dateTo);
      if (parsedDateFrom) next.dateFrom = parsedDateFrom;
      if (parsedDateTo) next.dateTo = parsedDateTo;
      if (deliveryEmail) {
        next.delivery = { email: deliveryEmail, schedule: "MONTHLY" };
      }

      return next;
    },
    [reportType, dateFrom, dateTo, categoryFilter, accountFilter, projectFilter, includeTransfers, deliveryEmail],
  );

  const reportQuery = api.report.generateReport.useQuery(submittedInput as ReportInput, {
    enabled: submittedInput !== null,
  });

  const exportPdf = api.report.exportToPDF.useMutation({
    onSuccess: (result) => {
      downloadFile(result);
      toast({ title: "PDF exported", description: "Report downloaded successfully." });
    },
    onError: (error) => {
      toast({ title: "PDF export failed", description: error.message, variant: "destructive" });
    },
  });

  const exportExcel = api.report.exportToExcel.useMutation({
    onSuccess: (result) => {
      downloadFile(result);
      toast({ title: "Excel exported", description: "Report downloaded successfully." });
    },
    onError: (error) => {
      toast({ title: "Excel export failed", description: error.message, variant: "destructive" });
    },
  });

  const exportCsv = api.report.exportToCSV.useMutation({
    onSuccess: (result) => {
      downloadFile(result);
      toast({ title: "CSV exported", description: "Report downloaded successfully." });
    },
    onError: (error) => {
      toast({ title: "CSV export failed", description: error.message, variant: "destructive" });
    },
  });

  const isExporting = exportPdf.isLoading || exportExcel.isLoading || exportCsv.isLoading;
  const report = (reportQuery.data ?? null) as GeneratedReport | null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Report Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-from">Date From</Label>
              <Input id="date-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-to">Date To</Label>
              <Input id="date-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categories">Categories (comma separated)</Label>
              <Input id="categories" placeholder="Food, Salary, Utilities" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-ids">Account IDs (comma separated)</Label>
              <Input id="account-ids" placeholder="64f..., 65a..." value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-ids">Project IDs (comma separated)</Label>
              <Input id="project-ids" placeholder="64f..., 65a..." value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-delivery">Future Email Delivery (optional)</Label>
              <Input id="email-delivery" type="email" placeholder="name@company.com" value={deliveryEmail} onChange={(event) => setDeliveryEmail(event.target.value)} />
            </div>

            <div className="flex items-center gap-3 pt-8">
              <Switch checked={includeTransfers} onCheckedChange={setIncludeTransfers} />
              <Label>Include Transfers</Label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setSubmittedInput(currentInput)}>
              Generate Report
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!submittedInput || isExporting}
              onClick={() => submittedInput && exportPdf.mutate(submittedInput)}
            >
              Export PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!submittedInput || isExporting}
              onClick={() => submittedInput && exportExcel.mutate(submittedInput)}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!submittedInput || isExporting}
              onClick={() => submittedInput && exportCsv.mutate(submittedInput)}
            >
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportQuery.isLoading && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Generating report...
          </CardContent>
        </Card>
      )}

      {reportQuery.isError && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-rose-600">{reportQuery.error.message}</CardContent>
        </Card>
      )}

      {report && (
        <Tabs defaultValue="monthly" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="category">Category</TabsTrigger>
            <TabsTrigger value="project">Project</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          </TabsList>
          <TabsContent value="monthly">
            <IncomeStatement report={report} />
          </TabsContent>
          <TabsContent value="category">
            <CategoryReport report={report} />
          </TabsContent>
          <TabsContent value="project">
            <ProjectReport report={report} />
          </TabsContent>
          <TabsContent value="cashflow">
            <CashFlowStatement report={report} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

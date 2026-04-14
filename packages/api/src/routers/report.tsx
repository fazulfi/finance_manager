import ExcelJS from "exceljs";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { z } from "zod";
import type { Context } from "../trpc.js";
import { objectId, protectedProcedure, router } from "../trpc.js";

const ReportTypeEnum = z.enum([
  "MONTHLY_SUMMARY",
  "CATEGORY_BREAKDOWN",
  "PROJECT_SUMMARY",
  "CASH_FLOW_STATEMENT",
  "CUSTOM_RANGE",
]);

const ReportInputSchema = z.object({
  type: ReportTypeEnum,
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  filters: z
    .object({
      accountIds: z.array(objectId).optional(),
      categories: z.array(z.string().min(1).max(120)).optional(),
      projectIds: z.array(objectId).optional(),
      includeTransfers: z.boolean().optional(),
    })
    .optional(),
  delivery: z
    .object({
      email: z.string().email().optional(),
      schedule: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
    })
    .optional(),
});

type ReportInput = z.infer<typeof ReportInputSchema>;

interface DailySeriesItem {
  date: string;
  income: number;
  expense: number;
  net: number;
}

interface CategorySummaryItem {
  category: string;
  income: number;
  expense: number;
  net: number;
  expenseSharePercent: number;
  transactionCount: number;
}

interface ProjectSummaryItem {
  id: string;
  name: string;
  status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
  budget: number;
  spent: number;
  remaining: number;
  utilizationPercent: number;
  periodSpent: number;
  transactionCount: number;
  startDate: Date | null;
  targetDate: Date | null;
}

interface ReportResult {
  meta: {
    type: z.infer<typeof ReportTypeEnum>;
    generatedAt: Date;
    range: {
      dateFrom: Date;
      dateTo: Date;
    };
    filters: {
      accountIds: string[];
      categories: string[];
      projectIds: string[];
      includeTransfers: boolean;
    };
    emailDelivery: {
      requested: boolean;
      email: string | null;
      schedule: "DAILY" | "WEEKLY" | "MONTHLY" | null;
      status: "PLANNED";
      note: string;
    };
  };
  monthlySummary: {
    income: number;
    expenses: number;
    savings: number;
    savingsRatePercent: number;
    transactionCount: number;
  };
  categoryBreakdown: CategorySummaryItem[];
  projectSummary: ProjectSummaryItem[];
  cashFlowStatement: {
    openingBalance: number;
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    closingBalance: number;
    dailySeries: DailySeriesItem[];
  };
  charts: {
    incomeVsExpense: Array<{ label: string; income: number; expense: number }>;
    categoryExpenseShare: Array<{ label: string; value: number }>;
    dailyCashFlow: Array<{ label: string; value: number }>;
  };
  raw: {
    transactions: Array<{
      id: string;
      date: Date;
      type: "INCOME" | "EXPENSE" | "TRANSFER";
      accountName: string;
      category: string;
      projectId: string | null;
      projectName: string;
      description: string;
      amount: number;
      currency: string;
      tags: string[];
    }>;
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

function resolveDateRange(input: ReportInput): { dateFrom: Date; dateTo: Date } {
  if (input.dateFrom && input.dateTo) {
    return { dateFrom: input.dateFrom, dateTo: input.dateTo };
  }

  const now = new Date();
  if (input.type === "MONTHLY_SUMMARY") {
    return {
      dateFrom: startOfMonth(now),
      dateTo: endOfMonth(now),
    };
  }

  return {
    dateFrom: new Date(now.getTime() - 30 * MS_PER_DAY),
    dateTo: now,
  };
}

function parseFilters(input: ReportInput) {
  return {
    accountIds: input.filters?.accountIds ?? [],
    categories: input.filters?.categories ?? [],
    projectIds: input.filters?.projectIds ?? [],
    includeTransfers: input.filters?.includeTransfers ?? false,
  };
}

function toCsvRow(values: Array<string | number | null | undefined>): string {
  return values
    .map((value) => {
      const raw = value === null || value === undefined ? "" : String(value);
      return `"${raw.replace(/"/g, '""')}"`;
    })
    .join(",");
}

interface ReportBuildOptions {
  ctx: Context & { session: { user: { id: string } } };
  input: ReportInput;
}

async function buildReportData(options: ReportBuildOptions): Promise<ReportResult> {
  const { ctx, input } = options;
  const userId = ctx.session.user.id;
  const { dateFrom, dateTo } = resolveDateRange(input);
  const filters = parseFilters(input);

  const transactionWhere: Record<string, unknown> = {
    userId,
    date: { gte: dateFrom, lte: dateTo },
  };
  const historicalWhere: Record<string, unknown> = {
    userId,
    date: { gt: dateTo },
  };

  if (filters.accountIds.length > 0) {
    transactionWhere.accountId = { in: filters.accountIds };
    historicalWhere.accountId = { in: filters.accountIds };
  }
  if (filters.categories.length > 0) {
    transactionWhere.category = { in: filters.categories };
    historicalWhere.category = { in: filters.categories };
  }
  if (filters.projectIds.length > 0) {
    transactionWhere.project = { in: filters.projectIds };
    historicalWhere.project = { in: filters.projectIds };
  }
  if (!filters.includeTransfers) {
    transactionWhere.type = { in: ["INCOME", "EXPENSE"] };
    historicalWhere.type = { in: ["INCOME", "EXPENSE"] };
  }

  const [transactions, transactionsAfterRange, accounts, projects] = await Promise.all([
    ctx.db.transaction.findMany({
      where: transactionWhere,
      orderBy: { date: "asc" },
      include: {
        account: {
          select: { name: true },
        },
      },
    }),
    ctx.db.transaction.findMany({
      where: historicalWhere,
      select: {
        type: true,
        amount: true,
      },
    }),
    ctx.db.account.findMany({
      where: {
        userId,
        ...(filters.accountIds.length > 0 ? { id: { in: filters.accountIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        balance: true,
        initialBalance: true,
      },
    }),
    ctx.db.project.findMany({
      where: {
        userId,
        ...(filters.projectIds.length > 0 ? { id: { in: filters.projectIds } } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const accountTotalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  let totalIncome = 0;
  let totalExpense = 0;
  let transactionCount = 0;
  const categoryMap = new Map<string, { income: number; expense: number; count: number }>();
  const dailyMap = new Map<string, { income: number; expense: number }>();
  const projectPeriodSpent = new Map<string, { spent: number; count: number }>();
  const rawTransactions: ReportResult["raw"]["transactions"] = [];

  for (const tx of transactions) {
    if (tx.type === "INCOME") {
      totalIncome += tx.amount;
    } else if (tx.type === "EXPENSE") {
      totalExpense += tx.amount;
    } else if (!filters.includeTransfers) {
      continue;
    }

    transactionCount += 1;

    const categoryKey = tx.category || "Uncategorized";
    const categoryEntry = categoryMap.get(categoryKey) ?? { income: 0, expense: 0, count: 0 };
    if (tx.type === "INCOME") {
      categoryEntry.income += tx.amount;
    } else if (tx.type === "EXPENSE") {
      categoryEntry.expense += tx.amount;
    }
    categoryEntry.count += 1;
    categoryMap.set(categoryKey, categoryEntry);

    const dateKey = toISODate(tx.date);
    const dayEntry = dailyMap.get(dateKey) ?? { income: 0, expense: 0 };
    if (tx.type === "INCOME") {
      dayEntry.income += tx.amount;
    } else if (tx.type === "EXPENSE") {
      dayEntry.expense += tx.amount;
    }
    dailyMap.set(dateKey, dayEntry);

    if (tx.project) {
      const current = projectPeriodSpent.get(tx.project) ?? { spent: 0, count: 0 };
      if (tx.type === "EXPENSE") {
        current.spent += tx.amount;
      }
      current.count += 1;
      projectPeriodSpent.set(tx.project, current);
    }

    rawTransactions.push({
      id: tx.id,
      date: tx.date,
      type: tx.type,
      accountName: tx.account.name,
      category: tx.category,
      projectId: tx.project ?? null,
      projectName: tx.project ? (projectNames.get(tx.project) ?? "Unknown project") : "",
      description: tx.description ?? "",
      amount: tx.amount,
      currency: tx.currency,
      tags: tx.tags,
    });
  }

  let netAfterRange = 0;
  for (const tx of transactionsAfterRange) {
    if (tx.type === "INCOME") {
      netAfterRange += tx.amount;
    } else if (tx.type === "EXPENSE") {
      netAfterRange -= tx.amount;
    }
  }

  const netCashFlow = totalIncome - totalExpense;
  const closingBalance = accountTotalBalance - netAfterRange;
  const openingBalance = closingBalance - netCashFlow;
  const savingsRatePercent = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

  const allProjectExpenses = await ctx.db.transaction.findMany({
    where: {
      userId,
      project: {
        in: projects.map((project) => project.id),
      },
      type: "EXPENSE",
    },
    select: {
      project: true,
      amount: true,
    },
  });

  const totalSpentByProject = new Map<string, number>();
  for (const tx of allProjectExpenses) {
    if (!tx.project) continue;
    totalSpentByProject.set(tx.project, (totalSpentByProject.get(tx.project) ?? 0) + tx.amount);
  }

  const categoryBreakdown: CategorySummaryItem[] = Array.from(categoryMap.entries())
    .map(([category, totals]) => ({
      category,
      income: totals.income,
      expense: totals.expense,
      net: totals.income - totals.expense,
      expenseSharePercent: totalExpense > 0 ? (totals.expense / totalExpense) * 100 : 0,
      transactionCount: totals.count,
    }))
    .sort((a, b) => b.expense - a.expense);

  const projectSummary: ProjectSummaryItem[] = projects.map((project) => {
    const spent = totalSpentByProject.get(project.id) ?? project.spent ?? 0;
    const period = projectPeriodSpent.get(project.id) ?? { spent: 0, count: 0 };
    const budget = project.budget ?? 0;
    const remaining = budget - spent;
    const utilizationPercent = budget > 0 ? (spent / budget) * 100 : 0;

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      budget,
      spent,
      remaining,
      utilizationPercent,
      periodSpent: period.spent,
      transactionCount: period.count,
      startDate: project.startDate,
      targetDate: project.targetDate,
    };
  });

  const dailySeries: DailySeriesItem[] = [];
  for (
    let cursor = new Date(dateFrom.getTime());
    cursor <= dateTo;
    cursor = new Date(cursor.getTime() + MS_PER_DAY)
  ) {
    const key = toISODate(cursor);
    const day = dailyMap.get(key) ?? { income: 0, expense: 0 };
    dailySeries.push({
      date: key,
      income: day.income,
      expense: day.expense,
      net: day.income - day.expense,
    });
  }

  const emailDelivery = {
    requested: Boolean(input.delivery?.email),
    email: input.delivery?.email ?? null,
    schedule: input.delivery?.schedule ?? null,
    status: "PLANNED" as const,
    note: "Email delivery is planned for a future release. This report was generated on demand.",
  };

  const result: ReportResult = {
    meta: {
      type: input.type,
      generatedAt: new Date(),
      range: {
        dateFrom,
        dateTo,
      },
      filters,
      emailDelivery,
    },
    monthlySummary: {
      income: totalIncome,
      expenses: totalExpense,
      savings: netCashFlow,
      savingsRatePercent,
      transactionCount,
    },
    categoryBreakdown,
    projectSummary,
    cashFlowStatement: {
      openingBalance,
      totalInflow: totalIncome,
      totalOutflow: totalExpense,
      netCashFlow,
      closingBalance,
      dailySeries,
    },
    charts: {
      incomeVsExpense: dailySeries.map((item) => ({
        label: item.date,
        income: item.income,
        expense: item.expense,
      })),
      categoryExpenseShare: categoryBreakdown
        .slice(0, 12)
        .map((item) => ({ label: item.category, value: item.expense })),
      dailyCashFlow: dailySeries.map((item) => ({ label: item.date, value: item.net })),
    },
    raw: {
      transactions: rawTransactions,
    },
  };

  return result;
}

function createCsv(report: ReportResult): string {
  const header = [
    "Transaction ID",
    "Date",
    "Type",
    "Account",
    "Category",
    "Project",
    "Description",
    "Amount",
    "Currency",
    "Tags",
  ];

  const rows = report.raw.transactions.map((tx) =>
    toCsvRow([
      tx.id,
      toISODate(tx.date),
      tx.type,
      tx.accountName,
      tx.category,
      tx.projectName,
      tx.description,
      tx.amount,
      tx.currency,
      tx.tags.join("|"),
    ]),
  );

  return [toCsvRow(header), ...rows].join("\n");
}

async function createExcel(report: ReportResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Finance Manager";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 24 },
  ];

  summarySheet.addRow({ metric: "Report Type", value: report.meta.type });
  summarySheet.addRow({
    metric: "Range Start",
    value: report.meta.range.dateFrom.toISOString(),
  });
  summarySheet.addRow({
    metric: "Range End",
    value: report.meta.range.dateTo.toISOString(),
  });
  summarySheet.addRow({ metric: "Total Income", value: report.monthlySummary.income });
  summarySheet.addRow({ metric: "Total Expenses", value: report.monthlySummary.expenses });
  summarySheet.addRow({
    metric: "Net Savings",
    value: { formula: "B4-B5" },
  });
  summarySheet.addRow({
    metric: "Savings Rate (%)",
    value: { formula: "IF(B4=0,0,(B6/B4)*100)" },
  });
  summarySheet.getColumn("value").numFmt = "#,##0.00";

  const categorySheet = workbook.addWorksheet("Categories");
  categorySheet.columns = [
    { header: "Category", key: "category", width: 26 },
    { header: "Income", key: "income", width: 16 },
    { header: "Expense", key: "expense", width: 16 },
    { header: "Net", key: "net", width: 16 },
    { header: "Expense Share %", key: "share", width: 16 },
    { header: "Transactions", key: "transactions", width: 16 },
  ];

  for (const item of report.categoryBreakdown) {
    categorySheet.addRow({
      category: item.category,
      income: item.income,
      expense: item.expense,
      net: item.net,
      share: item.expenseSharePercent,
      transactions: item.transactionCount,
    });
  }
  const categoryLastRow = categorySheet.rowCount + 1;
  categorySheet.addRow({
    category: "TOTAL",
    income: { formula: `SUM(B2:B${categoryLastRow - 1})` },
    expense: { formula: `SUM(C2:C${categoryLastRow - 1})` },
    net: { formula: `SUM(D2:D${categoryLastRow - 1})` },
    share: { formula: `SUM(E2:E${categoryLastRow - 1})` },
    transactions: { formula: `SUM(F2:F${categoryLastRow - 1})` },
  });
  categorySheet.getColumn("income").numFmt = "#,##0.00";
  categorySheet.getColumn("expense").numFmt = "#,##0.00";
  categorySheet.getColumn("net").numFmt = "#,##0.00";
  categorySheet.getColumn("share").numFmt = "0.00";

  const projectsSheet = workbook.addWorksheet("Projects");
  projectsSheet.columns = [
    { header: "Project", key: "name", width: 28 },
    { header: "Status", key: "status", width: 16 },
    { header: "Budget", key: "budget", width: 16 },
    { header: "Spent", key: "spent", width: 16 },
    { header: "Remaining", key: "remaining", width: 16 },
    { header: "Utilization %", key: "utilization", width: 16 },
    { header: "Period Spent", key: "periodSpent", width: 16 },
  ];
  for (const item of report.projectSummary) {
    projectsSheet.addRow({
      name: item.name,
      status: item.status,
      budget: item.budget,
      spent: item.spent,
      remaining: item.remaining,
      utilization: item.utilizationPercent,
      periodSpent: item.periodSpent,
    });
  }
  projectsSheet.getColumn("budget").numFmt = "#,##0.00";
  projectsSheet.getColumn("spent").numFmt = "#,##0.00";
  projectsSheet.getColumn("remaining").numFmt = "#,##0.00";
  projectsSheet.getColumn("utilization").numFmt = "0.00";
  projectsSheet.getColumn("periodSpent").numFmt = "#,##0.00";

  const transactionsSheet = workbook.addWorksheet("Transactions");
  transactionsSheet.columns = [
    { header: "Transaction ID", key: "id", width: 30 },
    { header: "Date", key: "date", width: 14 },
    { header: "Type", key: "type", width: 12 },
    { header: "Account", key: "account", width: 22 },
    { header: "Category", key: "category", width: 22 },
    { header: "Project", key: "project", width: 22 },
    { header: "Description", key: "description", width: 40 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Tags", key: "tags", width: 28 },
  ];

  for (const tx of report.raw.transactions) {
    transactionsSheet.addRow({
      id: tx.id,
      date: toISODate(tx.date),
      type: tx.type,
      account: tx.accountName,
      category: tx.category,
      project: tx.projectName,
      description: tx.description,
      amount: tx.amount,
      currency: tx.currency,
      tags: tx.tags.join(", "),
    });
  }
  transactionsSheet.getColumn("amount").numFmt = "#,##0.00";

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

const pdfStyles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 10,
    color: "#111827",
  },
  title: {
    fontSize: 18,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    marginBottom: 16,
    color: "#4B5563",
  },
  section: {
    marginBottom: 14,
    padding: 10,
    border: "1px solid #E5E7EB",
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  chartRow: {
    marginBottom: 6,
  },
  chartLabel: {
    fontSize: 9,
    marginBottom: 2,
  },
  barTrack: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
  },
  barFill: {
    height: 8,
    backgroundColor: "#2563EB",
    borderRadius: 4,
  },
});

function ReportPdfDocument({ report }: { report: ReportResult }) {
  const maxCategoryExpense = Math.max(...report.charts.categoryExpenseShare.map((c) => c.value), 1);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>Finance Report</Text>
        <Text style={pdfStyles.subtitle}>
          {report.meta.type} | {toISODate(report.meta.range.dateFrom)} to{" "}
          {toISODate(report.meta.range.dateTo)}
        </Text>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Monthly Summary</Text>
          <View style={pdfStyles.row}>
            <Text>Income</Text>
            <Text>{report.monthlySummary.income.toFixed(2)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text>Expenses</Text>
            <Text>{report.monthlySummary.expenses.toFixed(2)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text>Savings</Text>
            <Text>{report.monthlySummary.savings.toFixed(2)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text>Savings Rate</Text>
            <Text>{report.monthlySummary.savingsRatePercent.toFixed(2)}%</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Cash Flow Statement</Text>
          <View style={pdfStyles.row}>
            <Text>Opening Balance</Text>
            <Text>{report.cashFlowStatement.openingBalance.toFixed(2)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text>Total Inflow</Text>
            <Text>{report.cashFlowStatement.totalInflow.toFixed(2)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text>Total Outflow</Text>
            <Text>{report.cashFlowStatement.totalOutflow.toFixed(2)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text>Closing Balance</Text>
            <Text>{report.cashFlowStatement.closingBalance.toFixed(2)}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Category Chart (Top Expenses)</Text>
          {report.charts.categoryExpenseShare.slice(0, 8).map((item) => {
            const widthPercent = Math.max(2, Math.round((item.value / maxCategoryExpense) * 100));
            return (
              <View key={item.label} style={pdfStyles.chartRow}>
                <Text style={pdfStyles.chartLabel}>
                  {item.label}: {item.value.toFixed(2)}
                </Text>
                <View style={pdfStyles.barTrack}>
                  <View style={{ ...pdfStyles.barFill, width: `${widthPercent}%` }} />
                </View>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}

async function createPdf(report: ReportResult): Promise<Buffer> {
  const pdfBuffer = await renderToBuffer(<ReportPdfDocument report={report} />);
  return Buffer.from(pdfBuffer);
}

export const reportRouter = router({
  generateReport: protectedProcedure.input(ReportInputSchema).query(async ({ ctx, input }) => {
    return buildReportData({ ctx, input });
  }),

  exportToCSV: protectedProcedure.input(ReportInputSchema).mutation(async ({ ctx, input }) => {
    const report = await buildReportData({ ctx, input });
    const csv = createCsv(report);

    return {
      fileName: `report-${report.meta.type.toLowerCase()}-${toISODate(report.meta.generatedAt)}.csv`,
      mimeType: "text/csv",
      contentBase64: Buffer.from(csv, "utf8").toString("base64"),
    };
  }),

  exportToExcel: protectedProcedure.input(ReportInputSchema).mutation(async ({ ctx, input }) => {
    const report = await buildReportData({ ctx, input });
    const buffer = await createExcel(report);

    return {
      fileName: `report-${report.meta.type.toLowerCase()}-${toISODate(report.meta.generatedAt)}.xlsx`,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      contentBase64: buffer.toString("base64"),
    };
  }),

  exportToPDF: protectedProcedure.input(ReportInputSchema).mutation(async ({ ctx, input }) => {
    const report = await buildReportData({ ctx, input });
    const buffer = await createPdf(report);

    return {
      fileName: `report-${report.meta.type.toLowerCase()}-${toISODate(report.meta.generatedAt)}.pdf`,
      mimeType: "application/pdf",
      contentBase64: buffer.toString("base64"),
    };
  }),
});

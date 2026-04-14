export type ReportType =
  | "MONTHLY_SUMMARY"
  | "CATEGORY_BREAKDOWN"
  | "PROJECT_SUMMARY"
  | "CASH_FLOW_STATEMENT"
  | "CUSTOM_RANGE";

export interface ReportInput {
  type: ReportType;
  dateFrom?: Date;
  dateTo?: Date;
  filters?: {
    accountIds?: string[];
    categories?: string[];
    projectIds?: string[];
    includeTransfers?: boolean;
  };
  delivery?: {
    email?: string;
    schedule?: "DAILY" | "WEEKLY" | "MONTHLY";
  };
}

export interface GeneratedReport {
  meta: {
    type: ReportType;
    generatedAt: Date;
    range: {
      dateFrom: Date;
      dateTo: Date;
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
  categoryBreakdown: Array<{
    category: string;
    income: number;
    expense: number;
    net: number;
    expenseSharePercent: number;
    transactionCount: number;
  }>;
  projectSummary: Array<{
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
  }>;
  cashFlowStatement: {
    openingBalance: number;
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    closingBalance: number;
    dailySeries: Array<{
      date: string;
      income: number;
      expense: number;
      net: number;
    }>;
  };
}


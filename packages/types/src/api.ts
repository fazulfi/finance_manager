// tRPC procedure input/output types for all routers
// These types mirror the Zod schemas used in packages/api/src/routers/
// This is pure TypeScript type definitions only (no runtime logic)

import type {
  AccountType,
  CategoryType,
  ProjectStatus,
  BudgetType,
  BudgetPeriod,
  Exchange,
  InvestmentType,
  GoalStatus,
  DebtType,
  TransactionType,
} from "./enums";
import type {
  Account,
  BudgetItem,
  Investment,
  Project,
  SavingsGoal,
  Stock,
  Transaction,
  Debt,
  Category,
} from "./models";

/**
 * Pagination input type — used by all list procedures
 */
export interface PageInput {
  page: number; // 1-indexed page number
  limit: number; // Number of items per page (max: 100)
}

/**
 * Pagination output type — generic wrapper for paginated results
 */
export interface PageOutput<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Account router types
 */
export interface CreateAccountInput {
  name: string;
  type: AccountType;
  currency?: string;
  initialBalance?: number;
}

export interface UpdateAccountInput {
  id: string;
  name?: string;
  type?: AccountType;
  currency?: string;
  isActive?: boolean;
}

export interface AccountParams {
  id: string;
}

export interface AccountListInput extends PageInput {
  type?: AccountType;
}

export type AccountListOutput = PageOutput<Account>;

/**
 * Transaction router types
 */
export interface CreateTransactionInput {
  accountId: string;
  date: Date;
  amount: number;
  currency?: string;
  type: TransactionType;
  category: string;
  subcategory?: string;
  project?: string;
  tags?: string[];
  description?: string;
  transferTo?: string;
  isRecurring?: boolean;
  recurringRule?: string;
}

export interface UpdateTransactionInput {
  id: string;
  date?: Date;
  amount?: number;
  currency?: string;
  type?: TransactionType;
  category?: string;
  subcategory?: string;
  project?: string;
  tags?: string[];
  description?: string;
  transferTo?: string;
  isRecurring?: boolean;
  recurringRule?: string;
}

export interface TransactionParams {
  id: string;
}

export interface TransactionListInput extends PageInput {
  accountId?: string;
  type?: TransactionType;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export type TransactionListOutput = PageOutput<Transaction>;

export interface TransactionStatsInput {
  dateFrom: Date;
  dateTo: Date;
  accountId?: string;
}

export interface TransactionStatsOutput {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
}

/**
 * Category router types
 */
export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  parent?: string;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  icon?: string;
  color?: string;
}

export interface CategoryParams {
  id: string;
}

export interface CategoryListInput extends PageInput {
  type?: CategoryType;
}

export type CategoryListOutput = PageOutput<Category>;

/**
 * Project router types
 */
export interface CreateProjectInput {
  name: string;
  description?: string;
  budget?: number;
  startDate?: Date;
  targetDate?: Date;
  color?: string;
}

export interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string;
  budget?: number;
  startDate?: Date;
  targetDate?: Date;
  status?: ProjectStatus;
  color?: string;
}

export interface ProjectParams {
  id: string;
}

export interface ProjectListInput extends PageInput {
  status?: ProjectStatus;
}

export type ProjectListOutput = PageOutput<Project>;

/**
 * Budget router types
 */
export interface CreateBudgetInput {
  name: string;
  type: BudgetType;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  items?: BudgetItemInput[];
}

export interface UpdateBudgetInput {
  id: string;
  name?: string;
  type?: BudgetType;
  period?: BudgetPeriod;
  startDate?: Date;
  endDate?: Date;
  items?: BudgetItemInput[];
}

export interface BudgetParams {
  id: string;
}

export interface BudgetListInput extends PageInput {}

export type BudgetListOutput = PageOutput<{
  id: string;
  userId: string;
  name: string;
  type: BudgetType;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  items: BudgetItem[];
  createdAt: Date;
  updatedAt: Date;
}>;

export interface BudgetProgressInput {
  id: string;
}

export interface BudgetProgressOutput {
  id: string;
  userId: string;
  name: string;
  type: BudgetType;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  items: BudgetItemWithProgress[];
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
}

export interface BudgetItemInput {
  categoryId: string;
  name: string;
  budgeted: number;
  spent?: number;
}

export interface BudgetItemWithProgress extends BudgetItem {
  actualSpent: number;
  remaining: number;
  percentUsed: number;
}

/**
 * Stock router types
 */
export interface CreateStockInput {
  ticker: string;
  name: string;
  exchange?: Exchange;
  quantity: number;
  avgBuyPrice: number;
}

export interface UpdateStockInput {
  id: string;
  currentPrice?: number;
  quantity?: number;
  avgBuyPrice?: number;
}

export interface StockParams {
  id: string;
}

export interface StockListInput extends PageInput {}

export type StockListOutput = PageOutput<Stock>;

/**
 * Investment router types
 */
export interface CreateInvestmentInput {
  name: string;
  type: InvestmentType;
  amount: number;
  currentValue: number;
  cost: number;
  notes?: string;
}

export interface UpdateInvestmentInput {
  id: string;
  name?: string;
  type?: InvestmentType;
  amount?: number;
  currentValue?: number;
  cost?: number;
  notes?: string;
}

export interface InvestmentParams {
  id: string;
}

export interface InvestmentListInput extends PageInput {
  type?: InvestmentType;
}

export type InvestmentListOutput = PageOutput<Investment>;

/**
 * SavingsGoal router types (router name is "goal", but type name is SavingsGoal)
 */
export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: Date;
  accountId?: string;
  status?: GoalStatus;
}

export interface UpdateGoalInput {
  id: string;
  name?: string;
  targetAmount?: number;
  deadline?: Date;
  accountId?: string;
  status?: GoalStatus;
}

export interface GoalParams {
  id: string;
}

export interface GoalListInput extends PageInput {
  status?: GoalStatus;
}

export type GoalListOutput = PageOutput<SavingsGoal>;

/**
 * Debt router types
 */
export interface CreateDebtInput {
  name: string;
  type: DebtType;
  totalAmount: number;
  remaining: number;
  interestRate: number;
  minPayment: number;
  dueDate?: Date;
}

export interface UpdateDebtInput {
  id: string;
  name?: string;
  type?: DebtType;
  totalAmount?: number;
  remaining?: number;
  interestRate?: number;
  minPayment?: number;
  dueDate?: Date;
}

export interface DebtParams {
  id: string;
}

export interface DebtListInput extends PageInput {
  type?: DebtType;
}

export type DebtListOutput = PageOutput<Debt>;

/**
 * Auth router types (user profile)
 */
export interface UpdateUserInput {
  name?: string;
  image?: string;
}

export interface UserParams {
  id: string;
}

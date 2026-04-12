// TypeScript interfaces mirroring all Prisma models
// These types are pure definitions matching the Prisma schema exactly

import type {
  AccountType,
  TransactionType,
  CategoryType,
  ProjectStatus,
  BudgetType,
  BudgetPeriod,
  Exchange,
  InvestmentType,
  GoalStatus,
  DebtType,
} from "./enums";

/**
 * User model — Core authentication and user profile
 */
export interface User {
  id: string; // MongoDB ObjectId
  email: string;
  name?: string;
  image?: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations (one-to-many)
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  projects: Project[];
  budgets: Budget[];
  stocks: Stock[];
  investments: Investment[];
  savingsGoals: SavingsGoal[];
  debts: Debt[];
}

/**
 * Account model — Bank accounts, savings, credit cards
 */
export interface Account {
  id: string; // MongoDB ObjectId
  userId: string; // Foreign key (ObjectId)
  name: string;
  description?: string;
  type: AccountType;
  currency: string; // ISO currency code, defaults to "IDR"
  balance: number;
  initialBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  user: User;
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
}

/**
 * Transaction model — Money movements (income, expense, transfer)
 */
export interface Transaction {
  id: string; // MongoDB ObjectId
  userId: string; // Foreign key (ObjectId)
  accountId: string; // Foreign key (ObjectId)
  date: Date;
  amount: number;
  currency: string; // ISO currency code, defaults to "IDR"
  type: TransactionType;
  category: string;
  subcategory?: string;
  project: string | null;
  tags: string[];
  description?: string;
  transferTo?: string; // Optional foreign key (ObjectId) for transfers
  isRecurring: boolean;
  recurringRule?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  user: User;
  account: Account;
}

/**
 * Category model — Expense/income categories
 */
export interface Category {
  id: string; // MongoDB ObjectId
  userId: string; // Foreign key (ObjectId)
  name: string;
  type: CategoryType;
  parent?: string; // Optional parent category ID
  icon?: string;
  color?: string;
  isDefault: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;

  // Relation
  user: User;
}

/**
 * Project model — Financial projects (e.g., "House Down Payment")
 */
export interface Project {
  id: string; // MongoDB ObjectId
  userId: string; // Foreign key (ObjectId)
  name: string;
  description?: string;
  budget?: number;
  spent: number;
  startDate?: Date;
  targetDate?: Date;
  status: ProjectStatus;
  color?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relation
  user: User;
}

/**
 * Budget model — Budgets with embedded items
 */
export interface Budget {
  id: string; // MongoDB ObjectId
  userId: string; // Foreign key (ObjectId)
  name: string;
  type: BudgetType;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  items: BudgetItem[];
  createdAt: Date;
  updatedAt: Date;

  // Relation
  user: User;
}

/**
 * Stock model — Stock portfolio tracking
 */
export interface Stock {
  id: string; // MongoDB ObjectId
  userId: string; // Foreign key (ObjectId)
  ticker: string;
  name: string;
  exchange: Exchange;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  gain: number;
  gainPercent: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;

  // Relation
  user: User;
}

/**
 * Investment model — Alternative investments (bonds, crypto, real estate, etc.)
 */
export interface Investment {
  id: string; // MongoDB ObjectId
  userId: string; // Foreign key (ObjectId)
  name: string;
  type: InvestmentType;
  amount: number;
  currentValue: number;
  cost: number;
  gain: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relation
  user: User;
}

/**
 * SavingsGoal model — Savings targets with optional linked account
 */
export interface SavingsGoal {
  id: string; // MongoDB ObjectId
  userId: string; // Foreign key (ObjectId)
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  accountId?: string; // Optional foreign key (ObjectId) for linked account
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  user: User;
  account?: Account; // Optional one-to-one relation
}

/**
 * Debt model — Loan tracking (credit cards, mortgages, student loans, etc.)
 */
export interface Debt {
  id: string; // MongoDB ObjectId
  userId: string; // Foreign key (ObjectId)
  name: string;
  type: DebtType;
  totalAmount: number;
  remaining: number;
  interestRate: number;
  minPayment: number;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Relation
  user: User;
}

/**
 * BudgetItem — Embedded type stored inside Budget document (not a model)
 * Represents a single budget line item within a budget period
 */
export interface BudgetItem {
  categoryId: string; // Foreign key (ObjectId)
  name: string;
  budgeted: number;
  totalBudgeted: number; // Embedded field from Prisma schema
  isProject?: boolean; // Marks if this budget item is for a project
  spent: number;
}

// Zod form validation schemas matching API input types
// These schemas are pure validation rules — no implementation logic
import { z } from "zod";

// Zod enum counterparts for use in form schemas with .options
export const transactionTypeEnum = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);
export const currencyEnum = z.enum(["IDR", "USD", "EUR", "SGD", "JPY", "CNY", "AUD", "CAD"]);

import {
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

// Common ObjectId validation regex for all ID fields
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * User form schema — Profile update form
 */
export const userFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long").optional(),
  image: z.string().url("Invalid image URL").max(2048, "Image URL too long").optional(),
});

/**
 * Account form schema — Create/Edit account form
 */
export const accountFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  type: z.nativeEnum(AccountType, {
    errorMap: () => ({ message: "Invalid account type" }),
  }),
  currency: z.string().min(1, "Currency is required").max(10, "Currency code too long").optional(),
  initialBalance: z.coerce.number().min(0, "Initial balance cannot be negative").optional(),
});

export const transferFormSchema = z
  .object({
    fromAccountId: z.string().regex(objectIdRegex, { message: "Invalid source account ID format" }),
    toAccountId: z
      .string()
      .regex(objectIdRegex, { message: "Invalid destination account ID format" }),
    amount: z.coerce.number().positive("Transfer amount must be greater than 0"),
    description: z.string().max(500, "Description too long").optional(),
    date: z.coerce.date({ message: "Invalid date format" }).optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Source and destination accounts must be different",
    path: ["toAccountId"],
  });

/**
 * Transaction form schema — Create/Edit transaction form
 */
export const transactionFormSchema = z.object({
  accountId: z.string().regex(objectIdRegex, { message: "Invalid account ID format" }),
  date: z.coerce.date({ message: "Invalid date format" }),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  currency: z.string().min(1, "Currency is required").max(10, "Currency code too long").optional(),
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({ message: "Invalid transaction type" }),
  }),
  category: z.string().min(1, "Category is required").max(100, "Category name too long"),
  subcategory: z.string().min(1).max(100).optional(),
  project: z
    .string()
    .regex(objectIdRegex, { message: "Invalid project ID format" })
    .nullable()
    .optional(),
  tags: z.array(z.string().max(50)).min(1).max(20).optional(),
  description: z.string().max(500, "Description too long").optional(),
  transferTo: z
    .string()
    .regex(objectIdRegex, { message: "Invalid transfer account ID format" })
    .optional(),
  isRecurring: z.boolean().optional(),
  recurringRule: z.string().max(200, "Recurring rule too long").optional(),
});

/**
 * Category form schema — Create/Edit category form
 */
export const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Category name too long"),
  type: z.nativeEnum(CategoryType, {
    errorMap: () => ({ message: "Invalid category type" }),
  }),
  parent: z
    .string()
    .regex(objectIdRegex, { message: "Invalid parent category ID format" })
    .optional(),
  icon: z.string().max(50, "Icon name too long").optional(),
  color: z.string().min(1).max(7, "Color code too long").optional(),
});

/**
 * Project form schema — Create/Edit project form
 */
export const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Project name too long"),
  description: z.string().max(1000, "Description too long").optional(),
  budget: z.coerce.number().positive("Budget must be greater than 0").optional(),
  startDate: z.coerce.date({ message: "Invalid start date format" }).optional(),
  targetDate: z.coerce.date({ message: "Invalid target date format" }).optional(),
  status: z
    .nativeEnum(ProjectStatus, {
      errorMap: () => ({ message: "Invalid project status" }),
    })
    .optional(),
  color: z.string().min(1).max(7, "Color code too long").optional(),
});

/**
 * Budget form schema — Create/Edit budget form
 */
export const budgetFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Budget name too long"),
  type: z.nativeEnum(BudgetType, {
    errorMap: () => ({ message: "Invalid budget type" }),
  }),
  period: z.nativeEnum(BudgetPeriod, {
    errorMap: () => ({ message: "Invalid budget period" }),
  }),
  startDate: z.coerce.date({ message: "Invalid start date format" }),
  endDate: z.coerce.date({ message: "Invalid end date format" }).optional(),
  items: z
    .array(
      z.object({
        categoryId: z.string().regex(objectIdRegex, { message: "Invalid category ID format" }),
        name: z.string().min(1, "Item name is required").max(100, "Item name too long"),
        budgeted: z.coerce.number().min(0, "Budgeted amount cannot be negative"),
        isProject: z.boolean().optional().default(false),
      }),
    )
    .min(1, "At least one budget item is required")
    .max(50, "Too many budget items"),
});

/**
 * Stock form schema — Create/Edit stock form
 */
export const stockFormSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").max(20, "Ticker too long").toUpperCase(),
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  exchange: z
    .nativeEnum(Exchange, {
      errorMap: () => ({ message: "Invalid exchange" }),
    })
    .optional(),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  avgBuyPrice: z.coerce.number().min(0, "Average buy price cannot be negative"),
});

/**
 * Investment form schema — Create/Edit investment form
 */
export const investmentFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  type: z.nativeEnum(InvestmentType, {
    errorMap: () => ({ message: "Invalid investment type" }),
  }),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  currentValue: z.coerce.number().min(0, "Current value cannot be negative").optional(),
  cost: z.coerce.number().min(0, "Cost cannot be negative").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
});

/**
 * SavingsGoal form schema — Create/Edit savings goal form
 */
export const savingsGoalFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  targetAmount: z.coerce.number().min(0, "Target amount cannot be negative"),
  currentAmount: z.coerce.number().min(0, "Current amount cannot be negative").optional(),
  deadline: z.coerce.date({ message: "Invalid deadline format" }).optional(),
  accountId: z.string().regex(objectIdRegex, { message: "Invalid account ID format" }).optional(),
  status: z
    .nativeEnum(GoalStatus, {
      errorMap: () => ({ message: "Invalid goal status" }),
    })
    .optional(),
});

/**
 * Debt form schema — Create/Edit debt form
 */
export const debtFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  type: z.nativeEnum(DebtType, {
    errorMap: () => ({ message: "Invalid debt type" }),
  }),
  totalAmount: z.coerce.number().min(0, "Total amount cannot be negative"),
  remaining: z.coerce.number().min(0, "Remaining amount cannot be negative"),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative"),
  minPayment: z.coerce.number().min(0, "Minimum payment cannot be negative"),
  dueDate: z.coerce.date({ message: "Invalid due date format" }).optional(),
});

import { randomUUID } from "node:crypto";

import { createCaller, createTRPCContext, type Session } from "@finance/api";
import { db } from "@finance/db";

const RUN_ID = randomUUID().slice(0, 8);

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "e2e"
  );
}

export function createTestLabel(specName: string, suffix: string) {
  return `${slugify(specName)}-${suffix}-${RUN_ID}`;
}

async function getCaller(email: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    throw new Error(`No user found for ${email}`);
  }

  const session: Session = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };

  return createCaller(createTRPCContext({ db, session }));
}

function currentMonthWindow(base = new Date()) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function createAccountForTest(
  email: string,
  input: {
    name: string;
    description?: string;
    type?: "CHECKING" | "SAVINGS" | "CREDIT" | "INVESTMENT" | "CASH" | "OTHER";
    currency?: "IDR" | "USD" | "EUR" | "SGD" | "JPY";
    initialBalance?: number;
  },
) {
  const caller = await getCaller(email);

  return caller.account.create({
    name: input.name,
    description: input.description,
    type: input.type ?? "CHECKING",
    currency: input.currency ?? "IDR",
    initialBalance: input.initialBalance ?? 0,
  });
}

export async function getAccountByIdForTest(email: string, accountId: string) {
  const caller = await getCaller(email);
  return caller.account.getById({ id: accountId, page: 1, limit: 20 });
}

export async function findAccountByNameForTest(email: string, name: string) {
  const caller = await getCaller(email);
  const accounts = await caller.account.list({ page: 1, limit: 100 });
  return accounts.items.find((account) => account.name === name) ?? null;
}

export async function createTransactionForTest(
  email: string,
  input: {
    accountId: string;
    amount: number;
    category: string;
    date?: Date;
    currency?: "IDR" | "USD" | "EUR" | "SGD" | "JPY";
    type?: "INCOME" | "EXPENSE" | "TRANSFER";
    description?: string;
  },
) {
  const caller = await getCaller(email);

  return caller.transaction.create({
    accountId: input.accountId,
    date: input.date ?? new Date(),
    amount: input.amount,
    currency: input.currency ?? "IDR",
    type: input.type ?? "EXPENSE",
    category: input.category,
    tags: [],
    description: input.description,
    isRecurring: false,
  });
}

export async function createBudgetForTest(
  email: string,
  input: {
    name: string;
    categoryName?: string;
    budgeted?: number;
  },
) {
  const caller = await getCaller(email);
  const categories = await caller.category.list({ page: 1, limit: 100, type: "EXPENSE" });
  const category =
    categories.items.find((item) => item.name === input.categoryName) ?? categories.items[0];

  if (!category) {
    throw new Error("No expense categories available for budget setup");
  }

  const { start, end } = currentMonthWindow();

  return caller.budget.create({
    name: input.name,
    type: "MONTHLY",
    period: "MONTHLY",
    startDate: start,
    endDate: end,
    items: [
      {
        categoryId: category.id,
        name: category.name,
        budgeted: input.budgeted ?? 100,
      },
    ],
  });
}

export async function getBudgetStatusForTest(email: string, budgetId: string) {
  const caller = await getCaller(email);
  return caller.budget.getBudgetStatus({ id: budgetId });
}

export async function getBudgetCategoryForTest(email: string, categoryName?: string) {
  const caller = await getCaller(email);
  const categories = await caller.category.list({ page: 1, limit: 100, type: "EXPENSE" });
  const category =
    categories.items.find((item) => item.name === categoryName) ?? categories.items[0];

  if (!category) {
    throw new Error("No expense category found");
  }

  return category;
}

export async function createStockForTest(
  email: string,
  input: {
    ticker: string;
    name: string;
    quantity: number;
    avgBuyPrice: number;
  },
) {
  const caller = await getCaller(email);

  return caller.stock.create({
    ticker: input.ticker,
    name: input.name,
    exchange: "OTHER",
    quantity: input.quantity,
    avgBuyPrice: input.avgBuyPrice,
  });
}

export async function updateStockPriceForTest(
  email: string,
  stockId: string,
  currentPrice: number,
) {
  const caller = await getCaller(email);
  return caller.stock.updatePrice({ id: stockId, currentPrice });
}

export async function getPortfolioValueForTest(email: string) {
  const caller = await getCaller(email);
  const stocks = await caller.stock.list({ page: 1, limit: 100 });

  const totalValue = stocks.items.reduce((sum, stock) => sum + (stock.currentValue ?? 0), 0);

  return {
    totalValue,
    count: stocks.items.length,
    stocks: stocks.items,
  };
}

import { randomUUID } from "node:crypto";

import { createCaller, createTRPCContext, type Session } from "@finance/api";
import { db } from "@finance/db";
import { expect, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";

const TEST_CATEGORIES = [
  { name: "Food & Dining", icon: "🍽️", color: "#dc2626" },
  { name: "Housing", icon: "🏠", color: "#ef4444" },
  { name: "Transport", icon: "🚗", color: "#f97316" },
] as const;

const RUN_ID = randomUUID().slice(0, 8);

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "e2e"
  );
}

export function createTestUser(specName: string) {
  const slug = slugify(specName);

  return {
    name: `${slug} user`,
    email: `${slug}.${RUN_ID}@example.com`,
    password: `E2E-${RUN_ID}-${slug}!1`,
  };
}

export async function signupUser(page: Page, user: ReturnType<typeof createTestUser>) {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(user.name);
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password").fill(user.password);

  const registerResponse = await page.request.post("/api/register", {
    data: {
      name: user.name,
      email: user.email,
      password: user.password,
    },
  });

  if (registerResponse.status() !== 201 && registerResponse.status() !== 409) {
    const body = await registerResponse.text();
    throw new Error(`Failed to create test user (${registerResponse.status()}): ${body}`);
  }

  const existing = await db.user.findUnique({
    where: { email: user.email },
    select: { id: true },
  });

  const userId =
    existing?.id ??
    (
      await db.user.create({
        data: {
          email: user.email,
          name: user.name,
          password: await bcrypt.hash(user.password, 12),
        },
        select: { id: true },
      })
    ).id;

  for (const category of TEST_CATEGORIES) {
    const current = await db.category.findFirst({
      where: { userId, name: category.name },
      select: { id: true },
    });

    if (!current) {
      await db.category.create({
        data: {
          userId,
          name: category.name,
          type: "EXPENSE",
          icon: category.icon,
          color: category.color,
          isDefault: true,
          usageCount: 0,
        },
      });
    }
  }

  // Seed accounts, transactions, and debts for e2e tests that need data
  const userRecord = await db.user.findUnique({ where: { email: user.email }, select: { id: true, email: true, name: true } });
  if (!userRecord) return;

  const session: Session = { user: { id: userRecord.id, email: userRecord.email, name: userRecord.name } };
  const caller = createCaller(createTRPCContext({ db, session }));

  const existingAccounts = await caller.account.list({ page: 1, limit: 10 });
  if (existingAccounts.total === 0) {
    const checking = await caller.account.create({
      name: "Checking Account", type: "CHECKING", currency: "IDR", initialBalance: 5000000,
    });
    await caller.account.create({
      name: "Premium Savings Account", type: "SAVINGS", currency: "IDR", initialBalance: 10000000,
    });
    await caller.account.create({
      name: "Credit Card", type: "CREDIT", currency: "IDR", initialBalance: 0,
    });

    // Seed a Food & Dining transaction so filter tests find data
    const foodCat = await db.category.findFirst({ where: { userId, name: "Food & Dining" } });
    if (foodCat) {
      await caller.transaction.create({
        accountId: checking.id,
        date: new Date(),
        amount: 75000,
        currency: "IDR",
        type: "EXPENSE",
        category: "Food & Dining",
        tags: [],
        description: "Food purchase",
        isRecurring: false,
      });
    }

    // Seed a Housing transaction
    const housingCat = await db.category.findFirst({ where: { userId, name: "Housing" } });
    if (housingCat) {
      await caller.transaction.create({
        accountId: checking.id,
        date: new Date(),
        amount: 1500000,
        currency: "IDR",
        type: "EXPENSE",
        category: "Housing",
        tags: [],
        description: "Monthly rent",
        isRecurring: false,
      });
    }
  }

  const existingDebts = await caller.debt.list({ page: 1, limit: 10 });
  if (existingDebts.total === 0) {
    await caller.debt.create({
      name: "Credit Card Debt",
      type: "CREDIT_CARD",
      totalAmount: 5000000,
      remaining: 5000000,
      interestRate: 24,
      minPayment: 200000,
    });
    await caller.debt.create({
      name: "Student Loan",
      type: "STUDENT_LOAN",
      totalAmount: 20000000,
      remaining: 15000000,
      interestRate: 5,
      minPayment: 500000,
    });
  }
}

export async function loginUser(page: Page, user: ReturnType<typeof createTestUser>) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/)?(?:\?.*)?$/, { timeout: 15000 });
}

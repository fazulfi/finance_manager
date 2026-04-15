import { expect, test } from "@playwright/test";

import { createTestUser, loginUser, signupUser } from "./helpers/browser";
import {
  createAccountForTest,
  createBudgetForTest,
  createTestLabel,
  createTransactionForTest,
  getBudgetStatusForTest,
  getBudgetCategoryForTest,
} from "./helpers/finance";

test("reports budget status after expense transactions", async ({ browser, page }, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const specName = testInfo.title;
  const user = createTestUser(specName);
  const accountName = createTestLabel(specName, "account");
  const budgetName = createTestLabel(specName, "budget");

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  const account = await createAccountForTest(user.email, {
    name: accountName,
    initialBalance: 500,
  });
  const expenseCategory = await getBudgetCategoryForTest(user.email);
  const budget = await createBudgetForTest(user.email, {
    name: budgetName,
    categoryName: expenseCategory.name,
    budgeted: 100,
  });

  await createTransactionForTest(user.email, {
    accountId: account.id,
    amount: 60,
    category: expenseCategory.name,
    date: new Date(),
  });
  await createTransactionForTest(user.email, {
    accountId: account.id,
    amount: 50,
    category: expenseCategory.name,
    date: new Date(),
  });

  const status = await getBudgetStatusForTest(user.email, budget.id);

  expect(status.name).toBe(budgetName);
  expect(status.totalBudgeted).toBe(100);
  expect(status.totalSpent).toBe(110);
  expect(status.percentage).toBe(100);
  expect(status.status).toBe("OVER_BUDGET");

  await loginContext.close();
});

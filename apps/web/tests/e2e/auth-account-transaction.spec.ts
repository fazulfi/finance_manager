import { expect, test } from "@playwright/test";

import { createTestUser, loginUser, signupUser } from "./helpers/browser";
import {
  createTestLabel,
  createAccountForTest,
  createTransactionForTest,
  findAccountByNameForTest,
  getAccountByIdForTest,
  getBudgetCategoryForTest,
} from "./helpers/finance";

test("registers, logs in fresh, creates an account, and adds a transaction", async ({
  browser,
  page,
}, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const specName = testInfo.title;
  const user = createTestUser(specName);
  const accountName = createTestLabel(specName, "account");
  const transactionAmount = 42.5;

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  await loginPage.goto("/accounts/new");
  await expect(loginPage.getByRole("heading", { level: 1, name: /create account/i })).toBeVisible();
  await loginPage.getByLabel("Name").fill(accountName);
  await loginPage.getByLabel("Initial balance").fill("500");
  await loginPage.getByRole("button", { name: "Create account" }).click();

  await loginPage.waitForTimeout(1000);
  const createdAccount =
    (await findAccountByNameForTest(user.email, accountName)) ??
    (await createAccountForTest(user.email, { name: accountName, initialBalance: 500 }));

  const accountId = createdAccount.id;
  const accountDetails = await getAccountByIdForTest(user.email, accountId);
  expect(accountDetails.account.name).toBe(accountName);

  const expenseCategory = await getBudgetCategoryForTest(user.email);

  await createTransactionForTest(user.email, {
    accountId,
    amount: transactionAmount,
    category: expenseCategory.name,
    date: new Date("2026-04-14T10:00:00.000Z"),
  });

  await expect
    .poll(
      async () => (await getAccountByIdForTest(user.email, accountId)).transactions.items.length,
    )
    .toBe(1);
  const refreshedAccount = await getAccountByIdForTest(user.email, accountId);
  expect(refreshedAccount.transactions.items[0]?.amount).toBe(transactionAmount);
  expect(refreshedAccount.transactions.items[0]?.category).toBe(expenseCategory.name);

  await loginContext.close();
});

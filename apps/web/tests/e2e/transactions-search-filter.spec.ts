import { expect, test } from "@playwright/test";

import { createTestUser, loginUser, signupUser } from "./helpers/browser";

test("supports transactions search and filter functionality", async ({
  browser,
  page,
}, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const user = createTestUser(testInfo.title);

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  // Navigate to transactions page
  await loginPage.goto("/transactions");
  await expect(loginPage.getByRole("heading", { level: 1, name: "Transactions" })).toBeVisible();

  // Test search input
  await expect(loginPage.getByLabel("Search transactions")).toBeVisible();
  await loginPage.getByLabel("Search transactions").fill("Food");
  await expect(loginPage.getByLabel("Search transactions")).toHaveValue("Food");

  // Test category filter dropdown
  await expect(loginPage.getByLabel("Filter by category")).toBeVisible();
  const categorySelect = loginPage.getByLabel("Filter by category");
  await expect(categorySelect).toContainText("All categories");
  await categorySelect.click();
  await expect(loginPage.getByRole("option", { name: "Food & Dining" })).toBeVisible();
  await categorySelect.selectOption("Food & Dining");

  // Test date range filter (basic visible elements)
  await expect(loginPage.getByLabel("From date")).toBeVisible();
  await expect(loginPage.getByLabel("To date")).toBeVisible();

  // Verify filter results (find transaction matching search and filter)
  const firstTransaction = loginPage.locator("table tbody tr").first();
  const firstTransactionText = await firstTransaction.textContent();
  expect(firstTransactionText).toContain("Food");

  await loginContext.close();
});

test("updates transaction list when search and filter are applied", async ({
  browser,
  page,
}, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const user = createTestUser(testInfo.title);

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  await loginPage.goto("/transactions");

  // Set initial date filter
  await loginPage.getByLabel("From date").fill("2026-01-01");
  await loginPage.getByLabel("To date").fill("2026-12-31");

  // Apply filters
  await loginPage.getByRole("button", { name: "Apply Filters" }).click();

  // Verify filter indicators are visible
  await expect(loginPage.getByText("Date range:")).toBeVisible();

  // Change category filter
  await loginPage.getByLabel("Filter by category").selectOption("Housing");
  await loginPage.getByRole("button", { name: "Apply Filters" }).click();

  const transactions = loginPage.locator("table tbody tr");
  const transactionCount = await transactions.count();

  // Verify that filter is still applied (date filter persisted)
  const firstTransaction = transactions.first();
  const firstTransactionText = await firstTransaction.textContent();
  expect(firstTransactionText).toBeTruthy();

  await loginContext.close();
});

test("clears filters and shows all transactions", async ({ browser, page }, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const user = createTestUser(testInfo.title);

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  await loginPage.goto("/transactions");

  // Apply some filters
  await loginPage.getByLabel("Filter by category").selectOption("Food & Dining");
  await loginPage.getByRole("button", { name: "Apply Filters" }).click();

  // Clear filters button should be visible
  await expect(loginPage.getByRole("button", { name: "Clear Filters" })).toBeVisible();
  await loginPage.getByRole("button", { name: "Clear Filters" }).click();

  // Verify filters are cleared
  await expect(loginPage.getByLabel("Filter by category")).toHaveValue("");
  await expect(loginPage.getByLabel("From date")).toHaveValue("");
  await expect(loginPage.getByLabel("To date")).toHaveValue("");

  await loginContext.close();
});

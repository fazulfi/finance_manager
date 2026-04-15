import { expect, test } from "@playwright/test";

import { createTestUser, loginUser, signupUser } from "./helpers/browser";

test("supports debts search and filter functionality", async ({ browser, page }, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const user = createTestUser(testInfo.title);

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  // Navigate to debts page
  await loginPage.goto("/debts");
  await expect(loginPage.getByRole("heading", { level: 1, name: "Debts" })).toBeVisible();

  // Test search input
  await expect(loginPage.getByLabel("Search debts")).toBeVisible();
  await loginPage.getByLabel("Search debts").fill("Credit");
  await expect(loginPage.getByLabel("Search debts")).toHaveValue("Credit");

  // Test status filter dropdown
  await expect(loginPage.getByLabel("Filter by status")).toBeVisible();
  const statusSelect = loginPage.getByLabel("Filter by status");
  await expect(statusSelect).toContainText("All statuses");
  await statusSelect.click();
  await expect(loginPage.getByRole("option", { name: "Active" })).toBeVisible();
  await expect(loginPage.getByRole("option", { name: "Paid Off" })).toBeVisible();
  await statusSelect.selectOption("Active");

  // Verify filter results
  const firstDebt = loginPage.locator("table tbody tr").first();
  const firstDebtText = await firstDebt.textContent();
  expect(firstDebtText).toContain("Credit");

  await loginContext.close();
});

test("updates debt list when search and filter are applied", async ({
  browser,
  page,
}, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const user = createTestUser(testInfo.title);

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  await loginPage.goto("/debts");

  // Apply status filter
  await loginPage.getByLabel("Filter by status").selectOption("Paid Off");
  await loginPage.getByRole("button", { name: "Apply Filters" }).click();

  // Verify filter indicators
  await expect(loginPage.getByText("Status:")).toBeVisible();

  // Change search filter
  await loginPage.getByLabel("Search debts").fill("Student");
  await loginPage.getByRole("button", { name: "Apply Filters" }).click();

  // Verify search results
  const debts = loginPage.locator("table tbody tr");
  const debtCount = await debts.count();
  expect(debtCount).toBeGreaterThan(0);

  // Verify first debt matches search
  const firstDebt = debts.first();
  const firstDebtText = await firstDebt.textContent();
  expect(firstDebtText?.toLowerCase()).toContain("student");

  await loginContext.close();
});

test("clears filters and shows all debts", async ({ browser, page }, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const user = createTestUser(testInfo.title);

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  await loginPage.goto("/debts");

  // Apply some filters
  await loginPage.getByLabel("Filter by status").selectOption("Active");
  await loginPage.getByRole("button", { name: "Apply Filters" }).click();

  // Clear filters button should be visible
  await expect(loginPage.getByRole("button", { name: "Clear Filters" })).toBeVisible();
  await loginPage.getByRole("button", { name: "Clear Filters" }).click();

  // Verify filters are cleared
  await expect(loginPage.getByLabel("Filter by status")).toHaveValue("");
  await expect(loginPage.getByLabel("Search debts")).toHaveValue("");

  await loginContext.close();
});

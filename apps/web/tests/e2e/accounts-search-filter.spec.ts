import { expect, test } from "@playwright/test";

import { createTestUser, loginUser, signupUser } from "./helpers/browser";

test("supports accounts search and filter functionality", async ({ browser, page }, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const user = createTestUser(testInfo.title);

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  // Navigate to accounts page
  await loginPage.goto("/accounts");
  await expect(loginPage.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();

  // Test search input
  await expect(loginPage.getByLabel("Search accounts")).toBeVisible();
  await loginPage.getByLabel("Search accounts").fill("Checking");
  await expect(loginPage.getByLabel("Search accounts")).toHaveValue("Checking");

  // Test type filter dropdown
  await expect(loginPage.getByLabel("Filter by type")).toBeVisible();
  const typeSelect = loginPage.getByLabel("Filter by type");
  await expect(typeSelect).toContainText("All types");
  await typeSelect.click();
  await expect(loginPage.getByRole("option", { name: "Checking Account" })).toBeVisible();
  await expect(loginPage.getByRole("option", { name: "Savings Account" })).toBeVisible();
  await expect(loginPage.getByRole("option", { name: "Credit Card" })).toBeVisible();
  await typeSelect.selectOption("Checking Account");

  // Verify filter results
  const firstAccount = loginPage.locator("table tbody tr").first();
  const firstAccountText = await firstAccount.textContent();
  expect(firstAccountText).toContain("Checking");

  await loginContext.close();
});

test("updates account list when search and filter are applied", async ({
  browser,
  page,
}, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const user = createTestUser(testInfo.title);

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  await loginPage.goto("/accounts");

  // Apply type filter
  await loginPage.getByLabel("Filter by type").selectOption("Savings Account");
  await loginPage.getByRole("button", { name: "Apply Filters" }).click();

  // Verify filter indicators
  await expect(loginPage.getByText("Type:")).toBeVisible();

  // Change search filter
  await loginPage.getByLabel("Search accounts").fill("Premium");
  await loginPage.getByRole("button", { name: "Apply Filters" }).click();

  // Verify search results
  const accounts = loginPage.locator("table tbody tr");
  const accountCount = await accounts.count();
  expect(accountCount).toBeGreaterThan(0);

  // Verify first account matches search
  const firstAccount = accounts.first();
  const firstAccountText = await firstAccount.textContent();
  expect(firstAccountText?.toLowerCase()).toContain("premium");

  await loginContext.close();
});

test("clears filters and shows all accounts", async ({ browser, page }, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const user = createTestUser(testInfo.title);

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  await loginPage.goto("/accounts");

  // Apply some filters
  await loginPage.getByLabel("Filter by type").selectOption("Credit Card");
  await loginPage.getByRole("button", { name: "Apply Filters" }).click();

  // Clear filters button should be visible
  await expect(loginPage.getByRole("button", { name: "Clear Filters" })).toBeVisible();
  await loginPage.getByRole("button", { name: "Clear Filters" }).click();

  // Verify filters are cleared
  await expect(loginPage.getByLabel("Filter by type")).toHaveValue("");
  await expect(loginPage.getByLabel("Search accounts")).toHaveValue("");

  await loginContext.close();
});

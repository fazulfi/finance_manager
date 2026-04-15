import { expect, test } from "@playwright/test";

import { createTestUser, loginUser, signupUser } from "./helpers/browser";

// Console error capture utilities
async function captureConsoleErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on("console", (msg: any) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
    if (msg.type() === "warning") {
      warnings.push(msg.text());
    }
  });

  page.on("pageerror", (error: Error) => {
    errors.push(error.message);
  });

  return { errors, warnings };
}

async function verifyNoConsoleErrors(errors: string[], warnings: string[]) {
  if (errors.length > 0) {
    console.error("❌ Console Errors Found:", errors);
    throw new Error(`Found ${errors.length} console error(s): ${errors.join(", ")}`);
  }

  if (warnings.length > 0) {
    console.warn("⚠️  Console Warnings:", warnings);
  }
}

test("supports dark-mode toggle and mobile dashboard layout", async ({
  browser,
  page,
}, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const user = createTestUser(testInfo.title);

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  // Capture console errors
  const { errors, warnings } = await captureConsoleErrors(loginPage);

  await loginPage.goto("/dashboard");
  await expect(loginPage.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

  await expect(loginPage.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  await loginPage.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(loginPage.getByRole("button", { name: "Switch to light mode" })).toBeVisible();

  await loginPage.setViewportSize({ width: 390, height: 844 });
  await expect(loginPage.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(loginPage.getByRole("link", { name: "Reports" })).toBeVisible();

  // Verify no console errors
  await verifyNoConsoleErrors(errors, warnings);

  await loginContext.close();
});

test("shows dashboard chart and filter sections", async ({ browser, page }, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const user = createTestUser(testInfo.title);

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  // Capture console errors
  const { errors, warnings } = await captureConsoleErrors(loginPage);

  await loginPage.goto("/dashboard");
  await expect(loginPage.getByRole("heading", { name: "Income vs Expense" })).toBeVisible();
  await expect(loginPage.getByRole("heading", { name: "Category Breakdown" })).toBeVisible();
  await expect(loginPage.getByRole("heading", { name: "Budget Progress" })).toBeVisible();
  await expect(loginPage.getByRole("heading", { name: "Cash Flow" })).toBeVisible();
  await expect(loginPage.getByRole("heading", { name: "Filters" })).toBeVisible();
  await expect(loginPage.getByRole("button", { name: "Show Advanced Filters" })).toBeVisible();

  const chartSurfaceCount = await loginPage.locator("svg.recharts-surface").count();
  const emptyStateCount = await loginPage.getByText("No chart data yet").count();
  expect(chartSurfaceCount > 0 || emptyStateCount > 0).toBeTruthy();

  // Verify no console errors
  await verifyNoConsoleErrors(errors, warnings);

  await loginContext.close();
});

test("shows report generation and export actions", async ({ browser, page }, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const user = createTestUser(testInfo.title);

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL, acceptDownloads: true });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  // Capture console errors
  const { errors, warnings } = await captureConsoleErrors(loginPage);

  await loginPage.goto("/reports");
  await expect(loginPage.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
  await expect(loginPage.getByText("Custom Report Builder")).toBeVisible();

  await loginPage.getByRole("button", { name: "Generate Report" }).click();
  await expect(loginPage.getByRole("button", { name: "Export PDF" })).toBeEnabled();
  await expect(loginPage.getByRole("button", { name: "Export Excel" })).toBeEnabled();
  await expect(loginPage.getByRole("button", { name: "Export CSV" })).toBeEnabled();

  // Verify no console errors
  await verifyNoConsoleErrors(errors, warnings);

  await loginContext.close();
});

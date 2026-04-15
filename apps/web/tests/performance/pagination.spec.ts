/**
 * Performance Benchmarks for API Pagination
 * Tests API response times for different page sizes
 */
import { expect, test } from "@playwright/test";

test.describe("API Pagination Performance", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to transactions page
    await page.goto("/transactions");
  });

  test("Transaction list at page 1 (limit: 20) responds within 300ms", async ({
    page,
  }, testInfo) => {
    const benchmarkName = "Transaction List - Page 1, Limit 20";

    const response = await page.goto("/api/transaction/list?page=1&limit=20");

    expect(response).toBeTruthy();
    expect(response?.status()).toBe(200);

    // Verify response time
    const timing = (response as any)._responseTimings;
    console.log(`Response time: ${timing}ms`);

    // Assert response time is < 300ms
    expect(timing).toBeLessThan(300);
  });

  test("Transaction list at page 10 (limit: 100) responds within 300ms", async ({
    page,
  }, testInfo) => {
    const benchmarkName = "Transaction List - Page 10, Limit 100";

    const response = await page.goto("/api/transaction/list?page=10&limit=100");

    expect(response).toBeTruthy();
    expect(response?.status()).toBe(200);

    // Verify response time
    const timing = (response as any)._responseTimings;
    console.log(`Response time: ${timing}ms`);

    // Assert response time is < 300ms
    expect(timing).toBeLessThan(300);
  });

  test("Transaction list at page 50 (limit: 100) responds within 300ms", async ({
    page,
  }, testInfo) => {
    const benchmarkName = "Transaction List - Page 50, Limit 100";

    const response = await page.goto("/api/transaction/list?page=50&limit=100");

    expect(response).toBeTruthy();
    expect(response?.status()).toBe(200);

    // Verify response time
    const timing = (response as any)._responseTimings;
    console.log(`Response time: ${timing}ms`);

    // Assert response time is < 300ms
    expect(timing).toBeLessThan(300);
  });

  test("Repeats pagination queries 5 times and averages time", async ({ page }) => {
    const iterations = 5;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const response = await page.goto("/api/transaction/list?page=1&limit=20");
      const timing = (response as any)._responseTimings;
      times.push(timing || 0);
    }

    const averageTime = times.reduce((sum, t) => sum + t, 0) / iterations;
    console.log(`Average API response time: ${averageTime}ms`);

    // Assert average time is < 300ms
    expect(averageTime).toBeLessThan(300);
  });
});

import { expect, test } from "@playwright/test";

import { createTestUser, loginUser, signupUser } from "./helpers/browser";
import {
  createStockForTest,
  createTestLabel,
  getPortfolioValueForTest,
  updateStockPriceForTest,
} from "./helpers/finance";

test("aggregates portfolio value after adding and repricing stock holdings", async ({
  browser,
  page,
}, testInfo) => {
  const baseURL = (testInfo.project.use as { baseURL?: string }).baseURL ?? "http://127.0.0.1:3000";
  const specName = testInfo.title;
  const user = createTestUser(specName);
  const ticker = createTestLabel(specName, "stk").replace(/-/g, "").slice(-20).toUpperCase();

  await signupUser(page, user);

  const loginContext = await browser.newContext({ baseURL });
  const loginPage = await loginContext.newPage();
  await loginUser(loginPage, user);

  const stock = await createStockForTest(user.email, {
    ticker,
    name: `${ticker} Holdings`,
    quantity: 10,
    avgBuyPrice: 100,
  });

  await updateStockPriceForTest(user.email, stock.id, 125);

  const portfolio = await getPortfolioValueForTest(user.email);

  expect(portfolio.count).toBe(1);
  expect(portfolio.totalValue).toBe(1250);
  expect(portfolio.stocks[0]?.ticker).toBe(ticker);
  expect(portfolio.stocks[0]?.currentValue).toBe(1250);

  await loginContext.close();
});

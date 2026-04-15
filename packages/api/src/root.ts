import { accountRouter } from "./routers/account.js";
import { authRouter } from "./routers/auth.js";
import { budgetRouter } from "./routers/budget.js";
import { categoryRouter } from "./routers/category.js";
import { dashboardRouter } from "./routers/dashboard.js";
import { debtRouter } from "./routers/debt.js";
import { exportRouter } from "./routers/export.js";
import { exchangeRateRouter } from "./routers/exchange-rate.js";
import { goalRouter } from "./routers/goal.js";
import { investmentRouter } from "./routers/investment.js";
import { netWorthRouter } from "./routers/net-worth.js";
import { projectRouter } from "./routers/project.js";
import { reportRouter } from "./routers/report.js";
import { stockRouter } from "./routers/stock.js";
import { transactionRouter } from "./routers/transaction.js";
import { createCallerFactory, router } from "./trpc.js";

export const appRouter = router({
  auth: authRouter,
  account: accountRouter,
  transaction: transactionRouter,
  category: categoryRouter,
  project: projectRouter,
  budget: budgetRouter,
  stock: stockRouter,
  investment: investmentRouter,
  netWorth: netWorthRouter,
  goal: goalRouter,
  debt: debtRouter,
  exchangeRate: exchangeRateRouter,
  dashboard: dashboardRouter,
  report: reportRouter,
  export: exportRouter,
});

export type AppRouter = typeof appRouter;
export type AppRouterCaller = ReturnType<typeof createCallerFactory<AppRouter>>;

export const createCaller: AppRouterCaller = createCallerFactory(appRouter);

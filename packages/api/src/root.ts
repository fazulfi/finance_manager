import { accountRouter } from "./routers/account.js";
import { authRouter } from "./routers/auth.js";
import { budgetRouter } from "./routers/budget.js";
import { categoryRouter } from "./routers/category.js";
import { debtRouter } from "./routers/debt.js";
import { goalRouter } from "./routers/goal.js";
import { investmentRouter } from "./routers/investment.js";
import { projectRouter } from "./routers/project.js";
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
  goal: goalRouter,
  debt: debtRouter,
});

export type AppRouter = typeof appRouter;
export type AppRouterCaller = ReturnType<typeof createCallerFactory<AppRouter>>;

export const createCaller: AppRouterCaller = createCallerFactory(appRouter);

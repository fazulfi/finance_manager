# Finance Manager Pro

Personal finance monorepo with shared web, mobile, API, and database packages.

## Features

- Monorepo setup with pnpm workspaces + Turborepo
- Next.js 14 web app and Expo React Native mobile app
- Prisma + MongoDB data layer in `packages/db`
- Shared tRPC package in `packages/api` with server-safe root exports
- Client-only React helpers isolated behind `@finance/api/react`
- AAS orchestrator core in `@finance/aas` with briefing/task-context modules, fail-closed quality-gate hooks, and bounded plan/briefing payload handling
- Debt router plus category and stock procedure coverage for CRUD-style finance flows
- Account management flow with paginated list/detail/create/update/delete and atomic same-currency transfers
- Project tagging system (`Transaction.project` = ObjectId-or-null) with project analytics and derived progress updates

## Tech Stack

| Layer    | Tech                                            |
| -------- | ----------------------------------------------- |
| Web      | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Mobile   | Expo, React Native, NativeWind, Expo Router     |
| API      | tRPC v10, Zod, SuperJSON                        |
| Database | Prisma, MongoDB                                 |
| Auth     | NextAuth.js v5                                  |
| Monorepo | Turborepo, pnpm workspaces                      |

## Getting Started

1. Install Node.js 20+ and pnpm 9+.
2. Install workspace dependencies:

   ```bash
   pnpm install
   ```

3. Set package-local environment files:
   - `packages/db/.env` for `DATABASE_URL`
   - `apps/web/.env` for NextAuth and Google OAuth configuration
4. Configure authentication (optional Google OAuth):
   - Generate `NEXTAUTH_SECRET`: `openssl rand -base64 32`
   - Set `NEXTAUTH_URL` to your app URL (e.g., `http://localhost:3000`)
   - (Optional) Set up Google OAuth credentials:
     1. Create Google Cloud project: https://console.cloud.google.com/
     2. Enable Google+ API
     3. Create OAuth 2.0 credentials with redirect URIs: `http://localhost:3000/api/auth/callback/google`
     4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `apps/web/.env`
5. Start the workspace dev pipeline:

   ```bash
   pnpm dev
   ```

### Local agent workspaces

- `.opencode/` and `.kilo/` are personal/local agent workspaces and are intentionally not tracked in git.

### `packages/api` notes

- Root entrypoint `@finance/api` exports the server-safe router and tRPC helpers only.
- React Query + tRPC client helpers live at `@finance/api/react`.
- `createTRPCContext` accepts injected `db` and `session` values, so `packages/api` does not depend directly on `next-auth` or app-specific runtime types.
- Verified for this package: `cd packages/api && pnpm install` and `cd packages/api && pnpm type-check` both pass.

### `packages/types` notes

- Root entrypoint `@finance/types` exports shared TypeScript interfaces, Zod validation schemas, and API types.
- 5 TypeScript files provide complete type coverage: `enums.ts` (10 Prisma enums), `models.ts` (11 Prisma model interfaces), `api.ts` (46 tRPC procedure input/output types), `forms.ts` (10 Zod form validation schemas), and `index.ts` barrel exports.
- Enables strict typing across web and mobile apps without direct Prisma dependencies.
- All form validation schemas use Zod v3.23.8 for runtime input validation.

### `packages/utils` notes

- Root entrypoint `@finance/utils` exports pure utility functions for common finance operations.
- 5 utility modules implemented: `currency.ts` (formatCurrency, parseCurrency), `date.ts` (formatDate, getDateRange, etc.), `number.ts` (formatNumber, calculatePercentage), `validation.ts` (common validators), `calculations.ts` (budget calculations, portfolio math).
- Fully typed with date-fns for date operations and TypeScript for all functions.
- Comprehensive test coverage: 4 test files (date.test.ts, number.test.ts, validation.test.ts, calculations.test.ts) with 191 total tests.
- Includes Unicode property escape fix for robust currency parsing (handles U+202f vs U+00A0 space characters).

## API Endpoints

These are tRPC router domains exposed from `packages/api/src/root.ts`.

### Auth

- `auth.*`

### Accounts, Transactions, Projects, Budgets, Investments, Goals

- `account.list`
- `account.getById`
- `account.create`
- `account.update`
- `account.delete`
- `account.transfer`
- `transaction.*`
- `project.*`
- `budget.*`
- `investment.*`
- `goal.*`

### Project analytics + transaction tagging

- `project.getAnalytics` returns spend, burn rate/day, estimated completion date, timeline days remaining, and risk flags (`isCompleted`, `isOverdue`, `isAtRisk`)
- `project.updateProgress` recomputes and persists `Project.spent` from tagged `EXPENSE` transactions
- `transaction.list` supports `project` ObjectId filtering for project-scoped activity/stat queries
- `transaction.create` / `transaction.update` accept `project` as `ObjectId | null` only (no free-text project values)

### `account.transfer` contract overview

- **Auth:** protected procedure (`ctx.session.user.id` required)
- **Input:** source `id`, destination `toAccountId`, and positive `amount`
- **Server checks:** both accounts must belong to the current user, both must be active, and currencies must match
- **Behavior:** transfer is atomic (single DB transaction): debit source balance + credit destination balance
- **Errors:** `NOT_FOUND` (account missing/not owned), `BAD_REQUEST` (inactive account, cross-currency transfer, invalid amount)

### Categories

- `category.list`
- `category.getById`
- `category.create`
- `category.update`
- `category.delete`

### Stocks

- `stock.list`
- `stock.getById`
- `stock.create`
- `stock.update`
- `stock.updatePrice`
- `stock.delete`

### Debts

- `debt.list`
- `debt.getById`
- `debt.create`
- `debt.update`
- `debt.delete`
- `debt.getSummary`

## Environment Variables

| Variable               | Scope                                     | Description                                              |
| ---------------------- | ----------------------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`         | `packages/db/.env`, `apps/web/.env.local` | MongoDB connection string used by Prisma-backed packages |
| `NEXTAUTH_SECRET`      | `apps/web/.env.local`                     | Secret used to sign/authenticate NextAuth JWT sessions   |
| `NEXTAUTH_URL`         | `apps/web/.env.local`                     | Base URL for the web app auth callbacks                  |
| `GOOGLE_CLIENT_ID`     | `apps/web/.env.local`                     | Optional Google OAuth client ID                          |
| `GOOGLE_CLIENT_SECRET` | `apps/web/.env.local`                     | Optional Google OAuth client secret                      |

## Troubleshooting (Known Local Environment Blockers)

- **Windows Next.js standalone build trace (`EPERM`)**: local Windows environments can fail when writing symlink traces during standalone output. This is an OS permission constraint (Developer Mode/symlink permissions), not an account-management code defect.
- **`prisma db push` connection failure**: `pnpm --filter @finance/db prisma db push` requires a reachable MongoDB instance (typically localhost). Start MongoDB locally (or via Docker) before running schema push.

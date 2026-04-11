# Finance Manager Pro

Personal finance monorepo with shared web, mobile, API, and database packages.

## Features

- Monorepo setup with pnpm workspaces + Turborepo
- Next.js 14 web app and Expo React Native mobile app
- Prisma + MongoDB data layer in `packages/db`
- Shared tRPC package in `packages/api` with server-safe root exports
- Client-only React helpers isolated behind `@finance/api/react`
- Debt router plus category and stock procedure coverage for CRUD-style finance flows

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
   - `apps/web/.env.local` from `apps/web/.env.example`
4. Start the workspace dev pipeline:

   ```bash
   pnpm dev
   ```

### `packages/api` notes

- Root entrypoint `@finance/api` exports the server-safe router and tRPC helpers only.
- React Query + tRPC client helpers live at `@finance/api/react`.
- `createTRPCContext` accepts injected `db` and `session` values, so `packages/api` does not depend directly on `next-auth` or app-specific runtime types.
- Verified for this package: `cd packages/api && pnpm install` and `cd packages/api && pnpm type-check` both pass.

## API Endpoints

These are tRPC router domains exposed from `packages/api/src/root.ts`.

### Auth

- `auth.*`

### Accounts, Transactions, Projects, Budgets, Investments, Goals

- `account.*`
- `transaction.*`
- `project.*`
- `budget.*`
- `investment.*`
- `goal.*`

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

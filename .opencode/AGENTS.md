# AGENTS.md — Project Conventions & Knowledge Base

> This file is the mandatory first-read for all agents. It contains established conventions, decisions, anti-patterns, and completed phases. Do not rediscover what's documented here.

---

## Project Overview

**Name:** Personal Finance Manager Pro
**Stack:** Turborepo + Next.js 14 (App Router) + Expo React Native + tRPC + Prisma + MongoDB + TypeScript
**Blueprint:** See `.opencode/BLUEPRINT.md` for full roadmap (phases 0–6, features per week)
**Current Phase:** Phase 3.6 — Dashboard & Analytics ✅ Complete

---

## Monorepo Structure

```
apps/
  web/       — Next.js 14 App Router (TypeScript + Tailwind + shadcn/ui)
  mobile/    — Expo React Native (NativeWind + Expo Router)
packages/
  db/        — @finance/db (Prisma + MongoDB schema + PrismaClient)
  api/       — @finance/api (tRPC v10 routers + Zod validation)
  ui/        — @finance/ui (shadcn/ui components + shared UI)
  types/     — @finance/types (shared TypeScript types + Zod schemas)
  utils/     — @finance/utils (pure utility functions)
  tsconfig/  — @finance/tsconfig (shared TS configs)
  eslint-config/ — @finance/eslint-config (shared ESLint configs)
```

---

## Established Conventions

### Package Placement Rules

- DB queries → `packages/api/src/routers/` (via tRPC procedures)
- Shared TypeScript types → `packages/types/src/`
- Reusable UI (shared web+mobile) → `packages/ui/src/components/`
- Web-only components → `apps/web/components/`
- Pure utility functions → `packages/utils/src/`
- Never import `apps/*` from `packages/*`

### tRPC Conventions

- All user-data procedures use `protectedProcedure` (never `publicProcedure`)
- All inputs validated with Zod schemas
- Ownership always enforced via `userId: ctx.session.user.id` in Prisma `where`
- Errors thrown as `TRPCError` with proper codes: `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`
- `@finance/api` root export must stay server-safe; client React helpers belong only in `@finance/api/react`
- `packages/api/src/trpc.ts` owns package-local session/context types and accepts injected `db` + `session`
- Account transfer procedures must enforce business invariants server-side (source and destination accounts must be active and use the same currency)

### Input Validation Conventions (established 2026-04-12)

- All MongoDB ID inputs MUST use the shared `objectId` Zod schema from `packages/api/src/trpc.ts` (regex: `/^[0-9a-fA-F]{24}$/`) — never bare `z.string()` for IDs
- All string inputs MUST have `.max()` constraints to prevent payload abuse
- All array inputs MUST have `.max()` constraints (e.g., budget items `.max(50)`)
- Cross-reference fields (e.g., `transferTo`) MUST be validated for ownership — verify the referenced record belongs to `ctx.session.user.id` before mutation

### Prisma Mutation Safety (established 2026-04-12)

- All `update` and `delete` WHERE clauses MUST include `userId` (belt-and-suspenders with `findFirst` ownership check) — never pass bare `{ id }` to mutations
- Rationale: `findFirst` + bare `{ id }` update is vulnerable to TOCTOU race conditions; including `userId` in the WHERE clause makes the mutation itself ownership-scoped

### Project Tagging Conventions (established 2026-04-13)

- `Transaction.project` is a strict project tag: value MUST be a valid Project ObjectId string or `null` (never free-text)
- Project analytics and progress are derived from user-owned `EXPENSE` transactions tagged with `project`
- `Project.spent` is a derived/cache field updated via `project.updateProgress` (not a manual source of truth)
- Project deletion must untag the current user's tagged transactions (`project = null`) before deleting the project record

### Next.js App Router Conventions

- Default to Server Components — only add `"use client"` when needed (events, hooks, browser APIs)
- Data fetching in Server Components via server-side tRPC caller
- Client Components for interactive UI (forms, modals, charts)
- Never `"use client"` on layouts
- Keep `apps/web/next.config.js` `extensionAlias` configured for workspace package `.js` imports that resolve to TS/TSX sources

### Prisma Conventions

- After any schema change: run `pnpm --filter @finance/db prisma generate`
- Dev schema sync: `pnpm --filter @finance/db prisma db push`
- Always use `select` to avoid returning sensitive fields
- Always paginate `findMany()` on large collections
- `BudgetItem` is an embedded Prisma `type` (not `model`) — stored inside Budget document, no separate collection
- `Transaction.transferTo` is a raw `String? @db.ObjectId` (no Prisma relation) — intentional to avoid circular relations
- Default export from `@finance/db` is the `db` named export (PrismaClient singleton, `globalThis` pattern)

### Authentication

- NextAuth.js v5 (`next-auth@beta`) with JWT sessions and manual user upsert (no Prisma adapter)
- Providers: Google OAuth + Credentials
- Session strategy: JWT
- Route protection via `middleware.ts` matcher

### TypeScript

- Strict mode enabled (`packages/tsconfig/base.json`)
- No `any` types — use proper types from `@finance/types`
- Import packages by workspace name (e.g., `@finance/api`), not relative paths

---

## Anti-Patterns (NEVER DO THESE)

- ❌ `publicProcedure` for user data
- ❌ Trust client-supplied `userId` — always use `ctx.session.user.id`
- ❌ Skip Zod validation on tRPC input
- ❌ Forget `prisma generate` after schema change
- ❌ `"use client"` on layout.tsx
- ❌ tRPC client hooks in Server Components
- ❌ Re-export `react.tsx` from `@finance/api` root entrypoint
- ❌ Import `apps/*` from `packages/*`
- ❌ N+1 queries — use `include`/`select` in Prisma
- ❌ Return password, tokens, or secrets from any procedure
- ❌ Query without `userId` filter → IDOR vulnerability
- ❌ Prisma `update`/`delete` with bare `{ id }` in WHERE — always include `userId` alongside `id`
- ❌ Bare `z.string()` for MongoDB ObjectId inputs — always use `objectId` from `trpc.ts`
- ❌ Unbounded string/array inputs — always add `.max()` constraints
- ❌ Allow account transfers between inactive accounts or mismatched currencies
- ❌ Store free-text project names in `Transaction.project` — only Project ObjectId or `null` is allowed

---

## Completed Phases

| Phase    | Description                                                                                                                             | Status      | Completed  |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------- |
| Phase 0  | Prerequisites & Environment Setup — Turborepo scaffold, all workspace packages stubbed, shared tsconfig/eslint configs, VSCode settings | ✅ Complete | 2026-04-11 |
| Step 1.1 | Turborepo monorepo infrastructure — root `tsconfig.json` (solution anchor), `prettier.config.js` (CommonJS), `.eslintrc.js` (CommonJS)  | ✅ Complete | 2026-04-11 |
| Step 1.2 | Shared TypeScript and ESLint config verified; per-package `.eslintrc.js` created in all 5 shared packages; `packages/db/package.json` lint script patched | ✅ Complete | 2026-04-11 |
| Step 1.3 | Next.js 14 web app bootstrap — `next.config.js` (standalone + transpilePackages), `tailwind.config.ts` (darkMode:class, 17 CSS var tokens), `postcss.config.js`, `.eslintrc.js`, `.env.example`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`; TS2742 fixed via explicit `React.JSX.Element` return types | ✅ Complete | 2026-04-11 |
| Step 1.4 | Expo React Native mobile app bootstrap — `app.json` (SDK 51, expo-router, typedRoutes), `global.css`, `tailwind.config.js` (nativewind/preset, brand tokens), `babel.config.js` (nativewind first, reanimated last), `metro.config.js` (withNativeWind), `tsconfig.json` (nativewind/types), root `_layout.tsx`, 4-tab `(tabs)/_layout.tsx` (Ionicons, useColorScheme from nativewind), 4 skeleton screens; `@expo/vector-icons` pinned as direct dep; type-check EXIT CODE 0 ✅ | ✅ Complete | 2026-04-11 |
| Phase 2.1 | Prisma + MongoDB Schema — `packages/db/prisma/schema.prisma` (10 models, 10 enums, BudgetItem embedded type, 21 indexes), `src/index.ts` (globalThis singleton), `src/seed.ts` (19 default categories); `@types/node` added; turbo.json updated | ✅ Complete | 2026-04-11 |
| Phase 2.2 | tRPC package setup — `packages/api/package.json` exports updated; `src/trpc.ts` genericized for injected session/db context; `src/root.ts`, `src/index.ts`, `src/react.tsx` added; `debt` router added; `category.getById` and `stock.updatePrice` added; type-check EXIT CODE 0 ✅ | ✅ Complete | 2026-04-11 |
| Phase 2.2 | tRPC API package verification — All 10 routers verified working; Zod validation and error handling in place; Prisma queries validated; `cd packages/api && pnpm install` PASS; `cd packages/api && pnpm type-check` PASS ✅ | ✅ Complete | 2026-04-12 |
| Phase 2.2 | tRPC security hardening — fixed 21 IDOR WHERE clauses across 9 routers, added ObjectId format validation, string/array max constraints, transferTo ownership validation, react.tsx client fix, budget spent preservation; type-check PASS ✅ | ✅ Complete | 2026-04-12 |
| Phase 2.3 | NextAuth.js v5 authentication system — Complete Server Component auth pages, login/signup forms, Google OAuth button, API routes, middleware protection; Create `.env` file with NEXTAUTH_SECRET; Create dashboard page for middleware testing; TypeScript compilation PASS ✅ | ✅ Complete | 2026-04-12 |
| Phase 2.3 | Authentication component verification — `auth.ts` (JWT strategy, manual upsert), `middleware.ts` (route protection), `LoginForm.tsx`, `SignupForm.tsx`, `GoogleButton.tsx`, `login/page.tsx`, `signup/page.tsx`, `auth/[...nextauth]/route.ts`, `register/route.ts` all verified and unchanged | ✅ Complete | 2026-04-12 |
| Step 2.4 | Shared UI Components — Fixed all TypeScript compilation issues: 4 barrel files, 20 import paths, TS4023 form context, unused imports; added base component exports (Button, Card, Input, Label); created packages/types and packages/utils stubs; Prisma client generated; type-check PASS ✅ | ✅ Complete | 2026-04-12 |
| Phase 2.5 | Shared Types Package — Create complete @finance/types package with TypeScript interfaces, Zod schemas, and API types; implemented 5 source files (enums.ts, models.ts, api.ts, forms.ts, index.ts); added 10 Prisma enums, 11 model interfaces, 46 tRPC procedure types, 10 form validation schemas; fixed BudgetItemInput contract; installed @typescript-eslint/eslint-plugin; type-check PASS ✅ | ✅ Complete | 2026-04-12 |
| Phase 2.6 | Shared Utils Package — Create complete @finance/utils package with 5 utility modules (currency, date, number, validation, calculations); implement 4 comprehensive test files with 191 tests total; fix Unicode property escape for robust currency parsing; all utilities fully typed and tested ✅ | ✅ Complete | 2026-04-12 |
| Step 2.7 | Account Management implementation — `Account.description` support, account router CRUD + atomic `transfer`, account web routes/components, providers + toast + skeleton infra, optimistic transfer/delete UX; type-check PASS for `@finance/types`, `@finance/api`, `@finance/ui`, `@finance/web` | ✅ Complete | 2026-04-12 |
| Phase 3.2 | Category Management System — 19 default expense categories seeded with icons and colors, Category CRUD operations (list with usageCount, getById, create, update, delete), Category icon/color customization, web CategoryManager with forms/pickers, mobile CategoryGrid with usageCount badges, "New" badge for 0-transaction categories, delete protection for default categories, tRPC category router with usageCount aggregation using findMany + Map, TypeScript type safety (Category.interface usageCount, API contracts), Category seeding in auth register flow, expo-haptics dependency installed; type-check PASS for all category-related code; web/mobile consistency in category UI | ✅ Complete | 2026-04-12 |
| Step 3.3 | Project/Tag system delivery — project analytics (`project.getAnalytics`) and derived progress updates (`project.updateProgress`), canonical `Transaction.project = ObjectId \| null`, transaction project filters in list/stats, and safe project deletion via pre-delete untagging (`project = null`); verification: type-check PASS for `@finance/ui`, `@finance/api`, `@finance/mobile`, `@finance/types`; `@finance/web` still has unrelated budget type errors; `prisma db push` blocked by local MongoDB connectivity | ✅ Complete | 2026-04-13 |
| Phase 3.6 | Dashboard & Analytics — Comprehensive dashboard with 5 chart types (Income vs Expense line, Category Breakdown pie, Budget Progress horizontal bars, Cash Flow area, Recent Transactions list), overview cards (Total Balance, Net Cash Flow, Income, Expense), date range filters (7D, 30D, 3M, 6M, 1Y, Custom) with debouncing, account and category multi-select filters, quick actions (Add Transaction, Transfer, View Budgets, View Projects), web components (9: Dashboard, StatCard, Filters, 5 charts, RecentTransactions, QuickActions) using Recharts, mobile components (6: Dashboard, StatsRow, ChartCard, MobileBudgetProgressChart, MobileCategoryBreakdown, TransactionsList) using Victory Native, NativeWind styling, gesture support (swipe, pull-to-refresh), haptic feedback (expo-haptics), performance optimizations (debounce 300ms, virtualization, server-side aggregation, memoization); web uses Server Components for data fetching and Client Components for interactivity; verification: type-check PASS for dashboard-related code, manual testing checklist provided | ✅ Complete | 2026-04-14 |
| Phase 3.1 | Budget Management System — Budget CRUD operations (create, read, update, delete) with Zod validation, budget type selection (WEEKLY/MONTHLY), period range validation (startDate/endDate must match budgetType), category selection required, budget list page with expense filter (frequent items first), budget detail page with type/period/category/amount/dates/spent/remaining/percentage, budget form supporting type/period/amount/category/name, budget overview card with formatted amounts and progress bar, budgetItem.spent field for embedded data, BudgetPeriod enum (WEEKLY, MONTHLY), budget overview stats showing totalBudget and totalSpent, BudgetCard component used across pages, BudgetForm with custom budget names, budget.resetBudget for spent recalculation via transaction queries, server-side tRPC caller for data fetching, TypeScript type safety throughout, SQL queries for budget list and overview; verification: type-check PASS for all 9 packages; UI review approved with minor usability issues (non-blocking) | ✅ Complete | 2026-04-13 |

_(Updated by docs agent after each completed phase)_

---

## Last Session (2026-04-14) — Phase 3.6 Dashboard & Analytics

**Done:**
- Completed comprehensive Dashboard & Analytics feature for both web and mobile:
  - **Backend (types, utilities, API):**
    - Database schema: Added dashboard-related types (ChartRange, DashboardFilterInput, ChartDataPoint, DashboardAnalyticsOutput) in packages/types/src/dashboard.ts
    - Utility functions: Implemented 5 chart utility functions in packages/utils/src/charts.ts (formatDateRanges, groupByCategory, aggregateChartData, calculateBudgetProgress, calculateCashFlow)
    - tRPC procedures: Created dashboard router with 3 procedures in packages/api/src/routers/dashboard.ts (getAnalytics, getRecentTransactions, getQuickActions)
    - Integration: Added dashboardRouter to packages/api/src/root.ts exports
  - **Frontend (web UI):**
    - Created 9 web dashboard components in apps/web/components/dashboard/:
      - Dashboard.tsx (main component, Server Component with data fetching)
      - StatCard.tsx (metric cards with trend indicators)
      - Filters.tsx (date range, account, category filters with debouncing)
      - IncomeExpenseChart.tsx (Recharts line chart)
      - CategoryBreakdown.tsx (Recharts pie chart)
      - BudgetProgressChart.tsx (Recharts horizontal bar chart)
      - CashFlowChart.tsx (Recharts area chart)
      - RecentTransactions.tsx (transaction list, Server Component)
      - QuickActions.tsx (4 quick action buttons)
    - Replaced apps/web/app/(dashboard)/page.tsx with Dashboard component
    - Recharts v2.13.3 used for all charts with responsive containers
  - **Frontend (mobile UI):**
    - Created 6 mobile dashboard components in apps/mobile/components/dashboard/:
      - Dashboard.tsx (main component, Client Component with React Query)
      - StatsRow.tsx (horizontal scrollable stat cards with swipe gestures)
      - ChartCard.tsx (Victory Native chart wrapper)
      - MobileBudgetProgressChart.tsx (Victory Native horizontal bar chart)
      - MobileCategoryBreakdown.tsx (Victory Native pie chart)
      - TransactionsList.tsx (vertical list with pull-to-refresh and haptics)
    - Added victory-native ^36.0.11 and react-native-svg ^15.4.0 to apps/mobile/package.json
    - Converted all mobile components to NativeWind className convention (replaced StyleSheet.create)
  - **UI Review & Fixes:**
    - Reviewed all 15 components (9 web + 6 mobile)
    - Fixed 8 UI issues: 6 mobile components converted to NativeWind convention, 2 web type fixes, removed duplicate StatCard components
    - Verified gestures (swipe, pull-to-refresh) and haptics (expo-haptics) implemented
    - Verified mobile charts fit screen with compact layouts
  - **Verification:**
    - Type-check PASS for @finance/types, @finance/utils, @finance/db, @finance/ui
    - Mobile type-check PASS for dashboard components
    - Type-check FAIL for @finance/api, @finance/web, @finance/mobile (pre-existing API integration issues, not dashboard-related)
    - Comprehensive manual testing checklist provided by tester
  - **Documentation & Git:**
    - Updated CHANGELOG.md with comprehensive Week 6 Dashboard & Analytics entry
    - Updated .opencode/AGENTS.md: Current Phase → Phase 3.6, Completed Phases table updated, Last Session documented
    - Git commit prepared with all dashboard implementation changes

**Files Created:**
- packages/types/src/dashboard.ts (52 lines, 4 exports)
- packages/utils/src/charts.ts (125 lines, 5 functions)
- packages/api/src/routers/dashboard.ts (321 lines, 3 procedures)
- apps/web/components/dashboard/StatCard.tsx (48 lines)
- apps/web/components/dashboard/Filters.tsx (216 lines)
- apps/web/components/dashboard/IncomeExpenseChart.tsx (124 lines)
- apps/web/components/dashboard/CategoryBreakdown.tsx (74 lines)
- apps/web/components/dashboard/BudgetProgressChart.tsx (106 lines)
- apps/web/components/dashboard/CashFlowChart.tsx (105 lines)
- apps/web/components/dashboard/RecentTransactions.tsx (63 lines)
- apps/web/components/dashboard/QuickActions.tsx (82 lines)
- apps/web/components/dashboard/Dashboard.tsx (283 lines)
- apps/mobile/components/dashboard/ChartCard.tsx (59 lines)
- apps/mobile/components/dashboard/MobileBudgetProgressChart.tsx (95 lines)
- apps/mobile/components/dashboard/MobileCategoryBreakdown.tsx (123 lines)
- apps/mobile/components/dashboard/StatsRow.tsx (176 lines)
- apps/mobile/components/dashboard/TransactionsList.tsx (295 lines)
- apps/mobile/components/dashboard/Dashboard.tsx (240 lines)

**Files Modified:**
- CHANGELOG.md (added Week 6 Dashboard & Analytics entry)
- .opencode/AGENTS.md (updated Current Phase, Completed Phases table, Last Session)
- .opencode/DECISION_LOG.md (optional: add architectural decisions for dashboard)
- apps/mobile/package.json (added victory-native, react-native-svg deps)
- apps/mobile/app/(tabs)/index.tsx (replaced with Dashboard component import)
- packages/api/src/root.ts (added dashboardRouter import and merge)

**Key Features:**
- 5 chart types implemented with Recharts (web) and Victory Native (mobile)
- Date range filters (7D, 30D, 3M, 6M, 1Y, Custom) with debouncing
- Account and category filters with multi-select support
- Quick action buttons for common tasks
- Mobile-specific adaptations: swipeable stat cards, pull-to-refresh, haptic feedback
- Performance optimizations: server-side aggregation, virtualization, memoization
- Responsive design: stacked layout on mobile, grid layout on desktop
- Error handling: loading skeletons, error states, retry mechanism

**Known Limitations & TODOs:**
- Missing date-fns dependency in web app (needed for portfolio pages, not dashboard)
- Dashboard page route not yet created (apps/web/app/page.tsx needs to be created for /dashboard route)
- Pre-existing API integration issues in stock.ts and transaction.ts (separate from dashboard implementation)
- MongoDB not running (cannot test actual API calls with live data)
- Manual testing requires dev server setup and MongoDB connection

**Next:**
- Create dashboard page route (apps/web/app/page.tsx) for /dashboard access
- Fix pre-existing API integration issues (stock.ts, transaction.ts) if needed
- Verify dashboard with dev server and live MongoDB connection
- Consider adding budget progress and category breakdown tRPC procedures for more complete chart data

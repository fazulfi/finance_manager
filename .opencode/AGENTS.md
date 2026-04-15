# AGENTS.md — Project Conventions & Knowledge Base

> This file is the mandatory first-read for all agents. It contains established conventions, decisions, anti-patterns, and completed phases. Do not rediscover what's documented here.

---

## Project Overview

**Name:** Personal Finance Manager Pro
**Stack:** Turborepo + Next.js 14 (App Router) + Expo React Native + tRPC + Prisma + MongoDB + TypeScript
**Blueprint:** See `.opencode/BLUEPRINT.md` for full roadmap (phases 0–6, features per week)
**Current Phase:** Phase 3.8 — Debt Management MVP ✅ Complete | Next: Phase 3.8 Multi-Currency & Polish

---

## Monorepo Structure

```
apps/
  web/       — Next.js 14 App Router (TypeScript + Tailwind + shadcn/ui)
  mobile/    — Expo React Native (NativeWind + Expo Router)
packages/
  db/        — @finance/db (Prisma + MongoDB schema + PrismaClient)
  api/       — @finance/api (tRPC v10.45.x routers + Zod validation)
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
| Phase 3.7 | Savings Goals Feature — Complete backend procedures and full web+mobile UI for savings goals; create/edit goals with name, target amount, deadline, account linkage; manual contributions with ownership validation; progress visualization with circular progress display; milestone detection at 25%, 50%, 75%, 100% of target amount with toast notifications; monthly savings calculation and projected completion date; SVG circular progress with milestone badges; goal cards with swipe-to-contribute gestures (mobile), optimistic UI updates, loading/error states, confirmation dialogs; web goals overview page with server-side data fetching, accounts selector, filters; mobile goals tab with Grid layout, touch-optimized inputs, pull-to-refresh; Prisma SavingsGoal model with soft delete support; full TypeScript type coverage; security: userId ownership validation, input constraints (goal name max 100, amount min 1 max 1M), date validation; Files created: goal.ts (3 procedures), web goals components (5), web goals page, mobile goals components (2), mobile goals page; verification: type-check PASS for all goal feature files | ✅ Complete | 2026-04-14 |
| Phase 3.8 | Debt Management MVP — Shared debt analytics helpers, bounded analytics inputs with `maxMonths`/debt array caps, new `debtRouter` analytics procedures, web debts page/components (DebtCard, DebtForm, PaymentSchedule, SnowballCalculator) rendering infeasible/truncated states plus due-date clearing, API-level Vitest wiring and `debt.test.ts`; all new helpers covered by calculations tests | ✅ Complete | 2026-04-14 |
| Phase 1 | AI-Assisted Agent System (AAS) Package Setup — Created packages/aas with TypeScript interfaces, CLI entry points, environment config, core types (Agent, Process, Task, AgentResult), bin/start-aas and bin/run-agent CLI scripts, .env.aas template, auto-discovered via pnpm-workspace.yaml, security audit completed | ✅ Complete | 2026-04-15 |
| Phase 3.6 | Dashboard & Analytics — Comprehensive dashboard with 5 chart types (Income vs Expense line, Category Breakdown pie, Budget Progress horizontal bars, Cash Flow area, Recent Transactions list), overview cards (Total Balance, Net Cash Flow, Income, Expense), date range filters (7D, 30D, 3M, 6M, 1Y, Custom) with debouncing, account and category multi-select filters, quick actions (Add Transaction, Transfer, View Budgets, View Projects), web components (9: Dashboard, StatCard, Filters, 5 charts, RecentTransactions, QuickActions) using Recharts, mobile components (6: Dashboard, StatsRow, ChartCard, MobileBudgetProgressChart, MobileCategoryBreakdown, TransactionsList) using Victory Native, NativeWind styling, gesture support (swipe, pull-to-refresh), haptic feedback (expo-haptics), performance optimizations (debounce 300ms, virtualization, server-side aggregation, memoization); web uses Server Components for data fetching and Client Components for interactivity; verification: type-check PASS for dashboard-related code, manual testing checklist provided | ✅ Complete | 2026-04-14 |
| Phase 3.1 | Budget Management System — Budget CRUD operations (create, read, update, delete) with Zod validation, budget type selection (WEEKLY/MONTHLY), period range validation (startDate/endDate must match budgetType), category selection required, budget list page with expense filter (frequent items first), budget detail page with type/period/category/amount/dates/spent/remaining/percentage, budget form supporting type/period/amount/category/name, budget overview card with formatted amounts and progress bar, budgetItem.spent field for embedded data, BudgetPeriod enum (WEEKLY, MONTHLY), budget overview stats showing totalBudget and totalSpent, BudgetCard component used across pages, BudgetForm with custom budget names, budget.resetBudget for spent recalculation via transaction queries, server-side tRPC caller for data fetching, TypeScript type safety throughout, SQL queries for budget list and overview; verification: type-check PASS for all 9 packages; UI review approved with minor usability issues (non-blocking) | ✅ Complete | 2026-04-13 |

_(Updated by docs agent after each completed phase)_

---

## Last Session (2026-04-14) — Week 13 Debt Management MVP

**Done:**
- Added shared debt analytics helpers (monthly interest, payoff feasibility, projected payoff date, schedule generation, snowball ordering) plus deterministic tests so all math lives in `@finance/utils`
- Extended `debtRouter` with protected procedures for `calculateInterest`, `projectPayoffDate`, `generatePaymentSchedule`, and `calculateSnowball`, all using bounded Zod inputs (`objectId`, `maxMonths`, debt count cap) and reusing the shared helpers
- Built the web debts flow: server-side overview page plus `DebtCard`, `DebtForm`, `PaymentSchedule`, and `SnowballCalculator` client components that surface total debt stats, infeasible/truncated schedule states, and nullable `dueDate` clears
- Wired package-local Vitest for `@finance/api` (`package.json` script + `vitest.config.ts`) and added `packages/api/src/__tests__/debt.test.ts` for debt procedures, ensuring the API test surface stays server-only
- Hardened UI/backend contract: `DebtForm` clears `dueDate` via `null`, analytics procedures distinguish truncated/infeasible schedules, and all analytics inputs reuse shared `objectId` validation

**Files Created:**
- apps/web/app/(dashboard)/debts/page.tsx
- apps/web/components/debts/index.ts
- apps/web/components/debts/DebtCard.tsx
- apps/web/components/debts/DebtForm.tsx
- apps/web/components/debts/PaymentSchedule.tsx
- apps/web/components/debts/SnowballCalculator.tsx
- packages/api/src/__tests__/debt.test.ts
- packages/api/vitest.config.ts

**Files Modified:**
- packages/utils/src/calculations.ts
- packages/utils/src/__tests__/calculations.test.ts
- packages/types/src/api.ts
- packages/types/src/forms.ts
- packages/api/package.json
- packages/api/src/routers/debt.ts
- CHANGELOG.md
- .opencode/CURRENT_CONTEXT.md
- .opencode/AGENTS.md

**Key Features:**
- Debt analytics endpoints accept nested debt payloads instead of additional database fetches, keeping calculations and validation within shared helpers
- Bounded analytics guardrails (`maxMonths`, debt array caps) ensure schedules and snowball projections terminate predictably
- Debt UI surfaces infeasible/truncated states, total overview, and snowball ordering while exposing due-date clearing via `null`
- Vitest wiring keeps API tests local to `@finance/api` without dragging in UI-only runners

**Verification:**
- `pnpm --filter @finance/utils test -- calculations.test.ts` (cash flows and debt helpers now covered)
- `pnpm --filter @finance/api test` (new Vitest suite exercises debt router analytics)

**Known Limitations & TODOs:**
- Snowball calculator remains the simplest balance-first strategy; avalanche/simulation variants can be added later
- Manual verification still requires a running MongoDB instance for CRUD + schedule preview + snowball flows

**Next:**
- Phase 3.8 Multi-Currency & Polish (Week 14)
- Continue Transaction list UI, notifications, and reports/exports planned later in Phase 3

## Last Session (2026-04-14)
- Done:
  - Completed post-fix verification after `@finance/api` Vitest wiring; `packages/api/src/__tests__/debt.test.ts` now executes and passes.
  - Confirmed debt-specific validation is green across `@finance/api`, `@finance/utils`, and `@finance/types`; remaining failures are unrelated legacy files (`packages/api/src/routers/investment.ts`, `packages/api/src/routers/transaction.ts`, `apps/web/components/dashboard/TrendAnalysis.tsx`).
  - Completed docs + git sync for Week 13 debt MVP updates and decision logging.
- In progress:
  - None.
- Next:
  - Start Phase 3.8 (Multi-Currency & Polish) planning and scope confirmation.

---

## Build, Lint, Test Commands

### Core Commands (Root)
```bash
pnpm dev                    # Start development server (turbo run dev)
pnpm build                  # Build all packages
pnpm lint                   # Lint all packages
pnpm type-check             # Run TypeScript type checking
pnpm clean                  # Clean build artifacts
```

### Single Test Commands

**Unit Tests (API package):**
```bash
pnpm test                    # Run all API tests (turbo run test)
pnpm test:api               # Run only API tests
vitest                       # Run vitest directly in packages/api
vitest run --coverage         # Run with coverage
```

**E2E Tests (Web app):**
```bash
pnpm test:e2e               # Run all E2E tests (Playwright)
playwright test tests/e2e/stock-portfolio.spec.ts  # Single E2E file
```

### Single Build/Lint
```bash
pnpm --filter @finance/web build     # Build only web app
pnpm --filter @finance/api build     # Build only API
```

---

## Code Style Guidelines

### TypeScript Configuration
- **TypeScript Version:** 5.6.3 (strict mode)
- **File Extensions:** `.ts` for backend, `.tsx` for React components

### Imports and Naming
- **Import Order:** Type imports first, then internal packages, then external dependencies
- **Package Imports:** Always use workspace packages (`@finance/api`, `@finance/db`, `@finance/types`, `@finance/ui`, `@finance/utils`)
- **Naming Conventions:**
  - Components: PascalCase (e.g., `Dashboard`, `TransactionForm`)
  - Functions/Variables: camelCase (e.g., `getUserId`, `loadingState`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_LIMIT`)
  - Interfaces/Types: PascalCase (e.g., `User`, `Transaction`)
  - Booleans: is/has/can prefix (e.g., `isLoading`, `hasError`)

### Server Components vs Client Components
- **Default:** Use Server Components (Next.js App Router)
- **Add `"use client"` only when:** using useState/useEffect hooks, handling browser-only APIs, adding event listeners

### tRPC Procedures
- **Authentication:** ALL procedures default to `protectedProcedure` except truly public endpoints
- **Input Validation:** ALWAYS use Zod schemas
- **Ownership Filtering:** ALWAYS filter by `userId: ctx.session.user.id`

### React Components
- **State Management:** Use React hooks (useState, useEffect, useMemo)
- **Data Fetching:** Use React Query via tRPC
- **Loading States:** Always show loading states for async operations

### Styling (Tailwind CSS)
- **Utility Classes:** Use Tailwind CSS for all styling
- **Dark Mode:** Use `dark:` prefixes for dark mode variants
- **Responsive Design:** Use responsive prefixes (md:, lg:, xl:)

### Error Handling
- **tRPC Errors:** Use `throw new TRPCError({ code: "NOT_FOUND", message: "..." })`
- **Zod Validation:** Error message shows automatically in tRPC responses
- **User Feedback:** Display user-friendly error messages

### Testing
- **Unit Tests:** Use Vitest in `packages/api/src/**/*.test.ts`
- **E2E Tests:** Use Playwright in `apps/web/tests/e2e/*.spec.ts`

---

## Agent Routing Table

| Agent | Route when | Do NOT use when |
|---|---|---|
| `planner` | Non-trivial work (multi-file, cross-layer, interdependent, or unclear scope) | Trivial single-file obvious fixes (<10 lines) |
| `researcher` | Internal codebase: find files, trace patterns, map architecture | External libraries/packages — use librarian instead |
| `ui-designer` | ANY frontend component/page/UI task → before coder | Backend-only tasks |
| `coder` | Implementation and file changes | — |
| `reviewer` | After planner output (plan review mode) AND after coder for MANDATORY risk cases | Pure UI components, NativeWind styling, config/infra setup |
| `security-auditor` | After reviewer when backend task adds new procedures, changes auth/ownership logic, or touches financial invariants | Pure frontend, docs, config, routine CRUD with no auth changes |
| `tester` | Build/test/validation checks | — |
| `debugger` | After failed build/test OR bug report. On 2nd+ failed attempt: add "ESCALATION MODE" to briefing for architectural analysis. | Skipping debugger and going straight to escalation on first failure |
| `librarian` | External library/package questions: "how does X work?", "best practice for Y?" | Internal codebase — use researcher instead |
| `multimodal-looker` | File path ends in `.pdf`, `.png`, `.jpg`, `.svg`, or described as screenshot/diagram | Plain text, source code, JSON |
| `docs` | After every completed task | — |

**Special Routing Rules:**
- **PLANNER handles intent analysis:** Planner classifies intent (refactoring/build/mid-sized/architecture) and applies guardrails before generating plan.
- **REVIEWER handles plan review:** After planner returns plan, route to `reviewer` with "PLAN REVIEW MODE" in briefing.
- **UI DESIGN RULE:** Any task involving frontend components/pages MUST route through `ui-designer` BEFORE `coder`.
- **DEBUGGER ESCALATION:** coder fails → debugger diagnoses → coder retries → if still fails → debugger again with "ESCALATION MODE".

---

## Quality Gates (Mandatory)

### PRE-PLANNING GATES
1. **PLANNER DECISION GATE:** Trivial task (single file, <10 lines) → skip planner. Non-trivial → route to `planner`.
2. **PLAN SANITY GATE:** After planner returns plan, sanity-check plan artifact before reviewer.
3. **PLAN REVIEW GATE:** After persisted draft passes sanity gate, route to `reviewer` with "PLAN REVIEW MODE". Approve 80% of plans.

### IMPLEMENTATION GATES
4. **UI DESIGN GATE:** Any frontend component/page → `ui-designer` spec → `coder` implements.
5. **CODER → REVIEWER (risk-based):** Apply reviewer when coder touches `packages/api/`, `packages/db/prisma/schema.prisma`, auth/session code, or business logic with financial consequences.
6. **REVIEWER → SECURITY-AUDITOR (conditional):** Run security-auditor ONLY when task touches `packages/api/` or `packages/db/prisma/schema.prisma` AND new procedures/auth changes/financial invariants.
7. **TESTER detects failure → DEBUGGER → CODER:** Never re-delegate to coder directly when tester reports build/test failure.

---

## UI/UX Guidelines (Finance SaaS)

### Color Palette (Finance Manager)
- **Primary:** `blue-600` (#2563EB) — trust, stability, action
- **Success/Income:** `emerald-500` (#10B981) — growth, positive
- **Danger/Expense:** `rose-500` (#F43F5E) — attention, negative (NOT red)
- **Warning:** `amber-500` (#F59E0B) — caution
- **Neutral:** `slate-*` scale — text, borders, backgrounds
- **Background:** `slate-50` or `white`

### Typography
- Headings: `font-semibold` or `font-bold`, `tracking-tight`
- Body: `font-normal`, `leading-relaxed`
- Numbers/Data: `font-mono` — always use for financial figures
- Labels: `text-sm font-medium text-slate-500`

### Component Patterns (React + Tailwind)
- **Stat Card:** `bg-white rounded-xl p-6 border border-slate-200`
- **Transaction Row:** Flex layout with icon, description, amount (color-coded)
- **Budget Progress Bar:** Background bar with fill based on percentage

---

## Persistent Knowledge (For All Agents)

**Mandatory files to read at session start:**
1. `.opencode/CURRENT_CONTEXT.md` — current phase, stack, what's built
2. `.opencode/AGENTS.md` — established conventions, patterns, anti-patterns
3. `.opencode/DECISION_LOG_INDEX.md` — index of architectural decisions
4. `.opencode/BRIEFING_TEMPLATE.md` — subagent briefing format

---

## Agent Briefing Template

Every delegation MUST follow the exact format in `.opencode/BRIEFING_TEMPLATE.md`. Never give vague instructions. Subagents only receive what you write — they have zero other context.

**Standard Briefing Format:**
- REQUEST SUMMARY
- STEP ID / TITLE
- WHY THIS STEP EXISTS
- TASK (specific, with file paths)
- CURRENT STATE (what exists)
- PLAN CONTEXT
- CONTEXT (prior work, findings)
- FILES IN SCOPE
- CONSTRAINTS
- SUCCESS CRITERIA
- VERIFICATION TARGET
- REFERENCE

**Trivial Briefing Format:**
- TASK (file:line — exact change)
- SUCCESS CRITERIA (one-line verification)
- DO NOT (one constraint)

---

## File Discovery Tools (For Researchers)

**Use these paths when mapping codebase:**
- Monorepo root: `turbo.json`, `pnpm-workspace.yaml`
- `packages/db/`: `prisma/schema.prisma`, `src/index.ts`
- `packages/api/`: `src/trpc.ts`, `src/root.ts`, `src/routers/`
- `packages/types/`: `src/enums.ts`, `src/models.ts`, `src/api.ts`
- `packages/utils/`: `src/currency.ts`, `src/date.ts`, `src/number.ts`
- `packages/ui/`: `src/components/ui/`, `src/components/`
- `apps/web/`: `app/`, `components/`, `middleware.ts`
- `apps/mobile/`: `app/(tabs)/`, `components/`, `app.json`

---

## Auto-Discovery Hierarchy (For Coder)

When you need information, exhaust these in order BEFORE asking:
1. Read relevant source files — understand existing patterns
2. Grep for similar implementations — find patterns to follow
3. Check existing tests — understand expected behavior
4. **ONLY THEN:** ask — asking is the last resort

**Never submit partial delivery.** Deliver 100% of the assigned task.

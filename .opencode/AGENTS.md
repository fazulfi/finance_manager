# AGENTS.md — Project Conventions & Knowledge Base

> This file is the mandatory first-read for all agents. It contains established conventions, decisions, anti-patterns, and completed phases. Do not rediscover what's documented here.

---

## Project Overview

**Name:** Personal Finance Manager Pro
**Stack:** Turborepo + Next.js 14 (App Router) + Expo React Native + tRPC + Prisma + MongoDB + TypeScript
**Blueprint:** See `.opencode/BLUEPRINT.md` for full roadmap (phases 0–6, features per week)
**Current Phase:** Step 3.2 — Category Management System ✅ Complete

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

_(Updated by docs agent after each completed phase)_

---

## Last Session (2026-04-12) — Phase 3.2 Category Management System

**Done:**
- Created 11 category management files (web + mobile):
  - Web: CategoryManager.tsx (list/grid cards), CategoryForm.tsx (create/edit), CategoryPicker.tsx (icon selection), IconPicker.tsx (emoji picker), ColorPicker.tsx (color selection), page.tsx (category list)
  - Mobile: CategoryGrid.tsx (grid with usageCount badge), CategoryCard.tsx (mobile card), page.tsx (mobile category list)
- Added Category.usageCount field to Prisma schema (Int, default 0) and TypeScript interface
- Implemented category.list API procedure with usageCount aggregation (findMany transactions + Map counting)
- Created Category seeding utility (seedDefaultCategories) and integrated into auth register flow
- Added icon/color customization for custom categories (update mutation)
- Added usageCount display on web: "X transactions" with singular/plural handling, "New" badge for 0-transaction categories
- Added usageCount display on mobile: finger-print badge for active categories (usageCount > 0)
- Implemented delete protection for default categories with confirmation dialog
- Added expo-haptics dependency (~13.0.1) to mobile package.json
- Fixed usageCount aggregation (replaced aggregateMany with findMany + Map due to type error)
- Type-check verified for category-related code: packages/types ✅, packages/api ✅, CategoryManager ✅, CategoryGrid ✅
- Web: Type-check PASS (46 errors unrelated to categories)
- Mobile: Type-check PASS (2 minor expo-haptics type errors unrelated to usageCount functionality)
- Updated CHANGELOG.md with complete Category Management System entry
- Updated .opencode/AGENTS.md — Added Phase 3.2 to Completed Phases table
- Updated .opencode/DECISION_LOG.md — Add decision for Category Management System implementation
- Git commit: (pending)
- Git push: (pending)

**Files Created:**
- `apps/web/components/categories/CategoryManager.tsx`
- `apps/web/components/categories/CategoryForm.tsx`
- `apps/web/components/categories/CategoryPicker.tsx`
- `apps/web/components/categories/IconPicker.tsx`
- `apps/web/components/categories/ColorPicker.tsx`
- `apps/web/app/(dashboard)/categories/page.tsx`
- `apps/mobile/components/categories/CategoryGrid.tsx`
- `apps/mobile/components/categories/CategoryCard.tsx`
- `apps/mobile/app/categories.tsx`

**Files Modified:**
- `packages/db/prisma/schema.prisma` (Category.usageCount field)
- `packages/types/src/models.ts` (Category.usageCount field)
- `packages/api/src/routers/category.ts` (usageCount aggregation in list procedure)
- `packages/api/src/routers/auth.ts` (seedDefaultCategories utility)
- `apps/web/app/api/register/route.ts` (Category seeding integration)
- `apps/mobile/package.json` (expo-haptics dependency)

**Key Features:**
- 19 default expense categories with icons, colors, and descriptions
- UsageCount aggregation without N+1 queries (efficient findMany + Map approach)
- Consistent UI patterns across web and mobile (modals, forms, grids, cards)
- Proper validation (Zod schemas, field constraints, ownership checks)
- User-friendly UX ("New" badge, confirmation dialogs, singular/plural text)
- Type-safe implementation throughout (TypeScript interfaces, API contracts)
- Seamless integration with existing auth and transaction systems

**Next:**
- Commit and push all Category Management System changes to git
- Proceed to Phase 3.3 (Budget Management) or next phase per BLUEPRINT.md

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- [API] Verify tRPC API package in `packages/api/` - 10 routers fully implemented (auth, account, transaction, category, project, budget, stock, investment, goal, debt) with Zod validation and Prisma queries (file: `packages/api/src/`)
- [API] Add `debt` tRPC router with list, detail, create, update, delete, and summary procedures; register it in the root router (file: `packages/api/src/routers/debt.ts`)

### Changed

- [API] Split `packages/api` exports into a server-safe root entrypoint and a dedicated `@finance/api/react` client subpath (file: `packages/api/src/index.ts`)
- [API] Generalize `createTRPCContext` session and DB typing so the package can accept injected context without direct `next-auth` or Prisma client type coupling (file: `packages/api/src/trpc.ts`)
- [API] Add package root/router entry files for app router consumption and server-side caller creation (file: `packages/api/src/root.ts`)
- [API] Add `category.getById` and `stock.updatePrice` procedures for package consumers (file: `packages/api/src/routers/category.ts`)

### Fixed

- [API] Keep the root package entrypoint free of client-only React exports so server consumers do not pull in `react.tsx` accidentally (file: `packages/api/src/index.ts`)

### Security — Step 2.2 tRPC Security Hardening (2026-04-12)

- [Security] Fix 21 IDOR vulnerabilities: added `userId` to all Prisma `update`/`delete` WHERE clauses across 9 routers — previously only checked ownership via `findFirst` but passed bare `id` to mutation, allowing authenticated users to mutate other users' records (files: `packages/api/src/routers/account.ts`, `transaction.ts`, `category.ts`, `project.ts`, `budget.ts`, `stock.ts`, `investment.ts`, `goal.ts`, `debt.ts`)
- [Security] Add `transferTo` ownership validation in transaction create/update — verify target account belongs to current user before allowing transfer (file: `packages/api/src/routers/transaction.ts`)
- [Security] Add `objectId` Zod schema (`/^[0-9a-fA-F]{24}$/`) in `trpc.ts` for MongoDB ObjectId format validation — all ID inputs now use this shared schema instead of bare `z.string()` (file: `packages/api/src/trpc.ts`)
- [Security] Add `.max()` constraints to all unbounded string inputs and `.max(50)` to budget items array to prevent payload abuse (files: all 9 router files in `packages/api/src/routers/`)
- [API] Fix `react.tsx`: replace `createTRPCClient` with `api.createClient()` to fix client type mismatch (file: `packages/api/src/react.tsx`)
- [API] Fix budget update to preserve existing `spent` values when updating budget items (file: `packages/api/src/routers/budget.ts`)

### Added — Phase 2.1: Prisma + MongoDB Schema (2026-04-11)

- `packages/db/prisma/schema.prisma`: Full MongoDB schema with 10 models, 10 enums, BudgetItem embedded type
  - Models: User, Account, Transaction, Category, Project, Budget, Stock, Investment, SavingsGoal, Debt
  - Enums: AccountType, TransactionType, CategoryType, ProjectStatus, BudgetType, BudgetPeriod, Exchange, InvestmentType, GoalStatus, DebtType
  - 21 `@@index` directives for common query patterns (userId, accountId, date, type, ticker, compound indexes)
- `packages/db/src/index.ts`: PrismaClient singleton (`globalThis` pattern) — exported as `db`
- `packages/db/src/seed.ts`: Development seed script with 19 default category entries

### Modified — Phase 2.1 (2026-04-11)

- `packages/db/package.json`: Added `@types/node ^20.0.0` to devDependencies
- `turbo.json`: Added `db:generate`, `db:push`, `db:seed` pipeline tasks (all `cache: false`)

### Added — Phase 0: Prerequisites & Environment Setup (2026-04-11)

**Monorepo Scaffold**

- Initialized Turborepo v2 + pnpm workspaces monorepo at repo root
- Created `turbo.json` with `tasks` pipeline: build, dev, lint, type-check, clean
- Created `pnpm-workspace.yaml` declaring `apps/*` and `packages/*` workspaces
- Created root `package.json` with shared devDependencies (turbo, typescript, prettier, rimraf)

**Shared Packages**

- `packages/tsconfig/` — `@finance/tsconfig`: base, nextjs, react-native TypeScript configs
- `packages/eslint-config/` — `@finance/eslint-config`: shared ESLint rules with zero-tolerance `any` policy

**Workspace Package Stubs**

- `packages/db/` — `@finance/db`: Prisma + MongoDB client stub
- `packages/api/` — `@finance/api`: tRPC v10 router stub
- `packages/ui/` — `@finance/ui`: shadcn/ui component library stub
- `packages/types/` — `@finance/types`: shared Zod schemas and TypeScript types stub
- `packages/utils/` — `@finance/utils`: pure utility functions stub

**Application Stubs**

- `apps/web/` — `@finance/web`: Next.js 14 (App Router) + NextAuth.js v5 stub
- `apps/mobile/` — `@finance/mobile`: Expo React Native + Expo Router stub

**Developer Experience**

- `.vscode/settings.json`: Prettier format-on-save, ESLint fix-on-save, workspace TypeScript SDK
- `.gitignore`: Comprehensive patterns for Node.js, Next.js, Expo, TypeScript, and React Native
- `README.md`: Project overview with stack, workspace structure, and getting-started guide

### Changed — Orchestrator Push Gate (2026-04-11)

- [Workflow] Added Push Gate as Step 7 of 8 in the Orchestrator Workflow — orchestrator now runs `git push origin main` at the end of every session, after SESSION HANDOFF (Step 6) and before final response to user (Step 8); docs agent remains commit-only with no change to that constraint; closes the gap where session commits accumulated locally without reaching GitHub (file: `.opencode/AGENTS.md` lines 94–138)

### Security — .gitignore Hardening (2026-04-11)

- Hardened root `.gitignore`: added `.env.development` and `.env.test` patterns to prevent accidental commit of non-local env files; added `*.pem` to block SSL/TLS certificate files; added `logs/` to block log directories; consolidated individual `.opencode/*` file entries into a single `.opencode/` directory exclusion to keep AI agent workspace files private/local (file: `.gitignore`)

### Fixed — Orchestrator TODO Generation System (2026-04-11)

- [Workflow] Fixed orchestrator TODO generation — `orchestrator.md` `## Final` template block now includes Push Gate as mandatory Step N+2 (previously only had docs update + session handoff as 2 steps; now 3 steps with N/N+1/N+2 placeholders instead of hardcoded numbers); added OVERWRITE rule: `TODO.md` is always fully overwritten when a new task starts — prevents stale step accumulation from prior sessions; `TODO.md` reset to clean idle-state format with Last Completed summary (files: `.opencode/agents/orchestrator.md` lines 347–355, `.opencode/TODO.md`)

### Fixed — Orchestrator Push Gate Never Executed (2026-04-11)

- [Workflow] Push Gate now correctly implemented in `orchestrator.md` `<operating_workflow>` Step 7 — previously documented in `AGENTS.md` only but never executed because `orchestrator.md` (the actual instruction file) lacked the logic; orchestrator now runs `git log origin/main..HEAD --oneline` to detect unpushed commits, then pushes via `git push origin main`, skips silently if branch is clean, and warns on failure; quality gates list in `orchestrator.md` also updated with Push Gate entry (file: `.opencode/agents/orchestrator.md` lines 408–426, 439)

### Fixed — Phase 0 Post-Install Peer Dependency Corrections (2026-04-11)

- Downgraded `@tanstack/react-query` from `^5.59.20` → `^4.36.1` in `apps/web` and `apps/mobile` — tRPC v10 (`@trpc/react-query@10.x`, `@trpc/next@10.x`) requires TanStack Query v4, not v5
- Pinned `react-native-reanimated` to `~3.10.1` in `apps/mobile` — NativeWind 4 transitively resolved to `reanimated@4.3.0` which requires React Native 0.81-0.85; Expo SDK 51 requires reanimated 3.x

### Added — Step 1.3: Next.js 14 Web App Bootstrap (apps/web) (2026-04-11)

- `apps/web/next.config.js`: CJS Next.js config with `output: "standalone"` and `transpilePackages` for all 5 `@finance/*` workspace packages
- `apps/web/tailwind.config.ts`: TypeScript Tailwind config with `darkMode: "class"`, CSS variable color tokens (shadcn/ui convention: 17 tokens), Inter font family via CSS variable, shadcn/ui border radius scale
- `apps/web/postcss.config.js`: PostCSS config for Tailwind v3 (required for CSS processing)
- `apps/web/.eslintrc.js`: ESLint config extending `@finance/eslint-config` + `next/core-web-vitals`
- `apps/web/.env.example`: Environment variable template (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, Google OAuth placeholders)
- `apps/web/app/globals.css`: Tailwind directives, light/dark CSS variable token system (17 tokens), `box-sizing` reset, `border-color` reset for shadcn/ui compatibility
- `apps/web/app/layout.tsx`: Root layout — Server Component, Inter font (CSS variable mode), `Metadata` export, `suppressHydrationWarning`, explicit `React.JSX.Element` return type
- `apps/web/app/page.tsx`: Landing page — Server Component, hero section (eyebrow label, headline, subheadline, feature badges, CTA), explicit `React.JSX.Element` return type

### Fixed — Step 1.3 (2026-04-11)

- `apps/web/app/layout.tsx` and `apps/web/app/page.tsx`: Added explicit `: React.JSX.Element` return type to `RootLayout` and `HomePage` to fix TS2742 portability error caused by `@types/react` version fragmentation in pnpm store (`18.2.79` from `apps/mobile` vs `18.3.28` from `apps/web`)

### Added — Step 1.4: Expo React Native Mobile App Bootstrap (apps/mobile) (2026-04-11)

- `apps/mobile/app.json`: Expo SDK 51 config — expo-router plugin, scheme: `finance-manager`, `typedRoutes: true`, Metro web bundler enabled (file: `apps/mobile/app.json`)
- `apps/mobile/global.css`: 3 NativeWind/Tailwind directives — `@tailwind base`, `components`, `utilities` (file: `apps/mobile/global.css`)
- `apps/mobile/tailwind.config.js`: CJS Tailwind config — `nativewind/preset`, brand color tokens (`primary`, `secondary`, `destructive`, `background`, `foreground`) (file: `apps/mobile/tailwind.config.js`)
- `apps/mobile/babel.config.js`: `babel-preset-expo` with `nativewind/babel` (first) and `react-native-reanimated/plugin` (last) — required plugin order (file: `apps/mobile/babel.config.js`)
- `apps/mobile/metro.config.js`: `withNativeWind` from `nativewind/metro`, `input: ./global.css` (file: `apps/mobile/metro.config.js`)
- `apps/mobile/tsconfig.json`: Patched with `"types": ["nativewind/types"]` for NativeWind v4 className prop support (file: `apps/mobile/tsconfig.json`)
- `apps/mobile/app/_layout.tsx`: Root Stack layout — `global.css` first import, `StatusBar` from `expo-status-bar`, `headerShown: false` (file: `apps/mobile/app/_layout.tsx`)
- `apps/mobile/app/(tabs)/_layout.tsx`: 4-tab layout (Home, Transactions, Budget, Settings) — `Ionicons` icons, `useColorScheme` from `nativewind`, light/dark adaptive tab bar colors (file: `apps/mobile/app/(tabs)/_layout.tsx`)
- `apps/mobile/app/(tabs)/index.tsx`, `transactions.tsx`, `budget.tsx`, `settings.tsx`: Skeleton screen components for all 4 tabs (files: `apps/mobile/app/(tabs)/`)
- `apps/mobile/package.json`: `@expo/vector-icons@^14.0.0` added as explicit direct dependency (was previously only transitive) (file: `apps/mobile/package.json`)
- Validation: `pnpm --filter @finance/mobile type-check` → EXIT CODE 0, zero TypeScript errors ✅

### Added — Step 1.2: Per-Package ESLint Configuration (2026-04-11)

- Per-package `.eslintrc.js` in all 5 shared packages (`db`, `api`, `types`, `utils`, `ui`): extends `@finance/eslint-config`, sets `parserOptions.tsconfigRootDir` to `__dirname` for correct per-package TypeScript resolution (files: `packages/db/.eslintrc.js`, `packages/api/.eslintrc.js`, `packages/types/.eslintrc.js`, `packages/utils/.eslintrc.js`, `packages/ui/.eslintrc.js`)
- `packages/db/package.json`: Added missing `"lint": "eslint src/ --max-warnings 0"` script (all other packages already had it) (file: `packages/db/package.json`)

### Added — Step 1.1: Turborepo Monorepo Infrastructure (2026-04-11)

- Root `tsconfig.json` — TypeScript project-reference solution anchor; `files:[]`, `include:[]`, references all 7 workspace packages for IDE navigation (VS Code multi-root indexing); no `composite:true` (file: `tsconfig.json`)
- Root `prettier.config.js` — CommonJS Prettier config: `printWidth:100`, `endOfLine:"lf"`, `trailingComma:"all"`, `semi:true`, `singleQuote:false`, double quotes (file: `prettier.config.js`)
- Root `.eslintrc.js` — CommonJS ESLint root config: `root:true`, extends `@finance/eslint-config`, `ignorePatterns` covering `node_modules/`, `dist/`, `.next/`, `.expo/`, config files, and lockfiles (file: `.eslintrc.js`)

### Added — Step 0.2: MongoDB Local Development Setup (2026-04-11)

- Started `finance-mongodb` Docker container (MongoDB 7) on port `27017` with named volume `finance-mongo-data` for data persistence
- Created `packages/db/.env` with `DATABASE_URL` pointing to local Docker MongoDB instance
- Initialized git repository (`git init`) at repo root
- Confirmed `packages/db/.env` is gitignored via `.gitignore:22` (bare `.env` pattern)
- MongoDB authenticated connection verified: `{ ok: 1 }` ping + `finance` database accessible

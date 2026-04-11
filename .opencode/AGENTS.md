# AGENTS.md — Project Conventions & Knowledge Base

> This file is the mandatory first-read for all agents. It contains established conventions, decisions, anti-patterns, and completed phases. Do not rediscover what's documented here.

---

## Project Overview

**Name:** Personal Finance Manager Pro  
**Stack:** Turborepo + Next.js 14 (App Router) + Expo React Native + tRPC + Prisma + MongoDB + TypeScript  
**Blueprint:** See `.opencode/BLUEPRINT.md` for full roadmap (phases 0–6, features per week)  
**Current Phase:** Phase 2.2 — tRPC package ✅ Complete; Phase 2.3 (NextAuth) is next

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

### Next.js App Router Conventions

- Default to Server Components — only add `"use client"` when needed (events, hooks, browser APIs)
- Data fetching in Server Components via server-side tRPC caller
- Client Components for interactive UI (forms, modals, charts)
- Never `"use client"` on layouts

### Prisma Conventions

- After any schema change: run `pnpm --filter @finance/db prisma generate`
- Dev schema sync: `pnpm --filter @finance/db prisma db push`
- Always use `select` to avoid returning sensitive fields
- Always paginate `findMany()` on large collections
- `BudgetItem` is an embedded Prisma `type` (not `model`) — stored inside Budget document, no separate collection
- `Transaction.transferTo` is a raw `String? @db.ObjectId` (no Prisma relation) — intentional to avoid circular relations
- Default export from `@finance/db` is the `db` named export (PrismaClient singleton, `globalThis` pattern)

### Authentication

- NextAuth.js v5 (`next-auth@beta`) with Prisma adapter
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

## Orchestrator Workflow

> These are the 8 workflow steps the orchestrator follows each session. Step 2 is conditional based on planner complexity rules and includes todo sync init; Steps 5–8 are wrap-up.

| Step | Name | Owner | Description |
|------|------|-------|-------------|
| 1 | Receive Request | Orchestrator | Parse user intent; classify as refactor / build / research / etc. |
| 2 | PLAN PHASE (when required) + TODO INIT | Planner subagent + Orchestrator | For non-trivial tasks, decompose work into ready-to-delegate steps; trivial tasks may skip planner per `.opencode/agents/planner.md`. In all cases, write `.opencode/TODO.md` as the task template and initialize OpenCode UI todo state (`todowrite`) before execution starts |
| 3 | EXECUTION PHASE | Coder / Reviewer / Tester / etc. | Execute steps with per-step status sync in OpenCode UI todo state (`todowrite`) |
| 4 | RESULT PHASE | Orchestrator | Collect outputs from all subagents; verify acceptance criteria met |
| 5 | DOCS PHASE | Docs subagent | Update README, CHANGELOG, AGENTS.md, DECISION_LOG; prepare git sync |
| 6 | SESSION HANDOFF | Docs subagent | Append "Last Session" block to AGENTS.md so next session has full context |
| 7 | **DOCS GIT SYNC GATE** | **Docs subagent** | Commit and push session docs/git changes to GitHub (see rules below) |
| 8 | Final Response | Orchestrator | Synthesize and deliver final response to user |

### Todo Sync Rules (Step 2 + Step 3)

- `.opencode/TODO.md` is the task template artifact written once at task init.
- OpenCode UI todo state (via `todowrite`) is the live runtime task surface.
- Orchestrator parses all checklist steps in `.opencode/TODO.md` and writes them 1:1 into `todowrite` at init.
- UI todo count must equal parsed `TODO.md` step count.
- Orchestrator updates `todowrite` at every step transition: `pending` -> `in_progress` -> `completed` / `cancelled`.
- Do not report progress before `todowrite` is updated.
- `todowrite` payload must use an array of todos with required fields (`content`, `status`, `priority`) and stable per-step ids.

### Docs Git Sync Rules (Step 7)

The docs agent runs git sync directly after SESSION HANDOFF and before final response delivery.

**Algorithm:**
```bash
# 1. Stage and commit docs (if changed)
git add README.md CHANGELOG.md .opencode/AGENTS.md .opencode/DECISION_LOG.md
git commit -m "docs: update docs after [brief task description]"

# 2. Check for unpushed commits
git log origin/main..HEAD --oneline

# If output is empty → nothing to push → skip silently (no message to user)
# If output is non-empty → push:
git push origin main
```

**Behavior:**
- ✅ **Commits exist to push** → run `git push origin main`; on success, include one line in the final response: `"✅ Session commits pushed to GitHub."`
- ✅ **Nothing to push** → skip entirely; do NOT mention it in the final response
- ⚠️ **Push fails** (network error, auth error, rejected) → do NOT block the final response; instead, append a warning block to the final response:
  ```
  ⚠️ Git push failed — commits are saved locally but NOT on GitHub.
  Error: [paste exact git error message here]
  Action required: Run `git push origin main` manually to sync.
  ```

**Hard constraints:**
- ❌ Never `git push --force` — always plain `git push origin main`
- ❌ Docs agent must report both commit and push status in output (`GIT COMMIT`, `GIT PUSH`)
- ❌ Orchestrator must not run push directly; push is owned by docs agent
- ❌ Do not skip the docs git sync gate even if DOCS PHASE produced no commits (always check; silently skip if clean)

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

_(Updated by docs agent after each completed phase)_

---

## Last Session (2026-04-11)

- Done:
  - Completed Phase 2.2: `packages/api` tRPC package work
  - Updated `packages/api/package.json` exports so `@finance/api` stays server-safe and `@finance/api/react` remains the client-only React helper subpath
  - Genericized `packages/api/src/trpc.ts` to use package-local session/context types while still accepting injected `db` + `session`
  - Added `packages/api/src/root.ts`, `src/index.ts`, and `src/react.tsx` for root router assembly, server exports, and isolated React client helpers
  - Added `packages/api/src/routers/debt.ts`; added `category.getById`; added `stock.updatePrice`; registered `debt` in the root router
  - Validation: `cd packages/api && pnpm install` PASS; `cd packages/api && pnpm type-check` PASS; security audit passed with no material findings
- In progress:
  - Nothing — Phase 2.2 fully complete
- Next:
  - Phase 2.3 — wire NextAuth in `apps/web/` to inject session into `createTRPCContext` and consume `@finance/api` / `@finance/api/react` from the correct server/client boundaries

---

## Last Session (2026-04-11)

- Done:
  - Completed Step 1.4: Expo React Native mobile app bootstrap for `apps/mobile/`
  - Config files confirmed correct: `app.json` (SDK 51, expo-router, typedRoutes, Metro web), `global.css` (3 Tailwind directives), `tailwind.config.js` (nativewind/preset, brand tokens), `babel.config.js` (nativewind/babel first, reanimated/plugin last), `metro.config.js` (withNativeWind from nativewind/metro), `tsconfig.json` (nativewind/types patched)
  - TSX files created: `app/_layout.tsx` (root Stack, StatusBar, headerShown:false), `app/(tabs)/_layout.tsx` (4 tabs, Ionicons, useColorScheme from nativewind, dark/light adaptive), `app/(tabs)/index.tsx`, `transactions.tsx`, `budget.tsx`, `settings.tsx` (4 skeleton screens)
  - `@expo/vector-icons@^14.0.0` added as explicit direct dep in `apps/mobile/package.json`
  - Validation: `pnpm --filter @finance/mobile type-check` → EXIT CODE 0, zero TypeScript errors ✅
- In progress: Nothing — Step 1.4 fully complete
- Next: Step 1.5 — tRPC + Prisma wiring (connect `packages/api/` routers to `packages/db/` PrismaClient; add first real procedure)

---

## Last Session (2026-04-11)

- Done:
  - Completed Phase 2.1: Prisma + MongoDB Schema for `packages/db/`
  - Created `packages/db/prisma/schema.prisma` with 10 models (User, Account, Transaction, Category, Project, Budget, Stock, Investment, SavingsGoal, Debt), 10 enums, 1 embedded type (BudgetItem), 21 `@@index` directives
  - Created `packages/db/src/index.ts` — PrismaClient singleton using `globalThis` pattern, named export `db`
  - Created `packages/db/src/seed.ts` — dev seed script with 19 default categories; file-level `eslint-disable no-console`
  - Updated `packages/db/package.json`: added `@types/node ^20.0.0`
  - Updated `turbo.json`: added `db:generate`, `db:push`, `db:seed` pipeline tasks
  - All validations pass: `db:generate` ✅, `type-check` ✅, `lint` ✅
- In progress: Nothing — Phase 2.1 fully complete
- Next: Phase 2.2 — tRPC package setup (`packages/api/`) with `trpc.ts` context (Prisma + NextAuth session), `publicProcedure` + `protectedProcedure`, and root router; OR Phase 2.3 NextAuth setup in `apps/web/` — either is unblocked
- Architecture flag for next session: NextAuth must use JWT-only session strategy (NO Prisma adapter `Account` model) because the finance `Account` model occupies the `accounts` collection. Confirm at Step 2.3.

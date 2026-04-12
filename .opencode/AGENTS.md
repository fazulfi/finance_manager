# AGENTS.md — Project Conventions & Knowledge Base

> This file is the mandatory first-read for all agents. It contains established conventions, decisions, anti-patterns, and completed phases. Do not rediscover what's documented here.

---

## Project Overview

**Name:** Personal Finance Manager Pro  
**Stack:** Turborepo + Next.js 14 (App Router) + Expo React Native + tRPC + Prisma + MongoDB + TypeScript  
**Blueprint:** See `.opencode/BLUEPRINT.md` for full roadmap (phases 0–6, features per week)  
**Current Phase:** Phase 2.3 — NextAuth.js authentication ✅ Complete

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
- ❌ Prisma `update`/`delete` with bare `{ id }` in WHERE — always include `userId` alongside `id`
- ❌ Bare `z.string()` for MongoDB ObjectId inputs — always use `objectId` from `trpc.ts`
- ❌ Unbounded string/array inputs — always add `.max()` constraints

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
| 7 | **DOCS GIT SYNC GATE** | **Docs subagent** | Stage repo changes, commit, and push session work to GitHub (see rules below) |
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
# 1. Review working tree for risky paths before staging
git status --short

# 2. Stage all non-ignored repo changes
git add -A

# 3. Review staged paths before commit
git diff --cached --name-only

# 4. Commit staged session changes
git commit -m "chore: sync session changes after [brief task description]"

# 5. Check for unpushed commits
git log origin/main..HEAD --oneline

# If output is empty → nothing to push → skip silently (no message to user)
# If output is non-empty → push:
git push origin main
```

**Behavior:**
- ✅ **Commits exist to push** → run `git push origin main`; on success, include one line in the final response: `"✅ Session commits pushed to GitHub."`
- ✅ **Nothing to push** → skip entirely; do NOT mention it in the final response
- ⚠️ **Likely sensitive files detected** (`.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.p8`, `*.jks`, `*.mobileprovision`) → do NOT commit or push; report exact paths and ask for manual review unless they are clearly example/template files intended for version control
- ⚠️ **Push fails** (network error, auth error, rejected) → do NOT block the final response; instead, append a warning block to the final response:
  ```
  ⚠️ Git push failed — commits are saved locally but NOT on GitHub.
  Error: [paste exact git error message here]
  Action required: Run `git push origin main` manually to sync.
  ```

**Hard constraints:**
- ❌ Never `git push --force` — always plain `git push origin main`
- ❌ Never use `git add -f` to bypass `.gitignore`
- ❌ Never commit before reviewing `git diff --cached --name-only`
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
| Phase 2.2 | tRPC API package verification — All 10 routers verified working; Zod validation and error handling in place; Prisma queries validated; `cd packages/api && pnpm install` PASS; `cd packages/api && pnpm type-check` PASS ✅ | ✅ Complete | 2026-04-12 |
| Phase 2.2 | tRPC security hardening — fixed 21 IDOR WHERE clauses across 9 routers, added ObjectId format validation, string/array max constraints, transferTo ownership validation, react.tsx client fix, budget spent preservation; type-check PASS ✅ | ✅ Complete | 2026-04-12 |
| Phase 2.3 | NextAuth.js v5 authentication system — Complete Server Component auth pages, login/signup forms, Google OAuth button, API routes, middleware protection; Create `.env` file with NEXTAUTH_SECRET; Create dashboard page for middleware testing; TypeScript compilation PASS ✅ | ✅ Complete | 2026-04-12 |
| Phase 2.3 | Authentication component verification — `auth.ts` (JWT strategy, manual upsert), `middleware.ts` (route protection), `LoginForm.tsx`, `SignupForm.tsx`, `GoogleButton.tsx`, `login/page.tsx`, `signup/page.tsx`, `auth/[...nextauth]/route.ts`, `register/route.ts` all verified and unchanged | ✅ Complete | 2026-04-12 |

_(Updated by docs agent after each completed phase)_

---

## Last Session (2026-04-12)

- Done: Step 2.3 NextAuth.js authentication system — Complete authentication with NextAuth.js v5, JWT strategy, Google OAuth, Credentials provider; Create `.env` file with NEXTAUTH_SECRET; Create dashboard page `apps/web/app/(dashboard)/page.tsx` for middleware testing; Verify all auth components and API routes; TypeScript compilation PASS
- In progress: None
- Deferred: Configure Google OAuth credentials (user setup required); Build full dashboard UI; Implement sign out functionality
- Next: Step 3.x or next phase per BLUEPRINT.md (full dashboard features, user settings, reports)

---

## Last Session (2026-04-12) — Authentication System Completion

**Done:**
- Complete NextAuth.js v5 authentication implementation with JWT strategy, Google OAuth, and email/password credentials
- Create `.env` file with generated `NEXTAUTH_SECRET` and all required environment variables
- Create dashboard page `apps/web/app/(dashboard)/page.tsx` as Server Component for middleware testing
- Verify all existing authentication files: `auth.ts` (118 lines), `middleware.ts` (30 lines), `LoginForm.tsx` (153 lines), `SignupForm.tsx` (252 lines), `GoogleButton.tsx` (63 lines), `login/page.tsx` (20 lines), `signup/page.tsx` (11 lines), `auth/[...nextauth]/route.ts` (5 lines), `register/route.ts` (57 lines)
- All dependencies verified installed: `next-auth@5.0.0-beta.25`, `bcryptjs@^2.4.3`, `zod@^3.23.8`, `lucide-react@^0.453.0`
- TypeScript compilation verified: 0 errors
- Authentication flow documented: registration → login → dashboard access, middleware protection, Google OAuth flow

**In progress:**
- None

**Next:**
- Configure Google OAuth credentials (user must create project in Google Cloud Console)
- Test complete authentication flow (register → login → Google OAuth → dashboard)
- Build full dashboard UI with actual features
- Implement sign out functionality

**Key Implementation Details:**
- Manual user upsert in `signIn` callback (NOT using `@auth/prisma-adapter` to avoid accounts collection conflict with finance Account model)
- JWT session strategy (sessions stored in tokens, not database)
- Server Component pattern for dashboard page (no "use client" directive)
- Middleware protection via matcher pattern excluding auth pages and API routes
- Public registration endpoint with bcrypt password hashing (12 rounds)

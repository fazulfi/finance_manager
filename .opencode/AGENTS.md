# AGENTS.md — Project Conventions & Knowledge Base

> This file is the mandatory first-read for all agents. It contains established conventions, decisions, anti-patterns, and completed phases. Do not rediscover what's documented here.

---

## Project Overview

**Name:** Personal Finance Manager Pro  
**Stack:** Turborepo + Next.js 14 (App Router) + Expo React Native + tRPC + Prisma + MongoDB + TypeScript  
**Blueprint:** See `.opencode/BLUEPRINT.md` for full roadmap (phases 0–6, features per week)  
**Current Phase:** Phase 0 — Prerequisites & Environment Setup (not started)

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
- ❌ Import `apps/*` from `packages/*`
- ❌ N+1 queries — use `include`/`select` in Prisma
- ❌ Return password, tokens, or secrets from any procedure
- ❌ Query without `userId` filter → IDOR vulnerability

## Orchestrator Workflow

> These are the 8 workflow steps the orchestrator follows each session. Step 2 is conditional based on planner complexity rules; Steps 5–8 are wrap-up.

| Step | Name | Owner | Description |
|------|------|-------|-------------|
| 1 | Receive Request | Orchestrator | Parse user intent; classify as refactor / build / research / etc. |
| 2 | PLAN PHASE (when required) | Planner subagent | For non-trivial tasks, decompose work into ready-to-delegate steps; trivial tasks may skip this step per `.opencode/agents/planner.md` |
| 3 | EXECUTION PHASE | Coder / Reviewer / Tester / etc. | Execute plan steps; quality gates enforced after every coder step |
| 4 | RESULT PHASE | Orchestrator | Collect outputs from all subagents; verify acceptance criteria met |
| 5 | DOCS PHASE | Docs subagent | Update README, CHANGELOG, AGENTS.md, DECISION_LOG; prepare git sync |
| 6 | SESSION HANDOFF | Docs subagent | Append "Last Session" block to AGENTS.md so next session has full context |
| 7 | **DOCS GIT SYNC GATE** | **Docs subagent** | Commit and push session docs/git changes to GitHub (see rules below) |
| 8 | Final Response | Orchestrator | Synthesize and deliver final response to user |

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

_(Updated by docs agent after each completed phase)_

---

## Last Session (2026-04-11)

- Done:
  - Completed Step 1.3: Next.js 14 web app bootstrap for apps/web/
  - Created 8 files: next.config.js, tailwind.config.ts, postcss.config.js, .eslintrc.js, .env.example, app/globals.css, app/layout.tsx, app/page.tsx
  - Fixed TS2742 by adding React.JSX.Element return types to RootLayout and HomePage
  - Validation: pnpm install ✅, lint ✅, type-check ✅
  - Build: TypeScript compilation + 4/4 static pages ✅; EPERM symlink on standalone output (Windows Developer Mode required — not a code defect)
- In progress: Nothing — Step 1.3 fully complete
- Next: Step 1.4 — Expo React Native mobile app setup (apps/mobile bootstrap with NativeWind, Expo Router)

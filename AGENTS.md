# Finance Manager Pro - Agent Guidelines

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
vitest run packages/api/src/routers/transaction.test.ts  # Single test file
```

**E2E Tests (Web app):**

```bash
pnpm test:e2e               # Run all E2E tests (Playwright)
pnpm test:e2e:headed        # Run E2E tests in headed mode
playwright test             # Run Playwright directly
playwright test tests/e2e/stock-portfolio.spec.ts  # Single E2E file
playwright test --grep "dashboard"  # Run tests matching a pattern
```

### Single Build/Lint

```bash
pnpm --filter @finance/web build     # Build only web app
pnpm --filter @finance/api build     # Build only API
pnpm --filter @finance/web lint      # Lint only web app
```

---

## Code Style Guidelines

### TypeScript Configuration

- **TypeScript Version:** 5.6.3 (strict mode)
- **File Extensions:** `.ts` for backend, `.tsx` for React components
- **Strict Mode:** Enabled via `@finance/tsconfig/base.json` and `nextjs.json`

### Imports and Naming

- **Import Order:** Type imports first, then imports from internal packages, then external dependencies
  ```typescript
  import type { SomeType } from "module"; // Type imports first
  import { api } from "@finance/api/react"; // Internal packages
  import { useState } from "react"; // External dependencies
  ```
- **Package Imports:** Always use workspace packages:
  - `@finance/api` - tRPC routers, middleware
  - `@finance/db` - Prisma schema and client
  - `@finance/types` - Shared types and Zod schemas
  - `@finance/ui` - UI components
  - `@finance/utils` - Utilities
  - **Alias Paths:** `@/` resolves to `apps/web/src/` for web app
- **Naming Conventions:**
  - Components: PascalCase (e.g., `Dashboard`, `TransactionForm`)
  - Functions/Variables: camelCase (e.g., `getUserId`, `loadingState`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_LIMIT`, `API_BASE_URL`)
  - Interfaces/Types: PascalCase (e.g., `User`, `Transaction`)
  - Booleans: is/has/can prefix (e.g., `isLoading`, `hasError`)

### Server Components vs Client Components

- **Default:** Use Server Components (Next.js App Router)
- **Add `"use client"` only when:**
  - Using useState/useEffect hooks
  - Handling browser-only APIs (localStorage, window)
  - Adding event listeners
  - Using browser-specific libraries
- **Client Component Example:**
  ```typescript
  "use client";
  import { useState } from "react";
  import { api } from "@finance/api/react";
  ```

### tRPC Procedures (API Package)

- **Authentication:** ALL procedures default to `protectedProcedure` except truly public endpoints

  ```typescript
  // Public procedure - only for endpoints that don't require auth
  export const publicProcedure = t.procedure;

  // Protected procedure - enforced by middleware
  export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
  ```

- **Input Validation:** ALWAYS use Zod schemas
  ```typescript
  input: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    id: objectId, // Custom validator
  });
  ```
- **Ownership Filtering:** ALWAYS filter by `userId: ctx.session.user.id`
- **Response Types:** Consistent pagination pattern: `{ items, total, page, limit }`

### Prisma and Database

- **Query Safety:** ALWAYS use `where: { userId: ctx.session.user.id }` for user-specific queries
- **Validation:** Verify ownership before mutations
- **Transaction Usage:** Use `$transaction` for multi-step operations (account transfers)
- **Soft Delete:** Prefer `isActive: false` over hard delete

### React Components

- **State Management:** Use React hooks (useState, useEffect, useMemo)
- **Data Fetching:** Use React Query (`@tanstack/react-query`) via tRPC
  ```typescript
  const analyticsQuery = api.dashboard.getAnalytics.useQuery(analyticsInput);
  const loading = analyticsQuery.isLoading;
  const error = analyticsQuery.error;
  const data = analyticsQuery.data;
  ```
- **Loading States:** Always show loading states for async operations
- **Error Handling:** Display user-friendly error messages
- **Empty States:** Use EmptyState component for missing data

### Styling (Tailwind CSS)

- **Utility Classes:** Use Tailwind CSS for all styling
- **Custom Components:** Create reusable components in `@finance/ui` package
- **Dark Mode:** Use `dark:` prefixes for dark mode variants
- **Responsive Design:** Use responsive prefixes (md:, lg:, xl:)
- **Semantic Classes:** Follow the design system's color palette and spacing

### Error Handling

- **tRPC Errors:** Use `throw new TRPCError({ code: "NOT_FOUND", message: "..." })`
- **Zod Validation:** Error message shows automatically in tRPC responses
- **User Feedback:** Display error messages to users (via ErrorBoundary or UI components)
- **API Errors:** Map internal errors to appropriate tRPC error codes

### File Organization

- **API Routers:** `packages/api/src/routers/[resource].ts`
- **Frontend Components:** `apps/web/components/[category]/[ComponentName].tsx`
- **Pages:** `apps/web/app/[route]/page.tsx` (App Router)
- **Type Definitions:** `packages/types/src/[module].ts`
- **Shared Utilities:** `packages/utils/src/[utility].ts`

### Testing

- **Unit Tests:** Use Vitest in `packages/api/src/**/*.test.ts`
- **E2E Tests:** Use Playwright in `apps/web/tests/e2e/*.spec.ts`
- **Test Isolation:** Mock external dependencies (API calls, database)
- **Snapshot Testing:** Use sparingly, prefer integration tests

### Best Practices

- **Type Safety:** Prefer `as const` for enums and literals
- **Optional Chaining:** Use `?.` for nullable fields
- **Null Checks:** Handle null/undefined cases explicitly
- **Commit Atomicity:** Write small, focused commits
- **Documentation:** Use JSDoc for complex functions and classes
- **Const Assertions:** Use `as const` for literal types

---

## Monorepo Structure

```
finance_manager/
├── apps/
│   ├── web/          # Next.js 14 frontend (App Router)
│   └── mobile/       # Expo React Native mobile app
├── packages/
│   ├── api/          # tRPC routers, middleware, business logic
│   ├── db/           # Prisma schema, migrations
│   ├── types/        # Shared types, Zod schemas
│   ├── ui/           # Reusable UI components
│   └── utils/        # Shared utilities
└── external_repos/   # Third-party code (currently: ghostfolio)
```

---

## Agent Routing Table

| Agent               | Route when                                                                                                                         | Do NOT use when                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `planner`           | Non-trivial work (multi-file, cross-layer, interdependent, or unclear scope)                                                       | Trivial single-file obvious fixes (<10 lines)                       |
| `researcher`        | Internal codebase: find files, trace patterns, map architecture                                                                    | External libraries/packages — use librarian instead                 |
| `librarian`         | External library/package questions: "how does X work?", "best practice for Y?", unfamiliar npm/pip deps                            | Internal codebase — use researcher instead                          |
| `ui-designer`       | ANY frontend component/page/UI task → before coder                                                                                 | Backend-only tasks                                                  |
| `coder`             | Implementation and file changes                                                                                                    | —                                                                   |
| `reviewer`          | After planner output (plan review mode) AND after coder for MANDATORY risk cases per quality_gates §5 (API, auth, financial logic) | Pure UI components, NativeWind styling, config/infra setup          |
| `security-auditor`  | After reviewer when backend task adds new procedures, changes auth/ownership logic, or touches financial invariants                | Pure frontend, docs, config, routine CRUD with no auth changes      |
| `tester`            | Build/test/validation checks                                                                                                       | —                                                                   |
| `debugger`          | After failed build/test OR bug report. On 2nd+ failed attempt: add "ESCALATION MODE" to briefing for architectural analysis.       | Skipping debugger and going straight to escalation on first failure |
| `multimodal-looker` | File path ends in `.pdf`, `.png`, `.jpg`, `.svg`, or described as screenshot/diagram                                               | Plain text, source code, JSON                                       |
| `docs`              | After every completed task                                                                                                         | —                                                                   |

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
- Account transfer procedures must enforce business invariants server-side

### Input Validation Conventions

- All MongoDB ID inputs MUST use the shared `objectId` Zod schema from `packages/api/src/trpc.ts` (regex: `/^[0-9a-fA-F]{24}$/`)
- All string inputs MUST have `.max()` constraints
- All array inputs MUST have `.max()` constraints
- Cross-reference fields MUST be validated for ownership

### Prisma Mutation Safety

- All `update` and `delete` WHERE clauses MUST include `userId`
- Rationale: `findFirst` + bare `{ id }` update is vulnerable to TOCTOU race conditions

### Next.js App Router Conventions

- Default to Server Components — only add `"use client"` when needed
- Data fetching in Server Components via server-side tRPC caller
- Client Components for interactive UI (forms, modals, charts)

### Authentication

- NextAuth.js v5 (`next-auth@beta`) with JWT sessions and manual user upsert
- Providers: Google OAuth + Credentials
- Session strategy: JWT
- Route protection via `middleware.ts` matcher

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
- ❌ Query without `userId` filter → IDOR vulnerability
- ❌ Prisma `update`/`delete` with bare `{ id }` in WHERE
- ❌ Bare `z.string()` for MongoDB ObjectId inputs
- ❌ Unbounded string/array inputs
- ❌ Allow account transfers between inactive accounts or mismatched currencies
- ❌ Store free-text project names in `Transaction.project`

---

## Completed Phases

| Phase     | Description                       | Status      | Completed  |
| --------- | --------------------------------- | ----------- | ---------- |
| Phase 0   | Prerequisites & Environment Setup | ✅ Complete | 2026-04-11 |
| Phase 2.1 | Prisma + MongoDB Schema           | ✅ Complete | 2026-04-11 |
| Phase 2.2 | tRPC API Package Setup            | ✅ Complete | 2026-04-12 |
| Phase 2.3 | NextAuth.js v5 Authentication     | ✅ Complete | 2026-04-12 |
| Phase 2.4 | Shared UI Components              | ✅ Complete | 2026-04-12 |
| Phase 2.5 | Shared Types Package              | ✅ Complete | 2026-04-12 |
| Phase 2.6 | Shared Utils Package              | ✅ Complete | 2026-04-12 |
| Phase 2.7 | Account Management                | ✅ Complete | 2026-04-12 |
| Phase 3.1 | Budget Management System          | ✅ Complete | 2026-04-13 |
| Phase 3.2 | Category Management System        | ✅ Complete | 2026-04-12 |
| Phase 3.3 | Project/Tag System                | ✅ Complete | 2026-04-13 |
| Phase 3.6 | Dashboard & Analytics             | ✅ Complete | 2026-04-14 |
| Phase 3.7 | Savings Goals Feature             | ✅ Complete | 2026-04-14 |
| Phase 3.8 | Debt Management MVP               | ✅ Complete | 2026-04-14 |

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

### UX Rules

- Forms: Show currency symbol before amount, use `inputmode="decimal"`, confirm destructive actions
- Tables: Right-align numbers, use `font-mono`, sticky headers
- Charts: Area chart for balance, donut for categories, bar for income vs expense
- Navigation: Sidebar for desktop, bottom tab bar for mobile
- Cards: Icon + label + value + trend indicator
- Modals: Backdrop blur, focus trapping, ESC key support

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

## Error Handling Conventions

### tRPC Errors

- Use `throw new TRPCError({ code: "NOT_FOUND", message: "..." })`
- Appropriate error codes: `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`

### Validation

- Zod validation errors shown automatically in tRPC responses
- User-friendly error messages displayed to users

### Data Security

- Never return passwords, tokens, or secrets from any procedure
- Always use `select` to avoid returning sensitive fields

---

## Testing Requirements

### Unit Tests

- Location: `packages/api/src/**/*.test.ts`
- Framework: Vitest
- Coverage: Include critical paths
- Mock external dependencies (API calls, database)

### E2E Tests

- Location: `apps/web/tests/e2e/*.spec.ts`
- Framework: Playwright
- Tests financial flows and user workflows

### Test Requirements

- Run `pnpm test` for all API tests
- Run `pnpm test:e2e` for E2E tests
- Never skip testing for critical financial operations

---

## Documentation Updates

**After every completed task, update:**

- `.opencode/CURRENT_CONTEXT.md` — phase progress
- `.opencode/AGENTS.md` — Completed Phases table (add `[docs]` step to plan)
- `.opencode/DECISION_LOG_INDEX.md` — architectural decisions (append one line)
- `.opencode/DECISION_LOG.md` — full decision details
- `CHANGELOG.md` — feature updates

**Docs agent handles:**

- CHANGELOG, AGENTS.md, DECISION_LOG_INDEX, DECISION_LOG, CURRENT_CONTEXT updates
- Git commit + push (automatically)

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

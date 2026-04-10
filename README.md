# Finance Manager Pro

A personal finance management application built with a modern monorepo architecture.

## Stack

- **Web:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Mobile:** Expo React Native + NativeWind + Expo Router
- **API:** tRPC v10 + Zod (end-to-end type safety)
- **Database:** Prisma + MongoDB
- **Auth:** NextAuth.js v5
- **Monorepo:** Turborepo + pnpm workspaces

## Workspace Structure

```
apps/
  web/      → Next.js 14 web application
  mobile/   → Expo React Native mobile app
packages/
  db/       → @finance/db — Prisma client + MongoDB schema
  api/      → @finance/api — tRPC routers
  ui/       → @finance/ui — shared UI components (shadcn/ui)
  types/    → @finance/types — shared TypeScript types + Zod schemas
  utils/    → @finance/utils — pure utility functions
  tsconfig/ → @finance/tsconfig — shared TypeScript configs
  eslint-config/ → @finance/eslint-config — shared ESLint configs
```

## Prerequisites

- Node.js 20 LTS
- pnpm 9.x (`npm install -g pnpm`)
- Expo CLI (`npm install -g expo-cli eas-cli`)

## Getting Started

```bash
pnpm install
pnpm dev
```

## Blueprint

See `.opencode/BLUEPRINT.md` for the full development roadmap (Phases 0–6).

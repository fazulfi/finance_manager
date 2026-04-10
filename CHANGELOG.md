# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

### Fixed — Phase 0 Post-Install Peer Dependency Corrections (2026-04-11)

- Downgraded `@tanstack/react-query` from `^5.59.20` → `^4.36.1` in `apps/web` and `apps/mobile` — tRPC v10 (`@trpc/react-query@10.x`, `@trpc/next@10.x`) requires TanStack Query v4, not v5
- Pinned `react-native-reanimated` to `~3.10.1` in `apps/mobile` — NativeWind 4 transitively resolved to `reanimated@4.3.0` which requires React Native 0.81-0.85; Expo SDK 51 requires reanimated 3.x

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

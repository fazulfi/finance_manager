# @finance/aas

Autonomous Agent System (AAS) - Node.js library for managing autonomous agents.

## Overview

AAS provides a framework for defining, executing, and monitoring autonomous agents that can perform tasks across the finance_manager monorepo.

## Installation

```bash
pnpm add @finance/aas
```

## Features

- **DAG Scheduling**: Run tasks with explicit dependencies and deterministic ordering
- **Parallel Execution**: Real concurrent execution via injected executor (no simulation)
- **Checkpoint/Resume**: Persist run state (`checkpoint.json`) and resume safely
- **Cancellation/Timeouts**: Run-level and per-task abort support wired into execution
- **Plan-Driven Quality Gates**: Fail-closed gates derived from the plan (sanity/reviewer/tester/security); bypass is explicit (`--unsafe-gates`)
- **Plan Execution**: Parse a markdown plan into a `Task[]` DAG (`dependsOn`) and execute it via `start-aas --plan-file`
- **Type Safety**: Full TypeScript support with Zod validation

## Configuration

Create a `.env.aas` file in your project root:

```bash
cp packages/aas/.env.aas .env.aas
```

Key environment variables:

| Variable                    | Default        | Description                                                    |
| --------------------------- | -------------- | -------------------------------------------------------------- |
| `AAS_LOG_LEVEL`             | `info`         | Logging level (trace, debug, info, warn, error, fatal)         |
| `AAS_PRETTY_LOGGING`        | `true`         | Enable human-readable logging                                  |
| `AAS_MAX_CONCURRENT_AGENTS` | `1`            | Maximum concurrent agent processes                             |
| `AAS_DEFAULT_AGENT_TIMEOUT` | `300000`       | Default timeout in milliseconds                                |
| `AAS_RUN_DIR`               | `./.aas/runs`  | Base directory for run checkpoints (`<runId>/checkpoint.json`) |
| `AAS_OUTPUT_DIR`            | `./aas-output` | Output directory used by the runtime (if configured)           |
| `AAS_LOG_DIR`               | `./aas-logs`   | Log output directory (if configured)                           |

## Usage

### Defining an Agent

```typescript
import { Agent } from "@finance/aas";

const myAgent: Agent = {
  id: "agent-1",
  name: "Code Reviewer",
  mode: "primary",
  thinking: "medium",
  permission: {
    read: ["packages/**/*"],
    list: true,
    glob: true,
    grep: true,
    lsp: true,
    edit: true,
    bash: true,
    webfetch: true,
    task: {
      reviewer: "allow",
      coder: "allow",
    },
  },
};
```

### Executing a Task

```typescript
import { Process, Task } from "@finance/aas";

const task: Task = {
  id: "task-1",
  step: "Run linter",
  subagent: "agent-1",
  brief: "Check code quality",
  context: {
    requestSummary: "Check for linting errors",
    currentState: { projectPath: "/path/to/project" },
    previousWork: "",
    filesToCreate: [],
    filesToModify: [],
  },
};

const process: Process = {
  agent: myAgent,
  args: ["lint"],
  env: { PROJECT_PATH: "/path/to/project" },
  timeout: 60000,
};
```

### Running AAS CLI

```bash
# Start AAS orchestration
node bin/start-aas

# Run a specific agent
node bin/run-agent <agent-id> --task-id <task-id>
```

Common flags:

- `node bin/start-aas --unsafe-gates` (explicit bypass; otherwise gates fail-closed)
- `node bin/start-aas --concurrency 4 --run-id my-run --resume my-run`
- `node bin/start-aas --plan-file ./path/to/plan.md` (parse plan steps and execute as a DAG)
- `node bin/run-agent --timeout-ms 60000 --cancel-after-ms 5000 ...`

Notes:

- `--plan-file` defaults to `.opencode/plans/current-plan.md` (local-only; intentionally not tracked in git).
- `--run-dir` and resume/checkpoint paths are confined within the repo and validated using realpath-based checks to prevent symlink/junction escapes.

### Quality gates (plan-driven)

When running `start-aas` against a plan, quality gates are derived from the markdown plan content:

- **Sanity**: plan must include `### Agent Execution Steps` and `## Verification`.
- **Reviewer**: `coder` and `docs` tasks must depend (transitively) on a `reviewer` task.
- **Tester**: `docs` tasks must depend (transitively) on a `tester` task.
- **Security**: if any plan step scope matches risky patterns (`packages/api`, `packages/db`, `schema.prisma`, `auth`, `middleware`), the plan must include a `security-auditor` task; risky `coder` tasks must have a downstream `security-auditor`, and `docs` must depend on a `security-auditor`.

Bypass is CLI-flag-only: `--unsafe-gates`. There is no env/dotenv bypass.

### Plan File Format (Markdown)

`start-aas --plan-file` looks for a `### Agent Execution Steps` section and parses `**Step N**` blocks.

```markdown
### Agent Execution Steps

**Step 1** — SEQUENTIAL — Subagent: `planner`

- OBJECTIVE: Draft an implementation plan.
- SCOPE: Identify files to touch and verification steps.
- EXPECTED OUTPUT: A concrete plan document.
- SUCCESS CRITERIA: Plan covers required files and risks.

**Step 2** — PARALLEL: after steps 1 — Subagent: `coder`

- OBJECTIVE: Implement the planned changes.
- SCOPE: Modify only the files listed in the plan.
- EXPECTED OUTPUT: Passing tests and updated code.
- SUCCESS CRITERIA: All verification targets pass.
```

## Project Structure

```
packages/aas/
├── src/
│   ├── types.ts          # Core TypeScript interfaces
│   ├── index.ts          # Barrel export
│   └── aas.ts            # AAS implementation (to be added)
├── bin/
│   ├── start-aas         # AAS entry point
│   └── run-agent         # Agent execution entry point
├── .env.aas              # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## Development

```bash
# Type check
pnpm --filter @finance/aas type-check

# Lint
pnpm --filter @finance/aas lint

# Test
pnpm --filter @finance/aas test

# Build
pnpm --filter @finance/aas build
```

## API Reference

### Core Types

- **Agent**: Agent configuration with permissions
- **Task**: Task definition for agent execution
- **Process**: Process execution parameters
- **AgentResult**: Result of agent execution
- **TaskQueueEntry**: Queue state tracker
- **AASConfig**: Runtime configuration

### Agent Permissions

| Permission | Description                       |
| ---------- | --------------------------------- |
| `read`     | Glob pattern for read access      |
| `list`     | Directory listing capability      |
| `glob`     | File glob matching capability     |
| `grep`     | File content searching capability |
| `lsp`      | Language Server Protocol access   |
| `edit`     | File editing capability           |
| `bash`     | Bash command execution            |
| `webfetch` | Web page fetching                 |
| `task`     | Subtask delegation control        |

## License

MIT

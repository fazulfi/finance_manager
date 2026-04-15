# @finance/aas

Autonomous Agent System (AAS) - Node.js library for managing autonomous agents.

## Overview

AAS provides a framework for defining, executing, and monitoring autonomous agents that can perform tasks across the finance_manager monorepo.

## Installation

```bash
pnpm add @finance/aas
```

## Features

- **Agent Definition**: Define agents with specific permissions and capabilities
- **Task Execution**: Queue and execute tasks across multiple agents
- **Process Management**: Control process execution with timeouts and environment variables
- **Logging**: Structured logging with pino (supports pretty logging)
- **Type Safety**: Full TypeScript support with Zod validation

## Configuration

Create a `.env.aas` file in your project root:

```bash
cp packages/aas/.env.aas .env.aas
```

Key environment variables:

| Variable                    | Default  | Description                                            |
| --------------------------- | -------- | ------------------------------------------------------ |
| `AAS_LOG_LEVEL`             | `info`   | Logging level (trace, debug, info, warn, error, fatal) |
| `AAS_PRETTY_LOGGING`        | `true`   | Enable human-readable logging                          |
| `AAS_MAX_CONCURRENT_AGENTS` | `1`      | Maximum concurrent agent processes                     |
| `AAS_DEFAULT_AGENT_TIMEOUT` | `300000` | Default timeout in milliseconds                        |

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
# Start AAS server
node bin/start-aas

# Run a specific agent
node bin/run-agent <agent-id> --task-id <task-id>
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

#!/usr/bin/env node

import { Command } from "commander";
import { access } from "fs/promises";
import pino from "pino";
import pinoPretty from "pino-pretty";
import path from "path";
import { fileURLToPath } from "url";
import { AASOrchestrator, loadAASConfig } from "@finance/aas";
import type { AASConfig, Agent, QualityGateHooks, Task } from "@finance/aas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_ENV_FILE = ".env.aas";
const DEFAULT_PLAN_FILE = path.join(".opencode", "plans", "current-plan.md");
const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

// Create logger
const logger = pino(
  pinoPretty({
    translateTime: "SYS:standard",
    ignore: "pid,hostname",
    colorize: true,
  }),
);

type StartAASOptions = {
  logLevel: string;
  envFile: string;
  taskId?: string;
  step: string;
  subagent: string;
  taskBrief: string;
  planFile: string;
};

export async function runStartAAS(options: StartAASOptions): Promise<number> {
  logger.info({ options }, "Starting AAS orchestration");

  try {
    const envPath = await resolveEnvFilePath(options.envFile);
    const dotenv = await import("dotenv");
    dotenv.config({ path: envPath });

    const loadedConfig = await loadAASConfig(envPath);
    const config = buildRuntimeConfig(loadedConfig, normalizeLogLevel(options.logLevel));
    const hooks = createDefaultQualityGateHooks("start-aas");
    const orchestrator = new AASOrchestrator(config, {
      hooks: { qualityGates: hooks },
      planFilePath: options.planFile,
    });

    const task = createTaskFromOptions(options);
    logger.info(
      {
        taskId: task.id,
        subagent: task.subagent,
        step: task.step,
        maxConcurrentAgents: config.maxConcurrentAgents,
      },
      "Dispatching orchestrator task",
    );

    try {
      const persistedPlan = await orchestrator.persistPlan(buildRuntimePlan(task));
      logger.info({ persistedPlan }, "Persisted current plan artifact");
    } catch (error) {
      logger.warn({ error }, "Plan persistence skipped due to runtime safeguard");
    }

    const [state] = await orchestrator.execute([task]);
    if (!state || state.status !== "completed" || !state.result?.success) {
      logger.error({ state }, "Orchestrator task failed");
      return 1;
    }

    logger.info({ taskId: task.id, status: state.status }, "AAS orchestration completed");
    return 0;
  } catch (error) {
    logger.error({ error }, "Failed to start AAS orchestration");
    return 1;
  }
}

export function createStartAASProgram(): Command {
  const program = new Command();

  program
    .name("start-aas")
    .description("Start AAS orchestration flow")
    .version("0.0.1")
    .option("--log-level <level>", "Logging level (trace, debug, info, warn, error, fatal)", "info")
    .option("--env-file <path>", "Path to environment file", DEFAULT_ENV_FILE)
    .option("--task-id <string>", "Task ID override")
    .option("--step <string>", "Orchestration step label", "orchestrator-dispatch")
    .option("--subagent <string>", "Subagent id to execute", "planner")
    .option("--task-brief <string>", "Task brief", "Execute orchestrator bootstrap step")
    .option("--plan-file <path>", "Plan file path", DEFAULT_PLAN_FILE)
    .action(async (options) => {
      const code = await runStartAAS(options as StartAASOptions);
      process.exitCode = code;
    });

  return program;
}

const isMainModule =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const program = createStartAASProgram();
  void program.parseAsync(process.argv).catch((error) => {
    logger.error({ error }, "start-aas failed");
    process.exit(1);
  });
}

function createTaskFromOptions(options: StartAASOptions): Task {
  const taskId = options.taskId || `orchestrator-${Date.now()}`;

  return {
    id: taskId,
    step: options.step,
    subagent: options.subagent,
    brief: options.taskBrief,
    context: {
      requestSummary: options.taskBrief,
      currentState: {
        entrypoint: "start-aas",
      },
      previousWork: "",
      filesToCreate: [],
      filesToModify: [options.planFile],
    },
  };
}

function buildRuntimePlan(task: Task): string {
  const generatedAt = new Date().toISOString();
  return [
    `# Runtime Plan`,
    ``,
    `- generatedAt: ${generatedAt}`,
    `- taskId: ${task.id}`,
    `- step: ${task.step}`,
  ].join("\n");
}

function normalizeLogLevel(value: string): LogLevel {
  const level = value.toLowerCase() as LogLevel;
  if (LOG_LEVELS.includes(level)) {
    return level;
  }

  return "info";
}

function buildRuntimeConfig(loadedConfig: AASConfig, logLevel: LogLevel): AASConfig {
  const hasAgentRegistry = Object.keys(loadedConfig.agentRegistry).length > 0;
  return {
    ...loadedConfig,
    logLevel,
    agentRegistry: hasAgentRegistry ? loadedConfig.agentRegistry : createDefaultAgentRegistry(),
  };
}

function createDefaultAgentRegistry(): Record<string, Agent> {
  return {
    planner: createAgent("planner", "Planner", "primary", "medium", true),
    coder: createAgent("coder", "Coder", "subagent", "high", true),
    reviewer: createAgent("reviewer", "Reviewer", "subagent", "low", false),
    tester: createAgent("tester", "Tester", "subagent", "medium", true),
    "security-auditor": createAgent(
      "security-auditor",
      "Security Auditor",
      "subagent",
      "medium",
      false,
    ),
  };
}

function createAgent(
  id: string,
  name: string,
  mode: Agent["mode"],
  thinking: Agent["thinking"],
  canRunBash: boolean,
): Agent {
  return {
    id,
    name,
    mode,
    thinking,
    permission: {
      read: ["**/*.{ts,tsx,js,jsx,json,md}"],
      list: true,
      glob: true,
      grep: true,
      lsp: true,
      edit: true,
      bash: canRunBash,
      webfetch: false,
      task: {},
    },
  };
}

function createDefaultQualityGateHooks(source: string): QualityGateHooks {
  return {
    sanity: () => ({ stage: "sanity", decision: "pass", metadata: { source } }),
    reviewer: () => ({ stage: "reviewer", decision: "pass", metadata: { source } }),
    tester: () => ({ stage: "tester", decision: "pass", metadata: { source } }),
    security: () => ({ stage: "security", decision: "pass", metadata: { source } }),
  };
}

async function resolveEnvFilePath(inputPath: string): Promise<string> {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  const candidates = [
    path.resolve(process.cwd(), inputPath),
    path.resolve(ROOT_DIR, "packages", "aas", inputPath),
    path.resolve(__dirname, inputPath),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue resolving fallback candidates
    }
  }

  return candidates[0] ?? path.resolve(process.cwd(), inputPath);
}

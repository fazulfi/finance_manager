#!/usr/bin/env node

import { access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { Command } from "commander";
import pino from "pino";
import pinoPretty from "pino-pretty";

import { AASOrchestrator, loadAASConfig } from "../index.js";
import type { AASConfig, Agent, QualityGateHooks, Task } from "../index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..", "..", "..");
const DEFAULT_ENV_FILE = ".env.aas";
const DEFAULT_PLAN_FILE = path.join(".opencode", "plans", "current-plan.md");
const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

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
  concurrency?: number;
  runId?: string;
  runDir?: string;
  resume?: string;
  runTimeoutMs?: number;
  taskTimeoutMs?: number;
  unsafeGates?: boolean;
};

export async function runStartAAS(options: StartAASOptions): Promise<number> {
  logger.info({ options }, "Starting AAS orchestration");

  try {
    const envPath = await resolveEnvFilePath(options.envFile);
    const dotenv = await import("dotenv");
    dotenv.config({ path: envPath });

    const loadedConfig = await loadAASConfig(envPath);
    const config = buildRuntimeConfig(loadedConfig, normalizeLogLevel(options.logLevel));
    const unsafeGates =
      Boolean(options.unsafeGates) || /^(1|true|yes)$/i.test(process.env.AAS_UNSAFE_GATES ?? "");
    const hooks = createDefaultQualityGateHooks("start-aas", { unsafeGates });
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

    const runControl = normalizeRunControl(options);
    const states = await orchestrator.executeRun([task], {
      ...(runControl.concurrency ? { concurrency: runControl.concurrency } : {}),
      ...(runControl.runId ? { runId: runControl.runId } : {}),
      ...(runControl.runDir ? { runDir: runControl.runDir } : {}),
      resume: runControl.resume,
      ...(runControl.resumeFromPath ? { resumeFromPath: runControl.resumeFromPath } : {}),
      ...(runControl.runTimeoutMs ? { runTimeoutMs: runControl.runTimeoutMs } : {}),
      ...(runControl.taskTimeoutMs ? { defaultTaskTimeoutMs: runControl.taskTimeoutMs } : {}),
    });

    const state = states.find((s) => s.taskId === task.id);
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
    .option("--concurrency <n>", "Max concurrent tasks", (value) => parseInt(value, 10))
    .option("--run-id <id>", "Run id override")
    .option("--run-dir <path>", "Run directory (must be within repo)")
    .option("--resume <checkpointPath|runId>", "Resume from checkpoint")
    .option("--unsafe-gates", "Pass all quality gates (UNSAFE; equivalent to AAS_UNSAFE_GATES=1)")
    .option("--run-timeout-ms <n>", "Global run timeout in ms", (value) => parseInt(value, 10))
    .option("--task-timeout-ms <n>", "Default per-task timeout in ms", (value) =>
      parseInt(value, 10),
    )
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

function createDefaultQualityGateHooks(
  source: string,
  options: { unsafeGates: boolean },
): QualityGateHooks {
  if (options.unsafeGates) {
    return {
      sanity: () => ({ stage: "sanity", decision: "pass", metadata: { source } }),
      reviewer: () => ({ stage: "reviewer", decision: "pass", metadata: { source } }),
      tester: () => ({ stage: "tester", decision: "pass", metadata: { source } }),
      security: () => ({ stage: "security", decision: "pass", metadata: { source } }),
    };
  }

  const reason =
    "Default quality gates are fail-closed. Provide real hooks or re-run with --unsafe-gates (or set AAS_UNSAFE_GATES=1) to bypass.";
  return {
    sanity: () => ({ stage: "sanity", decision: "fail", reason, metadata: { source } }),
    reviewer: () => ({ stage: "reviewer", decision: "fail", reason, metadata: { source } }),
    tester: () => ({ stage: "tester", decision: "fail", reason, metadata: { source } }),
    security: () => ({ stage: "security", decision: "fail", reason, metadata: { source } }),
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
      // continue
    }
  }

  return candidates[0] ?? path.resolve(process.cwd(), inputPath);
}

function normalizeRunControl(options: StartAASOptions): {
  concurrency?: number;
  runId?: string;
  runDir?: string;
  resume: boolean;
  resumeFromPath?: string;
  runTimeoutMs?: number;
  taskTimeoutMs?: number;
} {
  const concurrency =
    typeof options.concurrency === "number" && Number.isFinite(options.concurrency)
      ? Math.max(1, Math.trunc(options.concurrency))
      : undefined;
  const runTimeoutMs =
    typeof options.runTimeoutMs === "number" && Number.isFinite(options.runTimeoutMs)
      ? Math.max(1, Math.trunc(options.runTimeoutMs))
      : undefined;
  const taskTimeoutMs =
    typeof options.taskTimeoutMs === "number" && Number.isFinite(options.taskTimeoutMs)
      ? Math.max(1, Math.trunc(options.taskTimeoutMs))
      : undefined;

  const base = {
    ...(typeof concurrency === "number" ? { concurrency } : {}),
    ...(typeof runTimeoutMs === "number" ? { runTimeoutMs } : {}),
    ...(typeof taskTimeoutMs === "number" ? { taskTimeoutMs } : {}),
  };

  const resumeArg = typeof options.resume === "string" ? options.resume.trim() : "";
  if (!resumeArg) {
    return {
      ...base,
      ...(options.runId ? { runId: options.runId } : {}),
      ...(options.runDir ? { runDir: options.runDir } : {}),
      resume: false,
    };
  }

  if (resumeArg.endsWith(".json")) {
    const resumePath = path.resolve(resumeArg);
    if (path.basename(resumePath) !== "checkpoint.json") {
      throw new Error("Resume path must point to checkpoint.json");
    }
    const runId = path.basename(path.dirname(resumePath));
    const runDir = path.dirname(path.dirname(resumePath));

    if (options.runId && options.runId !== runId) {
      throw new Error(`--run-id (${options.runId}) must match resume run id (${runId})`);
    }
    if (options.runDir && path.resolve(options.runDir) !== path.resolve(runDir)) {
      throw new Error(`--run-dir (${options.runDir}) must match resume run dir (${runDir})`);
    }

    return {
      ...base,
      runId,
      runDir,
      resume: true,
      resumeFromPath: resumePath,
    };
  }

  return {
    ...base,
    runId: options.runId ?? resumeArg,
    ...(options.runDir ? { runDir: options.runDir } : {}),
    resume: true,
  };
}

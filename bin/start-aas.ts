#!/usr/bin/env node

import { Command } from "commander";
import { access, open, realpath } from "fs/promises";
import pino from "pino";
import pinoPretty from "pino-pretty";
import path from "path";
import { fileURLToPath } from "url";
import {
  AASOrchestrator,
  loadAASConfig,
  parsePlanMarkdown,
  PLAN_LIMITS,
  planToRun,
} from "@finance/aas";
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
    const unsafeEnvBeforeDotenv = process.env.AAS_UNSAFE_GATES === "1";
    const dotenv = await import("dotenv");
    dotenv.config({ path: envPath });

    const loadedConfig = await loadAASConfig(envPath);
    const config = buildRuntimeConfig(loadedConfig, normalizeLogLevel(options.logLevel));
    const unsafeGates = Boolean(options.unsafeGates) || unsafeEnvBeforeDotenv;
    const hooks = createDefaultQualityGateHooks("start-aas", { unsafeGates });
    const orchestrator = new AASOrchestrator(config, {
      hooks: { qualityGates: hooks },
      planFilePath: options.planFile,
    });

    const runControl = await normalizeRunControl(options);
    const planTasks = await loadExecutablePlanTasks(options.planFile, {
      ...(typeof runControl.taskTimeoutMs === "number"
        ? { defaultTimeoutMs: runControl.taskTimeoutMs }
        : {}),
    });
    const tasks = planTasks ?? [createTaskFromOptions(options)];

    if (tasks.length === 1) {
      const task = tasks[0];
      logger.info(
        {
          taskId: task?.id,
          subagent: task?.subagent,
          step: task?.step,
          maxConcurrentAgents: config.maxConcurrentAgents,
        },
        "Dispatching orchestrator task",
      );
    } else {
      logger.info(
        { taskCount: tasks.length, maxConcurrentAgents: config.maxConcurrentAgents },
        "Dispatching orchestrator run from plan DAG",
      );
    }

    try {
      const persistedPlan = await orchestrator.persistPlan(
        buildRuntimePlan(tasks[0] ?? createTaskFromOptions(options)),
      );
      logger.info({ persistedPlan }, "Persisted current plan artifact");
    } catch (error) {
      logger.warn({ error }, "Plan persistence skipped due to runtime safeguard");
    }

    const states = await orchestrator.executeRun(tasks, {
      concurrency: runControl.concurrency,
      runId: runControl.runId,
      runDir: runControl.runDir,
      resume: runControl.resume,
      resumeFromPath: runControl.resumeFromPath,
      runTimeoutMs: runControl.runTimeoutMs,
      defaultTaskTimeoutMs: runControl.taskTimeoutMs,
    });

    const failures = states.filter(
      (state) => state.status !== "completed" || !state.result?.success,
    );
    if (failures.length > 0) {
      logger.error({ failures }, "Orchestrator run failed");
      return 1;
    }

    logger.info({ taskCount: tasks.length }, "AAS orchestration completed");
    return 0;
  } catch (error) {
    logger.error({ error }, "Failed to start AAS orchestration");
    return 1;
  }
}

async function loadExecutablePlanTasks(
  planFile: string,
  options: { defaultTimeoutMs?: number },
): Promise<Task[] | null> {
  const resolvedPath = path.resolve(planFile);
  const limitBytes = PLAN_LIMITS.maxInputBytes;

  let content = "";
  try {
    const handle = await open(resolvedPath, "r");
    try {
      const stat = await handle.stat();
      if (stat.size > limitBytes) {
        const error = new Error(
          `Plan file exceeds maximum size (${stat.size} bytes > ${limitBytes} bytes): ${resolvedPath}`,
        );
        error.name = "PlanFileTooLargeError";
        throw error;
      }

      content = await handle.readFile({ encoding: "utf8" });
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (error instanceof Error && error.name === "PlanFileTooLargeError") {
      throw error;
    }

    logger.warn(
      { error, planFilePath: resolvedPath },
      "Plan file unreadable; falling back to single-task mode",
    );
    return null;
  }

  const seemsExecutablePlan =
    /###\s+Agent Execution Steps\s*$/im.test(content) || /^\s*\*\*Step\s+\d+\*\*/im.test(content);

  let parsed: ReturnType<typeof parsePlanMarkdown>;
  try {
    parsed = parsePlanMarkdown(content);
  } catch (error) {
    if (seemsExecutablePlan) {
      throw error;
    }

    logger.warn(
      { error, planFilePath: resolvedPath },
      "Failed to parse plan file (no executable steps detected); falling back to single-task mode",
    );
    return null;
  }

  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    logger.warn(
      { planFilePath: resolvedPath, warning: parsed.warning },
      "Plan file contains no executable steps; falling back to single-task mode",
    );
    return null;
  }

  return planToRun(parsed.steps, {
    ...(typeof options.defaultTimeoutMs === "number"
      ? { defaultTimeoutMs: options.defaultTimeoutMs }
      : {}),
    planFilePath: planFile,
  });
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
    .option(
      "--unsafe-gates",
      "Pass all quality gates (UNSAFE; equivalent to pre-set AAS_UNSAFE_GATES=1)",
    )
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
      // Continue resolving fallback candidates
    }
  }

  return candidates[0] ?? path.resolve(process.cwd(), inputPath);
}

function isPathWithin(parentPath: string, childPath: string): boolean {
  const rel = path.relative(parentPath, childPath);
  if (rel === "") {
    return true;
  }
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

async function realpathAllowMissing(targetPath: string): Promise<string> {
  const resolved = path.resolve(targetPath);
  const suffix: string[] = [];

  let cursor = resolved;
  let done = false;
  while (!done) {
    try {
      const realAncestor = await realpath(cursor);
      done = true;
      return suffix.length > 0 ? path.join(realAncestor, ...suffix) : realAncestor;
    } catch (error) {
      if (cursor === path.dirname(cursor)) {
        throw error;
      }
      suffix.unshift(path.basename(cursor));
      cursor = path.dirname(cursor);
    }
  }

  throw new Error("Failed to resolve path");
}

async function resolveRunDir(runDir: string, repoRootReal: string): Promise<string> {
  const runDirReal = await realpathAllowMissing(path.resolve(runDir));
  if (!isPathWithin(repoRootReal, runDirReal)) {
    throw new Error(`--run-dir must be within repo root (${repoRootReal})`);
  }
  return runDirReal;
}

async function normalizeRunControl(options: StartAASOptions): Promise<{
  concurrency?: number;
  runId?: string;
  runDir?: string;
  resume: boolean;
  resumeFromPath?: string;
  runTimeoutMs?: number;
  taskTimeoutMs?: number;
}> {
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

  const repoRootReal = await realpath(ROOT_DIR);

  const resumeArg = typeof options.resume === "string" ? options.resume.trim() : "";
  if (!resumeArg) {
    const runDir = options.runDir ? await resolveRunDir(options.runDir, repoRootReal) : undefined;
    return {
      concurrency,
      runId: options.runId,
      runDir,
      resume: false,
      runTimeoutMs,
      taskTimeoutMs,
    };
  }

  if (resumeArg.endsWith(".json")) {
    const resumePathResolved = path.resolve(resumeArg);
    const resumePath = await realpath(resumePathResolved);
    if (path.basename(resumePath) !== "checkpoint.json") {
      throw new Error("Resume path must point to checkpoint.json");
    }

    const runId = path.basename(path.dirname(resumePath));
    const runDirFromResume = path.dirname(path.dirname(resumePath));
    const runDir = await resolveRunDir(runDirFromResume, repoRootReal);
    if (!isPathWithin(runDir, resumePath)) {
      throw new Error("Resume path must be within --run-dir");
    }

    if (options.runId && options.runId !== runId) {
      throw new Error(`--run-id (${options.runId}) must match resume run id (${runId})`);
    }
    if (options.runDir) {
      const providedRunDir = await resolveRunDir(options.runDir, repoRootReal);
      if (providedRunDir !== runDir) {
        throw new Error(`--run-dir (${options.runDir}) must match resume run dir (${runDir})`);
      }
    }

    return {
      concurrency,
      runId,
      runDir,
      resume: true,
      resumeFromPath: resumePath,
      runTimeoutMs,
      taskTimeoutMs,
    };
  }

  const runDir = options.runDir ? await resolveRunDir(options.runDir, repoRootReal) : undefined;

  return {
    concurrency,
    runId: options.runId ?? resumeArg,
    runDir,
    resume: true,
    runTimeoutMs,
    taskTimeoutMs,
  };
}

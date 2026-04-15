#!/usr/bin/env node

import { access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { Command } from "commander";
import pino from "pino";
import pinoPretty from "pino-pretty";
import { z } from "zod";

import { AASOrchestrator, loadAASConfig } from "../index.js";
import type { AASConfig, Agent, AgentResult, QualityGateHooks, Task } from "../index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..", "..", "..");
const DEFAULT_ENV_FILE = ".env.aas";

const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: z.enum(["primary", "subagent"]),
  thinking: z.enum(["low", "medium", "high"]),
  permission: z.object({
    read: z.array(z.string()),
    list: z.boolean(),
    glob: z.boolean(),
    grep: z.boolean(),
    lsp: z.boolean(),
    edit: z.boolean(),
    bash: z.boolean(),
    webfetch: z.boolean(),
    task: z.record(z.enum(["allow", "deny"])),
  }),
});

const agentResultSchema: z.ZodType<AgentResult> = z.object({
  agent: agentSchema,
  success: z.boolean(),
  output: z.string(),
  errors: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const logger = pino(
  pinoPretty({
    translateTime: "SYS:standard",
    ignore: "pid,hostname",
    colorize: true,
  }),
);

type RunAgentMode = "single" | "quality-gate";

type RunAgentOptions = {
  agentId: string;
  taskId: string;
  taskBrief?: string;
  configFile: string;
  envFile: string;
  executionMode: RunAgentMode;
  qualityGateStage?: "sanity" | "reviewer" | "tester" | "security";
  timeoutMs?: number;
  cancelAfterMs?: number;
};

export async function runAgent(options: RunAgentOptions): Promise<number> {
  logger.info({ options }, "Running agent task");

  try {
    const envPath = await resolveConfigPath(options.envFile);
    const configPath = await resolveConfigPath(options.configFile);
    const dotenv = await import("dotenv");
    dotenv.config({ path: envPath });

    const loadedConfig = await loadAASConfig(configPath);
    const config = buildRuntimeConfig(loadedConfig);

    const agent = config.agentRegistry[options.agentId];
    if (!agent) {
      throw new Error(`Agent not found: ${options.agentId}`);
    }

    const task = createTask(options);
    const orchestrator = new AASOrchestrator(config, {
      hooks: {
        qualityGates: createQualityGateHooks(options.executionMode, options.qualityGateStage),
      },
      agentScriptPath: await resolveAgentScriptPath(),
    });

    const controller = new AbortController();
    const cancelAfterMs =
      typeof options.cancelAfterMs === "number" && Number.isFinite(options.cancelAfterMs)
        ? Math.max(1, Math.trunc(options.cancelAfterMs))
        : undefined;
    const timeoutMs =
      typeof options.timeoutMs === "number" && Number.isFinite(options.timeoutMs)
        ? Math.max(1, Math.trunc(options.timeoutMs))
        : undefined;

    const cancelTimer = cancelAfterMs
      ? setTimeout(() => controller.abort("Cancelled via CLI"), cancelAfterMs)
      : undefined;

    const state = await orchestrator.executeTask(task, {
      signal: controller.signal,
      ...(timeoutMs ? { timeoutMs } : {}),
    });

    if (cancelTimer) {
      clearTimeout(cancelTimer);
    }

    const result = safeParseOrchestratedResult(state.result, agent);
    logAndPrintResult(result);

    return result.success ? 0 : 1;
  } catch (error) {
    logger.error({ error }, "Agent task failed");
    return 1;
  }
}

export function createRunAgentProgram(): Command {
  const program = new Command();

  program
    .name("run-agent")
    .description("Execute an agent task through orchestrator")
    .version("0.0.1")
    .requiredOption("-a, --agent-id <string>", "Agent ID to execute")
    .requiredOption("-t, --task-id <string>", "Task ID to execute")
    .option("--task-brief <string>", "Brief description of the task")
    .option("--config-file <path>", "Path to AAS config file", DEFAULT_ENV_FILE)
    .option("--env-file <path>", "Path to environment file", DEFAULT_ENV_FILE)
    .option("--execution-mode <mode>", "Execution mode (single|quality-gate)", "single")
    .option("--quality-gate-stage <stage>", "Quality gate stage (sanity|reviewer|tester|security)")
    .option("--timeout-ms <n>", "Override task timeout in milliseconds", (value) =>
      parseInt(value, 10),
    )
    .option("--cancel-after-ms <n>", "Cancel task after N milliseconds (test utility)", (value) =>
      parseInt(value, 10),
    )
    .action(async (options) => {
      const code = await runAgent(options as RunAgentOptions);
      process.exitCode = code;
    });

  return program;
}

const isMainModule =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const program = createRunAgentProgram();
  void program.parseAsync(process.argv).catch((error) => {
    logger.error({ error }, "run-agent failed");
    process.exit(1);
  });
}

function createTask(options: RunAgentOptions): Task {
  const requestSummary = options.taskBrief || "Execute agent task";
  const step =
    options.executionMode === "quality-gate"
      ? `quality-gate:${options.qualityGateStage ?? "sanity"}`
      : "single";

  return {
    id: options.taskId,
    step,
    subagent: options.agentId,
    brief: requestSummary,
    context: {
      requestSummary,
      currentState: {
        executionMode: options.executionMode,
        qualityGateStage: options.qualityGateStage,
      },
      previousWork: "",
      filesToCreate: [],
      filesToModify: [],
    },
  };
}

function createQualityGateHooks(
  mode: RunAgentMode,
  selectedStage?: RunAgentOptions["qualityGateStage"],
): QualityGateHooks {
  if (mode === "quality-gate" && !selectedStage) {
    throw new Error("quality-gate execution mode requires --quality-gate-stage");
  }

  return {
    sanity: ({ stage }) => ({
      stage,
      decision: "pass",
      metadata: { mode, selectedStage, triggered: stage === selectedStage },
    }),
    reviewer: ({ stage }) => ({
      stage,
      decision: "pass",
      metadata: { mode, selectedStage, triggered: stage === selectedStage },
    }),
    tester: ({ stage }) => ({
      stage,
      decision: "pass",
      metadata: { mode, selectedStage, triggered: stage === selectedStage },
    }),
    security: ({ stage }) => ({
      stage,
      decision: "pass",
      metadata: { mode, selectedStage, triggered: stage === selectedStage },
    }),
  };
}

function safeParseOrchestratedResult(result: AgentResult | undefined, agent: Agent): AgentResult {
  const parsed = agentResultSchema.safeParse(result);
  if (parsed.success) {
    return parsed.data;
  }

  return {
    agent,
    success: false,
    output: result?.output || "",
    errors: [
      "Invalid terminal agent payload",
      ...parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    ],
  };
}

function logAndPrintResult(result: AgentResult): void {
  if (result.success) {
    logger.info(
      { agentId: result.agent.id, outputLength: result.output.length },
      "Agent completed successfully",
    );
  } else {
    logger.error(
      { agentId: result.agent.id, errors: result.errors },
      "Agent completed with errors",
    );
  }

  writeLine("\n=== Agent Result ===");
  writeLine(`Agent: ${result.agent.name} (${result.agent.id})`);
  writeLine(`Success: ${result.success ? "Yes" : "No"}`);
  if (result.errors && result.errors.length > 0) {
    writeLine("Errors:");
    result.errors.forEach((error) => writeLine(`  - ${error}`));
  }
  writeLine("\n--- Output ---");
  writeLine(result.output);
  writeLine("==================\n");
}

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function buildRuntimeConfig(loadedConfig: AASConfig): AASConfig {
  if (Object.keys(loadedConfig.agentRegistry).length > 0) {
    return loadedConfig;
  }

  return {
    ...loadedConfig,
    agentRegistry: createDefaultAgentRegistry(),
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

async function resolveAgentScriptPath(): Promise<string> {
  const compiledAgentPath = path.resolve(ROOT_DIR, "packages", "aas", "dist", "agent.js");
  const sourceAgentPath = path.resolve(ROOT_DIR, "packages", "aas", "src", "agent.ts");

  try {
    await access(compiledAgentPath);
    return compiledAgentPath;
  } catch {
    return sourceAgentPath;
  }
}

async function resolveConfigPath(inputPath: string): Promise<string> {
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

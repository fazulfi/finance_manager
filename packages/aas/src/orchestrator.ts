import { mkdir, realpath, stat, writeFile } from "fs/promises";
import path from "path";

import { AgentRunner } from "./agent-runner.js";
import { BriefingEngine } from "./briefing-engine.js";
import { buildTaskContext, withTaskStatus } from "./task-context.js";
import type {
  AASConfig,
  AgentResult,
  OrchestratorOptions,
  PlanPersistenceResult,
  QualityGateResult,
  Task,
  TaskContextSnapshot,
  TaskExecutionState,
  TaskExecutionStatus,
} from "./types.js";

const DEFAULT_RETRY_CEILING = 2;
const DEFAULT_PLAN_FILE = path.join(".opencode", "plans", "current-plan.md");
const DEFAULT_PLAN_BASE_DIR = path.resolve(process.cwd(), ".opencode", "plans");
const DEFAULT_BRIEFING_PAYLOAD_MAX_BYTES = 128 * 1024;
const DEFAULT_TERMINAL_OUTPUT_MAX_BYTES = 256 * 1024;
const DEFAULT_TERMINAL_ERROR_MAX_ITEMS = 32;
const DEFAULT_TERMINAL_ERROR_MAX_BYTES = 4 * 1024;
const DEFAULT_TERMINAL_METADATA_MAX_BYTES = 64 * 1024;

const QUALITY_GATE_STAGES = ["sanity", "reviewer", "tester", "security"] as const;
const REQUIRED_QUALITY_GATE_STAGES = new Set(QUALITY_GATE_STAGES);

export class AASOrchestrator {
  private readonly retryCeiling: number;
  private readonly planFilePath: string;
  private readonly briefingEngine: BriefingEngine;
  private readonly options: OrchestratorOptions;

  constructor(
    private readonly config: AASConfig,
    options: OrchestratorOptions = {},
  ) {
    this.options = options;
    const retryCeiling = options.retryCeiling;
    this.retryCeiling =
      Number.isInteger(retryCeiling) && (retryCeiling ?? 0) > 0
        ? (retryCeiling ?? DEFAULT_RETRY_CEILING)
        : DEFAULT_RETRY_CEILING;
    this.planFilePath = resolvePlanFilePath(options.planFilePath);
    this.briefingEngine = new BriefingEngine();
  }

  async execute(tasks: Task[]): Promise<TaskExecutionState[]> {
    const states: TaskExecutionState[] = [];

    for (const task of tasks) {
      states.push(await this.executeTask(task));
    }

    return states;
  }

  async executeTask(task: Task): Promise<TaskExecutionState> {
    const state: TaskExecutionState = {
      taskId: task.id,
      status: "pending",
      retry: {
        attempt: 0,
        maxAttempts: this.retryCeiling,
        canRetry: true,
      },
      gateResults: [],
      startTime: new Date(),
    };

    let context = buildTaskContext(task, { retryCeiling: this.retryCeiling });

    let shouldContinue = true;

    while (shouldContinue) {
      try {
        context = withTaskStatus(context, "running");
        state.status = context.status;
        state.retry = context.retry;

        const gateResults = await this.runQualityGates(task, context);
        context = {
          ...context,
          gateResults: [...context.gateResults, ...gateResults],
        };
        state.gateResults = context.gateResults;

        const result = await this.runTaskWithAgent(task, context);
        if (!result.success) {
          throw new Error(result.errors?.join("; ") || "Agent execution failed");
        }

        state.status = "completed";
        state.result = result;
        state.endTime = new Date();
        return state;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        let failedContext: TaskContextSnapshot;
        try {
          failedContext = withTaskStatus(context, "failed");
        } catch {
          failedContext = {
            ...context,
            status: "failed",
          };
        }
        state.status = "failed";
        state.retry = {
          ...failedContext.retry,
          lastError: reason,
          lastAttemptAt: new Date().toISOString(),
        };

        if (!failedContext.retry.canRetry) {
          shouldContinue = false;
          state.endTime = new Date();
          state.result = {
            agent: this.resolveTaskAgent(task.subagent),
            success: false,
            output: "",
            errors: [reason],
          };
          return state;
        }

        context = withTaskStatus(failedContext, "pending");
        context = buildTaskContext(task, {
          retryCeiling: this.retryCeiling,
          previous: context,
          previousError: reason,
        });
        state.status = context.status;
      }
    }

    return state;
  }

  async persistPlan(planContent: string): Promise<PlanPersistenceResult> {
    const safePlanPath = await this.resolveSafePlanPersistencePath();
    await writeFile(safePlanPath, planContent, { encoding: "utf8", flag: "wx" });

    return {
      path: safePlanPath,
      bytesWritten: Buffer.byteLength(planContent, "utf8"),
      persistedAt: new Date().toISOString(),
    };
  }

  getPlanFilePath(): string {
    return this.planFilePath;
  }

  private async runQualityGates(
    task: Task,
    context: TaskContextSnapshot,
  ): Promise<QualityGateResult[]> {
    const results: QualityGateResult[] = [];

    for (const stage of QUALITY_GATE_STAGES) {
      const hook = this.options.hooks?.qualityGates?.[stage];
      if (!hook && REQUIRED_QUALITY_GATE_STAGES.has(stage)) {
        throw new Error(`Missing required quality gate hook: ${stage}`);
      }

      if (!hook) {
        results.push({ stage, decision: "skip" });
        continue;
      }

      const result = await hook({
        task,
        stage,
        attempt: context.retry.attempt,
      });
      results.push(result);

      if (REQUIRED_QUALITY_GATE_STAGES.has(stage) && result.decision !== "pass") {
        throw new Error(result.reason || `Required quality gate blocked execution at ${stage}`);
      }

      if (result.decision === "fail") {
        throw new Error(result.reason || `Quality gate failed at ${stage}`);
      }
    }

    return results;
  }

  private async runTaskWithAgent(task: Task, context: TaskContextSnapshot): Promise<AgentResult> {
    const agent = this.resolveTaskAgent(task.subagent);
    const scriptPath =
      this.options.agentScriptPath ?? path.resolve(process.cwd(), "packages/aas/src/agent.ts");
    const client = await AgentRunner.runProcess(agent, scriptPath);

    const briefing = this.briefingEngine.renderBriefing({
      task,
      context,
    });

    const payloadTask: Task = {
      ...task,
      brief: briefing,
      context: {
        ...task.context,
        orchestration: {
          retry: context.retry,
          status: context.status,
          gateResults: context.gateResults,
          lastUpdatedAt: new Date().toISOString(),
        },
      },
    };

    const payloadBytes = Buffer.byteLength(JSON.stringify(payloadTask), "utf8");
    if (payloadBytes > DEFAULT_BRIEFING_PAYLOAD_MAX_BYTES) {
      throw new Error(
        `Task payload exceeds maximum size (${payloadBytes} bytes > ${DEFAULT_BRIEFING_PAYLOAD_MAX_BYTES} bytes)`,
      );
    }

    try {
      await client.sendMessage({ type: "task", payload: payloadTask });
      const completed = await AgentRunner.waitForCompletion(
        client,
        this.config.defaultAgentTimeout,
      );
      if (!completed) {
        return {
          agent,
          success: false,
          output: AgentRunner.getOutput(client),
          errors: ["Agent timeout"],
        };
      }

      const terminalMessage = AgentRunner.getTerminalMessage(client);
      if (terminalMessage?.type === "complete" || terminalMessage?.type === "error") {
        const parsed = this.tryParseAgentResult(terminalMessage.payload, agent);
        if (parsed) {
          return parsed;
        }
      }

      return {
        agent,
        success: false,
        output: AgentRunner.getOutput(client),
        errors: ["Invalid terminal payload from agent"],
      };
    } finally {
      await client.kill();
    }
  }

  private resolveTaskAgent(subagent: string) {
    const agent = this.config.agentRegistry[subagent];
    if (!agent) {
      throw new Error(`Unknown subagent: ${subagent}`);
    }

    return agent;
  }

  private tryParseAgentResult(
    payload: unknown,
    expectedAgent: AgentResult["agent"],
  ): AgentResult | null {
    if (!isRecord(payload)) {
      return null;
    }

    const success = payload.success;
    const output = payload.output;

    if (typeof success !== "boolean" || typeof output !== "string") {
      return null;
    }

    if (Buffer.byteLength(output, "utf8") > DEFAULT_TERMINAL_OUTPUT_MAX_BYTES) {
      return null;
    }

    const errors = payload.errors;
    if (errors !== undefined) {
      if (!Array.isArray(errors) || errors.length > DEFAULT_TERMINAL_ERROR_MAX_ITEMS) {
        return null;
      }

      for (const error of errors) {
        if (typeof error !== "string") {
          return null;
        }

        if (Buffer.byteLength(error, "utf8") > DEFAULT_TERMINAL_ERROR_MAX_BYTES) {
          return null;
        }
      }
    }

    const metadata = payload.metadata;
    if (metadata !== undefined) {
      if (!isRecord(metadata)) {
        return null;
      }

      try {
        const metadataBytes = Buffer.byteLength(JSON.stringify(metadata), "utf8");
        if (metadataBytes > DEFAULT_TERMINAL_METADATA_MAX_BYTES) {
          return null;
        }
      } catch {
        return null;
      }
    }

    const result: AgentResult = {
      agent: expectedAgent,
      success,
      output,
    };

    if (errors !== undefined) {
      result.errors = errors;
    }

    if (metadata !== undefined) {
      result.metadata = metadata;
    }

    return result;
  }

  private async resolveSafePlanPersistencePath(): Promise<string> {
    await mkdir(DEFAULT_PLAN_BASE_DIR, { recursive: true });
    await mkdir(path.dirname(this.planFilePath), { recursive: true });

    const baseDirRealPath = await realpath(DEFAULT_PLAN_BASE_DIR);
    const parentDir = path.dirname(this.planFilePath);
    const parentDirRealPath = await realpath(parentDir);
    const relativeParent = path.relative(baseDirRealPath, parentDirRealPath);

    if (relativeParent.startsWith("..") || path.isAbsolute(relativeParent)) {
      throw new Error(
        `Invalid planFilePath target: ${parentDirRealPath}. Allowed base directory is ${baseDirRealPath}`,
      );
    }

    const planTargetPath = path.join(parentDirRealPath, path.basename(this.planFilePath));
    try {
      await stat(planTargetPath);
      throw new Error(
        `Plan file already exists and overwrite is disabled by default: ${planTargetPath}`,
      );
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }

    return planTargetPath;
  }
}

export function isTerminalStatus(status: TaskExecutionStatus): boolean {
  return status === "completed" || status === "failed";
}

function resolvePlanFilePath(planFilePath?: string): string {
  const resolved = path.resolve(planFilePath ?? DEFAULT_PLAN_FILE);
  const relative = path.relative(DEFAULT_PLAN_BASE_DIR, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      `Invalid planFilePath: ${resolved}. Allowed base directory is ${DEFAULT_PLAN_BASE_DIR}`,
    );
  }

  return resolved;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

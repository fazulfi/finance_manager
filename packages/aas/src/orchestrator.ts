import { randomBytes } from "crypto";
import { mkdir, realpath, stat, writeFile } from "fs/promises";
import path from "path";

import { AgentRunner } from "./agent-runner.js";
import { BriefingEngine } from "./briefing-engine.js";
import { CancellationError, createCancellationToken, isCancellationError } from "./cancellation.js";
import { DagScheduler } from "./dag-scheduler.js";
import type { OrchestratorEventSink } from "./orchestrator-events.js";
import { ParallelExecutionEngine } from "./parallel-execution-engine.js";
import { RunStore } from "./run-store.js";
import { buildTaskContext, withTaskStatus } from "./task-context.js";
import { TaskQueue } from "./task-queue.js";
import type {
  AASConfig,
  AgentResult,
  OrchestratorRunCheckpoint,
  OrchestratorRunOptions,
  OrchestratorTaskCheckpoint,
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

const DEFAULT_CHECKPOINT_INTERVAL_MS = 250;
const DEFAULT_RESULT_PREVIEW_MAX_BYTES = 8 * 1024;

const QUALITY_GATE_STAGES = ["sanity", "reviewer", "tester", "security"] as const;
const REQUIRED_QUALITY_GATE_STAGES = new Set(QUALITY_GATE_STAGES);

class NonRetriableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetriableError";
  }
}

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

  async executeTask(
    task: Task,
    input?: {
      signal?: AbortSignal;
      timeoutMs?: number;
      previousContext?: TaskContextSnapshot;
      eventSink?: OrchestratorEventSink;
      runId?: string;
    },
  ): Promise<TaskExecutionState> {
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

    const contextOptions = { retryCeiling: this.retryCeiling } as const;
    let context = buildTaskContext(task, {
      ...contextOptions,
      ...(input?.previousContext ? { previous: input.previousContext } : {}),
    });

    let shouldContinue = true;

    while (shouldContinue) {
      try {
        if (input?.signal?.aborted) {
          throw new CancellationError(String(input.signal.reason ?? "Cancelled"));
        }
        context = withTaskStatus(context, "running");
        state.status = context.status;
        state.retry = context.retry;

        if (input?.eventSink && input.runId) {
          safeEmit(input.eventSink, {
            type: "task_started",
            runId: input.runId,
            timestamp: new Date().toISOString(),
            taskId: task.id,
            attempt: context.retry.attempt,
            timeoutMs: input?.timeoutMs ?? this.config.defaultAgentTimeout,
          });
        }

        const gateResults = await this.runQualityGates(task, context);
        context = {
          ...context,
          gateResults: [...context.gateResults, ...gateResults],
        };
        state.gateResults = context.gateResults;

        const agentInput = {
          ...(input?.signal ? { signal: input.signal } : {}),
          ...(typeof input?.timeoutMs === "number" ? { timeoutMs: input.timeoutMs } : {}),
        };

        const result = await this.runTaskWithAgent(task, context, agentInput);
        if (!result.success) {
          throw new Error(result.errors?.join("; ") || "Agent execution failed");
        }

        state.status = "completed";
        state.result = result;
        state.endTime = new Date();
        return state;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);

        if (isCancellationError(error)) {
          state.status = "cancelled";
          state.retry = {
            ...state.retry,
            canRetry: false,
            lastError: reason,
            lastAttemptAt: new Date().toISOString(),
          };
          state.endTime = new Date();
          state.result = {
            agent: this.resolveTaskAgent(task.subagent),
            success: false,
            output: "",
            errors: [reason],
          };
          return state;
        }

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

        if (error instanceof NonRetriableError) {
          state.retry.canRetry = false;
          failedContext.retry.canRetry = false;
        }

        if (!state.retry.canRetry) {
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

  async executeRun(
    tasks: Task[],
    options: OrchestratorRunOptions = {},
  ): Promise<TaskExecutionState[]> {
    const runId = options.runId ?? `run-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const concurrency =
      typeof options.concurrency === "number" && Number.isFinite(options.concurrency)
        ? Math.max(1, Math.trunc(options.concurrency))
        : this.config.maxConcurrentAgents;

    const runDir = options.runDir ?? this.config.runDir;
    const store = new RunStore({
      runId,
      ...(runDir ? { runDir } : {}),
    });

    if (options.resumeFromPath) {
      const expected = path.resolve(store.getCheckpointPath());
      const candidate = path.resolve(options.resumeFromPath);
      if (candidate !== expected) {
        throw new Error(`resumeFromPath must match run store checkpoint path: ${expected}`);
      }
    }

    const checkpointInterval =
      typeof options.checkpointIntervalMs === "number" &&
      Number.isFinite(options.checkpointIntervalMs)
        ? Math.max(25, Math.trunc(options.checkpointIntervalMs))
        : DEFAULT_CHECKPOINT_INTERVAL_MS;

    const {
      token: runToken,
      controller: runController,
      cleanup: cleanupRunToken,
    } = createCancellationToken({
      ...(typeof options.runTimeoutMs === "number" ? { timeoutMs: options.runTimeoutMs } : {}),
      reason: "Run timeout",
    });

    const eventSink = options.eventSink;
    safeEmit(eventSink, {
      type: "run_started",
      runId,
      timestamp: new Date().toISOString(),
      concurrency,
    });

    const scheduler = new DagScheduler(tasks);
    const queue = new TaskQueue();
    const engine = new ParallelExecutionEngine();

    const tasksById = new Map(tasks.map((task) => [task.id, task] as const));

    const states = new Map<string, TaskExecutionState>();
    const previousContexts = new Map<string, TaskContextSnapshot>();
    const enqueued = new Set<string>();
    const createdAt = new Date().toISOString();
    let lastCheckpointWriteAt = 0;
    let checkpointScheduled: NodeJS.Timeout | null = null;

    const writeCheckpoint = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastCheckpointWriteAt < checkpointInterval) {
        return;
      }
      lastCheckpointWriteAt = now;
      const checkpoint = buildCheckpoint(runId, createdAt, states);
      const result = await store.writeCheckpoint(checkpoint);
      safeEmit(eventSink, {
        type: "checkpoint_written",
        runId,
        timestamp: new Date().toISOString(),
        path: result.path,
        bytesWritten: result.bytesWritten,
      });
    };

    const scheduleCheckpoint = () => {
      if (checkpointScheduled) {
        return;
      }
      checkpointScheduled = setTimeout(() => {
        checkpointScheduled = null;
        void writeCheckpoint(false).catch(() => undefined);
      }, checkpointInterval);
    };

    const applyCancelledDependents = (ids: string[], reason: string) => {
      for (const id of ids) {
        if (states.has(id)) {
          continue;
        }
        states.set(id, {
          taskId: id,
          status: "cancelled",
          retry: { attempt: 0, maxAttempts: 0, canRetry: false, lastError: reason },
          gateResults: [],
          startTime: new Date(),
          endTime: new Date(),
        });
      }
    };

    const loadResume = async () => {
      const checkpoint = await store.readCheckpoint();
      if (!checkpoint) {
        return;
      }

      safeEmit(eventSink, {
        type: "run_resumed",
        runId,
        timestamp: new Date().toISOString(),
        checkpointPath: store.getCheckpointPath(),
      });

      for (const entry of Object.values(checkpoint.tasks)) {
        if (entry.status === "completed") {
          scheduler.markCompleted(entry.taskId);
        } else if (entry.status === "failed") {
          const cancelled = scheduler.markFailed(entry.taskId);
          applyCancelledDependents(cancelled, "Cancelled due to failed dependency");
        } else if (entry.status === "cancelled") {
          const cancelled = scheduler.markCancelled(entry.taskId);
          applyCancelledDependents(cancelled, "Cancelled due to cancelled dependency");
        } else {
          // pending/running are resumed as pending
        }

        const resumedState = checkpointEntryToState(entry);
        states.set(entry.taskId, resumedState);

        const resumeTask = tasksById.get(entry.taskId);
        previousContexts.set(entry.taskId, {
          requestSummary: resumeTask?.context.requestSummary ?? "",
          currentState: resumeTask?.context.currentState ?? {},
          previousWork: resumeTask?.context.previousWork ?? "",
          filesToCreate: resumeTask?.context.filesToCreate ?? [],
          filesToModify: resumeTask?.context.filesToModify ?? [],
          retry: entry.retry,
          gateResults: entry.gateResults,
          status: entry.status === "running" ? "pending" : entry.status,
        });
      }
    };

    const updateChain: { current: Promise<void> } = { current: Promise.resolve() };
    const withUpdateLock = async (fn: () => void | Promise<void>) => {
      updateChain.current = updateChain.current.then(fn, fn);
      await updateChain.current;
    };

    const enqueueReady = () => {
      const ready = scheduler.getReadyTaskIds();
      for (const id of ready) {
        if (
          enqueued.has(id) ||
          states.get(id)?.status === "completed" ||
          states.get(id)?.status === "failed" ||
          states.get(id)?.status === "cancelled"
        ) {
          continue;
        }
        const task = scheduler.getTask(id);
        if (!task) {
          continue;
        }
        queue.enqueue(task);
        enqueued.add(id);
        safeEmit(eventSink, {
          type: "task_queued",
          runId,
          timestamp: new Date().toISOString(),
          taskId: id,
          dependsOnCount: Array.isArray(task.dependsOn) ? task.dependsOn.length : 0,
          priority: typeof task.priority === "number" ? task.priority : 0,
        });
        scheduleCheckpoint();
      }
    };

    try {
      if (options.resume || options.resumeFromPath) {
        await loadResume();
      }
      enqueueReady();
      if (scheduler.allTerminal()) {
        queue.close();
      }

      const cancelAllPending = async (reason: string) => {
        await withUpdateLock(async () => {
          const cancelled: string[] = [];
          for (const id of scheduler.getAllTaskIds()) {
            if (scheduler.getStatus(id) === "pending") {
              cancelled.push(id);
              cancelled.push(...scheduler.markCancelled(id));
            }
          }
          applyCancelledDependents(Array.from(new Set(cancelled)), reason);
          queue.close();
          scheduleCheckpoint();
        });
      };

      const onRunAbort = () => {
        void cancelAllPending(String(runToken.signal.reason ?? "Cancelled"));
      };

      runToken.signal.addEventListener("abort", onRunAbort, { once: true });

      const results = await engine.executeFromQueue({
        runId,
        queue,
        concurrency,
        signal: runToken.signal,
        executor: async (task) => {
          const timeoutMs =
            typeof task.timeoutMs === "number" && Number.isFinite(task.timeoutMs)
              ? Math.max(1, Math.trunc(task.timeoutMs))
              : typeof options.defaultTaskTimeoutMs === "number" &&
                  Number.isFinite(options.defaultTaskTimeoutMs)
                ? Math.max(1, Math.trunc(options.defaultTaskTimeoutMs))
                : this.config.defaultAgentTimeout;

          await withUpdateLock(async () => {
            scheduler.markRunning(task.id);
            scheduleCheckpoint();
          });

          const { token: taskToken, cleanup: cleanupTaskToken } = createCancellationToken({
            parent: runToken.signal,
            timeoutMs,
            reason: "Task timeout",
          });

          const startAt = Date.now();
          try {
            const state = await this.executeTask(task, {
              signal: taskToken.signal,
              timeoutMs,
              ...(previousContexts.get(task.id)
                ? { previousContext: previousContexts.get(task.id)! }
                : {}),
              ...(eventSink ? { eventSink } : {}),
              runId,
            });

            await withUpdateLock(async () => {
              states.set(state.taskId, state);

              if (state.status === "completed") {
                scheduler.markCompleted(state.taskId);
              } else if (state.status === "failed") {
                const cancelled = scheduler.markFailed(state.taskId);
                applyCancelledDependents(cancelled, "Cancelled due to failed dependency");
              } else if (state.status === "cancelled") {
                const cancelled = scheduler.markCancelled(state.taskId);
                applyCancelledDependents(cancelled, "Cancelled due to cancelled dependency");
              }

              safeEmit(eventSink, {
                type: "task_finished",
                runId,
                timestamp: new Date().toISOString(),
                taskId: state.taskId,
                status:
                  state.status === "failed"
                    ? "failed"
                    : state.status === "cancelled"
                      ? "cancelled"
                      : "completed",
                durationMs: Math.max(0, Date.now() - startAt),
              });

              enqueueReady();
              if (scheduler.allTerminal()) {
                queue.close();
              }
              scheduleCheckpoint();
            });

            return state;
          } finally {
            cleanupTaskToken();
          }
        },
      });

      void results;

      runToken.signal.removeEventListener("abort", onRunAbort);

      await writeCheckpoint(true);

      const counts = countTerminal(states);
      const runStatus = runToken.signal.aborted
        ? "cancelled"
        : counts.failed > 0
          ? "failed"
          : counts.cancelled > 0
            ? "cancelled"
            : "completed";

      safeEmit(eventSink, {
        type: "run_completed",
        runId,
        timestamp: new Date().toISOString(),
        status: runStatus,
        counts,
      });

      return Array.from(states.values());
    } catch (error) {
      if (runToken.signal.aborted) {
        safeEmit(eventSink, {
          type: "run_cancelled",
          runId,
          timestamp: new Date().toISOString(),
          reason: String(runToken.signal.reason ?? "Cancelled"),
        });
      }
      throw error;
    } finally {
      if (checkpointScheduled) {
        clearTimeout(checkpointScheduled);
      }
      runController.abort("Run finished");
      cleanupRunToken();
    }
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
        throw new NonRetriableError(`Missing required quality gate hook: ${stage}`);
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
        throw new NonRetriableError(
          result.reason || `Required quality gate blocked execution at ${stage}`,
        );
      }

      if (result.decision === "fail") {
        throw new NonRetriableError(result.reason || `Quality gate failed at ${stage}`);
      }
    }

    return results;
  }

  private async runTaskWithAgent(
    task: Task,
    context: TaskContextSnapshot,
    input?: { signal?: AbortSignal; timeoutMs?: number },
  ): Promise<AgentResult> {
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

      const timeoutMs =
        typeof input?.timeoutMs === "number" && Number.isFinite(input.timeoutMs)
          ? Math.max(1, Math.trunc(input.timeoutMs))
          : this.config.defaultAgentTimeout;

      const completed = await waitForCompletionOrAbort(client, timeoutMs, input?.signal);
      if (!completed) {
        return {
          agent,
          success: false,
          output: AgentRunner.getOutput(client),
          errors: [input?.signal?.aborted ? "Agent cancelled" : "Agent timeout"],
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
  return status === "completed" || status === "failed" || status === "cancelled";
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

async function waitForCompletionOrAbort(
  client: { kill: () => Promise<void> },
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!signal) {
    return AgentRunner.waitForCompletion(client as never, timeoutMs);
  }

  if (signal.aborted) {
    await client.kill();
    throw new CancellationError(String(signal.reason ?? "Cancelled"));
  }

  return new Promise<boolean>((resolve, reject) => {
    const onAbort = async () => {
      cleanup();
      try {
        await client.kill();
      } catch {
        // ignore kill failure
      }
      reject(new CancellationError(String(signal.reason ?? "Cancelled")));
    };

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
    };

    signal.addEventListener("abort", onAbort, { once: true });

    void AgentRunner.waitForCompletion(client as never, timeoutMs)
      .then((completed) => {
        cleanup();
        resolve(completed);
      })
      .catch((error) => {
        cleanup();
        reject(error);
      });
  });
}

function safeEmit(
  sink: OrchestratorEventSink | undefined,
  event: Parameters<OrchestratorEventSink>[0],
) {
  try {
    sink?.(event);
  } catch {
    // swallow sink errors
  }
}

function buildCheckpoint(
  runId: string,
  createdAt: string,
  states: Map<string, TaskExecutionState>,
): OrchestratorRunCheckpoint {
  const tasks: Record<string, OrchestratorTaskCheckpoint> = {};

  for (const [taskId, state] of states.entries()) {
    const entry: OrchestratorTaskCheckpoint = {
      taskId,
      status: state.status,
      retry: state.retry,
      gateResults: state.gateResults,
    };

    if (state.startTime) {
      entry.startTime = state.startTime.toISOString();
    }

    if (state.endTime) {
      entry.endTime = state.endTime.toISOString();
    }

    if (state.result) {
      const result: NonNullable<OrchestratorTaskCheckpoint["result"]> = {
        success: Boolean(state.result.success),
        outputBytes: Buffer.byteLength(state.result.output ?? "", "utf8"),
        outputPreview: capStringBytes(state.result.output ?? "", DEFAULT_RESULT_PREVIEW_MAX_BYTES),
      };

      if (Array.isArray(state.result.errors)) {
        result.errors = state.result.errors
          .slice(0, DEFAULT_TERMINAL_ERROR_MAX_ITEMS)
          .map((e) => capStringBytes(String(e), DEFAULT_TERMINAL_ERROR_MAX_BYTES));
      }

      entry.result = result;
    }

    tasks[taskId] = entry;
  }

  return {
    version: 1,
    runId,
    createdAt,
    updatedAt: new Date().toISOString(),
    tasks,
  };
}

function checkpointEntryToState(entry: OrchestratorTaskCheckpoint): TaskExecutionState {
  const state: TaskExecutionState = {
    taskId: entry.taskId,
    status: entry.status === "running" ? "pending" : entry.status,
    retry: entry.retry,
    gateResults: entry.gateResults,
  };

  if (entry.startTime) {
    state.startTime = new Date(entry.startTime);
  }

  if (entry.endTime) {
    state.endTime = new Date(entry.endTime);
  }

  if (entry.result) {
    const result: NonNullable<TaskExecutionState["result"]> = {
      agent: {
        id: "unknown",
        name: "unknown",
        mode: "subagent",
        thinking: "low",
        permission: {
          read: [],
          list: false,
          glob: false,
          grep: false,
          lsp: false,
          edit: false,
          bash: false,
          webfetch: false,
          task: {},
        },
      },
      success: entry.result.success,
      output: entry.result.outputPreview ?? "",
    };

    if (entry.result.errors) {
      result.errors = entry.result.errors;
    }

    state.result = result;
  }

  return state;
}

function countTerminal(states: Map<string, TaskExecutionState>): {
  completed: number;
  failed: number;
  cancelled: number;
} {
  let completed = 0;
  let failed = 0;
  let cancelled = 0;
  for (const state of states.values()) {
    if (state.status === "completed") {
      completed += 1;
    } else if (state.status === "failed") {
      failed += 1;
    } else if (state.status === "cancelled") {
      cancelled += 1;
    }
  }
  return { completed, failed, cancelled };
}

function capStringBytes(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) {
    return value;
  }
  return Buffer.from(value, "utf8").subarray(0, maxBytes).toString("utf8");
}

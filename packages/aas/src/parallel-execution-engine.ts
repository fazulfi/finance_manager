import pino from "pino";

import type { TaskQueue } from "./task-queue.js";
import type { Task, TaskExecutionState } from "./types.js";

const logger = pino({ name: "ParallelExecutionEngine" });

const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 32;

export type TaskExecutor = (
  task: Task,
  input: { signal?: AbortSignal },
) => Promise<TaskExecutionState>;

export class ParallelExecutionEngine {
  async executeFromQueue(input: {
    runId: string;
    queue: TaskQueue;
    concurrency: number;
    executor: TaskExecutor;
    signal?: AbortSignal;
  }): Promise<TaskExecutionState[]> {
    const concurrency = normalizeConcurrency(input.concurrency);
    const results: TaskExecutionState[] = [];
    const resultsLock: { chain: Promise<void> } = { chain: Promise.resolve() };

    const controller = new AbortController();
    const signal = controller.signal;
    let parentAbortHandler: (() => void) | undefined;
    if (input.signal) {
      if (input.signal.aborted) {
        controller.abort(input.signal.reason ?? "Aborted");
      } else {
        parentAbortHandler = () => {
          controller.abort(input.signal?.reason ?? "Aborted");
        };
        input.signal.addEventListener("abort", parentAbortHandler, { once: true });
      }
    }

    let firstError: unknown;
    const failFast = (error: unknown) => {
      if (firstError) {
        return;
      }
      firstError = error;
      try {
        input.queue.close();
      } catch {
        // ignore
      }
      try {
        controller.abort(error instanceof Error ? error : "Task executor threw");
      } catch {
        // ignore
      }
    };

    const worker = async () => {
      for (;;) {
        if (signal.aborted) {
          return;
        }

        const task = input.queue.dequeue();
        if (!task) {
          if (input.queue.isClosed) {
            return;
          }
          try {
            await input.queue.waitForItem(signal);
          } catch {
            return;
          }
          continue;
        }

        try {
          const execInput = { signal };
          const state = await input.executor(task, execInput);
          resultsLock.chain = resultsLock.chain.then(() => {
            results.push(state);
          });
        } catch (error) {
          logger.error({ error, taskId: task.id }, "Task executor threw");
          failFast(error);
          throw error;
        }
      }
    };

    logger.info({ runId: input.runId, concurrency }, "Starting parallel execution");

    const workers = Array.from({ length: concurrency }, () => worker());
    const settled = await Promise.allSettled(workers);
    if (parentAbortHandler) {
      input.signal?.removeEventListener("abort", parentAbortHandler);
    }

    for (const s of settled) {
      if (s.status === "rejected") {
        failFast(s.reason);
      }
    }

    await resultsLock.chain;

    if (firstError) {
      throw firstError;
    }

    return results;
  }
}

function normalizeConcurrency(value: number): number {
  const candidate = Number.isFinite(value) ? Math.trunc(value) : MIN_CONCURRENCY;
  return Math.min(Math.max(candidate, MIN_CONCURRENCY), MAX_CONCURRENCY);
}

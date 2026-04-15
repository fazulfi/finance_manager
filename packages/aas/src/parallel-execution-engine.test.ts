import { describe, expect, it, vi } from "vitest";

import { ParallelExecutionEngine } from "./parallel-execution-engine.js";
import { TaskQueue } from "./task-queue.js";
import type { Task, TaskExecutionState } from "./types.js";

const createTask = (id: string): Task => ({
  id,
  step: `step-${id}`,
  subagent: "coder",
  brief: "brief",
  context: {
    requestSummary: "summary",
    currentState: {},
    previousWork: "",
    filesToCreate: [],
    filesToModify: [],
  },
});

describe("ParallelExecutionEngine", () => {
  it("executes tasks using injected executor until queue is closed", async () => {
    const engine = new ParallelExecutionEngine();
    const queue = new TaskQueue({ now: () => 0 });
    queue.enqueue(createTask("t1"));
    queue.enqueue(createTask("t2"));
    queue.close();

    const executor = vi.fn(async (task: Task): Promise<TaskExecutionState> => {
      return {
        taskId: task.id,
        status: "completed",
        retry: { attempt: 1, maxAttempts: 1, canRetry: false },
        gateResults: [],
        startTime: new Date(0),
        endTime: new Date(0),
        result: {
          agent: {
            id: task.subagent,
            name: task.subagent,
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
          success: true,
          output: "ok",
        },
      };
    });

    const states = await engine.executeFromQueue({
      runId: "run-1",
      queue,
      concurrency: 2,
      executor,
    });

    expect(executor).toHaveBeenCalledTimes(2);
    expect(states).toHaveLength(2);
    expect(states.map((s) => s.taskId).sort()).toEqual(["t1", "t2"]);
  });

  it("propagates executor errors and closes queue", async () => {
    const engine = new ParallelExecutionEngine();
    const queue = new TaskQueue({ now: () => 0 });
    queue.enqueue(createTask("t1"));

    const executor = vi.fn(async () => {
      throw new Error("boom");
    });

    await expect(
      engine.executeFromQueue({
        runId: "run-err",
        queue,
        concurrency: 1,
        executor,
      }),
    ).rejects.toThrow(/boom/i);

    expect(executor).toHaveBeenCalledTimes(1);
    expect(queue.isClosed).toBe(true);
  });
});

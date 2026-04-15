import { describe, expect, it, vi } from "vitest";

import { ParallelExecutionEngine } from "./parallel-execution-engine.js";
import type { AgentResult, Task } from "./types.js";

const { FakeTaskQueue } = vi.hoisted(() => {
  class MockQueue {
    private _completed: Array<{ id: string; result: AgentResult }> = [];

    enqueue(task: Task): void {
      this._completed.push({
        id: task.id,
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
          output: `Task ${task.id} completed`,
        } satisfies AgentResult,
      });
    }

    dequeue(): Task | null {
      return null;
    }

    complete(): void {
      // no-op for test double
    }

    get completed() {
      return this._completed;
    }

    get completedCount(): number {
      return this._completed.length;
    }

    get runningCount(): number {
      return 0;
    }

    get running() {
      return [] as Array<{ id: string }>;
    }

    async awaitAll(): Promise<void> {
      return;
    }
  }

  return { FakeTaskQueue: MockQueue };
});

vi.mock("./task-queue.js", () => ({
  TaskQueue: FakeTaskQueue,
}));

const createTask = (id: string): Task => ({
  id,
  step: `step-${id}`,
  subagent: `agent-${id}`,
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
  it("returns results mapped in original task order", async () => {
    const engine = new ParallelExecutionEngine();
    const tasks = [createTask("1"), createTask("2"), createTask("3")];

    const results = await engine.executeParallel(tasks, 2);

    expect(results).toHaveLength(3);
    expect(results[0]?.output).toContain("1");
    expect(results[1]?.output).toContain("2");
    expect(results[2]?.output).toContain("3");
  });

  it("calls callback for empty input and validates maxConcurrent setter", async () => {
    const engine = new ParallelExecutionEngine();
    const callback = vi.fn();

    const results = await engine.executeParallelWithCallback([], 0, callback);
    engine.maxConcurrent = 4;

    expect(results).toEqual([]);
    expect(callback).toHaveBeenCalledWith(0, 0);
    expect(engine.getStats()).toEqual({ maxConcurrent: 4 });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TaskQueue } from "./task-queue.js";
import type { AgentResult, Task } from "./types.js";

const createTask = (id: string): Task => ({
  id,
  step: "step",
  subagent: "subagent-a",
  brief: "brief",
  context: {
    requestSummary: "summary",
    currentState: { agent: { id: "agent-main" } },
    previousWork: "",
    filesToCreate: [],
    filesToModify: [],
  },
});

const createResult = (): AgentResult => ({
  agent: {
    id: "subagent-a",
    name: "Subagent A",
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
});

type SetImmediateFn = (
  callback: (...args: unknown[]) => void,
  ...args: unknown[]
) => NodeJS.Immediate;

const nodeGlobal = globalThis as unknown as { setImmediate: SetImmediateFn };

describe("TaskQueue", () => {
  beforeEach(() => {
    vi.spyOn(nodeGlobal, "setImmediate").mockImplementation(
      () => ({}) as unknown as NodeJS.Immediate,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enqueues/dequeues FIFO while respecting concurrency", () => {
    const queue = new TaskQueue();
    queue.maxConcurrent = 1;

    queue.enqueue(createTask("t1"));
    queue.enqueue(createTask("t2"));

    expect(queue.dequeue()?.id).toBe("t1");
    expect(queue.dequeue()).toBeNull();
  });

  it("tracks completed and failed tasks", () => {
    const queue = new TaskQueue();

    queue.enqueue(createTask("t1"));
    queue.enqueue(createTask("t2"));

    queue.dequeue();
    queue.complete("t1", createResult());

    queue.dequeue();
    queue.fail("t2", new Error("boom"));

    expect(queue.completedCount).toBe(1);
    expect(queue.failedCount).toBe(1);
    expect(queue.failed[0]?.result?.errors).toEqual(["boom"]);
    expect(queue.getStats()).toMatchObject({ total: 2, completed: 1, failed: 1 });
  });

  it("awaitAll resolves after final completion", async () => {
    const queue = new TaskQueue();
    queue.enqueue(createTask("t1"));
    queue.dequeue();

    const pending = queue.awaitAll();
    queue.complete("t1", createResult());

    await expect(pending).resolves.toBeUndefined();
  });
});

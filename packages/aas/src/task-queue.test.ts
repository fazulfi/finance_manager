import { describe, expect, it } from "vitest";

import { TaskQueue } from "./task-queue.js";
import type { Task } from "./types.js";

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

describe("TaskQueue", () => {
  it("dequeues higher base priority first", () => {
    const queue = new TaskQueue({ now: () => 0 });
    const low = { ...createTask("low"), priority: 0 };
    const high = { ...createTask("high"), priority: 5 };

    queue.enqueue(low);
    queue.enqueue(high);

    expect(queue.dequeue(0)?.id).toBe("high");
    expect(queue.dequeue(0)?.id).toBe("low");
  });

  it("applies aging to avoid starvation deterministically", () => {
    let now = 0;
    const queue = new TaskQueue({ now: () => now, agingMsPerPriority: 10 });

    const olderLow = { ...createTask("older-low"), priority: 0 };
    queue.enqueue(olderLow);

    now = 200;
    const newerHigh = { ...createTask("newer-high"), priority: 10 };
    queue.enqueue(newerHigh);

    // After 200ms, older-low has +20 aging boost; newer-high has +0 boost
    expect(queue.dequeue(now)?.id).toBe("older-low");
    expect(queue.dequeue(now)?.id).toBe("newer-high");
  });

  it("waitForItem resolves on enqueue and close", async () => {
    const queue = new TaskQueue({ now: () => 0 });

    const wait = queue.waitForItem();
    queue.enqueue(createTask("t1"));
    await expect(wait).resolves.toBeUndefined();

    queue.dequeue(0);

    const waitClosed = queue.waitForItem();
    queue.close();
    await expect(waitClosed).resolves.toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";

import { DagScheduler } from "./dag-scheduler.js";
import type { Task } from "./types.js";

function task(id: string, dependsOn?: string[]): Task {
  return {
    id,
    step: `step-${id}`,
    subagent: "coder",
    brief: "brief",
    ...(dependsOn ? { dependsOn } : {}),
    context: {
      requestSummary: "summary",
      currentState: {},
      previousWork: "",
      filesToCreate: [],
      filesToModify: [],
    },
  };
}

describe("DagScheduler", () => {
  it("detects cycles", () => {
    expect(() => new DagScheduler([task("a", ["b"]), task("b", ["a"])])).toThrow(/cycle detected/i);
  });

  it("returns deterministic ready set", () => {
    const scheduler = new DagScheduler([
      task("a"),
      task("b", ["a"]),
      task("c", ["a"]),
      task("d", ["b", "c"]),
    ]);

    expect(scheduler.getReadyTaskIds()).toEqual(["a"]);
    scheduler.markRunning("a");
    scheduler.markCompleted("a");
    expect(scheduler.getReadyTaskIds()).toEqual(["b", "c"]);
    scheduler.markRunning("b");
    scheduler.markCompleted("b");
    expect(scheduler.getReadyTaskIds()).toEqual(["c"]);
    scheduler.markRunning("c");
    scheduler.markCompleted("c");
    expect(scheduler.getReadyTaskIds()).toEqual(["d"]);
  });

  it("cancels dependents when a dependency fails", () => {
    const scheduler = new DagScheduler([task("a"), task("b", ["a"]), task("c", ["b"])]);

    scheduler.markRunning("a");
    scheduler.markFailed("a");
    expect(scheduler.getStatus("b")).toBe("cancelled");
    expect(scheduler.getStatus("c")).toBe("cancelled");
    expect(scheduler.allTerminal()).toBe(true);
  });
});

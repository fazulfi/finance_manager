import { describe, expect, it } from "vitest";

import { buildTaskContext, canTransition, withTaskStatus } from "./task-context.js";
import type { Task, TaskContextSnapshot } from "./types.js";

const task: Task = {
  id: "task-1",
  step: "step-1",
  subagent: "coder",
  brief: "Implement change",
  context: {
    requestSummary: "Implement change",
    currentState: { branch: "feature" },
    previousWork: "",
    filesToCreate: ["packages/aas/src/task-context.test.ts"],
    filesToModify: ["bin/run-agent.ts"],
  },
};

describe("task-context", () => {
  it("builds initial context with retry metadata", () => {
    const context = buildTaskContext(task, { retryCeiling: 3 });

    expect(context.status).toBe("pending");
    expect(context.retry.attempt).toBe(1);
    expect(context.retry.maxAttempts).toBe(3);
    expect(context.retry.canRetry).toBe(true);
    expect(context.filesToModify).toEqual(["bin/run-agent.ts"]);
  });

  it("merges previous context and carries retry error for retries", () => {
    const previous: TaskContextSnapshot = {
      requestSummary: "Implement change",
      currentState: { fromPrevious: true },
      previousWork: "Attempted execution",
      filesToCreate: ["existing.ts"],
      filesToModify: ["bin/start-aas.ts"],
      retry: {
        attempt: 1,
        maxAttempts: 2,
        canRetry: true,
      },
      gateResults: [{ stage: "sanity", decision: "pass" }],
      status: "failed",
    };

    const retryContext = buildTaskContext(task, {
      retryCeiling: 2,
      previous,
      previousError: "retry reason",
    });

    expect(retryContext.retry.attempt).toBe(2);
    expect(retryContext.retry.canRetry).toBe(false);
    expect(retryContext.retry.lastError).toBe("retry reason");
    expect(retryContext.filesToCreate).toEqual([
      "packages/aas/src/task-context.test.ts",
      "existing.ts",
    ]);
    expect(retryContext.filesToModify).toEqual(["bin/run-agent.ts", "bin/start-aas.ts"]);
    expect(retryContext.gateResults).toEqual([{ stage: "sanity", decision: "pass" }]);
  });

  it("enforces allowed state transitions", () => {
    const pending = buildTaskContext(task);
    const running = withTaskStatus(pending, "running");
    const completed = withTaskStatus(running, "completed");

    expect(canTransition("pending", "running")).toBe(true);
    expect(canTransition("running", "completed")).toBe(true);
    expect(completed.status).toBe("completed");
    expect(() => withTaskStatus(pending, "failed")).toThrow("Invalid orchestration transition");
  });
});

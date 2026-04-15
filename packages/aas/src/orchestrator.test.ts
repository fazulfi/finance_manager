import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentRunner } from "./agent-runner.js";
import { AASOrchestrator } from "./orchestrator.js";
import { RunStore } from "./run-store.js";
import type { AASConfig, Agent, AgentResult, Task } from "./types.js";

function createAgent(id: string): Agent {
  return {
    id,
    name: id,
    mode: id === "planner" ? "primary" : "subagent",
    thinking: "medium",
    permission: {
      read: ["**/*.ts"],
      list: true,
      glob: true,
      grep: true,
      lsp: true,
      edit: true,
      bash: true,
      webfetch: false,
      task: {},
    },
  };
}

function createConfig(): AASConfig {
  return {
    logLevel: "info",
    enablePrettyLogging: false,
    maxConcurrentAgents: 1,
    defaultAgentTimeout: 50,
    runDir: "packages/aas/.tmp-orchestrator-runs",
    agentRegistry: {
      planner: createAgent("planner"),
      coder: createAgent("coder"),
      reviewer: createAgent("reviewer"),
      tester: createAgent("tester"),
      "security-auditor": createAgent("security-auditor"),
    },
  };
}

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    step: "implement",
    subagent: "coder",
    brief: "Implement requested change",
    context: {
      requestSummary: "Implement requested change",
      currentState: {},
      previousWork: "",
      filesToCreate: [],
      filesToModify: ["bin/start-aas.ts"],
    },
    ...overrides,
  };
}

const gateHooks = {
  sanity: () => ({ stage: "sanity" as const, decision: "pass" as const }),
  reviewer: () => ({ stage: "reviewer" as const, decision: "pass" as const }),
  tester: () => ({ stage: "tester" as const, decision: "pass" as const }),
  security: () => ({ stage: "security" as const, decision: "pass" as const }),
};

describe("AASOrchestrator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("executes task through gate sequence and returns completed state", async () => {
    const sendMessage = vi.fn<
      (message: {
        payload?: { context?: { orchestration?: { status?: string } } };
      }) => Promise<void>
    >(async () => undefined);
    const kill = vi.fn(async () => undefined);
    const runnerClient = { sendMessage, kill };

    vi.spyOn(AgentRunner, "runProcess").mockResolvedValue(runnerClient as never);
    vi.spyOn(AgentRunner, "waitForCompletion").mockResolvedValue(true);
    vi.spyOn(AgentRunner, "getOutput").mockReturnValue("agent-output");
    vi.spyOn(AgentRunner, "getTerminalMessage").mockReturnValue({
      type: "complete",
      payload: {
        success: true,
        output: "agent-output",
      } satisfies Pick<AgentResult, "success" | "output">,
    });

    const stages: string[] = [];
    const orchestrator = new AASOrchestrator(createConfig(), {
      hooks: {
        qualityGates: {
          sanity: () => {
            stages.push("sanity");
            return gateHooks.sanity();
          },
          reviewer: () => {
            stages.push("reviewer");
            return gateHooks.reviewer();
          },
          tester: () => {
            stages.push("tester");
            return gateHooks.tester();
          },
          security: () => {
            stages.push("security");
            return gateHooks.security();
          },
        },
      },
    });

    const state = await orchestrator.executeTask(createTask());

    expect(stages).toEqual(["sanity", "reviewer", "tester", "security"]);
    expect(state.status).toBe("completed");
    expect(state.retry.attempt).toBe(1);
    expect(state.gateResults).toHaveLength(4);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const firstMessage = sendMessage.mock.calls[0]?.[0];
    expect(firstMessage?.payload?.context?.orchestration?.status).toBe("running");
    expect(kill).toHaveBeenCalledTimes(1);
  });

  it("retries failed execution and completes on next attempt", async () => {
    const sendMessage = vi.fn(async () => undefined);
    const kill = vi.fn(async () => undefined);
    const runnerClient = { sendMessage, kill };

    vi.spyOn(AgentRunner, "runProcess").mockResolvedValue(runnerClient as never);
    vi.spyOn(AgentRunner, "waitForCompletion").mockResolvedValue(true);
    vi.spyOn(AgentRunner, "getOutput").mockReturnValue("retry-output");

    const terminalSpy = vi
      .spyOn(AgentRunner, "getTerminalMessage")
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce({
        type: "complete",
        payload: {
          success: true,
          output: "retry-output",
        },
      });

    const orchestrator = new AASOrchestrator(createConfig(), {
      retryCeiling: 3,
      hooks: { qualityGates: gateHooks },
    });

    const state = await orchestrator.executeTask(createTask());

    expect(state.status).toBe("completed");
    expect(state.retry.attempt).toBe(2);
    expect(state.retry.lastError).toContain("Invalid terminal payload");
    expect(terminalSpy).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it("returns failed state after reaching retry ceiling", async () => {
    const sendMessage = vi.fn(async () => undefined);
    const kill = vi.fn(async () => undefined);
    const runnerClient = { sendMessage, kill };

    vi.spyOn(AgentRunner, "runProcess").mockResolvedValue(runnerClient as never);
    vi.spyOn(AgentRunner, "waitForCompletion").mockResolvedValue(true);
    vi.spyOn(AgentRunner, "getOutput").mockReturnValue("invalid");
    vi.spyOn(AgentRunner, "getTerminalMessage").mockReturnValue(undefined);

    const orchestrator = new AASOrchestrator(createConfig(), {
      retryCeiling: 2,
      hooks: { qualityGates: gateHooks },
    });

    const state = await orchestrator.executeTask(createTask());

    expect(state.status).toBe("failed");
    expect(state.retry.attempt).toBe(2);
    expect(state.retry.canRetry).toBe(false);
    expect(state.result?.success).toBe(false);
    expect(state.result?.errors?.[0]).toContain("Invalid terminal payload");
  });

  it("fails fast when required quality gate blocks execution", async () => {
    const runProcessSpy = vi.spyOn(AgentRunner, "runProcess");

    const orchestrator = new AASOrchestrator(createConfig(), {
      retryCeiling: 1,
      hooks: {
        qualityGates: {
          sanity: () => ({ stage: "sanity", decision: "pass" }),
          reviewer: () => ({ stage: "reviewer", decision: "fail", reason: "review blocked" }),
          tester: () => ({ stage: "tester", decision: "pass" }),
          security: () => ({ stage: "security", decision: "pass" }),
        },
      },
    });

    const state = await orchestrator.executeTask(createTask());

    expect(state.status).toBe("failed");
    expect(state.result?.errors).toContain("review blocked");
    expect(runProcessSpy).not.toHaveBeenCalled();
  });

  it("executeRun respects DAG dependencies", async () => {
    const sendMessage = vi.fn(async () => undefined);
    const kill = vi.fn(async () => undefined);
    const runnerClient = { sendMessage, kill };

    vi.spyOn(AgentRunner, "runProcess").mockResolvedValue(runnerClient as never);
    vi.spyOn(AgentRunner, "waitForCompletion").mockResolvedValue(true);
    vi.spyOn(AgentRunner, "getOutput").mockReturnValue("agent-output");
    vi.spyOn(AgentRunner, "getTerminalMessage").mockReturnValue({
      type: "complete",
      payload: {
        success: true,
        output: "agent-output",
      } satisfies Pick<AgentResult, "success" | "output">,
    });

    const orchestrator = new AASOrchestrator(createConfig(), {
      hooks: { qualityGates: gateHooks },
    });

    const a = createTask({ id: "a" });
    const b = createTask({ id: "b", dependsOn: ["a"] });

    const states = await orchestrator.executeRun([a, b], { concurrency: 2 });
    expect(states.find((s) => s.taskId === "a")?.status).toBe("completed");
    expect(states.find((s) => s.taskId === "b")?.status).toBe("completed");
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it("executeRun cancels on per-task timeout and kills agent", async () => {
    vi.useFakeTimers();
    const sendMessage = vi.fn(async () => undefined);
    const kill = vi.fn(async () => undefined);
    const runnerClient = { sendMessage, kill };

    vi.spyOn(AgentRunner, "runProcess").mockResolvedValue(runnerClient as never);
    vi.spyOn(AgentRunner, "waitForCompletion").mockImplementation(
      async () => await new Promise<boolean>(() => undefined),
    );
    vi.spyOn(AgentRunner, "getOutput").mockReturnValue("");
    vi.spyOn(AgentRunner, "getTerminalMessage").mockReturnValue(undefined);

    const orchestrator = new AASOrchestrator(createConfig(), {
      hooks: { qualityGates: gateHooks },
    });

    const t = createTask({ id: "timeout", timeoutMs: 10 });
    const runPromise = orchestrator.executeRun([t], { concurrency: 1, defaultTaskTimeoutMs: 10 });

    await vi.advanceTimersByTimeAsync(20);
    const states = await runPromise;

    expect(states[0]?.status).toBe("cancelled");
    expect(kill).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("executeRun resumes from checkpoint and skips completed tasks", async () => {
    const config = createConfig();
    const orchestrator = new AASOrchestrator(config, {
      hooks: { qualityGates: gateHooks },
    });

    const sendMessage = vi.fn(async () => undefined);
    const kill = vi.fn(async () => undefined);
    const runnerClient = { sendMessage, kill };

    vi.spyOn(AgentRunner, "runProcess").mockResolvedValue(runnerClient as never);
    vi.spyOn(AgentRunner, "waitForCompletion").mockResolvedValue(true);
    vi.spyOn(AgentRunner, "getOutput").mockReturnValue("agent-output");
    vi.spyOn(AgentRunner, "getTerminalMessage").mockReturnValue({
      type: "complete",
      payload: {
        success: true,
        output: "agent-output",
      } satisfies Pick<AgentResult, "success" | "output">,
    });

    const runId = "resume-run";
    const runDir = config.runDir ?? "packages/aas/.tmp-orchestrator-runs";
    const store = new RunStore({ runId, runDir });
    await store.writeCheckpoint({
      version: 1,
      runId,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      tasks: {
        a: {
          taskId: "a",
          status: "completed",
          retry: { attempt: 1, maxAttempts: 2, canRetry: true },
          gateResults: [],
          startTime: new Date(0).toISOString(),
          endTime: new Date(0).toISOString(),
          result: { success: true, outputPreview: "ok" },
        },
      },
    });

    const a = createTask({ id: "a" });
    const b = createTask({ id: "b", dependsOn: ["a"] });
    const states = await orchestrator.executeRun([a, b], {
      runId,
      runDir,
      resume: true,
      concurrency: 1,
    });

    expect(states.find((s) => s.taskId === "a")?.status).toBe("completed");
    expect(states.find((s) => s.taskId === "b")?.status).toBe("completed");
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});

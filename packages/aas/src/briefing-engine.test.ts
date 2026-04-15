import { describe, expect, it } from "vitest";

import { BriefingEngine } from "./briefing-engine.js";
import type { Task, TaskContextSnapshot } from "./types.js";

const task: Task = {
  id: "task-briefing",
  step: "step-7",
  subagent: "coder",
  brief: "Integrate orchestrator into CLI entrypoints",
  context: {
    requestSummary: "Integrate orchestrator core",
    currentState: { phase: "3" },
    previousWork: "",
    filesToCreate: [],
    filesToModify: ["bin/start-aas.ts"],
  },
};

const context: TaskContextSnapshot = {
  requestSummary: "Integrate orchestrator core",
  currentState: { status: "in-progress" },
  previousWork: "Updated orchestrator contracts",
  filesToCreate: ["packages/aas/src/orchestrator.test.ts"],
  filesToModify: ["bin/start-aas.ts", "bin/run-agent.ts"],
  retry: {
    attempt: 1,
    maxAttempts: 2,
    canRetry: true,
  },
  gateResults: [],
  status: "running",
};

describe("BriefingEngine", () => {
  it("renders all required briefing template sections", () => {
    const engine = new BriefingEngine();

    const briefing = engine.renderBriefing({ task, context });

    expect(briefing).toContain("REQUEST SUMMARY");
    expect(briefing).toContain("STEP ID / TITLE");
    expect(briefing).toContain("WHY THIS STEP EXISTS");
    expect(briefing).toContain("TASK");
    expect(briefing).toContain("CURRENT STATE");
    expect(briefing).toContain("PLAN CONTEXT");
    expect(briefing).toContain("CONTEXT");
    expect(briefing).toContain("FILES IN SCOPE");
    expect(briefing).toContain("CONSTRAINTS");
    expect(briefing).toContain("SUCCESS CRITERIA");
    expect(briefing).toContain("VERIFICATION TARGET");
    expect(briefing).toContain("REFERENCE");
    expect(briefing).toContain("EXPECTED OUTPUT FORMAT");
    expect(briefing).toContain("step-7");
  });

  it("truncates oversized serialized context", () => {
    const engine = new BriefingEngine();
    const oversizedContext: TaskContextSnapshot = {
      ...context,
      currentState: {
        payload: "x".repeat(40_000),
      },
    };

    const briefing = engine.renderBriefing({ task, context: oversizedContext });

    expect(briefing).toContain("[truncated: context exceeds");
  });
});

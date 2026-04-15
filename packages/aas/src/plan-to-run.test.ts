import { describe, expect, it } from "vitest";

import { parsePlanMarkdown } from "./plan-parser.js";
import type { PlanStep } from "./plan-schema.js";
import { planToRun } from "./plan-to-run.js";

const FIXTURE = [
  "### Agent Execution Steps",
  "**Step 1** — SEQUENTIAL — Subagent: `planner`",
  "OBJECTIVE: Plan",
  "SCOPE: Scope",
  "EXPECTED OUTPUT: Output",
  "SUCCESS CRITERIA: Criteria",
  "",
  "**Step 2** — SEQUENTIAL — Subagent: `coder`",
  "OBJECTIVE: Implement",
  "SCOPE: Scope",
  "EXPECTED OUTPUT: Output",
  "SUCCESS CRITERIA: Criteria",
  "",
  "**Step 3** — PARALLEL: after steps 1 — Subagent: `tester`",
  "OBJECTIVE: Verify",
  "SCOPE: Scope",
  "EXPECTED OUTPUT: Output",
  "SUCCESS CRITERIA: Criteria",
].join("\n");

describe("planToRun", () => {
  it("maps dependencies to task ids and chains SEQUENTIAL steps when afterSteps is empty", () => {
    const parsed = parsePlanMarkdown(FIXTURE);
    const tasks = planToRun(parsed.steps, { planFilePath: ".opencode/plans/current-plan.md" });
    expect(tasks).toHaveLength(3);
    expect(tasks[0]?.id).toBe("plan-step-01");
    expect(tasks[0]?.dependsOn).toBeUndefined();
    expect(tasks[1]?.id).toBe("plan-step-02");
    expect(tasks[1]?.dependsOn).toEqual(["plan-step-01"]);
    expect(tasks[2]?.id).toBe("plan-step-03");
    expect(tasks[2]?.dependsOn).toEqual(["plan-step-01"]);
    expect(tasks[2]?.context.filesToModify).toEqual([".opencode/plans/current-plan.md"]);
  });

  it("creates implicit deps for SEQUENTIAL steps with empty afterSteps", () => {
    const steps: PlanStep[] = [
      {
        stepNumber: 1,
        mode: "SEQUENTIAL",
        afterSteps: [],
        subagent: "planner",
        objective: "o1",
        scope: "s1",
        expectedOutput: "e1",
        successCriteria: "c1",
      },
      {
        stepNumber: 2,
        mode: "SEQUENTIAL",
        afterSteps: [],
        subagent: "coder",
        objective: "o2",
        scope: "s2",
        expectedOutput: "e2",
        successCriteria: "c2",
      },
    ];
    const tasks = planToRun(steps);
    expect(tasks).toHaveLength(2);
    expect(tasks[1]?.dependsOn).toEqual(["plan-step-01"]);
  });

  it("chains to previous existing step number when SEQUENTIAL step numbers are non-contiguous", () => {
    const steps: PlanStep[] = [
      {
        stepNumber: 1,
        mode: "SEQUENTIAL",
        afterSteps: [],
        subagent: "planner",
        objective: "o1",
        scope: "s1",
        expectedOutput: "e1",
        successCriteria: "c1",
      },
      {
        stepNumber: 3,
        mode: "SEQUENTIAL",
        afterSteps: [],
        subagent: "coder",
        objective: "o3",
        scope: "s3",
        expectedOutput: "e3",
        successCriteria: "c3",
      },
    ];
    const tasks = planToRun(steps);
    expect(tasks).toHaveLength(2);
    expect(tasks[1]?.id).toBe("plan-step-03");
    expect(tasks[1]?.dependsOn).toEqual(["plan-step-01"]);
  });

  it("rejects unknown dependency steps", () => {
    const steps: PlanStep[] = [
      {
        stepNumber: 1,
        mode: "PARALLEL",
        afterSteps: [99],
        subagent: "coder",
        objective: "o",
        scope: "s",
        expectedOutput: "e",
        successCriteria: "c",
      },
    ];
    expect(() => planToRun(steps)).toThrow(/unknown dependency step/i);
  });

  it("rejects cycles", () => {
    const steps: PlanStep[] = [
      {
        stepNumber: 1,
        mode: "PARALLEL",
        afterSteps: [2],
        subagent: "coder",
        objective: "o1",
        scope: "s1",
        expectedOutput: "e1",
        successCriteria: "c1",
      },
      {
        stepNumber: 2,
        mode: "PARALLEL",
        afterSteps: [1],
        subagent: "coder",
        objective: "o2",
        scope: "s2",
        expectedOutput: "e2",
        successCriteria: "c2",
      },
    ];
    expect(() => planToRun(steps)).toThrow(/cycle detected/i);
  });
});

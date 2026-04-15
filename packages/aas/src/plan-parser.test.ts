import { describe, expect, it } from "vitest";

import { parsePlanMarkdown } from "./plan-parser.js";

const CANONICAL_PLAN_FIXTURE = [
  "BEGIN PLAN",
  "# Phase 5 Plan",
  "",
  "Some narrative text that should be ignored.",
  "",
  "### Agent Execution Steps",
  "**Step 1** — SEQUENTIAL — Subagent: `planner`",
  "OBJECTIVE:",
  "Produce a structured plan for core artifacts.",
  "SCOPE:",
  "- packages/aas/src/plan-schema.ts",
  "- packages/aas/src/plan-parser.ts",
  "EXPECTED OUTPUT:",
  "- A markdown plan section with executable steps.",
  "SUCCESS CRITERIA:",
  "- Steps parse deterministically.",
  "",
  "**Step 2** - PARALLEL: after step 1 - Subagent: `coder`",
  "OBJECTIVE: Implement plan parsing + run mapping.",
  "SCOPE:",
  "Add and export core artifacts in @finance/aas.",
  "EXPECTED OUTPUT:",
  "- TypeScript modules and tests.",
  "SUCCESS CRITERIA:",
  "- type-check/lint/test pass.",
  "",
  "### Non-Executable Notes",
  "This section should not be parsed.",
  "",
  "END PLAN<runtime>",
].join("\n");

describe("parsePlanMarkdown", () => {
  it("parses only within Agent Execution Steps", () => {
    const result = parsePlanMarkdown(CANONICAL_PLAN_FIXTURE);
    expect(result.warning).toBeUndefined();
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]?.stepNumber).toBe(1);
    expect(result.steps[0]?.mode).toBe("SEQUENTIAL");
    expect(result.steps[0]?.subagent).toBe("planner");
    expect(result.steps[1]?.mode).toBe("PARALLEL");
    expect(result.steps[1]?.afterSteps).toEqual([1]);
  });

  it("returns no executable steps when section missing", () => {
    const result = parsePlanMarkdown("# Title\n\nNo executable section here.\n");
    expect(result.steps).toEqual([]);
    expect(result.warning).toMatch(/no executable steps/i);
  });

  it("throws on malformed step block (missing required fields)", () => {
    const bad = [
      "### Agent Execution Steps",
      "**Step 1** — SEQUENTIAL — Subagent: `coder`",
      "OBJECTIVE: Do something",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "", // missing SUCCESS CRITERIA
    ].join("\n");
    expect(() => parsePlanMarkdown(bad)).toThrow(/missing required fields/i);
  });

  it("throws on oversize input", () => {
    const bytes = 256 * 1024 + 1;
    const huge = "a".repeat(bytes);
    expect(() => parsePlanMarkdown(huge)).toThrow(/exceeds maximum size/i);
  });

  it("parses SEQUENTIAL dependencies when explicitly provided", () => {
    const plan = [
      "### Agent Execution Steps",
      "**Step 1** — SEQUENTIAL — Subagent: `planner`",
      "OBJECTIVE: One",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
      "",
      "**Step 2** — SEQUENTIAL: after step 1 — Subagent: `coder`",
      "OBJECTIVE: Two",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
    ].join("\n");

    const result = parsePlanMarkdown(plan);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[1]?.mode).toBe("SEQUENTIAL");
    expect(result.steps[1]?.afterSteps).toEqual([1]);
  });

  it("throws when dependency list includes non-positive step numbers", () => {
    const plan = [
      "### Agent Execution Steps",
      "**Step 1** — SEQUENTIAL — Subagent: `planner`",
      "OBJECTIVE: One",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
      "",
      "**Step 2** — SEQUENTIAL: after steps 1, 0, 2 — Subagent: `coder`",
      "OBJECTIVE: Two",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
    ].join("\n");

    expect(() => parsePlanMarkdown(plan)).toThrow(/non-positive dependency number/i);
  });

  it("throws on malformed mode strings (fail-closed)", () => {
    const badParallel = [
      "### Agent Execution Steps",
      "**Step 1** — PARALLEL blah — Subagent: `coder`",
      "OBJECTIVE: One",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
    ].join("\n");
    expect(() => parsePlanMarkdown(badParallel)).toThrow(
      /invalid execution mode syntax|unknown execution mode/i,
    );

    const badSequential = [
      "### Agent Execution Steps",
      "**Step 1** — SEQUENTIAL: after step 1 blah — Subagent: `coder`",
      "OBJECTIVE: One",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
    ].join("\n");
    expect(() => parsePlanMarkdown(badSequential)).toThrow(
      /invalid dependency list|invalid execution mode syntax|unknown execution mode/i,
    );
  });
});

import { mkdtemp, rm, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { afterEach, describe, expect, it } from "vitest";

import { parsePlanMarkdown } from "./plan-parser.js";
import { planToRun } from "./plan-to-run.js";
import { createPlanDrivenQualityGateHooks } from "./quality-gates.js";
import type { Task } from "./types.js";

const AAS_PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT_DIR = path.resolve(AAS_PACKAGE_DIR, "..", "..");

const createdDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirs
      .splice(0, createdDirs.length)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function makeRepoTempDir(): Promise<string> {
  const parent = path.join(ROOT_DIR, "packages", "aas");
  const dir = await mkdtemp(path.join(parent, ".tmp-quality-gates-"));
  createdDirs.push(dir);
  return dir;
}

async function writePlan(markdown: string): Promise<{ dir: string; planFilePath: string }> {
  const dir = await makeRepoTempDir();
  const planFilePath = path.join(dir, "plan.md");
  await writeFile(planFilePath, markdown, "utf8");
  return { dir, planFilePath };
}

function dummyTask(): Task {
  return {
    id: "dummy",
    step: "Dummy",
    subagent: "coder",
    brief: "",
    context: {
      requestSummary: "",
      currentState: {},
      previousWork: "",
      filesToCreate: [],
      filesToModify: [],
    },
  };
}

function taskForStep(markdown: string, planFilePath: string, stepNumber: number): Task {
  const parsed = parsePlanMarkdown(markdown);
  const tasks = planToRun(parsed.steps, { planFilePath });
  const id = `plan-step-${String(stepNumber).padStart(2, "0")}`;
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    throw new Error(`Expected task for step ${stepNumber} (${id}) to exist.`);
  }
  return task;
}

describe("createPlanDrivenQualityGateHooks", () => {
  it("fails sanity when plan markdown is missing ### Agent Execution Steps", async () => {
    const markdown = ["# Plan", "", "## Verification", "- noop"].join("\n");
    const { planFilePath } = await writePlan(markdown);

    const hooks = createPlanDrivenQualityGateHooks({
      planFilePath,
      unsafeGates: false,
      getValidatedPlanFilePath: () => planFilePath,
    });

    const result = await hooks.sanity?.({ task: dummyTask(), stage: "sanity", attempt: 1 });
    expect(result?.decision).toBe("fail");
    expect(result?.reason).toMatch(/missing required section/i);
    expect(result?.reason).toMatch(/Agent Execution Steps/i);
  });

  it("fails sanity when plan markdown is missing ## Verification", async () => {
    const markdown = [
      "# Plan",
      "",
      "### Agent Execution Steps",
      "**Step 1** — SEQUENTIAL — Subagent: `coder`",
      "OBJECTIVE: One",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
    ].join("\n");
    const { planFilePath } = await writePlan(markdown);

    const hooks = createPlanDrivenQualityGateHooks({
      planFilePath,
      unsafeGates: false,
      getValidatedPlanFilePath: () => planFilePath,
    });

    const result = await hooks.sanity?.({ task: dummyTask(), stage: "sanity", attempt: 1 });
    expect(result?.decision).toBe("fail");
    expect(result?.reason).toMatch(/missing required heading/i);
    expect(result?.reason).toMatch(/Verification/i);
  });

  it("fails reviewer gate when coder task has no reviewer ancestor", async () => {
    const markdown = [
      "# Plan",
      "",
      "### Agent Execution Steps",
      "**Step 1** — SEQUENTIAL — Subagent: `coder`",
      "OBJECTIVE: Implement",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
      "",
      "**Step 2** — SEQUENTIAL — Subagent: `reviewer`",
      "OBJECTIVE: Review",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
      "",
      "## Verification",
      "- noop",
    ].join("\n");
    const { planFilePath } = await writePlan(markdown);
    const coderTask = taskForStep(markdown, planFilePath, 1);

    const hooks = createPlanDrivenQualityGateHooks({
      planFilePath,
      unsafeGates: false,
      getValidatedPlanFilePath: () => planFilePath,
    });

    const result = await hooks.reviewer?.({ task: coderTask, stage: "reviewer", attempt: 1 });
    expect(result?.decision).toBe("fail");
    expect(result?.reason).toMatch(/must depend.*reviewer/i);
  });

  it("fails tester gate when docs task has no tester ancestor", async () => {
    const markdown = [
      "# Plan",
      "",
      "### Agent Execution Steps",
      "**Step 1** — SEQUENTIAL — Subagent: `docs`",
      "OBJECTIVE: Document",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
      "",
      "**Step 2** — SEQUENTIAL — Subagent: `tester`",
      "OBJECTIVE: Test",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
      "",
      "## Verification",
      "- noop",
    ].join("\n");
    const { planFilePath } = await writePlan(markdown);
    const docsTask = taskForStep(markdown, planFilePath, 1);

    const hooks = createPlanDrivenQualityGateHooks({
      planFilePath,
      unsafeGates: false,
      getValidatedPlanFilePath: () => planFilePath,
    });

    const result = await hooks.tester?.({ task: docsTask, stage: "tester", attempt: 1 });
    expect(result?.decision).toBe("fail");
    expect(result?.reason).toMatch(/must depend.*tester/i);
  });

  it("enforces security gate when risky scope exists and docs does not depend on security-auditor", async () => {
    const markdown = [
      "# Plan",
      "",
      "### Agent Execution Steps",
      "**Step 1** — SEQUENTIAL — Subagent: `coder`",
      "OBJECTIVE: Implement API change",
      "SCOPE:",
      "- packages/api/src/routers/transaction.ts",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
      "",
      "**Step 2** — SEQUENTIAL — Subagent: `docs`",
      "OBJECTIVE: Document",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
      "",
      "**Step 3** — SEQUENTIAL — Subagent: `security-auditor`",
      "OBJECTIVE: Audit",
      "SCOPE: In scope",
      "EXPECTED OUTPUT: Output",
      "SUCCESS CRITERIA: Done",
      "",
      "## Verification",
      "- noop",
    ].join("\n");
    const { planFilePath } = await writePlan(markdown);
    const coderTask = taskForStep(markdown, planFilePath, 1);
    const docsTask = taskForStep(markdown, planFilePath, 2);

    const hooks = createPlanDrivenQualityGateHooks({
      planFilePath,
      unsafeGates: false,
      getValidatedPlanFilePath: () => planFilePath,
    });

    const coderResult = await hooks.security?.({ task: coderTask, stage: "security", attempt: 1 });
    expect(coderResult?.decision).toBe("pass");

    const docsResult = await hooks.security?.({ task: docsTask, stage: "security", attempt: 1 });
    expect(docsResult?.decision).toBe("fail");
    expect(docsResult?.reason).toMatch(/docs task/i);
    expect(docsResult?.reason).toMatch(/security-auditor/i);
    expect(docsResult?.reason).toMatch(/must depend/i);
  });

  it("bypasses all gates when unsafeGates is true", async () => {
    const hooks = createPlanDrivenQualityGateHooks({
      planFilePath: path.join("does-not-exist", "plan.md"),
      unsafeGates: true,
    });

    const task = dummyTask();
    const sanity = await hooks.sanity?.({ task, stage: "sanity", attempt: 1 });
    const reviewer = await hooks.reviewer?.({ task, stage: "reviewer", attempt: 1 });
    const tester = await hooks.tester?.({ task, stage: "tester", attempt: 1 });
    const security = await hooks.security?.({ task, stage: "security", attempt: 1 });

    expect(sanity?.decision).toBe("pass");
    expect(reviewer?.decision).toBe("pass");
    expect(tester?.decision).toBe("pass");
    expect(security?.decision).toBe("pass");
  });
});

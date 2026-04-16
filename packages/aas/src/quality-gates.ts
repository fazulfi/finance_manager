import { open } from "fs/promises";
import path from "path";

import { parsePlanMarkdown } from "./plan-parser.js";
import { PLAN_LIMITS, type PlanStep } from "./plan-schema.js";
import { planToRun } from "./plan-to-run.js";
import type { QualityGateHooks, QualityGateResult, QualityGateStage, Task } from "./types.js";

export type PlanDrivenQualityGateHooksOptions = {
  planFilePath: string;
  unsafeGates: boolean;
  source?: string;
  /**
   * Optional lazy getter for a validated plan file path.
   *
   * Security note:
   * - start-aas MUST only read the plan after AASOrchestrator has validated planFilePath confinement.
   * - providing this getter lets callers supply orchestrator.getPlanFilePath() at runtime.
   */
  getValidatedPlanFilePath?: () => string;
};

type PlanPreflight = {
  planFilePath: string;
  steps: PlanStep[];
  tasks: Task[];
  taskById: Map<string, Task>;
  stepByTaskId: Map<string, PlanStep>;
  ancestorsByTaskId: Map<string, Set<string>>;
  descendantsByTaskId: Map<string, Set<string>>;
  reviewerTaskIds: Set<string>;
  testerTaskIds: Set<string>;
  securityAuditorTaskIds: Set<string>;
  docsTaskIds: Set<string>;
  coderTaskIds: Set<string>;
  riskyTaskIds: Set<string>;
  hasAnyRisk: boolean;
};

const EXECUTION_SECTION_HEADER = /^###\s+Agent Execution Steps\s*$/im;
const VERIFICATION_SECTION_HEADER = /^##\s+Verification\s*$/im;

const RISKY_SCOPE_PATTERNS: readonly RegExp[] = [
  /\bpackages\/api\//i,
  /\bpackages\/db\//i,
  /\bschema\.prisma\b/i,
  /\bauth\b/i,
  /\bmiddleware\b/i,
];

export function createPlanDrivenQualityGateHooks(
  options: PlanDrivenQualityGateHooksOptions,
): QualityGateHooks {
  const source = options.source ?? "plan-driven";

  if (options.unsafeGates) {
    return {
      sanity: () => ({ stage: "sanity", decision: "pass", metadata: { source } }),
      reviewer: () => ({ stage: "reviewer", decision: "pass", metadata: { source } }),
      tester: () => ({ stage: "tester", decision: "pass", metadata: { source } }),
      security: () => ({ stage: "security", decision: "pass", metadata: { source } }),
    };
  }

  let cachedPreflight: Promise<PlanPreflight> | null = null;
  const getPreflight = () => {
    if (!cachedPreflight) {
      cachedPreflight = runPreflight(options);
    }
    return cachedPreflight;
  };

  const evaluate = async (stage: QualityGateStage, task: Task): Promise<QualityGateResult> => {
    let preflight: PlanPreflight;
    try {
      preflight = await getPreflight();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return fail(stage, message || `Quality gate preflight failed at ${stage}.`, { source });
    }

    if (!isPlanTask(task)) {
      return fail(stage, "Quality gates require a plan-driven task (missing plan step metadata).", {
        source,
      });
    }

    const planTask = preflight.taskById.get(task.id);
    if (!planTask) {
      return fail(stage, `Task ${task.id} is not present in the parsed plan DAG.`, {
        source,
        planFilePath: preflight.planFilePath,
      });
    }

    switch (stage) {
      case "sanity":
        return pass(stage, { source, planFilePath: preflight.planFilePath });

      case "reviewer":
        return evaluateReviewerGate(preflight, planTask, source);

      case "tester":
        return evaluateTesterGate(preflight, planTask, source);

      case "security":
        return evaluateSecurityGate(preflight, planTask, source);
    }
  };

  return {
    sanity: async ({ task }) => evaluate("sanity", task),
    reviewer: async ({ task }) => evaluate("reviewer", task),
    tester: async ({ task }) => evaluate("tester", task),
    security: async ({ task }) => evaluate("security", task),
  };
}

async function runPreflight(options: PlanDrivenQualityGateHooksOptions): Promise<PlanPreflight> {
  const planFilePath = options.getValidatedPlanFilePath?.() ?? options.planFilePath;
  const resolvedPath = path.resolve(planFilePath);

  const { content } = await readBoundedFile(resolvedPath, PLAN_LIMITS.maxInputBytes);

  if (!EXECUTION_SECTION_HEADER.test(content)) {
    throw new Error(
      'Plan sanity check failed: missing required section "### Agent Execution Steps".',
    );
  }

  if (!VERIFICATION_SECTION_HEADER.test(content)) {
    throw new Error('Plan sanity check failed: missing required heading "## Verification".');
  }

  const parsed = parsePlanMarkdown(content);
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error("Plan sanity check failed: no executable steps found.");
  }

  const tasks = planToRun(parsed.steps, { planFilePath });
  if (tasks.length === 0) {
    throw new Error("Plan sanity check failed: executable steps did not produce runnable tasks.");
  }

  const taskById = new Map<string, Task>();
  const stepByTaskId = new Map<string, PlanStep>();
  const stepByStepNumber = new Map<number, PlanStep>();
  for (const step of parsed.steps) {
    stepByStepNumber.set(step.stepNumber, step);
  }

  for (const task of tasks) {
    taskById.set(task.id, task);

    const planStepNumber = extractPlanStepNumber(task);
    if (typeof planStepNumber === "number") {
      const step = stepByStepNumber.get(planStepNumber);
      if (step) {
        stepByTaskId.set(task.id, step);
      }
    }
  }

  const { ancestorsByTaskId, descendantsByTaskId } = buildDependencyClosure(tasks);

  const reviewerTaskIds = collectTaskIdsBySubagent(tasks, "reviewer");
  const testerTaskIds = collectTaskIdsBySubagent(tasks, "tester");
  const securityAuditorTaskIds = collectTaskIdsBySubagent(tasks, "security-auditor");
  const docsTaskIds = collectTaskIdsBySubagent(tasks, "docs");
  const coderTaskIds = collectTaskIdsBySubagent(tasks, "coder");

  const riskyTaskIds = new Set<string>();
  for (const task of tasks) {
    const step = stepByTaskId.get(task.id);
    if (!step) continue;
    if (isRiskyScope(step.scope)) {
      riskyTaskIds.add(task.id);
    }
  }

  return {
    planFilePath,
    steps: parsed.steps,
    tasks,
    taskById,
    stepByTaskId,
    ancestorsByTaskId,
    descendantsByTaskId,
    reviewerTaskIds,
    testerTaskIds,
    securityAuditorTaskIds,
    docsTaskIds,
    coderTaskIds,
    riskyTaskIds,
    hasAnyRisk: riskyTaskIds.size > 0,
  };
}

async function readBoundedFile(filePath: string, maxBytes: number): Promise<{ content: string }> {
  const handle = await open(filePath, "r");
  try {
    const stat = await handle.stat();
    if (stat.size > maxBytes) {
      throw new Error(
        `Plan file exceeds maximum size (${stat.size} bytes > ${maxBytes} bytes): ${filePath}`,
      );
    }
    const content = await handle.readFile({ encoding: "utf8" });
    return { content };
  } finally {
    await handle.close();
  }
}

function buildDependencyClosure(tasks: Task[]): {
  ancestorsByTaskId: Map<string, Set<string>>;
  descendantsByTaskId: Map<string, Set<string>>;
} {
  const taskById = new Map<string, Task>();
  for (const task of tasks) {
    taskById.set(task.id, task);
  }

  const reverseEdges = new Map<string, Set<string>>();
  for (const task of tasks) {
    for (const dep of task.dependsOn ?? []) {
      const children = reverseEdges.get(dep) ?? new Set<string>();
      children.add(task.id);
      reverseEdges.set(dep, children);
    }
  }

  const ancestorsByTaskId = new Map<string, Set<string>>();
  const descendantsByTaskId = new Map<string, Set<string>>();

  for (const task of tasks) {
    ancestorsByTaskId.set(
      task.id,
      collectReachable(task.dependsOn ?? [], (id) => taskById.get(id)?.dependsOn ?? []),
    );
  }

  for (const task of tasks) {
    descendantsByTaskId.set(
      task.id,
      collectReachable(Array.from(reverseEdges.get(task.id) ?? []), (id) =>
        Array.from(reverseEdges.get(id) ?? []),
      ),
    );
  }

  return { ancestorsByTaskId, descendantsByTaskId };
}

function collectReachable(initial: string[], next: (id: string) => string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...initial];

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    for (const candidate of next(id)) {
      if (!seen.has(candidate)) {
        queue.push(candidate);
      }
    }
  }

  return seen;
}

function evaluateReviewerGate(
  preflight: PlanPreflight,
  task: Task,
  source: string,
): QualityGateResult {
  if (task.subagent === "reviewer") {
    return pass("reviewer", { source, planFilePath: preflight.planFilePath });
  }

  // Plan-review gate semantics: execution-boundary tasks must depend on a reviewer step upstream.
  const requiresReviewerAncestor =
    preflight.coderTaskIds.has(task.id) || preflight.docsTaskIds.has(task.id);

  if (!requiresReviewerAncestor) {
    return pass("reviewer", { source, planFilePath: preflight.planFilePath });
  }

  if (preflight.reviewerTaskIds.size === 0) {
    return fail("reviewer", "Plan review gate failed: no reviewer step exists in the plan.", {
      source,
      planFilePath: preflight.planFilePath,
    });
  }

  const ancestors = preflight.ancestorsByTaskId.get(task.id) ?? new Set<string>();
  for (const id of ancestors) {
    const t = preflight.taskById.get(id);
    if (t?.subagent === "reviewer") {
      return pass("reviewer", { source, planFilePath: preflight.planFilePath });
    }
  }

  return fail(
    "reviewer",
    `Plan review gate failed: task ${task.id} must depend (transitively) on a reviewer task.`,
    { source, planFilePath: preflight.planFilePath },
  );
}

function evaluateTesterGate(
  preflight: PlanPreflight,
  task: Task,
  source: string,
): QualityGateResult {
  if (task.subagent === "tester") {
    return pass("tester", { source, planFilePath: preflight.planFilePath });
  }

  if (task.subagent !== "docs") {
    return pass("tester", { source, planFilePath: preflight.planFilePath });
  }

  if (preflight.testerTaskIds.size === 0) {
    return fail(
      "tester",
      "Tester gate failed: docs step requires at least one tester step in the plan.",
      { source, planFilePath: preflight.planFilePath },
    );
  }

  const ancestors = preflight.ancestorsByTaskId.get(task.id) ?? new Set<string>();
  for (const id of ancestors) {
    const t = preflight.taskById.get(id);
    if (t?.subagent === "tester") {
      return pass("tester", { source, planFilePath: preflight.planFilePath });
    }
  }

  return fail(
    "tester",
    `Tester gate failed: docs task ${task.id} must depend (transitively) on a tester task.`,
    { source, planFilePath: preflight.planFilePath },
  );
}

function evaluateSecurityGate(
  preflight: PlanPreflight,
  task: Task,
  source: string,
): QualityGateResult {
  if (!preflight.hasAnyRisk) {
    return pass("security", { source, planFilePath: preflight.planFilePath });
  }

  if (task.subagent === "security-auditor") {
    return pass("security", { source, planFilePath: preflight.planFilePath });
  }

  if (preflight.securityAuditorTaskIds.size === 0) {
    return fail(
      "security",
      "Security gate failed: risky scope detected but no security-auditor step exists in the plan.",
      { source, planFilePath: preflight.planFilePath },
    );
  }

  // If the current task is a risky coder step, require a downstream security-auditor step.
  if (preflight.coderTaskIds.has(task.id) && preflight.riskyTaskIds.has(task.id)) {
    const descendants = preflight.descendantsByTaskId.get(task.id) ?? new Set<string>();
    for (const id of descendants) {
      const t = preflight.taskById.get(id);
      if (t?.subagent === "security-auditor") {
        return pass("security", { source, planFilePath: preflight.planFilePath });
      }
    }

    return fail(
      "security",
      `Security gate failed: risky coder task ${task.id} must have a downstream security-auditor step.`,
      { source, planFilePath: preflight.planFilePath },
    );
  }

  // If docs exist, require docs to depend (transitively) on security-auditor when any risk exists.
  if (task.subagent === "docs") {
    const ancestors = preflight.ancestorsByTaskId.get(task.id) ?? new Set<string>();
    for (const id of ancestors) {
      const t = preflight.taskById.get(id);
      if (t?.subagent === "security-auditor") {
        return pass("security", { source, planFilePath: preflight.planFilePath });
      }
    }

    return fail(
      "security",
      `Security gate failed: docs task ${task.id} must depend (transitively) on a security-auditor task when risky scope is present in the plan.`,
      { source, planFilePath: preflight.planFilePath },
    );
  }

  return pass("security", { source, planFilePath: preflight.planFilePath });
}

function collectTaskIdsBySubagent(tasks: Task[], subagent: string): Set<string> {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (task.subagent === subagent) {
      ids.add(task.id);
    }
  }
  return ids;
}

function isRiskyScope(scope: string): boolean {
  for (const pattern of RISKY_SCOPE_PATTERNS) {
    if (pattern.test(scope)) {
      return true;
    }
  }
  return false;
}

function isPlanTask(task: Task): boolean {
  return typeof extractPlanStepNumber(task) === "number";
}

function extractPlanStepNumber(task: Task): number | null {
  const planStep = (task.context.currentState as Record<string, unknown> | undefined)?.planStep;
  if (typeof planStep === "number" && Number.isFinite(planStep)) {
    return planStep;
  }
  return null;
}

function pass(stage: QualityGateStage, metadata?: Record<string, unknown>): QualityGateResult {
  return { stage, decision: "pass", ...(metadata ? { metadata } : {}) };
}

function fail(
  stage: QualityGateStage,
  reason: string,
  metadata?: Record<string, unknown>,
): QualityGateResult {
  return { stage, decision: "fail", reason, ...(metadata ? { metadata } : {}) };
}

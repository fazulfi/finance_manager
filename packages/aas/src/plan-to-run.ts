import { DagScheduler } from "./dag-scheduler.js";
import type { PlanStep } from "./plan-schema.js";
import type { Task } from "./types.js";

const DEFAULT_PRIORITY = 0;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export function planToRun(
  steps: PlanStep[],
  options?: { defaultPriority?: number; defaultTimeoutMs?: number; planFilePath?: string },
): Task[] {
  if (!Array.isArray(steps) || steps.length === 0) {
    return [];
  }

  const defaultPriority =
    typeof options?.defaultPriority === "number" && Number.isFinite(options.defaultPriority)
      ? Math.trunc(options.defaultPriority)
      : DEFAULT_PRIORITY;
  const defaultTimeoutMs =
    typeof options?.defaultTimeoutMs === "number" && Number.isFinite(options.defaultTimeoutMs)
      ? Math.max(1, Math.trunc(options.defaultTimeoutMs))
      : DEFAULT_TIMEOUT_MS;

  const idByStepNumber = new Map<number, string>();
  for (const step of steps) {
    const id = stableTaskId(step.stepNumber);
    if (idByStepNumber.has(step.stepNumber)) {
      throw new Error(`Duplicate step number in run: ${step.stepNumber}`);
    }
    idByStepNumber.set(step.stepNumber, id);
  }

  const orderedStepNumbers = Array.from(idByStepNumber.keys()).sort((a, b) => a - b);
  const previousStepNumberByStepNumber = new Map<number, number>();
  for (let idx = 1; idx < orderedStepNumbers.length; idx += 1) {
    const stepNumber = orderedStepNumbers[idx];
    const prevStepNumber = orderedStepNumbers[idx - 1];
    if (typeof stepNumber === "number" && typeof prevStepNumber === "number") {
      previousStepNumberByStepNumber.set(stepNumber, prevStepNumber);
    }
  }

  const tasks: Task[] = [];
  for (let idx = 0; idx < steps.length; idx += 1) {
    const step = steps[idx];
    if (!step) {
      continue;
    }

    const id = idByStepNumber.get(step.stepNumber);
    if (!id) {
      continue;
    }

    const dependsOn = buildDependsOn(step, idByStepNumber, previousStepNumberByStepNumber);

    tasks.push({
      id,
      step: `Step ${step.stepNumber}`,
      subagent: step.subagent,
      brief: renderBrief(step),
      ...(dependsOn.length > 0 ? { dependsOn } : {}),
      priority: defaultPriority,
      timeoutMs: defaultTimeoutMs,
      context: {
        requestSummary: step.objective,
        currentState: {
          planStep: step.stepNumber,
          mode: step.mode,
          afterSteps: step.afterSteps,
        },
        previousWork: "",
        filesToCreate: [],
        filesToModify: options?.planFilePath ? [options.planFilePath] : [],
      },
    });
  }

  // Validates unknown deps and cycles (fail fast)
  void new DagScheduler(tasks);

  return tasks;
}

function stableTaskId(stepNumber: number): string {
  return `plan-step-${String(stepNumber).padStart(2, "0")}`;
}

function buildDependsOn(
  step: PlanStep,
  idByStepNumber: Map<number, string>,
  previousStepNumberByStepNumber: Map<number, number>,
): string[] {
  const deps: string[] = [];

  if (step.mode === "SEQUENTIAL" && step.afterSteps.length === 0) {
    const prevStepNumber = previousStepNumberByStepNumber.get(step.stepNumber);
    if (typeof prevStepNumber === "number") {
      const prevId = idByStepNumber.get(prevStepNumber);
      if (prevId) {
        deps.push(prevId);
      }
    }
  }

  for (const depStepNumber of step.afterSteps) {
    if (depStepNumber === step.stepNumber) {
      throw new Error(`Step ${step.stepNumber} cannot depend on itself`);
    }

    const depId = idByStepNumber.get(depStepNumber);
    if (!depId) {
      throw new Error(
        `Unknown dependency step ${depStepNumber} referenced by step ${step.stepNumber}`,
      );
    }
    deps.push(depId);
  }

  return Array.from(new Set(deps));
}

function renderBrief(step: PlanStep): string {
  return [
    `OBJECTIVE\n${step.objective}`,
    `SCOPE\n${step.scope}`,
    `EXPECTED OUTPUT\n${step.expectedOutput}`,
    `SUCCESS CRITERIA\n${step.successCriteria}`,
  ].join("\n\n");
}

import { z } from "zod";

export const PLAN_LIMITS = {
  maxInputBytes: 256 * 1024,
  maxSteps: 50,
  maxDepsPerStep: 10,
  maxSubagentBytes: 64,
  maxObjectiveBytes: 2 * 1024,
  maxScopeBytes: 8 * 1024,
  maxExpectedOutputBytes: 4 * 1024,
  maxSuccessCriteriaBytes: 4 * 1024,
} as const;

export type PlanExecutionMode = "SEQUENTIAL" | "PARALLEL";

export type PlanStep = {
  stepNumber: number;
  mode: PlanExecutionMode;
  afterSteps: number[];
  subagent: string;
  objective: string;
  scope: string;
  expectedOutput: string;
  successCriteria: string;
};

export const planStepSchema = z
  .object({
    stepNumber: z.number().int().min(1),
    mode: z.enum(["SEQUENTIAL", "PARALLEL"]),
    afterSteps: z.array(z.number().int().min(1)).max(PLAN_LIMITS.maxDepsPerStep),
    subagent: z.string().trim().min(1),
    objective: z.string().trim().min(1),
    scope: z.string().trim().min(1),
    expectedOutput: z.string().trim().min(1),
    successCriteria: z.string().trim().min(1),
  })
  .superRefine((value, ctx) => {
    addUtf8MaxBytesIssue(
      ctx,
      ["subagent"],
      "subagent",
      value.subagent,
      PLAN_LIMITS.maxSubagentBytes,
    );
    addUtf8MaxBytesIssue(
      ctx,
      ["objective"],
      "objective",
      value.objective,
      PLAN_LIMITS.maxObjectiveBytes,
    );
    addUtf8MaxBytesIssue(ctx, ["scope"], "scope", value.scope, PLAN_LIMITS.maxScopeBytes);
    addUtf8MaxBytesIssue(
      ctx,
      ["expectedOutput"],
      "expectedOutput",
      value.expectedOutput,
      PLAN_LIMITS.maxExpectedOutputBytes,
    );
    addUtf8MaxBytesIssue(
      ctx,
      ["successCriteria"],
      "successCriteria",
      value.successCriteria,
      PLAN_LIMITS.maxSuccessCriteriaBytes,
    );
  });

export const planStepsSchema = z.array(planStepSchema).max(PLAN_LIMITS.maxSteps);

export const schemas = {
  planStepSchema,
  planStepsSchema,
} as const;

function addUtf8MaxBytesIssue(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  label: string,
  value: string,
  maxBytes: number,
): void {
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes <= maxBytes) {
    return;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message: `${label} exceeds maximum length (${maxBytes} bytes)`,
  });
}

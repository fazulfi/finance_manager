import { PLAN_LIMITS, planStepsSchema } from "./plan-schema.js";
import type { PlanStep } from "./plan-schema.js";

export type ParsePlanMarkdownResult = {
  steps: PlanStep[];
  warning?: string;
};

const NO_EXECUTABLE_STEPS_WARNING = "no executable steps";

const EXECUTION_SECTION_HEADER = /^###\s+Agent Execution Steps\s*$/im;
const NEXT_SECTION_HEADER = /^###\s+/m;

const STEP_HEADER_LINE =
  /^\s*\*\*Step\s+(\d+)\*\*\s*(?:—|–|-)\s*(.*?)\s*(?:—|–|-)\s*Subagent:\s*`([^`]+)`\s*$/i;

type FieldKey = "OBJECTIVE" | "SCOPE" | "EXPECTED OUTPUT" | "SUCCESS CRITERIA";

const FIELD_LABEL_LINE =
  /^\s*(?:[-*]\s*)?(?:\*\*)?\s*(OBJECTIVE|SCOPE|EXPECTED OUTPUT|SUCCESS CRITERIA)\s*(?:\*\*)?\s*:\s*(.*)\s*$/i;

export function parsePlanMarkdown(markdown: string): ParsePlanMarkdownResult {
  if (typeof markdown !== "string") {
    throw new Error("Plan markdown must be a string");
  }

  const bytes = Buffer.byteLength(markdown, "utf8");
  if (bytes > PLAN_LIMITS.maxInputBytes) {
    throw new Error(
      `Plan markdown exceeds maximum size (${bytes} bytes > ${PLAN_LIMITS.maxInputBytes} bytes)`,
    );
  }

  const section = extractExecutionStepsSection(markdown);
  if (!section) {
    return { steps: [], warning: NO_EXECUTABLE_STEPS_WARNING };
  }

  const lines = section
    .split(/\r?\n/)
    .filter((line) => !/^\s*BEGIN PLAN\b/i.test(line) && !/^\s*END PLAN\b/i.test(line));

  const steps: PlanStep[] = [];
  const seenStepNumbers = new Set<number>();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^\*\*Step\b/i.test(trimmed)) {
      const match = STEP_HEADER_LINE.exec(line);
      if (!match) {
        throw new Error(`Malformed step header: ${line}`);
      }

      const stepNumber = parseInt(match[1] ?? "", 10);
      if (!Number.isFinite(stepNumber) || stepNumber <= 0) {
        throw new Error(`Invalid step number: ${match[1] ?? ""}`);
      }
      if (seenStepNumbers.has(stepNumber)) {
        throw new Error(`Duplicate step number: ${stepNumber}`);
      }
      seenStepNumbers.add(stepNumber);
      if (seenStepNumbers.size > PLAN_LIMITS.maxSteps) {
        throw new Error(`Plan exceeds maximum steps (${PLAN_LIMITS.maxSteps})`);
      }

      const modeAndDeps = String(match[2] ?? "").trim();
      const subagent = String(match[3] ?? "").trim();
      const { mode, afterSteps } = parseMode(modeAndDeps, stepNumber);

      if (afterSteps.length > PLAN_LIMITS.maxDepsPerStep) {
        throw new Error(
          `Step ${stepNumber} exceeds maximum dependencies (${PLAN_LIMITS.maxDepsPerStep})`,
        );
      }

      const bodyLines: string[] = [];
      i += 1;
      while (i < lines.length) {
        const next = lines[i] ?? "";
        if (/^\s*\*\*Step\b/i.test(next.trim())) {
          break;
        }
        bodyLines.push(next);
        i += 1;
      }

      const fields = parseRequiredFields(bodyLines, stepNumber);
      const candidate: PlanStep = {
        stepNumber,
        mode,
        afterSteps,
        subagent,
        objective: fields.objective,
        scope: fields.scope,
        expectedOutput: fields.expectedOutput,
        successCriteria: fields.successCriteria,
      };

      const validated = planStepsSchema.element.safeParse(candidate);
      if (!validated.success) {
        throw new Error(
          `Invalid step ${stepNumber}: ${validated.error.issues.map((i) => i.message).join("; ")}`,
        );
      }

      steps.push(validated.data);
      continue;
    }

    i += 1;
  }

  if (steps.length === 0) {
    return { steps: [], warning: NO_EXECUTABLE_STEPS_WARNING };
  }

  const parsedSteps = planStepsSchema.safeParse(steps);
  if (!parsedSteps.success) {
    throw new Error(`Invalid plan steps: ${parsedSteps.error.message}`);
  }

  return { steps: parsedSteps.data };
}

function extractExecutionStepsSection(markdown: string): string | null {
  const startMatch = EXECUTION_SECTION_HEADER.exec(markdown);
  if (!startMatch) {
    return null;
  }

  const startIndex = startMatch.index + startMatch[0].length;
  const rest = markdown.slice(startIndex);
  const nextHeaderMatch = NEXT_SECTION_HEADER.exec(rest);
  const endIndex = nextHeaderMatch ? startIndex + nextHeaderMatch.index : markdown.length;
  return markdown.slice(startIndex, endIndex);
}

function parseMode(
  input: string,
  stepNumber: number,
): {
  mode: "SEQUENTIAL" | "PARALLEL";
  afterSteps: number[];
} {
  const normalized = input.trim();

  const exact = /^(SEQUENTIAL|PARALLEL)$/i.exec(normalized);
  if (exact) {
    const mode = String(exact[1] ?? "").toUpperCase() as "SEQUENTIAL" | "PARALLEL";
    return { mode, afterSteps: [] };
  }

  const depMatch = /^(SEQUENTIAL|PARALLEL)\s*:\s*after\s+step(?:s)?\s+(.+)$/i.exec(normalized);
  if (depMatch) {
    const mode = String(depMatch[1] ?? "").toUpperCase() as "SEQUENTIAL" | "PARALLEL";
    const list = String(depMatch[2] ?? "").trim();

    const listIsValid = /^\d+(?:(?:\s*,\s*|\s+and\s+|\s*&\s*|\s+)\d+)*$/i.test(list);
    if (!listIsValid) {
      throw new Error(`Step ${stepNumber} ${mode} mode has invalid dependency list: ${list}`);
    }

    const nums = list.match(/\d+/g)?.map((n) => parseInt(n, 10)) ?? [];
    if (nums.length === 0) {
      throw new Error(`Step ${stepNumber} ${mode} mode requires dependency list after ':'`);
    }

    if (nums.some((n) => !Number.isFinite(n) || n <= 0)) {
      throw new Error(
        `Step ${stepNumber} ${mode} mode has non-positive dependency number: ${list}`,
      );
    }
    const unique = Array.from(new Set(nums));
    return { mode, afterSteps: unique };
  }

  if (/^(SEQUENTIAL|PARALLEL)\b/i.test(normalized)) {
    throw new Error(`Invalid execution mode syntax for step ${stepNumber}: ${input}`);
  }

  throw new Error(`Unknown execution mode for step ${stepNumber}: ${input}`);
}

function parseRequiredFields(
  lines: string[],
  stepNumber: number,
): {
  objective: string;
  scope: string;
  expectedOutput: string;
  successCriteria: string;
} {
  const contentByKey = new Map<FieldKey, string[]>();
  let current: FieldKey | null = null;

  const commitLine = (line: string) => {
    if (!current) {
      return;
    }
    const arr = contentByKey.get(current) ?? [];
    arr.push(line);
    contentByKey.set(current, arr);
  };

  for (const raw of lines) {
    const line = raw ?? "";
    const match = FIELD_LABEL_LINE.exec(line);
    if (match) {
      const key = String(match[1] ?? "").toUpperCase() as FieldKey;
      current = key;
      const remainder = String(match[2] ?? "").trim();
      if (remainder) {
        commitLine(remainder);
      }
      continue;
    }

    commitLine(line);
  }

  const get = (key: FieldKey) => {
    const value = (contentByKey.get(key) ?? []).join("\n").trim();
    return value;
  };

  const objective = get("OBJECTIVE");
  const scope = get("SCOPE");
  const expectedOutput = get("EXPECTED OUTPUT");
  const successCriteria = get("SUCCESS CRITERIA");

  const missing: string[] = [];
  if (!objective) missing.push("OBJECTIVE");
  if (!scope) missing.push("SCOPE");
  if (!expectedOutput) missing.push("EXPECTED OUTPUT");
  if (!successCriteria) missing.push("SUCCESS CRITERIA");

  if (missing.length > 0) {
    throw new Error(`Step ${stepNumber} missing required fields: ${missing.join(", ")}`);
  }

  return { objective, scope, expectedOutput, successCriteria };
}

export const __internal = {
  NO_EXECUTABLE_STEPS_WARNING,
};

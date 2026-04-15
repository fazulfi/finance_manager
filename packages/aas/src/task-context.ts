import type {
  BuildTaskContextOptions,
  RetryMetadata,
  Task,
  TaskContextSnapshot,
  TaskExecutionStatus,
} from "./types.js";

const DEFAULT_RETRY_CEILING = 2;

const TRANSITIONS: Record<TaskExecutionStatus, TaskExecutionStatus[]> = {
  pending: ["running", "cancelled"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: ["pending"],
  cancelled: [],
};

export function buildTaskContext(
  task: Task,
  options: BuildTaskContextOptions = {},
): TaskContextSnapshot {
  const previous = options.previous;
  const retryCeiling = normalizeRetryCeiling(options.retryCeiling);

  const retryInput: {
    previous?: RetryMetadata;
    retryCeiling: number;
    previousError?: string;
  } = { retryCeiling };

  if (previous?.retry) {
    retryInput.previous = previous.retry;
  }

  if (typeof options.previousError === "string") {
    retryInput.previousError = options.previousError;
  }

  const retry = createRetryMetadata(retryInput);

  return {
    requestSummary: task.context.requestSummary,
    currentState: {
      ...task.context.currentState,
      ...(previous?.currentState ?? {}),
    },
    previousWork: previous?.previousWork || task.context.previousWork,
    filesToCreate: uniqueList(task.context.filesToCreate, previous?.filesToCreate),
    filesToModify: uniqueList(task.context.filesToModify, previous?.filesToModify),
    retry,
    gateResults: previous?.gateResults ? [...previous.gateResults] : [],
    status: previous?.status ?? "pending",
  };
}

export function withTaskStatus(
  context: TaskContextSnapshot,
  nextStatus: TaskExecutionStatus,
): TaskContextSnapshot {
  if (!canTransition(context.status, nextStatus)) {
    throw new Error(`Invalid orchestration transition: ${context.status} -> ${nextStatus}`);
  }

  return {
    ...context,
    status: nextStatus,
  };
}

export function canTransition(from: TaskExecutionStatus, to: TaskExecutionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

function createRetryMetadata(input: {
  previous?: RetryMetadata;
  retryCeiling: number;
  previousError?: string;
}): RetryMetadata {
  const base = input.previous;
  const previousAttempt = Number.isInteger(base?.attempt) ? Math.max(base?.attempt ?? 0, 0) : 0;
  const attempt = Math.min(previousAttempt + 1, input.retryCeiling);
  const maxAttempts = input.retryCeiling;

  const retry: RetryMetadata = {
    attempt,
    maxAttempts,
    canRetry: attempt < maxAttempts,
    lastAttemptAt: new Date().toISOString(),
  };

  const lastError = input.previousError ?? base?.lastError;
  if (typeof lastError === "string") {
    retry.lastError = lastError;
  }

  return retry;
}

function uniqueList(primary: string[], secondary?: string[]): string[] {
  const items = [...primary, ...(secondary ?? [])];
  return Array.from(new Set(items));
}

function normalizeRetryCeiling(value?: number): number {
  if (!Number.isInteger(value) || !value || value < 1) {
    return DEFAULT_RETRY_CEILING;
  }

  return value;
}

export class CancellationError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = "CancellationError";
    this.reason = reason;
  }
}

export interface CancellationToken {
  readonly signal: AbortSignal;
  throwIfCancelled(): void;
}

export function createCancellationToken(input?: {
  parent?: AbortSignal;
  timeoutMs?: number;
  reason?: string;
}): { token: CancellationToken; controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();
  const reason = input?.reason ?? "Cancelled";

  let timeout: NodeJS.Timeout | undefined;
  let parentHandler: (() => void) | undefined;

  const cleanup = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }

    if (input?.parent && parentHandler) {
      input.parent.removeEventListener("abort", parentHandler);
      parentHandler = undefined;
    }
  };

  if (input?.parent) {
    if (input.parent.aborted) {
      controller.abort(input.parent.reason ?? reason);
    } else {
      parentHandler = () => {
        controller.abort(input.parent?.reason ?? reason);
      };
      input.parent.addEventListener("abort", parentHandler, { once: true });
    }
  }

  if (
    typeof input?.timeoutMs === "number" &&
    Number.isFinite(input.timeoutMs) &&
    input.timeoutMs > 0
  ) {
    timeout = setTimeout(() => {
      controller.abort(reason);
    }, Math.trunc(input.timeoutMs));
  }

  const token: CancellationToken = {
    signal: controller.signal,
    throwIfCancelled() {
      if (controller.signal.aborted) {
        throw new CancellationError(String(controller.signal.reason ?? reason));
      }
    },
  };

  return { token, controller, cleanup };
}

export function isCancellationError(error: unknown): error is CancellationError {
  return (
    error instanceof CancellationError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: unknown }).name === "CancellationError")
  );
}

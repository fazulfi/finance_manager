import type { Task } from "./types.js";

const DEFAULT_MAX_QUEUED = 500;
const DEFAULT_AGING_MS_PER_PRIORITY = 30_000;

type QueueItem = {
  task: Task;
  enqueuedAtMs: number;
  seq: number;
  basePriority: number;
};

export class TaskQueue {
  private readonly maxQueued: number;
  private readonly agingMsPerPriority: number;
  private readonly now: () => number;

  private seq: number = 0;
  private closed: boolean = false;
  private readonly items: QueueItem[] = [];
  private readonly ids: Set<string> = new Set();
  private readonly waiters: Array<() => void> = [];

  constructor(input?: { maxQueued?: number; agingMsPerPriority?: number; now?: () => number }) {
    this.maxQueued =
      typeof input?.maxQueued === "number" && Number.isFinite(input.maxQueued)
        ? Math.max(1, Math.trunc(input.maxQueued))
        : DEFAULT_MAX_QUEUED;
    this.agingMsPerPriority =
      typeof input?.agingMsPerPriority === "number" && Number.isFinite(input.agingMsPerPriority)
        ? Math.max(1, Math.trunc(input.agingMsPerPriority))
        : DEFAULT_AGING_MS_PER_PRIORITY;
    this.now = input?.now ?? (() => Date.now());
  }

  get size(): number {
    return this.items.length;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  close(): void {
    this.closed = true;
    this.notifyWaiters();
  }

  enqueue(task: Task): void {
    if (this.closed) {
      throw new Error("Cannot enqueue: queue is closed");
    }
    if (this.items.length >= this.maxQueued) {
      throw new Error(`Queue capacity exceeded (${this.items.length} >= ${this.maxQueued})`);
    }
    if (this.ids.has(task.id)) {
      throw new Error(`Duplicate task enqueue: ${task.id}`);
    }

    const item: QueueItem = {
      task,
      enqueuedAtMs: this.now(),
      seq: this.seq++,
      basePriority: normalizePriority(task.priority),
    };
    this.items.push(item);
    this.ids.add(task.id);
    this.notifyWaiters();
  }

  dequeue(nowMs?: number): Task | null {
    const effectiveNow = typeof nowMs === "number" ? Math.trunc(nowMs) : this.now();
    if (this.items.length === 0) {
      return null;
    }

    let bestIndex = 0;
    let best = this.items[0];
    if (!best) {
      return null;
    }

    let bestScore = effectivePriority(best, effectiveNow, this.agingMsPerPriority);

    for (let i = 1; i < this.items.length; i += 1) {
      const candidate = this.items[i];
      if (!candidate) {
        continue;
      }
      const score = effectivePriority(candidate, effectiveNow, this.agingMsPerPriority);
      if (score > bestScore) {
        bestIndex = i;
        best = candidate;
        bestScore = score;
        continue;
      }

      if (score === bestScore) {
        if (candidate.enqueuedAtMs < best.enqueuedAtMs) {
          bestIndex = i;
          best = candidate;
          continue;
        }
        if (candidate.enqueuedAtMs === best.enqueuedAtMs && candidate.seq < best.seq) {
          bestIndex = i;
          best = candidate;
        }
      }
    }

    this.items.splice(bestIndex, 1);
    this.ids.delete(best.task.id);
    return best.task;
  }

  async waitForItem(signal?: AbortSignal): Promise<void> {
    if (this.items.length > 0 || this.closed) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        cleanup();
        reject(new Error(String(signal?.reason ?? "Aborted")));
      };

      const waiter = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        const idx = this.waiters.indexOf(waiter);
        if (idx >= 0) {
          this.waiters.splice(idx, 1);
        }
        signal?.removeEventListener("abort", onAbort);
      };

      if (signal?.aborted) {
        onAbort();
        return;
      }

      signal?.addEventListener("abort", onAbort, { once: true });
      this.waiters.push(waiter);
    });
  }

  getStats(): { queued: number; maxQueued: number; agingMsPerPriority: number; closed: boolean } {
    return {
      queued: this.items.length,
      maxQueued: this.maxQueued,
      agingMsPerPriority: this.agingMsPerPriority,
      closed: this.closed,
    };
  }

  private notifyWaiters(): void {
    if (this.waiters.length === 0) {
      return;
    }
    const waiters = this.waiters.splice(0, this.waiters.length);
    for (const resolve of waiters) {
      resolve();
    }
  }
}

function normalizePriority(priority: unknown): number {
  if (typeof priority !== "number" || !Number.isFinite(priority)) {
    return 0;
  }
  return Math.max(-1000, Math.min(1000, Math.trunc(priority)));
}

function effectivePriority(item: QueueItem, nowMs: number, agingMsPerPriority: number): number {
  const waitedMs = Math.max(0, nowMs - item.enqueuedAtMs);
  const agingBoost = Math.floor(waitedMs / agingMsPerPriority);
  return item.basePriority + agingBoost;
}

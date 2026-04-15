import type { Task, TaskExecutionStatus } from "./types.js";

export class DagScheduler {
  private readonly tasksById: Map<string, Task>;
  private readonly dependents: Map<string, Set<string>>;
  private readonly remainingDeps: Map<string, number>;
  private readonly blockedByFailedDep: Set<string>;
  private readonly status: Map<string, TaskExecutionStatus>;

  constructor(tasks: Task[]) {
    this.tasksById = new Map(tasks.map((t) => [t.id, t] as const));
    this.dependents = new Map();
    this.remainingDeps = new Map();
    this.blockedByFailedDep = new Set();
    this.status = new Map();

    for (const task of tasks) {
      if (this.remainingDeps.has(task.id)) {
        throw new Error(`Duplicate task id in DAG: ${task.id}`);
      }
      const deps = normalizeDependsOn(task.dependsOn);
      this.remainingDeps.set(task.id, deps.length);
      this.status.set(task.id, "pending");

      for (const depId of deps) {
        if (!this.tasksById.has(depId)) {
          throw new Error(`Task ${task.id} depends on unknown task: ${depId}`);
        }
        const set = this.dependents.get(depId) ?? new Set<string>();
        set.add(task.id);
        this.dependents.set(depId, set);
      }
    }

    this.assertAcyclic();
  }

  getTask(taskId: string): Task | undefined {
    return this.tasksById.get(taskId);
  }

  getAllTaskIds(): string[] {
    return Array.from(this.tasksById.keys()).sort();
  }

  getStatus(taskId: string): TaskExecutionStatus | undefined {
    return this.status.get(taskId);
  }

  getReadyTaskIds(): string[] {
    const ready: string[] = [];
    for (const [taskId, count] of this.remainingDeps.entries()) {
      const st = this.status.get(taskId);
      if (st !== "pending") {
        continue;
      }
      if (this.blockedByFailedDep.has(taskId)) {
        continue;
      }
      if (count === 0) {
        ready.push(taskId);
      }
    }
    return ready.sort();
  }

  markRunning(taskId: string): void {
    this.assertKnown(taskId);
    const current = this.status.get(taskId);
    if (current !== "pending") {
      throw new Error(`Invalid scheduler transition: ${taskId} ${current} -> running`);
    }
    this.status.set(taskId, "running");
  }

  markCompleted(taskId: string): void {
    this.assertKnown(taskId);
    this.status.set(taskId, "completed");
    this.releaseDependents(taskId);
  }

  markFailed(taskId: string): string[] {
    this.assertKnown(taskId);
    this.status.set(taskId, "failed");
    return this.cancelDependents(taskId);
  }

  markCancelled(taskId: string): string[] {
    this.assertKnown(taskId);
    this.status.set(taskId, "cancelled");
    return this.cancelDependents(taskId);
  }

  cancelPendingDueToDependency(taskId: string): string[] {
    this.assertKnown(taskId);
    const cancelled: string[] = [];
    if (this.status.get(taskId) === "pending") {
      this.status.set(taskId, "cancelled");
      cancelled.push(taskId);
    }

    for (const dependent of this.dependents.get(taskId) ?? []) {
      cancelled.push(...this.cancelPendingDueToDependency(dependent));
    }

    return Array.from(new Set(cancelled)).sort();
  }

  allTerminal(): boolean {
    for (const st of this.status.values()) {
      if (st === "pending" || st === "running") {
        return false;
      }
    }
    return true;
  }

  private releaseDependents(taskId: string): void {
    const deps = this.dependents.get(taskId);
    if (!deps) {
      return;
    }
    for (const dependent of deps) {
      const current = this.remainingDeps.get(dependent);
      if (current === undefined) {
        continue;
      }
      this.remainingDeps.set(dependent, Math.max(0, current - 1));
    }
  }

  private cancelDependents(taskId: string): string[] {
    const dependents = this.dependents.get(taskId);
    if (!dependents) {
      return [];
    }

    const cancelled: string[] = [];
    for (const dependent of dependents) {
      this.blockedByFailedDep.add(dependent);
      const current = this.status.get(dependent);
      if (current === "pending") {
        this.status.set(dependent, "cancelled");
        cancelled.push(dependent);
      }

      // propagate regardless of current status; pending-only cancellation prevents overwriting terminal states
      cancelled.push(...this.cancelDependents(dependent));
    }

    return Array.from(new Set(cancelled)).sort();
  }

  private assertKnown(taskId: string): void {
    if (!this.tasksById.has(taskId)) {
      throw new Error(`Unknown task id: ${taskId}`);
    }
  }

  private assertAcyclic(): void {
    const inDegree = new Map<string, number>();
    const ids = this.getAllTaskIds();
    for (const id of ids) {
      inDegree.set(id, this.remainingDeps.get(id) ?? 0);
    }

    const queue = ids.filter((id) => (inDegree.get(id) ?? 0) === 0).sort();
    const processed: string[] = [];
    const dependents = this.dependents;

    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        break;
      }
      processed.push(next);

      for (const dep of dependents.get(next) ?? []) {
        const current = inDegree.get(dep) ?? 0;
        const updated = current - 1;
        inDegree.set(dep, updated);
        if (updated === 0) {
          queue.push(dep);
          queue.sort();
        }
      }
    }

    if (processed.length !== ids.length) {
      const remaining = ids.filter((id) => !processed.includes(id));
      throw new Error(`DAG cycle detected involving tasks: ${remaining.join(", ")}`);
    }
  }
}

function normalizeDependsOn(dependsOn?: string[]): string[] {
  if (!Array.isArray(dependsOn)) {
    return [];
  }
  const items = dependsOn.filter((d): d is string => typeof d === "string" && d.length > 0);
  return Array.from(new Set(items));
}

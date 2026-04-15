import pino from "pino";

import type { AgentResult, Task, TaskQueueEntry } from "./types.js";

const agentLogger = pino({});

// Set log level from environment variable
if (process.env.AAS_LOG_LEVEL) {
  agentLogger.level = process.env.AAS_LOG_LEVEL;
}

/**
 * Default maximum concurrent agents from environment
 */
const DEFAULT_MAX_CONCURRENT_AGENTS = 2;

/**
 * Minimal Agent interface for error result
 */
interface MinimalAgent {
  id: string;
  name: string;
  mode: "primary" | "subagent";
  thinking: "low" | "medium" | "high";
  permission: {
    read: string[];
    list: boolean;
    glob: boolean;
    grep: boolean;
    lsp: boolean;
    edit: boolean;
    bash: boolean;
    webfetch: boolean;
    task: Record<string, "allow" | "deny">;
  };
}

/**
 * Get max concurrent agents from environment variable
 * @returns Maximum number of concurrent agents
 */
function getMaxConcurrentAgents(): number {
  const envValue = process.env.AAS_MAX_CONCURRENT_AGENTS;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_MAX_CONCURRENT_AGENTS;
}

/**
 * TaskQueue - FIFO queue with concurrency control for task execution
 * Ensures fair scheduling while respecting concurrency limits
 */
export class TaskQueue {
  private _queue: Task[] = [];
  private _running: Map<string, TaskQueueEntry> = new Map();
  private _completed: TaskQueueEntry[] = [];
  private _failed: TaskQueueEntry[] = [];
  private _maxConcurrent: number = getMaxConcurrentAgents();
  private _queuePromise: Promise<void> | null = null;
  private _queueResolve: (() => void) | null = null;
  private _processorRunning: boolean = false;
  private _lock: Promise<void> | null = null;

  /**
   * Get the maximum number of concurrent agents
   */
  get maxConcurrent(): number {
    return this._maxConcurrent;
  }

  /**
   * Set the maximum number of concurrent agents
   */
  set maxConcurrent(value: number) {
    if (value > 0) {
      this._maxConcurrent = value;
      agentLogger.info({ maxConcurrent: value }, "Max concurrent agents updated");
      this._notifyCompletion();
    }
  }

  /**
   * Get all running tasks
   */
  get running(): TaskQueueEntry[] {
    return Array.from(this._running.values());
  }

  /**
   * Get all completed tasks
   */
  get completed(): TaskQueueEntry[] {
    return [...this._completed];
  }

  /**
   * Get all failed tasks
   */
  get failed(): TaskQueueEntry[] {
    return [...this._failed];
  }

  /**
   * Get the total number of tasks in queue
   */
  get queueLength(): number {
    return this._queue.length;
  }

  /**
   * Get the number of running tasks
   */
  get runningCount(): number {
    return this._running.size;
  }

  /**
   * Get the number of completed tasks
   */
  get completedCount(): number {
    return this._completed.length;
  }

  /**
   * Get the number of failed tasks
   */
  get failedCount(): number {
    return this._failed.length;
  }

  /**
   * Enqueue a task
   * @param task - Task to enqueue
   */
  enqueue(task: Task): void {
    this._queue.push(task);
    agentLogger.info(
      { taskId: task.id, step: task.step, subagent: task.subagent },
      "Task enqueued",
    );

    // Notify processor if not already running
    if (!this._processorRunning) {
      this._processorRunning = true;
      setImmediate(() => this._processQueue());
    }
  }

  /**
   * Dequeue next task (FIFO, respects maxConcurrentAgents)
   * @returns Next task or null if queue is empty or at concurrency limit
   */
  dequeue(): Task | null {
    // Wait for lock to acquire
    if (this._lock) {
      this._lock = this._lock.then(() => {});
    }

    // Lock the queue
    this._lock = new Promise((resolve) => {
      resolve();
    });

    try {
      // Check if we can dequeue (queue not empty AND running count < maxConcurrent)
      if (this._queue.length === 0 || this._running.size >= this._maxConcurrent) {
        return null;
      }

      // Remove and return first task (FIFO)
      const task = this._queue.shift();
      if (!task) {
        return null;
      }

      // Create task queue entry
      const entry: TaskQueueEntry = {
        id: task.id,
        task,
        status: "running",
        startTime: new Date(),
      };

      // Add to running map
      this._running.set(task.id, entry);

      agentLogger.info(
        { taskId: task.id, step: task.step, subagent: task.subagent, running: this._running.size },
        "Task dequeued and started",
      );

      return task;
    } finally {
      // Release lock
      this._lock = null;
    }
  }

  /**
   * Mark task as complete
   * @param taskId - Task ID
   * @param result - Agent result
   */
  complete(taskId: string, result: AgentResult): void {
    const entry = this._running.get(taskId);
    if (!entry) {
      agentLogger.warn({ taskId }, "Task completion attempted for unknown task");
      return;
    }

    // Update entry with result
    entry.status = "completed";
    entry.endTime = new Date();
    entry.result = result;

    // Remove from running and add to completed
    this._running.delete(taskId);
    this._completed.push(entry);

    agentLogger.info(
      { taskId, step: entry.task.step, subagent: entry.task.subagent },
      "Task completed",
    );

    // Notify processor to continue
    this._notifyCompletion();
  }

  /**
   * Mark task as failed
   * @param taskId - Task ID
   * @param error - Error that caused failure
   */
  fail(taskId: string, error: Error): void {
    const entry = this._running.get(taskId);
    if (!entry) {
      agentLogger.warn({ taskId }, "Task failure attempted for unknown task");
      return;
    }

    // Update entry with error
    entry.status = "failed";
    entry.endTime = new Date();
    entry.result = {
      agent: entry.task.subagent
        ? {
            id: entry.task.subagent,
            name: entry.task.subagent,
            mode: "subagent",
            thinking: "low",
            permission: {
              read: [],
              list: false,
              glob: false,
              grep: false,
              lsp: false,
              edit: false,
              bash: false,
              webfetch: false,
              task: {},
            },
          }
        : (entry.task.context.currentState.agent as unknown as MinimalAgent),
      success: false,
      output: error.message,
      errors: [error.message],
    };

    // Remove from running and add to failed
    this._running.delete(taskId);
    this._failed.push(entry);

    agentLogger.error(
      { taskId, step: entry.task.step, subagent: entry.task.subagent, error },
      "Task failed",
    );

    // Notify processor to continue
    this._notifyCompletion();
  }

  /**
   * Wait for all queued tasks to complete
   * @returns Promise that resolves when all tasks are done
   */
  async awaitAll(): Promise<void> {
    if (this._queuePromise) {
      return this._queuePromise;
    }

    const promise = new Promise<void>((resolve) => {
      this._queueResolve = resolve;
    });

    this._queuePromise = promise;

    return promise;
  }

  /**
   * Process queue - runs in background to execute tasks
   * @private
   */
  private async _processQueue(): Promise<void> {
    // Continue processing until queue is empty and nothing running
    while (this._queue.length > 0 || this._running.size > 0) {
      // Check if we can dequeue a task
      const task = this.dequeue();

      if (task) {
        // This would be where we'd actually execute the task
        // For now, we just simulate completion for testing
        // In production, this would call an executor function
        await this._simulateTaskExecution(task);
      } else {
        // No task available - wait a bit then check again
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this._processorRunning = false;

    // Resolve awaitAll if we have a resolver
    if (this._queueResolve) {
      const resolve = this._queueResolve;
      this._queueResolve = null;
      this._queuePromise = null;
      resolve();
    }
  }

  /**
   * Notify completion callback
   * @private
   */
  private _notifyCompletion(): void {
    if (this._queueResolve && this._queue.length === 0 && this._running.size === 0) {
      const resolve = this._queueResolve;
      this._queueResolve = null;
      this._queuePromise = null;
      resolve();
    }
  }

  /**
   * Simulate task execution (for testing/demo purposes)
   * In production, this would be replaced with actual task execution
   * @param task - Task to execute
   * @private
   */
  private async _simulateTaskExecution(task: Task): Promise<void> {
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate success
    this.complete(task.id, {
      agent: {
        id: task.subagent,
        name: task.subagent,
        mode: "subagent" as const,
        thinking: "low" as const,
        permission: {
          read: [],
          list: false,
          glob: false,
          grep: false,
          lsp: false,
          edit: false,
          bash: false,
          webfetch: false,
          task: {},
        },
      },
      success: true,
      output: "Task completed successfully",
    });
  }

  /**
   * Get statistics about queue state
   * @returns Object with queue statistics
   */
  getStats() {
    return {
      total: this._completed.length + this._failed.length + this._running.size + this._queue.length,
      queued: this._queue.length,
      running: this._running.size,
      completed: this._completed.length,
      failed: this._failed.length,
      maxConcurrent: this._maxConcurrent,
    };
  }
}

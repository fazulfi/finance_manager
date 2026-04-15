import pino from "pino";

import { TaskQueue } from "./task-queue.js";
import type { AgentResult, Task } from "./types.js";

// Create logger instance
const logger = pino({ name: "ParallelExecutionEngine" });

/**
 * Default maximum concurrency from environment
 */
const DEFAULT_MAX_CONCURRENT = 5;

/**
 * Get max concurrency from environment variable
 * @returns Maximum number of concurrent tasks
 */
function getMaxConcurrency(): number {
  const envValue = process.env.AAS_MAX_CONCURRENT;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_MAX_CONCURRENT;
}

/**
 * ParallelExecutionEngine
 * Executes multiple tasks in parallel with concurrency control
 */
export class ParallelExecutionEngine {
  private _maxConcurrent: number = getMaxConcurrency();

  /**
   * Get the maximum number of concurrent tasks
   */
  get maxConcurrent(): number {
    return this._maxConcurrent;
  }

  /**
   * Set the maximum number of concurrent tasks
   */
  set maxConcurrent(value: number) {
    if (value > 0) {
      this._maxConcurrent = value;
      logger.info({ maxConcurrent: value }, "Max concurrent tasks updated");
    }
  }

  /**
   * Execute multiple tasks in parallel with concurrency limit
   * @param tasks - Tasks to execute
   * @param concurrencyLimit - Maximum number of concurrent tasks (1-10)
   * @returns Promise resolving to array of AgentResult in original order
   */
  async executeParallel(tasks: Task[], concurrencyLimit: number): Promise<AgentResult[]> {
    // Validate concurrencyLimit
    if (!Number.isInteger(concurrencyLimit) || concurrencyLimit < 1 || concurrencyLimit > 10) {
      logger.warn({ concurrencyLimit }, "Invalid concurrencyLimit, using default");
      concurrencyLimit = Math.min(Math.max(concurrencyLimit, 1), 10);
    }

    if (tasks.length === 0) {
      logger.info("No tasks to execute");
      return [];
    }

    logger.info({ totalTasks: tasks.length, concurrencyLimit }, "Starting parallel execution");

    // Create task queue
    const queue = new TaskQueue();

    // Execute tasks in parallel
    for (let i = 0; i < tasks.length; i += concurrencyLimit) {
      const batch = tasks.slice(i, i + concurrencyLimit);

      // Enqueue all tasks in the batch
      batch.forEach((task) => {
        queue.enqueue(task);
      });

      // Process queue until batch is complete
      await this._processBatch(queue, batch);
    }

    // Wait for all remaining tasks to complete
    await queue.awaitAll();

    logger.info(
      { completed: queue.completedCount, total: tasks.length },
      "Parallel execution completed",
    );

    // Return completed results in original order
    const completedEntries = queue.completed;
    return tasks
      .map((task) => {
        const entry = completedEntries.find((e) => e.id === task.id);
        return entry?.result;
      })
      .filter((result): result is AgentResult => result !== undefined);
  }

  /**
   * Execute multiple tasks in parallel with progress callback
   * @param tasks - Tasks to execute
   * @param concurrencyLimit - Maximum number of concurrent tasks (1-10)
   * @param callback - Progress callback (progress: number, total: number)
   * @returns Promise resolving to array of AgentResult in original order
   */
  async executeParallelWithCallback(
    tasks: Task[],
    concurrencyLimit: number,
    callback: (progress: number, total: number) => void,
  ): Promise<AgentResult[]> {
    // Validate concurrencyLimit
    if (!Number.isInteger(concurrencyLimit) || concurrencyLimit < 1 || concurrencyLimit > 10) {
      logger.warn({ concurrencyLimit }, "Invalid concurrencyLimit, using default");
      concurrencyLimit = Math.min(Math.max(concurrencyLimit, 1), 10);
    }

    if (tasks.length === 0) {
      logger.info("No tasks to execute");
      callback(0, 0);
      return [];
    }

    logger.info(
      { totalTasks: tasks.length, concurrencyLimit },
      "Starting parallel execution with callback",
    );

    // Create task queue
    const queue = new TaskQueue();

    // Execute tasks in parallel
    for (let i = 0; i < tasks.length; i += concurrencyLimit) {
      const batch = tasks.slice(i, i + concurrencyLimit);

      // Enqueue all tasks in the batch
      batch.forEach((task) => {
        queue.enqueue(task);
      });

      // Process queue until batch is complete and emit progress
      await this._processBatchWithCallback(queue, batch);
    }

    // Wait for all remaining tasks to complete
    await queue.awaitAll();

    // Final progress update
    callback(queue.completedCount, tasks.length);

    logger.info(
      { completed: queue.completedCount, total: tasks.length },
      "Parallel execution with callback completed",
    );

    // Return completed results in original order
    const completedEntries = queue.completed;
    return tasks
      .map((task) => {
        const entry = completedEntries.find((e) => e.id === task.id);
        return entry?.result;
      })
      .filter((result): result is AgentResult => result !== undefined);
  }

  /**
   * Process a batch of tasks
   * @private
   */
  private async _processBatch(queue: TaskQueue, batch: Task[]): Promise<void> {
    const batchSet = new Set(batch.map((t) => t.id));

    // Process queue until batch is complete
    while (batchSet.size > 0) {
      // Process as many tasks as possible (up to batch size)
      while (queue.runningCount > 0 && queue.runningCount <= batch.length) {
        // Process queue in background
        await this._processQueueBackground(queue);
      }

      // Wait for one task to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if batch is complete
      const runningIds = new Set(queue.running.map((entry) => entry.id));
      let stillRunning = 0;

      for (const id of batchSet) {
        if (runningIds.has(id)) {
          stillRunning++;
        }
      }

      if (stillRunning === 0) {
        // All tasks in batch completed
        break;
      }
    }
  }

  /**
   * Process a batch of tasks with progress callback
   * @private
   */
  private async _processBatchWithCallback(queue: TaskQueue, batch: Task[]): Promise<void> {
    const batchSet = new Set(batch.map((t) => t.id));

    // Process queue until batch is complete
    while (batchSet.size > 0) {
      // Process as many tasks as possible (up to batch size)
      while (queue.runningCount > 0 && queue.runningCount <= batch.length) {
        // Process queue in background
        await this._processQueueBackground(queue);
      }

      // Wait for one task to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if batch is complete
      const runningIds = new Set(queue.running.map((entry) => entry.id));
      let stillRunning = 0;

      for (const id of batchSet) {
        if (runningIds.has(id)) {
          stillRunning++;
        }
      }

      if (stillRunning === 0) {
        // All tasks in batch completed
        break;
      }
    }
  }

  /**
   * Process queue in background
   * @private
   */
  private async _processQueueBackground(queue: TaskQueue): Promise<void> {
    // Get next task to process
    const task = queue.dequeue();
    if (task) {
      // Execute task (would call executor in production)
      await this._executeTask(queue, task);
    }
  }

  /**
   * Execute a single task (placeholder for actual execution)
   * In production, this would call an executor function
   * @private
   */
  private async _executeTask(queue: TaskQueue, task: Task): Promise<void> {
    // Simulate task execution
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate success (would be real execution in production)
    const result: AgentResult = {
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
      output: `Task ${task.id} completed successfully`,
    };

    // Complete task in queue
    queue.complete(task.id, result);
  }

  /**
   * Get statistics about engine state
   * @returns Object with engine statistics
   */
  getStats() {
    return {
      maxConcurrent: this._maxConcurrent,
    };
  }
}

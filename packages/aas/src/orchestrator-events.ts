export type OrchestratorEvent =
  | {
      type: "run_started";
      runId: string;
      timestamp: string;
      concurrency: number;
    }
  | {
      type: "run_resumed";
      runId: string;
      timestamp: string;
      checkpointPath: string;
    }
  | {
      type: "run_cancelled";
      runId: string;
      timestamp: string;
      reason: string;
    }
  | {
      type: "run_completed";
      runId: string;
      timestamp: string;
      status: "completed" | "failed" | "cancelled";
      counts: {
        completed: number;
        failed: number;
        cancelled: number;
      };
    }
  | {
      type: "task_queued";
      runId: string;
      timestamp: string;
      taskId: string;
      dependsOnCount: number;
      priority: number;
    }
  | {
      type: "task_started";
      runId: string;
      timestamp: string;
      taskId: string;
      attempt: number;
      timeoutMs: number;
    }
  | {
      type: "task_finished";
      runId: string;
      timestamp: string;
      taskId: string;
      status: "completed" | "failed" | "cancelled";
      durationMs: number;
    }
  | {
      type: "checkpoint_written";
      runId: string;
      timestamp: string;
      path: string;
      bytesWritten: number;
    };

export type OrchestratorEventSink = (event: OrchestratorEvent) => void;

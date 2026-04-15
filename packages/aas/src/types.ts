/**
 * Core TypeScript interfaces for the Autonomous Agent System (AAS)
 */

import type { OrchestratorEventSink } from "./orchestrator-events.js";

export type TaskExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type QualityGateStage = "sanity" | "reviewer" | "tester" | "security";

export type QualityGateDecision = "pass" | "fail" | "skip";

/**
 * Agent Mode - Determines how the agent operates
 */
export type AgentMode = "primary" | "subagent";

/**
 * Thinking Level - Controls cognitive resource allocation
 */
export type ThinkingLevel = "low" | "medium" | "high";

/**
 * Agent Configuration
 * Defines the capabilities and permissions of an autonomous agent
 */
export interface Agent {
  id: string;
  name: string;
  mode: AgentMode;
  thinking: ThinkingLevel;
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
 * Process Execution Request
 * Parameters for executing an agent process
 */
export interface Process {
  agent: Agent;
  args: string[];
  env: Record<string, string>;
  timeout: number;
}

/**
 * Task Definition
 * Represents a discrete task to be executed by an agent
 */
export interface Task {
  id: string;
  step: string;
  subagent: string;
  brief: string;
  dependsOn?: string[];
  priority?: number;
  timeoutMs?: number;
  context: {
    requestSummary: string;
    currentState: Record<string, unknown>;
    previousWork: string;
    filesToCreate: string[];
    filesToModify: string[];
    orchestration?: {
      retry?: RetryMetadata;
      status?: TaskExecutionStatus;
      gateResults?: QualityGateResult[];
      lastUpdatedAt?: string;
    };
  };
}

export interface RetryMetadata {
  attempt: number;
  maxAttempts: number;
  canRetry: boolean;
  lastError?: string;
  lastAttemptAt?: string;
}

export interface QualityGateResult {
  stage: QualityGateStage;
  decision: QualityGateDecision;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface QualityGateHookContext {
  task: Task;
  stage: QualityGateStage;
  attempt: number;
}

export type QualityGateHook = (
  context: QualityGateHookContext,
) => Promise<QualityGateResult> | QualityGateResult;

export type QualityGateHooks = Partial<Record<QualityGateStage, QualityGateHook>>;

export interface TaskExecutionState {
  taskId: string;
  status: TaskExecutionStatus;
  retry: RetryMetadata;
  gateResults: QualityGateResult[];
  startTime?: Date;
  endTime?: Date;
  result?: AgentResult;
}

export interface PlanPersistenceResult {
  path: string;
  bytesWritten: number;
  persistedAt: string;
}

export interface OrchestratorHooks {
  qualityGates?: QualityGateHooks;
}

export interface OrchestratorOptions {
  retryCeiling?: number;
  planFilePath?: string;
  hooks?: OrchestratorHooks;
  agentScriptPath?: string;
}

export interface TaskContextSnapshot {
  requestSummary: string;
  currentState: Record<string, unknown>;
  previousWork: string;
  filesToCreate: string[];
  filesToModify: string[];
  retry: RetryMetadata;
  gateResults: QualityGateResult[];
  status: TaskExecutionStatus;
}

export interface BuildTaskContextOptions {
  retryCeiling?: number;
  previous?: TaskContextSnapshot;
  previousError?: string;
}

/**
 * Agent Execution Result
 * Response from agent execution
 */
export interface AgentResult {
  agent: Agent;
  success: boolean;
  output: string;
  errors?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Task Queue Entry
 * Tracks a task in execution queue
 */
export interface TaskQueueEntry {
  id: string;
  task: Task;
  status: TaskExecutionStatus;
  startTime?: Date;
  endTime?: Date;
  result?: AgentResult;
}

/**
 * AAS Configuration
 * Runtime configuration for the Autonomous Agent System
 */
export interface AASConfig {
  logLevel: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  enablePrettyLogging: boolean;
  maxConcurrentAgents: number;
  defaultAgentTimeout: number;
  runDir?: string;
  outputDir?: string;
  logDir?: string;
  agentRegistry: Record<string, Agent>;
}

export interface OrchestratorTaskCheckpoint {
  taskId: string;
  status: TaskExecutionStatus;
  retry: RetryMetadata;
  gateResults: QualityGateResult[];
  startTime?: string;
  endTime?: string;
  result?: {
    success: boolean;
    outputBytes?: number;
    outputPreview?: string;
    errors?: string[];
  };
}

export interface OrchestratorRunCheckpoint {
  version: 1;
  runId: string;
  createdAt: string;
  updatedAt: string;
  tasks: Record<string, OrchestratorTaskCheckpoint>;
}

export interface OrchestratorRunOptions {
  runId?: string;
  runDir?: string;
  resume?: boolean;
  resumeFromPath?: string;
  concurrency?: number;
  runTimeoutMs?: number;
  defaultTaskTimeoutMs?: number;
  checkpointIntervalMs?: number;
  eventSink?: OrchestratorEventSink;
}

/**
 * Load AAS configuration from file
 * @param filePath - Path to config file (default: .env.aas)
 * @returns Promise resolving to AAS configuration
 */
export async function loadAASConfig(filePath: string): Promise<AASConfig> {
  const dotenv = await import("dotenv");
  await dotenv.config({ path: filePath });

  const maxConcurrentAgents = parseInt(process.env.AAS_MAX_CONCURRENT_AGENTS || "2", 10);
  const defaultAgentTimeout = parseInt(process.env.AAS_DEFAULT_AGENT_TIMEOUT || "30000", 10);

  const config: AASConfig = {
    logLevel: (process.env.AAS_LOG_LEVEL as AASConfig["logLevel"]) || "info",
    enablePrettyLogging: (process.env.AAS_PRETTY_LOGGING ?? "true").toLowerCase() === "true",
    maxConcurrentAgents:
      Number.isFinite(maxConcurrentAgents) && maxConcurrentAgents > 0 ? maxConcurrentAgents : 2,
    defaultAgentTimeout:
      Number.isFinite(defaultAgentTimeout) && defaultAgentTimeout > 0 ? defaultAgentTimeout : 30000,
    agentRegistry: {},
  };

  if (process.env.AAS_RUN_DIR) {
    config.runDir = process.env.AAS_RUN_DIR;
  }

  if (process.env.AAS_OUTPUT_DIR) {
    config.outputDir = process.env.AAS_OUTPUT_DIR;
  }

  if (process.env.AAS_LOG_DIR) {
    config.logDir = process.env.AAS_LOG_DIR;
  }

  return config;
}

/**
 * Core TypeScript interfaces for the Autonomous Agent System (AAS)
 */

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
  context: {
    requestSummary: string;
    currentState: Record<string, unknown>;
    previousWork: string;
    filesToCreate: string[];
    filesToModify: string[];
  };
}

/**
 * Agent Execution Result
 * Response from agent execution
 */
export interface AgentResult {
  agent: Agent;
  success: boolean;
  output: string;
  errors?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Task Queue Entry
 * Tracks a task in execution queue
 */
export interface TaskQueueEntry {
  id: string;
  task: Task;
  status: "pending" | "running" | "completed" | "failed";
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
  agentRegistry: Record<string, Agent>;
}

/**
 * Load AAS configuration from file
 * @param filePath - Path to config file (default: .env.aas)
 * @returns Promise resolving to AAS configuration
 */
export async function loadAASConfig(filePath: string): Promise<AASConfig> {
  const dotenv = await import("dotenv");
  await dotenv.config({ path: filePath });

  return {
    logLevel: (process.env.AAS_LOG_LEVEL as AASConfig["logLevel"]) || "info",
    enablePrettyLogging: true,
    maxConcurrentAgents: parseInt(process.env.AAS_MAX_CONCURRENT_AGENTS || "2", 10),
    defaultAgentTimeout: 30000,
    agentRegistry: {},
  };
}

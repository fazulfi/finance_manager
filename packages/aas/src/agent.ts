#!/usr/bin/env node

/**
 * Autonomous Agent Process
 *
 * This is the entry point for individual agent processes spawned by the AAS.
 * Agents receive tasks via stdin, execute them, and send results back via stdout.
 */

import pino from "pino";

import type { Agent } from "./types.js";

const logger = pino({
  level: process.env.AAS_LOG_LEVEL || "info",
  name: `agent-${process.env.AGENT_ID || "unknown"}`,
});

// Get agent configuration from environment
const agentId = process.env.AGENT_ID || "unknown";
const agentName = process.env.AGENT_NAME || "Unknown Agent";

logger.info({ agentId, agentName }, "Agent process started");

// Parse mode and thinking from environment
const mode: "primary" | "subagent" =
  process.env.AGENT_MODE === "primary" || process.env.AGENT_MODE === "subagent"
    ? process.env.AGENT_MODE
    : "subagent";

const thinking: "low" | "medium" | "high" =
  process.env.AGENT_THINKING === "low" ||
  process.env.AGENT_THINKING === "medium" ||
  process.env.AGENT_THINKING === "high"
    ? process.env.AGENT_THINKING
    : "low";

// Message type definitions
interface AgentMessage {
  type: string;
  payload: unknown;
}

interface Task {
  id: string;
  step: string;
  subagent: string;
  brief: string;
  context: Record<string, unknown>;
}

interface AgentResult {
  agent: Agent;
  success: boolean;
  output: string;
  errors?: string[];
  metadata?: Record<string, unknown>;
}

// Handle incoming messages
process.stdin.resume();

process.stdin.on("data", async (data: Buffer) => {
  try {
    const messageStr = data.toString().trim();
    if (!messageStr) {
      return;
    }

    const message: AgentMessage = JSON.parse(messageStr);

    logger.info({ type: message.type }, "Received message from client");

    // Handle different message types
    if (message.type === "task") {
      await handleMessage(message.payload as Task);
    } else if (message.type === "ping") {
      await sendMessage({
        type: "pong",
        payload: { status: "ok", agentId, agentName, mode, thinking },
      });
    } else {
      logger.warn({ type: message.type }, "Unknown message type, ignoring");
    }
  } catch (error) {
    logger.error({ error }, "Error processing message");
  }
});

// Handle a task
async function handleMessage(task: Task): Promise<void> {
  try {
    logger.info({ taskId: task.id, step: task.step, brief: task.brief }, "Task received");

    // Simulate agent execution
    const result: AgentResult = {
      agent: {
        id: agentId,
        name: agentName,
        mode,
        thinking,
        permission: {
          read: JSON.parse(process.env.AGENT_PERMISSION_READ || "[]"),
          list: process.env.AGENT_PERMISSION_LIST === "true",
          glob: process.env.AGENT_PERMISSION_GLOB === "true",
          grep: process.env.AGENT_PERMISSION_GREP === "true",
          lsp: process.env.AGENT_PERMISSION_LSP === "true",
          edit: process.env.AGENT_PERMISSION_EDIT === "true",
          bash: process.env.AGENT_PERMISSION_BASH === "true",
          webfetch: process.env.AGENT_PERMISSION_WEBFETCH === "true",
          task: JSON.parse(process.env.AGENT_PERMISSION_TASK || "{}"),
        },
      },
      success: true,
      output: `[Agent ${agentName}] Executed task: ${task.brief}\n\nContext:\n- Step: ${task.step}\n- Context: ${JSON.stringify(task.context, null, 2)}\n\nTask completed successfully.\n`,
      metadata: {
        taskId: task.id,
        timestamp: new Date().toISOString(),
        step: task.step,
      },
    };

    logger.info({ taskId: task.id }, "Task completed");

    // Send success result
    await sendMessage({
      type: "complete",
      payload: result,
    });
  } catch (error) {
    logger.error({ error }, "Task execution failed");

    const result: AgentResult = {
      agent: {
        id: agentId,
        name: agentName,
        mode,
        thinking,
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
      success: false,
      output: "",
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };

    await sendMessage({
      type: "error",
      payload: result,
    });
  }
}

// Send a message to the client
function sendMessage(message: AgentMessage): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const messageStr = JSON.stringify(message) + "\n";
      process.stdout.write(messageStr);
      logger.debug({ type: message.type }, "Message sent to client");
      resolve();
    } catch (error) {
      logger.error({ error }, "Failed to send message");
      reject(error);
    }
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Agent received SIGINT, shutting down");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Agent received SIGTERM, shutting down");
  process.exit(0);
});

logger.info("Agent ready to receive tasks");

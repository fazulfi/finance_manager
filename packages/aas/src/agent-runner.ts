import { AgentClient, agentLogger } from "./agent-client.js";
import type { AgentMessage } from "./agent-client.js";
import type { Agent } from "./types.js";

/**
 * AgentRunner - Manages the lifecycle of agent processes
 * Handles process spawning, waiting for completion, and collecting output
 */
export class AgentRunner {
  /**
   * Run a process and return an AgentClient instance
   * @param agent - The agent configuration
   * @param scriptPath - Path to the agent script
   * @returns Promise resolving to AgentClient instance
   */
  static async runProcess(agent: Agent, scriptPath: string): Promise<AgentClient> {
    agentLogger.info({ agentId: agent.id, name: agent.name }, "Starting agent process");

    try {
      const client = await AgentClient.spawnAgent(agent, scriptPath);
      agentLogger.info({ agentId: agent.id }, "Agent process spawned successfully");
      return client;
    } catch (error) {
      agentLogger.error({ agentId: agent.id, error }, "Failed to spawn agent process");
      throw error;
    }
  }

  /**
   * Wait for process to complete
   * @param client - AgentClient instance
   * @param timeoutMs - Timeout in milliseconds
   * @returns Promise resolving to true if completed, false if timeout
   */
  static async waitForCompletion(client: AgentClient, timeoutMs: number): Promise<boolean> {
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        agentLogger.error(
          { agentId: client.AgentId, timeout: timeoutMs },
          `Agent process timeout after ${timeoutMs}ms`,
        );
        resolve(false);
      }, timeoutMs);
    });

    // Listen for 'complete' or 'error' messages
    try {
      const result = await Promise.race([
        client.waitForMessage("complete"),
        client.waitForMessage("error"),
        timeoutPromise,
      ]);

      // Handle different result types
      if (result === true) {
        // Timeout occurred
        return false;
      }

      if (result && typeof result === "object" && "type" in result) {
        // Check if it's not a timeout error message
        const isTimeoutError =
          result.type === "error" &&
          result.payload !== null &&
          typeof result.payload === "object" &&
          "message" in result.payload &&
          result.payload.message === "Timeout waiting for any message";

        if (!isTimeoutError) {
          agentLogger.info(
            { agentId: client.AgentId, type: result.type },
            "Agent process completed",
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      agentLogger.error({ agentId: client.AgentId, error }, "Failed to wait for agent completion");
      return false;
    }
  }

  /**
   * Get accumulated stdout and stderr output from the agent
   * @param client - AgentClient instance
   * @returns Combined output string
   */
  static getOutput(client: AgentClient): string {
    return client.messageBuffer;
  }

  /**
   * Get the latest terminal message from parsed agent output
   */
  static getTerminalMessage(client: AgentClient): AgentMessage | undefined {
    return client.getLatestMessage(["complete", "error"]);
  }
}

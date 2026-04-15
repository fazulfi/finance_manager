import { spawn } from "child_process";
import { realpath } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import pino from "pino";

import type { Agent } from "./types.js";

/**
 * Message format for agent communication
 */
export interface AgentMessage {
  type: string;
  payload: unknown;
}

/**
 * Internal logger instance
 */
export const agentLogger = pino({});

const MAX_STDOUT_BUFFER_BYTES = 1024 * 1024;
const MAX_STDERR_BUFFER_BYTES = 256 * 1024;
const MAX_MESSAGE_BUFFER_BYTES = 1024 * 1024;
const MAX_STORED_MESSAGES = 1000;
const MAX_LINE_LENGTH_BYTES = 64 * 1024;

const ALLOWED_SCRIPT_EXTENSIONS = new Set([".js", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".tsx"]);
const ALLOWED_PARENT_ENV_KEYS = ["PATH", "HOME", "TMPDIR", "TEMP", "TMP", "NODE_ENV"] as const;
const AAS_PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT_DIR = path.resolve(AAS_PACKAGE_DIR, "..", "..");

// Set log level from environment variable
if (process.env.AAS_LOG_LEVEL) {
  agentLogger.level = process.env.AAS_LOG_LEVEL;
}

/**
 * AgentClient - Manages communication with an autonomous agent process
 * Handles stdin/stdout communication using typed message passing
 */
export class AgentClient {
  private _agentId: string = "";
  private _process: ReturnType<typeof spawn> | null = null;
  private _stdin: NodeJS.WriteStream | null = null;
  private _stdout: NodeJS.ReadableStream | null = null;
  private _stderr: NodeJS.ReadableStream | null = null;
  private _messageBuffer: string = "";
  private _receivedMessages: AgentMessage[] = [];
  private _messageResolve: ((value: AgentMessage | null) => void) | null = null;
  private _messageResolverMap: Map<string, (value: AgentMessage) => void> = new Map();
  private _terminated: boolean = false;
  private _stdoutBytes: number = 0;
  private _stderrBytes: number = 0;

  /**
   * Get the agent ID
   */
  get AgentId(): string {
    return this._agentId;
  }

  /**
   * Get accumulated message buffer (output from agent)
   */
  get messageBuffer(): string {
    return this._messageBuffer;
  }

  /**
   * Get parsed messages received from agent
   */
  get receivedMessages(): AgentMessage[] {
    return [...this._receivedMessages];
  }

  /**
   * Constructor
   */
  private constructor(agentId: string) {
    this._agentId = agentId;
  }

  /**
   * Spawn an agent process
   * @param agent - The agent configuration
   * @param scriptPath - Path to the agent script
   * @returns Promise resolving to AgentClient instance
   */
  static async spawnAgent(agent: Agent, scriptPath: string): Promise<AgentClient> {
    const client = new AgentClient(agent.id);

    agentLogger.info({ agentId: agent.id, name: agent.name }, "Spawning agent process");

    const resolvedScriptPath = await AgentClient._resolveAndValidateScriptPath(scriptPath);
    const env = AgentClient._buildAgentEnv(agent);

    const stdio: Parameters<typeof spawn>[2]["stdio"] = ["pipe", "pipe", "pipe"];
    const options: Parameters<typeof spawn>[2] = {
      stdio,
      env,
    };

    const isTypeScriptSource =
      resolvedScriptPath.endsWith(".ts") ||
      resolvedScriptPath.endsWith(".tsx") ||
      resolvedScriptPath.endsWith(".cts") ||
      resolvedScriptPath.endsWith(".mts");
    const command = process.execPath;
    const args = isTypeScriptSource
      ? ["--import", "tsx", resolvedScriptPath]
      : [resolvedScriptPath];

    client._process = spawn(command, args, options);

    client._stdin = (client._process?.stdin as NodeJS.WriteStream) || null;
    client._stdout = (client._process?.stdout as NodeJS.ReadableStream) || null;
    client._stderr = (client._process?.stderr as NodeJS.ReadableStream) || null;

    if (!client._stdin || !client._stdout || !client._stderr) {
      throw new Error("Failed to initialize agent streams");
    }

    // Handle stdout data
    client._stdout.on("data", (data: Buffer) => {
      if (client._terminated) {
        return;
      }

      client._stdoutBytes += data.byteLength;
      if (client._stdoutBytes > MAX_STDOUT_BUFFER_BYTES) {
        client._terminateDueToLimit(
          `STDOUT_BUFFER_LIMIT_EXCEEDED: received ${client._stdoutBytes} bytes (max ${MAX_STDOUT_BUFFER_BYTES})`,
        );
        return;
      }

      const messageStr = data.toString();
      const availableBytes = MAX_MESSAGE_BUFFER_BYTES - Buffer.byteLength(client._messageBuffer);
      if (availableBytes <= 0) {
        client._terminateDueToLimit(
          `MESSAGE_BUFFER_LIMIT_EXCEEDED: received ${client._stdoutBytes} bytes (max ${MAX_MESSAGE_BUFFER_BYTES})`,
        );
        return;
      }

      const chunkBytes = Buffer.byteLength(messageStr);
      if (chunkBytes > availableBytes) {
        const truncatedChunk = Buffer.from(messageStr).subarray(0, availableBytes).toString();
        client._messageBuffer += truncatedChunk;
        client._terminateDueToLimit(
          `MESSAGE_BUFFER_LIMIT_EXCEEDED: truncated chunk to ${availableBytes} bytes (max ${MAX_MESSAGE_BUFFER_BYTES})`,
        );
        return;
      }

      client._messageBuffer += messageStr;
      client._parseBufferedMessages();
    });

    // Handle stderr errors
    client._stderr.on("data", (data: Buffer) => {
      if (client._terminated) {
        return;
      }

      client._stderrBytes += data.byteLength;
      if (client._stderrBytes > MAX_STDERR_BUFFER_BYTES) {
        client._terminateDueToLimit(
          `STDERR_BUFFER_LIMIT_EXCEEDED: received ${client._stderrBytes} bytes (max ${MAX_STDERR_BUFFER_BYTES})`,
        );
        return;
      }

      const error = data.toString().trim();
      agentLogger.error({ agentId: client._agentId, error }, "Agent stderr");
    });

    // Handle process errors
    if (client._process) {
      client._process.on("error", () => {
        agentLogger.error({ agentId: client._agentId }, "Agent process error");
        client._handleProcessError();
      });

      // Handle process exit
      client._process.on("exit", (code, signal) => {
        agentLogger.info({ agentId: client._agentId, code, signal }, "Agent process exited");
        if (code !== 0 && !client._terminated) {
          agentLogger.error(
            { agentId: client._agentId, code, signal },
            "Agent process exited with non-zero code",
          );
        }
      });
    }

    return client;
  }

  /**
   * Send a message to the agent
   * @param message - The message to send
   */
  async sendMessage(message: AgentMessage): Promise<void> {
    if (!this._stdin || this._terminated) {
      throw new Error("Cannot send message: agent not spawned or terminated");
    }

    try {
      const messageStr = JSON.stringify(message) + "\n";
      this._stdin.write(messageStr);
      agentLogger.debug({ agentId: this._agentId, type: message.type }, "Sent message to agent");
    } catch (error) {
      agentLogger.error({ agentId: this._agentId, error }, "Failed to send message to agent");
      throw new Error(
        `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Receive a message from the agent (non-blocking)
   * @returns The received message or null if no message is available
   */
  async receiveMessage(): Promise<AgentMessage | undefined> {
    const buffer = this._parseBufferedMessages();
    return buffer.length > 0 ? buffer[0] : undefined;
  }

  /**
   * Wait for a specific message type (blocking)
   * @param expectedType - Expected message type (optional, waits for any message if not provided)
   * @returns The received message
   */
  async waitForMessage(expectedType?: string): Promise<AgentMessage> {
    return new Promise((resolve, reject) => {
      if (this._terminated) {
        reject(new Error("Cannot wait for message: agent not spawned or terminated"));
        return;
      }

      if (expectedType) {
        this._messageResolverMap.set(expectedType, (message: AgentMessage) => {
          resolve(message);
        });
        agentLogger.debug(
          { agentId: this._agentId, expectedType },
          "Waiting for specific message type",
        );
      } else {
        const resolver = (message: AgentMessage) => {
          resolve(message);
        };
        this._messageResolverMap.set("any", resolver);
        agentLogger.debug({ agentId: this._agentId }, "Waiting for any message");
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        this._rejectPendingResolvers(reject, expectedType);
      }, 30000);
    });
  }

  /**
   * Kill the agent process
   */
  async kill(): Promise<void> {
    if (this._terminated) {
      return;
    }

    this._terminated = true;
    agentLogger.info({ agentId: this._agentId }, "Killing agent process");

    if (this._process) {
      try {
        this._process.kill("SIGTERM");
      } catch (error) {
        agentLogger.error({ agentId: this._agentId, error }, "Failed to kill agent process");
      }
    }

    if (this._stdin) {
      this._stdin.destroy();
    }

    if (this._stdout) {
      (this._stdout as NodeJS.ReadableStream & { destroy(): void }).destroy();
    }

    if (this._stderr) {
      (this._stderr as NodeJS.ReadableStream & { destroy(): void }).destroy();
    }
  }

  /**
   * Parse buffered messages into individual messages
   * @returns Array of parsed messages
   */
  private _parseBufferedMessages(): AgentMessage[] {
    const messages: AgentMessage[] = [];

    // Split buffer by newlines
    const messageParts = this._messageBuffer.split("\n");
    this._messageBuffer = messageParts.pop() || "";

    for (const part of messageParts) {
      if (part.trim()) {
        if (Buffer.byteLength(part) > MAX_LINE_LENGTH_BYTES) {
          this._terminateDueToLimit(
            `MESSAGE_LINE_LIMIT_EXCEEDED: line length ${Buffer.byteLength(part)} bytes (max ${MAX_LINE_LENGTH_BYTES})`,
          );
          break;
        }

        try {
          if (this._receivedMessages.length >= MAX_STORED_MESSAGES) {
            this._terminateDueToLimit(
              `PARSED_MESSAGE_LIMIT_EXCEEDED: received ${this._receivedMessages.length + 1} messages (max ${MAX_STORED_MESSAGES})`,
            );
            break;
          }

          const message: AgentMessage = JSON.parse(part);
          this._receivedMessages.push(message);
          messages.push(message);
          this._resolvePendingResolvers(message);
        } catch (error) {
          agentLogger.error(
            { agentId: this._agentId, error, part },
            "Failed to parse message from agent",
          );
        }
      }
    }

    return messages;
  }

  /**
   * Resolve pending resolvers with the received message
   */
  private _resolvePendingResolvers(message: AgentMessage): void {
    const resolvers: Array<(value: AgentMessage) => void> = [];

    // Find all resolvers for this message type
    if (message.type) {
      const typeResolvers = this._messageResolverMap.get(message.type);
      if (typeResolvers) {
        resolvers.push(typeResolvers);
      }
    }

    // Find any resolvers (for "any" type)
    const anyResolvers = this._messageResolverMap.get("any");
    if (anyResolvers) {
      resolvers.push(anyResolvers);
    }

    // Resolve all matching resolvers
    (resolvers as Array<(value: AgentMessage) => void>).forEach((resolver) => {
      resolver(message);
    });
  }

  /**
   * Reject all pending resolvers
   */
  private _rejectPendingResolvers(reject: (error: Error) => void, expectedType?: string): void {
    const entries = Array.from(this._messageResolverMap.entries());
    for (const [type, resolver] of entries) {
      if (!expectedType || type === expectedType) {
        resolver({ type: "error", payload: { message: "Timeout waiting for message" } });
      }
    }
    this._messageResolverMap.clear();
    reject(new Error(`Timeout waiting for ${expectedType || "any"} message`));
  }

  /**
   * Handle process errors
   */
  private _handleProcessError(): void {
    this._messageResolve?.(null);
    this._messageResolve = null;
    this._messageResolverMap.clear();
  }

  private _terminateDueToLimit(reason: string): void {
    if (this._terminated) {
      return;
    }

    const errorMessage: AgentMessage = {
      type: "error",
      payload: {
        message: reason,
      },
    };

    agentLogger.error(
      { agentId: this._agentId, reason },
      "Agent process terminated due to safety cap",
    );
    this._receivedMessages.push(errorMessage);
    this._resolvePendingResolvers(errorMessage);
    void this.kill();
  }

  private static _buildAgentEnv(agent: Agent): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {};

    for (const key of ALLOWED_PARENT_ENV_KEYS) {
      const value = process.env[key];
      if (typeof value === "string" && value.length > 0) {
        env[key] = value;
      }
    }

    env.AGENT_ID = agent.id;
    env.AGENT_NAME = agent.name;
    env.AGENT_MODE = agent.mode;
    env.AGENT_THINKING = agent.thinking;
    env.AGENT_PERMISSION_READ = JSON.stringify(agent.permission.read);
    env.AGENT_PERMISSION_LIST = String(agent.permission.list);
    env.AGENT_PERMISSION_GLOB = String(agent.permission.glob);
    env.AGENT_PERMISSION_GREP = String(agent.permission.grep);
    env.AGENT_PERMISSION_LSP = String(agent.permission.lsp);
    env.AGENT_PERMISSION_EDIT = String(agent.permission.edit);
    env.AGENT_PERMISSION_BASH = String(agent.permission.bash);
    env.AGENT_PERMISSION_WEBFETCH = String(agent.permission.webfetch);
    env.AGENT_PERMISSION_TASK = JSON.stringify(agent.permission.task);

    return env;
  }

  private static async _resolveAndValidateScriptPath(scriptPath: string): Promise<string> {
    if (!scriptPath || scriptPath.trim().length === 0) {
      throw new Error("Agent script path is required");
    }

    if (scriptPath.trim().startsWith("-")) {
      throw new Error("Agent script path cannot start with '-'");
    }

    const resolvedPath = path.resolve(scriptPath);
    let canonicalScriptPath = resolvedPath;

    try {
      canonicalScriptPath = await realpath(resolvedPath);
    } catch (error) {
      const isMissingPath =
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT";
      if (!isMissingPath) {
        throw error;
      }
    }
    const extension = path.extname(canonicalScriptPath).toLowerCase();

    if (!ALLOWED_SCRIPT_EXTENSIONS.has(extension)) {
      throw new Error(`Unsupported agent script extension: ${extension}`);
    }

    const allowedBases = [AAS_PACKAGE_DIR, path.resolve(REPO_ROOT_DIR, "bin")].map((base) =>
      path.normalize(base + path.sep),
    );
    const normalizedScriptPath = path.normalize(canonicalScriptPath);
    const isAllowedPath = allowedBases.some((base) => normalizedScriptPath.startsWith(base));

    if (!isAllowedPath) {
      throw new Error(`Agent script path is outside allowed directories: ${canonicalScriptPath}`);
    }

    return canonicalScriptPath;
  }

  /**
   * Get latest parsed message, optionally filtered by type
   */
  getLatestMessage(types?: string | string[]): AgentMessage | undefined {
    if (this._receivedMessages.length === 0) {
      return undefined;
    }

    if (!types) {
      return this._receivedMessages[this._receivedMessages.length - 1];
    }

    const allowedTypes = Array.isArray(types) ? types : [types];
    for (let i = this._receivedMessages.length - 1; i >= 0; i--) {
      const message = this._receivedMessages[i];
      if (message && allowedTypes.includes(message.type)) {
        return message;
      }
    }

    return undefined;
  }
}

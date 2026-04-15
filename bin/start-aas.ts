#!/usr/bin/env node

/**
 * AAS Server Entry Point
 *
 * This script starts the Autonomous Agent System server and manages
 * agent execution, task queuing, and logging.
 */

import { Command } from "commander";
import pino from "pino";
import pinoPretty from "pino-pretty";
import path from "path";
import { fileURLToPath } from "url";
import { TaskQueue } from "@finance/aas";
import { ParallelExecutionEngine } from "@finance/aas";
import type { Agent, Task, AgentResult, AASConfig } from "@finance/aas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logger
const logger = pino(
  pinoPretty({
    translateTime: "SYS:standard",
    ignore: "pid,hostname",
    colorize: true,
  }),
);

const program = new Command();

program
  .name("start-aas")
  .description("Start the Autonomous Agent System server")
  .version("0.0.1")
  .option("-p, --port <number>", "Port to listen on", "3000")
  .option("--host <string>", "Host to bind to", "0.0.0.0")
  .option("--log-level <level>", "Logging level (trace, debug, info, warn, error, fatal)", "info")
  .option("--env-file <path>", "Path to environment file", ".env.aas")
  .action(async (options) => {
    logger.info({ options }, "Starting AAS server");

    try {
      // Load environment variables from .env.aas
      const dotenv = await import("dotenv");
      const envPath = path.join(__dirname, options.envFile);
      dotenv.config({ path: envPath });

      logger.info({ port: options.port, host: options.host }, "AAS server configuration");

      // Load AAS configuration
      const config: AASConfig = {
        logLevel: options.logLevel as any,
        enablePrettyLogging: true,
        maxConcurrentAgents: parseInt(process.env.AAS_MAX_CONCURRENT_AGENTS || "2", 10),
        defaultAgentTimeout: 30000,
        agentRegistry: {
          planner: {
            id: "planner",
            name: "Planner",
            mode: "primary",
            thinking: "medium",
            permission: {
              read: ["**/*.{ts,tsx,js,jsx,json,md}"],
              list: true,
              glob: true,
              grep: true,
              lsp: true,
              edit: true,
              bash: true,
              webfetch: true,
              task: {
                "code-review": "allow",
                refactor: "allow",
                "generate-tests": "allow",
              },
            },
          },
          coder: {
            id: "coder",
            name: "Coder",
            mode: "subagent",
            thinking: "high",
            permission: {
              read: ["**/*.{ts,tsx,js,jsx,json,md}"],
              list: true,
              glob: true,
              grep: true,
              lsp: true,
              edit: true,
              bash: true,
              webfetch: false,
              task: {
                "code-generation": "allow",
                "implement-feature": "allow",
              },
            },
          },
          reviewer: {
            id: "reviewer",
            name: "Reviewer",
            mode: "subagent",
            thinking: "low",
            permission: {
              read: ["**/*.{ts,tsx,js,jsx,json,md}"],
              list: true,
              glob: true,
              grep: true,
              lsp: true,
              edit: true,
              bash: false,
              webfetch: false,
              task: {},
            },
          },
        },
      };

      logger.info(
        {
          maxConcurrent: config.maxConcurrentAgents,
          agentCount: Object.keys(config.agentRegistry).length,
        },
        "AAS configuration loaded",
      );

      // Initialize task queue
      const taskQueue = new TaskQueue();
      taskQueue.maxConcurrent = config.maxConcurrentAgents;

      logger.info("Task queue initialized");

      // Initialize parallel execution engine
      const executionEngine = new ParallelExecutionEngine();
      executionEngine.maxConcurrent = config.maxConcurrentAgents;

      logger.info("Parallel execution engine initialized");

      // Simulate starting HTTP server (simplified for now)
      const serverPort = options.port;

      logger.info(`AAS server listening on http://${options.host}:${serverPort}`);
      logger.info("Server ready to accept agent tasks");

      // Process tasks in parallel with progress
      const taskList: Task[] = [
        {
          id: "task-1",
          step: "code-generation",
          subagent: "coder",
          brief: "Generate code implementation",
          context: {
            requestSummary: "Generate code implementation",
            currentState: {},
            previousWork: "",
            filesToCreate: ["packages/api/src/routers/example.ts"],
            filesToModify: [],
          },
        },
        {
          id: "task-2",
          step: "code-review",
          subagent: "reviewer",
          brief: "Review generated code",
          context: {
            requestSummary: "Review generated code",
            currentState: {},
            previousWork: "",
            filesToCreate: [],
            filesToModify: [],
          },
        },
      ];

      logger.info(
        { totalTasks: taskList.length, concurrency: executionEngine.maxConcurrent },
        "Starting parallel execution",
      );

      // Execute tasks with progress callback
      await executionEngine.executeParallelWithCallback(
        taskList,
        executionEngine.maxConcurrent,
        (progress: number, total: number) => {
          logger.info({ progress, total }, "Task execution progress");
          console.log(`\rProgress: ${progress}/${total} tasks completed`);
        },
      );

      console.log("\nAll tasks completed\n");

      // Get completion statistics
      const stats = taskQueue.getStats();
      logger.info(
        {
          queued: stats.queued,
          running: stats.running,
          completed: stats.completed,
          failed: stats.failed,
        },
        "Task execution completed",
      );

      if (stats.failed > 0) {
        logger.warn({ failed: stats.failed }, "Some tasks failed");
      }

      process.exit(0);
    } catch (error) {
      logger.error({ error }, "Failed to start AAS server");
      process.exit(1);
    }
  });

program.parse();

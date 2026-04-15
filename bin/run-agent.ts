#!/usr/bin/env node

/**
 * Agent Execution Entry Point
 *
 * This script executes a single agent task with specific parameters.
 */

import { Command } from "commander";
import { access } from "fs/promises";
import pino from "pino";
import pinoPretty from "pino-pretty";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { AgentClient } from "@finance/aas";
import { AgentRunner } from "@finance/aas";
import type { Agent, Task, AgentResult } from "@finance/aas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: z.enum(["primary", "subagent"]),
  thinking: z.enum(["low", "medium", "high"]),
  permission: z.object({
    read: z.array(z.string()),
    list: z.boolean(),
    glob: z.boolean(),
    grep: z.boolean(),
    lsp: z.boolean(),
    edit: z.boolean(),
    bash: z.boolean(),
    webfetch: z.boolean(),
    task: z.record(z.enum(["allow", "deny"])),
  }),
});

const agentResultSchema: z.ZodType<AgentResult> = z.object({
  agent: agentSchema,
  success: z.boolean(),
  output: z.string(),
  errors: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

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
  .name("run-agent")
  .description("Execute an agent task")
  .version("0.0.1")
  .requiredOption("-a, --agent-id <string>", "Agent ID to execute")
  .requiredOption("-t, --task-id <string>", "Task ID to execute")
  .option("--task-brief <string>", "Brief description of the task")
  .option("--config-file <path>", "Path to AAS config file", ".env.aas")
  .option("--env-file <path>", "Path to environment file", ".env.aas")
  .action(async (options) => {
    logger.info({ options }, "Running agent task");

    try {
      // Load environment variables from .env.aas
      const dotenv = await import("dotenv");
      const envPath = path.join(__dirname, options.envFile);
      dotenv.config({ path: envPath });

      logger.info({ agentId: options.agentId, taskId: options.taskId }, "Executing agent task");

      // Load agent configuration from config file
      const agentConfigPath = path.join(__dirname, options.configFile);
      const { loadAASConfig } = await import("@finance/aas");
      const aasConfig = await loadAASConfig(agentConfigPath);

      const agent: Agent = aasConfig.agentRegistry[options.agentId];
      if (!agent) {
        throw new Error(`Agent not found: ${options.agentId}`);
      }

      // Create task definition
      const task: Task = {
        id: options.taskId,
        step: "single",
        subagent: options.agentId,
        brief: options.taskBrief || "Execute agent task",
        context: {
          requestSummary: options.taskBrief || "Execute agent task",
          currentState: {},
          previousWork: "",
          filesToCreate: [],
          filesToModify: [],
        },
      };

      logger.info({ agentId: agent.id, name: agent.name, task: task.brief }, "Task created");

      // Spawn agent process
      logger.info({ agentId: agent.id }, "Spawning agent process");
      const compiledAgentPath = path.join(__dirname, "../packages/aas/dist/agent.js");
      const sourceAgentPath = path.join(__dirname, "../packages/aas/src/agent.ts");
      let agentScriptPath = sourceAgentPath;

      try {
        await access(compiledAgentPath);
        agentScriptPath = compiledAgentPath;
      } catch {
        // Fallback to TypeScript source, executed via tsx runtime in AgentClient
      }

      const agentClient = await AgentClient.spawnAgent(agent, agentScriptPath);

      logger.info({ agentId: agent.id }, "Agent process spawned, sending task");
      await agentClient.sendMessage({
        type: "task",
        payload: task,
      });

      // Wait for completion (30 second timeout)
      logger.info({ agentId: agent.id, timeout: 30000 }, "Waiting for agent completion");
      const completed = await AgentRunner.waitForCompletion(agentClient, 30000);

      if (!completed) {
        logger.error({ agentId: agent.id }, "Agent timeout");
        await agentClient.kill();
        process.exit(1);
      }

      // Get output
      const output = AgentRunner.getOutput(agentClient);
      const terminalMessage = AgentRunner.getTerminalMessage(agentClient);

      // Parse agent result
      let result: AgentResult;
      if (terminalMessage?.type === "complete" || terminalMessage?.type === "error") {
        const parsedPayload = agentResultSchema.safeParse(terminalMessage.payload);
        if (parsedPayload.success) {
          result = parsedPayload.data;
        } else {
          result = {
            agent,
            success: false,
            output,
            errors: [
              "Invalid terminal agent payload",
              ...parsedPayload.error.issues.map(
                (issue) => `${issue.path.join(".")}: ${issue.message}`,
              ),
            ],
          };
        }
      } else {
        result = {
          agent,
          success: false,
          output,
          errors: ["Failed to read terminal agent payload"],
        };
      }

      // Log result
      if (result.success) {
        logger.info(
          { agentId: agent.id, outputLength: output.length },
          "Agent completed successfully",
        );
      } else {
        logger.error({ agentId: agent.id, errors: result.errors }, "Agent completed with errors");
      }

      // Display result to user
      console.log("\n=== Agent Result ===");
      console.log(`Agent: ${agent.name} (${agent.id})`);
      console.log(`Success: ${result.success ? "Yes" : "No"}`);
      if (result.errors && result.errors.length > 0) {
        console.log("Errors:");
        result.errors.forEach((error) => console.log(`  - ${error}`));
      }
      console.log("\n--- Output ---");
      console.log(output);
      console.log("==================\n");

      process.exit(result.success ? 0 : 1);
    } catch (error) {
      logger.error({ error }, "Agent task failed");
      process.exit(1);
    }
  });

program.parse();

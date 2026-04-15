import { readFile } from "fs/promises";
import path from "path";

import { describe, expect, it } from "vitest";

const ROOT_DIR = path.resolve(process.cwd(), "..", "..");

describe("CLI contracts", () => {
  it("start-aas entrypoint bootstraps orchestrator execution flow", async () => {
    const source = await readFile(path.resolve(ROOT_DIR, "bin/start-aas.ts"), "utf8");

    expect(source).toContain("new AASOrchestrator");
    expect(source).toContain("orchestrator.persistPlan");
    expect(source).toContain("orchestrator.execute([task])");
    expect(source).not.toContain("TaskQueue");
    expect(source).not.toContain("executeParallelWithCallback");
  });

  it("run-agent entrypoint dispatches single task through orchestrator", async () => {
    const source = await readFile(path.resolve(ROOT_DIR, "bin/run-agent.ts"), "utf8");

    expect(source).toContain("new AASOrchestrator");
    expect(source).toContain("orchestrator.executeTask");
    expect(source).toContain("agentResultSchema.safeParse");
    expect(source).not.toContain("AgentClient.spawnAgent");
  });

  it("wrapper scripts delegate to active ts entrypoints", async () => {
    const startWrapper = await readFile(path.resolve(ROOT_DIR, "bin/start-aas"), "utf8");
    const runWrapper = await readFile(path.resolve(ROOT_DIR, "bin/run-agent"), "utf8");

    expect(startWrapper).toContain("--import");
    expect(startWrapper).toContain("start-aas.ts");
    expect(runWrapper).toContain("--import");
    expect(runWrapper).toContain("run-agent.ts");
  });
});

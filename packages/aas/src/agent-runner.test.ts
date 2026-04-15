import { describe, expect, it, vi } from "vitest";

import { AgentClient } from "./agent-client.js";
import { AgentRunner } from "./agent-runner.js";
import type { Agent } from "./types.js";

const createAgent = (): Agent => ({
  id: "agent-1",
  name: "Agent One",
  mode: "primary",
  thinking: "low",
  permission: {
    read: [],
    list: true,
    glob: true,
    grep: true,
    lsp: false,
    edit: false,
    bash: false,
    webfetch: false,
    task: {},
  },
});

describe("AgentRunner", () => {
  it("delegates runProcess to AgentClient.spawnAgent", async () => {
    const client = { AgentId: "agent-1", messageBuffer: "" } as AgentClient;
    const spawnSpy = vi.spyOn(AgentClient, "spawnAgent").mockResolvedValue(client);

    const result = await AgentRunner.runProcess(createAgent(), "./agent.js");

    expect(result).toBe(client);
    expect(spawnSpy).toHaveBeenCalledWith(expect.objectContaining({ id: "agent-1" }), "./agent.js");
  });

  it("returns true when completion message arrives", async () => {
    const client = {
      AgentId: "agent-1",
      waitForMessage: vi.fn(async (type?: string) => {
        if (type === "complete") {
          return { type: "complete", payload: {} };
        }
        return new Promise(() => {
          // keep pending
        });
      }),
      messageBuffer: "output",
    } as unknown as AgentClient;

    await expect(AgentRunner.waitForCompletion(client, 50)).resolves.toBe(true);
    expect(AgentRunner.getOutput(client)).toBe("output");
  });
});

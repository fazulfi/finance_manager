import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentClient } from "./agent-client.js";
import type { Agent } from "./types.js";

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
}));

vi.mock("child_process", () => ({
  spawn: spawnMock,
}));

class MockWritable extends EventEmitter {
  write = vi.fn();
  destroy = vi.fn();
}

class MockReadable extends EventEmitter {
  destroy = vi.fn();
}

const createAgent = (): Agent => ({
  id: "agent-1",
  name: "Agent One",
  mode: "primary",
  thinking: "medium",
  permission: {
    read: ["/tmp"],
    list: true,
    glob: true,
    grep: true,
    lsp: true,
    edit: true,
    bash: true,
    webfetch: false,
    task: {},
  },
});

describe("AgentClient", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("spawns client and writes newline-delimited JSON messages", async () => {
    const stdin = new MockWritable();
    const stdout = new MockReadable();
    const stderr = new MockReadable();
    const proc = new EventEmitter() as EventEmitter & {
      stdin: MockWritable;
      stdout: MockReadable;
      stderr: MockReadable;
      kill: ReturnType<typeof vi.fn>;
    };
    proc.stdin = stdin;
    proc.stdout = stdout;
    proc.stderr = stderr;
    proc.kill = vi.fn();

    spawnMock.mockReturnValue(proc);

    const client = await AgentClient.spawnAgent(createAgent(), "./agent-script.js");
    await client.sendMessage({ type: "ping", payload: { ok: true } });

    expect(client.AgentId).toBe("agent-1");
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [command, args, options] = spawnMock.mock.calls[0] as [
      string,
      string[],
      { stdio: string[] },
    ];
    expect(command).toBe(process.execPath);
    expect(args).toHaveLength(1);
    expect(args[0]?.endsWith("agent-script.js")).toBe(true);
    expect(options).toEqual(expect.objectContaining({ stdio: ["pipe", "pipe", "pipe"] }));
    expect(stdin.write).toHaveBeenCalledWith('{"type":"ping","payload":{"ok":true}}\n');
  });

  it("waits for a specific message type from stdout", async () => {
    const stdin = new MockWritable();
    const stdout = new MockReadable();
    const stderr = new MockReadable();
    const proc = new EventEmitter() as EventEmitter & {
      stdin: MockWritable;
      stdout: MockReadable;
      stderr: MockReadable;
      kill: ReturnType<typeof vi.fn>;
    };
    proc.stdin = stdin;
    proc.stdout = stdout;
    proc.stderr = stderr;
    proc.kill = vi.fn();

    spawnMock.mockReturnValue(proc);

    const client = await AgentClient.spawnAgent(createAgent(), "./agent-script.js");
    const pending = client.waitForMessage("complete");

    stdout.emit("data", Buffer.from('{"type":"complete","payload":{"status":"done"}}\n'));

    await expect(pending).resolves.toEqual({
      type: "complete",
      payload: { status: "done" },
    });
  });
});

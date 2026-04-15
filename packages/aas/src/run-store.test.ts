import { mkdir, rm, symlink } from "fs/promises";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import { RunStore } from "./run-store.js";
import type { OrchestratorRunCheckpoint } from "./types.js";

const ROOT_DIR = path.resolve(process.cwd());
const TEST_DIR = path.join(ROOT_DIR, "packages", "aas", ".tmp-run-store-tests");
const OUTSIDE_DIR = path.resolve(ROOT_DIR, "..", ".tmp-run-store-outside");

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await rm(OUTSIDE_DIR, { recursive: true, force: true });
});

function checkpoint(runId: string): OrchestratorRunCheckpoint {
  return {
    version: 1,
    runId,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    tasks: {
      t1: {
        taskId: "t1",
        status: "completed",
        retry: { attempt: 1, maxAttempts: 2, canRetry: true },
        gateResults: [],
        startTime: new Date(0).toISOString(),
        endTime: new Date(0).toISOString(),
        result: {
          success: true,
          outputBytes: 999,
          outputPreview: "ok",
        },
      },
    },
  };
}

describe("RunStore", () => {
  it("writes and reads checkpoint under safe run dir", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    const store = new RunStore({ runId: "run-1", runDir: TEST_DIR });
    const input = checkpoint("run-1");

    const writeResult = await store.writeCheckpoint(input);
    expect(writeResult.path).toContain(path.join("run-1", "checkpoint.json"));

    const loaded = await store.readCheckpoint();
    expect(loaded?.runId).toBe("run-1");
    expect(loaded?.tasks.t1?.result?.outputPreview).toBe("ok");
  });

  it("rejects run dir outside repo root", () => {
    expect(() => new RunStore({ runId: "run-2", runDir: path.resolve(ROOT_DIR, "..") })).toThrow(
      /invalid runDir/i,
    );
  });

  it("rejects path traversal via runId", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    const store = new RunStore({ runId: "..", runDir: TEST_DIR });
    await expect(store.writeCheckpoint(checkpoint(".."))).rejects.toThrow(/invalid run store/i);
  });

  it("rejects run dir symlink/junction that escapes repo root", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    await mkdir(OUTSIDE_DIR, { recursive: true });

    const linkDir = path.join(TEST_DIR, "link");
    try {
      await symlink(OUTSIDE_DIR, linkDir, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EACCES" || code === "ENOTSUP") {
        return;
      }
      throw error;
    }

    const store = new RunStore({ runId: "run-4", runDir: linkDir });
    await expect(store.writeCheckpoint(checkpoint("run-4"))).rejects.toThrow(/invalid runDir/i);
  });

  it("caps checkpoint output preview bytes", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    const store = new RunStore({ runId: "run-3", runDir: TEST_DIR, maxCheckpointBytes: 64 * 1024 });

    const huge = "x".repeat(64 * 1024);
    const input = checkpoint("run-3");
    input.tasks.t1!.result = {
      success: true,
      outputBytes: huge.length,
      outputPreview: huge,
      errors: [huge],
    };

    await store.writeCheckpoint(input);
    const loaded = await store.readCheckpoint();
    expect(loaded?.tasks.t1?.result?.outputPreview?.length).toBeLessThan(huge.length);
    expect(loaded?.tasks.t1?.result?.errors?.[0]?.length).toBeLessThan(huge.length);
  });
});

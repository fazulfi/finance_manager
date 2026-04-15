import { mkdtemp, rm, symlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import { afterEach, describe, expect, it } from "vitest";

import { RunStore } from "./run-store.js";
import type { OrchestratorRunCheckpoint } from "./types.js";

const AAS_PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT_DIR = path.resolve(AAS_PACKAGE_DIR, "..", "..");

const createdDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirs
      .splice(0, createdDirs.length)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function makeRepoTempDir(): Promise<string> {
  const parent = path.join(ROOT_DIR, "packages", "aas");
  const dir = await mkdtemp(path.join(parent, ".tmp-run-store-"));
  createdDirs.push(dir);
  return dir;
}

async function makeOsTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "run-store-"));
  createdDirs.push(dir);
  return dir;
}

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
    const runDir = await makeRepoTempDir();
    const store = new RunStore({ runId: "run-1", runDir });
    const input = checkpoint("run-1");

    const writeResult = await store.writeCheckpoint(input);
    expect(writeResult.path).toContain(path.join("run-1", "checkpoint.json"));

    const loaded = await store.readCheckpoint();
    expect(loaded?.runId).toBe("run-1");
    expect(loaded?.tasks.t1?.result?.outputPreview).toBe("ok");
  });

  it("rejects run dir outside repo root", async () => {
    const outside = await makeOsTempDir();
    const store = new RunStore({ runId: "run-2", runDir: outside });
    await expect(store.readCheckpoint()).rejects.toThrow(/invalid runDir/i);
  });

  it("rejects path traversal via runId", async () => {
    expect(
      () => new RunStore({ runId: "..", runDir: path.join(ROOT_DIR, ".aas", "runs") }),
    ).toThrow(/invalid runId/i);
  });

  it("rejects runIds containing path separators", () => {
    const bad = ["../x", "..\\x", "a/b", "a\\b"];
    for (const runId of bad) {
      expect(() => new RunStore({ runId, runDir: path.join(ROOT_DIR, ".aas", "runs") })).toThrow(
        /invalid runId/i,
      );
    }
  });

  it("rejects run dir symlink/junction that escapes repo root", async () => {
    const runDir = await makeRepoTempDir();
    const outside = await makeOsTempDir();

    const linkDir = path.join(runDir, "link");
    try {
      await symlink(outside, linkDir, process.platform === "win32" ? "junction" : "dir");
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

  it("rejects reading checkpoint outside run dir via junction escape", async () => {
    const runDir = await makeRepoTempDir();
    const outside = await makeOsTempDir();

    const outsideCheckpointPath = path.join(outside, "checkpoint.json");
    await writeFile(outsideCheckpointPath, JSON.stringify(checkpoint("run-5")), "utf8");

    const runLink = path.join(runDir, "run-5");
    try {
      await symlink(outside, runLink, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EACCES" || code === "ENOTSUP") {
        return;
      }
      throw error;
    }

    const store = new RunStore({ runId: "run-5", runDir });
    await expect(store.readCheckpoint()).rejects.toThrow(/invalid run store/i);
  });

  it("caps checkpoint output preview bytes", async () => {
    const runDir = await makeRepoTempDir();
    const store = new RunStore({ runId: "run-3", runDir, maxCheckpointBytes: 64 * 1024 });

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

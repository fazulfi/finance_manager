import { randomBytes } from "crypto";
import { mkdir, open, readFile, rename, stat, unlink, realpath } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import type { OrchestratorRunCheckpoint } from "./types.js";

const AAS_PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT_DIR = path.resolve(AAS_PACKAGE_DIR, "..", "..");
const DEFAULT_RUN_DIR = path.resolve(REPO_ROOT_DIR, ".aas", "runs");

const MAX_CHECKPOINT_BYTES = 256 * 1024;
const MAX_OUTPUT_PREVIEW_BYTES = 8 * 1024;
const MAX_ERROR_ITEMS = 32;
const MAX_ERROR_BYTES = 2 * 1024;

export class RunStore {
  private readonly runId: string;
  private readonly baseDir: string;
  private readonly checkpointPath: string;
  private readonly maxCheckpointBytes: number;

  constructor(input: { runId: string; runDir?: string; maxCheckpointBytes?: number }) {
    this.runId = assertValidRunId(input.runId);

    const configuredRaw = input.runDir ?? process.env.AAS_RUN_DIR ?? process.env.AAS_OUTPUT_DIR;
    const configured = typeof configuredRaw === "string" ? configuredRaw.trim() : "";
    const baseDir = configured
      ? path.resolve(
          path.isAbsolute(configured) ? configured : path.resolve(REPO_ROOT_DIR, configured),
        )
      : DEFAULT_RUN_DIR;

    this.baseDir = baseDir;
    this.checkpointPath = path.join(this.baseDir, this.runId, "checkpoint.json");
    this.maxCheckpointBytes =
      typeof input.maxCheckpointBytes === "number" && Number.isFinite(input.maxCheckpointBytes)
        ? Math.max(1024, Math.trunc(input.maxCheckpointBytes))
        : MAX_CHECKPOINT_BYTES;
  }

  getRunId(): string {
    return this.runId;
  }

  getBaseDir(): string {
    return this.baseDir;
  }

  getCheckpointPath(): string {
    return this.checkpointPath;
  }

  async readCheckpoint(): Promise<OrchestratorRunCheckpoint | null> {
    const safePath = await this.resolveSafePath(this.checkpointPath);
    try {
      const info = await stat(safePath);
      if (!info.isFile()) {
        return null;
      }
      if (info.size > this.maxCheckpointBytes) {
        throw new Error(
          `Checkpoint exceeds maximum size (${info.size} bytes > ${this.maxCheckpointBytes} bytes)`,
        );
      }
      const content = await readFile(safePath, "utf8");
      const parsed = JSON.parse(content) as OrchestratorRunCheckpoint;
      if (!parsed || typeof parsed !== "object" || parsed.runId !== this.runId) {
        return null;
      }
      return parsed;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async writeCheckpoint(
    checkpoint: OrchestratorRunCheckpoint,
  ): Promise<{ path: string; bytesWritten: number }> {
    const safePath = await this.resolveSafePath(this.checkpointPath);

    const sanitized = sanitizeCheckpoint(checkpoint);
    const payload = JSON.stringify(sanitized, null, 2);
    const bytes = Buffer.byteLength(payload, "utf8");
    if (bytes > this.maxCheckpointBytes) {
      throw new Error(
        `Checkpoint exceeds maximum size (${bytes} bytes > ${this.maxCheckpointBytes} bytes)`,
      );
    }

    await mkdir(path.dirname(safePath), { recursive: true });

    const dir = path.dirname(safePath);
    const base = path.basename(safePath);

    let tmpPath: string | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      tmpPath = path.join(dir, `.${base}.${process.pid}.${randomBytes(16).toString("hex")}.tmp`);

      try {
        const handle = await open(tmpPath, "wx", 0o600);
        try {
          await handle.writeFile(payload, { encoding: "utf8" });
          await handle.sync();
        } finally {
          await handle.close();
        }
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EEXIST") {
          tmpPath = undefined;
          continue;
        }
        throw error;
      }
    }

    if (!tmpPath) {
      throw new Error("Failed to create an exclusive temporary checkpoint file");
    }

    try {
      await rename(tmpPath, safePath);
    } catch (error) {
      await unlink(tmpPath).catch(() => undefined);
      throw error;
    }
    return { path: safePath, bytesWritten: bytes };
  }

  private async resolveSafePath(targetPath: string): Promise<string> {
    const repoRootReal = await realpath(REPO_ROOT_DIR);

    // Avoid creating directories through symlink/junction escapes.
    const existingBase = await findNearestExistingDir(this.baseDir);
    const existingBaseReal = await realpath(existingBase);
    const relativeExistingBase = path.relative(repoRootReal, existingBaseReal);
    if (relativeExistingBase.startsWith("..") || path.isAbsolute(relativeExistingBase)) {
      throw new Error(
        `Invalid runDir: ${this.baseDir}. Resolved path escapes repo root ${repoRootReal}`,
      );
    }

    await mkdir(this.baseDir, { recursive: true });
    const baseReal = await realpath(this.baseDir);
    const relativeBase = path.relative(repoRootReal, baseReal);
    if (relativeBase.startsWith("..") || path.isAbsolute(relativeBase)) {
      throw new Error(
        `Invalid runDir: ${this.baseDir}. Resolved path escapes repo root ${repoRootReal}`,
      );
    }

    const parent = path.dirname(targetPath);

    const existingParent = await findNearestExistingDir(parent);
    const existingParentReal = await realpath(existingParent);
    const relativeExistingParent = path.relative(baseReal, existingParentReal);
    if (relativeExistingParent.startsWith("..") || path.isAbsolute(relativeExistingParent)) {
      throw new Error(
        `Invalid run store path: ${existingParentReal}. Allowed base directory is ${baseReal}`,
      );
    }
    await mkdir(parent, { recursive: true });
    const parentReal = await realpath(parent);
    const relativeParent = path.relative(baseReal, parentReal);
    if (relativeParent.startsWith("..") || path.isAbsolute(relativeParent)) {
      throw new Error(
        `Invalid run store path: ${parentReal}. Allowed base directory is ${baseReal}`,
      );
    }

    const safeTarget = path.join(parentReal, path.basename(targetPath));
    const relativeTarget = path.relative(baseReal, safeTarget);
    if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
      throw new Error(
        `Invalid run store target: ${safeTarget}. Allowed base directory is ${baseReal}`,
      );
    }

    // Reject file symlinks that escape the base directory.
    try {
      const safeTargetReal = await realpath(safeTarget);
      const relativeTargetReal = path.relative(baseReal, safeTargetReal);
      if (relativeTargetReal.startsWith("..") || path.isAbsolute(relativeTargetReal)) {
        throw new Error(
          `Invalid run store target: ${safeTargetReal}. Allowed base directory is ${baseReal}`,
        );
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }

    try {
      const stats = await stat(safeTarget);
      if (stats.isDirectory()) {
        throw new Error(`Invalid run store target: ${safeTarget} is a directory`);
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }

    return safeTarget;
  }
}

function assertValidRunId(value: string): string {
  const runId = typeof value === "string" ? value.trim() : "";
  if (!runId) {
    throw new Error("Invalid runId: must be non-empty");
  }
  if (!/^[A-Za-z0-9._-]+$/.test(runId)) {
    throw new Error(`Invalid runId: ${runId}`);
  }
  if (runId === "." || runId === "..") {
    throw new Error(`Invalid runId: ${runId}`);
  }
  return runId;
}

async function findNearestExistingDir(start: string): Promise<string> {
  let current = start;
  for (;;) {
    try {
      const s = await stat(current);
      if (s.isDirectory()) {
        return current;
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") {
        throw error;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return current;
    }
    current = parent;
  }
}

function sanitizeCheckpoint(checkpoint: OrchestratorRunCheckpoint): OrchestratorRunCheckpoint {
  const tasks = checkpoint.tasks;
  const nextTasks: OrchestratorRunCheckpoint["tasks"] = {};

  for (const [taskId, entry] of Object.entries(tasks)) {
    const result = entry.result;

    const nextEntry: OrchestratorRunCheckpoint["tasks"][string] = {
      taskId: entry.taskId,
      status: entry.status,
      retry: entry.retry,
      gateResults: entry.gateResults,
    };

    if (entry.startTime) {
      nextEntry.startTime = entry.startTime;
    }

    if (entry.endTime) {
      nextEntry.endTime = entry.endTime;
    }

    if (result) {
      const sanitized: NonNullable<typeof result> = {
        success: Boolean(result.success),
      };

      if (typeof result.outputBytes === "number" && Number.isFinite(result.outputBytes)) {
        sanitized.outputBytes = Math.max(0, Math.trunc(result.outputBytes));
      }

      if (typeof result.outputPreview === "string") {
        sanitized.outputPreview = capStringBytes(result.outputPreview, MAX_OUTPUT_PREVIEW_BYTES);
      }

      if (Array.isArray(result.errors)) {
        sanitized.errors = result.errors
          .slice(0, MAX_ERROR_ITEMS)
          .map((e) => (typeof e === "string" ? capStringBytes(e, MAX_ERROR_BYTES) : ""))
          .filter((e) => e.length > 0);
      }

      nextEntry.result = sanitized;
    }

    nextTasks[taskId] = nextEntry;
  }

  return {
    ...checkpoint,
    tasks: nextTasks,
  };
}

function capStringBytes(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) {
    return value;
  }

  const buf = Buffer.from(value, "utf8");
  return buf.subarray(0, maxBytes).toString("utf8");
}

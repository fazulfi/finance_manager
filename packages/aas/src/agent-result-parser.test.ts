import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";

import { ResultParser } from "./agent-result-parser.js";

describe("ResultParser", () => {
  it("buffers stdout/stderr lines from streams", () => {
    const parser = new ResultParser();
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();

    parser.parseStdout(stdout as NodeJS.ReadableStream);
    parser.parseStderr(stderr as NodeJS.ReadableStream);

    stdout.emit("data", Buffer.from("hello\n"));
    stderr.emit("data", Buffer.from("ERROR: failed\n"));

    expect(parser.stdoutBuffer).toBe("hello\n");
    expect(parser.stderrBuffer).toBe("ERROR: failed\n");
  });

  it("detects completion keywords and JSON completion", () => {
    const parser = new ResultParser();

    expect(parser.detectCompletion("work DONE")).toEqual({ completed: true });
    expect(parser.detectCompletion('{"type":"complete"}')).toEqual({ completed: true });
    expect(parser.detectCompletion("still running")).toEqual({ completed: false });
  });

  it("extracts ERROR: lines", () => {
    const parser = new ResultParser();

    expect(parser.extractErrors("ERROR: one\nERROR: two")).toEqual(["one", "two"]);
    expect(parser.extractErrors("not-an-error")).toEqual([]);
  });
});

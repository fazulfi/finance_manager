import pino from "pino";

const agentLogger = pino({});

// Set log level from environment variable
if (process.env.AAS_LOG_LEVEL) {
  agentLogger.level = process.env.AAS_LOG_LEVEL;
}

/**
 * Completion detection keywords
 */
const COMPLETION_KEYWORDS = ["AGENT_COMPLETE", "COMPLETED", "DONE"];

/**
 * Error prefix pattern
 */
const ERROR_PREFIX = "ERROR:";

/**
 * ResultParser - Parses agent stdout/stderr for structured output
 * Handles line buffering, completion detection, and error extraction
 */
export class ResultParser {
  private _stdoutBuffer: string = "";
  private _stderrBuffer: string = "";
  private _currentStdoutLine: string = "";
  private _currentStderrLine: string = "";
  private _lastCompleteLineIndex: number = 0;

  /**
   * Parse stdout stream and buffer output
   * @param stream - Readable stream containing stdout data
   * @returns Buffer of accumulated stdout output
   */
  parseStdout(stream: NodeJS.ReadableStream): string {
    if (!stream || !stream.on) {
      agentLogger.warn("Invalid stdout stream provided to ResultParser");
      return this._stdoutBuffer;
    }

    stream.on("data", (data: Buffer) => {
      const chunk = data.toString();
      const lines = chunk.split(/\r?\n/);

      // Add first line to current line buffer
      if (lines.length > 0) {
        this._currentStdoutLine += lines[0];
      }

      // Process remaining lines
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        if (line) {
          this._stdoutBuffer += this._currentStdoutLine;
          this._stdoutBuffer += "\n";
          this._lastCompleteLineIndex++;

          if (line.startsWith(ERROR_PREFIX)) {
            this._currentStdoutLine = line;
          } else {
            this._currentStdoutLine = "";
          }
        } else {
          // Empty line - complete previous line
          if (this._currentStdoutLine) {
            this._stdoutBuffer += this._currentStdoutLine;
            this._stdoutBuffer += "\n";
            this._lastCompleteLineIndex++;
            this._currentStdoutLine = "";
          }
        }
      }
    });

    return this._stdoutBuffer;
  }

  /**
   * Parse stderr stream and buffer errors
   * @param stream - Readable stream containing stderr data
   * @returns Buffer of accumulated stderr output
   */
  parseStderr(stream: NodeJS.ReadableStream): string {
    if (!stream || !stream.on) {
      agentLogger.warn("Invalid stderr stream provided to ResultParser");
      return this._stderrBuffer;
    }

    stream.on("data", (data: Buffer) => {
      const chunk = data.toString();
      const lines = chunk.split(/\r?\n/);

      // Add first line to current line buffer
      if (lines.length > 0) {
        this._currentStderrLine += lines[0];
      }

      // Process remaining lines
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        if (line) {
          this._stderrBuffer += this._currentStderrLine;
          this._stderrBuffer += "\n";

          if (line.startsWith(ERROR_PREFIX)) {
            this._currentStderrLine = line;
          } else {
            this._currentStderrLine = "";
          }
        } else {
          // Empty line - complete previous line
          if (this._currentStderrLine) {
            this._stderrBuffer += this._currentStderrLine;
            this._stderrBuffer += "\n";
            this._currentStderrLine = "";
          }
        }
      }
    });

    return this._stderrBuffer;
  }

  /**
   * Detect if output indicates completion
   * @param output - Output string to check
   * @returns Object with completion status and optional partial content
   */
  detectCompletion(output: string): { completed: boolean; partial?: string } {
    // Trim trailing whitespace to detect keywords more reliably
    const trimmedOutput = output.trim();

    // Check for completion keywords at the end of output
    for (const keyword of COMPLETION_KEYWORDS) {
      if (trimmedOutput.endsWith(keyword)) {
        return { completed: true };
      }
    }

    // Try to parse as JSON to detect structured completion
    try {
      const trimmedOutputLines = trimmedOutput.split("\n");
      const lastLineIndex = trimmedOutputLines.length - 1;
      const lastLine = trimmedOutputLines[lastLineIndex];

      if (lastLine) {
        const json = JSON.parse(lastLine);
        if (typeof json === "object" && json !== null && json.type) {
          const completionTypes = ["complete", "done", "finished", "result"];
          if (completionTypes.includes(json.type.toLowerCase())) {
            return { completed: true };
          }
        }
      }
    } catch {
      // Not valid JSON - continue checking
    }

    // Output doesn't indicate completion
    return { completed: false };
  }

  /**
   * Extract ERROR: patterns from output
   * @param output - Output string to search
   * @returns Array of error messages starting with ERROR: prefix
   */
  extractErrors(output: string): string[] {
    if (!output || !output.startsWith(ERROR_PREFIX)) {
      return [];
    }

    // Remove ERROR: prefix from all lines
    const lines = output.split("\n");
    const errors: string[] = [];

    for (const line of lines) {
      if (line.startsWith(ERROR_PREFIX)) {
        // Remove the ERROR: prefix
        const errorMessage = line.slice(ERROR_PREFIX.length).trim();
        if (errorMessage) {
          errors.push(errorMessage);
        }
      }
    }

    return errors;
  }

  /**
   * Get the current stdout buffer (for debugging/testing)
   * @returns Current stdout buffer content
   */
  get stdoutBuffer(): string {
    return this._stdoutBuffer;
  }

  /**
   * Get the current stderr buffer (for debugging/testing)
   * @returns Current stderr buffer content
   */
  get stderrBuffer(): string {
    return this._stderrBuffer;
  }

  /**
   * Clear all buffers
   */
  clear(): void {
    this._stdoutBuffer = "";
    this._stderrBuffer = "";
    this._currentStdoutLine = "";
    this._currentStderrLine = "";
    this._lastCompleteLineIndex = 0;
  }
}

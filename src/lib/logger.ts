/**
 * Logging Infrastructure using Deno Standard Library
 *
 * Provides structured logging with multiple handlers and formatters.
 * Uses @std/log for robust, well-tested logging functionality.
 */

import {
  type BaseHandler,
  ConsoleHandler,
  FileHandler,
  getLogger,
  type Logger as StdLogger,
  type LogRecord,
  setup,
} from "@std/log";
import { ensureDir } from "@std/fs";
import { dirname } from "@std/path";
import type { Logger } from "./types.ts";

/**
 * Custom formatter that adds AI context to logs
 */
function aiFormatter(logRecord: LogRecord): string {
  const timestamp = new Date().toISOString();
  const level = logRecord.levelName;
  const message = logRecord.msg;
  return `[${timestamp}] [${level}] AI: ${message}`;
}

/**
 * Custom JSON formatter for file logs
 */
function jsonFormatter(logRecord: LogRecord): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level: logRecord.levelName.toLowerCase(),
    source: "conductor",
    message: logRecord.msg,
    data: logRecord.args.length > 0 ? logRecord.args : undefined,
  });
}

/**
 * Logger wrapper that implements our Logger interface using @std/log
 */
export class StandardLogger implements Logger {
  private stdLogger: StdLogger;

  constructor(name: string = "conductor") {
    this.stdLogger = getLogger(name);
  }

  debug(message: string, ...args: unknown[]): void {
    this.stdLogger.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.stdLogger.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.stdLogger.warn(message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.stdLogger.error(message, ...args);
  }
}

/**
 * Setup logging configuration using @std/log
 */
export async function setupLogging(
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" = "INFO",
  logFile?: string,
): Promise<void> {
  const handlers: Record<string, BaseHandler> = {
    console: new ConsoleHandler("DEBUG", {
      formatter: aiFormatter,
    }),
  };

  // Add file handler if log file is specified
  if (logFile) {
    // Ensure log directory exists
    await ensureDir(dirname(logFile));

    handlers.file = new FileHandler("DEBUG", {
      filename: logFile,
      formatter: jsonFormatter,
      mode: "a", // append mode
    });
  }

  await setup({
    handlers,
    loggers: {
      conductor: {
        level: level,
        handlers: logFile ? ["console", "file"] : ["console"],
      },
    },
  });
}

/**
 * Create a logger instance from configuration
 */
export async function createLogger(): Promise<Logger> {
  try {
    const { loadConfig } = await import("./config.ts");
    const config = await loadConfig();

    // Map our config log levels to std/log levels
    const levelMap: Record<string, "DEBUG" | "INFO" | "WARN" | "ERROR"> = {
      debug: "DEBUG",
      info: "INFO",
      warn: "WARN",
      error: "ERROR",
    };

    const logLevel = levelMap[config.logging.level] || "INFO";

    await setupLogging(logLevel, config.logging.file);
    return new StandardLogger();
  } catch (error) {
    // Fallback logger if config fails
    console.warn("Failed to load config for logger, using defaults:", error);
    await setupLogging("INFO", ".conductor/logs/conductor.log");
    return new StandardLogger();
  }
}

// For backward compatibility, export StandardLogger as ConsoleLogger
export const ConsoleLogger = StandardLogger;

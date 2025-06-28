/**
 * Logging Infrastructure
 *
 * Provides structured logging with multiple output targets and log levels.
 */

import { ensureDir } from "@std/fs";
import { dirname } from "@std/path";
import type { Logger } from "./types.ts";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class ConsoleLogger implements Logger {
  private minLevel: LogLevel;
  private logFile?: string;

  constructor(minLevel: LogLevel = "info", logFile?: string) {
    this.minLevel = minLevel;
    this.logFile = logFile;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] AI: ${message}`;
  }

  private async writeToFile(formattedMessage: string): Promise<void> {
    if (!this.logFile) return;

    try {
      await ensureDir(dirname(this.logFile));
      await Deno.writeTextFile(this.logFile, formattedMessage + "\n", { append: true });
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog("debug")) return;

    const formatted = this.formatMessage("debug", message);
    console.debug(formatted, ...args);
    this.writeToFile(formatted);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog("info")) return;

    const formatted = this.formatMessage("info", message);
    console.info(formatted, ...args);
    this.writeToFile(formatted);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog("warn")) return;

    const formatted = this.formatMessage("warn", message);
    console.warn(formatted, ...args);
    this.writeToFile(formatted);
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog("error")) return;

    const formatted = this.formatMessage("error", message);
    console.error(formatted, ...args);
    this.writeToFile(formatted);
  }
}

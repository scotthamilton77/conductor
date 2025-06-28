import { assertEquals, assertExists } from "@std/assert";
import { exists } from "@std/fs";
import { createLogger, setupLogging, StandardLogger } from "../src/lib/logger.ts";

Deno.test("Logging System with @std/log", async (t) => {
  const testLogFile = ".conductor/logs/test.log";

  // Clean up before tests
  try {
    await Deno.remove(testLogFile);
  } catch {
    // File might not exist, ignore
  }

  await t.step("should create logger with standard library", () => {
    const logger = new StandardLogger();
    assertExists(logger);
  });

  await t.step("should setup logging without file to avoid leaks", async () => {
    // Test console-only logging to avoid file handle leaks
    await setupLogging("DEBUG");
    const logger = new StandardLogger();

    // Test that logger methods work without throwing
    logger.info("Test info message");
    logger.warn("Test warning message");
    logger.error("Test error message");
    logger.debug("Test debug message");

    // Verify all methods exist and are callable
    assertExists(logger.info);
    assertExists(logger.warn);
    assertExists(logger.error);
    assertExists(logger.debug);
  });

  await t.step("should create logger instance without config", () => {
    // Test direct logger creation to avoid config file issues
    const logger = new StandardLogger("test");
    assertExists(logger);

    // Should be able to log without errors (console only)
    logger.info("Direct logger test");
  });

  await t.step("should have proper logger interface", () => {
    const logger = new StandardLogger();

    // Test that all required methods exist
    assertExists(logger.debug);
    assertExists(logger.info);
    assertExists(logger.warn);
    assertExists(logger.error);

    // Test they can be called without throwing
    logger.debug("Debug test");
    logger.info("Info test");
    logger.warn("Warn test");
    logger.error("Error test");
  });

  // Clean up after tests
  try {
    await Deno.remove(testLogFile);
  } catch {
    // File might not exist, ignore
  }
});

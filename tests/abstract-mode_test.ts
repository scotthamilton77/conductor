/**
 * Tests for AbstractMode base class
 */

import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { AbstractMode } from "../src/modes/abstract-mode.ts";
import { FileOperations } from "../src/lib/file-operations.ts";
import { type Logger, type ModeResult, type ModeState } from "../src/lib/types.ts";

// Mock Logger implementation
class MockLogger implements Logger {
  public logs: Array<{ level: string; message: string; args: unknown[] }> = [];

  debug(message: string, ...args: unknown[]): void {
    this.logs.push({ level: "debug", message, args });
  }

  info(message: string, ...args: unknown[]): void {
    this.logs.push({ level: "info", message, args });
  }

  warn(message: string, ...args: unknown[]): void {
    this.logs.push({ level: "warn", message, args });
  }

  error(message: string, ...args: unknown[]): void {
    this.logs.push({ level: "error", message, args });
  }

  reset(): void {
    this.logs = [];
  }

  hasLog(level: string, message: string): boolean {
    return this.logs.some((log) => log.level === level && log.message.includes(message));
  }
}

// Concrete test implementation of AbstractMode
class TestMode extends AbstractMode {
  public initializeCalled = false;
  public executeCalled = false;
  public validateCalled = false;
  public cleanupCalled = false;

  protected doInitialize(): Promise<void> {
    this.initializeCalled = true;
    return Promise.resolve();
  }

  protected doExecute<T>(input: string, context?: Record<string, unknown>): Promise<ModeResult<T>> {
    this.executeCalled = true;

    if (input === "error") {
      throw new Error("Test error");
    }

    if (input === "fail") {
      return Promise.resolve({
        success: false,
        error: "Test failure",
      });
    }

    return Promise.resolve({
      success: true,
      data: `processed: ${input}` as T,
      metadata: {
        artifacts: context?.artifacts as string[] || [],
      },
    });
  }

  protected doValidate(): Promise<ModeResult<boolean>> {
    this.validateCalled = true;
    return Promise.resolve({
      success: true,
      data: true,
    });
  }

  protected doCleanup(): Promise<void> {
    this.cleanupCalled = true;
    return Promise.resolve();
  }

  protected initializePrompts(): void {
    this.updatePrompt("default", "Test prompt template");
    this.updatePrompt("system", "System prompt for test mode");
  }
}

// Helper function to create test mode with temp file operations
async function createTestMode(): Promise<{
  mode: TestMode;
  fileOps: FileOperations;
  logger: MockLogger;
  tempDir: string;
  cleanup: () => Promise<void>;
}> {
  const tempDir = await Deno.makeTempDir({ prefix: "conductor_mode_test_" });
  const fileOps = new FileOperations(tempDir);
  await fileOps.initialize();

  const logger = new MockLogger();
  const mode = new TestMode(
    "test-mode",
    "Test Mode",
    "A test mode for unit testing",
    "1.0.0",
    [],
    fileOps,
    logger,
  );

  return {
    mode,
    fileOps,
    logger,
    tempDir,
    cleanup: async () => {
      await Deno.remove(tempDir, { recursive: true });
    },
  };
}

Deno.test("AbstractMode - Basic Properties", async () => {
  const { mode, cleanup } = await createTestMode();

  try {
    assertEquals(mode.id, "test-mode");
    assertEquals(mode.name, "Test Mode");
    assertEquals(mode.description, "A test mode for unit testing");
    assertEquals(mode.version, "1.0.0");
    assertEquals(mode.dependencies, []);
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - Initialization", async () => {
  const { mode, logger, cleanup } = await createTestMode();

  try {
    assertEquals(mode.initializeCalled, false);

    await mode.initialize();

    assertEquals(mode.initializeCalled, true);
    assertEquals(logger.hasLog("info", "Initializing mode: test-mode"), true);
    assertEquals(logger.hasLog("info", "initialized successfully"), true);

    // Should not reinitialize if already initialized
    logger.reset();
    mode.initializeCalled = false;

    await mode.initialize();

    assertEquals(mode.initializeCalled, false);
    assertEquals(logger.hasLog("debug", "already initialized"), true);
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - Execute with backward compatibility", async () => {
  const { mode, cleanup } = await createTestMode();

  try {
    await mode.initialize();

    const result = await mode.execute("test input");

    assertEquals(result, "processed: test input");
    assertEquals(mode.executeCalled, true);
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - Execute with result", async () => {
  const { mode, cleanup } = await createTestMode();

  try {
    await mode.initialize();

    const result = await mode.executeWithResult<string>("test input", {
      artifacts: ["test-artifact"],
    });

    assertEquals(result.success, true);
    assertEquals(result.data, "processed: test input");
    assertEquals(result.metadata?.artifacts, ["test-artifact"]);
    assertEquals(typeof result.metadata?.executionTime, "number");
    assertEquals(mode.executeCalled, true);
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - Execute with failure", async () => {
  const { mode, cleanup } = await createTestMode();

  try {
    await mode.initialize();

    const result = await mode.executeWithResult("fail");

    assertEquals(result.success, false);
    assertEquals(result.error, "Test failure");
    assertEquals(typeof result.metadata?.executionTime, "number");
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - Execute with error handling", async () => {
  const { mode, logger, cleanup } = await createTestMode();

  try {
    await mode.initialize();

    // Test executeWithResult error handling
    const result = await mode.executeWithResult("error");

    assertEquals(result.success, false);
    assertEquals(result.error, "Test error");
    assertEquals(logger.hasLog("error", "execution failed"), true);

    // Test execute method error propagation
    await assertRejects(
      () => mode.execute("error"),
      Error,
      "Test error",
    );
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - State Management", async () => {
  const { mode, cleanup } = await createTestMode();

  try {
    await mode.initialize();

    // Save state
    const testState: Partial<ModeState> = {
      id: "test-state",
      data: { key: "value", count: 42 },
      artifacts: ["artifact1", "artifact2"],
    };

    await mode.saveState(testState);

    // Load state
    const loadedState = await mode.loadState("test-state");

    assertEquals(loadedState?.id, "test-state");
    assertEquals(loadedState?.modeId, "test-mode");
    assertEquals(loadedState?.data, { key: "value", count: 42 });
    assertEquals(loadedState?.artifacts, ["artifact1", "artifact2"]);
    assertEquals(loadedState?.timestamp instanceof Date, true);

    // Load most recent state (without ID)
    const recentState = await mode.loadState();
    assertEquals(recentState?.id, "test-state");

    // Clear specific state
    await mode.clearState("test-state");
    const clearedState = await mode.loadState("test-state");
    assertEquals(clearedState, null);
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - Configuration", async () => {
  const { mode, cleanup } = await createTestMode();

  try {
    await mode.initialize();

    // Update configuration
    await mode.configure({
      enabled: false,
      settings: { debug: true, maxRetries: 3 },
    });

    // Configuration should be updated but not exposed directly
    // We can test this through validation
    const validationResult = await mode.validate();
    assertEquals(validationResult.success, false);
    assertEquals(validationResult.error?.includes("disabled"), true);
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - Validation", async () => {
  const { mode, cleanup } = await createTestMode();

  try {
    await mode.initialize();

    const result = await mode.validate();

    assertEquals(result.success, true);
    assertEquals(result.data, true);
    assertEquals(mode.validateCalled, true);
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - Prompt Management", async () => {
  const { mode, cleanup } = await createTestMode();

  try {
    await mode.initialize();

    // Check initial prompts
    const prompts = mode.getPrompts();
    assertEquals(prompts["default"], "Test prompt template");
    assertEquals(prompts["system"], "System prompt for test mode");

    // Update prompt
    mode.updatePrompt("custom", "Custom prompt template");

    const updatedPrompts = mode.getPrompts();
    assertEquals(updatedPrompts["custom"], "Custom prompt template");
    assertEquals(Object.keys(updatedPrompts).length, 3);
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - Cleanup", async () => {
  const { mode, logger, cleanup } = await createTestMode();

  try {
    await mode.initialize();

    assertEquals(mode.cleanupCalled, false);

    await mode.cleanup();

    assertEquals(mode.cleanupCalled, true);
    assertEquals(logger.hasLog("info", "Cleaning up mode: test-mode"), true);
    assertEquals(logger.hasLog("info", "cleaned up successfully"), true);

    // Check that prompts are cleared
    const prompts = mode.getPrompts();
    assertEquals(Object.keys(prompts).length, 0);
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - Lifecycle Hooks", async () => {
  const { fileOps, logger, cleanup, tempDir } = await createTestMode();

  try {
    let beforeExecuteCalled = false;
    let afterExecuteCalled = false;
    let errorCalled = false;

    // Create mode with lifecycle hooks
    class HookedTestMode extends TestMode {
      override onBeforeExecute(context?: Record<string, unknown>): Promise<void> {
        beforeExecuteCalled = true;
        return Promise.resolve();
      }

      override onAfterExecute(result: ModeResult): Promise<void> {
        afterExecuteCalled = true;
        return Promise.resolve();
      }

      override onError(error: Error): Promise<void> {
        errorCalled = true;
        return Promise.resolve();
      }
    }

    const mode = new HookedTestMode(
      "hooked-test",
      "Hooked Test Mode",
      "Test mode with hooks",
      "1.0.0",
      [],
      fileOps,
      logger,
    );

    await mode.initialize();

    // Test successful execution hooks
    await mode.executeWithResult("test");

    assertEquals(beforeExecuteCalled, true);
    assertEquals(afterExecuteCalled, true);
    assertEquals(errorCalled, false);

    // Reset and test error hooks
    beforeExecuteCalled = false;
    afterExecuteCalled = false;
    errorCalled = false;

    await mode.executeWithResult("error");

    assertEquals(beforeExecuteCalled, true);
    assertEquals(afterExecuteCalled, false); // Should not be called on error
    assertEquals(errorCalled, true);
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - Auto-initialization on execute", async () => {
  const { mode, cleanup } = await createTestMode();

  try {
    // Should auto-initialize if not already initialized
    assertEquals(mode.initializeCalled, false);

    await mode.executeWithResult("test");

    assertEquals(mode.initializeCalled, true);
    assertEquals(mode.executeCalled, true);
  } finally {
    await cleanup();
  }
});

Deno.test("AbstractMode - Dependencies validation", async () => {
  const { fileOps, logger, cleanup } = await createTestMode();

  try {
    // Create mode with dependencies
    const mode = new TestMode(
      "dependent-mode",
      "Dependent Mode",
      "Mode with dependencies",
      "1.0.0",
      ["dep1", "dep2"],
      fileOps,
      logger,
    );

    // Should initialize successfully (no actual dependency checking yet)
    await mode.initialize();

    assertEquals(mode.initializeCalled, true);
  } finally {
    await cleanup();
  }
});

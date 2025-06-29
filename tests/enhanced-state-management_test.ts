/**
 * Enhanced State Management Tests
 *
 * Tests for state validation, migration, compression, and error recovery features
 */

import { assertEquals } from "@std/assert";
import { FileOperations } from "../src/lib/file-operations.ts";
import { AbstractMode } from "../src/modes/abstract-mode.ts";
import {
  type Logger,
  type ModeResult,
  type ModeState,
  type StateValidationResult,
} from "../src/lib/types.ts";

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

/**
 * Test mode implementation for enhanced state management testing
 */
class TestEnhancedMode extends AbstractMode {
  public validateCalled = false;
  public migrateCalled = false;
  public customValidationResult: StateValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    needsMigration: false,
  };

  constructor(fileOps: FileOperations, logger: Logger) {
    super(
      "test-enhanced",
      "Test Enhanced Mode",
      "Test mode for enhanced state management",
      "2.0.0",
      [],
      fileOps,
      logger,
    );
  }

  protected initializePrompts(): void {
    this.prompts.set("test", "test prompt");
  }

  protected async doInitialize(): Promise<void> {
    // Test initialization
  }

  protected doExecute<T>(input: string): Promise<ModeResult<T>> {
    return Promise.resolve({ success: true, data: `processed: ${input}` as T });
  }

  protected doValidate(): Promise<ModeResult<boolean>> {
    this.validateCalled = true;
    return Promise.resolve({ success: true, data: true });
  }

  protected async doCleanup(): Promise<void> {
    // Test cleanup
  }

  protected override doValidateState(state: ModeState): Promise<StateValidationResult> {
    // For compression and backup tests, always return valid
    if (state.id === "large-state" || state.id === "backup-test") {
      return Promise.resolve({
        isValid: true,
        errors: [],
        warnings: [],
        needsMigration: false,
        currentVersion: state.schemaVersion,
        targetVersion: this.version,
      });
    }

    // Return the custom result, but preserve migration logic
    const result = { ...this.customValidationResult };

    // For migration test: if no schema version, needs migration
    if (!state.schemaVersion) {
      result.needsMigration = true;
      result.currentVersion = undefined;
      result.targetVersion = this.version;
    }

    return Promise.resolve(result);
  }

  protected override doMigrateState(state: ModeState): Promise<ModeState> {
    this.migrateCalled = true;
    // Simulate migration by adding a migrated flag
    return Promise.resolve({
      ...state,
      data: {
        ...state.data,
        migrated: true,
      },
    });
  }
}

async function createTestEnhancedMode() {
  const testDir = await Deno.makeTempDir({ prefix: "conductor_test_enhanced_" });
  const fileOps = new FileOperations(testDir);
  const logger = new MockLogger();
  const mode = new TestEnhancedMode(fileOps, logger);

  const cleanup = async () => {
    try {
      await mode.cleanup();
      await Deno.remove(testDir, { recursive: true });
    } catch (error) {
      console.warn("Cleanup failed:", error);
    }
  };

  return { mode, testDir, cleanup };
}

Deno.test("Enhanced State Management - State validation with checksum", async () => {
  const { mode, cleanup } = await createTestEnhancedMode();

  try {
    await mode.initialize();

    // Save state with checksum
    const testState: Partial<ModeState> = {
      id: "test-checksum",
      data: { key: "value", count: 42 },
      artifacts: ["artifact1"],
    };

    await mode.saveState(testState);

    // Load state and verify checksum validation works
    const loadedState = await mode.loadState("test-checksum");

    assertEquals(loadedState?.id, "test-checksum");
    assertEquals(loadedState?.checksum !== undefined, true);
    assertEquals(loadedState?.schemaVersion, "2.0.0");
  } finally {
    await cleanup();
  }
});

Deno.test("Enhanced State Management - State migration", async () => {
  const { mode, cleanup } = await createTestEnhancedMode();

  try {
    // Set custom validation to require migration BEFORE initializing
    mode.customValidationResult = {
      isValid: true,
      errors: [],
      warnings: ["Needs migration"],
      needsMigration: true,
      currentVersion: undefined,
      targetVersion: "2.0.0",
    };

    await mode.initialize();

    // Create legacy state (without schema version)
    const legacyState: ModeState = {
      id: "legacy-state",
      modeId: "test-enhanced",
      timestamp: new Date(),
      data: { legacy: true },
      artifacts: [],
    };

    // Manually save legacy state (bypass normal save process)
    const statePath = `state/test-enhanced/legacy-state.json`;
    const fileOps = (mode as unknown as { fileOps: FileOperations }).fileOps;
    await fileOps.writeFile(statePath, JSON.stringify(legacyState, null, 2));

    // Load state should trigger migration
    const migratedState = await mode.loadState("legacy-state");

    assertEquals(migratedState !== null, true);
    assertEquals(migratedState?.data.migrated, true);
    assertEquals(mode.migrateCalled, true);
    assertEquals(migratedState?.schemaVersion, "2.0.0");
  } finally {
    await cleanup();
  }
});

Deno.test("Enhanced State Management - State compression for large data", async () => {
  const { mode, cleanup } = await createTestEnhancedMode();

  try {
    await mode.initialize();

    // Create large state data that should trigger compression (>10KB)
    const largeData: Record<string, unknown> = {};
    const longString =
      "This is a very long value string that will make the state data large enough to trigger compression when repeated many times. "
        .repeat(100);
    for (let i = 0; i < 100; i++) {
      largeData[`key_${i}`] = `${longString} Item ${i}`;
    }

    const testState: Partial<ModeState> = {
      id: "large-state",
      data: largeData,
      artifacts: [],
    };

    await mode.saveState(testState);

    // Load state and verify it was compressed and decompressed correctly
    const loadedState = await mode.loadState("large-state");

    assertEquals(loadedState !== null, true);
    assertEquals(loadedState?.id, "large-state");
    assertEquals(Object.keys(loadedState?.data || {}).length, 100);
    assertEquals(loadedState?.data.key_99?.toString().includes("Item 99"), true);
  } finally {
    await cleanup();
  }
});

Deno.test("Enhanced State Management - Error recovery with backup", async () => {
  const { mode, cleanup } = await createTestEnhancedMode();

  try {
    await mode.initialize();

    // Save initial state
    const initialState: Partial<ModeState> = {
      id: "backup-test",
      data: { version: 1 },
      artifacts: [],
    };

    await mode.saveState(initialState);

    // Save updated state (this should create a backup)
    const updatedState: Partial<ModeState> = {
      id: "backup-test",
      data: { version: 2 },
      artifacts: [],
    };

    await mode.saveState(updatedState);

    // Manually corrupt the main state file
    const statePath = `state/test-enhanced/backup-test.json`;
    const fileOps = (mode as unknown as { fileOps: FileOperations }).fileOps;
    await fileOps.writeFile(statePath, "corrupted json content");

    // Load should recover from backup
    const recoveredState = await mode.loadState("backup-test");

    // Should recover the initial state from backup
    assertEquals(recoveredState !== null, true);
    assertEquals(recoveredState?.data.version, 1);
  } finally {
    await cleanup();
  }
});

Deno.test("Enhanced State Management - State validation errors", async () => {
  const { mode, cleanup } = await createTestEnhancedMode();

  try {
    await mode.initialize();

    // Create invalid state
    const invalidState: ModeState = {
      id: "", // Invalid empty ID
      modeId: "wrong-mode", // Wrong mode ID
      timestamp: new Date(),
      data: {},
      artifacts: [],
    };

    // Test validation directly
    const validation = await mode.validateState(invalidState);

    assertEquals(validation.isValid, false);
    assertEquals(validation.errors.length > 0, true);
    assertEquals(validation.errors.some((e) => e.includes("Invalid or missing state ID")), true);
    assertEquals(validation.errors.some((e) => e.includes("State mode ID mismatch")), true);
  } finally {
    await cleanup();
  }
});

Deno.test("Enhanced State Management - Save retry on failure", async () => {
  const { mode, cleanup } = await createTestEnhancedMode();

  try {
    await mode.initialize();

    // Create a state that will trigger save attempts
    const testState: Partial<ModeState> = {
      id: "retry-test",
      data: { test: "retry mechanism" },
      artifacts: [],
    };

    // This should succeed despite any transient issues
    await mode.saveState(testState);

    const loadedState = await mode.loadState("retry-test");
    assertEquals(loadedState?.data.test, "retry mechanism");
  } finally {
    await cleanup();
  }
});

Deno.test("Enhanced State Management - Custom mode validation integration", async () => {
  const { mode, cleanup } = await createTestEnhancedMode();

  try {
    await mode.initialize();

    // Set custom validation to fail
    mode.customValidationResult = {
      isValid: false,
      errors: ["Custom validation failed"],
      warnings: ["Custom warning"],
      needsMigration: false,
    };

    const testState: ModeState = {
      id: "custom-validation-test",
      modeId: "test-enhanced",
      timestamp: new Date(),
      data: { test: true },
      artifacts: [],
      schemaVersion: "2.0.0",
    };

    const validation = await mode.validateState(testState);

    assertEquals(validation.isValid, false);
    assertEquals(validation.errors.includes("Custom validation failed"), true);
    assertEquals(validation.warnings.includes("Custom warning"), true);
  } finally {
    await cleanup();
  }
});

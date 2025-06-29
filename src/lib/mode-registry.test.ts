/**
 * Tests for Mode Registry and Factory System
 */

import { assertEquals, assertThrows } from "jsr:@std/assert";
import { AbstractMode } from "../modes/abstract-mode.ts";
import { FileOperations } from "./file-operations.ts";
import { type Logger } from "./types.ts";
import {
  type ModeContext,
  ModeFactory,
  ModeRegistry,
  type ModeRegistryEntry,
} from "./mode-registry.ts";
import { type ModeConfig, type ModeResult } from "./types.ts";

// Create test logger
function createTestLogger(): Logger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

// Test mode implementation
class TestMode extends AbstractMode {
  protected async doInitialize(): Promise<void> {
    // Test initialization
  }

  // deno-lint-ignore require-await
  protected async doExecute<T>(
    input: string,
    _context?: Record<string, unknown>,
  ): Promise<ModeResult<T>> {
    return {
      success: true,
      data: `Test mode executed with: ${input}` as T,
    };
  }

  // deno-lint-ignore require-await
  protected async doValidate(): Promise<ModeResult<boolean>> {
    return { success: true, data: true };
  }

  protected async doCleanup(): Promise<void> {
    // Test cleanup
  }

  protected initializePrompts(): void {
    this.prompts.set("test", "Test prompt template");
  }
}

// Test mode with dependencies
class DependentTestMode extends AbstractMode {
  constructor(
    id: string,
    name: string,
    description: string,
    version: string,
    dependencies: string[],
    fileOps: FileOperations,
    logger: Logger,
    config?: Partial<ModeConfig>,
  ) {
    super(id, name, description, version, dependencies, fileOps, logger, config);
  }

  protected async doInitialize(): Promise<void> {
    // Test initialization
  }

  // deno-lint-ignore require-await
  protected async doExecute<T>(
    input: string,
    _context?: Record<string, unknown>,
  ): Promise<ModeResult<T>> {
    return {
      success: true,
      data: `Dependent mode executed with: ${input}` as T,
    };
  }

  // deno-lint-ignore require-await
  protected async doValidate(): Promise<ModeResult<boolean>> {
    return { success: true, data: true };
  }

  protected async doCleanup(): Promise<void> {
    // Test cleanup
  }

  protected initializePrompts(): void {
    this.prompts.set("dependent", "Dependent prompt template");
  }
}

// Helper function to create test registry
function createTestRegistry(): [ModeRegistry, FileOperations] {
  const logger = createTestLogger();
  const fileOps = new FileOperations("/tmp/test", logger);
  const registry = new ModeRegistry(fileOps, logger);
  return [registry, fileOps];
}

// Helper function to create test context
function createTestContext(): ModeContext {
  return {
    projectPath: "/test/project",
    workspaceState: {},
    userPreferences: {},
    sessionData: {},
  };
}

Deno.test("ModeRegistry - initialization", async () => {
  const [registry] = createTestRegistry();

  await registry.initialize();

  assertEquals(registry.getRegistered().length, 0);
  assertEquals(registry.getAvailable().length, 0);
});

Deno.test("ModeRegistry - register and retrieve mode", async () => {
  const [registry, fileOps] = createTestRegistry();
  await registry.initialize();

  const entry: ModeRegistryEntry = {
    modeClass: TestMode,
    config: {
      version: "1.0.0",
      enabled: true,
      description: "Test mode for testing",
    },
    isEnabled: true,
    loadPriority: 10,
  };

  registry.register("test", entry);

  assertEquals(registry.isRegistered("test"), true);
  assertEquals(registry.isAvailable("test"), true);
  assertEquals(registry.getAvailable(), ["test"]);

  const retrievedEntry = registry.getEntry("test");
  assertEquals(retrievedEntry?.config.version, "1.0.0");
});

Deno.test("ModeRegistry - create mode instance", async () => {
  const [registry] = createTestRegistry();
  await registry.initialize();

  const entry: ModeRegistryEntry = {
    modeClass: TestMode,
    config: {
      version: "1.0.0",
      enabled: true,
      description: "Test mode for testing",
    },
    isEnabled: true,
    loadPriority: 10,
  };

  registry.register("test", entry);

  const context = createTestContext();
  const mode = await registry.create("test", context);

  assertEquals(mode.id, "test");
  assertEquals(mode.name, "test");
  assertEquals(mode.description, "Test mode for testing");

  // Test execution
  const result = await mode.executeWithResult("hello");
  assertEquals(result.success, true);
  assertEquals(result.data, "Test mode executed with: hello");
});

Deno.test("ModeRegistry - dependency validation", async () => {
  const [registry] = createTestRegistry();
  await registry.initialize();

  // Register base mode
  const baseEntry: ModeRegistryEntry = {
    modeClass: TestMode,
    config: {
      version: "1.0.0",
      enabled: true,
      description: "Base test mode",
    },
    isEnabled: true,
    loadPriority: 10,
  };
  registry.register("test", baseEntry);

  // Register dependent mode
  const dependentEntry: ModeRegistryEntry = {
    modeClass: DependentTestMode,
    config: {
      version: "1.0.0",
      enabled: true,
      description: "Dependent test mode",
      dependencies: ["test"],
    },
    isEnabled: true,
    loadPriority: 5,
  };
  registry.register("dependent", dependentEntry);

  // Validation should pass
  const validation = registry.validateDependencies("dependent");
  assertEquals(validation.valid, true);

  // Test missing dependency
  registry.unregister("test");
  const failedValidation = registry.validateDependencies("dependent");
  assertEquals(failedValidation.valid, false);
  assertEquals(failedValidation.error?.includes("Missing dependencies"), true);
});

Deno.test("ModeRegistry - enable/disable modes", async () => {
  const [registry] = createTestRegistry();
  await registry.initialize();

  const entry: ModeRegistryEntry = {
    modeClass: TestMode,
    config: {
      version: "1.0.0",
      enabled: true,
      description: "Test mode for testing",
    },
    isEnabled: true,
    loadPriority: 10,
  };

  registry.register("test", entry);
  assertEquals(registry.isAvailable("test"), true);

  registry.setEnabled("test", false);
  assertEquals(registry.isRegistered("test"), true);
  assertEquals(registry.isAvailable("test"), false);

  registry.setEnabled("test", true);
  assertEquals(registry.isAvailable("test"), true);
});

Deno.test("ModeRegistry - unregister mode", async () => {
  const [registry] = createTestRegistry();
  await registry.initialize();

  const entry: ModeRegistryEntry = {
    modeClass: TestMode,
    config: {
      version: "1.0.0",
      enabled: true,
      description: "Test mode for testing",
    },
    isEnabled: true,
    loadPriority: 10,
  };

  registry.register("test", entry);
  assertEquals(registry.isRegistered("test"), true);

  registry.unregister("test");
  assertEquals(registry.isRegistered("test"), false);
  assertEquals(registry.isAvailable("test"), false);
});

Deno.test("ModeFactory - create mode with validation", async () => {
  const [registry] = createTestRegistry();
  const logger = createTestLogger();
  await registry.initialize();

  const factory = new ModeFactory(registry, logger);

  const entry: ModeRegistryEntry = {
    modeClass: TestMode,
    config: {
      version: "1.0.0",
      enabled: true,
      description: "Test mode for testing",
    },
    isEnabled: true,
    loadPriority: 10,
  };

  registry.register("test", entry);

  const context = createTestContext();
  const mode = await factory.createMode("test", context);

  assertEquals(mode.id, "test");

  // Test that mode validation was performed
  const validation = await factory.validateMode(mode);
  assertEquals(validation.valid, true);
});

Deno.test("ModeFactory - handle unavailable mode", async () => {
  const [registry] = createTestRegistry();
  const logger = createTestLogger();
  await registry.initialize();

  const factory = new ModeFactory(registry, logger);
  const context = createTestContext();

  try {
    await factory.createMode("nonexistent", context);
    throw new Error("Should have thrown an error");
  } catch (error) {
    assertEquals((error as Error).message, "Mode 'nonexistent' is not available");
  }
});

Deno.test("ModeRegistry - get statistics", async () => {
  const [registry] = createTestRegistry();
  await registry.initialize();

  const entry1: ModeRegistryEntry = {
    modeClass: TestMode,
    config: { version: "1.0.0", enabled: true, description: "Test mode 1" },
    isEnabled: true,
    loadPriority: 10,
    metadata: { category: "test" },
  };

  const entry2: ModeRegistryEntry = {
    modeClass: TestMode,
    config: { version: "1.0.0", enabled: false, description: "Test mode 2" },
    isEnabled: false,
    loadPriority: 5,
    metadata: { category: "test" },
  };

  registry.register("test1", entry1);
  registry.register("test2", entry2);

  const stats = registry.getStats();
  assertEquals(stats.totalModes, 2);
  assertEquals(stats.enabledModes, 1);
  assertEquals(stats.activeInstances, 0);
  assertEquals(stats.categories.test, 2);
});

Deno.test("ModeRegistry - registry entry validation", async () => {
  const [registry] = createTestRegistry();
  await registry.initialize();

  // Test invalid entry
  try {
    registry.register("invalid", {
      // deno-lint-ignore no-explicit-any
      modeClass: null as any,
      config: { version: "1.0.0", enabled: true, description: "Invalid mode" },
      isEnabled: true,
      loadPriority: 10,
    });
    throw new Error("Should have thrown an error");
  } catch (error) {
    assertEquals(
      (error as Error).message.includes("Mode class must be a constructor function"),
      true,
    );
  }

  // Test invalid name
  try {
    registry.register("", {
      modeClass: TestMode,
      config: { version: "1.0.0", enabled: true, description: "Empty name mode" },
      isEnabled: true,
      loadPriority: 10,
    });
    throw new Error("Should have thrown an error");
  } catch (error) {
    assertEquals((error as Error).message.includes("Mode name must be a non-empty string"), true);
  }
});

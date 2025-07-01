/**
 * Tests for Discovery Mode stub implementation
 */

import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { DiscoveryMode } from "../src/modes/discovery-mode.ts";
import { FileOperations, testFileOperations } from "../src/lib/file-operations.ts";
import { type Logger } from "../src/lib/types.ts";
import { createStateId } from "../src/lib/type-utils.ts";

// Mock logger for testing
class MockLogger implements Logger {
  public logs: Array<{ level: string; message: string }> = [];

  info(message: string): void {
    this.logs.push({ level: "info", message });
  }

  error(message: string): void {
    this.logs.push({ level: "error", message });
  }

  warn(message: string): void {
    this.logs.push({ level: "warn", message });
  }

  debug(message: string): void {
    this.logs.push({ level: "debug", message });
  }

  clear(): void {
    this.logs = [];
  }
}

Deno.test("DiscoveryMode - initialization", async () => {
  const fileOps = testFileOperations;
  const logger = new MockLogger();
  const mode = new DiscoveryMode(fileOps, logger);

  // Test basic properties
  assertEquals(mode.id, "discovery");
  assertEquals(mode.name, "Discovery Mode");
  assertStringIncludes(mode.description, "Conversational problem exploration");
  assertEquals(mode.version, "1.0.0-stub");
  assertEquals(mode.dependencies, []);

  // Test initialization
  await mode.initialize();

  // Verify logging
  const initLogs = logger.logs.filter((log) => log.message.includes("Initializing Discovery Mode"));
  assertEquals(initLogs.length, 1);
});

Deno.test("DiscoveryMode - conversation flow", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "conductor_test_discovery_" });
  const fileOps = new FileOperations(testDir, undefined, true);
  const logger = new MockLogger();
  const mode = new DiscoveryMode(fileOps, logger);

  try {
    await mode.initialize();

    // First execution should ask the first question
    const firstResult = await mode.execute("start");
    assertStringIncludes(firstResult, "What problem are you trying to solve?");
    assertStringIncludes(firstResult, "Welcome to Discovery Mode");

    // Second execution with response should ask next question
    const secondResult = await mode.execute("I need to organize my daily tasks better");
    assertStringIncludes(secondResult, "Who experiences this problem");

    // Continue through a few more questions
    const thirdResult = await mode.execute("Busy professionals and students");
    assertStringIncludes(thirdResult, "recent time this was");
  } finally {
    await mode.cleanup();
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("DiscoveryMode - state management", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "conductor_test_discovery_" });
  const fileOps = new FileOperations(testDir, undefined, true);
  const logger = new MockLogger();
  const mode = new DiscoveryMode(fileOps, logger);

  try {
    await mode.initialize();

    // Execute a few rounds to build state
    await mode.execute("start");
    await mode.execute("Task organization problem");
    await mode.execute("Remote workers");

    // Verify state is being maintained
    const state = await mode.loadState(createStateId("discovery-session"));
    assertExists(state);

    // Type-safe access to discovery state properties
    const discoveryData = state.data as Record<string, unknown>;
    const responses = (state as { responses?: string[] }).responses;
    const insights = (state as { insights?: string[] }).insights;

    // After 3 executes: start (q0->1), problem (q1->2), workers (q2->3)
    assertEquals((state as { currentQuestionIndex?: number }).currentQuestionIndex, 3);
    assertEquals(responses?.length, 2); // "start" doesn't count as response
    assertEquals(insights?.length, 2);
    assertExists(discoveryData?.startTime);
  } finally {
    await mode.cleanup();
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("DiscoveryMode - conversation completion", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "conductor_test_discovery_" });
  const fileOps = new FileOperations(testDir, undefined, true);
  const logger = new MockLogger();
  const mode = new DiscoveryMode(fileOps, logger);

  try {
    await mode.initialize();

    // Go through all questions
    const responses = [
      "start",
      "Task management is chaotic",
      "Remote workers and students",
      "Yesterday I missed three important deadlines",
      "Clear visibility into priorities and deadlines",
      "Must work across multiple devices and platforms",
    ];

    let result;
    for (const response of responses) {
      result = await mode.execute(response);
    }

    // Final execution should complete the conversation
    result = await mode.execute("final");
    assertStringIncludes(result, "key insights");
    assertStringIncludes(result, "Framework validation: ✅");
  } finally {
    await mode.cleanup();
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("DiscoveryMode - validation", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "conductor_test_discovery_" });
  const fileOps = new FileOperations(testDir, undefined, true);
  const logger = new MockLogger();
  const mode = new DiscoveryMode(fileOps, logger);

  try {
    await mode.initialize();

    // Validation should fail with no responses
    let validationResult = await mode.validate();
    assertEquals(validationResult.success, false);
    assertStringIncludes(validationResult.error!, "no responses");

    // Add some responses
    await mode.execute("start");
    await mode.execute("Some problem");

    // Validation should now succeed
    validationResult = await mode.validate();
    assertEquals(validationResult.success, true);
    assertEquals(validationResult.data, true);
  } finally {
    await mode.cleanup();
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("DiscoveryMode - cleanup and artifact generation", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "conductor_test_discovery_" });
  const fileOps = new FileOperations(testDir, undefined, true);
  const logger = new MockLogger();
  const mode = new DiscoveryMode(fileOps, logger);

  try {
    await mode.initialize();

    // Add some conversation data
    await mode.execute("start");
    await mode.execute("Project management challenges");
    await mode.execute("Software development teams");

    // Test cleanup
    await mode.cleanup();

    // Verify project.md was generated
    const projectPath = "project.md";
    const exists = await fileOps.exists(projectPath);
    assertEquals(exists, true);

    const projectResult = await fileOps.readFile(projectPath);
    const projectContent = projectResult.content;
    assertStringIncludes(projectContent, "# Discovery Session Results");
    assertStringIncludes(projectContent, "Core Problem");
    assertStringIncludes(projectContent, "Key Insights");
    assertStringIncludes(projectContent, "discovery-stub-session");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("DiscoveryMode - error handling", async () => {
  const fileOps = testFileOperations;
  const logger = new MockLogger();
  const mode = new DiscoveryMode(fileOps, logger);

  // Test execute without initialization - should auto-initialize
  try {
    const result = await mode.execute("test");
    // Should work due to auto-initialization in AbstractMode
    assertStringIncludes(result, "What problem");
  } catch (error) {
    // If it fails, verify it's for expected reasons
    const errorMessage = error instanceof Error ? error.message : String(error);
    assertStringIncludes(errorMessage, "state");
  }
});

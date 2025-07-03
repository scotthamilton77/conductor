/**
 * Tests for PromptManager
 */

import { assertEquals, assertExists, assertThrows } from "@std/assert";
import { PromptManager, PromptTemplate } from "../src/lib/prompt-manager.ts";
import { FileOperations } from "../src/lib/file-operations.ts";
import { StandardLogger } from "../src/lib/logger.ts";
import { ensureDir, exists } from "@std/fs";
import { join } from "@std/path";
import { createModeId, createTemplateId } from "../src/lib/type-utils.ts";

const TEST_DIR = "./test-prompt-manager";
const logger = new StandardLogger("test");

/**
 * Setup test environment
 */
async function setupTestEnv(): Promise<FileOperations> {
  await ensureDir(TEST_DIR);
  const fileOps = new FileOperations(TEST_DIR);
  return fileOps;
}

/**
 * Cleanup test environment
 */
async function cleanupTestEnv() {
  try {
    await Deno.remove(TEST_DIR, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

Deno.test("PromptManager - Basic template operations", async () => {
  const fileOps = await setupTestEnv();
  const manager = new PromptManager(createModeId("test-mode"), fileOps, logger);

  // Test setting and getting templates
  const template: PromptTemplate = {
    id: createTemplateId("greeting"),
    template: "Hello, {{name}}!",
    variables: ["name"],
    format: "text",
  };

  manager.setTemplate(template);
  const retrieved = manager.getTemplate(createTemplateId("greeting"));

  assertExists(retrieved);
  assertEquals(retrieved.id, "greeting");
  assertEquals(retrieved.template, "Hello, {{name}}!");

  // Test getting non-existent template
  assertEquals(manager.getTemplate(createTemplateId("missing")), undefined);

  // Test getting template IDs
  const ids = manager.getTemplateIds();
  assertEquals(ids.length, 1);
  assertEquals(ids[0], "greeting");

  await cleanupTestEnv();
});

Deno.test("PromptManager - Variable substitution", async () => {
  const fileOps = await setupTestEnv();
  const manager = new PromptManager(createModeId("test-mode"), fileOps, logger);

  // Test basic substitution
  manager.setTemplate({
    id: createTemplateId("welcome"),
    template: "Welcome {{user}} to {{system}}!",
    variables: ["user", "system"],
  });

  const rendered = manager.renderTemplate(createTemplateId("welcome"), {
    user: "Alice",
    system: "Discovery Mode",
  });

  assertEquals(rendered, "Welcome Alice to Discovery Mode!");

  // Test multiple variable formats
  manager.setTemplate({
    id: createTemplateId("multi_format"),
    template: "{{var1}} ${var2} {var3}",
    variables: ["var1", "var2", "var3"],
  });

  const multiRendered = manager.renderTemplate(createTemplateId("multi_format"), {
    var1: "A",
    var2: "B",
    var3: "C",
  });

  assertEquals(multiRendered, "A B C");

  // Test missing variables (should leave unchanged)
  const partial = manager.renderTemplate(createTemplateId("welcome"), {
    user: "Bob",
  });

  assertEquals(partial, "Welcome Bob to {{system}}!");

  // Test null/undefined values
  manager.setTemplate({
    id: createTemplateId("nullable"),
    template: "Value: {{value}}",
  });

  assertEquals(manager.renderTemplate(createTemplateId("nullable"), { value: null }), "Value: ");
  assertEquals(
    manager.renderTemplate(createTemplateId("nullable"), { value: undefined }),
    "Value: ",
  );

  // Test object values (should JSON stringify)
  const objRendered = manager.renderTemplate(createTemplateId("nullable"), {
    value: { foo: "bar", num: 42 },
  });

  assertEquals(objRendered.includes('"foo": "bar"'), true);
  assertEquals(objRendered.includes('"num": 42'), true);

  await cleanupTestEnv();
});

Deno.test("PromptManager - Template loading and saving", async () => {
  const fileOps = await setupTestEnv();
  const manager = new PromptManager(createModeId("test-mode"), fileOps, logger);

  // Create test templates
  const templates: PromptTemplate[] = [
    {
      id: createTemplateId("question"),
      template: "What is {{topic}}?",
      description: "Generic question template",
      variables: ["topic"],
      format: "text",
    },
    {
      id: createTemplateId("answer"),
      template: "The answer is: {{response}}",
      description: "Answer template",
      variables: ["response"],
      format: "markdown",
    },
  ];

  // Set templates
  for (const template of templates) {
    manager.setTemplate(template);
  }

  // Save templates
  await manager.saveTemplates();

  // Verify file was created
  // FileOperations automatically adds .conductor prefix
  const promptPath = join(TEST_DIR, ".conductor", "modes", "test-mode", "prompts.json");
  assertEquals(await exists(promptPath), true);

  // Create new manager and load templates
  const manager2 = new PromptManager(createModeId("test-mode"), fileOps, logger);
  await manager2.loadTemplates();

  // Verify templates were loaded
  assertEquals(manager2.getTemplateIds().length, 2);

  const question = manager2.getTemplate(createTemplateId("question"));
  assertExists(question);
  assertEquals(question.template, "What is {{topic}}?");
  assertEquals(question.description, "Generic question template");

  await cleanupTestEnv();
});

Deno.test("PromptManager - Backward compatibility with simple format", async () => {
  const fileOps = await setupTestEnv();

  // Create old-style prompts file
  const oldStylePrompts = {
    "welcome": "Welcome to the system",
    "goodbye": "Thank you for using the system",
    "error": "An error occurred: {{message}}",
  };

  await fileOps.writeFile(
    "modes/test-mode/prompts.json",
    JSON.stringify(oldStylePrompts, null, 2),
    { createDirs: true },
  );

  // Load with manager
  const manager = new PromptManager(createModeId("test-mode"), fileOps, logger);
  await manager.loadTemplates();

  // Verify templates were converted
  assertEquals(manager.getTemplateIds().length, 3);

  const welcome = manager.getTemplate(createTemplateId("welcome"));
  assertExists(welcome);
  assertEquals(welcome.template, "Welcome to the system");
  assertEquals(welcome.format, "text");

  // Test rendering with variables
  const errorRendered = manager.renderTemplate(createTemplateId("error"), {
    message: "File not found",
  });
  assertEquals(errorRendered, "An error occurred: File not found");

  await cleanupTestEnv();
});

Deno.test("PromptManager - Response formatting", async () => {
  const fileOps = await setupTestEnv();
  const manager = new PromptManager(createModeId("test-mode"), fileOps, logger);

  // Test text formatting
  const textResult = manager.formatResponse("Hello World", { type: "text" });
  assertEquals(textResult, "Hello World");

  // Test markdown formatting
  const mdResult = manager.formatResponse("Content", {
    type: "markdown",
    template: "# Result\n\n{content}",
  });
  assertEquals(mdResult, "# Result\n\nContent");

  // Test JSON formatting
  const jsonResult = manager.formatResponse('{"key": "value"}', { type: "json" });
  assertEquals(jsonResult, { key: "value" });

  // Test invalid JSON (should return as text)
  const invalidJsonResult = manager.formatResponse("not json", { type: "json" });
  assertEquals(invalidJsonResult, "not json");

  // Test structured response parsing
  const structuredContent = `name: John Doe
age: 30
role: Developer`;

  const structuredResult = manager.formatResponse(structuredContent, {
    type: "structured",
  }) as Record<string, unknown>;

  assertEquals(structuredResult.name, "John Doe");
  assertEquals(structuredResult.age, "30");
  assertEquals(structuredResult.role, "Developer");

  // Test custom parser
  const customResult = manager.formatResponse("test", {
    type: "structured",
    parser: (content) => ({ parsed: content.toUpperCase() }),
  });

  assertEquals(customResult, { parsed: "TEST" });

  await cleanupTestEnv();
});

Deno.test("PromptManager - Prompt builder", async () => {
  const fileOps = await setupTestEnv();
  const manager = new PromptManager(createModeId("test-mode"), fileOps, logger);

  manager.setTemplate({
    id: createTemplateId("complex"),
    template: "User {{name}} ({{role}}) is working on {{project}} with priority {{priority}}",
    variables: ["name", "role", "project", "priority"],
  });

  // Test fluent builder
  const result = manager.createBuilder(createTemplateId("complex"))
    .with("name", "Alice")
    .with("role", "Developer")
    .with("project", "Discovery Mode")
    .with("priority", "high")
    .build();

  assertEquals(result, "User Alice (Developer) is working on Discovery Mode with priority high");

  // Test withAll
  const result2 = manager.createBuilder(createTemplateId("complex"))
    .withAll({
      name: "Bob",
      role: "Designer",
      project: "UI Refresh",
      priority: "medium",
    })
    .build();

  assertEquals(result2, "User Bob (Designer) is working on UI Refresh with priority medium");

  await cleanupTestEnv();
});

Deno.test("PromptManager - Error handling", async () => {
  const fileOps = await setupTestEnv();
  const manager = new PromptManager(createModeId("test-mode"), fileOps, logger);

  // Test rendering non-existent template
  assertThrows(
    () => manager.renderTemplate(createTemplateId("missing"), {}),
    Error,
    "Template not found: missing",
  );

  // Test loading from non-existent file (should not throw)
  const manager2 = new PromptManager(createModeId("non-existent"), fileOps, logger);
  await manager2.loadTemplates(); // Should complete without error
  assertEquals(manager2.getTemplateIds().length, 0);

  await cleanupTestEnv();
});

Deno.test("PromptManager - Clear templates", async () => {
  const fileOps = await setupTestEnv();
  const manager = new PromptManager(createModeId("test-mode"), fileOps, logger);

  // Add some templates
  manager.setTemplate({ id: createTemplateId("test1"), template: "Test 1" });
  manager.setTemplate({ id: createTemplateId("test2"), template: "Test 2" });

  assertEquals(manager.getTemplateIds().length, 2);

  // Clear all templates
  manager.clear();

  assertEquals(manager.getTemplateIds().length, 0);
  assertEquals(manager.getTemplate(createTemplateId("test1")), undefined);

  await cleanupTestEnv();
});

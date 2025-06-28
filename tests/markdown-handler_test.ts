/**
 * Tests for MarkdownHandler
 */

import { assertEquals, assertThrows } from "@std/assert";
import {
  MarkdownHandler,
  markdownHandler,
  type ProjectFrontmatter,
} from "../src/lib/markdown-handler.ts";
import { join } from "@std/path";

// Test fixtures
const sampleMarkdownWithFrontmatter = `---
title: Test Document  
description: A test document
version: 1.0.0
tags:
  - test
  - markdown
---

# Test Document

This is a test document with frontmatter.

## Section 1

Some content here.`;

const sampleMarkdownWithoutFrontmatter = `# Test Document

This is a test document without frontmatter.

## Section 1

Some content here.`;

const malformedYamlFrontmatter = `---
title: Test Document
description: A test document
invalid: [ unclosed array
---

# Test Document

Content here.`;

Deno.test("MarkdownHandler - constructor with options", () => {
  const handler = new MarkdownHandler({
    defaultAttrs: { author: "test" },
    preserveFormatting: false,
  });

  const result = handler.parse("# Test");
  assertEquals(result.attrs, { author: "test" });
});

Deno.test("MarkdownHandler - parse markdown with frontmatter", () => {
  const result = markdownHandler.parse(sampleMarkdownWithFrontmatter);

  assertEquals(result.attrs.title, "Test Document");
  assertEquals(result.attrs.description, "A test document");
  assertEquals(result.attrs.version, "1.0.0");
  assertEquals(result.attrs.tags, ["test", "markdown"]);
  assertEquals(result.body.trim().startsWith("# Test Document"), true);
});

Deno.test("MarkdownHandler - parse markdown without frontmatter", () => {
  const result = markdownHandler.parse(sampleMarkdownWithoutFrontmatter);

  assertEquals(result.attrs, {});
  assertEquals(result.body, sampleMarkdownWithoutFrontmatter);
  assertEquals(result.frontMatter, "");
});

Deno.test("MarkdownHandler - parse with default attributes", () => {
  const handler = new MarkdownHandler({
    defaultAttrs: { created: "2024-01-01", author: "test" },
  });

  const result = handler.parse(sampleMarkdownWithoutFrontmatter);

  assertEquals(result.attrs.created, "2024-01-01");
  assertEquals(result.attrs.author, "test");
});

Deno.test("MarkdownHandler - stringify markdown file", () => {
  const markdownFile = {
    attrs: {
      title: "Test Document",
      description: "A test document",
      tags: ["test", "markdown"],
    },
    body: "# Test Document\n\nContent here.",
    frontMatter: "",
  };

  const result = markdownHandler.stringify(markdownFile);

  assertEquals(result.includes("---"), true);
  assertEquals(result.includes("title: Test Document"), true);
  assertEquals(result.includes("# Test Document"), true);
});

Deno.test("MarkdownHandler - stringify without attributes", () => {
  const markdownFile = {
    attrs: {},
    body: "# Test Document\n\nContent here.",
    frontMatter: "",
  };

  const result = markdownHandler.stringify(markdownFile);
  assertEquals(result, "# Test Document\n\nContent here.");
});

Deno.test("MarkdownHandler - hasFrontmatter detection", () => {
  assertEquals(markdownHandler.hasFrontmatter(sampleMarkdownWithFrontmatter), true);
  assertEquals(markdownHandler.hasFrontmatter(sampleMarkdownWithoutFrontmatter), false);
  assertEquals(markdownHandler.hasFrontmatter(""), false);
});

Deno.test("MarkdownHandler - updateAttributes", () => {
  const original = markdownHandler.parse(sampleMarkdownWithFrontmatter);
  const updated = markdownHandler.updateAttributes(original, {
    version: "2.0.0",
    author: "John Doe",
  });

  assertEquals(updated.attrs.version, "2.0.0");
  assertEquals(updated.attrs.author, "John Doe");
  assertEquals(updated.attrs.title, "Test Document"); // preserved
  assertEquals(updated.body, original.body); // unchanged
});

Deno.test("MarkdownHandler - updateBody", () => {
  const original = markdownHandler.parse(sampleMarkdownWithFrontmatter);
  const newBody = "# Updated Document\n\nNew content.";
  const updated = markdownHandler.updateBody(original, newBody);

  assertEquals(updated.body, newBody);
  assertEquals(updated.attrs, original.attrs); // unchanged
});

Deno.test("MarkdownHandler - create new markdown file", () => {
  const markdownFile = markdownHandler.create(
    "# New Document\n\nContent here.",
    { title: "New Document", version: "1.0.0" },
  );

  assertEquals(markdownFile.attrs.title, "New Document");
  assertEquals(markdownFile.attrs.version, "1.0.0");
  assertEquals(markdownFile.body, "# New Document\n\nContent here.");
});

Deno.test("MarkdownHandler - validate frontmatter", () => {
  const markdownFile = markdownHandler.parse(sampleMarkdownWithFrontmatter);

  // Valid validation
  const validResult = markdownHandler.validate(markdownFile, (attrs) => {
    return typeof attrs.title === "string" && attrs.title.length > 0;
  });
  assertEquals(validResult.valid, true);
  assertEquals(validResult.errors.length, 0);

  // Invalid validation
  const invalidResult = markdownHandler.validate(markdownFile, (attrs) => {
    return attrs.title === "Wrong Title";
  });
  assertEquals(invalidResult.valid, false);
  assertEquals(invalidResult.errors.length, 1);
});

Deno.test("MarkdownHandler - validate with exception", () => {
  const markdownFile = markdownHandler.parse(sampleMarkdownWithFrontmatter);

  const result = markdownHandler.validate(markdownFile, () => {
    throw new Error("Validation error");
  });

  assertEquals(result.valid, false);
  assertEquals(result.errors[0], "Validation error");
});

// File I/O tests (integration tests)
Deno.test("MarkdownHandler - file operations", async () => {
  const tempDir = await Deno.makeTempDir();
  const testFile = join(tempDir, "test.md");

  try {
    // Test writing
    const markdownFile = {
      attrs: {
        title: "Test File",
        created: "2024-01-01",
      },
      body: "# Test File\n\nThis is a test file.",
      frontMatter: "",
    };

    await markdownHandler.writeFile(testFile, markdownFile);

    // Test reading
    const readResult = await markdownHandler.readFile(testFile);
    assertEquals(readResult.attrs.title, "Test File");
    assertEquals(readResult.attrs.created, "2024-01-01");
    assertEquals(readResult.body.includes("# Test File"), true);

    // Test reading non-existent file
    let errorThrown = false;
    try {
      await markdownHandler.readFile(join(tempDir, "nonexistent.md"));
    } catch (error) {
      errorThrown = true;
      assertEquals(error instanceof Error, true);
      if (error instanceof Error) {
        assertEquals(error.message.includes("Markdown file not found"), true);
      }
    }
    assertEquals(errorThrown, true, "Expected error to be thrown for non-existent file");
  } finally {
    // Cleanup
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("MarkdownHandler - typed frontmatter", () => {
  interface CustomFrontmatter {
    name: string;
    priority: number;
    completed: boolean;
  }

  const markdownContent = `---
name: Custom Task
priority: 5
completed: false
---

# Custom Task

Task content here.`;

  const result = markdownHandler.parse<CustomFrontmatter>(markdownContent);

  assertEquals(result.attrs.name, "Custom Task");
  assertEquals(result.attrs.priority, 5);
  assertEquals(result.attrs.completed, false);
});

Deno.test("MarkdownHandler - ProjectFrontmatter interface", () => {
  const projectContent = `---
name: Test Project
description: A test project
version: 1.0.0
created: "2024-01-01"
mode: development
tags:
  - test
  - project
---

# Test Project

Project documentation here.`;

  const result = markdownHandler.parse<ProjectFrontmatter>(projectContent);

  assertEquals(result.attrs.name, "Test Project");
  assertEquals(result.attrs.description, "A test project");
  assertEquals(result.attrs.version, "1.0.0");
  assertEquals(result.attrs.mode, "development");
  assertEquals(result.attrs.tags, ["test", "project"]);
});

Deno.test("MarkdownHandler - edge cases", () => {
  // Empty content
  const emptyResult = markdownHandler.parse("");
  assertEquals(emptyResult.attrs, {});
  assertEquals(emptyResult.body, "");

  // Only frontmatter, no body
  const frontmatterOnly = markdownHandler.parse("---\ntitle: Test\n---");
  assertEquals(frontmatterOnly.attrs.title, "Test");
  assertEquals(frontmatterOnly.body.trim(), "");

  // Multiple YAML documents (should only parse first)
  const multiYaml = `---
title: First
---

Content here.

---
title: Second
---

More content.`;

  const multiResult = markdownHandler.parse(multiYaml);
  assertEquals(multiResult.attrs.title, "First");
  assertEquals(multiResult.body.includes("More content"), true);
});

Deno.test("MarkdownHandler - round trip consistency", () => {
  // Parse then stringify should maintain consistency
  const original = markdownHandler.parse(sampleMarkdownWithFrontmatter);
  const stringified = markdownHandler.stringify(original);
  const reparsed = markdownHandler.parse(stringified);

  assertEquals(reparsed.attrs.title, original.attrs.title);
  assertEquals(reparsed.attrs.description, original.attrs.description);
  assertEquals(reparsed.attrs.version, original.attrs.version);
  assertEquals(reparsed.body.trim(), original.body.trim());
});

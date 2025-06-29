/**
 * Tests for ProjectTemplate System
 */

import { assertEquals, assertThrows } from "@std/assert";
import {
  type ProjectSchema,
  ProjectTemplate,
  projectTemplate,
  type ProjectTemplateOptions,
} from "../src/lib/project-template.ts";
import { MarkdownHandler } from "../src/lib/markdown-handler.ts";
import { join } from "@std/path";

Deno.test("ProjectTemplate - constructor with default options", () => {
  const template = new ProjectTemplate();
  const project = template.create();

  assertEquals(project.attrs.name, "Untitled Project");
  assertEquals(project.attrs.description, "A new Conductor project");
  assertEquals(project.attrs.version, "1.0.0");
  assertEquals(project.attrs.status, "draft");
  assertEquals(project.attrs.mode, "discovery");
});

Deno.test("ProjectTemplate - constructor with custom MarkdownHandler", () => {
  const customHandler = new MarkdownHandler({
    defaultAttrs: { customField: "test" },
  });
  const template = new ProjectTemplate(customHandler);
  const project = template.create();

  assertEquals((project.attrs as unknown as Record<string, unknown>).customField, "test");
});

Deno.test("ProjectTemplate - create with basic options", () => {
  const options: ProjectTemplateOptions = {
    name: "Test Project",
    description: "A test project for unit testing",
    version: "2.0.0",
    mode: "planning",
    tags: ["test", "development"],
  };

  const project = projectTemplate.create(options);

  assertEquals(project.attrs.name, "Test Project");
  assertEquals(project.attrs.description, "A test project for unit testing");
  assertEquals(project.attrs.version, "2.0.0");
  assertEquals(project.attrs.mode, "planning");
  assertEquals(project.attrs.tags, ["test", "development"]);
  assertEquals(project.attrs.status, "draft");
  assertEquals(project.attrs.phase, "discovery");
});

Deno.test("ProjectTemplate - create with custom fields", () => {
  const options: ProjectTemplateOptions = {
    name: "Custom Project",
    customFields: {
      author: "Test Author",
      repository: "https://github.com/test/repo",
      license: "MIT",
    },
  };

  const project = projectTemplate.create(options);

  assertEquals(project.attrs.author, "Test Author");
  assertEquals(project.attrs.repository, "https://github.com/test/repo");
  assertEquals(project.attrs.license, "MIT");
});

Deno.test("ProjectTemplate - create with custom body template", () => {
  const customBody = "# Custom Template\n\nThis is a custom body template.";
  const options: ProjectTemplateOptions = {
    name: "Custom Body Project",
    bodyTemplate: customBody,
  };

  const project = projectTemplate.create(options);
  assertEquals(project.body, customBody);
});

Deno.test("ProjectTemplate - update existing project", () => {
  const original = projectTemplate.create({
    name: "Original Project",
    version: "1.0.0",
  });

  const updated = projectTemplate.update(original, {
    version: "1.1.0",
    status: "active" as const,
    author: "New Author",
  });

  assertEquals(updated.attrs.name, "Original Project"); // preserved
  assertEquals(updated.attrs.version, "1.1.0"); // updated
  assertEquals(updated.attrs.status, "active"); // updated
  assertEquals(updated.attrs.author, "New Author"); // added
  assertEquals(updated.body, original.body); // preserved by default
  assertEquals(typeof updated.attrs.modified, "string"); // timestamp updated
});

Deno.test("ProjectTemplate - update with body replacement", () => {
  const original = projectTemplate.create({
    name: "Test Project",
    mode: "discovery",
  });

  const updated = projectTemplate.update(
    original,
    { mode: "build" },
    false, // don't preserve body
  );

  assertEquals(updated.attrs.mode, "build");
  assertEquals(updated.body.includes("## Build Phase"), true);
  assertEquals(updated.body !== original.body, true);
});

Deno.test("ProjectTemplate - fromDirectory", () => {
  const project = projectTemplate.fromDirectory("/home/user/my-project", {
    description: "Generated from directory",
    version: "0.1.0",
  });

  assertEquals(project.attrs.name, "my-project");
  assertEquals(project.attrs.description, "Generated from directory");
  assertEquals(project.attrs.version, "0.1.0");
});

Deno.test("ProjectTemplate - fromDirectory with Windows path", () => {
  const project = projectTemplate.fromDirectory("C:\\Users\\test\\my-project");
  assertEquals(project.attrs.name, "my-project");
});

Deno.test("ProjectTemplate - validate valid project", () => {
  const project = projectTemplate.create({
    name: "Valid Project",
    version: "1.2.3",
    mode: "build",
    customFields: { status: "active" },
  });

  const result = projectTemplate.validate(project);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("ProjectTemplate - validate invalid project - missing name", () => {
  // Create project with empty name and manually override it
  const project = projectTemplate.create({ name: "test" });
  project.attrs.name = ""; // Manually set empty name to test validation

  const result = projectTemplate.validate(project);
  assertEquals(result.valid, false);
  assertEquals(result.errors.length, 1);
  assertEquals(result.errors[0].includes("Project name is required"), true);
});

Deno.test("ProjectTemplate - validate invalid project - invalid version", () => {
  const project = projectTemplate.create({
    name: "Test Project",
    version: "invalid-version",
  });

  const result = projectTemplate.validate(project);
  assertEquals(result.valid, false);
  assertEquals(result.errors[0].includes("Valid version"), true);
});

Deno.test("ProjectTemplate - validate invalid project - invalid mode", () => {
  const project = projectTemplate.create({
    name: "Test Project",
    customFields: { mode: "invalid-mode" },
  });

  const result = projectTemplate.validate(project);
  assertEquals(result.valid, false);
  assertEquals(result.errors[0].includes("Invalid mode"), true);
});

Deno.test("ProjectTemplate - validate invalid project - invalid status", () => {
  const project = projectTemplate.create({
    name: "Test Project",
    customFields: { status: "invalid-status" },
  });

  const result = projectTemplate.validate(project);
  assertEquals(result.valid, false);
  assertEquals(result.errors[0].includes("Invalid status"), true);
});

Deno.test("ProjectTemplate - changeMode", () => {
  const original = projectTemplate.create({
    name: "Mode Test",
    mode: "discovery",
  });

  const updated = projectTemplate.changeMode(original, "build", true);

  assertEquals(updated.attrs.mode, "build");
  assertEquals(updated.attrs.phase, "implementation");
  assertEquals(updated.body.includes("## Build Phase"), true);
  assertEquals(updated.body.includes("Development Tasks"), true);
});

Deno.test("ProjectTemplate - changeMode without body update", () => {
  const original = projectTemplate.create({
    name: "Mode Test",
    mode: "discovery",
  });

  const updated = projectTemplate.changeMode(original, "test", false);

  assertEquals(updated.attrs.mode, "test");
  assertEquals(updated.attrs.phase, "validation");
  assertEquals(updated.body, original.body); // preserved
});

Deno.test("ProjectTemplate - getAvailableTemplates", () => {
  const templates = projectTemplate.getAvailableTemplates();

  assertEquals(templates.length, 6);
  assertEquals(templates[0].name, "discovery");
  assertEquals(templates[1].name, "planning");
  assertEquals(templates[2].name, "design");
  assertEquals(templates[3].name, "build");
  assertEquals(templates[4].name, "test");
  assertEquals(templates[5].name, "polish");

  // Check that each template has required fields
  templates.forEach((template) => {
    assertEquals(typeof template.name, "string");
    assertEquals(typeof template.description, "string");
    assertEquals(typeof template.mode, "string");
  });
});

Deno.test("ProjectTemplate - mode-specific templates", () => {
  const modes = ["discovery", "planning", "design", "build", "test", "polish"];

  modes.forEach((mode) => {
    const project = projectTemplate.create({
      name: `${mode} Project`,
      mode: mode,
    });

    // Check that mode-specific content is included
    const expectedContent = {
      discovery: "Discovery Phase",
      planning: "Planning Phase",
      design: "Design Phase",
      build: "Build Phase",
      test: "Test Phase",
      polish: "Polish Phase",
    };

    assertEquals(
      project.body.includes(expectedContent[mode as keyof typeof expectedContent]),
      true,
    );
  });
});

Deno.test("ProjectTemplate - default body template structure", () => {
  const project = projectTemplate.create({
    name: "Structure Test",
    description: "Testing template structure",
    tags: ["test", "structure"],
  });

  // Check for required sections
  assertEquals(project.body.includes("# Structure Test"), true);
  assertEquals(project.body.includes("## Overview"), true);
  assertEquals(project.body.includes("## Project Information"), true);
  assertEquals(project.body.includes("- **Version**:"), true);
  assertEquals(project.body.includes("- **Created**:"), true);
  assertEquals(project.body.includes("- **Status**:"), true);
  assertEquals(project.body.includes("- **Tags**: test, structure"), true);
  assertEquals(project.body.includes("*This project file was generated"), true);
});

Deno.test("ProjectTemplate - timestamp handling", async () => {
  const project1 = projectTemplate.create({ name: "Time Test 1" });

  assertEquals(typeof project1.attrs.created, "string");
  assertEquals(typeof project1.attrs.modified, "string");
  assertEquals(project1.attrs.created, project1.attrs.modified); // same on creation

  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Update should change modified but not created
  const updated = projectTemplate.update(project1, { version: "1.1.0" });
  assertEquals(updated.attrs.created, project1.attrs.created); // preserved
  assertEquals(updated.attrs.modified !== project1.attrs.modified, true); // changed
});

// Integration test with file I/O
Deno.test("ProjectTemplate - file operations integration", async () => {
  const tempDir = await Deno.makeTempDir();
  const projectFile = join(tempDir, "project.md");

  try {
    // Create project template
    const project = projectTemplate.create({
      name: "File Test Project",
      description: "Testing file operations",
      mode: "build",
    });

    // Write to file using markdown handler
    await new MarkdownHandler().writeFile(projectFile, project);

    // Read back and verify
    const readProject = await new MarkdownHandler().readFile<ProjectSchema>(projectFile);

    assertEquals(readProject.attrs.name, "File Test Project");
    assertEquals(readProject.attrs.description, "Testing file operations");
    assertEquals(readProject.attrs.mode, "build");
    assertEquals(readProject.body.includes("## Build Phase"), true);
  } finally {
    // Cleanup
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ProjectTemplate - edge cases", () => {
  // Empty project name edge case - should use default if empty
  const emptyName = projectTemplate.create({ name: "" });
  assertEquals(emptyName.attrs.name, "Untitled Project"); // Empty name gets default

  // No description edge case - empty description gets default
  const noDesc = projectTemplate.create({ name: "No Desc", description: "" });
  assertEquals(noDesc.attrs.description, "A new Conductor project"); // Empty description gets default
  assertEquals(noDesc.body.includes("# No Desc"), true); // title should be there

  // Empty tags array
  const emptyTags = projectTemplate.create({ name: "Empty Tags", tags: [] });
  assertEquals(emptyTags.attrs.tags, []);
  assertEquals(emptyTags.body.includes("- **Tags**:"), false); // tags section omitted

  // Unknown mode falls back to discovery template
  const unknownMode = projectTemplate.create({
    name: "Unknown Mode",
    mode: "unknown-mode",
  });
  assertEquals(unknownMode.body.includes("Discovery Phase"), true);
});

Deno.test("ProjectTemplate - version validation edge cases", () => {
  const template = new ProjectTemplate();

  // Valid semver variations
  const validVersions = ["1.0.0", "1.2.3-alpha", "2.0.0-beta.1", "1.0.0+build.1"];
  validVersions.forEach((version) => {
    const project = template.create({ name: "Test", version });
    const result = template.validate(project);
    assertEquals(result.valid, true, `Version ${version} should be valid`);
  });

  // Invalid versions
  const invalidVersions = ["1.0", "v1.0.0", "1.0.0.0", "invalid"];
  invalidVersions.forEach((version) => {
    const project = template.create({ name: "Test", version });
    const result = template.validate(project);
    assertEquals(result.valid, false, `Version ${version} should be invalid`);
  });

  // Test empty version separately by manually setting it
  const emptyVersionProject = template.create({ name: "Test", version: "1.0.0" });
  emptyVersionProject.attrs.version = "";
  const emptyResult = template.validate(emptyVersionProject);
  assertEquals(emptyResult.valid, false, "Empty version should be invalid");
});

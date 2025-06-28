/**
 * Tests for FileSystemManager
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.207.0/assert/mod.ts";
import { exists } from "https://deno.land/std@0.207.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.207.0/path/mod.ts";
import { FileSystemManager } from "../src/lib/file-system.ts";

Deno.test("FileSystemManager - initialization", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const fsManager = new FileSystemManager(tempDir);

    // Verify .conductor doesn't exist yet
    assertEquals(await fsManager.exists(), false);

    // Initialize directory structure
    await fsManager.initialize();

    // Verify .conductor now exists
    assertEquals(await fsManager.exists(), true);

    // Verify all mode directories were created
    const modes = ["discovery", "planning", "design", "build", "test", "polish"];
    for (const mode of modes) {
      const modePath = join(tempDir, ".conductor", mode);
      assertExists(await exists(modePath), `Mode directory ${mode} should exist`);
    }
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("FileSystemManager - validation", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const fsManager = new FileSystemManager(tempDir);

    // Validate before initialization
    const beforeResult = await fsManager.validate();
    assertEquals(beforeResult.valid, false);
    assertEquals(beforeResult.missing.length > 0, true);
    assertEquals(beforeResult.missing.includes(".conductor"), true);

    // Initialize and validate
    await fsManager.initialize();
    const afterResult = await fsManager.validate();
    assertEquals(afterResult.valid, true);
    assertEquals(afterResult.missing.length, 0);

    // Remove a mode directory and validate again
    await Deno.remove(join(tempDir, ".conductor", "discovery"));
    const missingResult = await fsManager.validate();
    assertEquals(missingResult.valid, false);
    assertEquals(missingResult.missing.includes(".conductor/discovery"), true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("FileSystemManager - path helpers", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const fsManager = new FileSystemManager(tempDir);

    // Test conductorPath
    assertEquals(fsManager.conductorPath, join(tempDir, ".conductor"));

    // Test getModePath
    assertEquals(fsManager.getModePath("discovery"), join(tempDir, ".conductor", "discovery"));
    assertEquals(fsManager.getModePath("build"), join(tempDir, ".conductor", "build"));

    // Test getFilePath
    assertEquals(fsManager.getFilePath("project.md"), join(tempDir, ".conductor", "project.md"));
    assertEquals(
      fsManager.getFilePath("discovery/notes.md"),
      join(tempDir, ".conductor", "discovery", "notes.md"),
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("FileSystemManager - file operations", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const fsManager = new FileSystemManager(tempDir);
    await fsManager.initialize();

    // Test ensureDirectory
    await fsManager.ensureDirectory("custom/nested");
    assertExists(await exists(join(tempDir, ".conductor", "custom", "nested")));

    // Test fileExists
    assertEquals(await fsManager.fileExists("custom/nested"), true);
    assertEquals(await fsManager.fileExists("nonexistent"), false);

    // Create a file and test fileExists
    const testFile = join(tempDir, ".conductor", "test.md");
    await Deno.writeTextFile(testFile, "test content");
    assertEquals(await fsManager.fileExists("test.md"), true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

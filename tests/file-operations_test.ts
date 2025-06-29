/**
 * Tests for FileOperations API
 */

import { assertEquals, assertThrows } from "@std/assert";
import { join } from "@std/path";
import { ensureDir, exists } from "@std/fs";
import {
  type FileMetadata,
  type FileOperationOptions,
  FileOperations,
  fileOperations,
} from "../src/lib/file-operations.ts";

// Helper function to create a test file operations instance with temp directory
async function createTestFileOps(): Promise<
  { fileOps: FileOperations; tempDir: string; cleanup: () => Promise<void> }
> {
  const tempDir = await Deno.makeTempDir({ prefix: "conductor_test_" });
  const fileOps = new FileOperations(tempDir);
  await fileOps.initialize();

  return {
    fileOps,
    tempDir,
    cleanup: async () => {
      await Deno.remove(tempDir, { recursive: true });
    },
  };
}

Deno.test("FileOperations - initialization", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    // Verify .conductor directory structure was created
    const validation = await fileOps.validateStructure();
    assertEquals(validation.valid, true);
    assertEquals(validation.missing.length, 0);
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - basic read/write operations", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const testContent = "Hello, World!\nThis is a test file.";
    const testPath = "test.txt";

    // Write file
    const writeResult = await fileOps.writeFile(testPath, testContent);
    assertEquals(writeResult.success, true);
    assertEquals(typeof writeResult.bytesWritten, "number");
    assertEquals(writeResult.bytesWritten > 0, true);

    // Verify file exists
    assertEquals(await fileOps.exists(testPath), true);

    // Read file
    const { content, metadata } = await fileOps.readFile(testPath);
    assertEquals(content.trim(), testContent);
    assertEquals(metadata.size > 0, true);
    assertEquals(metadata.encoding, "utf-8");
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - atomic write operations", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const testContent = "Atomic write test content";
    const testPath = "atomic-test.txt";

    // Write with atomic operations enabled
    const writeResult = await fileOps.writeFile(testPath, testContent, { atomicWrite: true });
    assertEquals(writeResult.success, true);
    assertEquals(writeResult.tempPath !== undefined, true);

    // Verify content is correct
    const { content } = await fileOps.readFile(testPath);
    assertEquals(content.trim(), testContent);
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - file update operations", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const initialContent = "Initial content\nLine 2";
    const testPath = "update-test.txt";

    // Create initial file
    await fileOps.writeFile(testPath, initialContent);

    // Update file content
    const updateResult = await fileOps.updateFile(testPath, (content) => {
      return content + "\nAppended line";
    });

    assertEquals(updateResult.success, true);

    // Verify updated content
    const { content } = await fileOps.readFile(testPath);
    assertEquals(content.includes("Initial content"), true);
    assertEquals(content.includes("Appended line"), true);
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - delete operations", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const testPath = "delete-test.txt";

    // Create file
    await fileOps.writeFile(testPath, "Content to be deleted");
    assertEquals(await fileOps.exists(testPath), true);

    // Delete file
    await fileOps.deleteFile(testPath);
    assertEquals(await fileOps.exists(testPath), false);
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - copy operations", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const sourceContent = "Content to copy";
    const sourcePath = "source.txt";
    const destPath = "destination.txt";

    // Create source file
    await fileOps.writeFile(sourcePath, sourceContent);

    // Copy file
    await fileOps.copyFile(sourcePath, destPath);

    // Verify both files exist with same content
    assertEquals(await fileOps.exists(sourcePath), true);
    assertEquals(await fileOps.exists(destPath), true);

    const { content: sourceReadContent } = await fileOps.readFile(sourcePath);
    const { content: destReadContent } = await fileOps.readFile(destPath);
    assertEquals(sourceReadContent, destReadContent);
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - move operations", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const originalContent = "Content to move";
    const sourcePath = "move-source.txt";
    const destPath = "move-destination.txt";

    // Create source file
    await fileOps.writeFile(sourcePath, originalContent);

    // Move file
    await fileOps.moveFile(sourcePath, destPath);

    // Verify source doesn't exist and destination does
    assertEquals(await fileOps.exists(sourcePath), false);
    assertEquals(await fileOps.exists(destPath), true);

    // Verify content is preserved
    const { content } = await fileOps.readFile(destPath);
    assertEquals(content.trim(), originalContent);
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - list files", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    // Create multiple test files
    await fileOps.writeFile("file1.txt", "Content 1");
    await fileOps.writeFile("file2.md", "# Markdown content");
    await fileOps.writeFile("discovery/notes.txt", "Discovery notes");

    // List all files (recursive to include subdirectory files)
    const allFiles = await fileOps.listFiles("", { recursive: true });
    assertEquals(allFiles.length >= 3, true);

    // Check that files have metadata
    allFiles.forEach((file) => {
      assertEquals(typeof file.path, "string");
      assertEquals(typeof file.size, "number");
      assertEquals(file.created instanceof Date, true);
      assertEquals(file.modified instanceof Date, true);
    });

    // List files with pattern filter
    const txtFiles = await fileOps.listFiles("", { pattern: /\.txt$/ });
    assertEquals(txtFiles.every((f) => f.path.endsWith(".txt")), true);
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - file metadata", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const testContent = "Test content for metadata";
    const testPath = "metadata-test.txt";

    await fileOps.writeFile(testPath, testContent);

    const metadata = await fileOps.getMetadata(testPath);
    assertEquals(metadata.path, testPath);
    assertEquals(metadata.size > 0, true);
    assertEquals(metadata.encoding, "utf-8");
    assertEquals(metadata.created instanceof Date, true);
    assertEquals(metadata.modified instanceof Date, true);
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - directory creation", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const nestedPath = "deeply/nested/directory/file.txt";
    const content = "Content in nested directory";

    // Write file with createDirs option
    await fileOps.writeFile(nestedPath, content, { createDirs: true });

    // Verify file was created
    assertEquals(await fileOps.exists(nestedPath), true);

    const { content: readContent } = await fileOps.readFile(nestedPath);
    assertEquals(readContent.trim(), content);
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - content validation", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const testPath = "validation-test.txt";

    // Test size limit validation
    const largeContent = "x".repeat(1000);
    const smallSizeLimit = { maxSize: 500, validateSize: true };

    let errorThrown = false;
    try {
      await fileOps.writeFile(testPath, largeContent, smallSizeLimit);
    } catch (error) {
      errorThrown = true;
      assertEquals(error instanceof Error, true);
      if (error instanceof Error) {
        assertEquals(error.message.includes("exceeds maximum"), true);
      }
    }
    assertEquals(errorThrown, true, "Expected size limit error to be thrown");

    // Test binary content validation
    const binaryContent = "Hello\0World";
    errorThrown = false;
    try {
      await fileOps.writeFile(testPath, binaryContent);
    } catch (error) {
      errorThrown = true;
      assertEquals(error instanceof Error, true);
      if (error instanceof Error) {
        assertEquals(error.message.includes("Binary content not allowed"), true);
      }
    }
    assertEquals(errorThrown, true, "Expected binary content error to be thrown");
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - line ending normalization", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const testPath = "line-endings-test.txt";

    // Test various line ending formats
    const mixedContent = "Line 1\r\nLine 2\rLine 3\nLine 4";
    await fileOps.writeFile(testPath, mixedContent);

    // Read back and verify normalization
    const { content } = await fileOps.readFile(testPath);
    assertEquals(content.includes("\r"), false, "Should not contain carriage returns");
    assertEquals(content.split("\n").length >= 4, true, "Should have proper line breaks");

    // Verify content ends with newline
    assertEquals(content.endsWith("\n"), true, "Should end with newline");
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - error handling", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    // Test reading non-existent file
    let errorThrown = false;
    try {
      await fileOps.readFile("nonexistent.txt");
    } catch (error) {
      errorThrown = true;
      assertEquals(error instanceof Error, true);
      if (error instanceof Error) {
        assertEquals(
          error.message.includes("not found") || error.message.includes("File validation failed"),
          true,
        );
      }
    }
    assertEquals(errorThrown, true, "Expected file not found error");

    // Test deleting non-existent file
    errorThrown = false;
    try {
      await fileOps.deleteFile("nonexistent.txt");
    } catch (error) {
      errorThrown = true;
      assertEquals(error instanceof Error, true);
      if (error instanceof Error) {
        assertEquals(
          error.message.includes("not found") || error.message.includes("File validation failed"),
          true,
        );
      }
    }
    assertEquals(errorThrown, true, "Expected delete error for non-existent file");

    // Test getting metadata for non-existent file
    errorThrown = false;
    try {
      await fileOps.getMetadata("nonexistent.txt");
    } catch (error) {
      errorThrown = true;
      assertEquals(error instanceof Error, true);
    }
    assertEquals(errorThrown, true, "Expected metadata error for non-existent file");
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - backup functionality", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const testPath = "backup-test.txt";
    const originalContent = "Original content";
    const updatedContent = "Updated content";

    // Create initial file
    await fileOps.writeFile(testPath, originalContent);

    // Update with backup enabled
    await fileOps.updateFile(
      testPath,
      () => updatedContent,
      { backup: true },
    );

    // Verify main file has updated content
    const { content } = await fileOps.readFile(testPath);
    assertEquals(content.trim(), updatedContent);

    // Verify backup file exists (we can't easily predict exact name due to timestamp)
    const allFiles = await fileOps.listFiles();
    const backupFiles = allFiles.filter((f) => f.path.includes("backup"));
    assertEquals(backupFiles.length >= 1, true, "Should have at least one backup file");
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - recursive file listing", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    // Create files in different subdirectories
    await fileOps.writeFile("root-file.txt", "Root level");
    await fileOps.writeFile("discovery/discovery-file.txt", "Discovery content");
    await fileOps.writeFile("planning/deep/nested-file.txt", "Nested content");

    // List files recursively
    const allFiles = await fileOps.listFiles("", { recursive: true });
    assertEquals(allFiles.length >= 3, true);

    // Check that nested files are included
    const nestedFile = allFiles.find((f) => f.path.includes("nested-file.txt"));
    assertEquals(nestedFile !== undefined, true, "Should find nested file");
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - concurrent access simulation", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const testPath = "concurrent-test.txt";
    const baseContent = "Base content\n";

    // Simulate concurrent writes using atomic operations
    const writePromises = Array.from({ length: 5 }, (_, i) => {
      return fileOps.writeFile(`${testPath}.${i}`, `${baseContent}Write ${i}`, {
        atomicWrite: true,
      });
    });

    // All writes should succeed
    const results = await Promise.all(writePromises);
    results.forEach((result, i) => {
      assertEquals(result.success, true, `Write ${i} should succeed`);
    });

    // Verify all files were created with correct content
    for (let i = 0; i < 5; i++) {
      const { content } = await fileOps.readFile(`${testPath}.${i}`);
      assertEquals(content.includes(`Write ${i}`), true);
    }
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - default instance", async () => {
  // Test that the default instance exists and can be used
  assertEquals(typeof fileOperations.readFile, "function");
  assertEquals(typeof fileOperations.writeFile, "function");
  assertEquals(typeof fileOperations.exists, "function");

  // Test validation method works
  const validation = await fileOperations.validateStructure();
  assertEquals(typeof validation.valid, "boolean");
  assertEquals(Array.isArray(validation.missing), true);
});

Deno.test("FileOperations - file encoding verification", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    const testPath = "encoding-test.txt";
    const unicodeContent = "Hello 世界! 🌍 Émojis and spéciàl çhars";

    // Write unicode content
    await fileOps.writeFile(testPath, unicodeContent);

    // Read back and verify encoding is preserved
    const { content, metadata } = await fileOps.readFile(testPath);
    assertEquals(content.trim(), unicodeContent);
    assertEquals(metadata.encoding, "utf-8");
  } finally {
    await cleanup();
  }
});

Deno.test("FileOperations - edge cases", async () => {
  const { fileOps, cleanup } = await createTestFileOps();

  try {
    // Test empty file
    const emptyPath = "empty.txt";
    await fileOps.writeFile(emptyPath, "");

    const { content: emptyContent, metadata } = await fileOps.readFile(emptyPath);
    assertEquals(emptyContent, ""); // Empty content should remain empty
    assertEquals(metadata.size === 0, true); // Empty file should have 0 bytes

    // Test file with only whitespace
    const whitespacePath = "whitespace.txt";
    await fileOps.writeFile(whitespacePath, "   \t  \n  ");

    const { content: whitespaceContent } = await fileOps.readFile(whitespacePath);
    assertEquals(whitespaceContent.length > 0, true);

    // Test very long filename
    const longName = "a".repeat(100) + ".txt";
    await fileOps.writeFile(longName, "Long filename test");
    assertEquals(await fileOps.exists(longName), true);
  } finally {
    await cleanup();
  }
});

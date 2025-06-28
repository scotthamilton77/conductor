/**
 * Tests for ConfigManager
 */

import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { exists } from "@std/fs";
import { join } from "@std/path";
import {
  type ConductorConfig,
  ConfigManager,
  ConfigValidationError,
} from "../src/lib/config-manager.ts";

Deno.test("ConfigManager - initialization and default config creation", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const configManager = new ConfigManager(tempDir);

    // Verify config doesn't exist yet
    assertEquals(await configManager.exists(), false);

    // Load config (should create default)
    const config = await configManager.load();

    // Verify config now exists
    assertEquals(await configManager.exists(), true);

    // Verify default values
    assertEquals(config.version, "1.0.0");
    assertEquals(config.defaultMode, "discovery");
    assertEquals(config.filePaths.projectFile, "project.md");
    assertEquals(config.git.enabled, true);
    assertEquals(config.userPreferences.autoSave, true);

    // Verify timestamps are set
    assertExists(config.created);
    assertExists(config.lastModified);

    // Verify file was actually created
    const configPath = join(tempDir, ".conductor", "config.json");
    assertExists(await exists(configPath));
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ConfigManager - configuration validation", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const configManager = new ConfigManager(tempDir);

    // Test valid config
    const validConfig: ConductorConfig = {
      version: "1.0.0",
      defaultMode: "planning",
      filePaths: {
        projectFile: "project.md",
        templatesDir: "templates",
        notesDir: "notes",
      },
      git: {
        enabled: false,
        autoCommit: true,
        commitPrefix: "[test]",
      },
      userPreferences: {
        autoSave: false,
        confirmOnModeSwitch: false,
        showHints: false,
        editorPreference: "external",
      },
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    await configManager.save(validConfig);
    const loadedConfig = await configManager.load();
    assertEquals(loadedConfig.defaultMode, "planning");
    assertEquals(loadedConfig.git.enabled, false);
    assertEquals(loadedConfig.userPreferences.editorPreference, "external");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ConfigManager - validation errors", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const configManager = new ConfigManager(tempDir);

    // Create invalid config file manually
    await configManager.load(); // Create .conductor directory
    const configPath = join(tempDir, ".conductor", "config.json");

    // Test invalid defaultMode
    const invalidConfig = {
      version: "1.0.0",
      defaultMode: "invalid-mode",
      filePaths: {
        projectFile: "project.md",
        templatesDir: "templates",
        notesDir: "notes",
      },
      git: {
        enabled: true,
        autoCommit: false,
        commitPrefix: "[conductor]",
      },
      userPreferences: {
        autoSave: true,
        confirmOnModeSwitch: true,
        showHints: true,
        editorPreference: "internal",
      },
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    await Deno.writeTextFile(configPath, JSON.stringify(invalidConfig));

    await assertRejects(
      () => configManager.load(),
      ConfigValidationError,
      "defaultMode must be one of:",
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ConfigManager - missing required fields", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const configManager = new ConfigManager(tempDir);
    await configManager.load(); // Create .conductor directory
    const configPath = join(tempDir, ".conductor", "config.json");

    // Test missing filePaths
    const incompleteConfig = {
      version: "1.0.0",
      defaultMode: "discovery",
      // missing filePaths
      git: {
        enabled: true,
        autoCommit: false,
        commitPrefix: "[conductor]",
      },
      userPreferences: {
        autoSave: true,
        confirmOnModeSwitch: true,
        showHints: true,
        editorPreference: "internal",
      },
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    await Deno.writeTextFile(configPath, JSON.stringify(incompleteConfig));

    await assertRejects(
      () => configManager.load(),
      ConfigValidationError,
      "filePaths must be an object",
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ConfigManager - configuration updates", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const configManager = new ConfigManager(tempDir);

    // Load initial config
    await configManager.load();

    // Update specific values
    const updatedConfig = await configManager.updateConfig({
      defaultMode: "build",
      git: {
        enabled: false,
        autoCommit: true,
        commitPrefix: "[updated]",
      },
    });

    assertEquals(updatedConfig.defaultMode, "build");
    assertEquals(updatedConfig.git.enabled, false);
    assertEquals(updatedConfig.git.autoCommit, true);
    assertEquals(updatedConfig.git.commitPrefix, "[updated]");

    // Verify other values are preserved
    assertEquals(updatedConfig.filePaths.projectFile, "project.md");
    assertEquals(updatedConfig.userPreferences.autoSave, true);

    // Reload and verify persistence
    const reloadedConfig = await configManager.load();
    assertEquals(reloadedConfig.defaultMode, "build");
    assertEquals(reloadedConfig.git.commitPrefix, "[updated]");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ConfigManager - configuration reset", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const configManager = new ConfigManager(tempDir);

    // Load and modify config
    await configManager.load();
    await configManager.updateConfig({
      defaultMode: "polish",
      git: { enabled: false, autoCommit: true, commitPrefix: "[custom]" },
    });

    // Verify changes
    const config = await configManager.getConfig();
    assertEquals(config.defaultMode, "polish");
    assertEquals(config.git.enabled, false);

    // Reset to defaults
    const resetConfig = await configManager.reset();
    assertEquals(resetConfig.defaultMode, "discovery");
    assertEquals(resetConfig.git.enabled, true);
    assertEquals(resetConfig.git.commitPrefix, "[conductor]");

    // Verify reset persisted
    const reloadedConfig = await configManager.load();
    assertEquals(reloadedConfig.defaultMode, "discovery");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ConfigManager - corruption recovery", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const configManager = new ConfigManager(tempDir);

    // Create .conductor directory
    await configManager.load();
    const configPath = join(tempDir, ".conductor", "config.json");

    // Create corrupted JSON file
    await Deno.writeTextFile(configPath, "{ invalid json }");

    // Test validation and recovery
    const result = await configManager.validateAndRecover();
    assertEquals(result.valid, true);
    assertEquals(result.recovered, true);
    assertExists(result.errors);

    // Verify config is now valid
    const config = await configManager.load();
    assertEquals(config.defaultMode, "discovery");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ConfigManager - caching behavior", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const configManager = new ConfigManager(tempDir);

    // First load
    const config1 = await configManager.getConfig();
    assertEquals(config1.defaultMode, "discovery");

    // Second call should return cached version
    const config2 = await configManager.getConfig();
    assertEquals(config1, config2); // Same object reference

    // Update should update cache
    const updatedConfig = await configManager.updateConfig({
      defaultMode: "planning",
    });
    assertEquals(updatedConfig.defaultMode, "planning");

    // getConfig should return updated cached version
    const config3 = await configManager.getConfig();
    assertEquals(config3.defaultMode, "planning");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ConfigManager - timestamp handling", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const configManager = new ConfigManager(tempDir);

    // Load initial config
    const config1 = await configManager.load();
    const initialModified = config1.lastModified;

    // Wait a bit and update
    await new Promise((resolve) => setTimeout(resolve, 10));

    await configManager.updateConfig({
      defaultMode: "build",
    });

    const config2 = await configManager.getConfig();

    // lastModified should be updated
    assertEquals(config2.created, config1.created);
    assertEquals(config2.lastModified !== initialModified, true);

    // Verify timestamp is valid ISO string
    assertExists(new Date(config2.lastModified));
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ConfigManager - deep merge behavior", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const configManager = new ConfigManager(tempDir);

    await configManager.load();

    // Update only part of nested object
    await configManager.updateConfig({
      git: {
        enabled: false,
        autoCommit: false,
        commitPrefix: "[conductor]",
      },
    });

    const config = await configManager.getConfig();

    // Should preserve other git properties
    assertEquals(config.git.enabled, false);
    assertEquals(config.git.autoCommit, false); // Should be preserved
    assertEquals(config.git.commitPrefix, "[conductor]"); // Should be preserved
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

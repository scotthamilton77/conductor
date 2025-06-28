/**
 * Configuration Manager for Conductor Settings
 *
 * Manages .conductor/config.json with Conductor-specific settings,
 * validation, and default value management.
 */

import { exists } from "@std/fs";
import { join } from "@std/path";
import { FileSystemManager } from "./file-system.ts";

/**
 * Conductor-specific configuration schema
 */
export interface ConductorConfig {
  version: string;
  defaultMode: "discovery" | "planning" | "design" | "build" | "test" | "polish";
  filePaths: {
    projectFile: string;
    templatesDir: string;
    notesDir: string;
  };
  git: {
    enabled: boolean;
    autoCommit: boolean;
    commitPrefix: string;
  };
  userPreferences: {
    autoSave: boolean;
    confirmOnModeSwitch: boolean;
    showHints: boolean;
    editorPreference: "internal" | "external";
  };
  created: string;
  lastModified: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ConductorConfig = {
  version: "1.0.0",
  defaultMode: "discovery",
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

/**
 * Configuration validation errors
 */
export class ConfigValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Configuration validation failed:\n${errors.join("\n")}`);
    this.name = "ConfigValidationError";
  }
}

/**
 * Configuration Manager for Conductor settings
 */
export class ConfigManager {
  private readonly configFileName = "config.json";
  private fsManager: FileSystemManager;
  private cachedConfig?: ConductorConfig;

  constructor(basePath?: string) {
    this.fsManager = new FileSystemManager(basePath);
  }

  /**
   * Get the full path to the config file
   */
  get configPath(): string {
    return this.fsManager.getFilePath(this.configFileName);
  }

  /**
   * Check if config file exists
   */
  async exists(): Promise<boolean> {
    return await this.fsManager.fileExists(this.configFileName);
  }

  /**
   * Validate configuration object
   */
  private validateConfig(config: unknown): asserts config is ConductorConfig {
    const errors: string[] = [];

    if (!config || typeof config !== "object") {
      errors.push("Configuration must be an object");
      throw new ConfigValidationError(errors);
    }

    const cfg = config as Record<string, unknown>;

    // Check required fields
    if (!cfg.version || typeof cfg.version !== "string") {
      errors.push("version must be a string");
    }

    if (!cfg.defaultMode || typeof cfg.defaultMode !== "string") {
      errors.push("defaultMode must be a string");
    } else {
      const validModes = ["discovery", "planning", "design", "build", "test", "polish"];
      if (!validModes.includes(cfg.defaultMode)) {
        errors.push(`defaultMode must be one of: ${validModes.join(", ")}`);
      }
    }

    // Validate filePaths object
    if (!cfg.filePaths || typeof cfg.filePaths !== "object") {
      errors.push("filePaths must be an object");
    } else {
      const filePaths = cfg.filePaths as Record<string, unknown>;
      if (!filePaths.projectFile || typeof filePaths.projectFile !== "string") {
        errors.push("filePaths.projectFile must be a string");
      }
      if (!filePaths.templatesDir || typeof filePaths.templatesDir !== "string") {
        errors.push("filePaths.templatesDir must be a string");
      }
      if (!filePaths.notesDir || typeof filePaths.notesDir !== "string") {
        errors.push("filePaths.notesDir must be a string");
      }
    }

    // Validate git object
    if (!cfg.git || typeof cfg.git !== "object") {
      errors.push("git must be an object");
    } else {
      const git = cfg.git as Record<string, unknown>;
      if (typeof git.enabled !== "boolean") {
        errors.push("git.enabled must be a boolean");
      }
      if (typeof git.autoCommit !== "boolean") {
        errors.push("git.autoCommit must be a boolean");
      }
      if (!git.commitPrefix || typeof git.commitPrefix !== "string") {
        errors.push("git.commitPrefix must be a string");
      }
    }

    // Validate userPreferences object
    if (!cfg.userPreferences || typeof cfg.userPreferences !== "object") {
      errors.push("userPreferences must be an object");
    } else {
      const prefs = cfg.userPreferences as Record<string, unknown>;
      if (typeof prefs.autoSave !== "boolean") {
        errors.push("userPreferences.autoSave must be a boolean");
      }
      if (typeof prefs.confirmOnModeSwitch !== "boolean") {
        errors.push("userPreferences.confirmOnModeSwitch must be a boolean");
      }
      if (typeof prefs.showHints !== "boolean") {
        errors.push("userPreferences.showHints must be a boolean");
      }
      if (!prefs.editorPreference || typeof prefs.editorPreference !== "string") {
        errors.push("userPreferences.editorPreference must be a string");
      } else if (!["internal", "external"].includes(prefs.editorPreference)) {
        errors.push("userPreferences.editorPreference must be 'internal' or 'external'");
      }
    }

    // Validate timestamps
    if (!cfg.created || typeof cfg.created !== "string") {
      errors.push("created must be a string");
    } else {
      try {
        new Date(cfg.created);
      } catch {
        errors.push("created must be a valid ISO date string");
      }
    }

    if (!cfg.lastModified || typeof cfg.lastModified !== "string") {
      errors.push("lastModified must be a string");
    } else {
      try {
        new Date(cfg.lastModified);
      } catch {
        errors.push("lastModified must be a valid ISO date string");
      }
    }

    if (errors.length > 0) {
      throw new ConfigValidationError(errors);
    }
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<ConductorConfig> {
    // Ensure .conductor directory exists
    await this.fsManager.initialize();

    if (!await this.exists()) {
      // Create default config if it doesn't exist
      await this.save(DEFAULT_CONFIG);
      this.cachedConfig = structuredClone(DEFAULT_CONFIG);
      return this.cachedConfig;
    }

    try {
      const configText = await Deno.readTextFile(this.configPath);
      const config = JSON.parse(configText);

      this.validateConfig(config);

      // Merge with defaults to ensure all fields are present
      const mergedConfig = this.mergeWithDefaults(config);

      this.cachedConfig = mergedConfig;
      return mergedConfig;
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load configuration: ${message}`);
    }
  }

  /**
   * Save configuration to file
   */
  async save(config: ConductorConfig): Promise<void> {
    // Validate before saving
    this.validateConfig(config);

    // Update lastModified timestamp
    const configToSave = {
      ...config,
      lastModified: new Date().toISOString(),
    };

    // Ensure .conductor directory exists
    await this.fsManager.initialize();

    // Write config file
    await Deno.writeTextFile(
      this.configPath,
      JSON.stringify(configToSave, null, 2),
    );

    // Update cache
    this.cachedConfig = configToSave;
  }

  /**
   * Get current configuration (loads if not cached)
   */
  async getConfig(): Promise<ConductorConfig> {
    if (!this.cachedConfig) {
      return await this.load();
    }
    return this.cachedConfig;
  }

  /**
   * Update specific configuration values
   */
  async updateConfig(updates: Partial<ConductorConfig>): Promise<ConductorConfig> {
    const currentConfig = await this.getConfig();
    const updatedConfig = this.deepMerge(currentConfig, updates);

    await this.save(updatedConfig);
    return updatedConfig;
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<ConductorConfig> {
    const resetConfig = {
      ...DEFAULT_CONFIG,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    await this.save(resetConfig);
    return resetConfig;
  }

  /**
   * Check if configuration file is corrupted and attempt recovery
   */
  async validateAndRecover(): Promise<{ valid: boolean; recovered: boolean; errors?: string[] }> {
    try {
      await this.load();
      return { valid: true, recovered: false };
    } catch (error) {
      // Attempt to recover from any error (validation, JSON parsing, etc.)
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errors = error instanceof ConfigValidationError ? error.errors : [errorMessage];

      try {
        await this.reset();
        return { valid: true, recovered: true, errors };
      } catch {
        return { valid: false, recovered: false, errors };
      }
    }
  }

  /**
   * Merge configuration with defaults to ensure all fields are present
   */
  private mergeWithDefaults(config: ConductorConfig): ConductorConfig {
    return this.deepMerge(DEFAULT_CONFIG, config);
  }

  /**
   * Deep merge two configuration objects
   */
  private deepMerge(base: ConductorConfig, override: Partial<ConductorConfig>): ConductorConfig {
    const result = structuredClone(base);

    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined && value !== null) {
        if (
          typeof value === "object" && !Array.isArray(value) &&
          typeof result[key as keyof ConductorConfig] === "object"
        ) {
          // Deep merge nested objects - we know these are safe to cast based on the type check above
          // deno-lint-ignore no-explicit-any
          (result as any)[key] = this.deepMerge(
            // deno-lint-ignore no-explicit-any
            result[key as keyof ConductorConfig] as any,
            // deno-lint-ignore no-explicit-any
            value as any,
          );
        } else {
          // deno-lint-ignore no-explicit-any
          (result as any)[key] = value;
        }
      }
    }

    return result;
  }
}

/**
 * Abstract Mode Base Class
 *
 * Provides foundational implementation for the enhanced mode system.
 * Concrete modes should extend this class and implement the abstract methods.
 */

import { FileOperations } from "../lib/file-operations.ts";
import {
  type Logger,
  type Mode,
  type ModeConfig,
  type ModeResult,
  type ModeState,
  type StateMigration,
  type StateValidationResult,
} from "../lib/types.ts";

/**
 * Abstract base class implementing Mode interface
 * Provides common functionality and patterns for concrete mode implementations
 */
export abstract class AbstractMode implements Mode {
  protected readonly fileOps: FileOperations;
  protected readonly logger: Logger;
  protected readonly prompts: Map<string, string> = new Map();
  protected config: ModeConfig;
  protected initialized = false;

  // State compression configuration
  protected readonly COMPRESSION_THRESHOLD = 10000; // Compress if JSON size exceeds 10KB
  protected readonly COMPRESSION_ENABLED = true;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly version: string = "1.0.0",
    public readonly dependencies: string[] = [],
    fileOps: FileOperations,
    logger: Logger,
    initialConfig?: Partial<ModeConfig>,
  ) {
    this.fileOps = fileOps;
    this.logger = logger;
    this.config = {
      version: this.version,
      enabled: true,
      dependencies: this.dependencies,
      settings: {},
      ...initialConfig,
    };

    this.initializePrompts();
  }

  /**
   * Initialize the mode - must be called before first use
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.debug(`Mode ${this.id} already initialized`);
      return;
    }

    this.logger.info(`Initializing mode: ${this.id} v${this.version}`);

    try {
      // Validate dependencies
      this.validateDependencies();

      // Create mode-specific directories
      this.createModeDirectories();

      // Initialize prompts and configuration
      await this.loadStoredPrompts();

      // Call concrete implementation
      await this.doInitialize();

      this.initialized = true;
      this.logger.info(`Mode ${this.id} initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to initialize mode ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Execute mode operation - maintains backward compatibility with basic Mode interface
   */
  async execute(input: string): Promise<string> {
    const result = await this.executeWithResult<string>(input);
    if (!result.success) {
      throw new Error(result.error || "Mode execution failed");
    }
    return result.data || "";
  }

  /**
   * Enhanced execution with typed results and context
   */
  async executeWithResult<T = unknown>(
    input: string,
    context?: Record<string, unknown>,
  ): Promise<ModeResult<T>> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    this.logger.debug(`Executing mode ${this.id} with input: ${input.slice(0, 100)}...`);

    try {
      // Pre-execution hook
      if (this.onBeforeExecute) {
        await this.onBeforeExecute(context);
      }

      // Main execution - implemented by concrete mode
      const result = await this.doExecute<T>(input, context);

      // Add execution metadata
      const executionTime = Date.now() - startTime;
      const enhancedResult: ModeResult<T> = {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime,
        },
      };

      // Post-execution hook
      if (this.onAfterExecute) {
        await this.onAfterExecute(enhancedResult);
      }

      this.logger.debug(`Mode ${this.id} executed in ${executionTime}ms`);
      return enhancedResult;
    } catch (error) {
      this.logger.error(`Mode ${this.id} execution failed:`, error);

      // Error hook
      if (this.onError && error instanceof Error) {
        await this.onError(error);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Save mode state for context preservation with validation and checksumming
   */
  async saveState(state: Partial<ModeState>): Promise<void> {
    const stateId = state.id || `${this.id}-${Date.now()}`;
    const fullState: ModeState = {
      id: stateId,
      modeId: this.id,
      timestamp: new Date(),
      data: {},
      artifacts: [],
      schemaVersion: this.version,
      ...state,
    };

    // Generate checksum for state integrity BEFORE compression
    fullState.checksum = await this.generateStateChecksum(fullState);

    // Apply compression if data is large
    const dataSize = JSON.stringify(fullState.data).length;
    if (dataSize >= this.COMPRESSION_THRESHOLD && this.COMPRESSION_ENABLED) {
      const compressedData = this.compressStateData(fullState.data);
      fullState.data = { _compressed: compressedData };
      fullState.compressed = true;
      this.logger.debug(`AI: Applied compression to state data (${dataSize} chars)`);
    }

    const statePath = `state/${this.id}/${stateId}.json`;

    // Enhanced error recovery: retry logic with backup
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create backup of existing state if it exists
        if (attempt === 1 && await this.fileOps.exists(statePath)) {
          const backupPath = `${statePath}.backup-${Date.now()}`;
          const existingContent = await this.fileOps.readFile(statePath);
          await this.fileOps.writeFile(backupPath, existingContent.content);
          this.logger.debug(`AI: Created backup of existing state: ${backupPath}`);
        }

        await this.fileOps.writeFile(statePath, JSON.stringify(fullState, null, 2));
        this.logger.debug(
          `AI: Saved state for mode ${this.id}: ${stateId} (v${fullState.schemaVersion})`,
        );
        return; // Success, exit retry loop
      } catch (error) {
        this.logger.warn(`AI: Failed to save state (attempt ${attempt}/${maxRetries}):`, error);

        if (attempt === maxRetries) {
          this.logger.error(`AI: State save failed permanently for ${stateId}`);
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }

  /**
   * Load previously saved state with validation and automatic migration
   */
  async loadState(stateId?: string): Promise<ModeState | null> {
    try {
      if (!stateId) {
        // Find most recent state
        const stateDir = `state/${this.id}`;
        const files = await this.fileOps.listFiles(stateDir);
        if (files.length === 0) return null;

        // Sort by timestamp and get most recent
        files.sort((a, b) => b.path.localeCompare(a.path));
        // Extract just the filename without .json extension
        const filename = files[0].path.split("/").pop() || files[0].path;
        stateId = filename.replace(".json", "");
      }

      const statePath = `state/${this.id}/${stateId}.json`;
      const result = await this.fileOps.readFile(statePath);
      const stateData = result.content;
      let state = JSON.parse(stateData) as ModeState;

      // Convert timestamp string back to Date
      state.timestamp = new Date(state.timestamp);

      // Decompress state data if compressed
      let needsSave = false;
      if (
        state.compressed && state.data && typeof state.data === "object" &&
        state.data._compressed && typeof state.data._compressed === "string"
      ) {
        try {
          state.data = this.decompressStateData(state.data._compressed);
          state.compressed = false; // Mark as decompressed
          // Regenerate checksum for decompressed state
          state.checksum = await this.generateStateChecksum(state);
          needsSave = true; // Flag that we need to save the decompressed state
          this.logger.debug(`AI: Decompressed state data for ${stateId}`);
        } catch (error) {
          this.logger.error(`AI: Failed to decompress state ${stateId}:`, error);
          throw error;
        }
      }

      // Validate state integrity and migrate if necessary
      const validation = await this.validateState(state);

      if (!validation.isValid) {
        this.logger.warn(
          `AI: State validation failed for ${stateId}: ${validation.errors.join(", ")}`,
        );

        if (validation.needsMigration) {
          this.logger.info(
            `AI: Migrating state ${stateId} from v${validation.currentVersion} to v${validation.targetVersion}`,
          );
          state = await this.migrateState(state);
          needsSave = true; // Migration requires save
        } else {
          return null; // State is invalid and cannot be migrated
        }
      } else if (validation.needsMigration) {
        // State is valid but needs migration (legacy format)
        this.logger.info(
          `AI: Migrating state ${stateId} from v${validation.currentVersion} to v${validation.targetVersion}`,
        );
        state = await this.migrateState(state);
        needsSave = true; // Migration requires save
      }

      // Save state if it was decompressed or migrated
      if (needsSave) {
        await this.saveState(state);
        this.logger.debug(`AI: Saved updated state for ${stateId}`);
      }

      this.logger.debug(
        `AI: Loaded state for mode ${this.id}: ${stateId} (v${state.schemaVersion || "legacy"})`,
      );
      return state;
    } catch (error) {
      this.logger.warn(`AI: Failed to load state ${stateId} for mode ${this.id}:`, error);

      // Enhanced error recovery: attempt to load from backup
      if (stateId) {
        const backupState = await this.tryLoadBackupState(stateId);
        if (backupState) {
          this.logger.info(`AI: Recovered state from backup for ${stateId}`);
          return backupState;
        }
      }

      return null;
    }
  }

  /**
   * Clear saved state
   */
  async clearState(stateId?: string): Promise<void> {
    try {
      if (stateId) {
        const statePath = `state/${this.id}/${stateId}.json`;
        await this.fileOps.deleteFile(statePath);
        this.logger.debug(`Cleared state ${stateId} for mode ${this.id}`);
      } else {
        // Clear all states for this mode
        const stateDir = `state/${this.id}`;
        // Clear all state files in the directory
        const files = await this.fileOps.listFiles(stateDir);
        for (const file of files) {
          await this.fileOps.deleteFile(`${stateDir}/${file.path}`);
        }
        this.logger.debug(`Cleared all states for mode ${this.id}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to clear state for mode ${this.id}:`, error);
    }
  }

  /**
   * Validate state integrity and schema compatibility
   */
  async validateState(state: ModeState): Promise<StateValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let needsMigration = false;

    // Basic structure validation
    if (!state.id || typeof state.id !== "string") {
      errors.push("Invalid or missing state ID");
    }
    if (!state.modeId || state.modeId !== this.id) {
      errors.push(`State mode ID mismatch: expected ${this.id}, got ${state.modeId}`);
    }
    if (!state.timestamp || !(state.timestamp instanceof Date)) {
      errors.push("Invalid or missing timestamp");
    }
    if (!state.data || typeof state.data !== "object") {
      errors.push("Invalid or missing data object");
    }

    // Schema version validation
    const currentVersion = state.schemaVersion;
    const targetVersion = this.version;

    if (!currentVersion) {
      warnings.push("Legacy state without schema version");
      needsMigration = true;
    } else if (currentVersion !== targetVersion) {
      warnings.push(`Schema version mismatch: current ${currentVersion}, target ${targetVersion}`);
      needsMigration = true;
    }

    // Checksum validation if present (skip if state was compressed to avoid false positives)
    if (state.checksum && !state.compressed) {
      const expectedChecksum = await this.generateStateChecksum({ ...state, checksum: undefined });
      if (state.checksum !== expectedChecksum) {
        errors.push("State checksum validation failed - possible corruption");
      }
    } else if (!state.checksum) {
      warnings.push("State lacks integrity checksum");
    }

    // Custom validation by concrete mode
    try {
      const customValidation = await this.doValidateState(state);
      errors.push(...customValidation.errors);
      warnings.push(...customValidation.warnings);
      if (customValidation.needsMigration) {
        needsMigration = true;
      }
    } catch (error) {
      warnings.push(
        `Custom validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      needsMigration,
      currentVersion,
      targetVersion,
    };
  }

  /**
   * Migrate state to current schema version
   */
  async migrateState(state: ModeState): Promise<ModeState> {
    try {
      // Apply built-in migrations
      let migratedState = { ...state };

      // Legacy state migration (no schema version)
      if (!migratedState.schemaVersion) {
        migratedState.schemaVersion = "1.0.0";
        this.logger.debug(`AI: Migrated legacy state to v${migratedState.schemaVersion}`);
      }

      // Apply custom migrations
      migratedState = await this.doMigrateState(migratedState);

      // Update to current version and regenerate checksum
      migratedState.schemaVersion = this.version;
      migratedState.checksum = await this.generateStateChecksum(migratedState);

      return migratedState;
    } catch (error) {
      this.logger.error(`AI: State migration failed for mode ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Configure mode settings
   */
  async configure(config: Partial<ModeConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // Persist configuration
    const configPath = `config/${this.id}.json`;
    await this.fileOps.writeFile(configPath, JSON.stringify(this.config, null, 2));
    this.logger.debug(`Updated configuration for mode ${this.id}`);
  }

  /**
   * Validate mode configuration and dependencies
   */
  async validate(): Promise<ModeResult<boolean>> {
    try {
      // Validate configuration
      if (!this.config.enabled) {
        return {
          success: false,
          error: `Mode ${this.id} is disabled`,
        };
      }

      // Validate dependencies
      const missingDeps = this.getMissingDependencies();
      if (missingDeps.length > 0) {
        return {
          success: false,
          error: `Missing dependencies: ${missingDeps.join(", ")}`,
        };
      }

      // Mode-specific validation
      const customValidation = await this.doValidate();

      return {
        success: customValidation.success,
        data: customValidation.success,
        error: customValidation.error,
        metadata: {
          warnings: customValidation.metadata?.warnings,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get current prompt templates
   */
  getPrompts(): Record<string, string> {
    return Object.fromEntries(this.prompts);
  }

  /**
   * Update a specific prompt template
   */
  updatePrompt(key: string, template: string): void {
    this.prompts.set(key, template);
    this.logger.debug(`Updated prompt '${key}' for mode ${this.id}`);
  }

  /**
   * Cleanup resources - implements basic Mode interface
   */
  async cleanup(): Promise<void> {
    this.logger.info(`Cleaning up mode: ${this.id}`);

    try {
      // Mode-specific cleanup
      await this.doCleanup();

      // Clear prompts and reset state
      this.prompts.clear();
      this.initialized = false;

      this.logger.info(`Mode ${this.id} cleaned up successfully`);
    } catch (error) {
      this.logger.error(`Failed to cleanup mode ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Generate checksum for state integrity validation
   */
  protected generateStateChecksum(state: Partial<ModeState>): Promise<string> {
    // Create a copy without checksum for consistent hashing
    const stateForHash = { ...state };
    delete stateForHash.checksum;

    // Convert to consistent string representation
    const stateString = JSON.stringify(stateForHash, Object.keys(stateForHash).sort());

    // Generate simple hash (for demo - production should use crypto)
    let hash = 0;
    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Promise.resolve(Math.abs(hash).toString(16));
  }

  /**
   * Attempt to recover state from backup files
   */
  protected async tryLoadBackupState(stateId: string): Promise<ModeState | null> {
    try {
      const stateDir = `state/${this.id}`;
      const files = await this.fileOps.listFiles(stateDir);

      // Find backup files for this state
      const backupFiles = files
        .filter((file) => file.path.includes(`${stateId}.json.backup-`))
        .sort((a, b) => b.path.localeCompare(a.path)); // Most recent backup first

      for (const backupFile of backupFiles) {
        try {
          const backupPath = backupFile.path;
          const result = await this.fileOps.readFile(backupPath);
          const state = JSON.parse(result.content) as ModeState;

          // Convert timestamp and validate
          state.timestamp = new Date(state.timestamp);
          const validation = await this.validateState(state);

          if (validation.isValid || validation.needsMigration) {
            this.logger.info(`AI: Successfully loaded backup state from ${backupFile.path}`);
            return validation.needsMigration ? await this.migrateState(state) : state;
          }
        } catch (backupError) {
          this.logger.debug(`AI: Backup ${backupFile.path} also corrupted:`, backupError);
          continue;
        }
      }

      return null;
    } catch (error) {
      this.logger.debug(`AI: Backup recovery failed:`, error);
      return null;
    }
  }

  /**
   * Simple compression implementation for large state data
   * Note: In production, consider using proper compression libraries
   */
  protected compressStateData(data: Record<string, unknown>): string {
    if (!this.COMPRESSION_ENABLED) return JSON.stringify(data);

    const jsonString = JSON.stringify(data);
    if (jsonString.length < this.COMPRESSION_THRESHOLD) {
      return jsonString;
    }

    // Simple compression: remove unnecessary whitespace and apply basic encoding
    // In production, use proper compression algorithms like gzip
    const compressed = jsonString
      .replace(/\s+/g, " ")
      .replace(/","/g, '","')
      .replace(/": "/g, '":"')
      .replace(/": {/g, '":{')
      .replace(/}, "/g, '},"');

    this.logger.debug(
      `AI: Compressed state data from ${jsonString.length} to ${compressed.length} chars`,
    );
    return compressed;
  }

  /**
   * Decompress state data
   */
  protected decompressStateData(compressedData: string): Record<string, unknown> {
    try {
      // For our simple compression, just parse the JSON
      // In production, implement proper decompression
      return JSON.parse(compressedData);
    } catch (error) {
      this.logger.error("AI: Failed to decompress state data:", error);
      throw new Error("State data decompression failed");
    }
  }

  // Abstract methods that concrete modes must implement

  /**
   * Mode-specific initialization logic
   */
  protected abstract doInitialize(): Promise<void>;

  /**
   * Core execution logic - implemented by concrete modes
   */
  protected abstract doExecute<T>(
    input: string,
    context?: Record<string, unknown>,
  ): Promise<ModeResult<T>>;

  /**
   * Mode-specific validation logic
   */
  protected abstract doValidate(): Promise<ModeResult<boolean>>;

  /**
   * Mode-specific cleanup logic
   */
  protected abstract doCleanup(): Promise<void>;

  /**
   * Initialize default prompt templates
   */
  protected abstract initializePrompts(): void;

  /**
   * Mode-specific state validation logic
   * Override this method to provide custom state validation for the mode
   */
  protected doValidateState(state: ModeState): Promise<StateValidationResult> {
    // Default implementation - no custom validation
    return Promise.resolve({
      isValid: true,
      errors: [],
      warnings: [],
      needsMigration: false,
      currentVersion: state.schemaVersion,
      targetVersion: this.version,
    });
  }

  /**
   * Mode-specific state migration logic
   * Override this method to provide custom state migration for the mode
   */
  protected doMigrateState(state: ModeState): Promise<ModeState> {
    // Default implementation - no custom migration
    return Promise.resolve(state);
  }

  // Protected helper methods

  /**
   * Create necessary directories for mode operation
   * TODO(#task-4.5): Implement proper directory creation when CLI command routing system is built (Task 4.5)
   * FIXME: Currently relies on writeFile createDirs option - should pre-create directories for better UX
   */
  protected createModeDirectories(): void {
    // TODO(#task-4.5): Implement directory pre-creation for:
    // - `modes/${this.id}` - Mode-specific configuration and prompts
    // - `state/${this.id}` - Persistent state storage
    // - `config` - Global configuration directory
    // - `artifacts/${this.id}` - Mode-generated artifacts

    // NOTE: Currently directories are created automatically by FileOperations.writeFile
    // with createDirs option when files are first written. This is functional but
    // could be improved for better user experience and error reporting.
  }

  /**
   * Load stored prompt templates
   */
  protected async loadStoredPrompts(): Promise<void> {
    try {
      const promptPath = `modes/${this.id}/prompts.json`;
      if (await this.fileOps.exists(promptPath)) {
        const result = await this.fileOps.readFile(promptPath);
        const promptData = result.content;
        const storedPrompts = JSON.parse(promptData) as Record<string, string>;

        for (const [key, template] of Object.entries(storedPrompts)) {
          this.prompts.set(key, template);
        }

        this.logger.debug(`Loaded stored prompts for mode ${this.id}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to load stored prompts for mode ${this.id}:`, error);
    }
  }

  /**
   * Validate that all dependencies are available
   */
  protected validateDependencies(): void {
    const missing = this.getMissingDependencies();
    if (missing.length > 0) {
      throw new Error(`Missing dependencies for mode ${this.id}: ${missing.join(", ")}`);
    }
  }

  /**
   * Get list of missing dependencies
   * TODO(#task-4.3): Implement actual dependency resolution when ModeRegistry is created (Task 4.3)
   * FIXME: Currently returns empty array - needs integration with mode registry system
   */
  protected getMissingDependencies(): string[] {
    // TODO(#task-4.3): Implement dependency resolution by:
    // 1. Checking this.dependencies array against registered modes in ModeRegistry
    // 2. Validating version compatibility between dependent modes
    // 3. Checking for circular dependencies
    // 4. Returning list of missing or incompatible dependencies

    // FIXME: This is a placeholder implementation that always returns empty array
    // Real implementation should integrate with ModeRegistry.isRegistered() and
    // validate that all dependencies in this.dependencies are available and compatible
    return [];
  }

  // Optional lifecycle hooks (can be overridden by concrete modes)
  onBeforeExecute?(context?: Record<string, unknown>): Promise<void>;
  onAfterExecute?(result: ModeResult): Promise<void>;
  onError?(error: Error): Promise<void>;
}

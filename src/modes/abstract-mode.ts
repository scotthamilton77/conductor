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
   * Save mode state for context preservation
   */
  async saveState(state: Partial<ModeState>): Promise<void> {
    const stateId = state.id || `${this.id}-${Date.now()}`;
    const fullState: ModeState = {
      id: stateId,
      modeId: this.id,
      timestamp: new Date(),
      data: {},
      artifacts: [],
      ...state,
    };

    const statePath = `state/${this.id}/${stateId}.json`;
    await this.fileOps.writeFile(statePath, JSON.stringify(fullState, null, 2));
    this.logger.debug(`Saved state for mode ${this.id}: ${stateId}`);
  }

  /**
   * Load previously saved state
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
      const state = JSON.parse(stateData) as ModeState;

      // Convert timestamp string back to Date
      state.timestamp = new Date(state.timestamp);

      this.logger.debug(`Loaded state for mode ${this.id}: ${stateId}`);
      return state;
    } catch (error) {
      this.logger.warn(`Failed to load state ${stateId} for mode ${this.id}:`, error);
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

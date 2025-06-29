/**
 * Mode Registry and Factory System
 *
 * Implements the centralized registry for mode discovery, registration, and instantiation
 * with factory patterns and dependency resolution.
 */

import { AbstractMode } from "../modes/abstract-mode.ts";
import { FileOperations } from "./file-operations.ts";
import { type Logger, type Mode, type ModeConfig, type ModeResult } from "./types.ts";

/**
 * Registry entry for a mode with metadata and configuration
 */
export interface ModeRegistryEntry {
  /** Constructor function for the mode class */
  modeClass: new (
    id: string,
    name: string,
    description: string,
    version: string,
    dependencies: string[],
    fileOps: FileOperations,
    logger: Logger,
    initialConfig?: Partial<ModeConfig>,
  ) => AbstractMode;
  /** Configuration metadata for the mode */
  config: ModeConfig;
  /** Whether the mode is enabled for use */
  isEnabled: boolean;
  /** Priority for loading order (higher = loaded first) */
  loadPriority: number;
  /** Additional metadata about the mode */
  metadata?: {
    author?: string;
    category?: string;
    tags?: string[];
    minVersion?: string;
    maxVersion?: string;
  };
}

/**
 * Context information passed to modes during creation
 */
export interface ModeContext {
  /** Project root path */
  projectPath: string;
  /** Global workspace state */
  workspaceState?: Record<string, unknown>;
  /** User preferences */
  userPreferences?: Record<string, unknown>;
  /** Session-specific data */
  sessionData?: Record<string, unknown>;
  /** Additional context variables */
  variables?: Record<string, unknown>;
}

/**
 * Validation result for mode operations
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation error message if failed */
  error?: string;
  /** Warning messages that don't prevent operation */
  warnings?: string[];
  /** Additional validation metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Centralized registry for mode management and discovery
 */
export class ModeRegistry {
  private readonly modes = new Map<string, ModeRegistryEntry>();
  private readonly instances = new Map<string, AbstractMode>();
  private readonly fileOps: FileOperations;
  private readonly logger: Logger;
  private initialized = false;

  constructor(fileOps: FileOperations, logger: Logger) {
    this.fileOps = fileOps;
    this.logger = logger;
  }

  /**
   * Initialize the registry and discover available modes
   */
  // deno-lint-ignore require-await
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.debug("ModeRegistry already initialized");
      return;
    }

    this.logger.info("Initializing ModeRegistry");

    try {
      // TODO(#task-4.4): Implement mode discovery when auto-discovery system is built
      // For now, registry starts empty and modes are registered programmatically

      this.initialized = true;
      this.logger.info(`ModeRegistry initialized with ${this.modes.size} modes`);
    } catch (error) {
      this.logger.error("Failed to initialize ModeRegistry:", error);
      throw error;
    }
  }

  /**
   * Register a mode with the registry
   */
  register(name: string, entry: ModeRegistryEntry): void {
    if (!this.initialized) {
      throw new Error("ModeRegistry must be initialized before registering modes");
    }

    if (this.modes.has(name)) {
      this.logger.warn(`Mode '${name}' is already registered, overwriting`);
    }

    // Validate the entry
    const validation = this.validateRegistryEntry(name, entry);
    if (!validation.valid) {
      throw new Error(`Cannot register mode '${name}': ${validation.error}`);
    }

    this.modes.set(name, entry);
    this.logger.info(`Registered mode: ${name} (enabled: ${entry.isEnabled})`);

    if (validation.warnings && validation.warnings.length > 0) {
      for (const warning of validation.warnings) {
        this.logger.warn(`Mode '${name}': ${warning}`);
      }
    }
  }

  /**
   * Unregister a mode from the registry
   */
  unregister(name: string): void {
    if (!this.modes.has(name)) {
      this.logger.warn(`Cannot unregister unknown mode: ${name}`);
      return;
    }

    // Clean up any existing instance
    if (this.instances.has(name)) {
      const instance = this.instances.get(name)!;
      instance.cleanup().catch((error) => {
        this.logger.error(`Failed to cleanup mode instance '${name}':`, error);
      });
      this.instances.delete(name);
    }

    this.modes.delete(name);
    this.logger.info(`Unregistered mode: ${name}`);
  }

  /**
   * Discover modes from a directory (placeholder for future auto-discovery)
   * TODO(#task-4.4): Implement dynamic mode discovery from filesystem
   */
  // deno-lint-ignore require-await
  async discover(directory: string): Promise<ModeRegistryEntry[]> {
    this.logger.debug(`Mode discovery from '${directory}' not yet implemented`);

    // TODO(#task-4.4): Implement mode discovery by:
    // 1. Scanning directory for mode definition files
    // 2. Loading and validating mode configurations
    // 3. Dynamically importing mode classes
    // 4. Creating registry entries for discovered modes
    // 5. Handling errors gracefully for invalid modes

    // FIXME: Placeholder implementation - returns empty array
    return [];
  }

  /**
   * Get list of available (registered and enabled) mode names
   */
  getAvailable(): string[] {
    return Array.from(this.modes.entries())
      .filter(([_, entry]) => entry.isEnabled)
      .sort((a, b) => b[1].loadPriority - a[1].loadPriority)
      .map(([name]) => name);
  }

  /**
   * Get list of all registered mode names (including disabled)
   */
  getRegistered(): string[] {
    return Array.from(this.modes.keys());
  }

  /**
   * Check if a mode is registered
   */
  isRegistered(name: string): boolean {
    return this.modes.has(name);
  }

  /**
   * Check if a mode is available (registered and enabled)
   */
  isAvailable(name: string): boolean {
    const entry = this.modes.get(name);
    return entry !== undefined && entry.isEnabled;
  }

  /**
   * Get registry entry for a mode
   */
  getEntry(name: string): ModeRegistryEntry | null {
    return this.modes.get(name) || null;
  }

  /**
   * Create a new mode instance
   */
  async create(name: string, _context: ModeContext): Promise<AbstractMode> {
    if (!this.initialized) {
      await this.initialize();
    }

    const entry = this.modes.get(name);
    if (!entry) {
      throw new Error(`Mode '${name}' is not registered`);
    }

    if (!entry.isEnabled) {
      throw new Error(`Mode '${name}' is disabled`);
    }

    // Validate dependencies
    const depValidation = this.validateDependencies(name);
    if (!depValidation.valid) {
      throw new Error(`Cannot create mode '${name}': ${depValidation.error}`);
    }

    try {
      this.logger.debug(`Creating instance of mode: ${name}`);

      // Create new instance
      const instance = new entry.modeClass(
        name,
        name, // Use name as display name by default
        entry.config.description || `${name} mode`,
        entry.config.version,
        entry.config.dependencies || [],
        this.fileOps,
        this.logger,
        entry.config,
      );

      // Store instance for lifecycle management
      this.instances.set(name, instance);

      this.logger.info(`Created mode instance: ${name}`);
      return instance;
    } catch (error) {
      this.logger.error(`Failed to create mode '${name}':`, error);
      throw error;
    }
  }

  /**
   * Get existing mode instance
   */
  getInstance(name: string): AbstractMode | null {
    return this.instances.get(name) || null;
  }

  /**
   * Destroy a mode instance and clean up resources
   */
  async destroy(name: string): Promise<void> {
    const instance = this.instances.get(name);
    if (!instance) {
      this.logger.warn(`No instance found for mode: ${name}`);
      return;
    }

    try {
      await instance.cleanup();
      this.instances.delete(name);
      this.logger.info(`Destroyed mode instance: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to destroy mode '${name}':`, error);
      throw error;
    }
  }

  /**
   * Destroy all mode instances
   */
  async destroyAll(): Promise<void> {
    const destroyPromises = Array.from(this.instances.keys()).map((name) => this.destroy(name));

    const results = await Promise.allSettled(destroyPromises);
    const failed = results
      .map((result, index) => ({ result, name: Array.from(this.instances.keys())[index] }))
      .filter(({ result }) => result.status === "rejected");

    if (failed.length > 0) {
      this.logger.error(`Failed to destroy ${failed.length} mode instances`);
    } else {
      this.logger.info("Destroyed all mode instances");
    }
  }

  /**
   * Validate mode dependencies
   */
  validateDependencies(name: string): ValidationResult {
    const entry = this.modes.get(name);
    if (!entry) {
      return {
        valid: false,
        error: `Mode '${name}' is not registered`,
      };
    }

    const missing = this.resolveDependencies(name).filter(
      (dep) => !this.isAvailable(dep),
    );

    if (missing.length > 0) {
      return {
        valid: false,
        error: `Missing dependencies: ${missing.join(", ")}`,
      };
    }

    // Check for circular dependencies
    const circular = this.detectCircularDependencies(name);
    if (circular.length > 0) {
      return {
        valid: false,
        error: `Circular dependencies detected: ${circular.join(" -> ")}`,
      };
    }

    return { valid: true };
  }

  /**
   * Resolve dependencies for a mode
   */
  resolveDependencies(name: string): string[] {
    const entry = this.modes.get(name);
    if (!entry || !entry.config.dependencies) {
      return [];
    }

    return entry.config.dependencies;
  }

  /**
   * Update mode configuration
   */
  async updateConfig(name: string, config: Partial<ModeConfig>): Promise<void> {
    const entry = this.modes.get(name);
    if (!entry) {
      throw new Error(`Mode '${name}' is not registered`);
    }

    // Update the entry configuration
    entry.config = { ...entry.config, ...config };

    // Update instance configuration if it exists
    const instance = this.instances.get(name);
    if (instance) {
      await instance.configure(config);
    }

    this.logger.info(`Updated configuration for mode: ${name}`);
  }

  /**
   * Enable or disable a mode
   */
  setEnabled(name: string, enabled: boolean): void {
    const entry = this.modes.get(name);
    if (!entry) {
      throw new Error(`Mode '${name}' is not registered`);
    }

    entry.isEnabled = enabled;
    this.logger.info(`Mode '${name}' ${enabled ? "enabled" : "disabled"}`);

    // If disabling and instance exists, destroy it
    if (!enabled && this.instances.has(name)) {
      this.destroy(name).catch((error) => {
        this.logger.error(`Failed to destroy disabled mode '${name}':`, error);
      });
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalModes: number;
    enabledModes: number;
    activeInstances: number;
    categories: Record<string, number>;
  } {
    const entries = Array.from(this.modes.values());
    const categories: Record<string, number> = {};

    for (const entry of entries) {
      const category = entry.metadata?.category || "uncategorized";
      categories[category] = (categories[category] || 0) + 1;
    }

    return {
      totalModes: this.modes.size,
      enabledModes: entries.filter((entry) => entry.isEnabled).length,
      activeInstances: this.instances.size,
      categories,
    };
  }

  // Private helper methods

  /**
   * Validate a registry entry before registration
   */
  private validateRegistryEntry(name: string, entry: ModeRegistryEntry): ValidationResult {
    const warnings: string[] = [];

    // Validate name
    if (!name || typeof name !== "string") {
      return {
        valid: false,
        error: "Mode name must be a non-empty string",
      };
    }

    // Validate mode class
    if (!entry.modeClass || typeof entry.modeClass !== "function") {
      return {
        valid: false,
        error: "Mode class must be a constructor function",
      };
    }

    // Validate config
    if (!entry.config || typeof entry.config !== "object") {
      return {
        valid: false,
        error: "Mode config must be an object",
      };
    }

    // Validate config properties
    if (!entry.config.version) {
      warnings.push("No version specified in config");
    }

    if (entry.loadPriority < 0 || entry.loadPriority > 100) {
      warnings.push("Load priority should be between 0 and 100");
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Detect circular dependencies in mode dependency graph
   */
  private detectCircularDependencies(
    name: string,
    visited = new Set<string>(),
    path: string[] = [],
  ): string[] {
    if (visited.has(name)) {
      // Found a cycle
      const cycleStart = path.indexOf(name);
      return path.slice(cycleStart).concat(name);
    }

    visited.add(name);
    path.push(name);

    const dependencies = this.resolveDependencies(name);
    for (const dep of dependencies) {
      const cycle = this.detectCircularDependencies(dep, new Set(visited), [...path]);
      if (cycle.length > 0) {
        return cycle;
      }
    }

    return [];
  }
}

/**
 * Factory for creating mode instances with dependency injection
 */
export class ModeFactory {
  private readonly registry: ModeRegistry;
  private readonly logger: Logger;

  constructor(registry: ModeRegistry, logger: Logger) {
    this.registry = registry;
    this.logger = logger;
  }

  /**
   * Create a mode instance with full dependency resolution and validation
   */
  async createMode(name: string, context: ModeContext): Promise<AbstractMode> {
    this.logger.debug(`Creating mode '${name}' with factory`);

    // Validate that mode exists and is available
    if (!this.registry.isAvailable(name)) {
      throw new Error(`Mode '${name}' is not available`);
    }

    // Validate dependencies
    const depValidation = this.registry.validateDependencies(name);
    if (!depValidation.valid) {
      throw new Error(`Cannot create mode '${name}': ${depValidation.error}`);
    }

    try {
      // Create the mode instance
      const mode = await this.registry.create(name, context);

      // Validate the created instance
      const validation = await this.validateMode(mode);
      if (!validation.valid) {
        await this.registry.destroy(name);
        throw new Error(`Mode validation failed: ${validation.error}`);
      }

      // Inject additional dependencies
      this.injectDependencies(mode, context);

      this.logger.info(`Successfully created mode '${name}' with factory`);
      return mode;
    } catch (error) {
      this.logger.error(`Failed to create mode '${name}' with factory:`, error);
      throw error;
    }
  }

  /**
   * Validate a mode instance
   */
  async validateMode(mode: AbstractMode): Promise<ValidationResult> {
    try {
      const result = await mode.validate();
      return {
        valid: result.success,
        error: result.error,
        warnings: result.metadata?.warnings as string[],
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Inject additional dependencies into a mode instance
   * TODO(#task-4.5): Implement advanced dependency injection when CLI routing system is built
   */
  injectDependencies(mode: AbstractMode, context: ModeContext): void {
    // TODO(#task-4.5): Implement dependency injection for:
    // 1. Context variables from ModeContext
    // 2. Shared services (AI clients, databases, etc.)
    // 3. Inter-mode communication channels
    // 4. Configuration overrides from context
    // 5. Session-specific state and preferences

    // FIXME: Currently no-op - needs integration with service locator pattern
    // when more complex dependency injection is needed
    this.logger.debug(`Dependency injection for mode '${mode.id}' completed (placeholder)`);
  }
}

/**
 * Core Type Definitions
 */

export interface Config {
  version: string;
  defaultMode: string;
  api: {
    claude: {
      model: string;
      maxTokens: number;
      apiKey: string;
    };
  };
  logging: {
    level: string;
    file: string;
  };
  persistence: {
    stateDir: string;
    format: string;
  };
  modes: {
    discover: {
      enabled: boolean;
      autoScan: boolean;
      scanDepth: number;
    };
    generate: {
      enabled: boolean;
      templateDir: string;
    };
    validate: {
      enabled: boolean;
      strictMode: boolean;
    };
  };
  security: {
    requireApiKey: boolean;
    allowLocalFiles: boolean;
    maxFileSize: string;
  };
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Mode configuration for advanced mode capabilities
 */
export interface ModeConfig {
  version: string;
  enabled: boolean;
  description?: string;
  dependencies?: string[];
  settings?: Record<string, unknown>;
}

/**
 * Mode state management interface for context preservation
 */
export interface ModeState {
  id: string;
  modeId: string;
  timestamp: Date;
  data: Record<string, unknown>;
  artifacts: string[];
}

/**
 * Result type for mode operations with status and metadata
 */
export interface ModeResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    executionTime?: number;
    artifacts?: string[];
    warnings?: string[];
  };
}

/**
 * Core Mode interface with enhanced capabilities
 */
export interface Mode {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly dependencies: string[];

  // Basic lifecycle methods
  initialize(): Promise<void>;
  execute(input: string): Promise<string>;
  cleanup(): Promise<void>;

  // Enhanced execution with typed results
  executeWithResult<T = unknown>(
    input: string,
    context?: Record<string, unknown>,
  ): Promise<ModeResult<T>>;

  // State management
  saveState(state: Partial<ModeState>): Promise<void>;
  loadState(stateId?: string): Promise<ModeState | null>;
  clearState(stateId?: string): Promise<void>;

  // Configuration and validation
  configure(config: Partial<ModeConfig>): Promise<void>;
  validate(): Promise<ModeResult<boolean>>;

  // Lifecycle hooks (optional - can be implemented by concrete modes)
  onBeforeExecute?(context?: Record<string, unknown>): Promise<void>;
  onAfterExecute?(result: ModeResult): Promise<void>;
  onError?(error: Error): Promise<void>;

  // Prompt management
  getPrompts(): Record<string, string>;
  updatePrompt(key: string, template: string): void;
}

/**
 * Re-export registry types for external use
 */
export type { ModeContext, ModeRegistryEntry, ValidationResult } from "./mode-registry.ts";

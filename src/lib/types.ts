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

export interface Mode {
  name: string;
  description: string;
  initialize(): Promise<void>;
  execute(input: string): Promise<string>;
  cleanup(): Promise<void>;
}

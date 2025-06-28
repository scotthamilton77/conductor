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

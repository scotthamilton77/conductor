/**
 * Configuration Management
 *
 * Handles loading and merging configuration from multiple sources:
 * - Default configuration files
 * - Environment variables (.env files)
 * - User-specific settings
 */

import { ensureDir, exists } from "@std/fs";
import { join } from "@std/path";
import type { Config } from "./types.ts";

const DEFAULT_CONFIG_PATH = ".conductor/config/default.json";
const USER_CONFIG_PATH = ".conductor/config/config.json";
const ENV_FILE_PATH = ".env";

/**
 * Load and parse environment variables from .env file
 */
async function loadEnvFile(): Promise<Record<string, string>> {
  const envPath = join(Deno.cwd(), ENV_FILE_PATH);
  const envVars: Record<string, string> = {};

  if (await exists(envPath)) {
    const envContent = await Deno.readTextFile(envPath);

    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  }

  return envVars;
}

/**
 * Substitute environment variables in config strings
 */
function substituteEnvVars(obj: unknown, envVars: Record<string, string>): unknown {
  if (typeof obj === "string") {
    return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      return envVars[varName] || Deno.env.get(varName) || "";
    });
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => substituteEnvVars(item, envVars));
  }

  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteEnvVars(value, envVars);
    }
    return result;
  }

  return obj;
}

/**
 * Deep merge two configuration objects
 */
function mergeConfig(base: Config, override: Partial<Config>): Config {
  const merged = structuredClone(base);

  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        (merged as unknown as Record<string, unknown>)[key] = {
          ...(merged as unknown as Record<string, unknown>)[key] as Record<string, unknown>,
          ...value as Record<string, unknown>,
        };
      } else {
        (merged as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }

  return merged;
}

/**
 * Validate required configuration fields
 */
function validateConfig(config: Config): void {
  const errors: string[] = [];

  if (config.security.requireApiKey && !config.api.claude.apiKey) {
    errors.push("Claude API key is required but not configured");
  }

  if (!config.persistence.stateDir) {
    errors.push("State directory must be configured");
  }

  if (!config.logging.file) {
    errors.push("Log file path must be configured");
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
  }
}

/**
 * Create default user configuration file
 */
export async function createUserConfig(): Promise<void> {
  const userConfigPath = join(Deno.cwd(), USER_CONFIG_PATH);

  await ensureDir(join(Deno.cwd(), ".conductor/config"));

  const defaultUserConfig = {
    api: {
      claude: {
        apiKey: "${CLAUDE_API_KEY}",
      },
    },
  };

  await Deno.writeTextFile(userConfigPath, JSON.stringify(defaultUserConfig, null, 2));
}

/**
 * Initialize configuration directories and files
 */
export async function initConfig(): Promise<void> {
  const conductorDir = join(Deno.cwd(), ".conductor");

  // Ensure all required directories exist
  await ensureDir(join(conductorDir, "config"));
  await ensureDir(join(conductorDir, "logs"));
  await ensureDir(join(conductorDir, "state"));
  await ensureDir(join(conductorDir, "templates"));

  // Create user config if it doesn't exist
  const userConfigPath = join(Deno.cwd(), USER_CONFIG_PATH);
  if (!(await exists(userConfigPath))) {
    await createUserConfig();
  }
}

/**
 * Load complete configuration from all sources
 */
export async function loadConfig(): Promise<Config> {
  // Ensure directories exist
  await initConfig();

  // Load environment variables
  const envVars = await loadEnvFile();

  // Load default configuration
  const defaultConfigPath = join(Deno.cwd(), DEFAULT_CONFIG_PATH);
  if (!(await exists(defaultConfigPath))) {
    throw new Error(`Default configuration not found at ${defaultConfigPath}`);
  }

  const defaultConfigText = await Deno.readTextFile(defaultConfigPath);
  let config = JSON.parse(defaultConfigText) as Config;

  // Load user configuration if it exists
  const userConfigPath = join(Deno.cwd(), USER_CONFIG_PATH);
  if (await exists(userConfigPath)) {
    const userConfigText = await Deno.readTextFile(userConfigPath);
    const userConfig = JSON.parse(userConfigText) as Partial<Config>;
    config = mergeConfig(config, userConfig);
  }

  // Substitute environment variables
  config = substituteEnvVars(config, envVars) as Config;

  // Validate configuration
  validateConfig(config);

  return config;
}

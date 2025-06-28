/**
 * Configuration Management
 *
 * Handles loading and merging configuration from multiple sources:
 * - Default configuration files
 * - Environment variables
 * - User-specific settings
 */

import { exists } from "@std/fs";
import { join } from "@std/path";
import type { Config } from "./types.ts";

const DEFAULT_CONFIG_PATH = ".conductor/config/default.json";

export async function loadConfig(): Promise<Config> {
  // Start with default configuration
  const defaultConfigPath = join(Deno.cwd(), DEFAULT_CONFIG_PATH);

  if (!(await exists(defaultConfigPath))) {
    throw new Error(`Default configuration not found at ${defaultConfigPath}`);
  }

  const defaultConfigText = await Deno.readTextFile(defaultConfigPath);
  const config = JSON.parse(defaultConfigText) as Config;

  // TODO(#1): Add environment variable overrides
  // TODO(#2): Add user config file support

  return config;
}

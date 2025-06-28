import { assertEquals, assertRejects } from "@std/assert";
import { initConfig, loadConfig } from "../src/lib/config.ts";
import { exists } from "@std/fs";

Deno.test("Configuration Management", async (t) => {
  await t.step("should create configuration directories", async () => {
    await initConfig();

    const configExists = await exists(".conductor/config");
    const logsExists = await exists(".conductor/logs");
    const stateExists = await exists(".conductor/state");
    const templatesExists = await exists(".conductor/templates");

    assertEquals(configExists, true);
    assertEquals(logsExists, true);
    assertEquals(stateExists, true);
    assertEquals(templatesExists, true);
  });

  await t.step("should load and validate configuration with API key", async () => {
    const config = await loadConfig();

    assertEquals(config.version, "0.1.0");
    assertEquals(config.defaultMode, "discover");
    assertEquals(config.api.claude.apiKey, "test_api_key_12345");
    assertEquals(config.logging.level, "info");
    assertEquals(config.security.requireApiKey, true);
  });

  await t.step("should handle environment variable substitution", async () => {
    const config = await loadConfig();

    // API key should be substituted from .env file
    assertEquals(config.api.claude.apiKey, "test_api_key_12345");
  });
});

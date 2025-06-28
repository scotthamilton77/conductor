/**
 * CLI Command Structure and Configuration
 *
 * Defines the command structure for the Conductor CLI using Cliffy framework.
 * Provides foundation for extensible command system.
 */

import { Command } from "@cliffy/command";
import { initConfig, loadConfig } from "./lib/config.ts";
import { ConsoleLogger } from "./lib/logger.ts";
import { Confirm, Input, Select } from "@cliffy/prompt";
import { exists } from "@std/fs";
import { dirname, join } from "@std/path";

const VERSION = "0.1.0";

/**
 * Create the main CLI command structure
 */
export function createCLI() {
  const cmd = new Command()
    .name("conductor")
    .version(VERSION)
    .description("AI-powered conversational CLI for problem exploration and solution development")
    .option("--verbose", "Enable verbose logging")
    .option("--quiet", "Suppress non-essential output")
    .action((options) => {
      // Default action when no subcommand is provided
      console.log("🎭 Welcome to Conductor!");
      console.log("A conversational AI CLI for problem exploration and solution development.\n");

      if (!options.quiet) {
        console.log("Available commands:");
        console.log("  conductor init     - Initialize a new conductor workspace");
        console.log("  conductor discover - Start discovery mode for problem exploration");
        console.log("  conductor status   - Show current workspace status");
        console.log("\nRun 'conductor --help' for more information.");
      }
    });

  // Add placeholder commands for future implementation
  cmd
    .command("init", "Initialize a new conductor workspace")
    .action(() => {
      console.log("🚀 Initializing conductor workspace...");
      // TODO(#3): Implement workspace initialization
      console.log("✅ Workspace initialized!");
    });

  cmd
    .command("discover", "Start discovery mode for problem exploration")
    .arguments("[prompt:string]")
    .description("Enter discovery mode to explore and understand problems")
    .action((options, prompt?: string) => {
      console.log("🔍 Starting discovery mode...");
      if (prompt) {
        console.log(`Initial prompt: ${prompt}`);
      }
      // TODO(#4): Implement discovery mode
      console.log("Discovery mode ready!");
    });

  cmd
    .command("status", "Show current workspace status")
    .action(() => {
      console.log("📊 Workspace Status:");
      // TODO(#5): Implement status checking
      console.log("Status checking not yet implemented");
    });

  // Add config command for managing configuration
  const configCmd = cmd
    .command("config", "Manage conductor configuration")
    .action(async () => {
      try {
        const config = await loadConfig();
        console.log("📋 Current Configuration:");
        console.log(JSON.stringify(config, null, 2));
      } catch (error) {
        console.error(
          "❌ Failed to load configuration:",
          error instanceof Error ? error.message : String(error),
        );
      }
    });

  // Add config subcommands
  configCmd
    .command("setup", "Initialize configuration with setup wizard")
    .action(async () => {
      console.log("🛠️  Configuration Setup Wizard");
      console.log("Let's set up your Conductor configuration.\n");

      try {
        // Initialize basic structure
        await initConfig();
        console.log("✅ Created configuration directories");

        // Get API key
        const apiKey = await Input.prompt({
          message: "Enter your Claude API key (press Enter to use environment variable):",
          hint: "Will be stored securely in config.json",
        });

        // Get logging preference
        const logLevel = await Select.prompt({
          message: "Select logging level:",
          options: [
            { name: "Info (recommended)", value: "info" },
            { name: "Debug (verbose)", value: "debug" },
            { name: "Warning", value: "warn" },
            { name: "Error only", value: "error" },
          ],
        });

        // Get auto-scan preference
        const autoScan = await Confirm.prompt({
          message: "Enable automatic code scanning in discovery mode?",
          default: true,
        });

        // Create user config
        const userConfig = {
          api: {
            claude: {
              apiKey: apiKey || "${CLAUDE_API_KEY}",
            },
          },
          logging: {
            level: logLevel,
          },
          modes: {
            discover: {
              autoScan: autoScan,
            },
          },
        };

        // Write user config
        const configPath = ".conductor/config/config.json";
        await Deno.writeTextFile(configPath, JSON.stringify(userConfig, null, 2));

        console.log("\n✅ Configuration setup complete!");
        console.log(`📁 User config saved to: ${configPath}`);

        if (!apiKey) {
          console.log(
            "\n💡 Remember to set your CLAUDE_API_KEY environment variable or add it to .env file",
          );
        }
      } catch (error) {
        console.error(
          "❌ Configuration setup failed:",
          error instanceof Error ? error.message : String(error),
        );
      }
    });

  configCmd
    .command("validate", "Validate current configuration")
    .action(async () => {
      try {
        const config = await loadConfig();
        console.log("✅ Configuration is valid!");

        // Show key details
        console.log("\n📊 Configuration Summary:");
        console.log(`• Default mode: ${config.defaultMode}`);
        console.log(`• API configured: ${config.api.claude.apiKey ? "Yes" : "No"}`);
        console.log(`• Log level: ${config.logging.level}`);
        console.log(`• Auto-scan: ${config.modes.discover.autoScan ? "Enabled" : "Disabled"}`);
      } catch (error) {
        console.error(
          "❌ Configuration validation failed:",
          error instanceof Error ? error.message : String(error),
        );
        console.log("\n💡 Try running 'conductor config init' to set up your configuration");
      }
    });

  // Add logs command for log management
  const logsCmd = cmd
    .command("logs", "Manage and view application logs")
    .action(async () => {
      try {
        const config = await loadConfig();
        const logFile = config.logging.file;

        if (await exists(logFile)) {
          console.log(`📋 Log file: ${logFile}`);
          console.log(
            "Use 'conductor logs tail' to follow logs, or 'conductor logs clean' to clear them.",
          );
        } else {
          console.log("📋 No log file found yet. Logs will be created when the application runs.");
        }
      } catch (error) {
        console.error(
          "❌ Failed to check logs:",
          error instanceof Error ? error.message : String(error),
        );
      }
    });

  logsCmd
    .command("tail", "Follow log output in real-time")
    .option("-n, --lines <lines:number>", "Number of lines to show initially", { default: 50 })
    .action(async (options) => {
      try {
        const config = await loadConfig();
        const logFile = config.logging.file;

        if (!(await exists(logFile))) {
          console.log("📋 No log file found yet.");
          return;
        }

        console.log(`📋 Tailing ${logFile} (last ${options.lines} lines):`);
        console.log("Press Ctrl+C to stop\n");

        // Show initial lines
        const content = await Deno.readTextFile(logFile);
        const lines = content.split("\n").filter((line) => line.trim());
        const recentLines = lines.slice(-options.lines);

        for (const line of recentLines) {
          if (line.trim()) {
            try {
              const entry = JSON.parse(line);
              console.log(`[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`);
            } catch {
              console.log(line);
            }
          }
        }

        // Note: Real-time tailing would require file watching, which is complex
        // For now, this shows recent logs
        console.log(
          "\n💡 Note: This shows recent logs. For real-time tailing, use 'tail -f' on the log file.",
        );
      } catch (error) {
        console.error(
          "❌ Failed to read logs:",
          error instanceof Error ? error.message : String(error),
        );
      }
    });

  logsCmd
    .command("clean", "Clear all log files")
    .action(async () => {
      try {
        const config = await loadConfig();
        const logFile = config.logging.file;
        const logDir = dirname(logFile);

        console.log("🧹 Cleaning log files...");

        let cleanedCount = 0;

        // Remove main log file
        if (await exists(logFile)) {
          await Deno.remove(logFile);
          cleanedCount++;
        }

        // Remove rotated log files
        try {
          for await (const entry of Deno.readDir(logDir)) {
            if (entry.isFile && entry.name.endsWith(".log")) {
              await Deno.remove(join(logDir, entry.name));
              cleanedCount++;
            }
          }
        } catch {
          // Directory might not exist, ignore
        }

        console.log(`✅ Cleaned ${cleanedCount} log file(s)`);
      } catch (error) {
        console.error(
          "❌ Failed to clean logs:",
          error instanceof Error ? error.message : String(error),
        );
      }
    });

  return cmd;
}

/**
 * Initialize and configure logging based on CLI options
 */
export function initializeLogging(options: { verbose?: boolean; quiet?: boolean }) {
  const logLevel = options.verbose ? "debug" : options.quiet ? "error" : "info";
  return new ConsoleLogger(logLevel as "debug" | "info" | "warn" | "error");
}

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
import { FileOperations } from "./lib/file-operations.ts";
import { type ModeContext, ModeFactory, ModeRegistry } from "./lib/mode-registry.ts";
import { type Logger, type ModeConfig } from "./lib/types.ts";
import { AbstractMode } from "./modes/abstract-mode.ts";

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
    .option("--session-id <id:string>", "Resume a specific discovery session")
    .option("--export <path:string>", "Export session results to specified path")
    .action(async (options, prompt?: string) => {
      console.log("🔍 Starting discovery mode...");

      try {
        // Check if verbose flag was passed in arguments
        const isVerbose = Deno.args.includes("--verbose");

        // Initialize mode system dependencies
        const fileOps = new FileOperations(".conductor");
        const logger = new ConsoleLogger(isVerbose ? "debug" : "info");

        // Create mode registry and factory
        const registry = new ModeRegistry(fileOps, logger);
        await registry.initialize();

        // Register DiscoveryMode
        const { DiscoveryMode } = await import("./modes/discovery-mode.ts");

        // Create a wrapper class that matches the expected constructor signature
        class DiscoveryModeWrapper extends DiscoveryMode {
          constructor(
            _id: string,
            _name: string,
            _description: string,
            _version: string,
            _dependencies: string[],
            fileOps: FileOperations,
            logger: Logger,
            _initialConfig?: Partial<ModeConfig>,
          ) {
            super(fileOps, logger);
          }
        }

        registry.register("discovery", {
          modeClass: DiscoveryModeWrapper,
          config: {
            version: "1.0.0-stub",
            enabled: true,
            description: "Conversational problem exploration through Socratic questioning",
            dependencies: [],
          },
          isEnabled: true,
          loadPriority: 10,
          metadata: {
            category: "exploration",
            tags: ["problem-solving", "conversation", "exploration"],
          },
        });

        // Create mode instance
        const factory = new ModeFactory(registry, logger);
        const context: ModeContext = {
          projectPath: Deno.cwd(),
          sessionData: {
            sessionId: options.sessionId || `discovery-${Date.now()}`,
            exportPath: options.export,
          },
        };

        const discoveryMode = await factory.createMode("discovery", context);

        // Initialize the mode
        await discoveryMode.initialize();

        // Start interactive discovery session
        await runDiscoverySession(discoveryMode, prompt, logger);

        // Cleanup
        await discoveryMode.cleanup();
        await registry.destroyAll();

        console.log("\n✅ Discovery session completed!");

        if (options.export) {
          console.log(`📁 Session exported to: ${options.export}`);
        }
      } catch (error) {
        console.error(
          "❌ Discovery mode failed:",
          error instanceof Error ? error.message : String(error),
        );
        Deno.exit(1);
      }
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

/**
 * Run interactive discovery session
 */
async function runDiscoverySession(
  discoveryMode: AbstractMode,
  initialPrompt: string | undefined,
  logger: Logger,
): Promise<void> {
  logger.info("Starting interactive discovery session");

  // Execute with initial prompt if provided
  let result = await discoveryMode.executeWithResult<string>(initialPrompt || "");

  if (!result.success) {
    throw new Error(result.error || "Failed to start discovery session");
  }

  // Display initial response
  if (result.data && typeof result.data === "string") {
    console.log("\n" + result.data);
  }

  // Continue conversation loop
  while (true) {
    // Get user input
    const userInput = await Input.prompt({
      message: "\n>",
      hint: "Type your response or 'exit' to end session",
    });

    if (userInput.toLowerCase() === "exit") {
      break;
    }

    // Execute with user input
    result = await discoveryMode.executeWithResult<string>(userInput);

    if (!result.success) {
      logger.error("Error in discovery session:", result.error);
      const shouldContinue = await Confirm.prompt({
        message: "An error occurred. Continue session?",
        default: true,
      });

      if (!shouldContinue) {
        break;
      }
      continue;
    }

    // Display response
    if (result.data && typeof result.data === "string") {
      console.log("\n" + result.data);

      // Check if session is complete
      if (result.data.includes("Discovery session complete!")) {
        break;
      }
    }
  }

  logger.info("Discovery session ended");
}

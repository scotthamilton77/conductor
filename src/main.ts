/**
 * Conductor CLI - Main Entry Point
 *
 * A conversational AI CLI tool for problem exploration and solution development.
 * Focuses on Discovery mode for understanding and breaking down complex problems.
 */

import { Command } from "@cliffy/command";

const VERSION = "0.1.0";

async function main() {
  const cmd = new Command()
    .name("conductor")
    .version(VERSION)
    .description("AI-powered conversational CLI for problem exploration and solution development")
    .action(() => {
      console.log("Welcome to Conductor!");
      console.log("Run 'conductor --help' to see available commands.");
    });

  await cmd.parse(Deno.args);
}

if (import.meta.main) {
  main();
}

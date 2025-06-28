/**
 * Conductor CLI - Main Entry Point
 *
 * A conversational AI CLI tool for problem exploration and solution development.
 * Focuses on Discovery mode for understanding and breaking down complex problems.
 */

import { createCLI, initializeLogging } from "./cli.ts";

async function main() {
  try {
    const cli = createCLI();
    await cli.parse(Deno.args);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}

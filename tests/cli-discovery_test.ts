/**
 * Tests for CLI Discovery Mode Integration
 */

import { assertEquals, assertExists } from "@std/assert";
import { createCLI } from "../src/cli.ts";

Deno.test("CLI Discovery Mode - command registration", () => {
  const cli = createCLI();
  const command = cli.getCommand("discover");

  assertExists(command);
  assertEquals(command?.getName(), "discover");
  assertEquals(
    command?.getDescription(),
    "Enter discovery mode to explore and understand problems",
  );
});

Deno.test("CLI Discovery Mode - command options", () => {
  const cli = createCLI();
  const command = cli.getCommand("discover");

  assertExists(command);

  // Check for session-id option
  const sessionOption = command?.getOption("session-id");
  assertExists(sessionOption);
  assertEquals(sessionOption?.name, "session-id");

  // Check for export option
  const exportOption = command?.getOption("export");
  assertExists(exportOption);
  assertEquals(exportOption?.name, "export");
});

Deno.test("CLI Discovery Mode - optional prompt argument", () => {
  const cli = createCLI();
  const command = cli.getCommand("discover");

  assertExists(command);

  const args = command?.getArguments();
  assertExists(args);
  assertEquals(args.length, 1);
  assertEquals(args[0].name, "prompt");
});

Deno.test("CLI Discovery Mode - parent command has verbose option", () => {
  const cli = createCLI();

  // Check that the parent command has verbose option
  const globalOption = cli.getOption("verbose");
  assertExists(globalOption);
  assertEquals(globalOption?.name, "verbose");
});

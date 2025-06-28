import { assertEquals } from "@std/assert";

Deno.test("main module exists", async () => {
  const module = await import("../src/main.ts");
  // Basic smoke test - module should load without errors
  assertEquals(typeof module, "object");
});

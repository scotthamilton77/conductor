#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Setup Git pre-commit hooks for code quality
 */

import { ensureDir, exists } from "@std/fs";
import { join } from "@std/path";

const HOOKS_DIR = ".git/hooks";
const PRE_COMMIT_HOOK = join(HOOKS_DIR, "pre-commit");

const PRE_COMMIT_SCRIPT = `#!/bin/bash

# Conductor pre-commit hook
# Runs code quality checks before allowing commit

echo "🔍 Running pre-commit checks..."

# Check if deno is available
if ! command -v deno &> /dev/null; then
    echo "❌ Deno is not installed or not in PATH"
    exit 1
fi

# Run formatter check
echo "  📏 Checking code formatting..."
if ! deno fmt --check src/ tests/; then
    echo "❌ Code formatting issues found. Run 'deno task fmt' to fix."
    exit 1
fi

# Run linter
echo "  🔍 Running linter..."
if ! deno lint src/ tests/; then
    echo "❌ Linting issues found. Please fix the issues above."
    exit 1
fi

# Run tests
echo "  🧪 Running tests..."
if ! deno task test; then
    echo "❌ Tests failed. Please fix failing tests before committing."
    exit 1
fi

echo "✅ All pre-commit checks passed!"
exit 0
`;

async function setupPreCommitHook(): Promise<void> {
  try {
    // Check if we're in a git repository
    if (!(await exists(".git"))) {
      console.error("❌ Not in a git repository. Initialize git first.");
      Deno.exit(1);
    }

    // Ensure hooks directory exists
    await ensureDir(HOOKS_DIR);

    // Check if hook already exists
    if (await exists(PRE_COMMIT_HOOK)) {
      console.log("⚠️  Pre-commit hook already exists.");
      
      const replace = confirm("Do you want to replace it?");
      if (!replace) {
        console.log("Skipping hook setup.");
        return;
      }
    }

    // Write the pre-commit hook
    await Deno.writeTextFile(PRE_COMMIT_HOOK, PRE_COMMIT_SCRIPT);

    // Make it executable
    await Deno.chmod(PRE_COMMIT_HOOK, 0o755);

    console.log("✅ Pre-commit hook installed successfully!");
    console.log("📁 Location:", PRE_COMMIT_HOOK);
    console.log("\n💡 The hook will run automatically before each commit.");
    console.log("💡 To skip the hook for a specific commit, use: git commit --no-verify");

  } catch (error) {
    console.error("❌ Failed to setup pre-commit hook:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await setupPreCommitHook();
}
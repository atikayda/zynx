#!/usr/bin/env -S deno run --allow-all

/**
 * 🦎 Zynx CLI - Command Line Interface Entry Point
 * 
 * The friendly axolotl that helps you navigate database migrations!
 * 
 * @example
 * ```bash
 * # Install globally
 * deno install --allow-all -n zynx jsr:@atikayda/zynx/cli
 * 
 * # Generate migrations from DBML changes
 * zynx generate
 * 
 * # Apply pending migrations
 * zynx run
 * 
 * # Check migration status
 * zynx status
 * 
 * # Initialize new project
 * zynx init
 * ```
 */

// Re-export the main CLI entry point
export * from "./src/cli/main.ts";

// If this file is executed directly, run the CLI
if (import.meta.main) {
  const { main } = await import("./src/cli/main.ts");
  await main();
}
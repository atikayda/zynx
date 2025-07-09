#!/usr/bin/env -S deno run --allow-all

/**
 * 🦎 Zynx CLI Main Entry Point
 * 
 * Main entry point for the Zynx command line interface.
 * Handles argument parsing and command execution.
 */

import { CLI } from "./cli.ts";
import { loadConfig } from "../utils/config.ts";
import { ErrorHandler } from "../utils/errors.ts";
import { parseArgs } from "@std/cli/parse-args";

const VERSION = "1.0.0";

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
🦎 Zynx - The Axolotl-Powered Database Migration Tool

USAGE:
    zynx <COMMAND> [OPTIONS]

COMMANDS:
    generate    Generate migration from DBML schema changes
    run         Apply pending migrations to database
    status      Show current migration status
    init        Initialize a new Zynx project
    rollback    Rollback migrations (if supported)

OPTIONS:
    -c, --config <file>    Use custom config file
    -d, --dry-run          Show what would be done without executing
    -v, --verbose          Enable verbose output
    -h, --help             Show this help message
    -V, --version          Show version information

EXAMPLES:
    zynx generate           Generate migration from schema changes
    zynx run                Apply all pending migrations
    zynx run --dry-run      Preview migrations without applying
    zynx status             Show current migration status
    zynx init               Create a new Zynx project

For more information, visit: https://github.com/atikayda/zynx
`);
}

/**
 * Display version information
 */
function showVersion(): void {
  console.log(`Zynx version ${VERSION}`);
}

/**
 * Main CLI entry point
 */
export async function main(): Promise<void> {
  try {
    const args = parseArgs(Deno.args, {
      boolean: ["help", "version", "verbose", "dry-run"],
      string: ["config"],
      alias: {
        "h": "help",
        "V": "version",
        "v": "verbose",
        "d": "dry-run",
        "c": "config"
      }
    });

    // Handle help and version flags
    if (args.help) {
      showHelp();
      return;
    }

    if (args.version) {
      showVersion();
      return;
    }

    // Get command
    const command = args._[0] as string;
    const commandArgs = args._.slice(1) as string[];

    if (!command) {
      console.error("❌ No command specified. Use --help for usage information.");
      Deno.exit(1);
    }

    // Create configuration
    const config = await loadConfig(args.config);

    // Create CLI options
    const options = {
      verbose: args.verbose || false,
      dryRun: args["dry-run"] || false,
      config
    };

    // Create and run CLI
    const cli = new CLI(options);
    await cli.run([command, ...commandArgs]);

  } catch (error) {
    ErrorHandler.handle(error);
    Deno.exit(1);
  }
}

// Run main function if this file is executed directly
if (import.meta.main) {
  await main();
}
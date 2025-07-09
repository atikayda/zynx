#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env

/**
 * 🦎 Zynx CLI - Command Line Interface
 * 
 * The friendly axolotl that helps you navigate database migrations!
 * 
 * @example
 * ```bash
 * # Generate migrations from DBML changes
 * zynx generate
 * 
 * # Apply pending migrations
 * zynx run
 * 
 * # Check migration status
 * zynx status
 * ```
 */

import { parseArgs } from "@std/cli/parse-args";
import { CLI } from "./src/cli/cli.ts";
import { ZYNX_ASCII } from "./mod.ts";

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version", "verbose"],
    string: ["config"],
    alias: {
      h: "help",
      v: "version",
      c: "config"
    }
  });

  // Show version
  if (args.version) {
    console.log(ZYNX_ASCII);
    Deno.exit(0);
  }

  // Show help
  if (args.help || args._.length === 0) {
    showHelp();
    Deno.exit(0);
  }

  try {
    const cli = new CLI({
      verbose: args.verbose,
      configPath: args.config
    });
    
    await cli.run(args._ as string[]);
  } catch (error) {
    console.error("🚨 Zynx encountered an error:");
    console.error(error.message);
    
    if (args.verbose) {
      console.error("\n📊 Stack trace:");
      console.error(error.stack);
    }
    
    console.error("\n🦎 Need help? Check the docs: https://deno.land/x/zynx");
    Deno.exit(1);
  }
}

function showHelp() {
  console.log(`
🦎 Zynx - The Axolotl-Powered Migration System

USAGE:
  zynx <command> [options]

COMMANDS:
  generate     🧬 Generate migrations from DBML changes
  run          🌊 Apply pending migrations to database
  status       📊 Show current migration status
  init         ✨ Initialize Zynx in current project
  rollback     ⏪ Rollback to specific migration (if supported)

OPTIONS:
  -h, --help       Show this help message
  -v, --version    Show Zynx version
  -c, --config     Specify config file path
  --verbose        Show detailed output

EXAMPLES:
  zynx generate                    # Generate from ./database.dbml
  zynx run                         # Apply pending migrations
  zynx status                      # Check migration status
  zynx init                        # Set up Zynx in project
  zynx generate --config=custom.ts # Use custom config

DOCUMENTATION:
  https://deno.land/x/zynx

🌊 Swim through schema changes with confidence!
`);
}

if (import.meta.main) {
  await main();
}
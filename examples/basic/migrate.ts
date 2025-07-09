#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env

/**
 * 🦎 Zynx Basic Example - Migration Script
 * 
 * This example demonstrates basic Zynx usage with a simple blog schema.
 * 
 * Usage:
 *   deno run --allow-all migrate.ts generate
 *   deno run --allow-all migrate.ts run
 *   deno run --allow-all migrate.ts status
 */

import { ZynxManager, createConfig } from "../../mod.ts";

// Create Zynx configuration
const config = createConfig({
  dbmlPath: "./database.dbml",
  migrationsDir: "./migrations",
  database: {
    type: "postgresql",
    connectionString: Deno.env.get("DATABASE_URL") || "postgresql://localhost:5432/zynx_basic_example"
  },
  settings: {
    migrationTableName: "_migrations",
    snapshotName: "snapshot",
    migrationPrefix: "blog_"
  },
  hooks: {
    beforeGenerate: async () => {
      console.log("🦎 Analyzing blog schema changes...");
    },
    afterGenerate: async (result) => {
      if (result.success && result.migrations.length > 0) {
        console.log(`✨ Generated ${result.migrations.length} new migration(s) for blog schema`);
      }
    },
    beforeRun: async () => {
      console.log("🌊 Swimming through blog database migrations...");
    },
    afterRun: async (result) => {
      if (result.success) {
        console.log("🚀 Blog database is ready to go!");
      }
    }
  }
});

// Create Zynx manager
const zynx = new ZynxManager(config);

// Command line interface
async function main() {
  const command = Deno.args[0];
  
  if (!command) {
    showHelp();
    Deno.exit(0);
  }
  
  try {
    switch (command.toLowerCase()) {
      case "generate":
      case "gen":
        await zynx.generate();
        break;
        
      case "run":
      case "migrate":
        await zynx.run();
        break;
        
      case "status":
      case "stat":
        const status = await zynx.status();
        displayStatus(status);
        break;
        
      case "help":
      case "--help":
      case "-h":
        showHelp();
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        Deno.exit(1);
    }
  } catch (error) {
    console.error("🚨 Error:", error.message);
    if (Deno.args.includes("--verbose")) {
      console.error(error.stack);
    }
    Deno.exit(1);
  }
}

function showHelp() {
  console.log(`
🦎 Zynx Basic Example - Blog Migration Tool

USAGE:
  deno run --allow-all migrate.ts <command>

COMMANDS:
  generate, gen    Generate migrations from database.dbml changes
  run, migrate     Apply pending migrations to database
  status, stat     Show current migration status
  help             Show this help message

EXAMPLES:
  deno run --allow-all migrate.ts generate
  deno run --allow-all migrate.ts run
  deno run --allow-all migrate.ts status

ENVIRONMENT:
  DATABASE_URL     PostgreSQL connection string
                   Default: postgresql://localhost:5432/zynx_basic_example

🌊 Happy migrating with Zynx!
`);
}

function displayStatus(status: any) {
  console.log("\n📊 Migration Status:");
  console.log("==================");
  console.log(`Current Version: ${status.currentVersion}`);
  console.log(`Latest Version:  ${status.latestVersion}`);
  console.log(`Pending Count:   ${status.pendingCount}`);
  console.log(`Database:        ${status.databaseConnected ? '🟢 Connected' : '🔴 Disconnected'}`);
  
  if (status.lastMigration) {
    console.log(`Last Migration:  ${status.lastMigration.toISOString()}`);
  }
  
  if (status.pendingCount > 0) {
    console.log(`\n⚠️  You have ${status.pendingCount} pending migration(s)`);
    console.log("   Run 'deno run --allow-all migrate.ts run' to apply them");
  } else {
    console.log("\n✅ Database is up to date!");
  }
}

// Run the CLI
if (import.meta.main) {
  await main();
}
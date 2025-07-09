/**
 * 🦎 Zynx Status Command - Show Migration Status
 * 
 * Displays current migration status and database information
 */

import { parseArgs } from "@std/cli/parse-args";
import type { Command } from "../cli.ts";
import type { CLIOptions } from "../../types.ts";
import { ZynxManager } from "../../core/zynx-manager.ts";
import { loadConfig } from "../../utils/config.ts";

export class StatusCommand implements Command {
  constructor(private options: CLIOptions) {}

  async execute(args: string[]): Promise<void> {
    const parsed = parseArgs(args, {
      boolean: ["verbose", "json"],
      alias: {
        v: "verbose"
      }
    });

    console.log("🦎 Checking migration status...");
    
    // Load configuration
    const config = await loadConfig(this.options.configPath);
    
    // Create Zynx manager
    const zynx = new ZynxManager(config);
    
    try {
      // Get comprehensive status
      const status = await zynx.getStatus();
      
      if (parsed.json) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }
      
      // Display formatted status
      console.log(`\n📊 Migration Status Report`);
      console.log(`${"=".repeat(50)}`);
      
      // Database info
      console.log(`\n🌊 Database Information:`);
      console.log(`  Type: ${config.database.type}`);
      console.log(`  Connection: ${this.maskConnectionString(config.database.connectionString)}`);
      console.log(`  Status: ${status.databaseConnected ? "✅ Connected" : "❌ Disconnected"}`);
      
      // Migration table info
      console.log(`\n📋 Migration Table:`);
      console.log(`  Name: ${config.migrations.tableName}`);
      console.log(`  Status: ${status.migrationsTableExists ? "✅ Exists" : "❌ Missing"}`);
      
      // Current migration
      console.log(`\n🔢 Current Migration:`);
      if (status.currentMigration) {
        console.log(`  Number: ${status.currentMigration.toString().padStart(4, '0')}`);
        console.log(`  Applied: ${status.appliedMigrations.length} total`);
      } else {
        console.log(`  None applied yet`);
      }
      
      // Pending migrations
      console.log(`\n⏳ Pending Migrations:`);
      if (status.pendingMigrations.length === 0) {
        console.log(`  ✨ No pending migrations - database is up to date!`);
      } else {
        console.log(`  Count: ${status.pendingMigrations.length}`);
        
        if (parsed.verbose) {
          console.log(`  Files:`);
          for (const migration of status.pendingMigrations) {
            console.log(`    ${migration.number.toString().padStart(4, '0')}.sql - ${migration.name || 'Generated migration'}`);
          }
        }
      }
      
      // Applied migrations (verbose)
      if (parsed.verbose && status.appliedMigrations.length > 0) {
        console.log(`\n✅ Applied Migrations:`);
        for (const migration of status.appliedMigrations) {
          console.log(`  ${migration.number.toString().padStart(4, '0')}.sql - ${migration.name || 'Generated migration'} (${migration.appliedAt})`);
        }
      }
      
      // File system info
      console.log(`\n📁 File System:`);
      console.log(`  Migrations dir: ${config.migrations.directory}`);
      console.log(`  Schema file: ${config.schema.path}`);
      console.log(`  Total files: ${status.fileSystemMigrations.length}`);
      
      // Health check
      console.log(`\n🦎 Health Check:`);
      const isHealthy = status.databaseConnected && 
                       status.migrationsTableExists && 
                       status.pendingMigrations.length === 0;
      
      if (isHealthy) {
        console.log(`  ✅ Everything looks good! Your axolotl is happy.`);
      } else {
        console.log(`  ⚠️  Issues detected:`);
        if (!status.databaseConnected) {
          console.log(`    - Database connection failed`);
        }
        if (!status.migrationsTableExists) {
          console.log(`    - Migration table doesn't exist (run 'zynx run' to create)`);
        }
        if (status.pendingMigrations.length > 0) {
          console.log(`    - ${status.pendingMigrations.length} pending migrations`);
        }
      }
      
      console.log(`\n🌊 Next Steps:`);
      if (status.pendingMigrations.length > 0) {
        console.log(`  1. Run 'zynx run' to apply pending migrations`);
        console.log(`  2. Use 'zynx run --dry-run' to preview changes first`);
      } else {
        console.log(`  1. Modify your database.dbml schema`);
        console.log(`  2. Run 'zynx generate' to create new migrations`);
      }
      
    } catch (error) {
      console.error("🚨 Failed to get migration status");
      throw error;
    }
  }

  private maskConnectionString(connectionString: string): string {
    // Mask password in connection string for security
    return connectionString.replace(/:([^:@]+)@/, ':****@');
  }

  getHelp(): string {
    return `
🦎 Zynx Status Command

Show current migration status and database information.

USAGE:
  zynx status [options]

OPTIONS:
  -v, --verbose    Show detailed information including all migrations
  --json          Output status as JSON

EXAMPLES:
  zynx status              # Basic status overview
  zynx status --verbose    # Detailed status with migration lists
  zynx status --json       # JSON output for scripting

This command provides a comprehensive overview of your migration state,
including database connection, applied migrations, and pending changes.
`;
  }
}
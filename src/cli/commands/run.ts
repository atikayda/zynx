/**
 * 🦎 Zynx Run Command - Apply Pending Migrations
 * 
 * Executes pending SQL migrations against the database
 */

import { parseArgs } from "@std/cli/parse-args";
import type { Command } from "../cli.ts";
import type { CLIOptions } from "../../types.ts";
import { ZynxManager } from "../../core/zynx-manager.ts";
import { loadConfig } from "../../utils/config.ts";

export class RunCommand implements Command {
  constructor(private options: CLIOptions) {}

  async execute(args: string[]): Promise<void> {
    const parsed = parseArgs(args, {
      boolean: ["dry-run", "force", "single"],
      string: ["target"],
      alias: {
        t: "target"
      }
    });

    console.log("🦎 Running pending migrations...");
    
    // Load configuration
    const config = await loadConfig(this.options.configPath);
    
    // Create Zynx manager
    const zynx = new ZynxManager(config);
    
    try {
      // Get migration status first
      const status = await zynx.getStatus();
      
      if (status.pendingMigrations.length === 0) {
        console.log("✨ No pending migrations found!");
        console.log("🦎 Your database is up to date with the latest schema");
        return;
      }
      
      if (parsed["dry-run"]) {
        console.log("🔍 Dry run - showing migrations that would be applied:");
        console.log(`\n📊 Database Status:`);
        console.log(`  Applied: ${status.appliedMigrations.length} migrations`);
        console.log(`  Pending: ${status.pendingMigrations.length} migrations`);
        console.log(`\n🌊 Migrations that would be applied:`);
        
        for (const migration of status.pendingMigrations) {
          console.log(`  ${migration.number.toString().padStart(4, '0')}.sql - ${migration.name || 'Generated migration'}`);
        }
        
        console.log("\n🦎 Use 'zynx run' (without --dry-run) to apply these migrations");
        return;
      }
      
      // Apply migrations
      const result = await zynx.run({
        target: parsed.target ? parseInt(parsed.target) : undefined,
        single: parsed.single,
        force: parsed.force
      });
      
      if (result.migrationsApplied.length === 0) {
        console.log("✨ No migrations were applied");
      } else {
        console.log(`🌊 Successfully applied ${result.migrationsApplied.length} migrations:`);
        
        for (const migration of result.migrationsApplied) {
          console.log(`  ✅ ${migration.number.toString().padStart(4, '0')}.sql - ${migration.name || 'Generated migration'}`);
        }
        
        console.log(`\n📊 Database is now at migration ${result.currentMigration}`);
        console.log("🦎 Your axolotl is happy with the schema evolution!");
      }
    } catch (error) {
      console.error("🚨 Migration failed!");
      console.error("🦎 Don't worry - your database state has been preserved");
      throw error;
    }
  }

  getHelp(): string {
    return `
🦎 Zynx Run Command

Apply pending migrations to the database.

USAGE:
  zynx run [options]

OPTIONS:
  --dry-run             Show migrations that would be applied
  --target <number>     Run migrations up to specific number
  --single              Apply only the next pending migration
  --force               Force apply even if database is ahead

EXAMPLES:
  zynx run                     # Apply all pending migrations
  zynx run --dry-run          # Preview migrations without applying
  zynx run --target 5         # Apply migrations up to 0005.sql
  zynx run --single           # Apply only the next migration
  zynx run --force            # Force apply (use with caution)

IMPORTANT:
- Always backup your database before running migrations in production
- Test migrations in a staging environment first
- Use --dry-run to preview changes before applying
`;
  }
}
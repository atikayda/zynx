/**
 * 🦎 Zynx Rollback Command - Rollback Database Migrations
 * 
 * Provides rollback capabilities where supported by the database
 */

import { parseArgs } from "@std/cli/parse-args";
import type { Command } from "../cli.ts";
import type { CLIOptions } from "../../types.ts";
import { ZynxManager } from "../../core/zynx-manager.ts";
import { loadConfig } from "../../utils/config.ts";

export class RollbackCommand implements Command {
  constructor(private options: CLIOptions) {}

  async execute(args: string[]): Promise<void> {
    const parsed = parseArgs(args, {
      boolean: ["dry-run", "force"],
      string: ["to"],
      alias: {
        t: "to"
      }
    });

    console.log("🦎 Preparing rollback operation...");
    
    // Load configuration
    const config = await loadConfig(this.options.configPath);
    
    // Create Zynx manager
    const zynx = new ZynxManager(config);
    
    try {
      // Get current status
      const status = await zynx.getStatus();
      
      if (status.appliedMigrations.length === 0) {
        console.log("⚠️  No migrations have been applied yet");
        console.log("🦎 Nothing to rollback - your database is at the initial state");
        return;
      }
      
      // Determine target migration
      const targetMigration = parsed.to ? parseInt(parsed.to) : undefined;
      
      if (targetMigration !== undefined) {
        // Validate target migration
        const targetExists = status.appliedMigrations.some(m => m.number === targetMigration);
        if (!targetExists) {
          throw new Error(`Target migration ${targetMigration} was not found in applied migrations`);
        }
        
        const currentMigration = status.currentMigration;
        if (currentMigration && targetMigration >= currentMigration) {
          console.log(`⚠️  Target migration ${targetMigration} is current or newer than current migration ${currentMigration}`);
          console.log("🦎 No rollback needed");
          return;
        }
      }
      
      // Show rollback warning
      console.log(`\n⚠️  ROLLBACK WARNING`);
      console.log(`${"=".repeat(50)}`);
      console.log(`🚨 Rolling back database migrations can result in data loss!`);
      console.log(`🦎 Axolotls can regenerate limbs, but your data might not regenerate!`);
      console.log(`\nCurrent migration: ${status.currentMigration || 'None'}`);
      console.log(`Target migration: ${targetMigration || 'Initial state'}`);
      console.log(`Migrations to rollback: ${this.getMigrationsToRollback(status.appliedMigrations, targetMigration).length}`);
      
      if (parsed["dry-run"]) {
        console.log("\n🔍 Dry run - showing rollback plan:");
        
        const migrationsToRollback = this.getMigrationsToRollback(status.appliedMigrations, targetMigration);
        
        console.log(`\n🌊 Migrations that would be rolled back:`);
        for (const migration of migrationsToRollback.reverse()) {
          console.log(`  ${migration.number.toString().padStart(4, '0')}.sql - ${migration.name || 'Generated migration'}`);
        }
        
        console.log(`\n🦎 Use 'zynx rollback --to ${targetMigration || 0}' to execute this rollback`);
        console.log(`⚠️  Remember to backup your database first!`);
        return;
      }
      
      // Require explicit confirmation for rollback
      if (!parsed.force) {
        console.log(`\n🚨 Rollback requires explicit confirmation`);
        console.log(`Use --force flag to proceed: zynx rollback --to ${targetMigration || 0} --force`);
        console.log(`⚠️  Make sure you have backed up your database!`);
        return;
      }
      
      // Execute rollback
      console.log(`\n🌊 Executing rollback...`);
      
      const result = await zynx.rollback({
        target: targetMigration,
        dryRun: false
      });
      
      if (result.migrationsRolledBack.length === 0) {
        console.log("✨ No migrations were rolled back");
      } else {
        console.log(`🌊 Successfully rolled back ${result.migrationsRolledBack.length} migrations:`);
        
        for (const migration of result.migrationsRolledBack) {
          console.log(`  ✅ ${migration.number.toString().padStart(4, '0')}.sql - ${migration.name || 'Generated migration'}`);
        }
        
        console.log(`\n📊 Database is now at migration ${result.currentMigration || 'initial state'}`);
        console.log("🦎 Your axolotl has successfully regenerated to an earlier state!");
      }
      
    } catch (error) {
      if (error.message.includes("not supported")) {
        console.error("🚨 Rollback is not supported for this database type");
        console.error("🦎 Consider using schema snapshots or manual rollback procedures");
      } else {
        console.error("🚨 Rollback failed!");
        console.error("🦎 Your database state should be preserved");
      }
      throw error;
    }
  }

  private getMigrationsToRollback(appliedMigrations: any[], targetMigration?: number): any[] {
    if (targetMigration === undefined) {
      return appliedMigrations; // Rollback all
    }
    
    return appliedMigrations.filter(m => m.number > targetMigration);
  }

  getHelp(): string {
    return `
🦎 Zynx Rollback Command

Rollback database migrations to a previous state.

USAGE:
  zynx rollback [options]

OPTIONS:
  -t, --to <number>    Target migration number to rollback to
  --dry-run           Show rollback plan without executing
  --force             Force rollback without confirmation prompt

EXAMPLES:
  zynx rollback --to 3 --dry-run    # Preview rollback to migration 3
  zynx rollback --to 3 --force      # Rollback to migration 3
  zynx rollback --to 0 --force      # Rollback all migrations

IMPORTANT WARNINGS:
- ⚠️  Rolling back can result in permanent data loss
- 🚨 Always backup your database before rollback
- 🦎 Test rollback procedures in staging first
- 📋 Not all database types support rollback operations

Rollback support varies by database type and migration content.
Axolotls can regenerate limbs, but your data might not regenerate!
`;
  }
}
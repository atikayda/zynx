/**
 * 🦎 Zynx Generate Command - Generate Migrations from DBML
 * 
 * Analyzes DBML schema changes and generates SQL migration files
 */

import { parseArgs } from "@std/cli/parse-args";
import type { Command } from "../cli.ts";
import type { CLIOptions } from "../../types.ts";
import { ZynxManager } from "../../core/zynx-manager.ts";
import { ErrorHandler } from "../../utils/errors.ts";
import { loadConfig } from "../../utils/config.ts";
import { applyFeatures, validateFeatures, getExtensionSQL } from "../../features/index.ts";

export class GenerateCommand implements Command {
  constructor(private options: CLIOptions) {}

  async execute(args: string[]): Promise<void> {
    const parsed = parseArgs(args, {
      boolean: ["dry-run", "force"],
      string: ["name", "schema", "features"],
      alias: {
        n: "name",
        s: "schema",
        f: "features"
      }
    });

    console.log("🦎 Generating migrations from DBML changes...");
    
    // Load configuration
    const config = await loadConfig(this.options.configPath);
    
    // Apply features if specified
    let features: string[] = [];
    if (parsed.features) {
      features = parsed.features.split(',').map((f: string) => f.trim());
    } else if (config.features) {
      features = config.features;
    }
    
    if (features.length > 0) {
      validateFeatures(features);
      
      // Store features for migration generation
      (config as any).enabledFeatures = features;
      
      // Note: Feature SQL type mappings are applied in ZynxManager constructor
      // via getSQLTypeMappings() to ensure proper string-to-string mappings
    }
    
    // Override schema path if provided
    if (parsed.schema) {
      config.schema.path = parsed.schema;
    }
    
    // Create Zynx manager
    const zynx = new ZynxManager(config);
    
    try {
      // Generate migrations
      const result = await zynx.generate({
        name: parsed.name,
        dryRun: parsed["dry-run"],
        force: parsed.force
      });
      
      if (parsed["dry-run"]) {
        console.log("🔍 Dry run completed:");
        console.log("Changes detected:");
        console.log(result.changes);
        console.log("\nSQL that would be generated:");
        console.log(result.sql);
        console.log("\n🦎 Use 'zynx generate' (without --dry-run) to create the migration file");
      } else {
        if (result.changes.length === 0) {
          console.log("✨ No schema changes detected - database is up to date!");
          console.log("🦎 Your axolotl is happy with the current state");
        } else {
          console.log(`📄 Generated migration: ${result.filename}`);
          console.log(`🧬 Applied ${result.changes.length} schema changes`);
          console.log("\n🌊 Ready to run 'zynx run' to apply migrations!");
        }
      }
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      if (err.message.includes("No changes detected")) {
        console.log("✨ No schema changes detected - database is up to date!");
        console.log("🦎 Your axolotl is happy with the current state");
      } else {
        throw error;
      }
    }
  }

  getHelp(): string {
    return `
🦎 Zynx Generate Command

Generate SQL migrations from DBML schema changes.

USAGE:
  zynx generate [options]

OPTIONS:
  -n, --name <name>        Custom migration name
  -s, --schema <path>      Override DBML schema file path
  --features <features>    Comma-separated list of features (kjson,uuid-ossp,postgis,etc.)
  --dry-run                Preview changes without creating files
  --force                  Force generation even if no changes detected

EXAMPLES:
  zynx generate                           # Generate from default schema
  zynx generate --name "add-user-table"   # Custom migration name
  zynx generate --dry-run                 # Preview changes
  zynx generate --schema "./custom.dbml"  # Use custom schema file
  zynx generate --force                   # Force generation
  zynx generate --features kjson,uuid-ossp # Generate with features

The generated migration will be numbered sequentially (0001.sql, 0002.sql, etc.)
and will include all necessary SQL to update your database schema.
`;
  }
}
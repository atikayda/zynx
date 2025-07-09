/**
 * 🦎 Zynx - The Axolotl-Powered DBML Migration System
 * 
 * Just like how axolotls regenerate their limbs perfectly,
 * Zynx regenerates your database schema with precision and grace.
 * 
 * @example
 * ```typescript
 * import { ZynxManager, createConfig } from "https://deno.land/x/zynx@v1.0.0/mod.ts";
 * 
 * const zynx = new ZynxManager(createConfig({
 *   dbmlPath: "./database.dbml",
 *   migrationsDir: "./migrations",
 *   database: {
 *     type: "postgresql",
 *     connectionString: "postgresql://localhost:5432/myapp"
 *   }
 * }));
 * 
 * // Generate migrations from DBML changes
 * await zynx.generate();
 * 
 * // Apply migrations to database
 * await zynx.run();
 * ```
 * 
 * @module
 */

// Core exports
export { ZynxManager } from "./src/core/zynx-manager.ts";
export { DBMLParser } from "./src/core/dbml-parser.ts";
export { SchemaDiffer } from "./src/core/schema-differ.ts";

// Generator exports
export { PostgreSQLGenerator } from "./src/generators/postgresql.ts";
export { BaseGenerator } from "./src/generators/base.ts";

// Utility exports
export { createConfig } from "./src/utils/config.ts";
export { DatabaseConnection } from "./src/utils/db-utils.ts";
export { FileManager } from "./src/utils/file-utils.ts";

// Type exports
export type {
  ZynxConfig,
  ZynxResult,
  ZynxStatus,
  ZynxMigration,
  DatabaseConfig,
  MigrationSettings,
  ZynxHooks,
  GeneratorPlugin,
  DatabaseSchema,
  DBMLTable,
  DBMLField,
  DBMLIndex,
  DBMLRef
} from "./src/types.ts";

// Version info
export const VERSION = "1.0.0";
export const ZYNX_ASCII = `
🦎 Zynx v${VERSION}
   The Axolotl-Powered Migration System
   
   Regenerate your database schema with precision!
`;
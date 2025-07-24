/**
 * 🦎 Zynx - The Axolotl-Powered DBML Migration System
 * 
 * Just like how axolotls regenerate their limbs perfectly,
 * Zynx regenerates your database schema with precision and grace.
 * 
 * @example Basic Usage
 * ```typescript
 * import { ZynxManager, loadConfig } from "@atikayda/zynx";
 * 
 * // Load configuration from zynx.config.yaml
 * const config = await loadConfig();
 * 
 * // Create manager instance
 * const zynx = new ZynxManager(config);
 * 
 * // Generate migrations from DBML changes
 * const generateResult = await zynx.generate();
 * console.log(`Generated: ${generateResult.migrationFile}`);
 * 
 * // Apply migrations to database
 * const runResult = await zynx.run();
 * console.log(`Applied ${runResult.appliedMigrations.length} migrations`);
 * 
 * // Check migration status
 * const status = await zynx.status();
 * console.log(`Pending: ${status.pendingMigrations.length}`);
 * ```
 * 
 * @example Configuration Management
 * ```typescript
 * import { createConfig, discoverConfigFile } from "@atikayda/zynx";
 * 
 * // Discover config file automatically (supports YAML, JSON with kjson, TS, JS)
 * const configPath = await discoverConfigFile();
 * 
 * // Create config programmatically
 * const config = createConfig({
 *   database: {
 *     type: "postgresql",
 *     connectionString: "postgresql://localhost:5432/myapp"
 *   },
 *   migrations: {
 *     directory: "./migrations"
 *   },
 *   schema: {
 *     path: "./database.dbml"
 *   }
 * });
 * ```
 * 
 * @example Error Handling
 * ```typescript
 * import { ZynxError, DatabaseError, SchemaError } from "@atikayda/zynx";
 * 
 * try {
 *   await zynx.run();
 * } catch (error) {
 *   if (error instanceof SchemaError) {
 *     console.error(`Schema error: ${error.message}`);
 *   } else if (error instanceof DatabaseError) {
 *     console.error(`Database error: ${error.message}`);
 *   }
 * }
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

// Type generator exports
export { 
  TypeGenerator,
  TypeScriptGenerator,
  GoGenerator,
  PythonGenerator,
  RustGenerator,
  getTypeGenerator,
  type TypeGeneratorConfig
} from "./src/generators/types/index.ts";

// Configuration exports
export { 
  loadConfig,
  createConfig,
  discoverConfigFile,
  isValidConfig,
  loadConfigFromEnv,
  mergeConfigs,
  displayConfig,
  createTestConfig,
  validateConfigWithDetails,
  createSampleConfig
} from "./src/utils/config.ts";

// Database utility exports
export { createDatabaseConnection, DatabaseUtils } from "./src/utils/db-utils.ts";

// File utility exports
export { FileManager } from "./src/utils/file-utils.ts";

// Validation exports
export { ConfigValidator } from "./src/utils/validation.ts";

// Error exports
export {
  ZynxError,
  ConfigError,
  DatabaseError,
  MigrationError,
  SchemaError,
  FileSystemError,
  ValidationError,
  GeneratorError,
  ErrorHandler,
  Assert,
  Retry
} from "./src/utils/errors.ts";

// Type exports
export type {
  ZynxConfig,
  DatabaseConfig,
  MigrationSettings,
  ZynxHooks,
  ZynxResult,
  ZynxStatus,
  ZynxMigration,
  ZynxMigrationStatus,
  ZynxError as ZynxErrorType,
  DatabaseSchema,
  DBMLTable,
  DBMLField,
  DBMLIndex,
  DBMLRef,
  GeneratorPlugin,
  CLIOptions,
  CLICommand
} from "./src/types.ts";

// Version info
export const VERSION = "1.0.0";

// CLI banner for programmatic use
export const ZYNX_BANNER: string = `
🦎 Zynx v${VERSION}
   The Axolotl-Powered Migration System
   
   Regenerate your database schema with precision!
`;

// Utility function to display version info
export function showVersion(): void {
  console.log(`Zynx version ${VERSION}`);
}

// Utility function to display banner
export function showBanner(): void {
  console.log(ZYNX_BANNER);
}
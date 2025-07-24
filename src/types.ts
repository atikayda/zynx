/**
 * 🦎 Zynx Type Definitions
 * 
 * Core types for the Axolotl-Powered Migration System
 */

// =============================================================================
// CORE CONFIGURATION TYPES
// =============================================================================

/**
 * Main Zynx configuration interface
 */
export interface ZynxConfig {
  /** Database connection configuration */
  database: DatabaseConfig;
  
  /** Migration configuration */
  migrations: MigrationConfig;
  
  /** Schema configuration */
  schema: SchemaConfig;
  
  /** Generator configuration */
  generator?: GeneratorConfig;
  
  /** Optional hooks for custom behavior */
  hooks?: ZynxHooks;
  
  /** Migration-specific settings (deprecated - use migrations) */
  settings?: MigrationSettings;
}

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /** Database type */
  type: "postgresql" | "mysql" | "sqlite";
  
  /** Database connection string */
  connectionString: string;
  
  /** SSL configuration */
  ssl?: boolean;
  
  /** Connection pool settings */
  pool?: {
    min?: number;
    max?: number;
    timeout?: number;
  };
}

/**
 * Migration system settings
 */
export interface MigrationSettings {
  /** Name of the migrations tracking table */
  migrationTableName?: string;
  
  /** Name of the snapshot files */
  snapshotName?: string;
  
  /** Prefix for migration file names */
  migrationPrefix?: string;
  
  /** Transaction mode for migrations */
  transactionMode?: "single" | "per-migration";
  
  /** Maximum number of migrations to run at once */
  maxConcurrentMigrations?: number;
}

/**
 * Lifecycle hooks for custom behavior
 */
export interface ZynxHooks {
  /** Called before migration generation */
  beforeGenerate?: () => Promise<void>;
  
  /** Called after migration generation */
  afterGenerate?: (result: ZynxResult) => Promise<void>;
  
  /** Called before running migrations */
  beforeRun?: () => Promise<void>;
  
  /** Called after running migrations */
  afterRun?: (result: ZynxResult) => Promise<void>;
  
  /** Called before each individual migration */
  beforeMigration?: (migration: ZynxMigration) => Promise<void>;
  
  /** Called after each individual migration */
  afterMigration?: (migration: ZynxMigration) => Promise<void>;
}

// =============================================================================
// RESULT AND STATUS TYPES
// =============================================================================

/**
 * Result of Zynx operations
 */
export interface ZynxResult {
  /** Whether the operation was successful */
  success: boolean;
  
  /** Human-readable message */
  message: string;
  
  /** List of migrations that were generated/applied */
  migrations: ZynxMigration[];
  
  /** Execution time in milliseconds */
  executionTime: number;
  
  /** Any errors that occurred */
  errors?: ZynxError[];
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Current migration status
 */
export interface ZynxStatus {
  /** Current schema version */
  currentVersion: number;
  
  /** Latest available migration version */
  latestVersion: number;
  
  /** Number of pending migrations */
  pendingCount: number;
  
  /** List of all migrations with their status */
  migrations: ZynxMigrationStatus[];
  
  /** Database connection status */
  databaseConnected: boolean;
  
  /** Last migration timestamp */
  lastMigration?: Date;
}

/**
 * Individual migration information
 */
export interface ZynxMigration {
  /** Migration version number */
  version: number;
  
  /** Migration file name */
  filename: string;
  
  /** Migration description/name */
  name: string;
  
  /** SQL content of the migration */
  sql: string;
  
  /** Checksum of the migration content */
  checksum: string;
  
  /** Migration type */
  type: "snapshot" | "incremental";
  
  /** When this migration was created */
  createdAt: Date;
  
  /** When this migration was applied (if applied) */
  appliedAt?: Date;
  
  /** Execution time in milliseconds (if applied) */
  executionTime?: number;
}

/**
 * Migration status information
 */
export interface ZynxMigrationStatus {
  /** Migration number */
  number: number;
  
  /** Migration filename */
  filename: string;
  
  /** When this migration was applied */
  appliedAt: Date;
  
  /** Migration checksum */
  checksum: string;
  
  /** Execution time in milliseconds */
  executionTime: number;
  
  /** Migration name (optional) */
  name?: string;
}

/**
 * Zynx error information
 */
export interface ZynxError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Stack trace if available */
  stack?: string;
  
  /** Context information */
  context?: Record<string, unknown>;
}

// =============================================================================
// SCHEMA AND DBML TYPES
// =============================================================================

/**
 * Parsed database schema from DBML
 */
export interface DatabaseSchema {
  /** Database name */
  name?: string;
  
  /** Schema tables */
  tables: DBMLTable[];
  
  /** Schema indexes */
  indexes: DBMLIndex[];
  
  /** Table relationships */
  refs: DBMLRef[];
  
  /** Schema metadata */
  metadata?: Record<string, unknown>;
}

/**
 * DBML table definition
 */
export interface DBMLTable {
  /** Table name */
  name: string;
  
  /** Table fields/columns */
  fields: DBMLField[];
  
  /** Table-level indexes */
  indexes?: DBMLIndex[];
  
  /** Table note/comment */
  note?: string;
  
  /** Table metadata */
  metadata?: Record<string, unknown>;
}

/**
 * DBML field/column definition
 */
export interface DBMLField {
  /** Field name */
  name: string;
  
  /** Field data type */
  type: string;
  
  /** Whether field is primary key */
  pk?: boolean;
  
  /** Whether field is unique */
  unique?: boolean;
  
  /** Whether field is not null */
  not_null?: boolean;
  
  /** Default value */
  default?: string;
  
  /** Field note/comment */
  note?: string;
  
  /** Field metadata */
  metadata?: Record<string, unknown>;
}

/**
 * DBML index definition
 */
export interface DBMLIndex {
  /** Index name */
  name?: string;
  
  /** Table this index belongs to */
  tableName: string;
  
  /** Indexed columns */
  columns: string[];
  
  /** Index type (btree, hash, etc.) */
  type?: string;
  
  /** Whether index is unique */
  unique?: boolean;
  
  /** Whether this is a primary key */
  pk?: boolean;
  
  /** Index note/comment */
  note?: string;
}

/**
 * DBML relationship/reference definition
 */
export interface DBMLRef {
  /** Reference name */
  name?: string;
  
  /** Source table and column */
  from: {
    table: string;
    column: string;
  };
  
  /** Target table and column */
  to: {
    table: string;
    column: string;
  };
  
  /** Relationship type */
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  
  /** Delete action */
  onDelete?: "cascade" | "restrict" | "set null" | "set default";
  
  /** Update action */
  onUpdate?: "cascade" | "restrict" | "set null" | "set default";
}

// =============================================================================
// GENERATOR PLUGIN INTERFACE
// =============================================================================

/**
 * SQL generator plugin interface
 */
export interface GeneratorPlugin {
  /** Generator name */
  name: string;
  
  /** Target database dialect */
  dialect: "postgresql" | "mysql" | "sqlite";
  
  /** Generate CREATE TABLE statement */
  generateCreateTable(table: DBMLTable): string;
  
  /** Generate ALTER TABLE statements */
  generateAlterTable(oldTable: DBMLTable, newTable: DBMLTable): string[];
  
  /** Generate CREATE INDEX statement */
  generateCreateIndex(index: DBMLIndex): string;
  
  /** Generate DROP INDEX statement */
  generateDropIndex(index: DBMLIndex): string;
  
  /** Generate ADD FOREIGN KEY statement */
  generateAddForeignKey(ref: DBMLRef): string;
  
  /** Generate DROP FOREIGN KEY statement */
  generateDropForeignKey(ref: DBMLRef): string;
  
  /** Map DBML type to database-specific type */
  mapDBMLType(dbmlType: string): string;
  
  /** Generate complete schema SQL */
  generateCompleteSchema(schema: DatabaseSchema): string;
}

// =============================================================================
// CLI TYPES
// =============================================================================

/**
 * CLI options
 */
export interface CLIOptions {
  /** Verbose output */
  verbose?: boolean;
  
  /** Config file path */
  configPath?: string;
  
  /** Dry run mode */
  dryRun?: boolean;
}

/**
 * CLI command interface
 */
export interface CLICommand {
  /** Command name */
  name: string;
  
  /** Command description */
  description: string;
  
  /** Execute the command */
  execute(args: string[], options: CLIOptions): Promise<void>;
}

// =============================================================================
// ADDITIONAL CONFIGURATION TYPES
// =============================================================================

/**
 * Migration configuration interface
 */
export interface MigrationConfig {
  /** Directory where migrations are stored */
  directory: string;
  
  /** Name of the migrations tracking table */
  tableName: string;
  
  /** Lock timeout for migrations */
  lockTimeout?: number;
  
  /** Query timeout for migrations */
  queryTimeout?: number;
  
  /** Transaction mode for migrations */
  transactionMode?: "single" | "per-migration";
}

/**
 * Schema configuration interface
 */
export interface SchemaConfig {
  /** Path to the schema file */
  path: string;
  
  /** Schema format */
  format?: "dbml";
  
  /** File encoding */
  encoding?: "utf8";
}

/**
 * Generator configuration interface
 */
export interface GeneratorConfig {
  /** Add DROP statements */
  addDropStatements?: boolean;
  
  /** Add IF NOT EXISTS clauses */
  addIfNotExists?: boolean;
  
  /** Add comments to generated SQL */
  addComments?: boolean;
  
  /** Indentation style */
  indent?: string;
  
  /** Line ending style */
  lineEnding?: string;
}

// =============================================================================
// OPERATION OPTIONS AND RESULTS
// =============================================================================

/**
 * Options for migration generation
 */
export interface GenerateOptions {
  /** Force regeneration even if no changes */
  force?: boolean;
  
  /** Dry run mode */
  dryRun?: boolean;
  
  /** Migration name */
  name?: string;
}

/**
 * Options for running migrations
 */
export interface RunOptions {
  /** Dry run mode */
  dryRun?: boolean;
  
  /** Force run even with warnings */
  force?: boolean;
  
  /** Run specific migration */
  target?: number;
  
  /** Run only one migration */
  single?: boolean;
}

/**
 * Options for rolling back migrations
 */
export interface RollbackOptions {
  /** Dry run mode */
  dryRun?: boolean;
  
  /** Force rollback even with warnings */
  force?: boolean;
  
  /** Rollback to specific migration */
  target?: number;
}

/**
 * Result of migration generation
 */
export interface GenerationResult {
  /** Generated migration file name */
  filename: string;
  
  /** Migration SQL content */
  sql: string;
  
  /** Schema changes detected */
  changes: SchemaChange[];
  
  /** File checksum */
  checksum: string;
  
  /** Execution time */
  executionTime: number;
}

/**
 * Result of migration execution
 */
export interface MigrationResult {
  /** Whether execution was successful */
  success: boolean;
  
  /** Applied migrations */
  migrationsApplied: ZynxMigrationStatus[];
  
  /** Any errors */
  errors: string[];
  
  /** Current migration number */
  currentMigration: number;
  
  /** Execution time */
  executionTime: number;
}

/**
 * Result of migration rollback
 */
export interface RollbackResult {
  /** Whether rollback was successful */
  success: boolean;
  
  /** Rolled back migrations */
  rolledBackMigrations: ZynxMigration[];
  
  /** Execution time */
  executionTime: number;
  
  /** Any errors */
  errors?: string[];
  
  /** Migrations rolled back (alias for rolledBackMigrations) */
  migrationsRolledBack: ZynxMigration[];
  
  /** Current migration after rollback */
  currentMigration?: number;
}

/**
 * Database status information
 */
export interface DatabaseStatus {
  /** Database connection status */
  connected: boolean;
  
  /** Database version */
  version?: string;
  
  /** Migrations table exists */
  migrationsTableExists: boolean;
  
  /** Current migration version */
  currentVersion: number;
  
  /** Latest available version */
  latestVersion: number;
  
  /** Database connection status (alias for connected) */
  databaseConnected: boolean;
  
  /** Current migration information */
  currentMigration?: number;
  
  /** Applied migrations */
  appliedMigrations: ZynxMigrationStatus[];
  
  /** Pending migrations */
  pendingMigrations: ZynxMigrationStatus[];
  
  /** File system migrations */
  fileSystemMigrations: MigrationFile[];
}

/**
 * Migration file information
 */
export interface MigrationFile {
  /** Migration number */
  number: number;
  
  /** Migration filename */
  filename: string;
  
  /** File content */
  content: string;
  
  /** File checksum */
  checksum: string;
  
  /** Creation time */
  createdAt: Date;
}

/**
 * Schema change information
 */
export interface SchemaChange {
  /** Change type */
  type: "create" | "alter" | "drop";
  
  /** Target element type */
  target: "table" | "column" | "index" | "constraint";
  
  /** Target name */
  name: string;
  
  /** Change description */
  description: string;
  
  /** SQL statements */
  sql: string[];
}
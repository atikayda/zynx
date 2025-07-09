/**
 * 🦎 Zynx Configuration Utilities
 * 
 * Helper functions for creating and managing Zynx configurations
 */

import type { ZynxConfig, DatabaseConfig, MigrationSettings } from "../types.ts";

/**
 * Create a Zynx configuration with intelligent defaults
 * 
 * @example
 * ```typescript
 * const config = createConfig({
 *   dbmlPath: "./database.dbml",
 *   migrationsDir: "./migrations",
 *   database: {
 *     type: "postgresql",
 *     connectionString: "postgresql://localhost:5432/myapp"
 *   }
 * });
 * ```
 */
export function createConfig(options: Partial<ZynxConfig> & {
  dbmlPath: string;
  migrationsDir: string;
  database: DatabaseConfig;
}): ZynxConfig {
  return {
    dbmlPath: options.dbmlPath,
    migrationsDir: options.migrationsDir,
    database: options.database,
    settings: {
      migrationTableName: "_migrations",
      snapshotName: "snapshot",
      migrationPrefix: "",
      transactionMode: "single",
      maxConcurrentMigrations: 1,
      ...options.settings
    },
    hooks: options.hooks,
    generator: options.generator
  };
}

/**
 * Load configuration from a TypeScript file
 * 
 * @example
 * ```typescript
 * // zynx.config.ts
 * export default {
 *   dbmlPath: "./database.dbml",
 *   // ... other config
 * };
 * 
 * // Load it
 * const config = await loadConfig("./zynx.config.ts");
 * ```
 */
export async function loadConfig(configPath: string): Promise<ZynxConfig> {
  try {
    const configModule = await import(configPath);
    const config = configModule.default || configModule;
    
    if (!isValidConfig(config)) {
      throw new Error(`Invalid configuration in ${configPath}`);
    }
    
    return config;
  } catch (error) {
    throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
  }
}

/**
 * Load configuration from environment variables
 * 
 * Useful for containerized deployments or CI/CD pipelines
 */
export function loadConfigFromEnv(): Partial<ZynxConfig> {
  return {
    dbmlPath: Deno.env.get("ZYNX_DBML_PATH"),
    migrationsDir: Deno.env.get("ZYNX_MIGRATIONS_DIR"),
    database: {
      type: (Deno.env.get("ZYNX_DB_TYPE") as "postgresql") || "postgresql",
      connectionString: Deno.env.get("DATABASE_URL") || Deno.env.get("ZYNX_DB_URL") || "",
      ssl: Deno.env.get("ZYNX_DB_SSL") === "true"
    },
    settings: {
      migrationTableName: Deno.env.get("ZYNX_MIGRATION_TABLE") || "_migrations",
      snapshotName: Deno.env.get("ZYNX_SNAPSHOT_NAME") || "snapshot",
      migrationPrefix: Deno.env.get("ZYNX_MIGRATION_PREFIX") || "",
      transactionMode: (Deno.env.get("ZYNX_TRANSACTION_MODE") as "single" | "per-migration") || "single"
    }
  };
}

/**
 * Validate a configuration object
 */
export function isValidConfig(config: unknown): config is ZynxConfig {
  if (!config || typeof config !== "object") {
    return false;
  }
  
  const c = config as Partial<ZynxConfig>;
  
  // Required fields
  if (!c.dbmlPath || typeof c.dbmlPath !== "string") {
    return false;
  }
  
  if (!c.migrationsDir || typeof c.migrationsDir !== "string") {
    return false;
  }
  
  if (!c.database || typeof c.database !== "object") {
    return false;
  }
  
  // Database config validation
  const db = c.database as Partial<DatabaseConfig>;
  if (!db.type || !["postgresql", "mysql", "sqlite"].includes(db.type)) {
    return false;
  }
  
  if (!db.connectionString || typeof db.connectionString !== "string") {
    return false;
  }
  
  return true;
}

/**
 * Merge multiple configuration sources with precedence
 * 
 * Priority: explicit config > config file > environment > defaults
 */
export async function mergeConfigs(
  explicitConfig?: Partial<ZynxConfig>,
  configPath?: string
): Promise<ZynxConfig> {
  // Start with environment config
  const envConfig = loadConfigFromEnv();
  
  // Load config file if provided
  let fileConfig: Partial<ZynxConfig> = {};
  if (configPath) {
    try {
      fileConfig = await loadConfig(configPath);
    } catch (error) {
      console.warn(`⚠️ Failed to load config file ${configPath}: ${error.message}`);
    }
  }
  
  // Merge configurations with precedence
  const merged = {
    ...envConfig,
    ...fileConfig,
    ...explicitConfig,
    settings: {
      ...envConfig.settings,
      ...fileConfig.settings,
      ...explicitConfig?.settings
    },
    hooks: {
      ...fileConfig.hooks,
      ...explicitConfig?.hooks
    }
  };
  
  // Validate required fields
  if (!merged.dbmlPath) {
    throw new Error("dbmlPath is required in configuration");
  }
  
  if (!merged.migrationsDir) {
    throw new Error("migrationsDir is required in configuration");
  }
  
  if (!merged.database?.connectionString) {
    throw new Error("database.connectionString is required in configuration");
  }
  
  return merged as ZynxConfig;
}

/**
 * Display configuration for debugging
 */
export function displayConfig(config: ZynxConfig): void {
  console.log("🦎 Zynx Configuration:");
  console.log("   DBML Path:", config.dbmlPath);
  console.log("   Migrations Dir:", config.migrationsDir);
  console.log("   Database Type:", config.database.type);
  console.log("   Migration Table:", config.settings?.migrationTableName);
  console.log("   Snapshot Name:", config.settings?.snapshotName);
  console.log("   Transaction Mode:", config.settings?.transactionMode);
  
  if (config.settings?.migrationPrefix) {
    console.log("   Migration Prefix:", config.settings.migrationPrefix);
  }
  
  // Don't log connection string for security
  const hasConnectionString = !!config.database.connectionString;
  console.log("   Connection String:", hasConnectionString ? "✅ Configured" : "❌ Missing");
}

/**
 * Create a minimal config for testing
 */
export function createTestConfig(overrides: Partial<ZynxConfig> = {}): ZynxConfig {
  return createConfig({
    dbmlPath: "./test-database.dbml",
    migrationsDir: "./test-migrations",
    database: {
      type: "postgresql",
      connectionString: "postgresql://localhost:5432/zynx_test"
    },
    settings: {
      migrationTableName: "_test_migrations",
      snapshotName: "test_snapshot",
      migrationPrefix: "test_"
    },
    ...overrides
  });
}
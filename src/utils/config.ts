/**
 * 🦎 Zynx Configuration Utilities
 * 
 * Helper functions for creating and managing Zynx configurations
 */

import type { ZynxConfig, DatabaseConfig, MigrationConfig, SchemaConfig } from "../types.ts";
import { ConfigValidator } from "./validation.ts";
import { ConfigError, ErrorHandler } from "./errors.ts";
import { parse as parseYaml } from "@std/yaml";
import { parse as parseJson } from "@atikayda/kjson";

/**
 * Create a Zynx configuration with intelligent defaults
 * 
 * @example
 * ```typescript
 * const config = createConfig({
 *   database: {
 *     type: "postgresql",
 *     connectionString: "postgresql://localhost:5432/myapp"
 *   },
 *   migrations: {
 *     directory: "./migrations",
 *     tableName: "zynx_migrations"
 *   },
 *   schema: {
 *     path: "./database.dbml"
 *   }
 * });
 * ```
 */
export function createConfig(options: {
  database: DatabaseConfig;
  dbmlPath?: string;
  migrationsDir?: string;
  settings?: Partial<import("../types.ts").MigrationSettings>;
}): ZynxConfig {
  const config: ZynxConfig = {
    database: options.database,
    migrations: {
      directory: options.migrationsDir || "./migrations",
      tableName: "zynx_migrations",
      transactionMode: "single",
      ...options.settings
    },
    schema: {
      path: options.dbmlPath || "./database.dbml",
      format: "dbml",
      encoding: "utf8"
    }
  };

  // Validate the configuration
  ConfigValidator.validate(config);

  return config;
}

/**
 * Discover configuration files in order of preference
 */
export async function discoverConfigFile(): Promise<string | null> {
  const configFiles = [
    "./zynx.config.yaml",
    "./zynx.config.yml", 
    "./zynx.config.json",
    "./zynx.config.ts",
    "./zynx.config.js",
    "./zynx.config.mjs"
  ];
  
  for (const configFile of configFiles) {
    try {
      const stat = await Deno.stat(configFile);
      if (stat.isFile) {
        return configFile;
      }
    } catch {
      // File doesn't exist, continue to next
      continue;
    }
  }
  
  return null;
}

/**
 * Load configuration from a file (supports .yaml, .yml, .json, .ts, .js, .mjs)
 * 
 * @example
 * ```typescript
 * // zynx.config.ts
 * export default {
 *   database: { ... },
 *   migrations: { ... },
 *   schema: { ... }
 * };
 * 
 * // zynx.config.json
 * {
 *   "database": { ... },
 *   "migrations": { ... },
 *   "schema": { ... }
 * }
 * 
 * // Load it
 * const config = await loadConfig("./zynx.config.ts");
 * ```
 */
export async function loadConfig(configPath?: string): Promise<ZynxConfig> {
  let path = configPath;
  
  // If no explicit path provided, discover config file
  if (!path) {
    const discoveredPath = await discoverConfigFile();
    if (!discoveredPath) {
      throw new ConfigError(
        "No configuration file found. Run 'zynx init' to create one.\n" +
        "Searched for: zynx.config.yaml, zynx.config.yml, zynx.config.json, zynx.config.ts, zynx.config.js, zynx.config.mjs",
        { searchedPaths: ["./zynx.config.yaml", "./zynx.config.yml", "./zynx.config.json", "./zynx.config.ts", "./zynx.config.js", "./zynx.config.mjs"] }
      );
    }
    path = discoveredPath;
  }
  
  try {
    let config: unknown;
    
    // Handle YAML files
    if (path.endsWith('.yaml') || path.endsWith('.yml')) {
      const yamlContent = await Deno.readTextFile(path);
      config = parseYaml(yamlContent);
    } else if (path.endsWith('.json')) {
      // Handle JSON files with kjson for better error handling and BigInt support
      const jsonContent = await Deno.readTextFile(path);
      config = parseJson(jsonContent);
    } else {
      // Handle TypeScript/JavaScript files
      const configModule = await import(path);
      config = configModule.default || configModule.config || configModule;
    }
    
    // Validate the loaded configuration
    ConfigValidator.validate(config);
    
    return config as ZynxConfig;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new ConfigError(
        `Configuration file not found: ${path}. Run 'zynx init' to create one.`,
        { configPath: path }
      );
    }
    
    const err = ErrorHandler.fromUnknown(error);
    if (err.name === "ValidationError" || err.name === "ConfigError") {
      throw err;
    }
    
    throw new ConfigError(
      `Failed to load configuration from ${path}: ${err.message}`,
      { configPath: path, originalError: err.message }
    );
  }
}

/**
 * Load configuration from environment variables
 * 
 * Useful for containerized deployments or CI/CD pipelines
 */
export function loadConfigFromEnv(): Partial<ZynxConfig> {
  const database: Partial<DatabaseConfig> = {
    type: (Deno.env.get("ZYNX_DB_TYPE") as "postgresql") || "postgresql",
    connectionString: Deno.env.get("DATABASE_URL") || Deno.env.get("ZYNX_DB_URL") || "",
    ssl: Deno.env.get("ZYNX_DB_SSL") === "true"
  };

  const migrations: Partial<MigrationConfig> = {
    directory: Deno.env.get("ZYNX_MIGRATIONS_DIR") || "./migrations",
    tableName: Deno.env.get("ZYNX_MIGRATION_TABLE") || "zynx_migrations",
    lockTimeout: parseInt(Deno.env.get("ZYNX_LOCK_TIMEOUT") || "30000"),
    queryTimeout: parseInt(Deno.env.get("ZYNX_QUERY_TIMEOUT") || "60000")
  };

  const schema: Partial<SchemaConfig> = {
    path: Deno.env.get("ZYNX_SCHEMA_PATH") || "./database.dbml",
    format: "dbml",
    encoding: "utf8"
  };

  return {
    database: database as DatabaseConfig,
    migrations: migrations as MigrationConfig,
    schema: schema as SchemaConfig
  };
}

/**
 * Validate a configuration object
 */
export function isValidConfig(config: unknown): config is ZynxConfig {
  try {
    ConfigValidator.validate(config);
    return true;
  } catch {
    return false;
  }
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
      const err = ErrorHandler.fromUnknown(error);
      console.warn(`⚠️ Failed to load config file ${configPath}: ${err.message}`);
    }
  }
  
  // Merge configurations with precedence
  const merged: ZynxConfig = {
    database: {
      ...envConfig.database,
      ...fileConfig.database,
      ...explicitConfig?.database
    } as DatabaseConfig,
    migrations: {
      ...envConfig.migrations,
      ...fileConfig.migrations,
      ...explicitConfig?.migrations
    } as MigrationConfig,
    schema: {
      ...envConfig.schema,
      ...fileConfig.schema,
      ...explicitConfig?.schema
    } as SchemaConfig,
    generator: {
      ...fileConfig.generator,
      ...explicitConfig?.generator
    }
  };
  
  // Validate the merged configuration
  ConfigValidator.validate(merged);
  
  return merged;
}

/**
 * Display configuration for debugging
 */
export function displayConfig(config: ZynxConfig): void {
  console.log("🦎 Zynx Configuration:");
  console.log("   Database Type:", config.database.type);
  console.log("   Schema Path:", config.schema.path);
  console.log("   Migrations Dir:", config.migrations.directory);
  console.log("   Migration Table:", config.migrations.tableName);
  
  if (config.migrations.lockTimeout) {
    console.log("   Lock Timeout:", config.migrations.lockTimeout + "ms");
  }
  
  if (config.migrations.queryTimeout) {
    console.log("   Query Timeout:", config.migrations.queryTimeout + "ms");
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
    database: {
      type: "postgresql",
      connectionString: "postgresql://localhost:5432/zynx_test",
      ...overrides.database
    },
    migrationsDir: "./test-migrations",
    dbmlPath: "./test-database.dbml"
  });
}

/**
 * Validate configuration and provide detailed error messages
 */
export function validateConfigWithDetails(config: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    ConfigValidator.validate(config);
    return { valid: true, errors: [] };
  } catch (error) {
    const err = ErrorHandler.fromUnknown(error);
    if (err.name === "ValidationError") {
      errors.push(err.message);
      if ('field' in err && err.field) {
        errors.push(`Field: ${err.field}`);
      }
      if ('value' in err && err.value !== undefined) {
        errors.push(`Value: ${JSON.stringify(err.value)}`);
      }
    } else {
      errors.push(err.message);
    }
    
    return { valid: false, errors };
  }
}

/**
 * Create a sample configuration for documentation
 */
export function createSampleConfig(): ZynxConfig {
  return {
    database: {
      type: "postgresql",
      connectionString: "postgresql://postgres:password@localhost:5432/myapp",
      ssl: false,
      pool: {
        min: 2,
        max: 10,
        timeout: 30000
      }
    },
    migrations: {
      directory: "./migrations",
      tableName: "zynx_migrations",
      lockTimeout: 30000,
      queryTimeout: 60000
    },
    schema: {
      path: "./database.dbml",
      format: "dbml",
      encoding: "utf8"
    },
    generator: {
      addDropStatements: true,
      addIfNotExists: true,
      addComments: true,
      indent: "  ",
      lineEnding: "\n"
    }
  };
}
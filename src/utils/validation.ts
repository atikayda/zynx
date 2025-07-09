/**
 * 🦎 Zynx Validation - Configuration and Input Validation
 * 
 * Comprehensive validation for Zynx configurations, inputs, and operations
 */

import { Assert, ValidationError } from "./errors.ts";
import type { ZynxConfig, DatabaseConfig, MigrationConfig, SchemaConfig, GeneratorConfig } from "../types.ts";

/**
 * Configuration validation utilities
 */
export class ConfigValidator {
  /**
   * Validate complete Zynx configuration
   */
  static validate(config: unknown): asserts config is ZynxConfig {
    Assert.isObject(config, "config");
    
    const cfg = config as Record<string, unknown>;
    
    // Validate required sections
    Assert.notNull(cfg.database, "config.database is required");
    Assert.notNull(cfg.migrations, "config.migrations is required");
    Assert.notNull(cfg.schema, "config.schema is required");
    
    // Validate each section
    this.validateDatabase(cfg.database);
    this.validateMigrations(cfg.migrations);
    this.validateSchema(cfg.schema);
    
    if (cfg.generator !== undefined) {
      this.validateGenerator(cfg.generator);
    }
  }
  
  /**
   * Validate database configuration
   */
  static validateDatabase(config: unknown): asserts config is DatabaseConfig {
    Assert.isObject(config, "database");
    
    const db = config as Record<string, unknown>;
    
    Assert.notNull(db.type, "database.type is required");
    Assert.isString(db.type, "database.type");
    Assert.isOneOf(db.type, ["postgresql", "mysql", "sqlite"], "database.type");
    
    Assert.notNull(db.connectionString, "database.connectionString is required");
    Assert.isString(db.connectionString, "database.connectionString");
    Assert.notEmpty(db.connectionString, "database.connectionString");
    
    // Validate connection string format
    this.validateConnectionString(db.connectionString, db.type);
    
    if (db.ssl !== undefined) {
      Assert.isBoolean(db.ssl, "database.ssl");
    }
    
    if (db.pool !== undefined) {
      Assert.isObject(db.pool, "database.pool");
      const pool = db.pool as Record<string, unknown>;
      
      if (pool.min !== undefined) {
        Assert.isNumber(pool.min, "database.pool.min");
        Assert.isPositive(pool.min, "database.pool.min");
      }
      
      if (pool.max !== undefined) {
        Assert.isNumber(pool.max, "database.pool.max");
        Assert.isPositive(pool.max, "database.pool.max");
      }
      
      if (pool.timeout !== undefined) {
        Assert.isNumber(pool.timeout, "database.pool.timeout");
        Assert.isPositive(pool.timeout, "database.pool.timeout");
      }
    }
  }
  
  /**
   * Validate migrations configuration
   */
  static validateMigrations(config: unknown): asserts config is MigrationConfig {
    Assert.isObject(config, "migrations");
    
    const mig = config as Record<string, unknown>;
    
    Assert.notNull(mig.directory, "migrations.directory is required");
    Assert.isString(mig.directory, "migrations.directory");
    Assert.notEmpty(mig.directory, "migrations.directory");
    
    Assert.notNull(mig.tableName, "migrations.tableName is required");
    Assert.isString(mig.tableName, "migrations.tableName");
    Assert.notEmpty(mig.tableName, "migrations.tableName");
    
    // Validate table name format (SQL identifier)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(mig.tableName)) {
      throw new ValidationError(
        "migrations.tableName must be a valid SQL identifier",
        "migrations.tableName",
        mig.tableName
      );
    }
    
    if (mig.lockTimeout !== undefined) {
      Assert.isNumber(mig.lockTimeout, "migrations.lockTimeout");
      Assert.isPositive(mig.lockTimeout, "migrations.lockTimeout");
    }
    
    if (mig.queryTimeout !== undefined) {
      Assert.isNumber(mig.queryTimeout, "migrations.queryTimeout");
      Assert.isPositive(mig.queryTimeout, "migrations.queryTimeout");
    }
  }
  
  /**
   * Validate schema configuration
   */
  static validateSchema(config: unknown): asserts config is SchemaConfig {
    Assert.isObject(config, "schema");
    
    const schema = config as Record<string, unknown>;
    
    Assert.notNull(schema.path, "schema.path is required");
    Assert.isString(schema.path, "schema.path");
    Assert.notEmpty(schema.path, "schema.path");
    
    // Validate file extension
    if (!schema.path.endsWith(".dbml")) {
      throw new ValidationError(
        "schema.path must point to a .dbml file",
        "schema.path",
        schema.path
      );
    }
    
    if (schema.format !== undefined) {
      Assert.isString(schema.format, "schema.format");
      Assert.isOneOf(schema.format, ["dbml"], "schema.format");
    }
    
    if (schema.encoding !== undefined) {
      Assert.isString(schema.encoding, "schema.encoding");
      Assert.isOneOf(schema.encoding, ["utf8", "utf16le"], "schema.encoding");
    }
  }
  
  /**
   * Validate generator configuration
   */
  static validateGenerator(config: unknown): asserts config is GeneratorConfig {
    Assert.isObject(config, "generator");
    
    const gen = config as Record<string, unknown>;
    
    if (gen.addDropStatements !== undefined) {
      Assert.isBoolean(gen.addDropStatements, "generator.addDropStatements");
    }
    
    if (gen.addIfNotExists !== undefined) {
      Assert.isBoolean(gen.addIfNotExists, "generator.addIfNotExists");
    }
    
    if (gen.addComments !== undefined) {
      Assert.isBoolean(gen.addComments, "generator.addComments");
    }
    
    if (gen.indent !== undefined) {
      Assert.isString(gen.indent, "generator.indent");
    }
    
    if (gen.lineEnding !== undefined) {
      Assert.isString(gen.lineEnding, "generator.lineEnding");
      Assert.isOneOf(gen.lineEnding, ["\n", "\r\n"], "generator.lineEnding");
    }
  }
  
  /**
   * Validate connection string format
   */
  private static validateConnectionString(connectionString: string, type: string): void {
    switch (type) {
      case "postgresql":
        if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("postgres://")) {
          throw new ValidationError(
            "PostgreSQL connection string must start with 'postgresql://' or 'postgres://'",
            "database.connectionString",
            connectionString
          );
        }
        break;
        
      case "mysql":
        if (!connectionString.startsWith("mysql://")) {
          throw new ValidationError(
            "MySQL connection string must start with 'mysql://'",
            "database.connectionString",
            connectionString
          );
        }
        break;
        
      case "sqlite":
        if (!connectionString.startsWith("sqlite://") && !connectionString.startsWith("file:")) {
          throw new ValidationError(
            "SQLite connection string must start with 'sqlite://' or 'file:'",
            "database.connectionString",
            connectionString
          );
        }
        break;
    }
  }
}

/**
 * Input validation utilities
 */
export class InputValidator {
  /**
   * Validate migration file name
   */
  static validateMigrationFilename(filename: string): void {
    Assert.isString(filename, "filename");
    Assert.notEmpty(filename, "filename");
    
    if (!/^\d{4}\.sql$/.test(filename) && filename !== "snapshot.sql") {
      throw new ValidationError(
        "Migration filename must be in format '0001.sql' or 'snapshot.sql'",
        "filename",
        filename
      );
    }
  }
  
  /**
   * Validate migration number
   */
  static validateMigrationNumber(number: unknown): asserts number is number {
    Assert.isNumber(number, "migrationNumber");
    
    if (!Number.isInteger(number) || number < 0) {
      throw new ValidationError(
        "Migration number must be a non-negative integer",
        "migrationNumber",
        number
      );
    }
  }
  
  /**
   * Validate SQL content
   */
  static validateSQLContent(sql: string): void {
    Assert.isString(sql, "sql");
    Assert.notEmpty(sql, "sql");
    
    // Check for dangerous SQL patterns
    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /TRUNCATE\s+DATABASE/i,
      /DELETE\s+FROM\s+\w+\s*;?\s*$/i, // DELETE without WHERE
      /UPDATE\s+\w+\s+SET\s+.*\s*;?\s*$/i // UPDATE without WHERE
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        throw new ValidationError(
          "SQL contains potentially dangerous statements",
          "sql",
          sql.substring(0, 100) + "..."
        );
      }
    }
  }
  
  /**
   * Validate file path
   */
  static validateFilePath(path: string): void {
    Assert.isString(path, "path");
    Assert.notEmpty(path, "path");
    
    // Check for path traversal attempts
    if (path.includes("..") || path.includes("~")) {
      throw new ValidationError(
        "File path contains potentially dangerous characters",
        "path",
        path
      );
    }
    
    // Check for absolute paths (should be relative)
    if (path.startsWith("/") || (path.length > 1 && path[1] === ":")) {
      throw new ValidationError(
        "File path should be relative, not absolute",
        "path",
        path
      );
    }
  }
  
  /**
   * Validate directory path
   */
  static validateDirectoryPath(path: string): void {
    this.validateFilePath(path);
    
    // Additional directory-specific validations can go here
  }
  
  /**
   * Validate checksum
   */
  static validateChecksum(checksum: string): void {
    Assert.isString(checksum, "checksum");
    Assert.notEmpty(checksum, "checksum");
    
    // SHA-256 checksums are 64 hexadecimal characters
    if (!/^[a-f0-9]{64}$/i.test(checksum)) {
      throw new ValidationError(
        "Checksum must be a 64-character hexadecimal string (SHA-256)",
        "checksum",
        checksum
      );
    }
  }
}

/**
 * Runtime validation utilities
 */
export class RuntimeValidator {
  /**
   * Validate database connectivity
   */
  static async validateDatabaseConnection(connectionString: string): Promise<boolean> {
    // This would typically try to connect to the database
    // For now, return true as actual connection testing is done elsewhere
    return true;
  }
  
  /**
   * Validate file accessibility
   */
  static async validateFileAccess(path: string, operation: "read" | "write"): Promise<boolean> {
    try {
      if (operation === "read") {
        await Deno.stat(path);
        return true;
      } else {
        // Try to create a temporary file to test write access
        const tempPath = `${path}.tmp`;
        await Deno.writeTextFile(tempPath, "test");
        await Deno.remove(tempPath);
        return true;
      }
    } catch {
      return false;
    }
  }
  
  /**
   * Validate directory permissions
   */
  static async validateDirectoryAccess(path: string, operation: "read" | "write"): Promise<boolean> {
    try {
      if (operation === "read") {
        for await (const _ of Deno.readDir(path)) {
          break; // Just test if we can read the directory
        }
        return true;
      } else {
        // Try to create a temporary file to test write access
        const tempPath = `${path}/.zynx-test`;
        await Deno.writeTextFile(tempPath, "test");
        await Deno.remove(tempPath);
        return true;
      }
    } catch {
      return false;
    }
  }
}
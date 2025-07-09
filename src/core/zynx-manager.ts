/**
 * 🦎 Zynx Manager - Core Migration Management
 * 
 * The heart of the Axolotl-Powered Migration System.
 * Handles the complete lifecycle of database schema evolution.
 */

import { DBMLParser } from "./dbml-parser.ts";
import { SchemaDiffer } from "./schema-differ.ts";
import { PostgreSQLGenerator } from "../generators/postgresql.ts";
import { createDatabaseConnection, DatabaseUtils, type DatabaseConnection } from "../utils/db-utils.ts";
import { FileManager } from "../utils/file-utils.ts";
import { ErrorHandler } from "../utils/errors.ts";
import type {
  ZynxConfig,
  GenerateOptions,
  RunOptions,
  RollbackOptions,
  GenerationResult,
  MigrationResult,
  RollbackResult,
  DatabaseStatus,
  MigrationFile,
  ZynxMigrationStatus,
  SchemaChange,
  ZynxError
} from "../types.ts";

/**
 * Main Zynx migration manager
 * 
 * @example
 * ```typescript
 * const zynx = new ZynxManager({
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
 * 
 * await zynx.generate();
 * await zynx.run();
 * ```
 */
export class ZynxManager {
  private config: ZynxConfig;
  private parser: DBMLParser;
  private differ: SchemaDiffer;
  private generator: PostgreSQLGenerator;
  private db: DatabaseConnection;
  private dbUtils: DatabaseUtils;
  private files: FileManager;

  constructor(config: ZynxConfig) {
    this.config = config;
    this.parser = new DBMLParser();
    this.differ = new SchemaDiffer();
    this.generator = new PostgreSQLGenerator();
    this.db = createDatabaseConnection(config.database);
    this.dbUtils = new DatabaseUtils(this.db);
    this.files = new FileManager(config.migrations.directory);
  }

  /**
   * 🧬 Generate migrations from DBML changes
   */
  async generate(options: GenerateOptions = {}): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      console.log("🦎 Zynx is analyzing your schema...");
      
      // Initialize file system
      await this.files.initialize();
      
      // Read current DBML schema
      const currentDbml = await this.readSchemaFile();
      const currentSchema = await this.parser.parse(currentDbml);
      
      // Check if this is the first migration
      const snapshotExists = await this.files.exists("snapshot.sql");
      
      if (!snapshotExists && !options.force) {
        // Generate initial snapshot
        return await this.generateInitialSnapshot(currentSchema, options);
      }
      
      // Read existing snapshot for comparison
      const snapshotDbml = await this.files.exists("snapshot.dbml") 
        ? await this.files.readFile("snapshot.dbml")
        : currentDbml;
      
      const snapshotSchema = await this.parser.parse(snapshotDbml);
      
      // Generate diff
      console.log("🧬 Comparing schema changes...");
      const changes = await this.differ.diff(snapshotSchema, currentSchema);
      
      if (changes.length === 0 && !options.force) {
        return {
          filename: "",
          sql: "",
          changes: [],
          checksum: "",
          executionTime: Date.now() - startTime
        };
      }
      
      // Generate migration SQL
      const migrationSql = await this.generator.generateMigrationSQL(changes);
      
      if (options.dryRun) {
        return {
          filename: `${await this.files.getNextMigrationNumber()}.sql`,
          sql: migrationSql,
          changes,
          checksum: await this.files.calculateChecksum(migrationSql),
          executionTime: Date.now() - startTime
        };
      }
      
      // Write migration file
      const migrationNumber = await this.files.getNextMigrationNumber();
      const filename = `${migrationNumber.toString().padStart(4, '0')}.sql`;
      
      await this.files.writeFile(filename, migrationSql);
      
      // Update snapshots
      await this.updateSnapshots(currentDbml, currentSchema);
      
      console.log(`📄 Generated migration: ${filename}`);
      
      return {
        filename,
        sql: migrationSql,
        changes,
        checksum: await this.files.calculateChecksum(migrationSql),
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      console.error("🚨 Migration generation failed:", err.message);
      throw error;
    }
  }

  /**
   * 🌊 Run pending migrations
   */
  async run(options: RunOptions = {}): Promise<MigrationResult> {
    const startTime = Date.now();
    const migrationsApplied: ZynxMigrationStatus[] = [];
    
    try {
      console.log("🌊 Zynx is swimming through your migrations...");
      
      // Connect to database
      await this.db.connect();
      
      // Ensure migration table exists
      await this.ensureMigrationTable();
      
      // Get current state
      const currentMigration = await this.getCurrentMigration();
      const migrationFiles = await this.getMigrationFiles();
      
      // Filter pending migrations
      const pendingMigrations = migrationFiles.filter(m => 
        m.number > (currentMigration || 0)
      );
      
      if (pendingMigrations.length === 0) {
        console.log("✨ No pending migrations found!");
        return {
          success: true,
          migrationsApplied: [],
          errors: [],
          currentMigration: currentMigration || 0,
          executionTime: Date.now() - startTime
        };
      }
      
      if (options.dryRun) {
        console.log(`🔍 Would apply ${pendingMigrations.length} migrations:`);
        for (const migration of pendingMigrations) {
          console.log(`  ${migration.filename}`);
        }
        return {
          success: true,
          migrationsApplied: [],
          errors: [],
          currentMigration: currentMigration || 0,
          executionTime: Date.now() - startTime
        };
      }
      
      // Apply migrations
      for (const migration of pendingMigrations) {
        if (options.single && migrationsApplied.length > 0) break;
        if (options.target && migration.number > options.target) break;
        
        console.log(`  🌊 Running migration ${migration.filename}...`);
        
        const migrationStartTime = Date.now();
        
        await this.db.transaction(async (tx) => {
          // Execute migration SQL statements
          const statements = migration.content.split(';').filter(stmt => stmt.trim());
          for (const statement of statements) {
            if (statement.trim()) {
              await tx.execute(statement);
            }
          }
          
          // Record migration
          await tx.execute(
            `INSERT INTO ${this.config.migrations.tableName} (number, filename, checksum, applied_at) VALUES ($1, $2, $3, NOW())`,
            [migration.number, migration.filename, migration.checksum]
          );
        });
        
        const migrationStatus: ZynxMigrationStatus = {
          number: migration.number,
          filename: migration.filename,
          appliedAt: new Date(),
          checksum: migration.checksum,
          executionTime: Date.now() - migrationStartTime
        };
        
        migrationsApplied.push(migrationStatus);
        console.log(`  ✅ Migration ${migration.filename} completed`);
      }
      
      const finalMigration = migrationsApplied.length > 0 
        ? migrationsApplied[migrationsApplied.length - 1].number
        : currentMigration || 0;
      
      console.log(`🦎 Applied ${migrationsApplied.length} migrations successfully!`);
      
      return {
        success: true,
        migrationsApplied,
        errors: [],
        currentMigration: finalMigration,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      console.error("🚨 Migration execution failed:", err.message);
      
      const currentMigration = await this.getCurrentMigration();
      return {
        success: false,
        migrationsApplied,
        errors: [ErrorHandler.fromUnknown(error).message],
        currentMigration: currentMigration || 0,
        executionTime: Date.now() - startTime
      };
    } finally {
      await this.db.disconnect();
    }
  }

  /**
   * 📊 Get current migration status
   */
  async getStatus(): Promise<DatabaseStatus> {
    try {
      // Connect to database
      await this.db.connect();
      
      // Check database connection
      const healthCheck = await this.dbUtils.healthCheck();
      
      // Check if migration table exists
      const migrationTableExists = await this.dbUtils.tableExists(this.config.migrations.tableName);
      
      // Get current migration
      const currentMigration = migrationTableExists ? await this.getCurrentMigration() : undefined;
      
      // Get applied migrations
      const appliedMigrations = migrationTableExists ? await this.getAppliedMigrations() : [];
      
      // Get file system migrations
      const fileSystemMigrations = await this.getMigrationFiles();
      
      // Calculate pending migrations
      const pendingMigrations = fileSystemMigrations
        .filter(m => !appliedMigrations.some(am => am.number === m.number))
        .map(m => ({
          number: m.number,
          filename: m.filename,
          appliedAt: new Date(), // Not actually applied yet, but needed for interface
          checksum: m.checksum,
          executionTime: 0,
          name: m.filename.replace(/^\d+[-_]?/, '').replace(/\.sql$/, '')
        }));
      
      return {
        connected: healthCheck.healthy,
        migrationsTableExists: migrationTableExists,
        currentVersion: currentMigration || 0,
        latestVersion: fileSystemMigrations.length > 0 ? Math.max(...fileSystemMigrations.map(m => m.number)) : 0,
        databaseConnected: healthCheck.healthy,
        currentMigration: currentMigration,
        appliedMigrations: appliedMigrations,
        pendingMigrations: pendingMigrations,
        fileSystemMigrations: fileSystemMigrations
      };
      
    } catch (error) {
      return {
        connected: false,
        migrationsTableExists: false,
        currentVersion: 0,
        latestVersion: 0,
        databaseConnected: false,
        currentMigration: undefined,
        appliedMigrations: [],
        pendingMigrations: [],
        fileSystemMigrations: []
      };
    } finally {
      await this.db.disconnect();
    }
  }

  /**
   * ⏪ Rollback migrations (if supported)
   */
  async rollback(options: RollbackOptions = {}): Promise<RollbackResult> {
    const startTime = Date.now();
    
    // For now, return not supported
    console.warn("⚠️  Rollback is not yet implemented");
    console.warn("🦎 Axolotls can regenerate limbs, but rollback needs more work!");
    
    return {
      success: false,
      rolledBackMigrations: [],
      errors: ["Rollback not yet implemented"],
      migrationsRolledBack: [],
      currentMigration: undefined,
      executionTime: Date.now() - startTime
    };
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private async readSchemaFile(): Promise<string> {
    try {
      return await Deno.readTextFile(this.config.schema.path);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw new Error(`🚨 Schema file not found: ${this.config.schema.path}`);
      }
      throw error;
    }
  }

  private async generateInitialSnapshot(schema: any, options: GenerateOptions): Promise<GenerationResult> {
    console.log("🌊 Creating initial schema migration...");
    
    const sql = await this.generator.generateCreateSchema(schema);
    
    if (options.dryRun) {
      return {
        filename: "0001.sql",
        sql,
        changes: [],
        checksum: await this.files.calculateChecksum(sql),
        executionTime: 0
      };
    }
    
    // Write the initial migration as 0001.sql
    await this.files.writeFile("0001.sql", sql);
    
    // Also create snapshots for future comparisons
    await this.files.writeFile("snapshot.sql", sql);
    const currentDbml = await this.readSchemaFile();
    await this.files.writeFile("snapshot.dbml", currentDbml);
    
    console.log("📄 Created initial migration: 0001.sql");
    
    return {
      filename: "0001.sql",
      sql,
      changes: [],
      checksum: await this.files.calculateChecksum(sql),
      executionTime: 0
    };
  }

  private async updateSnapshots(dbmlContent: string, schema: any): Promise<void> {
    // Update DBML snapshot
    await this.files.writeFile("snapshot.dbml", dbmlContent);
    
    // Update SQL snapshot
    const completeSql = await this.generator.generateCreateSchema(schema);
    await this.files.writeFile("snapshot.sql", completeSql);
  }

  private async ensureMigrationTable(): Promise<void> {
    const tableName = this.config.migrations.tableName;
    
    const sql = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        number INTEGER PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await this.db.execute(sql);
  }

  private async getCurrentMigration(): Promise<number | undefined> {
    try {
      const result = await this.db.query(
        `SELECT MAX(number) as current_migration FROM ${this.config.migrations.tableName}`
      );
      
      const currentMigration = (result[0] as any)?.[0];
      return currentMigration || undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async getAppliedMigrations(): Promise<ZynxMigrationStatus[]> {
    try {
      const result = await this.db.query(
        `SELECT number, filename, checksum, applied_at FROM ${this.config.migrations.tableName} ORDER BY number`
      );
      
      return result.map((row: any) => ({
        number: row[0],
        filename: row[1],
        checksum: row[2],
        appliedAt: new Date(row[3]),
        executionTime: 0
      }));
    } catch (error) {
      return [];
    }
  }

  private async getMigrationFiles(): Promise<MigrationFile[]> {
    const files = await this.files.getMigrationFiles();
    const result: MigrationFile[] = [];
    
    for (const filename of files) {
      if (filename.match(/^\d{4}\.sql$/)) {
        const number = parseInt(filename.substring(0, 4), 10);
        const content = await this.files.readFile(filename);
        const checksum = await this.files.calculateChecksum(content);
        const metadata = await this.files.getFileMetadata(filename);
        
        result.push({
          number,
          filename,
          content,
          checksum,
          // size: metadata.size, // Not part of MigrationFile interface
          createdAt: metadata.created,
          // modified: metadata.modified // Not part of MigrationFile interface
        });
      }
    }
    
    return result.sort((a, b) => a.number - b.number);
  }
}
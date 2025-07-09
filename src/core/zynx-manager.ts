/**
 * 🦎 Zynx Manager - Core Migration Management
 * 
 * The heart of the Axolotl-Powered Migration System.
 * Handles the complete lifecycle of database schema evolution.
 */

import { DBMLParser } from "./dbml-parser.ts";
import { SchemaDiffer } from "./schema-differ.ts";
import { PostgreSQLGenerator } from "../generators/postgresql.ts";
import { DatabaseConnection, createDatabaseConnection } from "../utils/db-utils.ts";
import { FileManager } from "../utils/file-utils.ts";
import type {
  ZynxConfig,
  DatabaseConfig,
  GenerateOptions,
  RunOptions,
  RollbackOptions,
  GenerationResult,
  MigrationResult,
  RollbackResult,
  DatabaseStatus
} from "../types.ts";

/**
 * Main Zynx migration manager
 * 
 * @example
 * ```typescript
 * const zynx = new ZynxManager({
 *   dbmlPath: "./database.dbml",
 *   migrationsDir: "./migrations",
 *   database: {
 *     type: "postgresql",
 *     connectionString: "postgresql://localhost:5432/myapp"
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
  private generator: GeneratorPlugin;
  private db: DatabaseConnection;
  private files: FileManager;

  constructor(config: ZynxConfig) {
    this.config = config;
    this.parser = new DBMLParser();
    this.differ = new SchemaDiffer();
    this.generator = config.generator || new PostgreSQLGenerator();
    this.db = new DatabaseConnection(config.database);
    this.files = new FileManager(config.migrationsDir);

    // Apply default settings
    this.config.settings = {
      migrationTableName: "_migrations",
      snapshotName: "snapshot",
      migrationPrefix: "",
      transactionMode: "single",
      maxConcurrentMigrations: 1,
      ...config.settings
    };
  }

  /**
   * 🧬 Generate migrations from DBML changes
   * 
   * Compares current database.dbml with the last snapshot to generate
   * incremental migrations, then updates the snapshot.
   */
  async generate(): Promise<ZynxResult> {
    const startTime = Date.now();
    
    try {
      await this.config.hooks?.beforeGenerate?.();
      
      console.log("🦎 Zynx is analyzing your schema...");
      
      // Read current DBML
      const currentDbml = await this.files.readFile(this.config.dbmlPath);
      const currentSchema = await this.parser.parse(currentDbml);
      
      // Check if snapshot exists
      const snapshotPath = `${this.config.settings!.snapshotName}.dbml`;
      const snapshotExists = await this.files.exists(snapshotPath);
      
      const migrations: ZynxMigration[] = [];
      
      if (!snapshotExists) {
        // First time: Create snapshot migration
        console.log("🌊 Creating initial snapshot migration...");
        const snapshotMigration = await this.generateSnapshotMigration(currentSchema);
        migrations.push(snapshotMigration);
      } else {
        // Compare with existing snapshot
        const snapshotDbml = await this.files.readFile(snapshotPath);
        const snapshotSchema = await this.parser.parse(snapshotDbml);
        
        console.log("🧬 Comparing schema changes...");
        const incrementalMigration = await this.generateIncrementalMigration(
          snapshotSchema, 
          currentSchema
        );
        
        if (incrementalMigration) {
          migrations.push(incrementalMigration);
        }
      }
      
      // Update snapshot files
      await this.updateSnapshot(currentDbml, currentSchema);
      
      const executionTime = Date.now() - startTime;
      const result: ZynxResult = {
        success: true,
        message: migrations.length > 0 
          ? `🦎 Generated ${migrations.length} migration(s) successfully!`
          : "ℹ️ No schema changes detected - everything is up to date!",
        migrations,
        executionTime
      };
      
      await this.config.hooks?.afterGenerate?.(result);
      console.log(result.message);
      
      return result;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const result: ZynxResult = {
        success: false,
        message: "🚨 Migration generation failed",
        migrations: [],
        executionTime,
        errors: [{
          code: "GENERATION_ERROR",
          message: error.message,
          stack: error.stack
        }]
      };
      
      console.error(result.message);
      console.error(error.message);
      
      return result;
    }
  }

  /**
   * 🌊 Run pending migrations
   * 
   * Applies all pending migrations to the database in order,
   * with proper transaction handling and error recovery.
   */
  async run(): Promise<ZynxResult> {
    const startTime = Date.now();
    
    try {
      await this.config.hooks?.beforeRun?.();
      
      console.log("🌊 Zynx is swimming through your migrations...");
      
      // Connect to database
      await this.db.connect();
      
      // Ensure migration table exists
      await this.ensureMigrationTable();
      
      // Check if this is a fresh database
      const currentVersion = await this.getCurrentVersion();
      
      if (currentVersion === 0) {
        // Fresh database: run snapshot migration
        return await this.runSnapshotMigration();
      } else {
        // Existing database: run incremental migrations
        return await this.runIncrementalMigrations(currentVersion);
      }
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const result: ZynxResult = {
        success: false,
        message: "🚨 Migration execution failed",
        migrations: [],
        executionTime,
        errors: [{
          code: "EXECUTION_ERROR",
          message: error.message,
          stack: error.stack
        }]
      };
      
      console.error(result.message);
      console.error(error.message);
      
      return result;
    } finally {
      await this.db.disconnect();
    }
  }

  /**
   * 📊 Get current migration status
   * 
   * Returns detailed information about applied and pending migrations.
   */
  async status(): Promise<ZynxStatus> {
    try {
      await this.db.connect();
      
      const currentVersion = await this.getCurrentVersion();
      const migrationFiles = await this.files.getMigrationFiles();
      const latestVersion = this.getLatestMigrationVersion(migrationFiles);
      
      // TODO: Implement detailed migration status
      const status: ZynxStatus = {
        currentVersion,
        latestVersion,
        pendingCount: Math.max(0, latestVersion - currentVersion),
        migrations: [], // TODO: Build detailed migration list
        databaseConnected: true,
        lastMigration: await this.getLastMigrationDate()
      };
      
      return status;
      
    } catch (error) {
      return {
        currentVersion: 0,
        latestVersion: 0,
        pendingCount: 0,
        migrations: [],
        databaseConnected: false
      };
    } finally {
      await this.db.disconnect();
    }
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private async generateSnapshotMigration(schema: DatabaseSchema): Promise<ZynxMigration> {
    const sql = this.generator.generateCompleteSchema(schema);
    const snapshotPath = `${this.config.settings!.snapshotName}.sql`;
    
    await this.files.writeFile(snapshotPath, sql);
    
    return {
      version: 0,
      filename: snapshotPath,
      name: "Initial schema snapshot",
      sql,
      checksum: await this.files.calculateChecksum(sql),
      type: "snapshot",
      createdAt: new Date()
    };
  }

  private async generateIncrementalMigration(
    oldSchema: DatabaseSchema, 
    newSchema: DatabaseSchema
  ): Promise<ZynxMigration | null> {
    const alterSql = await this.differ.generateAlterStatements(oldSchema, newSchema);
    
    if (!alterSql.trim()) {
      return null; // No changes detected
    }
    
    const version = await this.getNextMigrationVersion();
    const filename = `${String(version).padStart(4, '0')}.sql`;
    
    await this.files.writeFile(filename, alterSql);
    
    return {
      version,
      filename,
      name: `Migration ${version}`,
      sql: alterSql,
      checksum: await this.files.calculateChecksum(alterSql),
      type: "incremental",
      createdAt: new Date()
    };
  }

  private async updateSnapshot(dbmlContent: string, schema: DatabaseSchema): Promise<void> {
    const snapshotDbmlPath = `${this.config.settings!.snapshotName}.dbml`;
    const snapshotSqlPath = `${this.config.settings!.snapshotName}.sql`;
    
    // Update DBML snapshot
    await this.files.writeFile(snapshotDbmlPath, dbmlContent);
    
    // Update SQL snapshot
    const completeSql = this.generator.generateCompleteSchema(schema);
    await this.files.writeFile(snapshotSqlPath, completeSql);
  }

  private async ensureMigrationTable(): Promise<void> {
    const tableName = this.config.settings!.migrationTableName!;
    const sql = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await this.db.execute(sql);
  }

  private async getCurrentVersion(): Promise<number> {
    const tableName = this.config.settings!.migrationTableName!;
    
    try {
      const result = await this.db.query(
        `SELECT COALESCE(MAX(version), 0) as version FROM ${tableName}`
      );
      return result[0]?.version || 0;
    } catch {
      return 0; // Table doesn't exist
    }
  }

  private async getNextMigrationVersion(): Promise<number> {
    const migrationFiles = await this.files.getMigrationFiles();
    const latestVersion = this.getLatestMigrationVersion(migrationFiles);
    return latestVersion + 1;
  }

  private getLatestMigrationVersion(filenames: string[]): number {
    const versions = filenames
      .filter(f => f.match(/^\d{4}\.sql$/))
      .map(f => parseInt(f.substring(0, 4), 10))
      .filter(v => !isNaN(v));
    
    return versions.length > 0 ? Math.max(...versions) : 0;
  }

  private async runSnapshotMigration(): Promise<ZynxResult> {
    const startTime = Date.now();
    
    console.log("🆕 Fresh database detected, running snapshot migration...");
    
    const snapshotPath = `${this.config.settings!.snapshotName}.sql`;
    const sql = await this.files.readFile(snapshotPath);
    
    await this.db.transaction(async (tx) => {
      // Run complete schema
      await tx.execute(sql);
      
      // Set version to latest migration number
      const latestVersion = await this.getNextMigrationVersion() - 1;
      const tableName = this.config.settings!.migrationTableName!;
      
      await tx.execute(
        `INSERT INTO ${tableName} (version) VALUES ($1)`,
        [latestVersion]
      );
    });
    
    const executionTime = Date.now() - startTime;
    const result: ZynxResult = {
      success: true,
      message: `✨ Database initialized successfully!`,
      migrations: [],
      executionTime
    };
    
    await this.config.hooks?.afterRun?.(result);
    console.log(result.message);
    
    return result;
  }

  private async runIncrementalMigrations(currentVersion: number): Promise<ZynxResult> {
    const startTime = Date.now();
    const migrationFiles = await this.files.getMigrationFiles();
    const appliedMigrations: ZynxMigration[] = [];
    
    // Filter and sort pending migrations
    const pendingMigrations = migrationFiles
      .filter(f => f.match(/^\d{4}\.sql$/))
      .map(f => ({
        version: parseInt(f.substring(0, 4), 10),
        filename: f
      }))
      .filter(m => m.version > currentVersion)
      .sort((a, b) => a.version - b.version);
    
    if (pendingMigrations.length === 0) {
      return {
        success: true,
        message: "✨ Database is already up to date!",
        migrations: [],
        executionTime: Date.now() - startTime
      };
    }
    
    console.log(`🔄 Applying ${pendingMigrations.length} pending migration(s)...`);
    
    for (const migration of pendingMigrations) {
      const migrationStartTime = Date.now();
      
      console.log(`  🌊 Running migration ${migration.filename}...`);
      
      const sql = await this.files.readFile(migration.filename);
      const migrationObj: ZynxMigration = {
        version: migration.version,
        filename: migration.filename,
        name: `Migration ${migration.version}`,
        sql,
        checksum: await this.files.calculateChecksum(sql),
        type: "incremental",
        createdAt: new Date(),
        appliedAt: new Date(),
        executionTime: 0
      };
      
      await this.config.hooks?.beforeMigration?.(migrationObj);
      
      await this.db.transaction(async (tx) => {
        await tx.execute(sql);
        
        const tableName = this.config.settings!.migrationTableName!;
        await tx.execute(
          `INSERT INTO ${tableName} (version) VALUES ($1)`,
          [migration.version]
        );
      });
      
      migrationObj.executionTime = Date.now() - migrationStartTime;
      appliedMigrations.push(migrationObj);
      
      await this.config.hooks?.afterMigration?.(migrationObj);
      
      console.log(`  ✅ Migration ${migration.filename} completed`);
    }
    
    const executionTime = Date.now() - startTime;
    const result: ZynxResult = {
      success: true,
      message: `✨ Applied ${appliedMigrations.length} migration(s) successfully!`,
      migrations: appliedMigrations,
      executionTime
    };
    
    await this.config.hooks?.afterRun?.(result);
    console.log(result.message);
    
    return result;
  }

  private async getLastMigrationDate(): Promise<Date | undefined> {
    const tableName = this.config.settings!.migrationTableName!;
    
    try {
      const result = await this.db.query(
        `SELECT applied_at FROM ${tableName} ORDER BY version DESC LIMIT 1`
      );
      return result[0]?.applied_at;
    } catch {
      return undefined;
    }
  }
}
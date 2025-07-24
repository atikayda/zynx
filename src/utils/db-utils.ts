/**
 * 🦎 Zynx Database Utilities - Connection and Query Management
 * 
 * Handles database connections, transactions, and query execution
 * with proper error handling and connection pooling.
 */

import type { DatabaseConfig } from "../types.ts";
import { ErrorHandler } from "./errors.ts";

/**
 * Database connection interface for different database types
 */
export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;
  isConnected(): boolean;
}

/**
 * Database transaction interface
 */
export interface DatabaseTransaction {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

/**
 * PostgreSQL database connection implementation
 */
export class PostgreSQLConnection implements DatabaseConnection {
  private config: DatabaseConfig;
  private client: any = null;
  private connected = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Connect to PostgreSQL database
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Import PostgreSQL client dynamically
      const { Client } = await import("pg");
      
      this.client = new Client(this.config.connectionString);
      await this.client.connect();
      this.connected = true;
      
      console.log("🌊 Connected to PostgreSQL database");
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to connect to PostgreSQL: ${err.message}`);
    }
  }

  /**
   * Disconnect from PostgreSQL database
   */
  async disconnect(): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    try {
      await this.client.end();
      this.connected = false;
      this.client = null;
      console.log("🦎 Disconnected from PostgreSQL database");
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      console.warn(`⚠️ Error disconnecting from PostgreSQL: ${err.message}`);
    }
  }

  /**
   * Execute a query and return results
   */
  async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
    if (!this.connected || !this.client) {
      throw new Error("🚨 Database not connected");
    }

    try {
      const result = await this.client.query(sql, params);
      return result.rows;
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Query execution failed: ${err.message}\nSQL: ${sql}`);
    }
  }

  /**
   * Execute a statement without returning results
   */
  async execute(sql: string, params: unknown[] = []): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error("🚨 Database not connected");
    }

    try {
      await this.client.query(sql, params);
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Statement execution failed: ${err.message}\nSQL: ${sql}`);
    }
  }

  /**
   * Execute multiple statements in a transaction
   */
  async transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    if (!this.connected || !this.client) {
      throw new Error("🚨 Database not connected");
    }

    try {
      await this.client.query('BEGIN');
      
      const tx: DatabaseTransaction = {
        query: async (sql: string, params: unknown[] = []) => {
          const result = await this.client.query(sql, params);
          return result.rows;
        },
        execute: async (sql: string, params: unknown[] = []) => {
          await this.client.query(sql, params);
        }
      };
      
      const result = await callback(tx);
      await this.client.query('COMMIT');
      
      return result;
    } catch (error) {
      try {
        await this.client.query('ROLLBACK');
      } catch (rollbackError) {
        // Log rollback error but throw original error
        console.warn('⚠️ Rollback failed:', rollbackError);
      }
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Transaction failed: ${err.message}`);
    }
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Factory function to create database connection based on config
 */
export function createDatabaseConnection(config: DatabaseConfig): DatabaseConnection {
  switch (config.type) {
    case "postgresql":
      return new PostgreSQLConnection(config);
    case "mysql":
      throw new Error("🚨 MySQL support not implemented yet");
    case "sqlite":
      throw new Error("🚨 SQLite support not implemented yet");
    default:
      throw new Error(`🚨 Unsupported database type: ${config.type}`);
  }
}

/**
 * Database utility functions
 */
export class DatabaseUtils {
  private connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  /**
   * Check if a table exists in the database
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.connection.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );
      
      return !!(result[0] && (result[0] as any[])[0] === true);
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to check table existence: ${err.message}`);
    }
  }

  /**
   * Check if a column exists in a table
   */
  async columnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      const result = await this.connection.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1 
          AND column_name = $2
        )`,
        [tableName, columnName]
      );
      
      return !!(result[0] && (result[0] as any[])[0] === true);
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to check column existence: ${err.message}`);
    }
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    try {
      const result = await this.connection.query(
        `SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE indexname = $1
        )`,
        [indexName]
      );
      
      return !!(result[0] && (result[0] as any[])[0] === true);
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to check index existence: ${err.message}`);
    }
  }

  /**
   * Check if a constraint exists
   */
  async constraintExists(tableName: string, constraintName: string): Promise<boolean> {
    try {
      const result = await this.connection.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.table_constraints 
          WHERE table_schema = 'public' 
          AND table_name = $1 
          AND constraint_name = $2
        )`,
        [tableName, constraintName]
      );
      
      return !!(result[0] && (result[0] as any[])[0] === true);
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to check constraint existence: ${err.message}`);
    }
  }

  /**
   * Get all table names in the database
   */
  async getAllTableNames(): Promise<string[]> {
    try {
      const result = await this.connection.query(
        `SELECT table_name 
         FROM information_schema.tables 
         WHERE table_schema = 'public' 
         ORDER BY table_name`
      );
      
      return result.map(row => (row as any[])[0] as string);
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to get table names: ${err.message}`);
    }
  }

  /**
   * Get database version and information
   */
  async getDatabaseInfo(): Promise<{
    version: string;
    type: string;
    encoding: string;
  }> {
    try {
      const versionResult = await this.connection.query("SELECT version()");
      const encodingResult = await this.connection.query("SHOW server_encoding");
      
      return {
        version: (versionResult[0] as any[])[0] as string,
        type: "PostgreSQL",
        encoding: (encodingResult[0] as any[])[0] as string
      };
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to get database info: ${err.message}`);
    }
  }

  /**
   * Execute a health check query
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      await this.connection.query("SELECT 1");
      return { healthy: true, message: "Database connection healthy" };
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      return { healthy: false, message: `Database health check failed: ${err.message}` };
    }
  }

  /**
   * Get table schema information
   */
  async getTableSchema(tableName: string): Promise<{
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      default: string | null;
      primary: boolean;
    }>;
    indexes: Array<{
      name: string;
      columns: string[];
      unique: boolean;
    }>;
    foreignKeys: Array<{
      name: string;
      column: string;
      referencedTable: string;
      referencedColumn: string;
    }>;
  }> {
    try {
      // Get column information
      const columnResult = await this.connection.query(`
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          CASE WHEN pk.constraint_name IS NOT NULL THEN true ELSE false END as is_primary
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT kcu.column_name, kcu.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.column_name = pk.column_name
        WHERE c.table_name = $1
        ORDER BY c.ordinal_position
      `, [tableName]);

      // Get index information
      const indexResult = await this.connection.query(`
        SELECT 
          indexname,
          indexdef,
          schemaname
        FROM pg_indexes 
        WHERE tablename = $1
      `, [tableName]);

      // Get foreign key information
      const fkResult = await this.connection.query(`
        SELECT 
          kcu.constraint_name,
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.constraint_column_usage ccu
          ON kcu.constraint_name = ccu.constraint_name
        WHERE kcu.table_name = $1
        AND kcu.constraint_name IN (
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = $1 AND constraint_type = 'FOREIGN KEY'
        )
      `, [tableName]);

      return {
        columns: columnResult.map(row => {
          const [name, type, nullable, defaultValue, primary] = row as any[];
          return {
            name,
            type,
            nullable: nullable === 'YES',
            default: defaultValue,
            primary: primary === true
          };
        }),
        indexes: indexResult.map(row => {
          const [name, definition] = row as any[];
          // Parse index definition to extract columns and unique status
          const unique = definition.includes('UNIQUE');
          const columns = this.parseIndexColumns(definition);
          return { name, columns, unique };
        }),
        foreignKeys: fkResult.map(row => {
          const [name, column, referencedTable, referencedColumn] = row as any[];
          return { name, column, referencedTable, referencedColumn };
        })
      };
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to get table schema: ${err.message}`);
    }
  }

  /**
   * Parse index columns from CREATE INDEX statement
   */
  private parseIndexColumns(indexDefinition: string): string[] {
    // Simple regex to extract column names from index definition
    // This is a basic implementation - could be enhanced for complex cases
    const match = indexDefinition.match(/\(([^)]+)\)/);
    if (match) {
      return match[1].split(',').map(col => col.trim().replace(/"/g, ''));
    }
    return [];
  }

  /**
   * Execute SQL file with proper error handling
   */
  async executeSQLFile(sqlContent: string): Promise<void> {
    const statements = this.splitSQLStatements(sqlContent);
    
    for (const statement of statements) {
      if (statement.trim()) {
        await this.connection.execute(statement);
      }
    }
  }

  /**
   * Split SQL content into individual statements
   */
  private splitSQLStatements(sql: string): string[] {
    // Simple statement splitting - could be enhanced for complex cases
    return sql.split(';').filter(stmt => stmt.trim());
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<{
    connected: boolean;
    activeConnections?: number;
    maxConnections?: number;
    databaseSize?: string;
  }> {
    try {
      const connected = this.connection.isConnected();
      
      if (!connected) {
        return { connected: false };
      }

      // Get connection and database stats
      const statsResult = await this.connection.query(`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity) as active_connections,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
          (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size
      `);

      const [activeConnections, maxConnections, databaseSize] = statsResult[0] as any[];

      return {
        connected: true,
        activeConnections: parseInt(activeConnections),
        maxConnections: parseInt(maxConnections),
        databaseSize
      };
    } catch (error) {
      return { connected: false };
    }
  }
}

/**
 * Connection pool manager for handling multiple connections
 */
export class ConnectionPool {
  private connections: Map<string, DatabaseConnection> = new Map();
  private configs: Map<string, DatabaseConfig> = new Map();

  /**
   * Add a connection to the pool
   */
  addConnection(name: string, config: DatabaseConfig): void {
    this.configs.set(name, config);
  }

  /**
   * Get a connection from the pool
   */
  async getConnection(name: string): Promise<DatabaseConnection> {
    if (this.connections.has(name)) {
      return this.connections.get(name)!;
    }

    const config = this.configs.get(name);
    if (!config) {
      throw new Error(`🚨 Connection '${name}' not found in pool`);
    }

    const connection = createDatabaseConnection(config);
    await connection.connect();
    
    this.connections.set(name, connection);
    return connection;
  }

  /**
   * Close all connections in the pool
   */
  async closeAll(): Promise<void> {
    for (const [name, connection] of this.connections) {
      try {
        await connection.disconnect();
      } catch (error) {
        const err = ErrorHandler.fromUnknown(error);
        console.warn(`⚠️ Error closing connection '${name}': ${err.message}`);
      }
    }
    
    this.connections.clear();
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    connectionNames: string[];
  } {
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.isConnected()).length;

    return {
      totalConnections: this.connections.size,
      activeConnections,
      connectionNames: Array.from(this.connections.keys())
    };
  }
}
/**
 * 🦎 Zynx PostgreSQL Generator - PostgreSQL-Specific SQL Generation
 * 
 * Generates PostgreSQL-compatible SQL from DBML schemas.
 * Handles PostgreSQL-specific features like UUIDs, JSONB, and extensions.
 */

import { BaseGenerator } from "./base.ts";
import type {
  DatabaseSchema,
  DBMLTable,
  DBMLField,
  DBMLIndex,
  DBMLRef
} from "../types.ts";

/**
 * PostgreSQL-specific SQL generator
 * 
 * @example
 * ```typescript
 * const generator = new PostgreSQLGenerator();
 * const sql = generator.generateCompleteSchema(schema);
 * ```
 */
export class PostgreSQLGenerator extends BaseGenerator {
  name = "postgresql";
  dialect = "postgresql" as const;

  /**
   * Generate complete schema SQL (alias for generateCompleteSchema)
   */
  async generateCreateSchema(schema: any): Promise<string> {
    return this.generateCompleteSchema(schema);
  }

  /**
   * Generate migration SQL from schema changes
   */
  async generateMigrationSQL(changes: any[]): Promise<string> {
    const statements: string[] = [];
    
    for (const change of changes) {
      switch (change.type) {
        case "create_table":
        case "create_index":
        case "add_foreign_key":
          statements.push(change.sql);
          break;
        case "alter_table":
          statements.push(change.sql);
          break;
        case "drop_table":
        case "drop_index":
        case "drop_foreign_key":
          statements.push(change.sql);
          break;
      }
    }
    
    return statements.join('\n\n') + '\n';
  }

  /**
   * Generate CREATE TABLE statement for PostgreSQL
   * 
   * @param table - Table definition
   * @returns string - CREATE TABLE SQL
   */
  generateCreateTable(table: DBMLTable): string {
    this.validateTable(table);

    const fields = table.fields.map(field => this.generateFieldSQL(field));
    let sql = `CREATE TABLE ${this.escapeIdentifier(table.name)} (\n  ${fields.join(',\n  ')}\n);`;

    // Add table comment if present
    const tableComment = this.generateTableComment(table);
    if (tableComment) {
      sql += `\n\n${tableComment}`;
    }

    // Add column comments if present
    const columnComments = table.fields
      .map(field => this.generateColumnComment(table.name, field))
      .filter(comment => comment !== null);
    
    if (columnComments.length > 0) {
      sql += `\n\n${columnComments.join('\n')}`;
    }

    return sql;
  }

  /**
   * Generate ALTER TABLE statements for PostgreSQL
   * 
   * @param oldTable - Original table
   * @param newTable - Target table
   * @returns string[] - Array of ALTER TABLE statements
   */
  generateAlterTable(oldTable: DBMLTable, newTable: DBMLTable): string[] {
    const statements: string[] = [];

    // Create maps for quick field lookup
    const oldFields = new Map<string, DBMLField>();
    oldTable.fields.forEach(field => oldFields.set(field.name, field));

    const newFields = new Map<string, DBMLField>();
    newTable.fields.forEach(field => newFields.set(field.name, field));

    // Add new columns
    for (const newField of newTable.fields) {
      if (!oldFields.has(newField.name)) {
        statements.push(`ALTER TABLE ${this.escapeIdentifier(newTable.name)} ADD COLUMN ${this.generateFieldSQL(newField)};`);
      }
    }

    // Modify existing columns
    for (const newField of newTable.fields) {
      const oldField = oldFields.get(newField.name);
      if (oldField) {
        statements.push(...this.generateAlterColumn(newTable.name, oldField, newField));
      }
    }

    // Drop columns
    for (const oldField of oldTable.fields) {
      if (!newFields.has(oldField.name)) {
        statements.push(`ALTER TABLE ${this.escapeIdentifier(newTable.name)} DROP COLUMN IF EXISTS ${this.escapeIdentifier(oldField.name)};`);
      }
    }

    return statements;
  }

  /**
   * Generate CREATE INDEX statement for PostgreSQL
   * 
   * @param index - Index definition
   * @returns string - CREATE INDEX SQL
   */
  generateCreateIndex(index: DBMLIndex): string {
    const indexName = index.name || `idx_${index.tableName}_${index.columns.join('_')}`;
    const unique = index.unique ? "UNIQUE " : "";
    const method = index.type ? ` USING ${index.type}` : "";
    
    return `CREATE ${unique}INDEX ${this.escapeIdentifier(indexName)} ON ${this.escapeIdentifier(index.tableName)}${method} (${index.columns.map(col => this.escapeIdentifier(col)).join(', ')});`;
  }

  /**
   * Generate DROP INDEX statement for PostgreSQL
   * 
   * @param index - Index definition
   * @returns string - DROP INDEX SQL
   */
  generateDropIndex(index: DBMLIndex): string {
    const indexName = index.name || `idx_${index.tableName}_${index.columns.join('_')}`;
    return `DROP INDEX IF EXISTS ${this.escapeIdentifier(indexName)};`;
  }

  /**
   * Generate ADD FOREIGN KEY statement for PostgreSQL
   * 
   * @param ref - Reference definition
   * @returns string - ADD CONSTRAINT SQL
   */
  generateAddForeignKey(ref: DBMLRef): string {
    const constraintName = this.generateForeignKeyName(ref);
    let sql = `ALTER TABLE ${this.escapeIdentifier(ref.from.table)} ADD CONSTRAINT ${this.escapeIdentifier(constraintName)} `;
    sql += `FOREIGN KEY (${this.escapeIdentifier(ref.from.column)}) REFERENCES ${this.escapeIdentifier(ref.to.table)}(${this.escapeIdentifier(ref.to.column)})`;
    
    if (ref.onDelete) {
      sql += ` ON DELETE ${ref.onDelete.toUpperCase().replace(' ', ' ')}`;
    }
    
    if (ref.onUpdate) {
      sql += ` ON UPDATE ${ref.onUpdate.toUpperCase().replace(' ', ' ')}`;
    }
    
    return sql + ";";
  }

  /**
   * Generate DROP FOREIGN KEY statement for PostgreSQL
   * 
   * @param ref - Reference definition
   * @returns string - DROP CONSTRAINT SQL
   */
  generateDropForeignKey(ref: DBMLRef): string {
    const constraintName = this.generateForeignKeyName(ref);
    return `ALTER TABLE ${this.escapeIdentifier(ref.from.table)} DROP CONSTRAINT IF EXISTS ${this.escapeIdentifier(constraintName)};`;
  }

  /**
   * Map DBML type to PostgreSQL type
   * 
   * @param dbmlType - DBML type string
   * @returns string - PostgreSQL type
   */
  mapDBMLType(dbmlType: string): string {
    const type = dbmlType.toLowerCase();
    
    // Handle parameterized types
    if (type.includes('(')) {
      const [baseType, params] = type.split('(');
      const cleanParams = params.replace(')', '');
      
      switch (baseType) {
        case 'varchar':
          return `VARCHAR(${cleanParams})`;
        case 'char':
          return `CHAR(${cleanParams})`;
        case 'decimal':
        case 'numeric':
          return `DECIMAL(${cleanParams})`;
        default:
          return `${baseType.toUpperCase()}(${cleanParams})`;
      }
    }
    
    // Map basic types
    const typeMap: Record<string, string> = {
      // Text types
      'text': 'TEXT',
      'varchar': 'VARCHAR(255)',  // Default length
      'char': 'CHAR(1)',          // Default length
      'string': 'TEXT',
      
      // Numeric types
      'integer': 'INTEGER',
      'int': 'INTEGER',
      'bigint': 'BIGINT',
      'smallint': 'SMALLINT',
      'decimal': 'DECIMAL',
      'numeric': 'NUMERIC',
      'real': 'REAL',
      'double': 'DOUBLE PRECISION',
      'float': 'REAL',
      'money': 'MONEY',
      'serial': 'SERIAL',
      'bigserial': 'BIGSERIAL',
      'smallserial': 'SMALLSERIAL',
      
      // Boolean
      'boolean': 'BOOLEAN',
      'bool': 'BOOLEAN',
      
      // Date/Time
      'timestamp': 'TIMESTAMP',
      'timestamptz': 'TIMESTAMPTZ',
      'date': 'DATE',
      'time': 'TIME',
      'timetz': 'TIMETZ',
      'interval': 'INTERVAL',
      
      // UUID
      'uuid': 'UUID',
      
      // JSON
      'json': 'JSON',
      'jsonb': 'JSONB',
      
      // Arrays
      'array': 'ARRAY',
      
      // Binary
      'bytea': 'BYTEA',
      
      // Network
      'inet': 'INET',
      'cidr': 'CIDR',
      'macaddr': 'MACADDR',
      
      // Geometric
      'point': 'POINT',
      'line': 'LINE',
      'lseg': 'LSEG',
      'box': 'BOX',
      'path': 'PATH',
      'polygon': 'POLYGON',
      'circle': 'CIRCLE'
    };
    
    return typeMap[type] || type.toUpperCase();
  }

  /**
   * Generate database-specific setup commands for PostgreSQL
   * 
   * @param schema - Database schema
   * @returns string | null - Setup SQL
   */
  protected override generateSetup(schema: DatabaseSchema): string | null {
    const setup: string[] = [];
    
    // Check if UUID extension is needed
    const needsUuidExtension = schema.tables.some(table =>
      table.fields.some(field => 
        field.type.toLowerCase().includes('uuid') || 
        field.default?.includes('gen_random_uuid()')
      )
    );
    
    if (needsUuidExtension) {
      setup.push('-- Enable UUID extension');
      setup.push('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    }
    
    // Check if crypto extension is needed
    const needsCryptoExtension = schema.tables.some(table =>
      table.fields.some(field => 
        field.default?.includes('gen_random_uuid()')
      )
    );
    
    if (needsCryptoExtension) {
      setup.push('-- Enable pgcrypto extension for gen_random_uuid()');
      setup.push('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    }
    
    return setup.length > 0 ? setup.join('\n') : null;
  }

  /**
   * Generate ALTER COLUMN statements for PostgreSQL
   * 
   * @param tableName - Table name
   * @param oldField - Original field
   * @param newField - Target field
   * @returns string[] - Array of ALTER COLUMN statements
   */
  private generateAlterColumn(tableName: string, oldField: DBMLField, newField: DBMLField): string[] {
    const statements: string[] = [];
    const table = this.escapeIdentifier(tableName);
    const column = this.escapeIdentifier(newField.name);

    // Change data type
    if (oldField.type !== newField.type) {
      statements.push(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${this.mapDBMLType(newField.type)};`);
    }

    // Change NOT NULL constraint
    if (oldField.not_null !== newField.not_null) {
      if (newField.not_null) {
        statements.push(`ALTER TABLE ${table} ALTER COLUMN ${column} SET NOT NULL;`);
      } else {
        statements.push(`ALTER TABLE ${table} ALTER COLUMN ${column} DROP NOT NULL;`);
      }
    }

    // Change default value
    if (oldField.default !== newField.default) {
      if (newField.default !== undefined) {
        const defaultValue = this.formatDefaultValue(newField.default, newField.type);
        statements.push(`ALTER TABLE ${table} ALTER COLUMN ${column} SET DEFAULT ${defaultValue};`);
      } else {
        statements.push(`ALTER TABLE ${table} ALTER COLUMN ${column} DROP DEFAULT;`);
      }
    }

    // Handle unique constraint changes
    if (oldField.unique !== newField.unique) {
      const constraintName = `uk_${tableName}_${newField.name}`;
      
      if (newField.unique) {
        statements.push(`ALTER TABLE ${table} ADD CONSTRAINT ${this.escapeIdentifier(constraintName)} UNIQUE (${column});`);
      } else {
        statements.push(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${this.escapeIdentifier(constraintName)};`);
      }
    }

    return statements;
  }

  /**
   * Escape PostgreSQL identifier
   * 
   * @param identifier - Identifier to escape
   * @returns string - Escaped identifier
   */
  protected override escapeIdentifier(identifier: string): string {
    // Handle undefined/null identifiers
    if (!identifier || typeof identifier !== 'string') {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    
    // PostgreSQL uses double quotes for identifiers
    // Only escape if identifier contains special characters or is a reserved word
    const reservedWords = [
      'user', 'group', 'order', 'table', 'index', 'select', 'from', 'where',
      'insert', 'update', 'delete', 'create', 'drop', 'alter', 'grant', 'revoke'
    ];
    
    const needsEscaping = reservedWords.includes(identifier.toLowerCase()) ||
                         /[^a-zA-Z0-9_]/.test(identifier) ||
                         /^\d/.test(identifier);
    
    return needsEscaping ? `"${identifier}"` : identifier;
  }

  /**
   * Format default value for PostgreSQL
   * 
   * @param defaultValue - Raw default value
   * @param fieldType - Field type
   * @returns string - Formatted default value
   */
  protected override formatDefaultValue(defaultValue: string, fieldType: string): string {
    // Handle PostgreSQL-specific functions
    if (defaultValue.includes('gen_random_uuid()')) {
      return 'gen_random_uuid()';
    }
    
    if (defaultValue.includes('now()')) {
      return 'NOW()';
    }
    
    if (defaultValue.includes('current_timestamp')) {
      return 'CURRENT_TIMESTAMP';
    }
    
    // Handle JSONB defaults
    if (fieldType.toLowerCase().includes('jsonb') && defaultValue.startsWith('{')) {
      return `'${defaultValue}'::jsonb`;
    }
    
    // Handle array defaults
    if (fieldType.toLowerCase().includes('array') && defaultValue.startsWith('[')) {
      return `'${defaultValue}'`;
    }
    
    // Use base class formatting for other types
    return super.formatDefaultValue(defaultValue, fieldType);
  }

  /**
   * Generate PostgreSQL-specific table comment
   * 
   * @param table - Table definition
   * @returns string | null - Table comment SQL
   */
  protected override generateTableComment(table: DBMLTable): string | null {
    if (table.note) {
      return `COMMENT ON TABLE ${this.escapeIdentifier(table.name)} IS ${this.escapeStringLiteral(table.note)};`;
    }
    return null;
  }

  /**
   * Generate PostgreSQL-specific column comment
   * 
   * @param tableName - Table name
   * @param field - Field definition
   * @returns string | null - Column comment SQL
   */
  protected override generateColumnComment(tableName: string, field: DBMLField): string | null {
    if (field.note) {
      return `COMMENT ON COLUMN ${this.escapeIdentifier(tableName)}.${this.escapeIdentifier(field.name)} IS ${this.escapeStringLiteral(field.note)};`;
    }
    return null;
  }

  /**
   * Escape string literal for PostgreSQL
   * 
   * @param str - String to escape
   * @returns string - Escaped string literal
   */
  private escapeStringLiteral(str: string): string {
    return `'${str.replace(/'/g, "''")}'`;
  }

  /**
   * Check if PostgreSQL type is numeric
   * 
   * @param type - Data type
   * @returns boolean - Whether type is numeric
   */
  protected override isNumericType(type: string): boolean {
    const postgresNumericTypes = [
      'integer', 'int', 'int4', 'bigint', 'int8', 'smallint', 'int2',
      'decimal', 'numeric', 'real', 'float4', 'double precision', 'float8',
      'money', 'serial', 'serial4', 'bigserial', 'serial8', 'smallserial', 'serial2'
    ];
    
    return postgresNumericTypes.some(numType => type.toLowerCase().includes(numType));
  }
}
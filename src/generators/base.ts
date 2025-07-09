/**
 * 🦎 Zynx Base Generator - SQL Generation Interface
 * 
 * Abstract base class for database-specific SQL generators.
 * Provides common functionality and defines the interface for
 * converting DBML schemas to SQL statements.
 */

import type {
  GeneratorPlugin,
  DatabaseSchema,
  DBMLTable,
  DBMLField,
  DBMLIndex,
  DBMLRef
} from "../types.ts";

/**
 * Base SQL generator that provides common functionality
 * for all database-specific generators
 */
export abstract class BaseGenerator implements GeneratorPlugin {
  abstract name: string;
  abstract dialect: "postgresql" | "mysql" | "sqlite";

  /**
   * Generate complete schema SQL from DBML
   * 
   * @param schema - Database schema
   * @returns string - Complete SQL for schema creation
   */
  generateCompleteSchema(schema: DatabaseSchema): string {
    const parts: string[] = [];

    // Header comment
    parts.push(this.generateHeader(schema));

    // Database-specific extensions or setup
    const setup = this.generateSetup(schema);
    if (setup) {
      parts.push(setup);
    }

    // Create all tables
    for (const table of schema.tables) {
      parts.push(this.generateCreateTable(table));
    }

    // Create all indexes
    for (const index of schema.indexes) {
      parts.push(this.generateCreateIndex(index));
    }

    // Create all foreign keys
    for (const ref of schema.refs) {
      parts.push(this.generateAddForeignKey(ref));
    }

    // Database-specific footer
    const footer = this.generateFooter(schema);
    if (footer) {
      parts.push(footer);
    }

    return parts.filter(part => part.trim()).join('\n\n') + '\n';
  }

  /**
   * Generate CREATE TABLE statement
   * 
   * @param table - Table definition
   * @returns string - CREATE TABLE SQL
   */
  abstract generateCreateTable(table: DBMLTable): string;

  /**
   * Generate ALTER TABLE statements for table changes
   * 
   * @param oldTable - Original table
   * @param newTable - Target table
   * @returns string[] - Array of ALTER TABLE statements
   */
  abstract generateAlterTable(oldTable: DBMLTable, newTable: DBMLTable): string[];

  /**
   * Generate CREATE INDEX statement
   * 
   * @param index - Index definition
   * @returns string - CREATE INDEX SQL
   */
  abstract generateCreateIndex(index: DBMLIndex): string;

  /**
   * Generate DROP INDEX statement
   * 
   * @param index - Index definition
   * @returns string - DROP INDEX SQL
   */
  abstract generateDropIndex(index: DBMLIndex): string;

  /**
   * Generate ADD FOREIGN KEY statement
   * 
   * @param ref - Reference definition
   * @returns string - ADD CONSTRAINT SQL
   */
  abstract generateAddForeignKey(ref: DBMLRef): string;

  /**
   * Generate DROP FOREIGN KEY statement
   * 
   * @param ref - Reference definition
   * @returns string - DROP CONSTRAINT SQL
   */
  abstract generateDropForeignKey(ref: DBMLRef): string;

  /**
   * Map DBML type to database-specific type
   * 
   * @param dbmlType - DBML type string
   * @returns string - Database-specific type
   */
  abstract mapDBMLType(dbmlType: string): string;

  /**
   * Generate field/column SQL definition
   * 
   * @param field - Field definition
   * @returns string - Field SQL
   */
  protected generateFieldSQL(field: DBMLField): string {
    let sql = `${this.escapeIdentifier(field.name)} ${this.mapDBMLType(field.type)}`;
    
    // Add constraints
    if (field.pk) {
      sql += " PRIMARY KEY";
    }
    
    if (field.unique && !field.pk) {
      sql += " UNIQUE";
    }
    
    if (field.not_null && !field.pk) {
      sql += " NOT NULL";
    }
    
    if (field.default !== undefined) {
      sql += ` DEFAULT ${this.formatDefaultValue(field.default, field.type)}`;
    }
    
    return sql;
  }

  /**
   * Format default value based on field type
   * 
   * @param defaultValue - Raw default value
   * @param fieldType - Field type
   * @returns string - Formatted default value
   */
  protected formatDefaultValue(defaultValue: string, fieldType: string): string {
    // Handle special PostgreSQL defaults
    if (defaultValue.includes('gen_random_uuid()') || 
        defaultValue.includes('now()') || 
        defaultValue.includes('current_timestamp')) {
      return defaultValue;
    }
    
    // Handle boolean values
    if (fieldType.toLowerCase().includes('boolean')) {
      return defaultValue.toLowerCase() === 'true' ? 'TRUE' : 'FALSE';
    }
    
    // Handle numeric values
    if (this.isNumericType(fieldType)) {
      return defaultValue;
    }
    
    // Handle string values (add quotes if not already present)
    if (!defaultValue.startsWith("'") && !defaultValue.endsWith("'")) {
      return `'${defaultValue}'`;
    }
    
    return defaultValue;
  }

  /**
   * Check if a type is numeric
   * 
   * @param type - Data type
   * @returns boolean - Whether type is numeric
   */
  protected isNumericType(type: string): boolean {
    const numericTypes = [
      'integer', 'int', 'bigint', 'smallint', 'decimal', 'numeric',
      'real', 'double', 'float', 'money', 'serial', 'bigserial'
    ];
    
    return numericTypes.some(numType => type.toLowerCase().includes(numType));
  }

  /**
   * Escape database identifier (table/column names)
   * 
   * @param identifier - Identifier to escape
   * @returns string - Escaped identifier
   */
  protected escapeIdentifier(identifier: string): string {
    // Most databases use double quotes for identifiers
    // Override in specific generators if needed
    return `"${identifier}"`;
  }

  /**
   * Generate constraint name
   * 
   * @param prefix - Constraint prefix (pk, fk, uk, etc.)
   * @param tableName - Table name
   * @param columnName - Column name
   * @returns string - Constraint name
   */
  protected generateConstraintName(prefix: string, tableName: string, columnName: string): string {
    return `${prefix}_${tableName}_${columnName}`;
  }

  /**
   * Generate foreign key constraint name
   * 
   * @param ref - Reference definition
   * @returns string - Foreign key constraint name
   */
  protected generateForeignKeyName(ref: DBMLRef): string {
    return ref.name || `fk_${ref.from.table}_${ref.from.column}`;
  }

  /**
   * Generate schema header comment
   * 
   * @param schema - Database schema
   * @returns string - Header comment
   */
  protected generateHeader(schema: DatabaseSchema): string {
    const timestamp = new Date().toISOString();
    return `-- 🦎 Zynx Generated Schema: ${timestamp}
-- Database: ${schema.name || 'database'}
-- Generator: ${this.name}
-- Dialect: ${this.dialect}
-- 
-- Like an axolotl regenerating tissue, this schema will
-- create your database structure with perfect precision.`;
  }

  /**
   * Generate database-specific setup commands
   * 
   * @param schema - Database schema
   * @returns string | null - Setup SQL or null if not needed
   */
  protected generateSetup(schema: DatabaseSchema): string | null {
    // Override in specific generators if needed
    return null;
  }

  /**
   * Generate database-specific footer commands
   * 
   * @param schema - Database schema
   * @returns string | null - Footer SQL or null if not needed
   */
  protected generateFooter(schema: DatabaseSchema): string | null {
    // Override in specific generators if needed
    return null;
  }

  /**
   * Validate schema before generation
   * 
   * @param schema - Database schema
   * @throws Error if schema is invalid
   */
  protected validateSchema(schema: DatabaseSchema): void {
    if (!schema.tables || schema.tables.length === 0) {
      throw new Error("Schema must contain at least one table");
    }

    // Validate table names are unique
    const tableNames = new Set<string>();
    for (const table of schema.tables) {
      if (tableNames.has(table.name)) {
        throw new Error(`Duplicate table name: ${table.name}`);
      }
      tableNames.add(table.name);
      
      // Validate each table
      this.validateTable(table);
    }

    // Validate foreign key references
    this.validateForeignKeys(schema);
  }

  /**
   * Validate a single table
   * 
   * @param table - Table definition
   * @throws Error if table is invalid
   */
  protected validateTable(table: DBMLTable): void {
    if (!table.name || table.name.trim() === '') {
      throw new Error("Table name cannot be empty");
    }

    if (!table.fields || table.fields.length === 0) {
      throw new Error(`Table ${table.name} must have at least one field`);
    }

    // Validate field names are unique
    const fieldNames = new Set<string>();
    for (const field of table.fields) {
      if (fieldNames.has(field.name)) {
        throw new Error(`Duplicate field name in table ${table.name}: ${field.name}`);
      }
      fieldNames.add(field.name);
      
      // Validate field
      this.validateField(table.name, field);
    }
  }

  /**
   * Validate a single field
   * 
   * @param tableName - Table name
   * @param field - Field definition
   * @throws Error if field is invalid
   */
  protected validateField(tableName: string, field: DBMLField): void {
    if (!field.name || field.name.trim() === '') {
      throw new Error(`Field name cannot be empty in table ${tableName}`);
    }

    if (!field.type || field.type.trim() === '') {
      throw new Error(`Field ${field.name} in table ${tableName} must have a type`);
    }
  }

  /**
   * Validate foreign key references
   * 
   * @param schema - Database schema
   * @throws Error if foreign keys are invalid
   */
  protected validateForeignKeys(schema: DatabaseSchema): void {
    const tableNames = new Set(schema.tables.map(t => t.name));
    
    for (const ref of schema.refs) {
      // Check that referenced tables exist
      if (!tableNames.has(ref.from.table)) {
        throw new Error(`Foreign key references non-existent table: ${ref.from.table}`);
      }
      
      if (!tableNames.has(ref.to.table)) {
        throw new Error(`Foreign key references non-existent table: ${ref.to.table}`);
      }
      
      // Check that referenced columns exist
      const fromTable = schema.tables.find(t => t.name === ref.from.table);
      const toTable = schema.tables.find(t => t.name === ref.to.table);
      
      if (!fromTable?.fields.find(f => f.name === ref.from.column)) {
        throw new Error(`Foreign key references non-existent column: ${ref.from.table}.${ref.from.column}`);
      }
      
      if (!toTable?.fields.find(f => f.name === ref.to.column)) {
        throw new Error(`Foreign key references non-existent column: ${ref.to.table}.${ref.to.column}`);
      }
    }
  }

  /**
   * Generate table comment if supported
   * 
   * @param table - Table definition
   * @returns string | null - Table comment SQL or null
   */
  protected generateTableComment(table: DBMLTable): string | null {
    if (table.note) {
      return `COMMENT ON TABLE ${this.escapeIdentifier(table.name)} IS '${table.note}';`;
    }
    return null;
  }

  /**
   * Generate column comment if supported
   * 
   * @param tableName - Table name
   * @param field - Field definition
   * @returns string | null - Column comment SQL or null
   */
  protected generateColumnComment(tableName: string, field: DBMLField): string | null {
    if (field.note) {
      return `COMMENT ON COLUMN ${this.escapeIdentifier(tableName)}.${this.escapeIdentifier(field.name)} IS '${field.note}';`;
    }
    return null;
  }
}
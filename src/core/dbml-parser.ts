/**
 * 🦎 Zynx DBML Parser - Database Schema Parsing
 * 
 * Uses @atikayda/dbml-pg to parse DBML files and extract schema information.
 * Converts DBML AST into Zynx-compatible schema objects.
 */

import { Parser } from "@atikayda/dbml-pg";
import type { Schema, Table, Column, Index, Ref } from "@atikayda/dbml-pg";
import { ErrorHandler } from "../utils/errors.ts";
import type {
  DatabaseSchema,
  DBMLTable,
  DBMLField,
  DBMLIndex,
  DBMLRef
} from "../types.ts";

/**
 * Options for DBMLParser
 */
export interface DBMLParserOptions {
  /** Custom type mappings to override defaults */
  typeMappings?: Record<string, string>;
}

/**
 * DBML Parser for converting DBML strings to structured schema objects
 * 
 * @example
 * ```typescript
 * const parser = new DBMLParser();
 * const schema = await parser.parse(dbmlContent);
 * console.log(schema.tables);
 * ```
 * 
 * @example With custom type mappings
 * ```typescript
 * const parser = new DBMLParser({
 *   typeMappings: {
 *     "kinstant": "kinstant",
 *     "kjson": "kjson"
 *   }
 * });
 * ```
 */
export class DBMLParser {
  private parser: Parser;

  constructor(options?: DBMLParserOptions) {
    this.parser = new Parser(options);
  }

  /**
   * Parse DBML content into a structured schema
   * 
   * @param dbmlContent - Raw DBML string content
   * @returns Promise<DatabaseSchema> - Parsed schema object
   */
  async parse(dbmlContent: string): Promise<DatabaseSchema> {
    try {
      // Parse DBML using @atikayda/dbml-pg
      const parsedSchema = this.parser.parse(dbmlContent);
      
      // Convert to Zynx schema format
      const schema: DatabaseSchema = {
        name: parsedSchema.name || "database",
        tables: this.extractTables(parsedSchema),
        indexes: this.extractIndexes(parsedSchema),
        refs: this.extractRefs(parsedSchema),
        metadata: {
          databaseType: "postgresql",
          note: parsedSchema.project?.note
        }
      };

      return schema;
    } catch (error) {
      console.error("Raw parser error:", error);
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 DBML parsing failed: ${err.message}`);
    }
  }

  /**
   * Validate DBML syntax without full parsing
   * 
   * @param dbmlContent - Raw DBML string content
   * @returns boolean - Whether DBML is valid
   */
  async validate(dbmlContent: string): Promise<boolean> {
    const result = this.parser.validate(dbmlContent);
    return result.valid;
  }

  /**
   * Extract table information from parsed DBML
   * 
   * @param schema - Parsed schema object from @atikayda/dbml-pg
   * @returns DBMLTable[] - Array of table definitions
   */
  private extractTables(schema: Schema): DBMLTable[] {
    return schema.tables.map(table => {
      const zynxTable: DBMLTable = {
        name: table.name,
        fields: this.extractFields(table.columns),
        indexes: this.extractTableIndexes(table.indexes || [], table.name),
        note: table.note,
        metadata: {
          schemaName: table.schema,
          headerColor: table.headerColor,
          alias: table.alias
        }
      };

      return zynxTable;
    });
  }

  /**
   * Extract field information from a table
   * 
   * @param columns - Columns array from @atikayda/dbml-pg table
   * @returns DBMLField[] - Array of field definitions
   */
  private extractFields(columns: Column[]): DBMLField[] {
    return columns.map(column => {
      const zynxField: DBMLField = {
        name: column.name,
        type: column.type,
        pk: column.pk || false,
        unique: column.unique || false,
        not_null: column.notNull || false,
        default: typeof column.default === 'object' && column.default?.type === 'expression' 
          ? String(column.default.value)
          : column.default !== undefined ? String(column.default) : undefined,
        note: column.note,
        metadata: {
          increment: column.increment,
          dbdefault: typeof column.default === 'object' && column.default?.type === 'expression' 
            ? column.default.value 
            : undefined
        }
      };

      return zynxField;
    });
  }

  /**
   * Extract table-level indexes
   * 
   * @param indexes - Indexes array from @atikayda/dbml-pg table
   * @param tableName - Name of the table these indexes belong to
   * @returns DBMLIndex[] - Array of index definitions
   */
  private extractTableIndexes(indexes: Index[], tableName: string): DBMLIndex[] {
    return indexes.map(index => {
      const zynxIndex: DBMLIndex = {
        name: index.name,
        tableName: tableName,
        columns: index.columns.map(col => 
          typeof col === 'string' ? col : col.name
        ),
        type: index.type,
        unique: index.unique || index.pk || false,
        pk: index.pk || false,
        note: index.note
      };

      return zynxIndex;
    });
  }

  /**
   * Extract all indexes from the database
   * 
   * @param schema - Parsed schema object from @atikayda/dbml-pg
   * @returns DBMLIndex[] - Array of all index definitions
   */
  private extractIndexes(schema: Schema): DBMLIndex[] {
    const indexes: DBMLIndex[] = [];

    // Extract indexes from all tables
    for (const table of schema.tables) {
      if (table.indexes) {
        const tableIndexes = this.extractTableIndexes(table.indexes, table.name);
        indexes.push(...tableIndexes);
      }
    }

    return indexes;
  }

  /**
   * Extract relationships/references from the database
   * 
   * @param schema - Parsed schema object from @atikayda/dbml-pg
   * @returns DBMLRef[] - Array of relationship definitions
   */
  private extractRefs(schema: Schema): DBMLRef[] {
    return schema.refs.map(ref => {
      const zynxRef: DBMLRef = {
        name: ref.name,
        from: {
          table: ref.from.table,
          column: ref.from.column || ref.from.columns?.[0] || ''
        },
        to: {
          table: ref.to.table,
          column: ref.to.column || ref.to.columns?.[0] || ''
        },
        type: this.normalizeRefType(ref.refType),
        onDelete: ref.onDelete === "no action" ? undefined : ref.onDelete as "cascade" | "restrict" | "set null" | "set default" | undefined,
        onUpdate: ref.onUpdate === "no action" ? undefined : ref.onUpdate as "cascade" | "restrict" | "set null" | "set default" | undefined
      };

      return zynxRef;
    });
  }


  /**
   * Normalize relationship type to consistent format
   * 
   * @param refType - RefType from @atikayda/dbml-pg
   * @returns string - Normalized relationship type
   */
  private normalizeRefType(refType: string): "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many" {
    switch (refType) {
      case "-":
        return "one-to-one";
      case ">":
        return "one-to-many";
      case "<":
        return "many-to-one";
      case "<>":
        return "many-to-many";
      default:
        return "one-to-many"; // Default fallback
    }
  }

  /**
   * Get table by name from schema
   * 
   * @param schema - Database schema
   * @param tableName - Name of table to find
   * @returns DBMLTable | undefined - Table if found
   */
  getTable(schema: DatabaseSchema, tableName: string): DBMLTable | undefined {
    return schema.tables.find(table => table.name === tableName);
  }

  /**
   * Get all tables that reference a specific table
   * 
   * @param schema - Database schema
   * @param tableName - Name of referenced table
   * @returns DBMLTable[] - Tables that reference the specified table
   */
  getReferencingTables(schema: DatabaseSchema, tableName: string): DBMLTable[] {
    const referencingTableNames = schema.refs
      .filter(ref => ref.to.table === tableName)
      .map(ref => ref.from.table);

    return schema.tables.filter(table => referencingTableNames.includes(table.name));
  }

  /**
   * Get all foreign key references for a table
   * 
   * @param schema - Database schema
   * @param tableName - Name of table
   * @returns DBMLRef[] - Foreign key references from this table
   */
  getForeignKeys(schema: DatabaseSchema, tableName: string): DBMLRef[] {
    return schema.refs.filter(ref => ref.from.table === tableName);
  }

  /**
   * Check if a table exists in the schema
   * 
   * @param schema - Database schema
   * @param tableName - Name of table to check
   * @returns boolean - Whether table exists
   */
  tableExists(schema: DatabaseSchema, tableName: string): boolean {
    return schema.tables.some(table => table.name === tableName);
  }

  /**
   * Get primary key fields for a table
   * 
   * @param table - Table definition
   * @returns DBMLField[] - Primary key fields
   */
  getPrimaryKeys(table: DBMLTable): DBMLField[] {
    return table.fields.filter(field => field.pk);
  }

  /**
   * Get unique fields for a table
   * 
   * @param table - Table definition
   * @returns DBMLField[] - Unique fields
   */
  getUniqueFields(table: DBMLTable): DBMLField[] {
    return table.fields.filter(field => field.unique);
  }

  /**
   * Get required (not null) fields for a table
   * 
   * @param table - Table definition
   * @returns DBMLField[] - Required fields
   */
  getRequiredFields(table: DBMLTable): DBMLField[] {
    return table.fields.filter(field => field.not_null);
  }

  /**
   * Calculate schema statistics
   * 
   * @param schema - Database schema
   * @returns object - Schema statistics
   */
  getSchemaStats(schema: DatabaseSchema): {
    tableCount: number;
    fieldCount: number;
    indexCount: number;
    relationshipCount: number;
    tablesWithPrimaryKeys: number;
    averageFieldsPerTable: number;
  } {
    const tableCount = schema.tables.length;
    const fieldCount = schema.tables.reduce((sum, table) => sum + table.fields.length, 0);
    const indexCount = schema.indexes.length;
    const relationshipCount = schema.refs.length;
    const tablesWithPrimaryKeys = schema.tables.filter(table => 
      table.fields.some(field => field.pk)
    ).length;
    const averageFieldsPerTable = tableCount > 0 ? fieldCount / tableCount : 0;

    return {
      tableCount,
      fieldCount,
      indexCount,
      relationshipCount,
      tablesWithPrimaryKeys,
      averageFieldsPerTable: Math.round(averageFieldsPerTable * 100) / 100
    };
  }
}
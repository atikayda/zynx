/**
 * 🦎 Zynx DBML Parser - Database Schema Parsing
 * 
 * Wrapper around @dbml/core to parse DBML files and extract schema information.
 * Converts DBML AST into Zynx-compatible schema objects.
 */

import { Parser } from "@dbml/core";
import type {
  DatabaseSchema,
  DBMLTable,
  DBMLField,
  DBMLIndex,
  DBMLRef
} from "../types.ts";

/**
 * DBML Parser for converting DBML strings to structured schema objects
 * 
 * @example
 * ```typescript
 * const parser = new DBMLParser();
 * const schema = await parser.parse(dbmlContent);
 * console.log(schema.tables);
 * ```
 */
export class DBMLParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  /**
   * Parse DBML content into a structured schema
   * 
   * @param dbmlContent - Raw DBML string content
   * @returns Promise<DatabaseSchema> - Parsed schema object
   */
  async parse(dbmlContent: string): Promise<DatabaseSchema> {
    try {
      // Parse DBML using @dbml/core
      const database = this.parser.parse(dbmlContent);
      
      // Convert to Zynx schema format
      const schema: DatabaseSchema = {
        name: database.project?.name || "database",
        tables: this.extractTables(database),
        indexes: this.extractIndexes(database),
        refs: this.extractRefs(database),
        metadata: {
          databaseType: database.project?.database_type || "postgresql",
          note: database.project?.note
        }
      };

      return schema;
    } catch (error) {
      throw new Error(`🚨 DBML parsing failed: ${error.message}`);
    }
  }

  /**
   * Validate DBML syntax without full parsing
   * 
   * @param dbmlContent - Raw DBML string content
   * @returns boolean - Whether DBML is valid
   */
  async validate(dbmlContent: string): Promise<boolean> {
    try {
      this.parser.parse(dbmlContent);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract table information from parsed DBML
   * 
   * @param database - Parsed database object from @dbml/core
   * @returns DBMLTable[] - Array of table definitions
   */
  private extractTables(database: any): DBMLTable[] {
    if (!database.schemas || database.schemas.length === 0) {
      return [];
    }

    const tables: DBMLTable[] = [];
    
    for (const schema of database.schemas) {
      for (const table of schema.tables) {
        const zynxTable: DBMLTable = {
          name: table.name,
          fields: this.extractFields(table.fields),
          indexes: this.extractTableIndexes(table.indexes),
          note: table.note,
          metadata: {
            schemaName: schema.name,
            headerColor: table.headerColor,
            alias: table.alias
          }
        };

        tables.push(zynxTable);
      }
    }

    return tables;
  }

  /**
   * Extract field information from a table
   * 
   * @param fields - Fields array from @dbml/core table
   * @returns DBMLField[] - Array of field definitions
   */
  private extractFields(fields: any[]): DBMLField[] {
    return fields.map(field => {
      const zynxField: DBMLField = {
        name: field.name,
        type: this.normalizeType(field.type),
        pk: field.pk || false,
        unique: field.unique || false,
        not_null: field.not_null || false,
        default: field.default?.value,
        note: field.note,
        metadata: {
          increment: field.increment,
          dbdefault: field.dbdefault
        }
      };

      return zynxField;
    });
  }

  /**
   * Extract table-level indexes
   * 
   * @param indexes - Indexes array from @dbml/core table
   * @returns DBMLIndex[] - Array of index definitions
   */
  private extractTableIndexes(indexes: any[]): DBMLIndex[] {
    if (!indexes) return [];

    return indexes.map(index => {
      const zynxIndex: DBMLIndex = {
        name: index.name,
        tableName: index.tableName,
        columns: index.columns?.map((col: any) => col.value) || [],
        type: index.type,
        unique: index.unique || false,
        note: index.note
      };

      return zynxIndex;
    });
  }

  /**
   * Extract all indexes from the database
   * 
   * @param database - Parsed database object from @dbml/core
   * @returns DBMLIndex[] - Array of all index definitions
   */
  private extractIndexes(database: any): DBMLIndex[] {
    if (!database.schemas || database.schemas.length === 0) {
      return [];
    }

    const indexes: DBMLIndex[] = [];

    for (const schema of database.schemas) {
      // Table-level indexes
      for (const table of schema.tables) {
        if (table.indexes) {
          const tableIndexes = this.extractTableIndexes(table.indexes);
          indexes.push(...tableIndexes);
        }
      }

      // Schema-level indexes
      if (schema.indexes) {
        const schemaIndexes = this.extractTableIndexes(schema.indexes);
        indexes.push(...schemaIndexes);
      }
    }

    return indexes;
  }

  /**
   * Extract relationships/references from the database
   * 
   * @param database - Parsed database object from @dbml/core
   * @returns DBMLRef[] - Array of relationship definitions
   */
  private extractRefs(database: any): DBMLRef[] {
    if (!database.schemas || database.schemas.length === 0) {
      return [];
    }

    const refs: DBMLRef[] = [];

    for (const schema of database.schemas) {
      if (schema.refs) {
        for (const ref of schema.refs) {
          const zynxRef: DBMLRef = {
            name: ref.name,
            from: {
              table: ref.endpoints[0].tableName,
              column: ref.endpoints[0].fieldName
            },
            to: {
              table: ref.endpoints[1].tableName,
              column: ref.endpoints[1].fieldName
            },
            type: this.normalizeRefType(ref.relation),
            onDelete: ref.onDelete,
            onUpdate: ref.onUpdate
          };

          refs.push(zynxRef);
        }
      }
    }

    return refs;
  }

  /**
   * Normalize DBML type to consistent format
   * 
   * @param type - Type object from @dbml/core
   * @returns string - Normalized type string
   */
  private normalizeType(type: any): string {
    if (!type) return "text";

    let baseType = type.type_name || type.value || "text";
    
    // Handle type parameters (e.g., varchar(255))
    if (type.args && type.args.length > 0) {
      const args = type.args.map((arg: any) => arg.value || arg).join(", ");
      baseType = `${baseType}(${args})`;
    }

    return baseType.toLowerCase();
  }

  /**
   * Normalize relationship type to consistent format
   * 
   * @param relation - Relation string from @dbml/core
   * @returns string - Normalized relationship type
   */
  private normalizeRefType(relation: string): "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many" {
    switch (relation) {
      case "1-1":
        return "one-to-one";
      case "1-*":
        return "one-to-many";
      case "*-1":
        return "many-to-one";
      case "*-*":
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
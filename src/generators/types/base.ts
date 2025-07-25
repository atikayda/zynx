/**
 * 🦎 Zynx Type Generator Base - Base interface for language type generators
 * 
 * Provides the foundation for generating type definitions from DBML schemas
 * in various programming languages (TypeScript, Go, Python, Rust)
 */

import type { DatabaseSchema, DBMLTable, DBMLField, DBMLRef } from "../../types.ts";

/**
 * Base type generator interface that all language-specific generators must implement
 */
export abstract class TypeGenerator {
  /** Target language for type generation */
  abstract readonly language: string;
  
  /** File extension for generated files */
  abstract readonly fileExtension: string;
  
  /** Optional configuration for the generator */
  protected config: TypeGeneratorConfig;

  constructor(config: TypeGeneratorConfig = {}) {
    this.config = {
      indent: "  ",
      addComments: true,
      caseStyle: "camelCase",
      enumStyle: "union",
      dateHandling: "string",
      optionalHandling: "nullable",
      ...config
    };
  }

  /**
   * Generate type definitions for an entire database schema
   */
  abstract generateSchema(schema: DatabaseSchema): string;

  /**
   * Generate type definition for a single table
   */
  abstract generateTable(table: DBMLTable): string;

  /**
   * Generate field/property definition for a column
   */
  abstract generateField(field: DBMLField, table: DBMLTable): string;

  /**
   * Map DBML type to language-specific type
   */
  abstract mapDBMLType(dbmlType: string, field: DBMLField): string;

  /**
   * Generate enum or union type from field constraints
   */
  abstract generateEnum(name: string, values: string[]): string;

  /**
   * Generate relationship/reference types if needed (optional)
   */
  generateRelationship?(ref: DBMLRef, schema: DatabaseSchema): string;

  /**
   * Get header/imports for the generated file
   */
  abstract getFileHeader?(schema: DatabaseSchema): string;

  /**
   * Get footer for the generated file (optional)
   */
  getFileFooter?(): string;

  /**
   * Get required imports based on the schema
   */
  abstract getImports?(schema: DatabaseSchema): string[];

  /**
   * Convert database naming to language-specific naming convention
   */
  protected convertNaming(name: string): string {
    switch (this.config.caseStyle) {
      case "camelCase":
        return this.toCamelCase(name);
      case "PascalCase":
        return this.toPascalCase(name);
      case "snake_case":
        return name;
      case "kebab-case":
        return this.toKebabCase(name);
      default:
        return name;
    }
  }

  /**
   * Convert to camelCase
   */
  protected toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/^([A-Z])/, (_, letter) => letter.toLowerCase());
  }

  /**
   * Convert to PascalCase
   */
  protected toPascalCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/^([a-z])/, (_, letter) => letter.toUpperCase());
  }

  /**
   * Convert to kebab-case
   */
  protected toKebabCase(str: string): string {
    return str.replace(/_/g, "-").toLowerCase();
  }

  /**
   * Get indentation string for a given level
   */
  protected getIndent(level: number = 1): string {
    return this.config.indent!.repeat(level);
  }

  /**
   * Format a comment for the target language
   */
  protected formatComment(comment?: string): string {
    if (!comment || !this.config.addComments) return "";
    return comment;
  }

  /**
   * Check if a field is nullable/optional
   */
  protected isNullable(field: DBMLField): boolean {
    return !field.not_null && !field.pk;
  }

  /**
   * Extract enum values from a DBML type string
   */
  protected extractEnumValues(dbmlType: string): string[] | null {
    const enumMatch = dbmlType.match(/enum\s*\((.*?)\)/);
    if (!enumMatch) return null;
    
    return enumMatch[1]
      .split(",")
      .map(v => v.trim().replace(/['"]/g, ""))
      .filter(v => v.length > 0);
  }

  /**
   * Get a clean type name from DBML type string
   */
  protected getBaseType(dbmlType: string): string {
    // Remove modifiers and extract base type
    return dbmlType
      .replace(/\[.*?\]/g, "") // Remove array notation
      .replace(/\(.*?\)/g, "") // Remove parameters
      .trim()
      .toLowerCase();
  }

  /**
   * Check if type is an array type
   */
  protected isArrayType(dbmlType: string): boolean {
    return dbmlType.includes("[]") || dbmlType.toLowerCase().includes("array");
  }

  /**
   * Generate complete file content with header, body, and footer
   */
  generateFile(schema: DatabaseSchema): string {
    const parts: string[] = [];
    
    // Add imports first
    if (this.getImports) {
      const imports = this.getImports(schema);
      if (imports.length > 0) {
        parts.push(imports.join("\n"));
      }
    }
    
    // Add file header
    if (this.getFileHeader) {
      parts.push(this.getFileHeader(schema));
    }
    
    // Add main content
    parts.push(this.generateSchema(schema));
    
    // Add file footer
    if (this.getFileFooter) {
      parts.push(this.getFileFooter());
    }
    
    return parts.filter(p => p.length > 0).join("\n\n");
  }
}

/**
 * Configuration options for type generators
 */
export interface TypeGeneratorConfig {
  /** Indentation string (default: "  ") */
  indent?: string;
  
  /** Whether to add comments from DBML (default: true) */
  addComments?: boolean;
  
  /** Naming convention for generated types */
  caseStyle?: "camelCase" | "PascalCase" | "snake_case" | "kebab-case";
  
  /** How to handle enum types */
  enumStyle?: "enum" | "union" | "const";
  
  /** How to handle date/timestamp types */
  dateHandling?: "string" | "Date" | "number";
  
  /** How to handle optional/nullable fields */
  optionalHandling?: "nullable" | "optional" | "both";
  
  /** Custom type mappings */
  customTypes?: Record<string, string>;
  
  /** Import mappings: type -> module to import from */
  imports?: Record<string, string>;
  
  /** Whether to generate relationship types */
  includeRelationships?: boolean;
  
  /** Whether to generate index information */
  includeIndexes?: boolean;
  
  /** File header template */
  headerTemplate?: string;
  
  /** Namespace or module name */
  namespace?: string;
}

/**
 * Type mapping registry for common database types
 */
export const CommonTypeMappings: Record<string, { ts: string; go: string; py: string; rust: string }> = {
  // Numeric types
  "integer": { ts: "number", go: "int32", py: "int", rust: "i32" },
  "bigint": { ts: "bigint", go: "int64", py: "int", rust: "i64" },
  "smallint": { ts: "number", go: "int16", py: "int", rust: "i16" },
  "decimal": { ts: "number", go: "float64", py: "float", rust: "f64" },
  "numeric": { ts: "number", go: "float64", py: "float", rust: "f64" },
  "real": { ts: "number", go: "float32", py: "float", rust: "f32" },
  "double": { ts: "number", go: "float64", py: "float", rust: "f64" },
  "float": { ts: "number", go: "float64", py: "float", rust: "f64" },
  
  // String types
  "varchar": { ts: "string", go: "string", py: "str", rust: "String" },
  "char": { ts: "string", go: "string", py: "str", rust: "String" },
  "text": { ts: "string", go: "string", py: "str", rust: "String" },
  "string": { ts: "string", go: "string", py: "str", rust: "String" },
  
  // Date/Time types
  "timestamp": { ts: "Date", go: "time.Time", py: "datetime", rust: "DateTime<Utc>" },
  "timestamptz": { ts: "Date", go: "time.Time", py: "datetime", rust: "DateTime<Utc>" },
  "timestamp with time zone": { ts: "Date", go: "time.Time", py: "datetime", rust: "DateTime<Utc>" },
  "timestamp without time zone": { ts: "Date", go: "time.Time", py: "datetime", rust: "DateTime<Local>" },
  "date": { ts: "Date", go: "time.Time", py: "date", rust: "NaiveDate" },
  "time": { ts: "string", go: "string", py: "time", rust: "NaiveTime" },
  "datetime": { ts: "Date", go: "time.Time", py: "datetime", rust: "DateTime<Utc>" },
  
  // Boolean type
  "boolean": { ts: "boolean", go: "bool", py: "bool", rust: "bool" },
  "bool": { ts: "boolean", go: "bool", py: "bool", rust: "bool" },
  
  // JSON types
  "json": { ts: "any", go: "interface{}", py: "Dict[str, Any]", rust: "serde_json::Value" },
  "jsonb": { ts: "any", go: "interface{}", py: "Dict[str, Any]", rust: "serde_json::Value" },
  
  // Binary types
  "bytea": { ts: "Buffer", go: "[]byte", py: "bytes", rust: "Vec<u8>" },
  "blob": { ts: "Buffer", go: "[]byte", py: "bytes", rust: "Vec<u8>" },
  
  // UUID type
  "uuid": { ts: "string", go: "string", py: "str", rust: "Uuid" },
  
  // Array types (PostgreSQL specific)
  "integer[]": { ts: "number[]", go: "[]int32", py: "List[int]", rust: "Vec<i32>" },
  "text[]": { ts: "string[]", go: "[]string", py: "List[str]", rust: "Vec<String>" },
  
  // PostgreSQL specific types
  "serial": { ts: "number", go: "int32", py: "int", rust: "i32" },
  "bigserial": { ts: "number", go: "int64", py: "int", rust: "i64" },
};
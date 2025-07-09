/**
 * 🦎 Zynx Schema Differ - Intelligent Schema Comparison
 * 
 * Compares two database schemas and generates the necessary ALTER statements
 * to transform one schema into another. Like an axolotl regenerating tissue,
 * it precisely identifies what needs to change.
 */

import type {
  DatabaseSchema,
  DBMLTable,
  DBMLField,
  DBMLIndex,
  DBMLRef
} from "../types.ts";

/**
 * Schema change types for tracking modifications
 */
export interface SchemaChange {
  type: "create_table" | "drop_table" | "alter_table" | 
        "create_index" | "drop_index" | 
        "add_foreign_key" | "drop_foreign_key";
  table?: string;
  name?: string;
  sql: string;
  description: string;
}

/**
 * Schema comparison engine that identifies differences between schemas
 * 
 * @example
 * ```typescript
 * const differ = new SchemaDiffer();
 * const changes = await differ.compare(oldSchema, newSchema);
 * const sql = await differ.generateAlterStatements(oldSchema, newSchema);
 * ```
 */
export class SchemaDiffer {
  
  /**
   * Compare two schemas and return a list of changes (alias for compare)
   */
  async diff(oldSchema: any, newSchema: any): Promise<any[]> {
    return this.compare(oldSchema, newSchema);
  }
  
  /**
   * Compare two schemas and return a list of changes
   * 
   * @param oldSchema - Original schema
   * @param newSchema - Target schema
   * @returns Promise<SchemaChange[]> - List of changes needed
   */
  async compare(oldSchema: DatabaseSchema, newSchema: DatabaseSchema): Promise<SchemaChange[]> {
    const changes: SchemaChange[] = [];

    // 1. Table changes
    changes.push(...this.compareTableStructure(oldSchema, newSchema));

    // 2. Index changes
    changes.push(...this.compareIndexes(oldSchema, newSchema));

    // 3. Foreign key changes
    changes.push(...this.compareForeignKeys(oldSchema, newSchema));

    return changes;
  }

  /**
   * Generate ALTER statements to transform old schema to new schema
   * 
   * @param oldSchema - Original schema
   * @param newSchema - Target schema
   * @returns Promise<string> - Complete ALTER statement SQL
   */
  async generateAlterStatements(oldSchema: DatabaseSchema, newSchema: DatabaseSchema): Promise<string> {
    const changes = await this.compare(oldSchema, newSchema);
    
    if (changes.length === 0) {
      return "";
    }

    // Group changes by dependency order
    const orderedChanges = this.orderChangesByDependency(changes);
    
    // Generate header comment
    const header = this.generateHeader(changes.length);
    
    // Convert changes to SQL
    const sqlStatements = orderedChanges.map(change => {
      return `-- ${change.description}\n${change.sql}`;
    });

    return `${header}\n\n${sqlStatements.join('\n\n')}\n`;
  }

  /**
   * Compare table structures between schemas
   * 
   * @param oldSchema - Original schema
   * @param newSchema - Target schema
   * @returns SchemaChange[] - Table-related changes
   */
  private compareTableStructure(oldSchema: DatabaseSchema, newSchema: DatabaseSchema): SchemaChange[] {
    const changes: SchemaChange[] = [];

    // Create map of old tables for quick lookup
    const oldTables = new Map<string, DBMLTable>();
    oldSchema.tables.forEach(table => oldTables.set(table.name, table));

    // Create map of new tables for quick lookup
    const newTables = new Map<string, DBMLTable>();
    newSchema.tables.forEach(table => newTables.set(table.name, table));

    // Find new tables (CREATE TABLE)
    for (const newTable of newSchema.tables) {
      if (!oldTables.has(newTable.name)) {
        changes.push({
          type: "create_table",
          table: newTable.name,
          name: newTable.name,
          sql: this.generateCreateTableSQL(newTable),
          description: `Create table '${newTable.name}'`
        });
      }
    }

    // Find modified tables (ALTER TABLE)
    for (const newTable of newSchema.tables) {
      const oldTable = oldTables.get(newTable.name);
      if (oldTable) {
        const tableChanges = this.compareTableFields(oldTable, newTable);
        changes.push(...tableChanges);
      }
    }

    // Find dropped tables (DROP TABLE)
    for (const oldTable of oldSchema.tables) {
      if (!newTables.has(oldTable.name)) {
        changes.push({
          type: "drop_table",
          table: oldTable.name,
          name: oldTable.name,
          sql: `DROP TABLE IF EXISTS ${oldTable.name};`,
          description: `Drop table '${oldTable.name}'`
        });
      }
    }

    return changes;
  }

  /**
   * Compare fields between two tables
   * 
   * @param oldTable - Original table
   * @param newTable - Target table
   * @returns SchemaChange[] - Field-related changes
   */
  private compareTableFields(oldTable: DBMLTable, newTable: DBMLTable): SchemaChange[] {
    const changes: SchemaChange[] = [];

    // Create maps for quick field lookup
    const oldFields = new Map<string, DBMLField>();
    oldTable.fields.forEach(field => oldFields.set(field.name, field));

    const newFields = new Map<string, DBMLField>();
    newTable.fields.forEach(field => newFields.set(field.name, field));

    // Find new fields (ADD COLUMN)
    for (const newField of newTable.fields) {
      if (!oldFields.has(newField.name)) {
        changes.push({
          type: "alter_table",
          table: newTable.name,
          name: `add_${newField.name}`,
          sql: `ALTER TABLE ${newTable.name} ADD COLUMN ${this.generateFieldSQL(newField)};`,
          description: `Add column '${newField.name}' to table '${newTable.name}'`
        });
      }
    }

    // Find modified fields (ALTER COLUMN)
    for (const newField of newTable.fields) {
      const oldField = oldFields.get(newField.name);
      if (oldField) {
        const fieldChanges = this.compareFields(oldTable.name, oldField, newField);
        changes.push(...fieldChanges);
      }
    }

    // Find dropped fields (DROP COLUMN)
    for (const oldField of oldTable.fields) {
      if (!newFields.has(oldField.name)) {
        changes.push({
          type: "alter_table",
          table: newTable.name,
          name: `drop_${oldField.name}`,
          sql: `ALTER TABLE ${newTable.name} DROP COLUMN IF EXISTS ${oldField.name};`,
          description: `Drop column '${oldField.name}' from table '${newTable.name}'`
        });
      }
    }

    return changes;
  }

  /**
   * Compare two fields and generate changes
   * 
   * @param tableName - Name of the table
   * @param oldField - Original field
   * @param newField - Target field
   * @returns SchemaChange[] - Field modification changes
   */
  private compareFields(tableName: string, oldField: DBMLField, newField: DBMLField): SchemaChange[] {
    const changes: SchemaChange[] = [];

    // Compare data type
    if (oldField.type !== newField.type) {
      changes.push({
        type: "alter_table",
        table: tableName,
        name: `alter_${newField.name}_type`,
        sql: `ALTER TABLE ${tableName} ALTER COLUMN ${newField.name} TYPE ${newField.type};`,
        description: `Change column '${newField.name}' type from ${oldField.type} to ${newField.type}`
      });
    }

    // Compare NOT NULL constraint
    if (oldField.not_null !== newField.not_null) {
      const constraint = newField.not_null ? "SET NOT NULL" : "DROP NOT NULL";
      changes.push({
        type: "alter_table",
        table: tableName,
        name: `alter_${newField.name}_null`,
        sql: `ALTER TABLE ${tableName} ALTER COLUMN ${newField.name} ${constraint};`,
        description: `${newField.not_null ? 'Add' : 'Remove'} NOT NULL constraint on '${newField.name}'`
      });
    }

    // Compare default value
    if (oldField.default !== newField.default) {
      if (newField.default) {
        changes.push({
          type: "alter_table",
          table: tableName,
          name: `alter_${newField.name}_default`,
          sql: `ALTER TABLE ${tableName} ALTER COLUMN ${newField.name} SET DEFAULT ${newField.default};`,
          description: `Set default value for '${newField.name}' to ${newField.default}`
        });
      } else {
        changes.push({
          type: "alter_table",
          table: tableName,
          name: `alter_${newField.name}_default`,
          sql: `ALTER TABLE ${tableName} ALTER COLUMN ${newField.name} DROP DEFAULT;`,
          description: `Remove default value from '${newField.name}'`
        });
      }
    }

    // Compare unique constraint
    if (oldField.unique !== newField.unique) {
      if (newField.unique) {
        changes.push({
          type: "alter_table",
          table: tableName,
          name: `add_unique_${newField.name}`,
          sql: `ALTER TABLE ${tableName} ADD CONSTRAINT uk_${tableName}_${newField.name} UNIQUE (${newField.name});`,
          description: `Add unique constraint to '${newField.name}'`
        });
      } else {
        changes.push({
          type: "alter_table",
          table: tableName,
          name: `drop_unique_${newField.name}`,
          sql: `ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS uk_${tableName}_${newField.name};`,
          description: `Remove unique constraint from '${newField.name}'`
        });
      }
    }

    return changes;
  }

  /**
   * Compare indexes between schemas
   * 
   * @param oldSchema - Original schema
   * @param newSchema - Target schema
   * @returns SchemaChange[] - Index-related changes
   */
  private compareIndexes(oldSchema: DatabaseSchema, newSchema: DatabaseSchema): SchemaChange[] {
    const changes: SchemaChange[] = [];

    // Create maps for quick index lookup
    const oldIndexes = new Map<string, DBMLIndex>();
    oldSchema.indexes.forEach(index => {
      const key = `${index.tableName}.${index.name || index.columns.join('_')}`;
      oldIndexes.set(key, index);
    });

    const newIndexes = new Map<string, DBMLIndex>();
    newSchema.indexes.forEach(index => {
      const key = `${index.tableName}.${index.name || index.columns.join('_')}`;
      newIndexes.set(key, index);
    });

    // Find new indexes (CREATE INDEX)
    for (const [key, newIndex] of newIndexes) {
      if (!oldIndexes.has(key)) {
        changes.push({
          type: "create_index",
          table: newIndex.tableName,
          name: newIndex.name || `idx_${newIndex.tableName}_${newIndex.columns.join('_')}`,
          sql: this.generateCreateIndexSQL(newIndex),
          description: `Create index on '${newIndex.tableName}(${newIndex.columns.join(', ')})'`
        });
      }
    }

    // Find dropped indexes (DROP INDEX)
    for (const [key, oldIndex] of oldIndexes) {
      if (!newIndexes.has(key)) {
        const indexName = oldIndex.name || `idx_${oldIndex.tableName}_${oldIndex.columns.join('_')}`;
        changes.push({
          type: "drop_index",
          table: oldIndex.tableName,
          name: indexName,
          sql: `DROP INDEX IF EXISTS ${indexName};`,
          description: `Drop index '${indexName}' from table '${oldIndex.tableName}'`
        });
      }
    }

    return changes;
  }

  /**
   * Compare foreign keys between schemas
   * 
   * @param oldSchema - Original schema
   * @param newSchema - Target schema
   * @returns SchemaChange[] - Foreign key changes
   */
  private compareForeignKeys(oldSchema: DatabaseSchema, newSchema: DatabaseSchema): SchemaChange[] {
    const changes: SchemaChange[] = [];

    // Create maps for quick foreign key lookup
    const oldRefs = new Map<string, DBMLRef>();
    oldSchema.refs.forEach(ref => {
      const key = `${ref.from.table}.${ref.from.column}->${ref.to.table}.${ref.to.column}`;
      oldRefs.set(key, ref);
    });

    const newRefs = new Map<string, DBMLRef>();
    newSchema.refs.forEach(ref => {
      const key = `${ref.from.table}.${ref.from.column}->${ref.to.table}.${ref.to.column}`;
      newRefs.set(key, ref);
    });

    // Find new foreign keys (ADD CONSTRAINT)
    for (const [key, newRef] of newRefs) {
      if (!oldRefs.has(key)) {
        changes.push({
          type: "add_foreign_key",
          table: newRef.from.table,
          name: newRef.name || `fk_${newRef.from.table}_${newRef.from.column}`,
          sql: this.generateAddForeignKeySQL(newRef),
          description: `Add foreign key from '${newRef.from.table}.${newRef.from.column}' to '${newRef.to.table}.${newRef.to.column}'`
        });
      }
    }

    // Find dropped foreign keys (DROP CONSTRAINT)
    for (const [key, oldRef] of oldRefs) {
      if (!newRefs.has(key)) {
        const constraintName = oldRef.name || `fk_${oldRef.from.table}_${oldRef.from.column}`;
        changes.push({
          type: "drop_foreign_key",
          table: oldRef.from.table,
          name: constraintName,
          sql: `ALTER TABLE ${oldRef.from.table} DROP CONSTRAINT IF EXISTS ${constraintName};`,
          description: `Drop foreign key '${constraintName}' from table '${oldRef.from.table}'`
        });
      }
    }

    return changes;
  }

  /**
   * Order changes by dependency to avoid conflicts
   * 
   * @param changes - Array of schema changes
   * @returns SchemaChange[] - Ordered changes
   */
  private orderChangesByDependency(changes: SchemaChange[]): SchemaChange[] {
    const ordered: SchemaChange[] = [];
    
    // 1. Drop foreign keys first
    ordered.push(...changes.filter(c => c.type === "drop_foreign_key"));
    
    // 2. Drop indexes
    ordered.push(...changes.filter(c => c.type === "drop_index"));
    
    // 3. Drop tables
    ordered.push(...changes.filter(c => c.type === "drop_table"));
    
    // 4. Create tables
    ordered.push(...changes.filter(c => c.type === "create_table"));
    
    // 5. Alter tables
    ordered.push(...changes.filter(c => c.type === "alter_table"));
    
    // 6. Create indexes
    ordered.push(...changes.filter(c => c.type === "create_index"));
    
    // 7. Add foreign keys last
    ordered.push(...changes.filter(c => c.type === "add_foreign_key"));
    
    return ordered;
  }

  /**
   * Generate CREATE TABLE SQL
   * 
   * @param table - Table definition
   * @returns string - CREATE TABLE SQL
   */
  private generateCreateTableSQL(table: DBMLTable): string {
    const fields = table.fields.map(field => this.generateFieldSQL(field));
    return `CREATE TABLE ${table.name} (\n  ${fields.join(',\n  ')}\n);`;
  }

  /**
   * Generate field SQL definition
   * 
   * @param field - Field definition
   * @returns string - Field SQL
   */
  private generateFieldSQL(field: DBMLField): string {
    let sql = `${field.name} ${field.type}`;
    
    if (field.pk) sql += " PRIMARY KEY";
    if (field.unique) sql += " UNIQUE";
    if (field.not_null) sql += " NOT NULL";
    if (field.default) sql += ` DEFAULT ${field.default}`;
    
    return sql;
  }

  /**
   * Generate CREATE INDEX SQL
   * 
   * @param index - Index definition
   * @returns string - CREATE INDEX SQL
   */
  private generateCreateIndexSQL(index: DBMLIndex): string {
    const indexName = index.name || `idx_${index.tableName}_${index.columns.join('_')}`;
    const unique = index.unique ? "UNIQUE " : "";
    const type = index.type ? ` USING ${index.type}` : "";
    
    return `CREATE ${unique}INDEX ${indexName} ON ${index.tableName}${type} (${index.columns.join(', ')});`;
  }

  /**
   * Generate ADD FOREIGN KEY SQL
   * 
   * @param ref - Reference definition
   * @returns string - ADD CONSTRAINT SQL
   */
  private generateAddForeignKeySQL(ref: DBMLRef): string {
    const constraintName = ref.name || `fk_${ref.from.table}_${ref.from.column}`;
    let sql = `ALTER TABLE ${ref.from.table} ADD CONSTRAINT ${constraintName} `;
    sql += `FOREIGN KEY (${ref.from.column}) REFERENCES ${ref.to.table}(${ref.to.column})`;
    
    if (ref.onDelete) sql += ` ON DELETE ${ref.onDelete.toUpperCase()}`;
    if (ref.onUpdate) sql += ` ON UPDATE ${ref.onUpdate.toUpperCase()}`;
    
    return sql + ";";
  }

  /**
   * Generate migration header comment
   * 
   * @param changeCount - Number of changes
   * @returns string - Header comment
   */
  private generateHeader(changeCount: number): string {
    const timestamp = new Date().toISOString();
    return `-- 🦎 Zynx Migration Generated: ${timestamp}
-- Changes: ${changeCount}
-- 
-- Like an axolotl regenerating tissue, this migration will
-- precisely transform your database schema.`;
  }

  /**
   * Check if two schemas are identical
   * 
   * @param schema1 - First schema
   * @param schema2 - Second schema
   * @returns boolean - Whether schemas are identical
   */
  async schemasAreEqual(schema1: DatabaseSchema, schema2: DatabaseSchema): Promise<boolean> {
    const changes = await this.compare(schema1, schema2);
    return changes.length === 0;
  }

  /**
   * Generate a summary of changes
   * 
   * @param changes - Array of schema changes
   * @returns string - Human-readable summary
   */
  generateChangeSummary(changes: SchemaChange[]): string {
    if (changes.length === 0) {
      return "🦎 No changes detected - your schema is already perfect!";
    }

    const summary = changes.reduce((acc, change) => {
      acc[change.type] = (acc[change.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const lines = [
      `🧬 Zynx detected ${changes.length} schema change(s):`
    ];

    Object.entries(summary).forEach(([type, count]) => {
      const emoji = this.getChangeEmoji(type);
      lines.push(`   ${emoji} ${count} ${type.replace('_', ' ')}`);
    });

    return lines.join('\n');
  }

  /**
   * Get emoji for change type
   * 
   * @param changeType - Type of change
   * @returns string - Appropriate emoji
   */
  private getChangeEmoji(changeType: string): string {
    const emojis: Record<string, string> = {
      "create_table": "📋",
      "drop_table": "🗑️",
      "alter_table": "✏️",
      "create_index": "🔍",
      "drop_index": "🚫",
      "add_foreign_key": "🔗",
      "drop_foreign_key": "💔"
    };

    return emojis[changeType] || "🔄";
  }
}
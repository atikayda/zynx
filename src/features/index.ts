/**
 * Features module main export
 * Provides feature system for common PostgreSQL extensions
 */

export * from "./types.ts";
export * from "./definitions/index.ts";

import { featureRegistry, type Feature, type TypeMapping } from "./types.ts";
import "./definitions/index.ts"; // Side effect: registers all features

export interface FeatureOptions {
  features?: string[];
}

/**
 * Apply features to configuration
 */
export function applyFeatures(
  config: any,
  options: FeatureOptions
): {
  typeMappings: Record<string, TypeMapping>;
  extensions: string[];
  functions: Record<string, any>;
} {
  const featureNames = options.features || config.features || [];
  
  if (featureNames.length === 0) {
    return {
      typeMappings: {},
      extensions: [],
      functions: {}
    };
  }

  // Get all type mappings from features
  const typeMappings = featureRegistry.getTypeMappings(featureNames);
  
  // Merge with any existing custom type mappings (custom takes precedence)
  const mergedTypeMappings = {
    ...typeMappings,
    ...(config.schema?.typeMappings || {})
  };

  // Get extensions
  const extensions = featureRegistry.getExtensions(featureNames);
  
  // Get functions
  const functions = featureRegistry.getFunctions(featureNames);

  return {
    typeMappings: mergedTypeMappings,
    extensions,
    functions
  };
}

/**
 * Get language-specific type mappings for the type generator
 */
export function getLanguageTypeMappings(
  featureNames: string[],
  language: string
): { customTypes: Record<string, string>; imports: Record<string, string> } {
  const features = featureRegistry.resolve(featureNames);
  const customTypes: Record<string, string> = {};
  const imports: Record<string, string> = {};
  
  for (const feature of features) {
    if (feature.types) {
      for (const [typeName, mapping] of Object.entries(feature.types)) {
        const langMapping = mapping[language as keyof TypeMapping];
        if (langMapping && typeof langMapping === 'object') {
          customTypes[typeName] = langMapping.type;
          if (langMapping.import) {
            imports[langMapping.type] = langMapping.import;
          }
        }
      }
    }
  }
  
  return { customTypes, imports };
}

/**
 * Get SQL statements for creating extensions
 */
export function getExtensionSQL(featureNames: string[]): string[] {
  const extensions = featureRegistry.getExtensions(featureNames);
  return extensions.map(ext => `CREATE EXTENSION IF NOT EXISTS "${ext}";`);
}

/**
 * Check if a column should have a default value based on features
 */
export function getColumnDefault(
  featureNames: string[],
  columnName: string,
  columnType: string
): string | undefined {
  const features = featureRegistry.resolve(featureNames);
  
  for (const feature of features) {
    if (feature.defaultColumns?.[columnName]) {
      const defaultCol = feature.defaultColumns[columnName];
      if (defaultCol.type === columnType) {
        return defaultCol.default;
      }
    }
  }
  
  return undefined;
}

/**
 * Get appropriate index type for a column based on features
 */
export function getIndexType(
  featureNames: string[],
  columnType: string
): string | undefined {
  const features = featureRegistry.resolve(featureNames);
  
  for (const feature of features) {
    if (feature.indexes) {
      for (const [, indexDef] of Object.entries(feature.indexes)) {
        if (indexDef.applicable?.includes(columnType)) {
          return indexDef.type;
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Validate that all requested features are available
 */
export function validateFeatures(featureNames: string[]): void {
  for (const name of featureNames) {
    if (!featureRegistry.has(name)) {
      throw new Error(`Unknown feature: ${name}. Available features: ${
        featureRegistry.getAll().map(f => f.name).join(', ')
      }`);
    }
  }
}

/**
 * Get list of all available features
 */
export function listFeatures(): Feature[] {
  return featureRegistry.getAll();
}

/**
 * Get SQL type mappings for DBML parser (string to string only)
 */
export function getSQLTypeMappings(featureNames: string[]): Record<string, string> {
  const features = featureRegistry.resolve(featureNames);
  const sqlMappings: Record<string, string> = {};
  
  for (const feature of features) {
    if (feature.types) {
      for (const [typeName, mapping] of Object.entries(feature.types)) {
        // For DBML parser, we only need the SQL type mapping
        sqlMappings[typeName] = mapping.sql;
      }
    }
  }
  
  return sqlMappings;
}
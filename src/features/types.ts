/**
 * Feature system type definitions for Zynx
 * Provides pre-configured support for common PostgreSQL extensions
 */

export interface TypeMapping {
  sql: string;
  typescript?: { type: string; import?: string };
  python?: { type: string; import?: string };
  go?: { type: string; import?: string };
  rust?: { type: string; import?: string };
}

export interface FunctionDef {
  returns: string;
  sql: string;
  args?: Record<string, string>;
}

export interface OperatorDef {
  left: string;
  right: string;
  returns: string;
  description?: string;
}

export interface IndexDef {
  type: string;
  applicable?: string[];
  parameters?: Record<string, {
    type: string;
    default?: any;
    range?: [number, number];
  }>;
  sql?: string;
}

export interface Feature {
  name: string;
  description: string;
  extensions?: string[];
  types?: Record<string, TypeMapping>;
  functions?: Record<string, FunctionDef>;
  operators?: Record<string, OperatorDef>;
  indexes?: Record<string, IndexDef>;
  dependencies?: string[];
  defaultColumns?: Record<string, {
    type: string;
    default: string;
  }>;
}

export interface FeatureConfig {
  features?: string[];
}

export class FeatureRegistry {
  private features: Map<string, Feature> = new Map();

  register(feature: Feature): void {
    this.features.set(feature.name, feature);
  }

  get(name: string): Feature | undefined {
    return this.features.get(name);
  }

  getAll(): Feature[] {
    return Array.from(this.features.values());
  }

  has(name: string): boolean {
    return this.features.has(name);
  }

  /**
   * Resolve features including their dependencies
   */
  resolve(names: string[]): Feature[] {
    const resolved = new Set<string>();
    const features: Feature[] = [];

    const visit = (name: string) => {
      if (resolved.has(name)) return;
      
      const feature = this.get(name);
      if (!feature) {
        throw new Error(`Unknown feature: ${name}`);
      }

      // Visit dependencies first
      if (feature.dependencies) {
        for (const dep of feature.dependencies) {
          visit(dep);
        }
      }

      resolved.add(name);
      features.push(feature);
    };

    for (const name of names) {
      visit(name);
    }

    return features;
  }

  /**
   * Get all type mappings from enabled features
   */
  getTypeMappings(featureNames: string[]): Record<string, TypeMapping> {
    const features = this.resolve(featureNames);
    const mappings: Record<string, TypeMapping> = {};

    for (const feature of features) {
      if (feature.types) {
        Object.assign(mappings, feature.types);
      }
    }

    return mappings;
  }

  /**
   * Get all SQL extensions that need to be created
   */
  getExtensions(featureNames: string[]): string[] {
    const features = this.resolve(featureNames);
    const extensions = new Set<string>();

    for (const feature of features) {
      if (feature.extensions) {
        for (const ext of feature.extensions) {
          extensions.add(ext);
        }
      }
    }

    return Array.from(extensions);
  }

  /**
   * Get all functions provided by features
   */
  getFunctions(featureNames: string[]): Record<string, FunctionDef> {
    const features = this.resolve(featureNames);
    const functions: Record<string, FunctionDef> = {};

    for (const feature of features) {
      if (feature.functions) {
        Object.assign(functions, feature.functions);
      }
    }

    return functions;
  }
}

// Global feature registry instance
export const featureRegistry = new FeatureRegistry();
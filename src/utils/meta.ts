/**
 * 🦎 Zynx Migration Metadata Management
 * 
 * Manages migration state tracking via meta.yaml file
 */

import { join } from "@std/path";
import { ensureFile } from "@std/fs";
import { parse as parseYaml, stringify as stringifyYaml } from "@std/yaml";
import { ErrorHandler } from "./errors.ts";

/**
 * Migration metadata structure
 */
export interface MigrationMeta {
  /** Zynx version that created the migrations */
  version: string;
  
  /** Last migration number */
  lastMigration: number;
  
  /** Currently deployed features */
  features: string[];
  
  /** Deployed extensions */
  extensions: string[];
  
  /** Schema snapshot hash */
  schemaHash?: string;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last update timestamp */
  updatedAt: string;
  
  /** Custom metadata */
  custom?: Record<string, unknown>;
}

/**
 * Default metadata for new projects
 */
const DEFAULT_META: MigrationMeta = {
  version: "1.0.0",
  lastMigration: 0,
  features: [],
  extensions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

/**
 * Migration metadata manager
 */
export class MigrationMetaManager {
  private metaPath: string;

  constructor(migrationsDir: string) {
    this.metaPath = join(migrationsDir, "meta.yaml");
  }

  /**
   * Load migration metadata
   */
  async load(): Promise<MigrationMeta> {
    try {
      const content = await Deno.readTextFile(this.metaPath);
      const meta = parseYaml(content) as MigrationMeta;
      
      // Ensure all required fields exist
      return {
        ...DEFAULT_META,
        ...meta
      };
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        // Return default metadata if file doesn't exist
        return { ...DEFAULT_META };
      }
      
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`Failed to load migration metadata: ${err.message}`);
    }
  }

  /**
   * Save migration metadata
   */
  async save(meta: MigrationMeta): Promise<void> {
    try {
      // Update timestamp
      meta.updatedAt = new Date().toISOString();
      
      // Ensure file exists
      await ensureFile(this.metaPath);
      
      // Write YAML with nice formatting
      const yamlContent = stringifyYaml(meta, {
        indent: 2,
        sortKeys: false,
        lineWidth: 80
      });
      
      // Add header comment
      const content = `# Zynx Migration Metadata
# This file tracks migration state and should be committed to version control
# DO NOT EDIT MANUALLY unless you know what you're doing

${yamlContent}`;
      
      await Deno.writeTextFile(this.metaPath, content);
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`Failed to save migration metadata: ${err.message}`);
    }
  }

  /**
   * Update with new migration
   */
  async updateMigration(migrationNumber: number): Promise<void> {
    const meta = await this.load();
    meta.lastMigration = migrationNumber;
    await this.save(meta);
  }

  /**
   * Update features and detect changes
   */
  async updateFeatures(newFeatures: string[]): Promise<{
    added: string[];
    removed: string[];
  }> {
    const meta = await this.load();
    const currentFeatures = new Set(meta.features);
    const newFeatureSet = new Set(newFeatures);
    
    // Find added features
    const added = newFeatures.filter(f => !currentFeatures.has(f));
    
    // Find removed features
    const removed = meta.features.filter(f => !newFeatureSet.has(f));
    
    // Update metadata
    meta.features = newFeatures;
    await this.save(meta);
    
    return { added, removed };
  }

  /**
   * Update extensions
   */
  async updateExtensions(extensions: string[]): Promise<void> {
    const meta = await this.load();
    
    // Merge with existing extensions (don't remove)
    const extensionSet = new Set([...meta.extensions, ...extensions]);
    meta.extensions = Array.from(extensionSet).sort();
    
    await this.save(meta);
  }

  /**
   * Get features that need extensions
   */
  async getNewFeatures(currentFeatures: string[]): Promise<string[]> {
    const meta = await this.load();
    const deployedFeatures = new Set(meta.features);
    
    return currentFeatures.filter(f => !deployedFeatures.has(f));
  }

  /**
   * Check if this is the first migration
   */
  async isFirstMigration(): Promise<boolean> {
    const meta = await this.load();
    return meta.lastMigration === 0;
  }

  /**
   * Update schema hash
   */
  async updateSchemaHash(hash: string): Promise<void> {
    const meta = await this.load();
    meta.schemaHash = hash;
    await this.save(meta);
  }

  /**
   * Get or create initial metadata
   */
  async initialize(version: string, features: string[] = []): Promise<MigrationMeta> {
    try {
      // Try to load existing
      const existing = await this.load();
      
      // If it's a fresh migration (lastMigration === 0), update features
      if (existing.lastMigration === 0 && features.length > 0) {
        existing.version = version;
        existing.features = features;
        await this.save(existing);
      }
      
      return existing;
    } catch {
      // Create new metadata
      const meta: MigrationMeta = {
        ...DEFAULT_META,
        version,
        features,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await this.save(meta);
      return meta;
    }
  }
}
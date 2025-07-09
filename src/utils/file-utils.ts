/**
 * 🦎 Zynx File Management Utilities - Migration File Operations
 * 
 * Handles reading, writing, and managing migration files with proper
 * error handling, checksums, and file organization.
 */

// Use native Web Crypto API
import { join, dirname } from "@std/path";
import { ensureDir } from "@std/fs";
import { ErrorHandler } from "./errors.ts";

/**
 * File management utilities for Zynx migrations
 */
export class FileManager {
  private migrationsDir: string;

  constructor(migrationsDir: string) {
    this.migrationsDir = migrationsDir;
  }

  /**
   * Initialize migrations directory structure
   */
  async initialize(): Promise<void> {
    try {
      await ensureDir(this.migrationsDir);
      console.log(`🦎 Initialized migrations directory: ${this.migrationsDir}`);
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to initialize migrations directory: ${err.message}`);
    }
  }

  /**
   * Read file content
   */
  async readFile(filename: string): Promise<string> {
    try {
      const filePath = join(this.migrationsDir, filename);
      const content = await Deno.readTextFile(filePath);
      return content;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw new Error(`🚨 File not found: ${filename}`);
      }
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to read file '${filename}': ${err.message}`);
    }
  }

  /**
   * Write file content
   */
  async writeFile(filename: string, content: string): Promise<void> {
    try {
      const filePath = join(this.migrationsDir, filename);
      
      // Ensure directory exists
      await ensureDir(dirname(filePath));
      
      // Write file with proper encoding
      await Deno.writeTextFile(filePath, content);
      
      console.log(`📝 Written file: ${filename}`);
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to write file '${filename}': ${err.message}`);
    }
  }

  /**
   * Check if file exists
   */
  async exists(filename: string): Promise<boolean> {
    try {
      const filePath = join(this.migrationsDir, filename);
      const stat = await Deno.stat(filePath);
      return stat.isFile;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return false;
      }
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to check file existence '${filename}': ${err.message}`);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      const filePath = join(this.migrationsDir, filename);
      await Deno.remove(filePath);
      console.log(`🗑️ Deleted file: ${filename}`);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return; // File doesn't exist, that's fine
      }
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to delete file '${filename}': ${err.message}`);
    }
  }

  /**
   * Get all migration files (numbered SQL files)
   */
  async getMigrationFiles(): Promise<string[]> {
    try {
      const files: string[] = [];
      
      for await (const entry of Deno.readDir(this.migrationsDir)) {
        if (entry.isFile && entry.name.endsWith('.sql')) {
          files.push(entry.name);
        }
      }
      
      // Sort files by migration number
      return files.sort((a, b) => {
        const aNum = this.extractMigrationNumber(a);
        const bNum = this.extractMigrationNumber(b);
        return aNum - bNum;
      });
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return []; // Directory doesn't exist yet
      }
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to get migration files: ${err.message}`);
    }
  }

  /**
   * Get all files in migrations directory
   */
  async getAllFiles(): Promise<string[]> {
    try {
      const files: string[] = [];
      
      for await (const entry of Deno.readDir(this.migrationsDir)) {
        if (entry.isFile) {
          files.push(entry.name);
        }
      }
      
      return files.sort();
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return []; // Directory doesn't exist yet
      }
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to get all files: ${err.message}`);
    }
  }

  /**
   * Extract migration number from filename
   */
  private extractMigrationNumber(filename: string): number {
    const match = filename.match(/^(\d+)\.sql$/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 0; // Non-numbered files sort first
  }

  /**
   * Get next migration number
   */
  async getNextMigrationNumber(): Promise<number> {
    const files = await this.getMigrationFiles();
    
    if (files.length === 0) {
      return 1;
    }
    
    const numbers = files
      .map(file => this.extractMigrationNumber(file))
      .filter(num => num > 0);
    
    if (numbers.length === 0) {
      return 1;
    }
    
    return Math.max(...numbers) + 1;
  }

  /**
   * Calculate SHA256 checksum of content
   */
  async calculateChecksum(content: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to calculate checksum: ${err.message}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filename: string): Promise<{
    size: number;
    created: Date;
    modified: Date;
    checksum: string;
  }> {
    try {
      const filePath = join(this.migrationsDir, filename);
      const stat = await Deno.stat(filePath);
      const content = await this.readFile(filename);
      const checksum = await this.calculateChecksum(content);
      
      return {
        size: stat.size,
        created: stat.birthtime || stat.mtime || new Date(),
        modified: stat.mtime || new Date(),
        checksum
      };
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to get file metadata '${filename}': ${err.message}`);
    }
  }

  /**
   * Create backup of file
   */
  async createBackup(filename: string): Promise<string> {
    try {
      const content = await this.readFile(filename);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `${filename}.backup.${timestamp}`;
      
      await this.writeFile(backupFilename, content);
      
      console.log(`💾 Created backup: ${backupFilename}`);
      return backupFilename;
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to create backup of '${filename}': ${err.message}`);
    }
  }

  /**
   * Clean up old backup files
   */
  async cleanupBackups(keepCount: number = 5): Promise<void> {
    try {
      const allFiles = await this.getAllFiles();
      const backupFiles = allFiles
        .filter(file => file.includes('.backup.'))
        .sort((a, b) => {
          // Sort by timestamp in filename (newest first)
          const aTime = a.match(/\.backup\.(.+)$/)?.[1] || '';
          const bTime = b.match(/\.backup\.(.+)$/)?.[1] || '';
          return bTime.localeCompare(aTime);
        });
      
      if (backupFiles.length > keepCount) {
        const filesToDelete = backupFiles.slice(keepCount);
        
        for (const file of filesToDelete) {
          await this.deleteFile(file);
        }
        
        console.log(`🧹 Cleaned up ${filesToDelete.length} old backup files`);
      }
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      console.warn(`⚠️ Failed to cleanup backups: ${err.message}`);
    }
  }

  /**
   * Validate migration file structure
   */
  async validateMigrationFile(filename: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Check if file exists
      if (!await this.exists(filename)) {
        errors.push(`File does not exist: ${filename}`);
        return { valid: false, errors, warnings };
      }
      
      // Check filename format
      if (!filename.match(/^\d{4}\.sql$/) && !filename.match(/^snapshot\.sql$/)) {
        warnings.push(`Filename doesn't follow expected format: ${filename}`);
      }
      
      // Read and validate content
      const content = await this.readFile(filename);
      
      // Check if file is empty
      if (content.trim().length === 0) {
        errors.push(`Migration file is empty: ${filename}`);
      }
      
      // Check for potentially dangerous SQL
      const dangerousPatterns = [
        /DROP\s+DATABASE/i,
        /TRUNCATE\s+TABLE/i,
        /DELETE\s+FROM\s+\w+\s*;/i, // DELETE without WHERE
        /UPDATE\s+\w+\s+SET\s+.*\s*;/i // UPDATE without WHERE
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(content)) {
          warnings.push(`Potentially dangerous SQL detected in ${filename}`);
          break;
        }
      }
      
      // Check for proper SQL termination
      const statements = content.split(';').filter(stmt => stmt.trim());
      if (statements.length === 0) {
        warnings.push(`No SQL statements found in ${filename}`);
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      errors.push(`Failed to validate migration file: ${err.message}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Get directory statistics
   */
  async getDirectoryStats(): Promise<{
    totalFiles: number;
    migrationFiles: number;
    backupFiles: number;
    snapshotFiles: number;
    totalSize: number;
    oldestFile: string | null;
    newestFile: string | null;
  }> {
    try {
      const allFiles = await this.getAllFiles();
      const migrationFiles = allFiles.filter(f => f.match(/^\d{4}\.sql$/));
      const backupFiles = allFiles.filter(f => f.includes('.backup.'));
      const snapshotFiles = allFiles.filter(f => f.startsWith('snapshot.'));
      
      let totalSize = 0;
      let oldestFile: string | null = null;
      let newestFile: string | null = null;
      let oldestTime = Infinity;
      let newestTime = 0;
      
      for (const file of allFiles) {
        try {
          const metadata = await this.getFileMetadata(file);
          totalSize += metadata.size;
          
          const modTime = metadata.modified.getTime();
          if (modTime < oldestTime) {
            oldestTime = modTime;
            oldestFile = file;
          }
          if (modTime > newestTime) {
            newestTime = modTime;
            newestFile = file;
          }
        } catch (error) {
          const err = ErrorHandler.fromUnknown(error);
          console.warn(`⚠️ Failed to get metadata for ${file}: ${err.message}`);
        }
      }
      
      return {
        totalFiles: allFiles.length,
        migrationFiles: migrationFiles.length,
        backupFiles: backupFiles.length,
        snapshotFiles: snapshotFiles.length,
        totalSize,
        oldestFile,
        newestFile
      };
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to get directory stats: ${err.message}`);
    }
  }

  /**
   * Copy file to another location
   */
  async copyFile(sourceFilename: string, destFilename: string): Promise<void> {
    try {
      const content = await this.readFile(sourceFilename);
      await this.writeFile(destFilename, content);
      console.log(`📋 Copied file: ${sourceFilename} → ${destFilename}`);
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to copy file '${sourceFilename}' to '${destFilename}': ${err.message}`);
    }
  }

  /**
   * Move file to another location
   */
  async moveFile(sourceFilename: string, destFilename: string): Promise<void> {
    try {
      await this.copyFile(sourceFilename, destFilename);
      await this.deleteFile(sourceFilename);
      console.log(`🔄 Moved file: ${sourceFilename} → ${destFilename}`);
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to move file '${sourceFilename}' to '${destFilename}': ${err.message}`);
    }
  }

  /**
   * Watch for file changes (if supported)
   */
  async watchFiles(callback: (event: { kind: string; path: string }) => void): Promise<void> {
    try {
      const watcher = Deno.watchFs(this.migrationsDir);
      
      for await (const event of watcher) {
        if (event.kind === "modify" || event.kind === "create" || event.kind === "remove") {
          for (const path of event.paths) {
            callback({
              kind: event.kind,
              path: path.replace(this.migrationsDir + "/", "")
            });
          }
        }
      }
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw new Error(`🚨 Failed to watch files: ${err.message}`);
    }
  }

  /**
   * Get absolute path for a filename
   */
  getAbsolutePath(filename: string): string {
    return join(this.migrationsDir, filename);
  }

  /**
   * Get migrations directory path
   */
  getMigrationsDir(): string {
    return this.migrationsDir;
  }
}
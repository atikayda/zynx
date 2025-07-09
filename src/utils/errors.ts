/**
 * 🦎 Zynx Error Handling - Comprehensive Error Management
 * 
 * Custom error types and handling for the Axolotl-Powered Migration System
 */

/**
 * Base Zynx error class
 */
export class ZynxError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  
  constructor(message: string, code: string = "ZYNX_ERROR", context?: Record<string, unknown>) {
    super(message);
    this.name = "ZynxError";
    this.code = code;
    this.context = context;
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ZynxError);
    }
  }
}

/**
 * Configuration-related errors
 */
export class ConfigError extends ZynxError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`🚨 Configuration Error: ${message}`, "CONFIG_ERROR", context);
    this.name = "ConfigError";
  }
}

/**
 * Database connection and operation errors
 */
export class DatabaseError extends ZynxError {
  public readonly query?: string;
  public readonly params?: unknown[];
  
  constructor(message: string, query?: string, params?: unknown[], context?: Record<string, unknown>) {
    super(`🚨 Database Error: ${message}`, "DATABASE_ERROR", context);
    this.name = "DatabaseError";
    this.query = query;
    this.params = params;
  }
}

/**
 * Migration-specific errors
 */
export class MigrationError extends ZynxError {
  public readonly migrationNumber?: number;
  public readonly migrationFile?: string;
  
  constructor(message: string, migrationNumber?: number, migrationFile?: string, context?: Record<string, unknown>) {
    super(`🚨 Migration Error: ${message}`, "MIGRATION_ERROR", context);
    this.name = "MigrationError";
    this.migrationNumber = migrationNumber;
    this.migrationFile = migrationFile;
  }
}

/**
 * Schema parsing and validation errors
 */
export class SchemaError extends ZynxError {
  public readonly schemaPath?: string;
  public readonly lineNumber?: number;
  
  constructor(message: string, schemaPath?: string, lineNumber?: number, context?: Record<string, unknown>) {
    super(`🚨 Schema Error: ${message}`, "SCHEMA_ERROR", context);
    this.name = "SchemaError";
    this.schemaPath = schemaPath;
    this.lineNumber = lineNumber;
  }
}

/**
 * File system operation errors
 */
export class FileSystemError extends ZynxError {
  public readonly filePath?: string;
  public readonly operation?: string;
  
  constructor(message: string, filePath?: string, operation?: string, context?: Record<string, unknown>) {
    super(`🚨 File System Error: ${message}`, "FILESYSTEM_ERROR", context);
    this.name = "FileSystemError";
    this.filePath = filePath;
    this.operation = operation;
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ZynxError {
  public readonly field?: string;
  public readonly value?: unknown;
  
  constructor(message: string, field?: string, value?: unknown, context?: Record<string, unknown>) {
    super(`🚨 Validation Error: ${message}`, "VALIDATION_ERROR", context);
    this.name = "ValidationError";
    this.field = field;
    this.value = value;
  }
}

/**
 * Generator errors
 */
export class GeneratorError extends ZynxError {
  public readonly generatorType?: string;
  public readonly schemaElement?: string;
  
  constructor(message: string, generatorType?: string, schemaElement?: string, context?: Record<string, unknown>) {
    super(`🚨 Generator Error: ${message}`, "GENERATOR_ERROR", context);
    this.name = "GeneratorError";
    this.generatorType = generatorType;
    this.schemaElement = schemaElement;
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  /**
   * Handle error with formatted output and exit
   */
  static handle(error: unknown, verbose: boolean = false): void {
    const err = ErrorHandler.fromUnknown(error);
    console.error(ErrorHandler.formatError(err, verbose));
    
    // Show user-friendly suggestion
    const userMessage = ErrorHandler.getUserMessage(err);
    console.error(`\n💡 ${userMessage}`);
  }

  /**
   * Format error for user display
   */
  static formatError(error: Error, verbose: boolean = false): string {
    if (error instanceof ZynxError) {
      let formatted = `${error.message}`;
      
      if (error.context && Object.keys(error.context).length > 0) {
        formatted += `\n📊 Context: ${JSON.stringify(error.context, null, 2)}`;
      }
      
      if (error instanceof DatabaseError && error.query) {
        formatted += `\n🔍 Query: ${error.query}`;
        if (error.params && error.params.length > 0) {
          formatted += `\n📝 Parameters: ${JSON.stringify(error.params)}`;
        }
      }
      
      if (error instanceof MigrationError) {
        if (error.migrationNumber) {
          formatted += `\n📄 Migration: ${error.migrationNumber.toString().padStart(4, '0')}.sql`;
        }
        if (error.migrationFile) {
          formatted += `\n📂 File: ${error.migrationFile}`;
        }
      }
      
      if (error instanceof SchemaError) {
        if (error.schemaPath) {
          formatted += `\n📂 Schema File: ${error.schemaPath}`;
        }
        if (error.lineNumber) {
          formatted += `\n📍 Line: ${error.lineNumber}`;
        }
      }
      
      if (error instanceof FileSystemError) {
        if (error.filePath) {
          formatted += `\n📂 File: ${error.filePath}`;
        }
        if (error.operation) {
          formatted += `\n🔧 Operation: ${error.operation}`;
        }
      }
      
      if (error instanceof ValidationError) {
        if (error.field) {
          formatted += `\n🏷️  Field: ${error.field}`;
        }
        if (error.value !== undefined) {
          formatted += `\n💾 Value: ${JSON.stringify(error.value)}`;
        }
      }
      
      if (verbose && error.stack) {
        formatted += `\n\n📚 Stack Trace:\n${error.stack}`;
      }
      
      return formatted;
    }
    
    // Handle generic errors
    let formatted = `🚨 Error: ${error.message}`;
    if (verbose && error.stack) {
      formatted += `\n\n📚 Stack Trace:\n${error.stack}`;
    }
    
    return formatted;
  }
  
  /**
   * Create error from unknown value
   */
  static fromUnknown(value: unknown, fallbackMessage: string = "Unknown error occurred"): Error {
    if (value instanceof Error) {
      return value;
    }
    
    if (typeof value === "string") {
      return new ZynxError(value);
    }
    
    if (typeof value === "object" && value !== null) {
      const obj = value as Record<string, unknown>;
      if (typeof obj.message === "string") {
        return new ZynxError(obj.message, "UNKNOWN_ERROR", obj);
      }
    }
    
    return new ZynxError(fallbackMessage, "UNKNOWN_ERROR", { originalValue: value });
  }
  
  /**
   * Check if error is retryable
   */
  static isRetryable(error: Error): boolean {
    if (error instanceof DatabaseError) {
      // Connection errors are typically retryable
      return error.message.includes("connection") || 
             error.message.includes("timeout") ||
             error.message.includes("network");
    }
    
    if (error instanceof FileSystemError) {
      // Temporary file system issues might be retryable
      return error.message.includes("busy") ||
             error.message.includes("lock") ||
             error.message.includes("temporary");
    }
    
    // Most other errors are not retryable
    return false;
  }
  
  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: Error): string {
    if (error instanceof ConfigError) {
      return "Please check your zynx.config.ts file and ensure all required settings are configured.";
    }
    
    if (error instanceof DatabaseError) {
      return "Database connection failed. Please verify your database is running and connection string is correct.";
    }
    
    if (error instanceof SchemaError) {
      return "DBML schema parsing failed. Please check your database.dbml file syntax.";
    }
    
    if (error instanceof MigrationError) {
      return "Migration execution failed. Database has been preserved in its previous state.";
    }
    
    if (error instanceof ValidationError) {
      return "Invalid configuration or input detected. Please check the specified field.";
    }
    
    if (error instanceof FileSystemError) {
      return "File operation failed. Please check file permissions and disk space.";
    }
    
    return "An unexpected error occurred. Use --verbose for more details.";
  }
}

/**
 * Assertion utilities for validation
 */
export class Assert {
  /**
   * Assert value is not null or undefined
   */
  static notNull<T>(value: T | null | undefined, message?: string): asserts value is T {
    if (value === null || value === undefined) {
      throw new ValidationError(message || "Value cannot be null or undefined", undefined, value);
    }
  }
  
  /**
   * Assert value is a string
   */
  static isString(value: unknown, fieldName?: string): asserts value is string {
    if (typeof value !== "string") {
      throw new ValidationError(`Expected string but got ${typeof value}`, fieldName, value);
    }
  }
  
  /**
   * Assert value is a number
   */
  static isNumber(value: unknown, fieldName?: string): asserts value is number {
    if (typeof value !== "number" || isNaN(value)) {
      throw new ValidationError(`Expected number but got ${typeof value}`, fieldName, value);
    }
  }
  
  /**
   * Assert value is a boolean
   */
  static isBoolean(value: unknown, fieldName?: string): asserts value is boolean {
    if (typeof value !== "boolean") {
      throw new ValidationError(`Expected boolean but got ${typeof value}`, fieldName, value);
    }
  }
  
  /**
   * Assert value is an array
   */
  static isArray(value: unknown, fieldName?: string): asserts value is unknown[] {
    if (!Array.isArray(value)) {
      throw new ValidationError(`Expected array but got ${typeof value}`, fieldName, value);
    }
  }
  
  /**
   * Assert value is an object
   */
  static isObject(value: unknown, fieldName?: string): asserts value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new ValidationError(`Expected object but got ${typeof value}`, fieldName, value);
    }
  }
  
  /**
   * Assert string is not empty
   */
  static notEmpty(value: string, fieldName?: string): asserts value is string {
    if (value.trim().length === 0) {
      throw new ValidationError("String cannot be empty", fieldName, value);
    }
  }
  
  /**
   * Assert number is positive
   */
  static isPositive(value: number, fieldName?: string): asserts value is number {
    if (value <= 0) {
      throw new ValidationError(`Expected positive number but got ${value}`, fieldName, value);
    }
  }
  
  /**
   * Assert value is one of allowed values
   */
  static isOneOf<T>(value: unknown, allowedValues: T[], fieldName?: string): asserts value is T {
    if (!allowedValues.includes(value as T)) {
      throw new ValidationError(
        `Expected one of [${allowedValues.join(", ")}] but got ${value}`,
        fieldName,
        value
      );
    }
  }
}

/**
 * Retry utility with exponential backoff
 */
export class Retry {
  /**
   * Retry an operation with exponential backoff
   */
  static async withBackoff<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      initialDelay?: number;
      maxDelay?: number;
      factor?: number;
      retryIf?: (error: Error) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      factor = 2,
      retryIf = ErrorHandler.isRetryable
    } = options;
    
    let lastError: Error;
    let delay = initialDelay;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = ErrorHandler.fromUnknown(error);
        
        if (attempt === maxAttempts || !retryIf(lastError)) {
          throw lastError;
        }
        
        console.warn(`🔄 Attempt ${attempt} failed, retrying in ${delay}ms: ${lastError.message}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * factor, maxDelay);
      }
    }
    
    throw lastError!;
  }
}
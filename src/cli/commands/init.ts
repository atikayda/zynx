/**
 * 🦎 Zynx Init Command - Initialize Zynx in Project
 * 
 * Sets up Zynx configuration and creates necessary files
 */

import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import type { Command } from "../cli.ts";
import type { CLIOptions } from "../../types.ts";

export class InitCommand implements Command {
  constructor(private options: CLIOptions) {}

  async execute(args: string[]): Promise<void> {
    console.log("🦎 Initializing Zynx in current project...");
    
    const projectDir = Deno.cwd();
    const migrationsDir = join(projectDir, "migrations");
    
    // Create migrations directory
    await ensureDir(migrationsDir);
    console.log(`📁 Created migrations directory: ${migrationsDir}`);
    
    // Create sample database.dbml if it doesn't exist
    const dbmlPath = join(projectDir, "database.dbml");
    const dbmlExists = await this.fileExists(dbmlPath);
    
    if (!dbmlExists) {
      await this.createSampleDbml(dbmlPath);
      console.log(`📄 Created sample database.dbml: ${dbmlPath}`);
    } else {
      console.log(`📄 Found existing database.dbml: ${dbmlPath}`);
    }
    
    // Create zynx.config.ts if it doesn't exist
    const configPath = join(projectDir, "zynx.config.ts");
    const configExists = await this.fileExists(configPath);
    
    if (!configExists) {
      await this.createSampleConfig(configPath);
      console.log(`⚙️ Created sample config: ${configPath}`);
    } else {
      console.log(`⚙️ Found existing config: ${configPath}`);
    }
    
    // Create README for migrations
    const readmePath = join(migrationsDir, "README.md");
    const readmeExists = await this.fileExists(readmePath);
    
    if (!readmeExists) {
      await this.createMigrationsReadme(readmePath);
      console.log(`📚 Created migrations README: ${readmePath}`);
    }
    
    console.log(`
🌊 Zynx initialized successfully!

Next steps:
1. Edit database.dbml to define your schema
2. Configure database connection in zynx.config.ts
3. Run 'zynx generate' to create your first migration
4. Run 'zynx run' to apply migrations to your database

🦎 Happy migrating!
`);
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await Deno.stat(path);
      return true;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return false;
      }
      throw error;
    }
  }

  private async createSampleDbml(path: string): Promise<void> {
    const content = `// 🦎 Zynx Database Schema
// Define your database schema using DBML syntax
// Learn more: https://docs.dbml.org/

Table users {
  id uuid [primary key, default: \`gen_random_uuid()\`]
  email varchar(255) [unique, not null]
  name varchar(100) [not null]
  created_at timestamp [default: \`now()\`]
  updated_at timestamp [default: \`now()\`]
  
  Note: 'User accounts for the application'
}

Table posts {
  id uuid [primary key, default: \`gen_random_uuid()\`]
  user_id uuid [ref: > users.id, not null]
  title varchar(255) [not null]
  content text
  published boolean [default: false]
  created_at timestamp [default: \`now()\`]
  updated_at timestamp [default: \`now()\`]
  
  Note: 'Blog posts created by users'
}

Table comments {
  id uuid [primary key, default: \`gen_random_uuid()\`]
  post_id uuid [ref: > posts.id, not null]
  user_id uuid [ref: > users.id, not null]
  content text [not null]
  created_at timestamp [default: \`now()\`]
  
  Note: 'Comments on blog posts'
}

// Indexes for better performance
Indexes {
  users_email [unique]
  posts_user_id
  posts_published
  comments_post_id
  comments_user_id
}`;
    
    await Deno.writeTextFile(path, content);
  }

  private async createSampleConfig(path: string): Promise<void> {
    const content = `/**
 * 🦎 Zynx Configuration
 * 
 * Configure your database connection and migration settings
 */

import type { ZynxConfig } from "jsr:@atikayda/zynx";

export const config: ZynxConfig = {
  // Database connection settings
  database: {
    type: "postgresql",
    connectionString: Deno.env.get("DATABASE_URL") || 
      "postgresql://postgres:password@localhost:5432/myapp"
  },
  
  // Migration settings
  migrations: {
    directory: "./migrations",
    tableName: "zynx_migrations"
  },
  
  // Schema settings
  schema: {
    path: "./database.dbml"
  },
  
  // Generator settings
  generator: {
    // Add custom SQL generation settings here
    addDropStatements: true,
    addIfNotExists: true
  }
};

export default config;`;
    
    await Deno.writeTextFile(path, content);
  }

  private async createMigrationsReadme(path: string): Promise<void> {
    const content = `# 🦎 Zynx Migrations

This directory contains your database migrations generated and managed by Zynx.

## File Structure

- **0001.sql**, **0002.sql**, etc. - Numbered migration files
- **snapshot.sql** - Current database schema snapshot
- **README.md** - This file

## How Migrations Work

1. **Generate**: \`zynx generate\` compares your DBML schema to the current snapshot
2. **Apply**: \`zynx run\` applies pending migrations to your database
3. **Track**: Zynx tracks applied migrations in the \`zynx_migrations\` table

## Commands

- \`zynx generate\` - Generate new migrations from DBML changes
- \`zynx run\` - Apply pending migrations
- \`zynx status\` - Check migration status
- \`zynx rollback\` - Rollback to specific migration (if supported)

## Important Notes

- **Never edit migration files manually** - They are auto-generated
- **Always backup your database** before running migrations in production
- **Test migrations** in a staging environment first
- **Version control** this entire migrations directory

## Need Help?

Check the Zynx documentation: https://jsr.io/@atikayda/zynx

🌊 Happy migrating with your friendly axolotl!`;
    
    await Deno.writeTextFile(path, content);
  }

  getHelp(): string {
    return `
🦎 Zynx Init Command

Initialize Zynx in your project by creating:
- migrations/ directory
- database.dbml (sample schema)
- zynx.config.ts (configuration)
- README.md (documentation)

USAGE:
  zynx init

This command is safe to run multiple times - it won't overwrite existing files.
`;
  }
}
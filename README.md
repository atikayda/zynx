# Zynx

<div align="center">
  <img src="assets/zynx-icon.webp" alt="Zynx" width="160" height="160">
  <br><br>
  <strong>🎯 The Axolotl-Powered DBML Migration System for Deno</strong>
  <br><br>

  [![JSR](https://jsr.io/badges/@atikayda/zynx)](https://jsr.io/@atikayda/zynx)
  [![CI](https://github.com/atikayda/zynx/workflows/CI/badge.svg)](https://github.com/atikayda/zynx/actions)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Deno](https://img.shields.io/badge/Deno-1.45+-brightgreen?logo=deno)](https://deno.land)

</div>

---

**Zynx** is a powerful, Deno-native database migration system that transforms your DBML schema definitions into seamless PostgreSQL migrations. Just like how axolotls regenerate their limbs perfectly, Zynx regenerates your database schema with precision and grace.

![Zynx Mascot](./assets/zynx-mascot.webp)

## ✨ Features

- **🔄 Intelligent Schema Diffing**: Automatically detects changes between DBML schemas and generates incremental migrations
- **🌊 Transaction Safety**: All migrations run in atomic transactions with automatic rollback on failure
- **🧬 Multi-Format Configuration**: Support for YAML, JSON (with [`@atikayda/kjson`](https://jsr.io/@atikayda/kjson)), TypeScript, and JavaScript config files
- **🦎 Developer-Friendly CLI**: Intuitive commands with helpful error messages and comprehensive help
- **🎯 PostgreSQL Optimized**: Built specifically for PostgreSQL with production-ready features
- **🚀 Deno Native**: First-class TypeScript support with modern ESM imports
- **📊 Migration Tracking**: Comprehensive migration status and history tracking
- **🔒 Production Ready**: Extensive error handling, validation, and recovery mechanisms
- **🏷️ Type Generation**: Generate TypeScript, Go, Python, and Rust types from DBML schemas
- **🔌 Extension Features**: Pre-configured support for common PostgreSQL extensions via the features system

## 🏊‍♀️ Quick Start

### Installation

```bash
# Install globally
deno install --allow-all -n zynx jsr:@atikayda/zynx/cli

# Or use directly
deno run --allow-all jsr:@atikayda/zynx/cli --help
```

### Initialize a New Project

```bash
# Create a new Zynx project
zynx init

# This creates:
# - zynx.config.yaml    # Configuration file
# - database.dbml       # Schema definition
# - migrations/         # Migration directory
```

### Basic Workflow

1. **Define your schema** in `database.dbml`:
```dbml
Table users {
  id uuid [primary key, default: `gen_random_uuid()`]
  email varchar(255) [unique, not null]
  name varchar(100) [not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table posts {
  id uuid [primary key, default: `gen_random_uuid()`]
  title varchar(255) [not null]
  content text
  author_id uuid [ref: > users.id]
  published boolean [default: false]
  created_at timestamp [default: `now()`]
}
```

2. **Generate migrations**:
```bash
zynx generate
# Creates: migrations/0001_initial_schema.sql
```

3. **Apply migrations**:
```bash
zynx run
# Applies all pending migrations to your database
```

4. **Check status**:
```bash
zynx status
# Shows applied and pending migrations
```

## 🎯 Configuration

Zynx automatically discovers configuration files in this order:
1. `zynx.config.yaml` (recommended)
2. `zynx.config.yml`
3. `zynx.config.json`
4. `zynx.config.ts`
5. `zynx.config.js`

### YAML Configuration (Recommended)

```yaml
# zynx.config.yaml
database:
  type: postgresql
  connectionString: "postgresql://postgres:password@localhost:5432/myapp"
  ssl: false

migrations:
  directory: "./migrations"
  tableName: "zynx_migrations"
  lockTimeout: 30000
  queryTimeout: 60000

schema:
  path: "./database.dbml"
  format: "dbml"
  encoding: "utf8"

generator:
  addDropStatements: true
  addIfNotExists: true
  addComments: true
  indent: "  "
  lineEnding: "\n"

# Optional: Enable features for PostgreSQL extensions
features:
  - kjson      # BigInt, Instant, and Duration support
  - uuid-ossp  # UUID generation functions
```

### TypeScript Configuration

```typescript
// zynx.config.ts
import type { ZynxConfig } from "@atikayda/zynx/types";

export default {
  database: {
    type: "postgresql",
    connectionString: Deno.env.get("DATABASE_URL")!,
    ssl: Deno.env.get("NODE_ENV") === "production",
    pool: {
      min: 2,
      max: 10,
      timeout: 30000
    }
  },
  migrations: {
    directory: "./migrations",
    tableName: "zynx_migrations"
  },
  schema: {
    path: "./database.dbml"
  },
  features: ["kjson", "uuid-ossp"]
} satisfies ZynxConfig;
```

### JSON Configuration

Zynx uses [`@atikayda/kjson`](https://jsr.io/@atikayda/kjson) for enhanced JSON parsing with better error messages and BigInt support:

```json
{
  "database": {
    "type": "postgresql",
    "connectionString": "postgresql://localhost:5432/myapp",
    "pool": {
      "min": 2,
      "max": 10,
      "timeout": 30000
    }
  },
  "migrations": {
    "directory": "./migrations",
    "tableName": "zynx_migrations",
    "lockTimeout": 30000,
    "queryTimeout": 60000
  },
  "schema": {
    "path": "./database.dbml"
  },
  "generator": {
    "addDropStatements": true,
    "addIfNotExists": true,
    "addComments": true
  }
}
```

## 🔌 Features System

Zynx includes a powerful features system that provides pre-configured support for common PostgreSQL extensions. Instead of manually configuring type mappings for each extension, you can simply enable features.

### Available Features

#### `kjson` - BigInt, Instant, and Duration Support
Provides seamless integration with the [`@atikayda/kjson`](https://jsr.io/@atikayda/kjson) package for handling BigInt, Instant, and Duration types in PostgreSQL.

```yaml
features:
  - kjson
```

This feature automatically configures:
- Type mappings: `kinstant` → `Instant`, `kjson` → `any`, `kduration` → `Duration`, `decimal128` → `Decimal128`
- Default functions: `kjson_now()` for timestamp defaults
- Proper imports in generated TypeScript code

#### `uuid-ossp` - UUID Generation
Enables the `uuid-ossp` PostgreSQL extension for UUID generation.

```yaml
features:
  - uuid-ossp
```

This feature provides:
- Automatic `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` in migrations
- UUID type mappings for all supported languages
- Default functions: `uuid_generate_v4()` for UUID columns

#### `postgis` - Geographic and Spatial Data
Comprehensive support for PostGIS spatial data types and functions.

```yaml
features:
  - postgis
```

Includes:
- Geometry and geography type mappings
- Spatial indexes (GIST)
- Common spatial functions (ST_Distance, ST_Within, etc.)
- GeoJSON type mappings for TypeScript

#### `pgcrypto` - Cryptographic Functions
Cryptographic functions for encryption, hashing, and random generation.

```yaml
features:
  - pgcrypto
```

Provides:
- Functions: `gen_random_uuid()`, `digest()`, `crypt()`, etc.
- Can be used as an alternative to `uuid-ossp` for UUID generation

#### `bloom` - Bloom Filter Indexes
Space-efficient probabilistic data structure for testing set membership.

```yaml
features:
  - bloom
```

Enables:
- Bloom filter index type with configurable parameters
- Optimized for multi-column equality searches

### Using Features

#### In Configuration File

```yaml
# zynx.config.yaml
features:
  - kjson
  - uuid-ossp
  - postgis

# Features automatically configure type mappings
# No need to manually specify typeMappings
```

#### Via CLI

```bash
# Generate types with features
zynx generate-types --features kjson,uuid-ossp --language typescript

# Generate migrations with features
zynx generate --features kjson,uuid-ossp
```

#### Multiple Features Example

```yaml
# zynx.config.yaml
database:
  type: postgresql
  connectionString: "postgresql://localhost:5432/myapp"

features:
  - kjson       # BigInt and time support
  - uuid-ossp   # UUID functions
  - postgis     # Spatial data
  - pgcrypto    # Encryption

schema:
  path: "./database.dbml"
```

Your DBML can then use these types naturally:

```dbml
Table users {
  id uuid [pk, default: `uuid_generate_v4()`]
  location geometry(Point)
  metadata kjson
  created_at kinstant [default: `kjson_now()`]
  password_hash text
}
```

### Custom Type Mappings

Features can be combined with custom type mappings. Custom mappings take precedence:

```yaml
features:
  - kjson

schema:
  typeMappings:
    # Override kjson's default mapping
    kinstant: "timestamp with time zone"
    # Add custom type
    money: "decimal(19,4)"
```

## 🖥️ CLI Commands

### Core Commands

```bash
# Generate migration from schema changes
zynx generate [options]

# Apply pending migrations
zynx run [options]

# Show migration status
zynx status [options]

# Initialize new project
zynx init

# Generate types from DBML schema
zynx generate-types --language typescript

# Show help
zynx --help
```

### Command Options

#### `zynx generate`
```bash
zynx generate                           # Generate from default schema
zynx generate --name "add-user-table"   # Custom migration name
zynx generate --dry-run                 # Preview changes without creating files
zynx generate --schema "./custom.dbml"  # Use custom schema file
zynx generate --force                   # Force generation even if no changes
zynx generate --features kjson,uuid-ossp # Generate with specific features
```

#### `zynx run`
```bash
zynx run                     # Apply all pending migrations
zynx run --dry-run          # Preview migrations without applying
zynx run --target 5         # Apply migrations up to specific number
zynx run --single           # Apply only the next pending migration
zynx run --force            # Force apply (use with caution)
```

#### `zynx status`
```bash
zynx status              # Basic status overview
zynx status --verbose    # Detailed status with migration lists
zynx status --json       # JSON output for scripting
```

#### `zynx generate-types`
```bash
zynx generate-types --language typescript      # Generate TypeScript types
zynx generate-types --language go             # Generate Go structs
zynx generate-types --language python         # Generate Python dataclasses
zynx generate-types --language rust           # Generate Rust structs
zynx generate-types --all                     # Generate types for all languages
zynx generate-types --all --output ./types/   # Custom output directory

# With features
zynx generate-types --language typescript --features kjson,uuid-ossp
zynx generate-types --all --features kjson,postgis

# Language-specific options
zynx generate-types --language python --pydantic    # Use Pydantic models
zynx generate-types --language rust --diesel        # Include Diesel derives
```

### Global Options

```bash
-c, --config <file>    Use custom config file
-v, --verbose          Enable verbose output
-h, --help             Show help message
-V, --version          Show version information
```

## 📚 Programmatic Usage

### Basic Library Usage

```typescript
import { ZynxManager, loadConfig } from "@atikayda/zynx";

// Load configuration
const config = await loadConfig("./zynx.config.yaml");

// Create manager instance
const zynx = new ZynxManager(config);

// Generate migrations
const generateResult = await zynx.generate();
console.log(`Generated: ${generateResult.migrationFile}`);

// Apply migrations
const runResult = await zynx.run();
console.log(`Applied ${runResult.appliedMigrations.length} migrations`);

// Check status
const status = await zynx.status();
console.log(`Pending: ${status.pendingMigrations.length}`);
```

### Advanced Usage with Error Handling

```typescript
import { 
  ZynxManager, 
  loadConfig, 
  ZynxError,
  DatabaseError,
  SchemaError 
} from "@atikayda/zynx";

try {
  const config = await loadConfig();
  const zynx = new ZynxManager(config);
  
  // Generate with custom options
  const result = await zynx.generate({
    name: "add_user_profiles",
    force: false
  });
  
  if (result.hasChanges) {
    console.log(`Generated migration: ${result.migrationFile}`);
    
    // Apply with dry run first
    const dryRun = await zynx.run({ dryRun: true });
    console.log("Dry run successful, applying migrations...");
    
    const applied = await zynx.run();
    console.log(`Successfully applied ${applied.appliedMigrations.length} migrations`);
  } else {
    console.log("No schema changes detected");
  }
  
} catch (error) {
  if (error instanceof SchemaError) {
    console.error(`Schema error: ${error.message}`);
    if (error.lineNumber) {
      console.error(`At line ${error.lineNumber} in ${error.schemaPath}`);
    }
  } else if (error instanceof DatabaseError) {
    console.error(`Database error: ${error.message}`);
    if (error.query) {
      console.error(`Query: ${error.query}`);
    }
  } else if (error instanceof ZynxError) {
    console.error(`Zynx error: ${error.message}`);
  } else {
    console.error(`Unexpected error: ${error.message}`);
  }
  
  Deno.exit(1);
}
```

### Configuration Management

```typescript
import { 
  loadConfig, 
  createConfig, 
  discoverConfigFile,
  isValidConfig 
} from "@atikayda/zynx/config";

// Discover config file automatically
const configPath = await discoverConfigFile();
console.log(`Found config: ${configPath}`);

// Load from specific path
const config = await loadConfig("./custom-config.yaml");

// Create config programmatically
const config = createConfig({
  database: {
    type: "postgresql",
    connectionString: "postgresql://localhost:5432/myapp"
  },
  migrations: {
    directory: "./db/migrations"
  },
  schema: {
    path: "./schema/database.dbml"
  }
});

// Validate configuration
if (isValidConfig(config)) {
  console.log("Configuration is valid");
}
```

### Type Generation

```typescript
import { 
  DBMLParser,
  TypeScriptGenerator,
  GoGenerator,
  PythonGenerator,
  RustGenerator 
} from "@atikayda/zynx";

// Parse DBML schema with features
const parser = new DBMLParser({
  typeMappings: {
    kinstant: "kinstant",
    kjson: "kjson",
    uuid: "uuid"
  }
});
const schema = await parser.parse(dbmlContent);

// Generate TypeScript types with feature support
const tsGenerator = new TypeScriptGenerator({
  addComments: true,
  enumStyle: "union",
  dateHandling: "Date",
  customTypes: {
    kinstant: "Instant",
    kjson: "any",
    uuid: "string"
  },
  imports: {
    Instant: "@atikayda/kjson"
  }
});
const tsTypes = tsGenerator.generateFile(schema);

// Generate Go structs
const goGenerator = new GoGenerator({
  namespace: "models"
});
const goTypes = goGenerator.generateFile(schema);

// Generate Python dataclasses
const pyGenerator = new PythonGenerator({
  pythonStyle: "pydantic"
});
const pyTypes = pyGenerator.generateFile(schema);

// Generate Rust structs
const rustGenerator = new RustGenerator({
  useSerde: true,
  deriveTraits: ["Debug", "Clone", "Serialize", "Deserialize"]
});
const rustTypes = rustGenerator.generateFile(schema);
```

### Features API

```typescript
import { 
  validateFeatures,
  listFeatures,
  getLanguageTypeMappings,
  getSQLTypeMappings 
} from "@atikayda/zynx/features";

// List all available features
const features = listFeatures();
console.log("Available features:");
features.forEach(f => {
  console.log(`- ${f.name}: ${f.description}`);
});

// Validate feature names
try {
  validateFeatures(["kjson", "uuid-ossp"]);
  console.log("Features are valid!");
} catch (error) {
  console.error("Invalid feature:", error.message);
}

// Get type mappings for a specific language
const { customTypes, imports } = getLanguageTypeMappings(
  ["kjson", "uuid-ossp"], 
  "typescript"
);
console.log("TypeScript types:", customTypes);
console.log("Required imports:", imports);

// Get SQL type mappings for DBML parser
const sqlMappings = getSQLTypeMappings(["kjson", "postgis"]);
console.log("SQL mappings:", sqlMappings);
```

## 🔧 Migration Files

Generated migration files follow a consistent structure:

```sql
-- Migration: 0001_add_user_table
-- Generated: 2024-01-15T10:30:00Z
-- Zynx Version: 1.0.0

BEGIN;

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);

-- Insert migration record
INSERT INTO zynx_migrations (number, name, checksum, executed_at) 
VALUES (1, 'add_user_table', 'sha256:abc123...', now());

COMMIT;
```

### With Features Enabled

When features are enabled, Zynx intelligently manages extensions:

#### Initial Migration
The first migration includes all necessary extensions:

```sql
-- Migration: 0001_initial_schema
-- Generated: 2024-01-15T10:30:00Z
-- Zynx Version: 1.0.0
-- Features: kjson, uuid-ossp

BEGIN;

-- Create extensions (from features)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table with feature types
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  metadata kjson,
  created_at kinstant DEFAULT kjson_now(),
  updated_at kinstant DEFAULT kjson_now()
);

COMMIT;
```

#### Subsequent Migrations
Regular migrations don't include extension statements:

```sql
-- Migration: 0002_add_posts_table
-- Generated: 2024-01-16T10:30:00Z

BEGIN;

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  created_at kinstant DEFAULT kjson_now()
);

COMMIT;
```

#### Adding New Features
When you add a new feature requiring extensions:

```sql
-- Migration: 0003_add_location_support
-- Generated: 2024-01-17T10:30:00Z
-- New Features: postgis

BEGIN;

-- Create newly required extensions
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "postgis_topology";

-- Add location column using new feature
ALTER TABLE users ADD COLUMN location geometry(Point);

COMMIT;
```

## 🛠️ Development & CI/CD

### GitHub Actions

```yaml
name: Database Migrations
on: [push, pull_request]

jobs:
  migrate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v2
        with:
          deno-version: v1.x
      
      - name: Run migrations (dry run)
        run: deno run --allow-all jsr:@atikayda/zynx/cli run --dry-run
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Apply migrations
        run: deno run --allow-all jsr:@atikayda/zynx/cli run
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
```

### Docker

```dockerfile
FROM denoland/deno:alpine

WORKDIR /app
COPY . .

# Cache dependencies
RUN deno cache jsr:@atikayda/zynx/cli

# Run migrations
ENTRYPOINT ["deno", "run", "--allow-all", "jsr:@atikayda/zynx/cli"]
CMD ["run"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    
  migrate:
    image: denoland/deno:alpine
    depends_on:
      - postgres
    volumes:
      - .:/app
    working_dir: /app
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/myapp
    command: >
      sh -c "
        deno run --allow-all jsr:@atikayda/zynx/cli run
      "
```

## 🔍 Troubleshooting

### Common Issues

**Migration fails with connection error:**
```bash
# Check your database connection
zynx status --verbose

# Test with different connection string
zynx status --config ./test-config.yaml
```

**Schema parsing errors:**
```bash
# Validate your DBML syntax
zynx generate --dry-run --verbose

# Check specific schema file
zynx generate --schema ./problematic-schema.dbml --dry-run
```

**Migration conflicts:**
```bash
# Show detailed migration status
zynx status --verbose

# Force regenerate (careful!)
zynx generate --force
```

### Debug Mode

```bash
# Enable verbose logging
ZYNX_LOG_LEVEL=debug zynx run --verbose

# Show configuration resolution
zynx status --verbose
```

## 🧪 Testing

```bash
# Run all tests
deno test --allow-all

# Run specific test suite
deno test --allow-all tests/cli/
deno test --allow-all tests/core/

# Run with coverage
deno test --allow-all --coverage=cov_profile
deno coverage cov_profile
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/atikayda/zynx.git
cd zynx

# Run tests
deno test --allow-all

# Run CLI locally
deno run --allow-all ./cli.ts --help

# Format code
deno fmt

# Lint code
deno lint
```

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🦎 About the Axolotl

The axolotl is famous for its incredible regenerative abilities - it can regrow entire limbs, organs, and even parts of its brain with perfect precision. This makes it the perfect mascot for a migration system that regenerates database schemas seamlessly and reliably.

---

**Made with 💙 for the Deno ecosystem**
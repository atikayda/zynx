# 🦎 Zynx Basic Example

This example demonstrates basic Zynx usage with a simple blog application schema.

## 📋 What's Included

- **`database.dbml`** - Complete blog schema with users, posts, categories, and comments
- **`migrate.ts`** - Custom migration script with blog-specific configuration
- **`README.md`** - This documentation

## 🚀 Quick Start

### 1. Set up Database

```bash
# Create a PostgreSQL database for this example
createdb zynx_basic_example

# Or set custom connection string
export DATABASE_URL="postgresql://user:pass@localhost:5432/your_blog_db"
```

### 2. Generate Initial Migration

```bash
# Generate the first migration from database.dbml
deno run --allow-all migrate.ts generate
```

This will create:
- `migrations/snapshot.dbml` - Copy of current schema
- `migrations/snapshot.sql` - Complete schema SQL

### 3. Apply Migration

```bash
# Apply the migration to your database
deno run --allow-all migrate.ts run
```

This creates all tables, indexes, and foreign keys in your database.

### 4. Check Status

```bash
# View current migration status
deno run --allow-all migrate.ts status
```

## 🧬 Schema Evolution Example

Let's add a new feature to our blog - post tags!

### 1. Update Schema

Edit `database.dbml` and add:

```dbml
Table tags {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(50) [unique, not null]
  slug varchar(50) [unique, not null]
  color varchar(7)
  created_at timestamp [default: `now()`]
  
  Note: 'Post tags for categorization'
}

Table post_tags {
  post_id uuid [ref: > posts.id, not null]
  tag_id uuid [ref: > tags.id, not null]
  
  Note: 'Many-to-many relationship between posts and tags'
}
```

### 2. Generate Migration

```bash
deno run --allow-all migrate.ts generate
```

Zynx will:
- Compare `database.dbml` with `migrations/snapshot.dbml`
- Generate `migrations/blog_0001.sql` with ALTER statements
- Update the snapshot files

### 3. Apply Changes

```bash
deno run --allow-all migrate.ts run
```

Your database now includes the new tags feature!

## 📊 Features Demonstrated

### Database Features
- **UUIDs** - Using `gen_random_uuid()` for primary keys
- **Foreign Keys** - Proper relationships between tables
- **Indexes** - Performance optimization
- **Constraints** - Data integrity with unique and not null
- **Default Values** - Timestamps and boolean defaults

### Zynx Features
- **Snapshot Migrations** - Complete schema for fresh databases
- **Incremental Migrations** - Only changes for existing databases
- **Hooks** - Custom behavior before/after operations
- **Configuration** - Project-specific settings
- **Status Checking** - Migration state visibility

## 🎯 Best Practices Shown

1. **Descriptive Names** - Clear table and column naming
2. **Proper Indexing** - Indexes on foreign keys and query patterns
3. **Data Types** - Appropriate PostgreSQL types
4. **Relationships** - Clean many-to-many through junction tables
5. **Documentation** - Table and column notes
6. **Flexibility** - Anonymous comments with optional user association

## 🔧 Configuration Options

The `migrate.ts` script shows several configuration options:

```typescript
const config = createConfig({
  dbmlPath: "./database.dbml",           // Schema source
  migrationsDir: "./migrations",         // Where migrations are stored
  database: {
    type: "postgresql",                  // Database type
    connectionString: "postgresql://..." // Connection details
  },
  settings: {
    migrationTableName: "_migrations",   // Migration tracking table
    snapshotName: "snapshot",           // Snapshot file names
    migrationPrefix: "blog_"            // Migration file prefix
  },
  hooks: {
    // Custom behavior at different lifecycle points
    beforeGenerate: async () => { ... },
    afterRun: async (result) => { ... }
  }
});
```

## 🌊 Next Steps

1. **Try Schema Changes** - Add more tables or columns and see Zynx generate migrations
2. **Explore Hooks** - Add custom validation or backup logic
3. **Production Setup** - Use environment variables for connection strings
4. **Advanced Features** - Check out the advanced example for more complex scenarios

---

🦎 **Happy migrating with Zynx!** Your database schema will regenerate as smoothly as an axolotl's limb.
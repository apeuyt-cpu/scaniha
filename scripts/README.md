# Migration Scripts

This directory contains scripts to help migrate your Supabase project from one account to another.

## Setup

### 1. Create `.env.old` file

Create a `.env.old` file in the project root with your OLD Supabase credentials:

```env
OLD_SUPABASE_URL=https://your-old-project.supabase.co
OLD_SUPABASE_SERVICE_ROLE_KEY=your-old-service-role-key
```

Alternatively, if your `.env.local` still has the old credentials, the scripts will use those as fallback.

### 2. Update `.env.local` with NEW credentials

Make sure `.env.local` has your NEW Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-new-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key
```

## Scripts

### SQL Scripts (Run in Supabase SQL Editor)

#### `complete_schema.sql`
- **Purpose**: Creates the complete database schema in your NEW Supabase project
- **When to run**: After creating your new Supabase project
- **Location**: Run in NEW project's SQL Editor

#### `export_data.sql`
- **Purpose**: Generates INSERT statements for all your data
- **When to run**: In your OLD project's SQL Editor to export data
- **Note**: The generated SQL references users by email, so it will work after users are imported

#### `export_schema.sql`
- **Purpose**: Lists your current schema (for reference)
- **When to run**: In OLD project to see what you have

#### `update_data_with_new_user_ids.sql`
- **Purpose**: Updates business owner_id after user migration
- **When to run**: After importing users, in NEW project's SQL Editor

### Node.js Scripts (Run from terminal)

#### `migrate_users.js`
Migrates all users from old account to new account.

```bash
# Export users from old account
node scripts/migrate_users.js export

# Import users to new account
node scripts/migrate_users.js import
```

**Important**: User passwords cannot be migrated. Users will be created with temporary passwords and need to reset them.

#### `migrate_storage.js`
Migrates storage files (images) from old bucket to new bucket.

```bash
# List files in old bucket
node scripts/migrate_storage.js list menu-images

# Copy all files to new bucket
node scripts/migrate_storage.js copy menu-images
```

## Migration Order

1. **Export** data from old account
2. **Create** new Supabase project
3. **Run** `complete_schema.sql` in new project
4. **Run** `setup_storage.sql` in new project (from project root)
5. **Import** users: `node scripts/migrate_users.js import`
6. **Import** data: Run exported SQL in new project
7. **Copy** storage: `node scripts/migrate_storage.js copy`
8. **Update** environment variables
9. **Test** everything

See `MIGRATION_CHECKLIST.md` in project root for detailed steps.


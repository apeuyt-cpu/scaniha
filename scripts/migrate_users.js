/**
 * User Migration Script
 * 
 * This script migrates users from old Supabase account to new one.
 * 
 * IMPORTANT: User passwords cannot be exported/imported directly.
 * Users will need to reset their passwords after migration.
 * 
 * Usage:
 * 1. Set OLD_SUPABASE credentials in .env.old
 * 2. Set NEW_SUPABASE credentials in .env.local
 * 3. Run: node scripts/migrate_users.js
 */

// Load environment variables from .env.old if dotenv is available
try {
  require('dotenv').config({ path: '.env.old' });
} catch (e) {
  // dotenv not installed, user must set environment variables manually
}

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Old Supabase (read)
const oldSupabaseUrl = process.env.OLD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const oldServiceKey = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// New Supabase (write)
// Load from .env.local if dotenv is available
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not installed, user must set environment variables manually
}
const newSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const newServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!oldSupabaseUrl || !oldServiceKey) {
  console.error('❌ Error: OLD Supabase credentials not found!');
  console.error('Create .env.old with:');
  console.error('  OLD_SUPABASE_URL=https://old-project.supabase.co');
  console.error('  OLD_SUPABASE_SERVICE_ROLE_KEY=old-service-key');
  process.exit(1);
}

if (!newSupabaseUrl || !newServiceKey) {
  console.error('❌ Error: NEW Supabase credentials not found!');
  console.error('Update .env.local with new credentials');
  process.exit(1);
}

const oldSupabase = createClient(oldSupabaseUrl, oldServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const newSupabase = createClient(newSupabaseUrl, newServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function exportUsers() {
  console.log('📤 Exporting users from old Supabase...');
  
  try {
    // Get all users
    const { data: users, error } = await oldSupabase.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Found ${users.users.length} users`);
    
    // Get profiles for each user
    const usersWithProfiles = await Promise.all(
      users.users.map(async (user) => {
        const { data: profile } = await oldSupabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        return {
          user: {
            id: user.id,
            email: user.email,
            email_confirmed_at: user.email_confirmed_at,
            phone: user.phone,
            phone_confirmed_at: user.phone_confirmed_at,
            raw_user_meta_data: user.user_metadata,
            raw_app_meta_data: user.app_metadata,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
          profile: profile || null
        };
      })
    );
    
    // Save to file
    const backupPath = path.join(__dirname, '../old_users_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(usersWithProfiles, null, 2));
    console.log(`✅ Users exported to: ${backupPath}`);
    
    return usersWithProfiles;
  } catch (error) {
    console.error('❌ Error exporting users:', error);
    throw error;
  }
}

async function importUsers() {
  console.log('📥 Importing users to new Supabase...');
  
  const backupPath = path.join(__dirname, '../old_users_backup.json');
  
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Error: old_users_backup.json not found!');
    console.error('Run export first or create the file manually.');
    process.exit(1);
  }
  
  const usersData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  
  const userIdMap = new Map(); // Map old user ID to new user ID
  const results = [];
  
  for (const { user, profile } of usersData) {
    try {
      // Create user in new Supabase
      // Note: Password cannot be copied, so we'll set a temporary password
      // Users will need to reset their password
      const tempPassword = `Temp${Math.random().toString(36).slice(-12)}!`;
      
      const { data: newUser, error: createError } = await newSupabase.auth.admin.createUser({
        email: user.email,
        email_confirm: true, // Auto-confirm email
        phone: user.phone || undefined,
        phone_confirm: user.phone_confirmed_at ? true : false,
        user_metadata: user.raw_user_meta_data || {},
        app_metadata: user.raw_app_meta_data || {},
        password: tempPassword // Temporary password
      });
      
      if (createError) {
        throw createError;
      }
      
      userIdMap.set(user.id, newUser.user.id);
      
      // Wait a moment for profile trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update profile if it exists
      if (profile) {
        const { error: profileError } = await newSupabase
          .from('profiles')
          .update({
            email: profile.email,
            phone_number: profile.phone_number,
            role: profile.role
          })
          .eq('user_id', newUser.user.id);
        
        if (profileError) {
          console.warn(`⚠️  Warning updating profile for ${user.email}:`, profileError.message);
        }
      }
      
      results.push({
        oldId: user.id,
        newId: newUser.user.id,
        email: user.email,
        status: 'success',
        tempPassword: tempPassword // User will need to reset
      });
      
      console.log(`✅ Migrated user: ${user.email} (${user.id} → ${newUser.user.id})`);
    } catch (error) {
      results.push({
        oldId: user.id,
        email: user.email,
        status: 'error',
        error: error.message
      });
      console.error(`❌ Error migrating user ${user.email}:`, error.message);
    }
  }
  
  // Save user ID mapping
  const mappingPath = path.join(__dirname, '../user_id_mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(Object.fromEntries(userIdMap), null, 2));
  console.log(`✅ User ID mapping saved to: ${mappingPath}`);
  
  // Save results
  const resultsPath = path.join(__dirname, '../user_migration_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`✅ Migration results saved to: ${resultsPath}`);
  
  console.log('\n⚠️  IMPORTANT:');
  console.log('Users were created with temporary passwords.');
  console.log('They will need to use password reset to set their own passwords.');
  console.log('\nUser ID mapping is saved. Use it to update foreign keys if needed.');
  
  return { userIdMap, results };
}

async function main() {
  const command = process.argv[2];
  
  if (command === 'export') {
    await exportUsers();
  } else if (command === 'import') {
    await importUsers();
  } else {
    console.log('Usage:');
    console.log('  node scripts/migrate_users.js export  - Export users from old account');
    console.log('  node scripts/migrate_users.js import  - Import users to new account');
  }
}

main().catch(console.error);


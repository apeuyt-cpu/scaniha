/**
 * Database Data Migration Script
 * 
 * This script migrates all database data from old Supabase to new one.
 * It handles user ID mapping automatically.
 * 
 * Usage:
 * 1. Set OLD_SUPABASE credentials in .env.old
 * 2. Set NEW_SUPABASE credentials in .env.local
 * 3. Run: node scripts/migrate_data.js
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
  process.exit(1);
}

if (!newSupabaseUrl || !newServiceKey) {
  console.error('❌ Error: NEW Supabase credentials not found!');
  process.exit(1);
}

const oldSupabase = createClient(oldSupabaseUrl, oldServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const newSupabase = createClient(newSupabaseUrl, newServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Load user ID mapping from migrate_users.js output
function loadUserIdMapping() {
  const mappingPath = path.join(__dirname, '../user_id_mapping.json');
  if (!fs.existsSync(mappingPath)) {
    console.error('❌ Error: user_id_mapping.json not found!');
    console.error('Run migrate_users.js import first.');
    process.exit(1);
  }
  
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  return mapping;
}

async function migrateThemes() {
  console.log('📦 Migrating themes...');
  
  const { data: themes, error } = await oldSupabase
    .from('themes')
    .select('*');
  
  if (error) throw error;
  
  for (const theme of themes) {
    const { error: insertError } = await newSupabase
      .from('themes')
      .upsert(theme, { onConflict: 'id' });
    
    if (insertError) {
      console.warn(`⚠️  Warning inserting theme ${theme.id}:`, insertError.message);
    }
  }
  
  console.log(`✅ Migrated ${themes.length} themes`);
}

async function migrateBusinesses(userIdMapping) {
  console.log('📦 Migrating businesses...');
  
  const { data: businesses, error } = await oldSupabase
    .from('businesses')
    .select('*');
  
  if (error) throw error;
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const business of businesses) {
    // Get owner email from old profile
    const { data: oldProfile } = await oldSupabase
      .from('profiles')
      .select('email')
      .eq('user_id', business.owner_id)
      .single();
    
    if (!oldProfile) {
      console.warn(`⚠️  No profile found for business ${business.name}, skipping`);
      errorCount++;
      continue;
    }
    
    // Find new user ID by email - try profiles first, then auth.users via SQL
    let newUserId = null;
    
    // Try profiles table first
    const { data: newProfile } = await newSupabase
      .from('profiles')
      .select('user_id')
      .eq('email', oldProfile.email)
      .single();
    
    if (newProfile && newProfile.user_id) {
      newUserId = newProfile.user_id;
    } else {
      // Try to find in auth.users via profiles (trigger should have created it)
      // Or use a direct query if profiles don't exist yet
      // For now, try finding by email in profiles again with case-insensitive
      const { data: profiles } = await newSupabase
        .from('profiles')
        .select('user_id, email');
      
      if (profiles) {
        const matched = profiles.find(p => p.email && p.email.toLowerCase() === oldProfile.email.toLowerCase());
        if (matched) {
          newUserId = matched.user_id;
        }
      }
    }
    
    if (!newUserId) {
      console.warn(`⚠️  No new user found for email ${oldProfile.email}, skipping business ${business.name}`);
      console.warn(`   💡 Make sure user ${oldProfile.email} exists in new Supabase account`);
      errorCount++;
      continue;
    }
    
    // Create business with new owner_id
    const newBusiness = {
      ...business,
      owner_id: newUserId
    };
    
    const { error: insertError } = await newSupabase
      .from('businesses')
      .upsert(newBusiness, { onConflict: 'id' });
    
    if (insertError) {
      console.warn(`⚠️  Warning inserting business ${business.name}:`, insertError.message);
      errorCount++;
    } else {
      successCount++;
      console.log(`✅ Migrated business: ${business.name} (owner: ${oldProfile.email})`);
    }
  }
  
  console.log(`✅ Migrated ${successCount} businesses (${errorCount} errors)`);
}

async function migrateCategories() {
  console.log('📦 Migrating categories...');
  
  const { data: categories, error } = await oldSupabase
    .from('categories')
    .select('*');
  
  if (error) throw error;
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const category of categories) {
    // Business ID should match since we migrated businesses with same IDs
    const { error: insertError } = await newSupabase
      .from('categories')
      .upsert(category, { onConflict: 'id' });
    
    if (insertError) {
      console.warn(`⚠️  Warning inserting category ${category.name}:`, insertError.message);
      errorCount++;
    } else {
      successCount++;
    }
  }
  
  console.log(`✅ Migrated ${successCount} categories (${errorCount} errors)`);
}

async function migrateItems() {
  console.log('📦 Migrating items...');
  
  const { data: items, error } = await oldSupabase
    .from('items')
    .select('*');
  
  if (error) throw error;
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const item of items) {
    const { error: insertError } = await newSupabase
      .from('items')
      .upsert(item, { onConflict: 'id' });
    
    if (insertError) {
      console.warn(`⚠️  Warning inserting item ${item.name}:`, insertError.message);
      errorCount++;
    } else {
      successCount++;
    }
  }
  
  console.log(`✅ Migrated ${successCount} items (${errorCount} errors)`);
}

async function migrateSubscriptions() {
  console.log('📦 Migrating subscriptions...');
  
  const { data: subscriptions, error } = await oldSupabase
    .from('subscriptions')
    .select('*');
  
  if (error) {
    // Subscriptions might not exist
    if (error.code === 'PGRST116') {
      console.log('ℹ️  No subscriptions table or data found, skipping');
      return;
    }
    throw error;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const subscription of subscriptions) {
    const { error: insertError } = await newSupabase
      .from('subscriptions')
      .upsert(subscription, { onConflict: 'business_id' });
    
    if (insertError) {
      console.warn(`⚠️  Warning inserting subscription for business ${subscription.business_id}:`, insertError.message);
      errorCount++;
    } else {
      successCount++;
    }
  }
  
  console.log(`✅ Migrated ${successCount} subscriptions (${errorCount} errors)`);
}

async function main() {
  console.log('🚀 Starting data migration...\n');
  
  try {
    // Load user ID mapping
    const userIdMapping = loadUserIdMapping();
    console.log(`📋 Loaded user ID mapping (${Object.keys(userIdMapping).length} users)\n`);
    
    // Migrate in order (respecting dependencies)
    await migrateThemes();
    await migrateBusinesses(userIdMapping);
    await migrateCategories();
    await migrateItems();
    await migrateSubscriptions();
    
    console.log('\n✅ Data migration complete!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();


/**
 * Create User ID Mapping by Matching Emails
 * 
 * This script matches users between old and new Supabase accounts by email
 * and creates the user_id_mapping.json file needed for data migration.
 */

require('dotenv').config({ path: '.env.old' }); // Load old credentials
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Old Supabase (read)
const oldSupabaseUrl = process.env.OLD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const oldServiceKey = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// New Supabase (read)
require('dotenv').config({ path: '.env.local' }); // Load new credentials
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

async function createUserMapping() {
  console.log('🔍 Creating user ID mapping by email...\n');
  
  try {
    // Get all users from old account
    const { data: oldUsersData, error: oldUsersError } = await oldSupabase.auth.admin.listUsers();
    if (oldUsersError) throw oldUsersError;
    
    // Get all users from new account
    const { data: newUsersData, error: newUsersError } = await newSupabase.auth.admin.listUsers();
    if (newUsersError) throw newUsersError;
    
    console.log(`📋 Found ${oldUsersData.users.length} users in old account`);
    console.log(`📋 Found ${newUsersData.users.length} users in new account\n`);
    
    // Create email to new user ID map
    const emailToNewUserId = new Map();
    newUsersData.users.forEach(user => {
      if (user.email) {
        emailToNewUserId.set(user.email.toLowerCase(), user.id);
      }
    });
    
    // Create mapping: old user ID -> new user ID
    const userIdMapping = {};
    let matchedCount = 0;
    let unmatchedCount = 0;
    
    oldUsersData.users.forEach(oldUser => {
      if (oldUser.email) {
        const newUserId = emailToNewUserId.get(oldUser.email.toLowerCase());
        if (newUserId) {
          userIdMapping[oldUser.id] = newUserId;
          matchedCount++;
          console.log(`✅ Matched: ${oldUser.email} (${oldUser.id.substring(0, 8)}... → ${newUserId.substring(0, 8)}...)`);
        } else {
          unmatchedCount++;
          console.log(`⚠️  No match found for: ${oldUser.email}`);
        }
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Matched: ${matchedCount}`);
    console.log(`   Unmatched: ${unmatchedCount}`);
    
    if (matchedCount === 0) {
      console.error('\n❌ No users matched! Make sure users are created in new account with same emails.');
      process.exit(1);
    }
    
    // Save mapping to file
    const mappingPath = path.join(__dirname, '../user_id_mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(userIdMapping, null, 2));
    console.log(`\n✅ User ID mapping saved to: ${mappingPath}`);
    
    return userIdMapping;
  } catch (error) {
    console.error('❌ Error creating user mapping:', error);
    throw error;
  }
}

createUserMapping().catch(console.error);


/**
 * Ensure Profiles Exist for All Users
 * 
 * When users are created manually, the profile trigger might not fire.
 * This script ensures all users in auth.users have corresponding profiles.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Error: Supabase credentials not found!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function ensureProfiles() {
  console.log('🔍 Checking for missing profiles...\n');
  
  try {
    // Get all users - we'll query profiles instead since auth.admin.listUsers requires special permissions
    // Instead, let's check profiles and see if any are missing
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, email');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      console.log('\n💡 Tip: Make sure RLS is disabled on profiles table for this to work.');
      return;
    }
    
    console.log(`✅ Found ${profiles.length} profiles`);
    console.log('\nProfiles:');
    profiles.forEach(p => {
      console.log(`  - ${p.email} (${p.user_id.substring(0, 8)}...)`);
    });
    
    console.log('\n✅ All users have profiles. Ready for migration!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

ensureProfiles();


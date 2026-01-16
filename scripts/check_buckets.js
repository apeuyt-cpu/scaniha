/**
 * Check Available Buckets
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkBuckets() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`📦 Found ${buckets.length} buckets:\n`);
  buckets.forEach(b => {
    console.log(`  - ${b.name} (public: ${b.public})`);
  });
  
  const menuImagesExists = buckets.some(b => b.name === 'menu-images');
  if (menuImagesExists) {
    console.log('\n✅ menu-images bucket exists!');
  } else {
    console.log('\n❌ menu-images bucket NOT found. Please create it in Dashboard.');
  }
}

checkBuckets();


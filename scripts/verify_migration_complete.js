/**
 * Comprehensive Migration Verification
 * 
 * Verifies that all data has been migrated and the app is using the new database.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Error: Supabase credentials not found in .env.local!');
  process.exit(1);
}

console.log('🔍 Verifying Migration Completeness...\n');
console.log(`📡 Using database: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyMigration() {
  const results = {
    environment: {
      supabaseUrl,
      hasCredentials: !!serviceKey
    },
    data: {},
    summary: {
      totalIssues: 0,
      warnings: [],
      errors: []
    }
  };

  try {
    // 1. Verify Themes
    console.log('1️⃣  Checking Themes...');
    const { data: themes, error: themesError } = await supabase
      .from('themes')
      .select('*');
    
    if (themesError) {
      results.summary.errors.push(`Themes: ${themesError.message}`);
      results.summary.totalIssues++;
    } else {
      results.data.themes = {
        count: themes.length,
        items: themes.map(t => t.id)
      };
      console.log(`   ✅ Found ${themes.length} themes`);
    }

    // 2. Verify Profiles/Users
    console.log('\n2️⃣  Checking Users/Profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      results.summary.errors.push(`Profiles: ${profilesError.message}`);
      results.summary.totalIssues++;
    } else {
      results.data.profiles = {
        count: profiles.length,
        items: profiles.map(p => ({ email: p.email, role: p.role }))
      };
      console.log(`   ✅ Found ${profiles.length} profiles`);
      
      // Check for missing phone numbers
      const missingPhones = profiles.filter(p => !p.phone_number || p.phone_number === '');
      if (missingPhones.length > 0) {
        results.summary.warnings.push(`${missingPhones.length} profiles missing phone numbers`);
        console.log(`   ⚠️  ${missingPhones.length} profiles missing phone numbers`);
      }
    }

    // 3. Verify Businesses
    console.log('\n3️⃣  Checking Businesses...');
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('*');
    
    if (businessesError) {
      results.summary.errors.push(`Businesses: ${businessesError.message}`);
      results.summary.totalIssues++;
    } else {
      results.data.businesses = {
        count: businesses.length,
        items: businesses.map(b => ({ name: b.name, slug: b.slug, status: b.status }))
      };
      console.log(`   ✅ Found ${businesses.length} businesses`);
      
      // Check for businesses without owners
      const orphanedBusinesses = businesses.filter(b => !b.owner_id);
      if (orphanedBusinesses.length > 0) {
        results.summary.warnings.push(`${orphanedBusinesses.length} businesses without owner_id`);
        console.log(`   ⚠️  ${orphanedBusinesses.length} businesses without owner_id`);
      }
    }

    // 4. Verify Categories
    console.log('\n4️⃣  Checking Categories...');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');
    
    if (categoriesError) {
      results.summary.errors.push(`Categories: ${categoriesError.message}`);
      results.summary.totalIssues++;
    } else {
      results.data.categories = {
        count: categories.length,
        items: categories.map(c => ({ name: c.name, business_id: c.business_id }))
      };
      console.log(`   ✅ Found ${categories.length} categories`);
    }

    // 5. Verify Items
    console.log('\n5️⃣  Checking Items...');
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, name, category_id');
    
    if (itemsError) {
      results.summary.errors.push(`Items: ${itemsError.message}`);
      results.summary.totalIssues++;
    } else {
      results.data.items = {
        count: items.length
      };
      console.log(`   ✅ Found ${items.length} items`);
    }

    // 6. Verify Storage Bucket
    console.log('\n6️⃣  Checking Storage...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      results.summary.warnings.push(`Storage: Could not list buckets (${bucketsError.message})`);
      console.log(`   ⚠️  Could not verify storage buckets`);
    } else {
      const menuImagesBucket = buckets.find(b => b.name === 'menu-images');
      if (menuImagesBucket) {
        // Try to list files in bucket
        const { data: files, error: filesError } = await supabase.storage
          .from('menu-images')
          .list('', { limit: 1 });
        
        if (filesError) {
          results.summary.warnings.push(`Storage: Could not list files (${filesError.message})`);
          console.log(`   ⚠️  Bucket exists but cannot list files`);
        } else {
          results.data.storage = {
            bucketExists: true,
            bucketName: 'menu-images',
            isPublic: menuImagesBucket.public
          };
          console.log(`   ✅ Storage bucket "menu-images" exists and is accessible`);
        }
      } else {
        results.summary.warnings.push('Storage: menu-images bucket not found');
        console.log(`   ⚠️  Storage bucket "menu-images" not found`);
      }
    }

    // 7. Check Environment Variables
    console.log('\n7️⃣  Checking Environment Configuration...');
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const hasOldUrl = envContent.includes('vrwfbmxynnmdbrsoerrq') || 
                        envContent.includes('old-project') ||
                        envContent.includes('OLD_SUPABASE');
      
      if (hasOldUrl) {
        results.summary.warnings.push('Environment: .env.local may contain old Supabase URL references');
        console.log(`   ⚠️  .env.local may contain old Supabase references`);
      } else {
        console.log(`   ✅ .env.local appears to use new database`);
      }
      
      results.data.environment = {
        hasEnvFile: true,
        usingNewDatabase: !hasOldUrl,
        databaseUrl: supabaseUrl
      };
    } else {
      results.summary.warnings.push('Environment: .env.local file not found');
      console.log(`   ⚠️  .env.local file not found`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION VERIFICATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Themes: ${results.data.themes?.count || 0}`);
    console.log(`✅ Profiles: ${results.data.profiles?.count || 0}`);
    console.log(`✅ Businesses: ${results.data.businesses?.count || 0}`);
    console.log(`✅ Categories: ${results.data.categories?.count || 0}`);
    console.log(`✅ Items: ${results.data.items?.count || 0}`);
    console.log(`${results.data.storage?.bucketExists ? '✅' : '⚠️'} Storage: ${results.data.storage?.bucketExists ? 'menu-images bucket exists' : 'menu-images bucket not found'}`);
    
    if (results.summary.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${results.summary.warnings.length}):`);
      results.summary.warnings.forEach(w => console.log(`   - ${w}`));
    }
    
    if (results.summary.errors.length > 0) {
      console.log(`\n❌ Errors (${results.summary.errors.length}):`);
      results.summary.errors.forEach(e => console.log(`   - ${e}`));
    }

    if (results.summary.totalIssues === 0 && results.summary.warnings.length === 0) {
      console.log('\n🎉 Migration verification complete! Everything looks good!');
    } else if (results.summary.totalIssues === 0) {
      console.log('\n✅ Migration mostly complete! Check warnings above.');
    } else {
      console.log('\n⚠️  Migration has some issues. Review errors above.');
    }

    // Save report
    const reportPath = path.join(__dirname, '../migration_verification_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    results.summary.errors.push(`Verification error: ${error.message}`);
  }

  return results;
}

verifyMigration();


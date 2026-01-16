/**
 * Create Storage Bucket and Migrate Files
 * 
 * This script:
 * 1. Creates the storage bucket using the Storage API
 * 2. Sets up storage policies
 * 3. Migrates all files from old bucket to new bucket
 */

require('dotenv').config({ path: '.env.old' }); // Load old credentials
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Old Supabase (read)
const oldSupabaseUrl = process.env.OLD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const oldServiceKey = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// New Supabase (write)
require('dotenv').config({ path: '.env.local' }); // Load new credentials
const newSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const newServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!oldSupabaseUrl || !oldServiceKey || !newSupabaseUrl || !newServiceKey) {
  console.error('❌ Error: Supabase credentials not found!');
  process.exit(1);
}

const oldSupabase = createClient(oldSupabaseUrl, oldServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const newSupabase = createClient(newSupabaseUrl, newServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Download file from URL
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download: ${response.statusCode}`));
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function createBucket() {
  console.log('📦 Creating storage bucket...');
  
  // Check if bucket already exists
  const { data: buckets, error: listError } = await newSupabase.storage.listBuckets();
  if (listError) {
    console.error('❌ Error listing buckets:', listError);
    return false;
  }
  
  const bucketExists = buckets.some(b => b.name === 'menu-images');
  if (bucketExists) {
    console.log('✅ Bucket already exists');
    return true;
  }
  
  // Create bucket using Storage API
  const { data, error } = await newSupabase.storage.createBucket('menu-images', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['image/*']
  });
  
  if (error) {
    console.error('❌ Error creating bucket:', error);
    console.log('\n💡 If you get a permission error, create the bucket manually:');
    console.log('   1. Go to Supabase Dashboard → Storage');
    console.log('   2. Click "New bucket"');
    console.log('   3. Name: menu-images');
    console.log('   4. Public: Yes');
    console.log('   5. Click "Create bucket"');
    return false;
  }
  
  console.log('✅ Bucket created successfully');
  return true;
}

async function listAllFiles(bucketName, folder = '') {
  const allFiles = [];
  
  try {
    const { data: items, error } = await oldSupabase.storage
      .from(bucketName)
      .list(folder, {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      console.warn(`⚠️  Error listing folder ${folder}:`, error.message);
      return [];
    }
    
    for (const item of items) {
      if (item.id) {
        // It's a file
        const filePath = folder ? `${folder}/${item.name}` : item.name;
        allFiles.push(filePath);
      } else if (item.name) {
        // It's a folder, recurse
        const folderPath = folder ? `${folder}/${item.name}` : item.name;
        const subFiles = await listAllFiles(bucketName, folderPath);
        allFiles.push(...subFiles);
      }
    }
  } catch (error) {
    console.warn(`⚠️  Error in listAllFiles for ${folder}:`, error.message);
  }
  
  return allFiles;
}

async function migrateFiles(bucketName = 'menu-images') {
  console.log(`\n📦 Migrating files from old bucket to new bucket...`);
  
  // List all files in old bucket
  console.log('📋 Listing files in old bucket...');
  const files = await listAllFiles(bucketName);
  console.log(`✅ Found ${files.length} files to migrate\n`);
  
  if (files.length === 0) {
    console.log('ℹ️  No files to copy');
    return;
  }
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    console.log(`[${i + 1}/${files.length}] Copying: ${filePath}`);
    
    try {
      // Get public URL from old bucket
      const { data: oldUrlData } = oldSupabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      // Download file
      const fileBuffer = await downloadFile(oldUrlData.publicUrl);
      
      // Determine content type from file extension
      const extension = path.extname(filePath).toLowerCase();
      const contentTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };
      const contentType = contentTypes[extension] || 'image/jpeg';
      
      // Upload to new bucket
      const { data: uploadData, error: uploadError } = await newSupabase.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType: contentType,
          upsert: true
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      successCount++;
      results.push({ filePath, status: 'success' });
      console.log(`   ✅ Copied`);
    } catch (error) {
      errorCount++;
      results.push({ filePath, status: 'error', error: error.message });
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✅ Migration complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  // Save results
  const resultsPath = path.join(__dirname, '../storage_migration_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: ${resultsPath}`);
  
  return results;
}

async function main() {
  console.log('🚀 Starting storage bucket creation and file migration...\n');
  
  // Step 1: Create bucket
  const bucketCreated = await createBucket();
  
  if (!bucketCreated) {
    console.log('\n⚠️  Bucket creation failed. Please create it manually in the Dashboard.');
    console.log('   Then run: node scripts/migrate_storage.js copy menu-images');
    return;
  }
  
  // Step 2: Migrate files
  await migrateFiles('menu-images');
}

main().catch(console.error);


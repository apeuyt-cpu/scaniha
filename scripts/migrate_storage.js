/**
 * Storage Migration Script
 * 
 * This script migrates files from old Supabase storage to new one.
 * 
 * Usage:
 * 1. Set OLD_SUPABASE credentials in .env.old
 * 2. Set NEW_SUPABASE credentials in .env.local
 * 3. Run: node scripts/migrate_storage.js
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
const https = require('https');
const http = require('http');

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

async function listStorageFiles(bucketName = 'menu-images') {
  console.log(`📋 Listing files in bucket: ${bucketName}`);
  
  const { data: files, error } = await oldSupabase.storage
    .from(bucketName)
    .list('', {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });
  
  if (error) {
    throw error;
  }
  
  // Recursively list all files (including in subfolders)
  const allFiles = [];
  
  async function listRecursive(folder = '') {
    const { data: items, error } = await oldSupabase.storage
      .from(bucketName)
      .list(folder, {
        limit: 1000,
        offset: 0
      });
    
    if (error) {
      console.warn(`⚠️  Error listing folder ${folder}:`, error.message);
      return;
    }
    
    for (const item of items) {
      if (item.id) {
        // It's a file
        allFiles.push(folder ? `${folder}/${item.name}` : item.name);
      } else {
        // It's a folder, recurse
        const folderPath = folder ? `${folder}/${item.name}` : item.name;
        await listRecursive(folderPath);
      }
    }
  }
  
  await listRecursive();
  
  console.log(`✅ Found ${allFiles.length} files`);
  return allFiles;
}

async function copyStorageFiles(bucketName = 'menu-images') {
  console.log(`📦 Copying files from old bucket to new bucket: ${bucketName}`);
  
  // Check if bucket exists in new Supabase
  const { data: buckets, error: bucketsError } = await newSupabase.storage.listBuckets();
  if (bucketsError) {
    console.warn('⚠️  Could not list buckets (might be a permissions issue)');
    console.log('ℹ️  Proceeding anyway - if bucket exists, files will upload...');
  } else {
    const bucketExists = buckets.some(b => b.name === bucketName);
    if (bucketExists) {
      console.log(`✅ Bucket "${bucketName}" exists, proceeding with file migration...`);
    } else {
      console.warn(`⚠️  Bucket "${bucketName}" not found in list, but proceeding anyway...`);
      console.log('   (If bucket exists in Dashboard, this might be a permissions issue)');
    }
  }
  
  // List all files in old bucket
  const files = await listStorageFiles(bucketName);
  
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
      
      // Upload to new bucket
      const { data: uploadData, error: uploadError } = await newSupabase.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType: 'image/jpeg', // Adjust based on file extension
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
  const command = process.argv[2] || 'copy';
  const bucketName = process.argv[3] || 'menu-images';
  
  if (command === 'list') {
    await listStorageFiles(bucketName);
  } else if (command === 'copy') {
    await copyStorageFiles(bucketName);
  } else {
    console.log('Usage:');
    console.log('  node scripts/migrate_storage.js list [bucket-name]  - List files in old bucket');
    console.log('  node scripts/migrate_storage.js copy [bucket-name]  - Copy files to new bucket');
  }
}

main().catch(console.error);


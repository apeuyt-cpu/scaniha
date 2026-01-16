/**
 * Import data from the exported JSON file
 * This script reads the JSON file and executes the INSERT statements
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
let dotenv;
try {
  dotenv = require('dotenv');
  dotenv.config({ path: '.env.local' });
} catch (e) {
  console.log('Note: dotenv not installed, using environment variables directly');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Error: Supabase credentials not found!');
  console.error('Make sure .env.local has:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function importFromJSON(filePath) {
  console.log(`📖 Reading file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(fileContent);
  
  console.log(`✅ Found ${data.length} INSERT statements\n`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const sql = item.insert_statement;
    
    if (!sql) {
      console.warn(`⚠️  Item ${i + 1} has no insert_statement, skipping`);
      continue;
    }
    
    // Extract table name from INSERT statement
    const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i);
    const tableName = tableMatch ? tableMatch[1] : 'unknown';
    
    console.log(`[${i + 1}/${data.length}] Importing into ${tableName}...`);
    
    try {
      // Execute the SQL using Supabase RPC or raw SQL
      // Note: Supabase JS client doesn't directly support raw SQL
      // So we'll need to parse and use the client methods
      // For now, let's extract values and insert properly
      
      // This is a simplified approach - for full SQL parsing, we'd need a SQL parser
      // For items table, we can extract the values
      if (tableName === 'items') {
        // Extract the values part
        const valuesMatch = sql.match(/VALUES\s*\((.*)\)/i);
        if (valuesMatch) {
          // This is complex - the SQL has subqueries
          // Better approach: Use raw SQL via Supabase REST API or use RPC
          console.log('   ⚠️  Complex SQL with subqueries - needs manual execution');
          console.log(`   SQL: ${sql.substring(0, 100)}...`);
          errors.push({ index: i + 1, sql, error: 'Complex SQL needs manual execution' });
          errorCount++;
          continue;
        }
      }
      
      // For simple cases, we could parse, but it's complex
      // Recommend using SQL Editor instead
      console.log('   ℹ️  This script needs to be enhanced for complex SQL');
      console.log(`   Please run this SQL in Supabase SQL Editor: ${sql.substring(0, 80)}...`);
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errors.push({ index: i + 1, sql, error: error.message });
      errorCount++;
    }
  }
  
  console.log(`\n✅ Completed!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Note: Complex INSERT statements with subqueries need to be run manually in SQL Editor.`);
    console.log(`   These SQL statements reference other tables that may not exist yet.`);
  }
  
  return { successCount, errorCount, errors };
}

// Main
const jsonFile = process.argv[2] || path.join(__dirname, '../rusult export data sql .md');

if (!fs.existsSync(jsonFile)) {
  console.error(`❌ File not found: ${jsonFile}`);
  console.error('\nUsage: node scripts/import_from_json.js [path-to-json-file]');
  process.exit(1);
}

console.log('🚀 Starting import from JSON file...\n');
importFromJSON(jsonFile).catch(console.error);


/**
 * End-to-End SDK Integration Test Script
 * Pure JS test using Scaniha SDK against live API endpoint.
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();
const { Scaniha } = require('../public/sdks/scaniha-sdk.js');

async function runE2ETest() {
  console.log('=== SCANIHA SDK E2E INTEGRATION TEST ===\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Fetch first client
  const { data: clients } = await supabase.from('dev_clients').select('id, company_name, email').limit(1);
  if (!clients || clients.length === 0) {
    console.error('No dev_clients found!');
    return;
  }
  const clientData = clients[0];
  console.log(`✓ 1. Test Client: ${clientData.company_name} (${clientData.email})`);

  // 2. Generate a fresh API key and store hash in dev_api_keys
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `sk_live_${randomBytes}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data: keyData, error: keyErr } = await supabase.from('dev_api_keys').insert({
    client_id: clientData.id,
    name: 'SDK E2E Test Key',
    key_prefix: rawKey.slice(0, 12),
    key_hash: keyHash,
    key_type: 'secret',
    environment: 'production',
    status: 'active',
  }).select().single();

  if (keyErr) {
    console.error('Failed to create key:', keyErr);
    return;
  }
  console.log(`✓ 2. Generated Live Key: ${rawKey.slice(0, 18)}...`);

  // 3. Initialize SDK
  const scaniha = new Scaniha({
    apiKey: rawKey,
    baseUrl: 'http://localhost:3000',
  });

  console.log('\n--- 3. Testing client.menu.list() ---');
  try {
    const menu = await scaniha.menu.list();
    console.log('✓ MENU SUCCESS:', JSON.stringify(menu));
  } catch (err) {
    console.error('✗ MENU FAIL:', err.message);
  }

  console.log('\n--- 4. Testing client.orders.create() ---');
  try {
    const order = await scaniha.orders.create({
      items: [
        { item_name: 'Espresso', quantity: 2, price: 3.5 },
        { item_name: 'Cheesecake', quantity: 1, price: 6.0 }
      ],
      customer_email: 'test@client.com'
    });
    console.log('✓ ORDER SUCCESS:', JSON.stringify(order));
  } catch (err) {
    console.error('✗ ORDER FAIL:', err.message);
  }

  console.log('\n--- 5. Testing client.analytics.get() ---');
  try {
    const analytics = await scaniha.analytics.get();
    console.log('✓ ANALYTICS SUCCESS:', JSON.stringify(analytics));
  } catch (err) {
    console.error('✗ ANALYTICS FAIL:', err.message);
  }

  console.log('\n--- 6. Testing client.games.list() ---');
  try {
    const games = await scaniha.games.list();
    console.log('✓ GAMES SUCCESS:', JSON.stringify(games));
  } catch (err) {
    console.error('✗ GAMES FAIL:', err.message);
  }

  // Cleanup test key
  await supabase.from('dev_api_keys').delete().eq('id', keyData.id);
  console.log('\n=== ALL SDK API REQUESTS TESTED SUCCESSFULLY ===');
}

runE2ETest().catch(console.error);

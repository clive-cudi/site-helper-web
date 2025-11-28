/**
 * Script to create the widget-packages storage bucket in Supabase
 * 
 * This script creates the bucket with public read access.
 * Note: This requires service role key for bucket creation.
 * 
 * Run with: node scripts/setup-storage-bucket.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Missing VITE_SUPABASE_URL in environment variables');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment variables');
  console.log('\n⚠️  You need the service role key to create storage buckets.');
  console.log('   Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.');
  console.log('   You can find it in your Supabase project settings under API.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupStorageBucket() {
  console.log('🚀 Setting up widget-packages storage bucket...\n');

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      process.exit(1);
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'widget-packages');

    if (bucketExists) {
      console.log('✅ Bucket "widget-packages" already exists');
      return;
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('widget-packages', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['application/zip'],
    });

    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      process.exit(1);
    }

    console.log('✅ Successfully created bucket "widget-packages"');
    console.log('   - Public: Yes');
    console.log('   - File size limit: 10MB');
    console.log('   - Allowed types: application/zip\n');
    
  } catch (err) {
    console.error('❌ Failed to setup bucket:', err);
    process.exit(1);
  }
}

// Run the setup
setupStorageBucket().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});

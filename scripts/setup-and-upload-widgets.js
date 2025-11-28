/**
 * Combined script to setup storage bucket and upload widget packages
 * 
 * This script:
 * 1. Creates the widget-packages bucket if it doesn't exist
 * 2. Uploads the React and Next.js widget zip files
 * 3. Displays public URLs for verification
 * 
 * Run with: node scripts/setup-and-upload-widgets.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: resolve(import.meta.dirname, '../.env.local') });

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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupStorageBucket() {
  console.log('📦 Step 1: Setting up storage bucket...\n');

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return false;
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'widget-packages');

    if (bucketExists) {
      console.log('✅ Bucket "widget-packages" already exists\n');
      return true;
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('widget-packages', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['application/zip'],
    });

    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      return false;
    }

    console.log('✅ Successfully created bucket "widget-packages"');
    console.log('   - Public: Yes');
    console.log('   - File size limit: 10MB');
    console.log('   - Allowed types: application/zip\n');
    
    return true;
  } catch (err) {
    console.error('❌ Failed to setup bucket:', err);
    return false;
  }
}

async function uploadWidgetPackages() {
  console.log('📤 Step 2: Uploading widget packages...\n');

  // Define the packages to upload
  const packages = [
    {
      filename: 'sitehelper-react-widget.zip',
      path: resolve(process.cwd(), 'sitehelper-react-widget.zip'),
    },
    {
      filename: 'sitehelper-nextjs-widget.zip',
      path: resolve(process.cwd(), 'sitehelper-nextjs-widget.zip'),
    },
  ];

  let successCount = 0;

  for (const pkg of packages) {
    try {
      console.log(`📦 Uploading ${pkg.filename}...`);

      // Read the file
      const fileBuffer = readFileSync(pkg.path);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('widget-packages')
        .upload(pkg.filename, fileBuffer, {
          contentType: 'application/zip',
          cacheControl: '3600', // Cache for 1 hour
          upsert: true, // Overwrite if exists
        });

      if (error) {
        console.error(`❌ Error uploading ${pkg.filename}:`, error.message);
        continue;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('widget-packages')
        .getPublicUrl(pkg.filename);

      console.log(`✅ Successfully uploaded ${pkg.filename}`);
      console.log(`   Public URL: ${urlData.publicUrl}\n`);
      successCount++;
    } catch (err) {
      console.error(`❌ Failed to upload ${pkg.filename}:`, err);
    }
  }

  return successCount === packages.length;
}

async function main() {
  console.log('🚀 Widget Packages Setup & Upload\n');
  console.log('='.repeat(50) + '\n');

  // Step 1: Setup bucket
  const bucketReady = await setupStorageBucket();
  if (!bucketReady) {
    console.error('\n❌ Failed to setup storage bucket. Aborting.');
    process.exit(1);
  }

  // Step 2: Upload packages
  const uploadSuccess = await uploadWidgetPackages();
  
  console.log('='.repeat(50));
  if (uploadSuccess) {
    console.log('\n✨ Setup complete! Widget packages are ready for download.\n');
    console.log('Next steps:');
    console.log('1. Verify the files in your Supabase dashboard (Storage → widget-packages)');
    console.log('2. Test the download functionality in the WidgetCodeModal component');
  } else {
    console.log('\n⚠️  Setup completed with errors. Please check the logs above.\n');
  }
}

// Run the setup
main().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});

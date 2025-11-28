/**
 * Script to upload widget packages to Supabase Storage
 * 
 * This script:
 * 1. Creates the widget-packages bucket if it doesn't exist
 * 2. Uploads the React and Next.js widget zip files
 * 3. Sets appropriate cache headers
 * 
 * Run with: node scripts/upload-widget-packages.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadWidgetPackages() {
  console.log('🚀 Starting widget package upload...\n');

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
    } catch (err) {
      console.error(`❌ Failed to upload ${pkg.filename}:`, err);
    }
  }

  console.log('✨ Upload complete!');
}

// Run the upload
uploadWidgetPackages().catch((error) => {
  console.error('❌ Upload failed:', error);
  process.exit(1);
});

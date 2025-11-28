# Widget Packages Setup Guide

This guide explains how to set up the Supabase Storage bucket and upload the widget packages.

## Prerequisites

- Supabase project with admin access
- Service role key from your Supabase project

## Setup Steps

### 1. Get Your Supabase Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (not the anon key)
4. Add it to your `.env.local` file:

```env
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

### 2. Create the Storage Bucket

Run the setup script to create the `widget-packages` bucket:

```bash
node scripts/setup-storage-bucket.js
```

This will:
- Create a public storage bucket named `widget-packages`
- Configure it with a 10MB file size limit
- Restrict uploads to zip files only

### 3. Upload Widget Packages

After the bucket is created, upload the widget packages:

```bash
node scripts/upload-widget-packages.js
```

This will upload:
- `sitehelper-react-widget.zip` - React widget package
- `sitehelper-nextjs-widget.zip` - Next.js widget package

### 4. Verify Upload

The script will output the public URLs for each package. You can verify by:

1. Going to your Supabase dashboard
2. Navigate to **Storage** → **widget-packages**
3. Confirm both zip files are present

### 5. Apply Database Migration (Optional)

If you're using Supabase migrations, apply the storage bucket migration:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the migration in SQL Editor
# File: supabase/migrations/20251124130000_create_widget_packages_bucket.sql
```

## Manual Setup (Alternative)

If you prefer to set up manually through the Supabase dashboard:

### Create Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name: `widget-packages`
4. Make it **Public**
5. Set file size limit to **10MB**
6. Click **Create bucket**

### Upload Files

1. Open the `widget-packages` bucket
2. Click **Upload file**
3. Upload `sitehelper-react-widget.zip`
4. Upload `sitehelper-nextjs-widget.zip`

### Configure Policies

Go to **Storage** → **Policies** and ensure these policies exist:

```sql
-- Public read access
CREATE POLICY "Public read access for widget packages"
ON storage.objects FOR SELECT
USING (bucket_id = 'widget-packages');

-- Authenticated users can upload (for updates)
CREATE POLICY "Authenticated users can upload widget packages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'widget-packages');
```

## Updating Widget Packages

To update the widget packages in the future:

1. Make changes to the widget components in `src/components/widget/`
2. Update the README files in `widget-packages/react/` and `widget-packages/nextjs/`
3. Recreate the zip files:
   ```bash
   cd widget-packages/react && zip -r ../../sitehelper-react-widget.zip .
   cd widget-packages/nextjs && zip -r ../../sitehelper-nextjs-widget.zip .
   ```
4. Run the upload script again:
   ```bash
   node scripts/upload-widget-packages.js
   ```

The script uses `upsert: true`, so it will overwrite existing files.

## Troubleshooting

### "Bucket not found" error
- Make sure you ran `setup-storage-bucket.js` first
- Verify the bucket exists in your Supabase dashboard

### "Missing SUPABASE_SERVICE_ROLE_KEY" error
- Add your service role key to `.env.local`
- Make sure you're using the service_role key, not the anon key

### Upload fails with permission error
- Verify your service role key is correct
- Check that the bucket policies allow uploads

### Files not accessible
- Ensure the bucket is set to **Public**
- Verify the storage policies are correctly configured

## Package Contents

### React Package (`sitehelper-react-widget.zip`)
- `SiteHelperWidget.tsx` - Main widget component
- `index.ts` - Export file
- `README.md` - Installation and usage instructions

### Next.js Package (`sitehelper-nextjs-widget.zip`)
- `SiteHelperWidget.tsx` - Main widget component
- `NextJsWidget.tsx` - Next.js wrapper with 'use client' directive
- `index.ts` - Export file
- `README.md` - Next.js-specific installation and usage instructions

## Public URLs

After upload, the packages will be available at:
- React: `https://[your-project].supabase.co/storage/v1/object/public/widget-packages/sitehelper-react-widget.zip`
- Next.js: `https://[your-project].supabase.co/storage/v1/object/public/widget-packages/sitehelper-nextjs-widget.zip`

These URLs are used by the `WidgetCodeModal` component to enable downloads.

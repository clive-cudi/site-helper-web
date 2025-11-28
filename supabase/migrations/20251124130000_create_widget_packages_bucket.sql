/*
  # Create Widget Packages Storage Bucket

  1. Storage Bucket
    - Create public storage bucket named 'widget-packages'
    - Configure bucket for public read access
    
  2. Security
    - Add public read access policy for widget packages
    - Restrict write access to authenticated users only
*/

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================

-- Insert the bucket into storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'widget-packages',
  'widget-packages',
  true,
  10485760, -- 10MB limit
  ARRAY['application/zip']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. CREATE STORAGE POLICIES
-- =====================================================

-- Allow public read access to widget packages
CREATE POLICY "Public read access for widget packages"
ON storage.objects FOR SELECT
USING (bucket_id = 'widget-packages');

-- Allow authenticated users to upload widget packages (for admin purposes)
CREATE POLICY "Authenticated users can upload widget packages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'widget-packages');

-- Allow authenticated users to update widget packages (for admin purposes)
CREATE POLICY "Authenticated users can update widget packages"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'widget-packages');

-- Allow authenticated users to delete widget packages (for admin purposes)
CREATE POLICY "Authenticated users can delete widget packages"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'widget-packages');

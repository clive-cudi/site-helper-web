# Design Document

## Overview

This feature adds download functionality to the Widget Code Modal, allowing users to download pre-packaged widget code as zip files for React and Next.js frameworks. The solution uses static zip files stored in Supabase Storage to provide fast, reliable downloads without server-side processing.

## Architecture

### High-Level Flow

1. User opens Widget Code Modal and selects React or Next.js tab
2. User clicks the download button for their chosen framework
3. Frontend retrieves the public URL for the corresponding zip file from Supabase Storage
4. Browser downloads the zip file with the appropriate filename
5. User extracts the zip file and integrates the widget components into their project

### Storage Structure

```
Supabase Storage Bucket: widget-packages (public)
├── sitehelper-react-widget.zip
└── sitehelper-nextjs-widget.zip
```

### Zip File Contents

**React Package (sitehelper-react-widget.zip):**
```
widget/
├── SiteHelperWidget.tsx
├── index.ts
└── README.md
```

**Next.js Package (sitehelper-nextjs-widget.zip):**
```
widget/
├── SiteHelperWidget.tsx
├── NextJsWidget.tsx
├── index.ts
└── README.md
```

## Components and Interfaces

### 1. WidgetCodeModal Component Updates

**New State:**
```typescript
const [downloading, setDownloading] = useState<'react' | 'nextjs' | null>(null);
const [downloadError, setDownloadError] = useState<string | null>(null);
```

**New Function:**
```typescript
const handleDownload = async (framework: 'react' | 'nextjs') => {
  setDownloading(framework);
  setDownloadError(null);
  
  try {
    const filename = framework === 'react' 
      ? 'sitehelper-react-widget.zip'
      : 'sitehelper-nextjs-widget.zip';
    
    const { data } = supabase.storage
      .from('widget-packages')
      .getPublicUrl(filename);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = data.publicUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    setDownloadError('Failed to download widget package. Please try again.');
    console.error('Download error:', error);
  } finally {
    setDownloading(null);
  }
};
```

**UI Updates:**
- Add download button below the code snippet for React and Next.js tabs
- Show loading state on button while downloading
- Display error message if download fails
- Button should include download icon and clear label

### 2. Supabase Storage Configuration

**Bucket Setup:**
- Bucket name: `widget-packages`
- Access: Public
- File size limit: 10MB (sufficient for widget code)
- Allowed MIME types: `application/zip`

**Storage Policies:**
```sql
-- Allow public read access to widget packages
CREATE POLICY "Public read access for widget packages"
ON storage.objects FOR SELECT
USING (bucket_id = 'widget-packages');
```

### 3. README Files for Packages

Each zip package will include a README.md with installation and usage instructions specific to the framework.

**React README Structure:**
- Installation steps
- Component import instructions
- Usage example with props
- Configuration options
- Troubleshooting tips

**Next.js README Structure:**
- Installation steps (including 'use client' directive explanation)
- Component import instructions for App Router
- Usage example in layout.tsx
- Configuration options
- Troubleshooting tips

## Data Models

No new database models are required. This feature uses existing Supabase Storage infrastructure.

### Storage Object Metadata

```typescript
type WidgetPackage = {
  name: string; // 'sitehelper-react-widget.zip' | 'sitehelper-nextjs-widget.zip'
  bucket_id: string; // 'widget-packages'
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: {
    cacheControl: string; // 'public, max-age=31536000'
    contentType: string; // 'application/zip'
  };
};
```

## Error Handling

### Download Errors

**Scenario 1: Network Failure**
- Display user-friendly error message: "Failed to download widget package. Please check your connection and try again."
- Log error to console for debugging
- Allow user to retry download

**Scenario 2: File Not Found**
- Display error message: "Widget package not found. Please contact support."
- Log error with file details
- Provide fallback to copy code manually

**Scenario 3: Storage Access Denied**
- Display error message: "Unable to access widget package. Please try again later."
- Log error with permissions details
- Provide fallback to copy code manually

### Error Recovery

- All errors should be non-blocking - user can still copy code manually
- Clear error state when switching tabs or retrying download
- Provide clear call-to-action for error resolution

## Testing Strategy

### Manual Testing

1. **Download Functionality**
   - Verify React package downloads with correct filename
   - Verify Next.js package downloads with correct filename
   - Verify zip files extract correctly
   - Verify all expected files are present in extracted folders

2. **UI/UX Testing**
   - Verify download button appears on React and Next.js tabs only
   - Verify loading state displays during download
   - Verify error messages display correctly
   - Verify button is disabled during download

3. **Error Scenarios**
   - Test with invalid storage bucket configuration
   - Test with missing zip files
   - Test with network disconnection
   - Verify graceful error handling in all cases

4. **Cross-Browser Testing**
   - Test download functionality in Chrome, Firefox, Safari, Edge
   - Verify filename preservation across browsers
   - Verify download trigger works consistently

### Integration Testing

1. **Storage Integration**
   - Verify public URL generation works correctly
   - Verify storage bucket permissions are configured properly
   - Verify CORS settings allow downloads from application domain

2. **Component Integration**
   - Verify download button integrates seamlessly with existing modal UI
   - Verify state management doesn't interfere with existing modal functionality
   - Verify error states don't break modal layout

## Implementation Notes

### Static File Creation

The zip files should be created manually and uploaded to Supabase Storage before deploying this feature. The files should include:

1. Current widget component code
2. Proper TypeScript types
3. Framework-specific README with clear instructions
4. index.ts file with proper exports

### Future Enhancements

- Add analytics to track which framework packages are downloaded most
- Add version numbers to zip files for future updates
- Consider adding a "Check for Updates" feature
- Add support for additional frameworks (Vue, Angular, Svelte)
- Generate personalized zip files with pre-configured website IDs

### Performance Considerations

- Static files in Supabase Storage are served via CDN for fast global access
- No server-side processing required for downloads
- Minimal impact on application bundle size (only adds download logic)
- Cache-Control headers ensure efficient browser caching

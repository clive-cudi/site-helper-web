# Implementation Plan

- [x] 1. Set up Supabase Storage bucket and upload widget packages
  - Create public storage bucket named 'widget-packages' in Supabase
  - Configure bucket with public read access policy
  - Create React widget package zip file containing SiteHelperWidget.tsx, index.ts, and README.md
  - Create Next.js widget package zip file containing SiteHelperWidget.tsx, NextJsWidget.tsx, index.ts, and README.md
  - Upload both zip files to the storage bucket with appropriate cache headers
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Create README files for widget packages
  - Write README.md for React package with installation steps, usage examples, and configuration options
  - Write README.md for Next.js package with App Router instructions, 'use client' directive explanation, and usage examples
  - _Requirements: 1.4, 2.4_

- [x] 3. Update WidgetCodeModal component with download functionality
  - [x] 3.1 Add download state management
    - Add state for tracking download progress (downloading, downloadError)
    - Add handleDownload function that accepts framework parameter
    - Implement download logic using Supabase Storage getPublicUrl
    - Implement browser download trigger using anchor element
    - Add error handling with user-friendly messages
    - _Requirements: 1.2, 1.3, 1.5, 2.2, 2.3, 2.5_

  - [x] 3.2 Add download button UI for React tab
    - Add download button below code snippet in React tab section
    - Include download icon (from lucide-react)
    - Show loading state when downloading React package
    - Display error message if React download fails
    - Ensure button is disabled during download
    - _Requirements: 1.1, 4.1_

  - [x] 3.3 Add download button UI for Next.js tab
    - Add download button below code snippet in Next.js tab section
    - Include download icon (from lucide-react)
    - Show loading state when downloading Next.js package
    - Display error message if Next.js download fails
    - Ensure button is disabled during download
    - _Requirements: 2.1, 4.2_

  - [x] 3.4 Implement proper filename handling
    - Set download filename to 'sitehelper-react-widget.zip' for React package
    - Set download filename to 'sitehelper-nextjs-widget.zip' for Next.js package
    - Ensure filename is preserved when saved to user's device
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4. Test download functionality across scenarios
  - Verify React package downloads correctly with proper filename
  - Verify Next.js package downloads correctly with proper filename
  - Test error handling when storage is unavailable
  - Verify UI states (loading, error, success) display correctly
  - Test that manual code copying still works as fallback
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5_

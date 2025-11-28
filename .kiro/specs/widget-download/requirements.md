# Requirements Document

## Introduction

This feature enables users to download pre-packaged widget code as zip files for React and Next.js frameworks. The zip files will contain all necessary widget component files and will be stored statically in Supabase Storage, allowing users to quickly integrate the SiteHelper chat widget into their applications without manual file copying.

## Glossary

- **Widget Code Modal**: The UI component that displays widget integration code and options to users
- **Supabase Storage**: The cloud storage service used to host static zip files containing widget code
- **Widget Package**: A zip file containing all necessary widget component files for a specific framework
- **Download Button**: The UI element that triggers the download of a widget package
- **Static Asset**: A pre-built zip file stored in Supabase Storage that does not change per user

## Requirements

### Requirement 1

**User Story:** As a developer integrating the SiteHelper widget, I want to download a zip file containing all React widget files, so that I can quickly add the widget to my React application without manually copying files.

#### Acceptance Criteria

1. WHEN the user selects the React tab in the Widget Code Modal, THE Widget Code Modal SHALL display a download button for the React widget package
2. WHEN the user clicks the React download button, THE Widget Code Modal SHALL retrieve the React widget zip file from Supabase Storage
3. WHEN the React widget zip file is retrieved successfully, THE Widget Code Modal SHALL trigger a browser download of the zip file
4. THE React widget package SHALL contain the SiteHelperWidget component file and the index file
5. IF the zip file retrieval fails, THEN THE Widget Code Modal SHALL display an error message to the user

### Requirement 2

**User Story:** As a developer integrating the SiteHelper widget, I want to download a zip file containing all Next.js widget files, so that I can quickly add the widget to my Next.js application without manually copying files.

#### Acceptance Criteria

1. WHEN the user selects the Next.js tab in the Widget Code Modal, THE Widget Code Modal SHALL display a download button for the Next.js widget package
2. WHEN the user clicks the Next.js download button, THE Widget Code Modal SHALL retrieve the Next.js widget zip file from Supabase Storage
3. WHEN the Next.js widget zip file is retrieved successfully, THE Widget Code Modal SHALL trigger a browser download of the zip file
4. THE Next.js widget package SHALL contain the SiteHelperWidget component file, the NextJsWidget component file, and the index file
5. IF the zip file retrieval fails, THEN THE Widget Code Modal SHALL display an error message to the user

### Requirement 3

**User Story:** As a system administrator, I want widget packages to be stored as static files in Supabase Storage, so that download requests can be served efficiently without generating files on demand.

#### Acceptance Criteria

1. THE System SHALL store the React widget package as a static zip file in Supabase Storage
2. THE System SHALL store the Next.js widget package as a static zip file in Supabase Storage
3. THE Supabase Storage bucket SHALL be configured with public read access for widget packages
4. THE widget package files SHALL be stored in a dedicated storage bucket or folder path
5. THE widget packages SHALL be accessible via public URLs from Supabase Storage

### Requirement 4

**User Story:** As a developer using the widget, I want the downloaded zip file to have a clear, descriptive filename, so that I can easily identify which framework package I downloaded.

#### Acceptance Criteria

1. WHEN the React widget package is downloaded, THE System SHALL name the file "sitehelper-react-widget.zip"
2. WHEN the Next.js widget package is downloaded, THE System SHALL name the file "sitehelper-nextjs-widget.zip"
3. THE downloaded zip file SHALL preserve its filename when saved to the user's device

# SiteHelper Major Design Change Implementation Plan

## Date
- 2026-04-07

## Scope and Intent
- Shift from "one user, many websites" product experience to "one business account, one canonical website identity".
- Make Knowledge Base the primary workflow.
- Keep `website_id` as external identifier for widget/chat compatibility.
- Execute in two phases:
  - Phase 1: Core product flow and data model
  - Phase 2: Security hardening and integration polish

## Finalized Product Decisions
- Enforce exactly one website per business account at DB level.
- Clean-slate database assumption (no migration complexity for existing production data).
- Signup captures:
  - Required: `business_name`, `first_name`, `last_name`, `email`, `password`
  - Optional: `business_phone`, `website_url`
- Data split:
  - `business_accounts`: business identity and onboarding fields
  - `profiles`: person identity (`first_name`, `last_name`, optional phone)
- Keep `websites` table and enforce one-to-one with `business_accounts`.
- `websites.url` is canonical URL; `business_accounts.website_url` is onboarding input only (or removable later).
- `websites.url` must be nullable (`NULL`) until provided.
- Atomic provisioning via DB trigger on `auth.users` insert using signup metadata.
- Hard-fail provisioning when required metadata is missing/invalid.
- Provision immediately on `auth.users` insert, even before email confirmation.
- Dashboard IA:
  - Remove top-level `Websites` tab
  - Primary tab becomes `Knowledge Base`
  - Keep `Conversations`, `Team`, `Settings`
- Knowledge Base flow:
  - Manual editing allowed before URL exists
  - "Scrape Website" available inside KB
  - Default scrape behavior: append/merge with sectioning
  - Replace behavior available as explicit option
  - On replace, backup previous content into `knowledge_bases.metadata.last_replaced_backup`
- Role behavior for scrape modes:
  - `owner`, `admin`: append + replace
  - `editor`: append only
- Website row identity:
  - Lazy auto-create website using business name + `NULL` URL when needed
  - Auto-create KB row whenever website row is created
  - Website deletion disabled in normal UI to preserve stable `website_id`
- Widget setup entry point:
  - Move install/code UX into `Settings` ("Install Widget")

## Phase 1: Core Product Flow and Data Model

### 1) Database Schema and Constraints
- Add new migration for clean-slate canonical model:
  - Create `profiles` table:
    - `user_id uuid PK references auth.users(id) on delete cascade`
    - `first_name text not null`
    - `last_name text not null`
    - `phone text null`
    - timestamps
  - Update `business_accounts`:
    - add nullable `phone`
    - add nullable `website_url` (onboarding input only)
  - Update `websites`:
    - enforce `UNIQUE (business_account_id)`
    - allow `url` to be nullable
    - keep `name` required
  - Keep `knowledge_bases.website_id` one-to-one operationally by creating row eagerly with website.

### 2) Atomic Provisioning on Signup
- Implement DB function + trigger on `auth.users` insert:
  - Read `raw_user_meta_data` for:
    - `business_name`, `first_name`, `last_name`, optional `business_phone`, optional `website_url`
  - Validate required metadata and raise exception if missing.
  - Insert:
    - `business_accounts` (owner, name, optional phone, optional onboarding `website_url`)
    - `team_members` as `owner`, `active`
    - `profiles`
  - If `website_url` present:
    - create website using business name + normalized URL
    - create KB row eagerly
  - If `website_url` absent:
    - no website created during trigger (lazy creation later).

### 3) Frontend Auth and Signup
- Update signup form UI to include:
  - `business_name` (required)
  - `first_name` (required)
  - `last_name` (required)
  - `business_phone` (optional)
  - `website_url` (optional)
- Pass metadata into `supabase.auth.signUp({ email, password, options: { data } })`.
- Remove client-side manual inserts into `business_accounts` and `team_members` from `AuthContext` since DB trigger owns provisioning.
- Fix current signup form issues while touching this area:
  - separate confirm password state and validation
  - fix password input type typo (`texxt` -> `text`)

### 4) Dashboard Information Architecture
- Replace `Websites` tab with `Knowledge Base` as first/default tab.
- Keep tabs: `Knowledge Base`, `Conversations`, `Team`, `Settings`.
- Update permissions usage:
  - primary gate via KB permissions (`view_knowledge_bases`, `edit_knowledge_bases`)
  - remove `manage_websites` dependency from primary UI flow.

### 5) Knowledge Base Primary Workspace
- Create/replace component flow to work as account-level KB surface:
  - Load business account website if exists.
  - If missing, permit manual KB editing using lazily created website + KB records on first save/open.
  - Add URL input and scrape controls inside KB workspace.
  - Add scrape mode selector:
    - Append/Merge (default)
    - Replace (owner/admin only)
- Append format for scrape content:
  - section header with source URL and timestamp, followed by scraped text.
- Replace mode behavior:
  - write backup to `metadata.last_replaced_backup` before overwrite.

### 6) Lazy Website + KB Creation
- Introduce reusable helper/service in frontend:
  - `getOrCreateCanonicalWebsite(businessAccount)`:
    - fetch website by `business_account_id`
    - if absent, create website with:
      - `name = business account name`
      - `url = NULL`
      - default status/config
    - ensure KB row exists for that website.

### 7) Settings: Install Widget
- Move existing widget code UX from website card flow into `Settings`.
- Resolve canonical website via helper above and render install snippet using stable `website_id`.
- Remove website deletion actions from normal UI.

### 8) Conversation Views
- Keep conversation schema keyed by `website_id`.
- Simplify fetch logic assuming max one website per business where useful, while preserving current behavior.

### 9) Phase 1 Acceptance Criteria
- New signup provisions all required records automatically via DB trigger.
- Signup fails when required metadata missing.
- User can complete signup with or without phone/website URL.
- Dashboard opens on Knowledge Base tab (no Websites tab).
- User can manually edit KB without URL configured.
- User can trigger scrape from KB workspace.
- Append mode adds sectioned content with source/timestamp.
- Replace mode stores rollback backup in metadata.
- Widget install code is accessible from Settings.
- Website delete controls are absent from normal UI.

## Phase 2: Security Hardening and Integration Polish (Deferred)

### 1) Edge Function Authorization
- Require authenticated JWT for scrape operations.
- Enforce team membership and role-based scrape mode permissions server-side.
- Reject replace mode for editors.

### 2) API/Function Contract Cleanup
- Add explicit scrape payload contract:
  - `websiteId`
  - `mode: append | replace`
  - optional `url` override with validation rules
- Add audit logging for replace actions.

### 3) Input and URL Validation Hardening
- Centralize URL normalization/validation shared by signup, KB UI, and edge functions.
- Add stricter sanitization for scraped content storage format.

### 4) Observability and Failure Handling
- Add operational logging around provisioning trigger and scrape job transitions.
- Improve user-facing error states and retries.

### 5) Testing and QA
- Add DB-level tests for trigger behavior and constraints.
- Add integration tests for signup metadata path.
- Add UI tests for KB-first flow and role-based replace controls.

## Target Files (Planned)
- `supabase/migrations/*` (new migration for profiles + constraints + trigger)
- `src/components/AuthForm.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/Dashboard.tsx`
- `src/components/KnowledgeBaseModal.tsx` (or replacement KB page/workspace component)
- `src/components/WebsiteList.tsx` (likely retired or repurposed)
- `src/components/WidgetCodeModal.tsx` and/or settings-related components
- `src/services/permissions.ts`
- `src/lib/supabase.ts` type updates

## Notes
- This plan intentionally defers strict server-side authorization hardening for scraping to Phase 2 per agreed scope.
- Since database is treated as clean slate, migrations can optimize for correctness over backward compatibility.

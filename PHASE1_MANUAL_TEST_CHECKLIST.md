# Phase 1 Manual Test Checklist (KB-First + One Website per Business)

Date: 2026-04-07

## Test Environment
- App: local Vite app
- Database: Supabase project configured in `.env.local`
- Build smoke test: `pnpm run build` passed
- Notes:
  - One duplicate legacy website row was archived to `websites_phase1_archive` to enforce the unique business website constraint.

## Code-Level Verification (Completed)
- [x] Signup form captures `business_name`, `first_name`, `last_name`, optional `business_phone`, optional `website_url`
- [x] Auth signup sends metadata to Supabase auth and no longer inserts business/team rows on client
- [x] Dashboard default tab is `Knowledge Base`
- [x] Top-level `Websites` tab removed
- [x] `Settings` has `Install Widget` entry point
- [x] KB workspace supports manual edit without requiring URL
- [x] KB scrape supports append mode and replace mode payload (`mode`)
- [x] Replace mode stores backup metadata in scrape function
- [x] Conversation list queries canonical website context (single-website assumption)

## Database Validation
- [x] `profiles` table exists
- [x] `business_accounts.phone` exists
- [x] `business_accounts.website_url` exists
- [x] `websites.url` is nullable
- [x] unique index exists on `websites.business_account_id`
- [x] trigger `on_auth_user_created_provision_business` exists
- [x] trigger `on_website_created_ensure_knowledge_base` exists
- [x] duplicate groups by `business_account_id` = `0`

## Auth + Signup Flow
- [ ] Sign up with required fields only (`business_name`, `first_name`, `last_name`, `email`, `password`)
- [ ] Sign up with optional fields (`business_phone`, `website_url`)
- [ ] Sign up with password mismatch shows validation error
- [ ] Sign up with missing required metadata fails provisioning as expected
- [ ] Invite sign-up path (`invitedSignup`) does not create a new owner business account

## Dashboard IA (KB-first)
- [ ] Authenticated user lands with `Knowledge Base` as first tab
- [ ] `Websites` tab is absent
- [ ] Tabs visible: `Knowledge Base`, `Conversations`, `Team`, `Settings`

## Knowledge Base Workspace
- [ ] Loads canonical website/KB for business
- [ ] If website missing, lazy canonical website is auto-created
- [ ] Manual KB content edits save successfully without website URL
- [ ] Save URL updates canonical website URL
- [ ] `Scrape and Append` appends section with source/timestamp
- [ ] `Replace with Scrape` overwrites content and writes `metadata.last_replaced_backup`
- [ ] Replace button disabled for editor role

## Conversations
- [ ] Conversations load for canonical website only
- [ ] Empty state copy is correct when website exists but no conversations
- [ ] Empty state copy is correct when no website configured
- [ ] Conversation detail modal opens and message order is correct
- [ ] Conversation delete works for users with `delete_conversations`

## Settings + Widget Install
- [ ] `Settings` contains `Install Widget` section
- [ ] Opening install modal resolves canonical `website_id`
- [ ] Copy widget code works

## Regression Checks
- [ ] Team management still loads for owner/admin roles
- [ ] Invite acceptance route still works
- [ ] Widget packages download buttons still function

## Current Execution Status
- Backend schema/triggers/constraint checks: Completed
- Frontend code implementation + build: Completed
- Frontend manual browser walkthrough: Pending (requires interactive UI session)

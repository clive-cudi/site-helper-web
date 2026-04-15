/*
  # Add Business Profile Fields

  Adds richer business information fields used by the Knowledge Base
  workspace so owners can maintain structured contact and location details.
*/

ALTER TABLE business_accounts
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS address_line_1 text,
  ADD COLUMN IF NOT EXISTS address_line_2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state_region text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS support_hours text,
  ADD COLUMN IF NOT EXISTS business_description text;

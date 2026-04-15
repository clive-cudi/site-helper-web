/*
  # Phase 1: KB-First Model and Atomic Signup Provisioning

  1. Schema
    - Create `profiles` table for user person details
    - Extend `business_accounts` with optional phone and website_url
    - Enforce one website per business account
    - Allow `websites.url` to be nullable

  2. Provisioning
    - Add trigger on auth.users to atomically provision:
      - business_accounts
      - team_members
      - profiles
      - optional website (if website_url provided)
    - Hard-fail trigger when required signup metadata is missing

  3. Knowledge Base Lifecycle
    - Add trigger on websites insert to ensure a knowledge_bases row exists
*/

-- =====================================================
-- 1) PROFILES
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 2) BUSINESS ACCOUNTS / WEBSITES
-- =====================================================

ALTER TABLE business_accounts
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website_url text;

ALTER TABLE websites
  ALTER COLUMN url DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_websites_unique_business_account
  ON websites(business_account_id);

-- =====================================================
-- 3) HELPERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.normalize_website_url(raw_url text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  trimmed text;
BEGIN
  IF raw_url IS NULL THEN
    RETURN NULL;
  END IF;

  trimmed := btrim(raw_url);
  IF trimmed = '' THEN
    RETURN NULL;
  END IF;

  IF trimmed !~* '^https?://' THEN
    trimmed := 'https://' || trimmed;
  END IF;

  RETURN trimmed;
END;
$$;

-- =====================================================
-- 4) WEBSITE -> KNOWLEDGE BASE EAGER CREATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.ensure_knowledge_base_for_website()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO knowledge_bases (website_id, content, summary, metadata)
  VALUES (
    NEW.id,
    '',
    'Knowledge base is ready. Add content manually or scrape your website.',
    '{}'::jsonb
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_website_created_ensure_knowledge_base ON websites;
CREATE TRIGGER on_website_created_ensure_knowledge_base
AFTER INSERT ON websites
FOR EACH ROW
EXECUTE FUNCTION public.ensure_knowledge_base_for_website();

-- =====================================================
-- 5) ATOMIC SIGNUP PROVISIONING ON auth.users
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  invited_signup boolean;
  business_name_val text;
  first_name_val text;
  last_name_val text;
  business_phone_val text;
  website_url_input text;
  website_url_normalized text;
  business_account_id_val uuid;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  invited_signup := COALESCE((meta ->> 'invited_signup')::boolean, false);

  IF invited_signup THEN
    RETURN NEW;
  END IF;

  business_name_val := btrim(COALESCE(meta ->> 'business_name', ''));
  first_name_val := btrim(COALESCE(meta ->> 'first_name', ''));
  last_name_val := btrim(COALESCE(meta ->> 'last_name', ''));
  business_phone_val := NULLIF(btrim(COALESCE(meta ->> 'business_phone', '')), '');
  website_url_input := NULLIF(btrim(COALESCE(meta ->> 'website_url', '')), '');

  IF business_name_val = '' THEN
    RAISE EXCEPTION 'Missing required signup field: business_name';
  END IF;

  IF first_name_val = '' THEN
    RAISE EXCEPTION 'Missing required signup field: first_name';
  END IF;

  IF last_name_val = '' THEN
    RAISE EXCEPTION 'Missing required signup field: last_name';
  END IF;

  website_url_normalized := public.normalize_website_url(website_url_input);

  INSERT INTO business_accounts (name, owner_id, phone, website_url)
  VALUES (business_name_val, NEW.id, business_phone_val, website_url_input)
  RETURNING id INTO business_account_id_val;

  INSERT INTO team_members (
    business_account_id,
    user_id,
    role,
    invited_by,
    joined_at,
    status
  )
  VALUES (
    business_account_id_val,
    NEW.id,
    'owner',
    NEW.id,
    now(),
    'active'
  );

  INSERT INTO profiles (user_id, first_name, last_name, phone)
  VALUES (NEW.id, first_name_val, last_name_val, business_phone_val);

  IF website_url_normalized IS NOT NULL THEN
    INSERT INTO websites (
      business_account_id,
      name,
      url,
      status
    )
    VALUES (
      business_account_id_val,
      business_name_val,
      website_url_normalized,
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_provision_business ON auth.users;
CREATE TRIGGER on_auth_user_created_provision_business
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_provisioning();

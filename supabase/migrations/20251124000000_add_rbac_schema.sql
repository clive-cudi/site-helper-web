/*
  # Add Role-Based Access Control (RBAC) Schema

  1. New Tables
    - `business_accounts` - Multi-tenant business account container
    - `team_members` - User roles within business accounts
    - `invitations` - Team member invitation system
    - `audit_logs` - Audit trail for sensitive operations

  2. Table Modifications
    - Add `business_account_id` to `websites` table
    - Migrate existing data to business account model
    - Drop `user_id` column from websites after migration

  3. Security
    - Add RLS policies for multi-tenant isolation
    - Update existing RLS policies for business account context
*/

-- =====================================================
-- 1. CREATE NEW TABLES
-- =====================================================

-- Create business_accounts table
CREATE TABLE IF NOT EXISTS business_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(owner_id)
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor')),
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  UNIQUE(business_account_id, user_id)
);

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'editor')),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_team_members_business_account ON team_members(business_account_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_business_account ON invitations(business_account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_account ON audit_logs(business_account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================================================
-- 3. MODIFY WEBSITES TABLE
-- =====================================================

-- Add business_account_id column to websites (nullable initially for migration)
ALTER TABLE websites 
  ADD COLUMN IF NOT EXISTS business_account_id uuid REFERENCES business_accounts(id) ON DELETE CASCADE;

-- Create index for business_account_id
CREATE INDEX IF NOT EXISTS idx_websites_business_account ON websites(business_account_id);

-- =====================================================
-- 4. DATA MIGRATION
-- =====================================================

-- Create business accounts for all existing users with websites
INSERT INTO business_accounts (owner_id, name, created_at, updated_at)
SELECT DISTINCT 
  w.user_id,
  COALESCE(
    (SELECT email FROM auth.users WHERE id = w.user_id),
    'Business Account'
  ) || '''s Account',
  MIN(w.created_at),
  now()
FROM websites w
WHERE NOT EXISTS (
  SELECT 1 FROM business_accounts ba WHERE ba.owner_id = w.user_id
)
GROUP BY w.user_id;

-- Create team_member records with 'owner' role for existing users
INSERT INTO team_members (business_account_id, user_id, role, joined_at, status)
SELECT 
  ba.id,
  ba.owner_id,
  'owner',
  ba.created_at,
  'active'
FROM business_accounts ba
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm 
  WHERE tm.business_account_id = ba.id AND tm.user_id = ba.owner_id
);

-- Update websites to reference business_account_id
UPDATE websites w
SET business_account_id = (
  SELECT ba.id 
  FROM business_accounts ba 
  WHERE ba.owner_id = w.user_id
)
WHERE business_account_id IS NULL;

-- Make business_account_id NOT NULL after migration
ALTER TABLE websites 
  ALTER COLUMN business_account_id SET NOT NULL;

-- Drop the old user_id column from websites
ALTER TABLE websites 
  DROP COLUMN IF EXISTS user_id;

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. DROP OLD RLS POLICIES
-- =====================================================

-- Drop old websites policies that reference user_id
DROP POLICY IF EXISTS "Users can view own websites" ON websites;
DROP POLICY IF EXISTS "Users can insert own websites" ON websites;
DROP POLICY IF EXISTS "Users can update own websites" ON websites;
DROP POLICY IF EXISTS "Users can delete own websites" ON websites;

-- Drop old knowledge_bases policies
DROP POLICY IF EXISTS "Website owners can view knowledge bases" ON knowledge_bases;
DROP POLICY IF EXISTS "Website owners can update knowledge bases" ON knowledge_bases;

-- Drop old conversations policies (keep public policies)
DROP POLICY IF EXISTS "Website owners can view conversations" ON conversations;

-- Drop old messages policies (keep public policies)
DROP POLICY IF EXISTS "Website owners can view messages" ON messages;

-- =====================================================
-- 7. CREATE NEW RLS POLICIES FOR BUSINESS ACCOUNTS
-- =====================================================

-- Business Accounts Policies
CREATE POLICY "Team members can view business account"
  ON business_accounts FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT business_account_id FROM team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners can update business account"
  ON business_accounts FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete business account"
  ON business_accounts FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- =====================================================
-- 8. CREATE RLS POLICIES FOR TEAM MEMBERS
-- =====================================================

CREATE POLICY "Team members can view team"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    business_account_id IN (
      SELECT business_account_id FROM team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners and admins can add team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    business_account_id IN (
      SELECT business_account_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

CREATE POLICY "Owners and admins can update team members"
  ON team_members FOR UPDATE
  TO authenticated
  USING (
    business_account_id IN (
      SELECT tm.business_account_id FROM team_members tm
      WHERE tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Owners and admins can remove team members"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    business_account_id IN (
      SELECT tm.business_account_id FROM team_members tm
      WHERE tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
    )
    AND role != 'owner'
  );

-- =====================================================
-- 9. CREATE RLS POLICIES FOR INVITATIONS
-- =====================================================

CREATE POLICY "Team members can view invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    business_account_id IN (
      SELECT business_account_id FROM team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners and admins can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    business_account_id IN (
      SELECT business_account_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

CREATE POLICY "Owners and admins can update invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    business_account_id IN (
      SELECT business_account_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- =====================================================
-- 10. CREATE RLS POLICIES FOR AUDIT LOGS
-- =====================================================

CREATE POLICY "Owners can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    business_account_id IN (
      SELECT business_account_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
      AND status = 'active'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 11. UPDATE WEBSITES RLS POLICIES
-- =====================================================

CREATE POLICY "Team members can view websites"
  ON websites FOR SELECT
  TO authenticated
  USING (
    business_account_id IN (
      SELECT business_account_id FROM team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners and admins can add websites"
  ON websites FOR INSERT
  TO authenticated
  WITH CHECK (
    business_account_id IN (
      SELECT business_account_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

CREATE POLICY "Owners and admins can update websites"
  ON websites FOR UPDATE
  TO authenticated
  USING (
    business_account_id IN (
      SELECT business_account_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

CREATE POLICY "Owners and admins can delete websites"
  ON websites FOR DELETE
  TO authenticated
  USING (
    business_account_id IN (
      SELECT business_account_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- =====================================================
-- 12. UPDATE KNOWLEDGE BASES RLS POLICIES
-- =====================================================

CREATE POLICY "Team members can view knowledge bases"
  ON knowledge_bases FOR SELECT
  TO authenticated
  USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN team_members tm ON tm.business_account_id = w.business_account_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "Team members can update knowledge bases"
  ON knowledge_bases FOR UPDATE
  TO authenticated
  USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN team_members tm ON tm.business_account_id = w.business_account_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "Owners and admins can delete knowledge bases"
  ON knowledge_bases FOR DELETE
  TO authenticated
  USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN team_members tm ON tm.business_account_id = w.business_account_id
      WHERE tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
    )
  );

-- =====================================================
-- 13. UPDATE CONVERSATIONS RLS POLICIES
-- =====================================================

CREATE POLICY "Team members can view conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN team_members tm ON tm.business_account_id = w.business_account_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "Owners and admins can delete conversations"
  ON conversations FOR DELETE
  TO authenticated
  USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN team_members tm ON tm.business_account_id = w.business_account_id
      WHERE tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
    )
  );

-- Keep existing public policies for conversations
-- "Public can create conversations" - already exists
-- "Public can view own conversations" - already exists

-- =====================================================
-- 14. UPDATE MESSAGES RLS POLICIES
-- =====================================================

CREATE POLICY "Team members can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN websites w ON w.id = c.website_id
      JOIN team_members tm ON tm.business_account_id = w.business_account_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

-- Keep existing public policies for messages
-- "Public can create messages" - already exists
-- "Public can view messages in conversations" - already exists

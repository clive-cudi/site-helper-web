/*
  # Create SiteHelper Core Tables

  1. New Tables
    - `websites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - Business/website name
      - `url` (text) - Website URL
      - `status` (text) - scraping status: pending, processing, completed, failed
      - `scrape_error` (text) - Error message if scraping fails
      - `widget_config` (jsonb) - Chat widget customization settings
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `knowledge_bases`
      - `id` (uuid, primary key)
      - `website_id` (uuid, references websites)
      - `content` (text) - Extracted content from website
      - `summary` (text) - AI-generated summary
      - `metadata` (jsonb) - Additional metadata (page titles, urls, etc.)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `conversations`
      - `id` (uuid, primary key)
      - `website_id` (uuid, references websites)
      - `visitor_id` (text) - Anonymous visitor identifier
      - `started_at` (timestamptz)
      - `last_message_at` (timestamptz)
      - `metadata` (jsonb) - Visitor info (browser, location, etc.)
    
    - `messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `role` (text) - 'user' or 'assistant'
      - `content` (text) - Message content
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Policies for business owners to manage their own data
    - Public access for chat widget functionality (conversations/messages)

  3. Important Notes
    - Widget config stores theme colors, position, greeting message
    - Visitor_id is generated client-side for anonymous tracking
    - Metadata fields allow flexibility for future features
*/

-- Create websites table
CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  scrape_error text,
  widget_config jsonb DEFAULT '{"theme": "light", "primaryColor": "#3b82f6", "position": "bottom-right", "greeting": "Hi! How can I help you today?"}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create knowledge_bases table
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  summary text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  started_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_website_id ON knowledge_bases(website_id);
CREATE INDEX IF NOT EXISTS idx_conversations_website_id ON conversations(website_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Enable Row Level Security
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Websites policies: owners can manage their own websites
CREATE POLICY "Users can view own websites"
  ON websites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own websites"
  ON websites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own websites"
  ON websites FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own websites"
  ON websites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Knowledge bases policies: owners can view/edit through website ownership
CREATE POLICY "Website owners can view knowledge bases"
  ON knowledge_bases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = knowledge_bases.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Website owners can update knowledge bases"
  ON knowledge_bases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = knowledge_bases.website_id
      AND websites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = knowledge_bases.website_id
      AND websites.user_id = auth.uid()
    )
  );

-- Conversations policies: owners can view, public can create
CREATE POLICY "Website owners can view conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = conversations.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can create conversations"
  ON conversations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can view own conversations"
  ON conversations FOR SELECT
  TO anon
  USING (true);

-- Messages policies: owners can view, public can create for conversations
CREATE POLICY "Website owners can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN websites ON websites.id = conversations.website_id
      WHERE conversations.id = messages.conversation_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can create messages"
  ON messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can view messages in conversations"
  ON messages FOR SELECT
  TO anon
  USING (true);
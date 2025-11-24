import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type BusinessAccount = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  business_account_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor';
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
  status: 'active' | 'invited' | 'suspended';
};

export type Invitation = {
  id: string;
  business_account_id: string;
  email: string;
  role: 'admin' | 'editor';
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
};

export type AuditLog = {
  id: string;
  business_account_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  created_at: string;
};

export type Website = {
  id: string;
  business_account_id: string;
  name: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scrape_error: string | null;
  widget_config: {
    theme: 'light' | 'dark';
    primaryColor: string;
    position: 'bottom-right' | 'bottom-left';
    greeting: string;
  };
  created_at: string;
  updated_at: string;
};

export type KnowledgeBase = {
  id: string;
  website_id: string;
  content: string;
  summary: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  website_id: string;
  visitor_id: string;
  started_at: string;
  last_message_at: string;
  metadata: Record<string, any>;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Website = {
  id: string;
  user_id: string;
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

import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dsmcmxpekiagteeldopx.supabase.co';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbWNteHBla2lhZ3RlZWxkb3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NDcwNDUsImV4cCI6MjEwOTAyMzA0NX0.QlFRdUvTwAqI-7qufITdbvJw07vvn-i2A7FcUpOA5d4';

export interface SupabaseDbUser {
  id: number | string;
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin' | string;
  created_at?: string;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

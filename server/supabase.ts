import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dsmcmxpekiagteeldopx.supabase.co';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbWNteHBla2lhZ3RlZWxkb3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NDcwNDUsImV4cCI6MjEwOTAyMzA0NX0.QlFRdUvTwAqI-7qufITdbvJw07vvn-i2A7FcUpOA5d4';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbWNteHBla2lhZ3RlZWxkb3B4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQ0NzA0NSwiZXhwIjoyMTA5MDIzMDQ1fQ.YHOgmqSE8r3SHflgVLSLyyANi2RMruxQ3EJ7pMvP2KY';

// Prefer service_role key on backend to bypass PostgreSQL RLS policies
const activeServerKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
export const supabase = createClient(SUPABASE_URL, activeServerKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface SupabaseDbUser {
  id: number | string;
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin' | string;
  delivery_address?: string;
  avatar_url?: string;
  user_profile?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseDbProduct {
  id?: number | string;
  beverage_name: string;
  description?: string;
  price: number;
  category?: string;
  total_quantity: number;
  remaining_quantity: number;
  volume?: string;
  flavor_notes?: string;
  calories?: number;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

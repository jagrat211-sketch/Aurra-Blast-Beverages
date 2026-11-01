import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://dsmcmxpekiagteeldopx.supabase.co';
export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbWNteHBla2lhZ3RlZWxkb3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NDcwNDUsImV4cCI6MjEwOTAyMzA0NX0.QlFRdUvTwAqI-7qufITdbvJw07vvn-i2A7FcUpOA5d4';

export interface SupabaseUserRow {
  id?: number | string;
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin' | string;
  delivery_address?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseProductRow {
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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

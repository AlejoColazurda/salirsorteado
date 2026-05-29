import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = () => {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlParam = params?.get('url');
  const keyParam = params?.get('key');

  const localUrl = urlParam || localStorage.getItem('supabase_url');
  const localKey = keyParam || localStorage.getItem('supabase_anon_key');
  
  const supabaseUrl = localUrl || import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = localKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (supabaseUrl && supabaseAnonKey) {
    try {
      return createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
    }
  }
  return null;
};

export const isSupabaseConfigured = () => {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlParam = params?.get('url');
  const keyParam = params?.get('key');

  const localUrl = urlParam || localStorage.getItem('supabase_url');
  const localKey = keyParam || localStorage.getItem('supabase_anon_key');
  return !!((localUrl && localKey) || (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY));
};

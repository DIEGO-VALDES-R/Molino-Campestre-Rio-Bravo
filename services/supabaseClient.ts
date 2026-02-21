import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: verificar que las variables existen
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno faltantes:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl || 'NO DEFINIDA');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'OK' : 'NO DEFINIDA');
  throw new Error('Faltan variables de entorno de Supabase. Revisa tu archivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
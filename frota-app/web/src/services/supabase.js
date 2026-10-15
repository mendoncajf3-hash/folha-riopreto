import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'SUA_URL_AQUI';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'SUA_CHAVE_AQUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

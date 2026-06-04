const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const IS_SUPABASE_MODE =
  Boolean(supabaseUrl) && supabaseUrl !== 'https://your-project.supabase.co' &&
  Boolean(supabaseAnonKey) && supabaseAnonKey !== 'your-anon-key-here';

export const IS_PROD = import.meta.env.PROD;

export const SUPABASE_URL = supabaseUrl ?? '';
export const SUPABASE_ANON_KEY = supabaseAnonKey ?? '';

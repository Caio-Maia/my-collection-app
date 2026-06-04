const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Support both the legacy ANON_KEY name and the newer PUBLISHABLE_KEY name
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;

export const IS_SUPABASE_MODE =
  Boolean(supabaseUrl) && supabaseUrl !== 'https://your-project.supabase.co' &&
  Boolean(supabaseAnonKey) && supabaseAnonKey !== 'your-anon-key-here';

export const IS_PROD = import.meta.env.PROD;

export const SUPABASE_URL = supabaseUrl ?? '';
export const SUPABASE_ANON_KEY = supabaseAnonKey ?? '';

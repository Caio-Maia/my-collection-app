import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_SUPABASE_MODE } from './config';

// When running in local mode the client is never used; we pass a placeholder
// so createClient doesn't throw on empty strings at module evaluation time.
export const supabase = createClient(
  IS_SUPABASE_MODE ? SUPABASE_URL : 'https://placeholder.supabase.co',
  IS_SUPABASE_MODE ? SUPABASE_ANON_KEY : 'placeholder-anon-key',
);

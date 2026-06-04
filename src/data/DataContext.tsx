import { createContext, useContext, type ReactNode } from 'react';
import { IS_SUPABASE_MODE, IS_PROD } from '../lib/config';
import { LocalAdapter } from './local/LocalAdapter';
import { SupabaseAdapter } from './supabase/SupabaseAdapter';
import type { DataProvider } from './DataProvider';

if (IS_PROD && !IS_SUPABASE_MODE) {
  throw new Error(
    'Supabase must be configured in production. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY — refusing to start with insecure local auth.',
  );
}

const adapter: DataProvider = IS_SUPABASE_MODE ? new SupabaseAdapter() : new LocalAdapter();

const DataContext = createContext<DataProvider>(adapter);

export function DataContextProvider({ children }: { children: ReactNode }) {
  return <DataContext.Provider value={adapter}>{children}</DataContext.Provider>;
}

export function useData(): DataProvider {
  return useContext(DataContext);
}

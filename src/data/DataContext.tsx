import { createContext, useContext, type ReactNode } from 'react';
import { IS_SUPABASE_MODE } from '../lib/config';
import { LocalAdapter } from './local/LocalAdapter';
import { SupabaseAdapter } from './supabase/SupabaseAdapter';
import type { DataProvider } from './DataProvider';

const adapter: DataProvider = IS_SUPABASE_MODE ? new SupabaseAdapter() : new LocalAdapter();

const DataContext = createContext<DataProvider>(adapter);

export function DataContextProvider({ children }: { children: ReactNode }) {
  return <DataContext.Provider value={adapter}>{children}</DataContext.Provider>;
}

export function useData(): DataProvider {
  return useContext(DataContext);
}

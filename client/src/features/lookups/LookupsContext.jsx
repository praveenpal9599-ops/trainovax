import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { lookupService } from '../../services';
import { useAuth } from '../auth/AuthContext';

const LookupsContext = createContext({ exerciseCategories: [], muscleGroups: [], foodCategories: [], equipment: [], trainers: [], organizations: [] });

export function LookupsProvider({ children }) {
  const { status } = useAuth();
  const [data, setData] = useState(null);
  const reload = useCallback(() => lookupService.get().then(setData).catch(() => {}), []);
  useEffect(() => { if (status === 'authenticated') reload(); }, [status, reload]);
  return <LookupsContext.Provider value={{ ...(data || { exerciseCategories: [], muscleGroups: [], foodCategories: [], equipment: [], trainers: [], organizations: [] }), reload, loaded: !!data }}>{children}</LookupsContext.Provider>;
}
export const useLookups = () => useContext(LookupsContext);

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../../services';
import { tokenStore } from '../../api/http';

const AuthContext = createContext(null);

export const ROLE_HOME = { super_admin: '/super-admin/dashboard', admin: '/admin/dashboard', trainer: '/trainer/dashboard', client: '/client/dashboard' };
export const ROLE_BASE = { super_admin: '/super-admin', admin: '/admin', trainer: '/trainer', client: '/client' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous
  const [expired, setExpired] = useState(false);

  const loadMe = useCallback(async () => {
    if (!tokenStore.get()) { setStatus('anonymous'); return; }
    try {
      const res = await authService.me();
      setUser(res.user); setPermissions(res.permissions || []); setStatus('authenticated');
    } catch {
      tokenStore.clear(); setUser(null); setStatus('anonymous');
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  useEffect(() => {
    const onExpired = () => { tokenStore.clear(); setUser(null); setStatus('anonymous'); setExpired(true); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async ({ email, password, remember, portal }) => {
    const res = await authService.login({ email, password, remember, portal });
    tokenStore.set(res.token, remember);
    setExpired(false);
    await loadMe();
    return res.user;
  }, [loadMe]);

  const register = useCallback(async (payload) => {
    const res = await authService.register(payload);
    tokenStore.set(res.token, false);
    await loadMe();
    return res.user;
  }, [loadMe]);

  const logout = useCallback(async () => {
    await authService.logout();
    tokenStore.clear(); setUser(null); setPermissions([]); setStatus('anonymous');
  }, []);

  const value = useMemo(() => ({
    user, status, permissions, expired, setUser, login, register, logout, refresh: loadMe,
    can: (code) => permissions.includes(code),
    basePath: user ? ROLE_BASE[user.role] : '',
  }), [user, status, permissions, expired, login, register, logout, loadMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

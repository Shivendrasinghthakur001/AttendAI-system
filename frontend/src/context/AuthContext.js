import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin]   = useState(false);
  const [token,   setToken]     = useState(() => localStorage.getItem('adminToken') || '');
  const [checking, setChecking] = useState(true);

  // Attach token to every axios request automatically
  useEffect(() => {
    const id = axios.interceptors.request.use(cfg => {
      if (token) cfg.headers['X-Admin-Token'] = token;
      return cfg;
    });
    return () => axios.interceptors.request.eject(id);
  }, [token]);

  const verify = useCallback(async (t = token) => {
    if (!t) { setIsAdmin(false); setChecking(false); return false; }
    try {
      await axios.get(`${API}/admin/verify`, { headers: { 'X-Admin-Token': t } });
      setIsAdmin(true);
      setChecking(false);
      return true;
    } catch {
      setIsAdmin(false);
      setToken('');
      localStorage.removeItem('adminToken');
      setChecking(false);
      return false;
    }
  }, [token]);

  useEffect(() => { verify(); }, []); // eslint-disable-line

  const login = async (username, password) => {
    const res = await axios.post(`${API}/admin/login`, { username, password });
    const { token: t } = res.data;
    setToken(t);
    localStorage.setItem('adminToken', t);
    axios.defaults.headers.common['X-Admin-Token'] = t;
    setIsAdmin(true);
    return res.data;
  };

  const logout = async () => {
    try { await axios.post(`${API}/admin/logout`); } catch {}
    setToken('');
    setIsAdmin(false);
    localStorage.removeItem('adminToken');
    delete axios.defaults.headers.common['X-Admin-Token'];
  };

  return (
    <AuthContext.Provider value={{ isAdmin, token, login, logout, checking }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

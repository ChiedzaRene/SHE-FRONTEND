import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, clearSitesCache } from '../api/endpoints';

const AuthContext = createContext(null);

export function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const initUser = useCallback(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = decodeToken(token);
      if (payload) {
        setUser({ token, ...payload });
      } else {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { initUser(); }, [initUser]);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    const { access_token } = res.data;
    clearSitesCache();
    localStorage.setItem('token', access_token);
    const payload = decodeToken(access_token);
    setUser({ token: access_token, ...payload });
    return payload;
  };

  // After the user changes their own password the server returns a fresh token (the old one,
  // like every other session, is signed out). Swap it in so this session carries on.
  const replaceToken = (token) => {
    localStorage.setItem('token', token);
    const payload = decodeToken(token);
    if (payload) setUser({ token, ...payload });
  };

  const logout = () => {
    localStorage.removeItem('token');
    clearSitesCache(); // the next user may see a different set of sites
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, replaceToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useContext, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mf_user')); } catch { return null; }
  });

  // Feature 5: multi-account — store array of sessions
  const [accounts, setAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mf_accounts')) || []; } catch { return []; }
  });

  const _save = (data) => {
    localStorage.setItem('mf_token', data.token);
    localStorage.setItem('mf_user',  JSON.stringify(data.user));
    setUser(data.user);
    // Add to accounts list if not already present
    setAccounts(prev => {
      const exists = prev.find(a => a.user.id === data.user.id);
      const updated = exists
        ? prev.map(a => a.user.id === data.user.id ? { token: data.token, user: data.user } : a)
        : [...prev, { token: data.token, user: data.user }];
      localStorage.setItem('mf_accounts', JSON.stringify(updated));
      return updated;
    });
  };

  const login    = async (email, password) => { const { data } = await api.post('/auth/login',    { email, password });            _save(data); return data; };
  const register = async (name, email, pw)  => { const { data } = await api.post('/auth/register', { name, email, password: pw }); _save(data); return data; };

  const logout = () => {
    const currentId = user?.id;
    localStorage.removeItem('mf_token');
    localStorage.removeItem('mf_user');
    setUser(null);
    // Remove current account from list
    setAccounts(prev => {
      const updated = prev.filter(a => a.user.id !== currentId);
      localStorage.setItem('mf_accounts', JSON.stringify(updated));
      return updated;
    });
  };

  // Feature 5: switch to another account without full logout
  const switchAccount = (account) => {
    localStorage.setItem('mf_token', account.token);
    localStorage.setItem('mf_user',  JSON.stringify(account.user));
    setUser(account.user);
    window.location.href = '/'; // reload to re-initialize
  };

  // Feature 5: add another account
  const addAccount = async (email, password, label) => {
    const { data } = await api.post('/accounts/add', { email, password, label });
    setAccounts(prev => {
      const exists = prev.find(a => a.user.id === data.user.id);
      const updated = exists ? prev : [...prev, { token: data.token, user: data.user }];
      localStorage.setItem('mf_accounts', JSON.stringify(updated));
      return updated;
    });
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, accounts, switchAccount, addAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

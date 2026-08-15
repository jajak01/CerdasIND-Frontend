/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';

interface User {
  user_id: number;
  username: string;
  role: 'admin' | 'peserta';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeRole = (value: unknown): User['role'] | null => {
  const role = String(value || '').toLowerCase();
  return role === 'admin' || role === 'peserta' ? role : null;
};

const normalizeUser = (value: unknown): User | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const role = normalizeRole(candidate.role);
  const rawUserId = candidate.user_id ?? candidate.id;
  const userId = typeof rawUserId === 'number' ? rawUserId : Number(rawUserId);
  const username = typeof candidate.username === 'string' ? candidate.username : '';

  if (!role || !Number.isFinite(userId) || !username) return null;

  return {
    user_id: userId,
    username,
    role,
  };
};

const readStoredAuth = (): { token: string | null; user: User | null } => {
  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');

  if (!savedToken || !savedUser) {
    return { token: null, user: null };
  }

  try {
    const parsedUser = normalizeUser(JSON.parse(savedUser));
    if (parsedUser) {
      return { token: savedToken, user: parsedUser };
    }
  } catch {
    // Invalid localStorage data is cleared below.
  }

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return { token: null, user: null };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storedAuth] = useState(readStoredAuth);
  const [user, setUser] = useState<User | null>(storedAuth.user);
  const [token, setToken] = useState<string | null>(storedAuth.token);

  const login = (newToken: string, newUser: User) => {
    const normalizedUser = normalizeUser(newUser);
    if (!normalizedUser) {
      throw new Error('Data user login tidak valid.');
    }

    setToken(newToken);
    setUser(normalizedUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAuthenticated = !!token;
  const isAdmin = user?.role === 'admin';
  const loading = false;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

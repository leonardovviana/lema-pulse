import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User } from '@/types/survey';
import { mockUsers } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (pin: string, role: 'entrevistador' | 'admin') => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_KEY = 'lema_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored session
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);
      } catch {
        localStorage.removeItem(AUTH_KEY);
      }
    }
  }, []);

  const login = useCallback((pin: string, role: 'entrevistador' | 'admin'): boolean => {
    const foundUser = mockUsers.find(u => u.pin === pin && u.role === role);
    
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem(AUTH_KEY, JSON.stringify(foundUser));
      return true;
    }
    
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

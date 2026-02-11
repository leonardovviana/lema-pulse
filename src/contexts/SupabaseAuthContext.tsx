import { AppRole, useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext } from 'react';

interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: { id: string; nome: string; avatar_url?: string } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEntrevistador: boolean;
  signUp: (email: string, password: string, nome: string) => Promise<{ user: User | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { nome?: string; avatar_url?: string }) => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const auth = useSupabaseAuth();

  return (
    <SupabaseAuthContext.Provider value={auth}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuthContext() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuthContext must be used within a SupabaseAuthProvider');
  }
  return context;
}

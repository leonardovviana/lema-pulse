import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'entrevistador';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: { id: string; nome: string; avatar_url?: string } | null;
  isLoading: boolean;
}

export function useSupabaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    profile: null,
    isLoading: true
  });

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();

      return {
        role: (roleData?.role as AppRole) || null,
        profile: profileData
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { role: null, profile: null };
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const userData = await fetchUserData(session.user.id);
          setAuthState({
            user: session.user,
            session,
            role: userData.role,
            profile: userData.profile,
            isLoading: false
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            role: null,
            profile: null,
            isLoading: false
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userData = await fetchUserData(session.user.id);
        setAuthState({
          user: session.user,
          session,
          role: userData.role,
          profile: userData.profile,
          isLoading: false
        });
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signUp = useCallback(async (email: string, password: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome }
      }
    });

    if (error) throw error;
    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(async (updates: { nome?: string; avatar_url?: string }) => {
    if (!authState.user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', authState.user.id);

    if (error) throw error;

    // Refresh profile data
    const userData = await fetchUserData(authState.user.id);
    setAuthState(prev => ({
      ...prev,
      profile: userData.profile
    }));
  }, [authState.user, fetchUserData]);

  return {
    ...authState,
    isAuthenticated: !!authState.user,
    isAdmin: authState.role === 'admin',
    isEntrevistador: authState.role === 'entrevistador',
    signUp,
    signIn,
    signOut,
    updateProfile
  };
}

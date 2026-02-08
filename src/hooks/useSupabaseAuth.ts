import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

export type AppRole = 'admin' | 'entrevistador';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: { id: string; nome: string; avatar_url?: string; is_admin?: boolean } | null;
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

  // useRef so the mounted flag survives across async gaps without re-rendering
  const mountedRef = useRef(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Run both queries in parallel for speed
      const [roleResult, profileResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('id, nome, avatar_url, is_admin')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      const roleData = roleResult.data;
      const profileData = profileResult.data;

      const isAdmin = !!profileData?.is_admin;
      const role = isAdmin ? 'admin' : (roleData?.role as AppRole) || null;

      return { role, profile: profileData };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { role: null, profile: null };
    }
  }, []);

  /**
   * Central function that resolves auth state from a session.
   * Always guarantees isLoading becomes false when it finishes.
   */
  const resolveSession = useCallback(
    async (session: Session | null) => {
      if (!mountedRef.current) return;

      if (session?.user) {
        try {
          const userData = await fetchUserData(session.user.id);
          if (!mountedRef.current) return;
          setAuthState({
            user: session.user,
            session,
            role: userData.role,
            profile: userData.profile,
            isLoading: false
          });
        } catch {
          if (!mountedRef.current) return;
          // Even on error, stop loading with whatever we have
          setAuthState({
            user: session.user,
            session,
            role: null,
            profile: null,
            isLoading: false
          });
        }
      } else {
        setAuthState({
          user: null,
          session: null,
          role: null,
          profile: null,
          isLoading: false
        });
      }
    },
    [fetchUserData]
  );

  useEffect(() => {
    mountedRef.current = true;

    // ---- FAIL-SAFE: guarantees loading stops no matter what ----
    const failSafe = window.setTimeout(() => {
      if (mountedRef.current) {
        console.warn('[Auth] Fail-safe timeout – forcing isLoading = false');
        setAuthState(prev => (prev.isLoading ? { ...prev, isLoading: false } : prev));
      }
    }, 5000);

    // 1) Get initial session imperatively (reliable in all Supabase versions)
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => resolveSession(session))
      .catch(() => {
        if (mountedRef.current) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      });

    // 2) Listen for future auth changes (sign-in, sign-out, token refresh).
    //    IMPORTANT: use setTimeout(0) to defer Supabase queries – calling
    //    another Supabase function synchronously inside onAuthStateChange
    //    can deadlock the JS client.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setTimeout(() => resolveSession(session), 0);
      }
    );

    return () => {
      mountedRef.current = false;
      window.clearTimeout(failSafe);
      subscription.unsubscribe();
    };
  }, [resolveSession]);

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

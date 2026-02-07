import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SurveyResponse, SyncStatus } from '@/types/survey';
import { toast } from 'sonner';

const PENDING_KEY = 'lema_pending_responses';
const SYNCED_KEY = 'lema_synced_responses';

export function useSyncToSupabase() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    pendingCount: 0,
    lastSyncAt: null,
    isSyncing: false,
  });

  // Get pending responses from localStorage
  const getPendingResponses = useCallback((): SurveyResponse[] => {
    try {
      const data = localStorage.getItem(PENDING_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }, []);

  // Get synced responses from localStorage (for offline display)
  const getSyncedResponses = useCallback((): SurveyResponse[] => {
    try {
      const data = localStorage.getItem(SYNCED_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }, []);

  // Save pending responses
  const savePendingResponses = useCallback((responses: SurveyResponse[]) => {
    localStorage.setItem(PENDING_KEY, JSON.stringify(responses));
    setSyncStatus(prev => ({ ...prev, pendingCount: responses.length }));
  }, []);

  // Add a new response to the queue
  const addResponse = useCallback((response: SurveyResponse) => {
    const pending = getPendingResponses();
    const newResponse = { ...response, synced: false };
    pending.push(newResponse);
    savePendingResponses(pending);
    
    toast.info('Pesquisa salva localmente', {
      description: navigator.onLine 
        ? 'Sincronizando...' 
        : 'Será sincronizada quando houver conexão.',
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      syncNow();
    }
  }, [getPendingResponses, savePendingResponses]);

  // Sync to Supabase
  const syncToSupabase = useCallback(async (responses: SurveyResponse[]): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const payload = {
      responses: responses.map(r => ({
        id: r.id,
        surveyId: r.surveyId,
        respostas: r.respostas,
        audioBase64: r.audioBlob || undefined,
        latitude: r.gps?.latitude,
        longitude: r.gps?.longitude,
        timestamp: r.timestamp,
        clientId: r.id // Use ID as client ID for deduplication
      }))
    };

    const { data, error } = await supabase.functions.invoke('sync-responses', {
      body: payload
    });

    if (error) {
      throw error;
    }

    return data?.success || false;
  }, []);

  // Sync all pending responses
  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error('Sem conexão', {
        description: 'Conecte-se à internet para sincronizar.',
      });
      return;
    }

    const pending = getPendingResponses();
    if (pending.length === 0) {
      toast.info('Nada para sincronizar');
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      await syncToSupabase(pending);
      
      // Move to synced cache
      const synced = getSyncedResponses();
      const nowSynced = pending.map(r => ({ ...r, synced: true }));
      localStorage.setItem(SYNCED_KEY, JSON.stringify([...synced, ...nowSynced]));
      
      // Clear pending
      savePendingResponses([]);
      
      const now = new Date().toISOString();
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: now,
        pendingCount: 0,
      }));

      toast.success('Sincronização concluída!', {
        description: `${pending.length} pesquisa(s) enviada(s) com sucesso.`,
      });
    } catch (error: any) {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
      toast.error('Erro na sincronização', {
        description: error.message || 'Tente novamente em alguns instantes.',
      });
    }
  }, [getPendingResponses, getSyncedResponses, savePendingResponses, syncToSupabase]);

  // Online/Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      toast.success('Conexão restabelecida!');
      // Auto-sync when back online
      setTimeout(syncNow, 1000);
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
      toast.warning('Você está offline', {
        description: 'As pesquisas serão salvas localmente.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize pending count
    const pending = getPendingResponses();
    setSyncStatus(prev => ({ ...prev, pendingCount: pending.length }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [getPendingResponses, syncNow]);

  // Get all responses (from Supabase + pending)
  const getAllResponses = useCallback(async (): Promise<SurveyResponse[]> => {
    const pending = getPendingResponses();
    
    try {
      const { data, error } = await supabase
        .from('respostas')
        .select(`
          id,
          pesquisa_id,
          entrevistador_id,
          respostas,
          audio_url,
          latitude,
          longitude,
          synced,
          created_at,
          pesquisas (
            titulo
          ),
          profiles:entrevistador_id (
            nome
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const syncedResponses: SurveyResponse[] = (data || []).map(r => ({
        id: r.id,
        surveyId: r.pesquisa_id,
        surveyTitulo: (r.pesquisas as any)?.titulo || 'Pesquisa Desconhecida',
        entrevistadorId: r.entrevistador_id,
        entrevistadorNome: (r.profiles as any)?.nome || 'Desconhecido',
        respostas: r.respostas as Record<string, string | string[]>,
        audioBlob: r.audio_url || undefined,
        gps: r.latitude && r.longitude ? {
          latitude: r.latitude,
          longitude: r.longitude
        } : null,
        timestamp: r.created_at,
        synced: true
      }));

      // Combine with pending (avoiding duplicates by ID)
      const syncedIds = new Set(syncedResponses.map(r => r.id));
      const uniquePending = pending.filter(p => !syncedIds.has(p.id));

      return [...uniquePending, ...syncedResponses].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      // If offline or error, return local data
      const synced = getSyncedResponses();
      return [...pending, ...synced].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
  }, [getPendingResponses, getSyncedResponses]);

  return {
    syncStatus,
    addResponse,
    syncNow,
    getPendingResponses,
    getAllResponses,
  };
}

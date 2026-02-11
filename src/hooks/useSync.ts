import { SurveyResponse, SyncStatus } from '@/types/survey';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const PENDING_KEY = 'lema_pending_responses';
const SYNCED_KEY = 'lema_synced_responses';

export function useSync() {
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

  // Get synced responses from localStorage
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getPendingResponses, savePendingResponses]);
  const syncToBackend = useCallback(async (responses: SurveyResponse[]): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate 95% success rate
    if (Math.random() > 0.05) {
      return true;
    }
    throw new Error('Falha na sincronização');
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
      await syncToBackend(pending);
      
      // Move to synced
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
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
      toast.error('Erro na sincronização', {
        description: 'Tente novamente em alguns instantes.',
      });
    }
  }, [getPendingResponses, getSyncedResponses, savePendingResponses, syncToBackend]);

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

  // Get all responses (synced + pending) for admin
  const getAllResponses = useCallback((): SurveyResponse[] => {
    const synced = getSyncedResponses();
    const pending = getPendingResponses();
    return [...synced, ...pending].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [getSyncedResponses, getPendingResponses]);

  return {
    syncStatus,
    addResponse,
    syncNow,
    getPendingResponses,
    getAllResponses,
  };
}

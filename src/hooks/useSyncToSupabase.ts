import { supabase } from '@/integrations/supabase/client';
import { AnswerValue, SurveyResponse, SyncStatus } from '@/types/survey';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const PENDING_KEY = 'lema_pending_responses';
const SYNCED_KEY = 'lema_synced_responses';
const SYNC_EVENT = 'lema-sync-state-change';

// ── Global singleton: shared across all hook instances ──
let _isSyncing = false;

function readPending(): SurveyResponse[] {
  try {
    const d = localStorage.getItem(PENDING_KEY);
    return d ? JSON.parse(d) : [];
  } catch { return []; }
}

function writePending(responses: SurveyResponse[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(responses));
}

function readSynced(): SurveyResponse[] {
  try {
    const d = localStorage.getItem(SYNCED_KEY);
    return d ? JSON.parse(d) : [];
  } catch { return []; }
}

/** Broadcast a state change so every hook instance re-reads from localStorage */
function broadcast() {
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
}

/** Send responses to Supabase edge function */
async function syncToSupabase(responses: SurveyResponse[]): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const payload = {
    responses: responses.map(r => ({
      id: r.id,
      surveyId: r.surveyId,
      respostas: r.respostas,
      audioBase64: r.audioBlob || undefined,
      latitude: r.gps?.latitude,
      longitude: r.gps?.longitude,
      timestamp: r.timestamp,
      clientId: r.id,
      pesquisaVersao: r.pesquisaVersao || 1,
    }))
  };

  const { data, error } = await supabase.functions.invoke('sync-responses', {
    body: payload
  });

  if (error) throw error;
  return data?.success || false;
}

/** Core sync logic – called once even if multiple hook instances exist */
async function doSync(silent = false): Promise<void> {
  if (!navigator.onLine) {
    if (!silent) toast.error('Sem conexão', { description: 'Conecte-se à internet para sincronizar.' });
    return;
  }

  const pending = readPending();
  if (pending.length === 0) {
    if (!silent) toast.info('Nada para sincronizar');
    return;
  }

  if (_isSyncing) return;           // avoid concurrent syncs
  _isSyncing = true;
  broadcast();                       // update UI → "syncing…"

  try {
    await syncToSupabase(pending);

    // ── Move to synced cache (without audio to save space) ──
    const MAX_HISTORY = 50;
    const cleanPending = pending.map(({ audioBlob: _, ...rest }) => ({ ...rest, synced: true }));
    const cleanSynced  = readSynced().map(r => {
      if ('audioBlob' in r) { const { audioBlob: _, ...rest } = r; return rest; }
      return r;
    });
    const updated = [...cleanSynced, ...cleanPending].slice(-MAX_HISTORY);

    try { localStorage.setItem(SYNCED_KEY, JSON.stringify(updated)); }
    catch { try { localStorage.setItem(SYNCED_KEY, JSON.stringify(cleanPending.slice(-20))); } catch { /* */ } }

    // ── Clear pending ──
    writePending([]);
    _isSyncing = false;
    broadcast();

    toast.success('Sincronização concluída!', {
      description: `${pending.length} pesquisa(s) enviada(s) com sucesso.`,
    });
  } catch (error: unknown) {
    _isSyncing = false;
    broadcast();
    toast.error('Erro na sincronização', {
      description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
    });
  }
}

// ── Hook ──────────────────────────────────────────────────
export function useSyncToSupabase() {
  const buildStatus = useCallback((): SyncStatus => ({
    isOnline: navigator.onLine,
    pendingCount: readPending().length,
    lastSyncAt: null,
    isSyncing: _isSyncing,
  }), []);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(buildStatus);
  const lastSyncRef = useRef<string | null>(null);

  // Refresh status whenever the broadcast event fires
  const refresh = useCallback(() => {
    setSyncStatus(prev => {
      const pending = readPending().length;
      return {
        ...prev,
        isOnline: navigator.onLine,
        pendingCount: pending,
        isSyncing: _isSyncing,
        lastSyncAt: (pending === 0 && prev.pendingCount > 0)
          ? new Date().toISOString()
          : prev.lastSyncAt,
      };
    });
  }, []);

  useEffect(() => {
    const onSyncEvent = () => refresh();
    const onOnline = () => {
      refresh();
      toast.success('Conexão restabelecida!');
      setTimeout(() => doSync(true), 800);
    };
    const onOffline = () => {
      refresh();
      toast.warning('Você está offline', { description: 'As pesquisas serão salvas localmente.' });
    };

    window.addEventListener(SYNC_EVENT, onSyncEvent);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Initial read
    refresh();

    return () => {
      window.removeEventListener(SYNC_EVENT, onSyncEvent);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refresh]);

  /** Add a response and immediately try to sync */
  const addResponse = useCallback((response: SurveyResponse) => {
    const pending = readPending();
    pending.push({ ...response, synced: false });
    writePending(pending);
    broadcast();

    toast.info('Pesquisa salva localmente', {
      description: navigator.onLine ? 'Sincronizando...' : 'Será sincronizada quando houver conexão.',
    });

    if (navigator.onLine) {
      // Small delay so caller can finish its work before sync starts
      setTimeout(() => doSync(true), 300);
    }
  }, []);

  /** Manually trigger sync */
  const syncNow = useCallback(async () => {
    await doSync(false);
  }, []);

  /** Read pending responses from localStorage */
  const getPendingResponses = useCallback((): SurveyResponse[] => readPending(), []);

  /** Get all responses (server + pending) for display */
  const getAllResponses = useCallback(async (): Promise<SurveyResponse[]> => {
    const pending = readPending();

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
          profiles:profiles!respostas_entrevistador_profile_fkey (
            nome
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const syncedResponses: SurveyResponse[] = (data || []).map(r => ({
        id: r.id,
        surveyId: r.pesquisa_id,
        surveyTitulo: (r.pesquisas as { titulo?: string } | null)?.titulo || 'Pesquisa Desconhecida',
        entrevistadorId: r.entrevistador_id,
        entrevistadorNome: (r.profiles as { nome?: string } | null)?.nome || 'Desconhecido',
        respostas: r.respostas as Record<string, AnswerValue>,
        audioBlob: r.audio_url || undefined,
        gps: r.latitude && r.longitude ? { latitude: r.latitude, longitude: r.longitude } : null,
        timestamp: r.created_at,
        synced: true
      }));

      const syncedIds = new Set(syncedResponses.map(r => r.id));
      const uniquePending = pending.filter(p => !syncedIds.has(p.id));

      return [...uniquePending, ...syncedResponses].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      const synced = readSynced();
      return [...pending, ...synced].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
  }, []);

  return {
    syncStatus,
    addResponse,
    syncNow,
    getPendingResponses,
    getAllResponses,
  };
}

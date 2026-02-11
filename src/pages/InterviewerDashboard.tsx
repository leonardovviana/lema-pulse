import { Logo } from '@/components/Logo';
import { StatusIndicator } from '@/components/StatusIndicator';
import { SurveyCodeInput } from '@/components/SurveyCodeInput';
import { SurveyForm } from '@/components/SurveyForm';
import { SyncButton } from '@/components/SyncButton';
import { Button } from '@/components/ui/button';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useSyncToSupabase } from '@/hooks/useSyncToSupabase';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    Clock,
    Key,
    LogOut,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface UnlockedSurvey {
  id: string;
  titulo: string;
  descricao: string | null;
  versao: number;
  shuffleOptions?: boolean;
  blocos?: {
    id: string;
    titulo: string;
    descricao?: string | null;
    ordem: number;
  }[];
  perguntas: {
    id: string;
    text: string;
    type: string;
    options?: string[];
    required?: boolean;
    ordem?: number;
    [key: string]: unknown;
  }[];
}

const UNLOCKED_SURVEYS_KEY = 'lema_unlocked_surveys';

export default function InterviewerDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useSupabaseAuthContext();
  const { syncStatus, syncNow, getPendingResponses } = useSyncToSupabase();
  const [unlockedSurveys, setUnlockedSurveys] = useState<UnlockedSurvey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<UnlockedSurvey | null>(null);
  const [isLoadingSurvey, setIsLoadingSurvey] = useState(false);

  // Load unlocked surveys from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(UNLOCKED_SURVEYS_KEY);
    if (stored) {
      try {
        setUnlockedSurveys(JSON.parse(stored));
      } catch {
        localStorage.removeItem(UNLOCKED_SURVEYS_KEY);
      }
    }
  }, []);

  // Save unlocked surveys to localStorage
  const saveUnlockedSurveys = (surveys: UnlockedSurvey[]) => {
    setUnlockedSurveys(surveys);
    localStorage.setItem(UNLOCKED_SURVEYS_KEY, JSON.stringify(surveys));
  };

  // Auto-check for survey version updates when online
  useEffect(() => {
    if (!navigator.onLine || unlockedSurveys.length === 0) return;

    const checkUpdates = async () => {
      for (const survey of unlockedSurveys) {
        try {
          const { data } = await supabase
            .from('pesquisas')
            .select('versao, embaralhar_opcoes')
            .eq('id', survey.id)
            .single();

          const serverVersion = (data?.versao as number) || 1;
          const localVersion = survey.versao || 1;

          if (serverVersion > localVersion) {
            // Fetch updated questions for the new version
            const [blocksResult, questionsResult] = await Promise.all([
              supabase
                .from('blocos_perguntas')
                .select('id, titulo, descricao, ordem, versao')
                .eq('pesquisa_id', survey.id)
                .eq('versao', serverVersion)
                .order('ordem', { ascending: true }),
              supabase
                .from('perguntas')
                .select('*, versao')
                .eq('pesquisa_id', survey.id)
                .eq('versao', serverVersion)
                .order('ordem', { ascending: true }),
            ]);

            if (!blocksResult.error && !questionsResult.error) {
              const updatedSurvey: UnlockedSurvey = {
                ...survey,
                versao: serverVersion,
                shuffleOptions: !!(data as Record<string, unknown>)?.embaralhar_opcoes,
                blocos: blocksResult.data || [],
                perguntas: questionsResult.data || [],
              };

              setUnlockedSurveys(prev => {
                const updated = prev.map(s => s.id === survey.id ? updatedSurvey : s);
                localStorage.setItem(UNLOCKED_SURVEYS_KEY, JSON.stringify(updated));
                return updated;
              });

              toast.info(`Pesquisa "${survey.titulo}" atualizada para versão ${serverVersion}`, {
                description: 'Novas coletas usarão o questionário atualizado.',
                duration: 5000,
              });
            }
          }
        } catch {
          // Ignore — will retry on next online event
        }
      }
    };

    checkUpdates();

    const handleOnline = () => { setTimeout(checkUpdates, 2000); };
    window.addEventListener('online', handleOnline);
    return () => { window.removeEventListener('online', handleOnline); };
  }, [unlockedSurveys.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSurveyUnlocked = async (survey: { id: string; titulo: string; descricao: string | null }) => {
    // Check if already unlocked
    if (unlockedSurveys.some(s => s.id === survey.id)) {
      // Select it directly
      const existing = unlockedSurveys.find(s => s.id === survey.id);
      if (existing) setSelectedSurvey(existing);
      return;
    }

    // Fetch version, blocks and questions for this survey
    setIsLoadingSurvey(true);
    try {
      const [surveyResult, blocksResult, questionsResult] = await Promise.all([
        supabase
          .from('pesquisas')
          .select('versao, embaralhar_opcoes')
          .eq('id', survey.id)
          .single(),
        supabase
          .from('blocos_perguntas')
          .select('id, titulo, descricao, ordem, versao')
          .eq('pesquisa_id', survey.id)
          .order('ordem', { ascending: true }),
        supabase
          .from('perguntas')
          .select('*, versao')
          .eq('pesquisa_id', survey.id)
          .order('ordem', { ascending: true })
      ]);

      if (blocksResult.error) throw blocksResult.error;
      if (questionsResult.error) throw questionsResult.error;

      const currentVersion = (surveyResult.data?.versao as number) || 1;

      // Filter to latest version only
      const blocos = (blocksResult.data || []).filter((b: { versao?: number }) => (b.versao || 1) === currentVersion);
      const perguntas = (questionsResult.data || []).filter((q: { versao?: number }) => (q.versao || 1) === currentVersion);

      const fullSurvey: UnlockedSurvey = {
        ...survey,
        versao: currentVersion,
        shuffleOptions: !!(surveyResult.data as Record<string, unknown>)?.embaralhar_opcoes,
        blocos,
        perguntas: perguntas || []
      };

      const newList = [...unlockedSurveys, fullSurvey];
      saveUnlockedSurveys(newList);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setIsLoadingSurvey(false);
    }
  };

  const handleRemoveSurvey = (surveyId: string) => {
    const newList = unlockedSurveys.filter(s => s.id !== surveyId);
    saveUnlockedSurveys(newList);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSurveyComplete = () => {
    setSelectedSurvey(null);
  };

  // If a survey is selected, show the form
  if (selectedSurvey) {
    return (
      <SurveyForm 
        survey={{
          id: selectedSurvey.id,
          titulo: selectedSurvey.titulo,
          descricao: selectedSurvey.descricao || '',
          ativa: true,
          createdAt: new Date().toISOString(),
          versao: selectedSurvey.versao || 1,
          shuffleOptions: selectedSurvey.shuffleOptions || false,
          blocos: selectedSurvey.blocos,
          perguntas: selectedSurvey.perguntas.map(p => ({
            id: p.id,
            text: p.texto,
            type: p.tipo as 'text' | 'radio' | 'checkbox' | 'select',
            promptType: (p.tipo_pergunta || 'estimulada') as 'espontanea' | 'estimulada' | 'mista',
            required: p.obrigatoria,
            options: p.opcoes || [],
            suggestedOptions: p.opcoes_sugeridas || [],
            allowOther: p.permite_outro || false,
            blockId: p.bloco_id || null,
            blockTitle: p.bloco_id
              ? (selectedSurvey.blocos || []).find(b => b.id === p.bloco_id)?.titulo || null
              : null
          }))
        }}
        onComplete={handleSurveyComplete}
      />
    );
  }

  const pendingResponses = getPendingResponses();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-lema-gradient p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <Logo size="sm" variant="full" className="[&_span]:text-white [&_.text-muted-foreground]:text-white/80" />
          <div className="flex items-center gap-3">
            <StatusIndicator isOnline={syncStatus.isOnline} size="sm" />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              className="text-white hover:bg-white/20"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* User Info */}
      <div className="bg-card border-b p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-lema-gradient flex items-center justify-center text-white font-bold text-lg">
            {profile?.nome?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-semibold">{profile?.nome || 'Usuário'}</p>
            <p className="text-sm text-muted-foreground">Entrevistador</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-4 space-y-6">
        {/* Sync Status Card */}
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                syncStatus.isOnline ? 'bg-green-100' : 'bg-red-100'
              )}>
                {syncStatus.isOnline ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {syncStatus.isOnline ? 'Conectado' : 'Modo Offline'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {syncStatus.pendingCount > 0 
                    ? `${syncStatus.pendingCount} pesquisa(s) pendente(s)`
                    : 'Tudo sincronizado'
                  }
                </p>
              </div>
            </div>
            {syncStatus.lastSyncAt && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Última sinc.</span>
                </div>
                <p className="text-sm font-medium">
                  {new Date(syncStatus.lastSyncAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>

          <SyncButton
            pendingCount={syncStatus.pendingCount}
            isSyncing={syncStatus.isSyncing}
            isOnline={syncStatus.isOnline}
            onSync={syncNow}
          />
        </div>

        {/* Survey Code Input */}
        <SurveyCodeInput onSurveyUnlocked={handleSurveyUnlocked} />

        {/* Unlocked Surveys */}
        {unlockedSurveys.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Pesquisas Liberadas
            </h2>

            <div className="space-y-3">
              {unlockedSurveys.map((survey) => (
                <div
                  key={survey.id}
                  className="card-elevated p-4 hover:shadow-lema transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedSurvey(survey)}
                      className="flex-1 text-left active:scale-[0.98]"
                    >
                      <h3 className="font-semibold text-foreground">
                        {survey.titulo}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {survey.descricao}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full">
                          {survey.perguntas.length} perguntas
                        </span>
                        {(survey.versao || 1) > 1 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            v{survey.versao}
                          </span>
                        )}
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          Liberada
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSurvey(survey.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Responses */}
        {pendingResponses.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-lema-secondary" />
              Pendentes de Sincronização
            </h2>

            <div className="space-y-2">
              {pendingResponses.map((response) => (
                <div
                  key={response.id}
                  className="bg-lema-secondary/10 border border-lema-secondary/30 rounded-xl p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{response.surveyTitulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(response.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <span className="text-xs bg-lema-secondary/20 text-lema-secondary px-2 py-1 rounded-full">
                      Pendente
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

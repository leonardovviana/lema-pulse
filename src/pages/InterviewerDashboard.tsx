import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { StatusIndicator } from '@/components/StatusIndicator';
import { SyncButton } from '@/components/SyncButton';
import { SurveyForm } from '@/components/SurveyForm';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useSyncToSupabase } from '@/hooks/useSyncToSupabase';
import { useSurveys } from '@/hooks/useSurveys';
import { Survey } from '@/types/survey';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardList, 
  LogOut, 
  Clock, 
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InterviewerDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useSupabaseAuthContext();
  const { syncStatus, syncNow, getPendingResponses } = useSyncToSupabase();
  const { data: surveys, isLoading: surveysLoading, refetch } = useSurveys();
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSurveyComplete = () => {
    setSelectedSurvey(null);
    refetch(); // Refresh surveys list
  };

  // If a survey is selected, show the form
  if (selectedSurvey) {
    return (
      <SurveyForm 
        survey={selectedSurvey} 
        onComplete={handleSurveyComplete}
      />
    );
  }

  const activeSurveys = surveys?.filter(s => s.ativa) || [];
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

        {/* Active Surveys */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-lema-primary" />
              Pesquisas Ativas
            </h2>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {surveysLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : activeSurveys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma pesquisa ativa no momento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSurveys.map((survey) => (
                <button
                  key={survey.id}
                  onClick={() => setSelectedSurvey(survey)}
                  className="w-full card-elevated p-4 text-left hover:shadow-lema transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
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
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

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
                  className="bg-orange-50 border border-orange-200 rounded-xl p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{response.surveyTitulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(response.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
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

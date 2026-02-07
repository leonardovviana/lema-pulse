import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { StatusIndicator } from '@/components/StatusIndicator';
import { SyncButton } from '@/components/SyncButton';
import { SurveyForm } from '@/components/SurveyForm';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/hooks/useSync';
import { mockSurveys } from '@/data/mockData';
import { Survey } from '@/types/survey';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  LogOut, 
  Clock, 
  ChevronRight,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InterviewerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { syncStatus, syncNow, getPendingResponses } = useSync();
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSurveyComplete = () => {
    setSelectedSurvey(null);
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

  const activeSurveys = mockSurveys.filter(s => s.ativa);
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
            {user?.nome.charAt(0)}
          </div>
          <div>
            <p className="font-semibold">{user?.nome}</p>
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
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-lema-primary" />
            Pesquisas Ativas
          </h2>

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

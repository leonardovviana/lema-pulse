import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { MetricCard } from '@/components/MetricCard';
import { PieChartCard, BarChartCard } from '@/components/Charts';
import { AIAnalyst } from '@/components/AIAnalyst';
import { DataGrid } from '@/components/DataGrid';
import { SurveyManager } from '@/components/SurveyManager';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useResponses, useAdminStats } from '@/hooks/useResponses';
import { mockDailyStats, getResponseDistribution } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Bot, 
  Table2,
  LogOut,
  Users,
  Target,
  TrendingUp,
  Calendar,
  RefreshCw,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useSupabaseAuthContext();
  const { data: responses, isLoading: responsesLoading, refetch } = useResponses();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const allResponses = responses || [];

  // Calculate metrics from stats or responses
  const totalSurveys = stats?.totalResponses || allResponses.length;
  const uniqueInterviewers = stats?.activeInterviewers || 0;
  const todayCount = stats?.todayResponses || 0;
  const dailyTarget = 20;

  // Get distribution data for pie chart (from responses)
  const distributionData = useMemo(() => {
    // Use mock data for now, can be replaced with real data
    return getResponseDistribution('survey-1', 'q1');
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'surveys', label: 'Pesquisas', icon: ClipboardList },
    { id: 'ai', label: 'IA Analista', icon: Bot },
    { id: 'data', label: 'Dados', icon: Table2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-lema-gradient text-white hidden lg:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Logo size="md" variant="full" className="[&_span]:text-white [&_.text-muted-foreground]:text-white/80" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                activeTab === item.id
                  ? 'bg-white/20 font-semibold'
                  : 'hover:bg-white/10'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
              {profile?.nome?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{profile?.nome || 'Admin'}</p>
              <p className="text-xs text-white/60">Administrador</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden bg-lema-gradient p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <Logo size="sm" variant="full" className="[&_span]:text-white [&_.text-muted-foreground]:text-white/80" />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLogout}
            className="text-white hover:bg-white/20"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="lg:hidden sticky top-16 z-40 bg-card border-b overflow-x-auto">
        <div className="flex min-w-max">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 px-4 transition-all min-w-[80px]',
                activeTab === item.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 p-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Page Title */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">Visão geral das pesquisas</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>

            {/* Metrics */}
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total de Pesquisas"
                  value={totalSurveys}
                  subtitle="Todas as respostas coletadas"
                  icon={ClipboardList}
                  trend={{ value: 12, isPositive: true }}
                  variant="primary"
                />
                <MetricCard
                  title="Entrevistadores Ativos"
                  value={uniqueInterviewers}
                  subtitle="Usuários com coletas hoje"
                  icon={Users}
                />
                <MetricCard
                  title="Meta do Dia"
                  value={`${todayCount}/${dailyTarget}`}
                  subtitle={`${Math.round((todayCount / dailyTarget) * 100)}% concluído`}
                  icon={Target}
                  variant="secondary"
                />
                <MetricCard
                  title="Pesquisas Ativas"
                  value={stats?.activeSurveys || 0}
                  subtitle="Disponíveis para coleta"
                  icon={TrendingUp}
                />
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PieChartCard
                title="Distribuição: Qualidade do Atendimento"
                data={distributionData}
              />
              <BarChartCard
                title="Produtividade Diária"
                data={mockDailyStats}
              />
            </div>

            {/* Recent Activity */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Atividade Recente
              </h3>
              {responsesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : allResponses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma resposta coletada ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {allResponses.slice(0, 5).map((response) => (
                    <div
                      key={response.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                          {response.entrevistadorNome?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium">{response.surveyTitulo}</p>
                          <p className="text-sm text-muted-foreground">
                            por {response.entrevistadorNome || 'Desconhecido'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {new Date(response.timestamp).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(response.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'surveys' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">Gerenciar Pesquisas</h1>
              <p className="text-muted-foreground">Crie e gerencie pesquisas com códigos de liberação</p>
            </div>
            <SurveyManager />
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">IA Analista</h1>
              <p className="text-muted-foreground">Faça perguntas sobre os dados coletados</p>
            </div>
            <AIAnalyst responses={allResponses} />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Dados das Pesquisas</h1>
                <p className="text-muted-foreground">Visualize e exporte todas as respostas</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
            {responsesLoading ? (
              <Skeleton className="h-96 w-full rounded-xl" />
            ) : (
              <DataGrid responses={allResponses} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

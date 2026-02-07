import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role, isLoading } = useSupabaseAuthContext();

  useEffect(() => {
    if (isAuthenticated && role) {
      // Redirect based on role
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/entrevistador');
      }
    }
  }, [isAuthenticated, role, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated, show landing page
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-accent">
      <div className="w-full max-w-md space-y-8 text-center">
        <Logo size="lg" />
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Bem-vindo ao Lema Pesquisas
          </h1>
          <p className="text-muted-foreground">
            Sistema completo para pesquisas de campo com funcionamento offline.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <Button 
            onClick={() => navigate('/auth')}
            className="w-full h-14 text-lg btn-primary-lema gap-2"
          >
            Entrar no Sistema
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="pt-8 space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-card rounded-xl border">
              <div className="text-2xl font-bold text-primary">📱</div>
              <p className="text-sm text-muted-foreground mt-1">PWA Mobile</p>
            </div>
            <div className="p-4 bg-card rounded-xl border">
              <div className="text-2xl font-bold text-primary">📡</div>
              <p className="text-sm text-muted-foreground mt-1">Offline-First</p>
            </div>
            <div className="p-4 bg-card rounded-xl border">
              <div className="text-2xl font-bold text-primary">🔒</div>
              <p className="text-sm text-muted-foreground mt-1">Seguro</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground pt-4">
          © 2024 Lema Pesquisas. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default Index;

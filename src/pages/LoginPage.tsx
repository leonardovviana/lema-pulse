import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'entrevistador' | 'admin'>('entrevistador');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin.length !== 4) {
      toast.error('PIN deve ter 4 dígitos');
      return;
    }

    setIsLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const success = login(pin, activeTab);
    
    if (success) {
      toast.success('Login realizado com sucesso!');
      navigate(activeTab === 'admin' ? '/admin' : '/entrevistador');
    } else {
      toast.error('PIN inválido', {
        description: 'Verifique o PIN e tente novamente.',
      });
    }
    
    setIsLoading(false);
  };

  const handlePinChange = (value: string) => {
    // Only allow numbers and max 4 digits
    const filtered = value.replace(/\D/g, '').slice(0, 4);
    setPin(filtered);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-lema-gradient p-6">
        <div className="flex items-center justify-center">
          <Logo size="lg" variant="full" className="text-white [&_span]:text-white [&_.text-muted-foreground]:text-white/80" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Bem-vindo</h1>
            <p className="text-muted-foreground mt-1">
              Selecione seu perfil e digite o PIN
            </p>
          </div>

          <Tabs 
            value={activeTab} 
            onValueChange={(v) => setActiveTab(v as 'entrevistador' | 'admin')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-14">
              <TabsTrigger 
                value="entrevistador" 
                className="gap-2 data-[state=active]:bg-lema-primary data-[state=active]:text-white"
              >
                <Users className="w-4 h-4" />
                Entrevistador
              </TabsTrigger>
              <TabsTrigger 
                value="admin"
                className="gap-2 data-[state=active]:bg-lema-primary data-[state=active]:text-white"
              >
                <Shield className="w-4 h-4" />
                Administrador
              </TabsTrigger>
            </TabsList>

            <TabsContent value="entrevistador" className="mt-6">
              <div className="card-elevated p-6">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="pin">PIN de Acesso</Label>
                    <div className="relative">
                      <Input
                        id="pin"
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={(e) => handlePinChange(e.target.value)}
                        placeholder="••••"
                        className="h-14 text-center text-2xl tracking-[0.5em] font-mono"
                        maxLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Digite os 4 dígitos do seu PIN
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={pin.length !== 4 || isLoading}
                    className="w-full h-12 text-lg bg-lema-primary hover:bg-lema-primary/90"
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>

                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    <strong>Demo:</strong> Use PIN <code className="bg-background px-1 rounded">1234</code> (Maria) ou <code className="bg-background px-1 rounded">5678</code> (João)
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="admin" className="mt-6">
              <div className="card-elevated p-6">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="pin-admin">PIN Administrativo</Label>
                    <div className="relative">
                      <Input
                        id="pin-admin"
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={(e) => handlePinChange(e.target.value)}
                        placeholder="••••"
                        className="h-14 text-center text-2xl tracking-[0.5em] font-mono"
                        maxLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={pin.length !== 4 || isLoading}
                    className="w-full h-12 text-lg bg-lema-primary hover:bg-lema-primary/90"
                  >
                    {isLoading ? 'Entrando...' : 'Acessar Painel'}
                  </Button>
                </form>

                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    <strong>Demo:</strong> Use PIN <code className="bg-background px-1 rounded">0000</code> (Ana Gerente)
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <p className="text-xs text-muted-foreground">
          © 2024 Lema Pesquisas. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

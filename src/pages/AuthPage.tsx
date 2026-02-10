import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { Eye, EyeOff, Loader2, Lock, Mail, Shield, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type UserType = 'entrevistador' | 'admin';

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, isLoading: authLoading } = useSupabaseAuthContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<UserType>('entrevistador');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setNome('');
    setConfirmPassword('');
    setAccessCode('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'entrevistador') {
      if (!accessCode) {
        toast.error('Informe o código de acesso');
        return;
      }
      
      setIsLoading(true);
      try {
        // Login using the access code as both password and part of the dummy email
        const dummyEmail = `${accessCode}@lema.pulse`;
        await signIn(dummyEmail, accessCode);
        toast.success('Login realizado com sucesso!');
      } catch (error: unknown) {
        toast.error('Código inválido', {
          description: 'Verifique o código e tente novamente.'
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Admin Login Logic
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email, password);
      toast.success('Login realizado com sucesso!');
      // Navigation will be handled by the auth state change
    } catch (error: unknown) {
      toast.error('Erro no login', {
        description: error instanceof Error ? error.message : 'Verifique suas credenciais'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome || !email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(email, password, nome);
      toast.success('Conta criada!', {
        description: 'Verifique seu email para confirmar o cadastro.'
      });
      setAuthMode('login');
      resetForm();
    } catch (error: unknown) {
      toast.error('Erro no cadastro', {
        description: error instanceof Error ? error.message : 'Tente novamente'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
              Selecione seu perfil para continuar
            </p>
          </div>

          <Tabs 
            value={activeTab} 
            onValueChange={(v) => {
              setActiveTab(v as UserType);
              setAuthMode('login');
              resetForm();
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-14">
              <TabsTrigger 
                value="entrevistador" 
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="w-4 h-4" />
                Entrevistador
              </TabsTrigger>
              <TabsTrigger 
                value="admin"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Shield className="w-4 h-4" />
                Administrador
              </TabsTrigger>
            </TabsList>

            {/* Entrevistador Tab - Access Code Only */}
            <TabsContent value="entrevistador" className="mt-6">
              <div className="bg-card rounded-xl shadow-lg border p-6">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="text-center space-y-2 mb-6">
                    <p className="text-sm text-muted-foreground">
                      Digite o código de acesso fornecido pelo administrador
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="access-code">Código de Acesso</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="access-code"
                        type={showPassword ? 'text' : 'password'}
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        className="pl-10 pr-10 h-12 text-center text-lg tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 text-lg bg-primary hover:bg-primary/90"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Entrar no Painel'
                    )}
                  </Button>
                </form>
              </div>
            </TabsContent>

            {/* Admin Tab - Login Only */}
            <TabsContent value="admin" className="mt-6">
              <div className="bg-card rounded-xl shadow-lg border p-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email Administrativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="admin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="admin-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 text-lg bg-primary hover:bg-primary/90"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Acessar Painel'
                    )}
                  </Button>
                </form>

                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    O cadastro de administradores é feito diretamente no banco de dados.
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
          © 2026 Lema Pesquisas. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Key, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Interviewer {
  id: string;
  nome: string;
  created_at: string;
  user_id: string;
}

export function InterviewerManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const queryClient = useQueryClient();

  // Fetch Interviewers
  const { data: interviewers, isLoading } = useQuery({
    queryKey: ['interviewers'],
    queryFn: async () => {
      // We join profiles with user_roles to filter by 'entrevistador'
      // Note: Supabase JS doesn't support easy join on role table in one query without foreign key setup perfectly, 
      // or we can fetch all profiles and filtering, but RLS might hide others.
      // Assuming RLS allows Admin to see all profiles.
      // But we need to know who is 'entrevistador'.
      
      // Let's first get all user_ids that are interviewers
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'entrevistador');
      
      if (!roles?.length) return [];

      const userIds = roles.map(r => r.user_id);

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return profiles as Interviewer[];
    },
  });

  // Create Interviewer Mutation
  const createMutation = useMutation({
    mutationFn: async ({ name, code }: { name: string; code: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { name, code },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        // supabase-js wraps non-2xx as FunctionsHttpError — extract the body
        const body = typeof data === 'object' && data?.error ? data.error : error.message;
        throw new Error(body || 'Erro desconhecido ao criar entrevistador');
      }

      // Even on 200, the body might contain an error field
      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interviewers'] });
      setIsCreateOpen(false);
      setNewName('');
      setGeneratedCode('');
      toast.success('Entrevistador criado com sucesso!', {
        description: `Código de acesso: ${variables.code}`,
        duration: 8000,
      });
    },
    onError: (error: any) => {
      toast.error('Erro ao criar entrevistador', {
        description: error.message || 'Tente novamente.',
      });
    },
  });

  const generateCode = () => {
    // Generate 6 digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !generatedCode) return;
    createMutation.mutate({ name: newName, code: generatedCode });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Entrevistadores</h2>
          <p className="text-muted-foreground">Gerencie o acesso dos pesquisadores</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Entrevistador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Entrevistador</DialogTitle>
              <DialogDescription>
                Gere um código de acesso único para o entrevistador fazer login.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Código de Acesso</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={generatedCode}
                      readOnly
                      className="pl-9 font-mono tracking-widest text-center text-lg bg-muted"
                      required
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={generateCode}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Gerar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Este código será usado como login e senha do entrevistador.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !generatedCode}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar Acesso
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Data Criação</TableHead>
              {/* Note: We refrain from showing the "Code" because we don't store it in Profile, 
                  and we can't retrieve user passwords. This is a security feature. 
                  Admins must share the code immediately upon creation. */}
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Carregando...
                </TableCell>
              </TableRow>
            ) : interviewers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhum entrevistador cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              interviewers?.map((interviewer) => (
                <TableRow key={interviewer.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {interviewer.nome.charAt(0)}
                      </div>
                      {interviewer.nome}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(interviewer.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                   {/* Actions like delete could go here */}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

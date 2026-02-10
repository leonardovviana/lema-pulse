import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Key, Loader2, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Interviewer {
  id: string;
  nome: string;
  created_at: string;
  user_id: string;
  codigo_acesso: string | null;
  equipe: string | null;
  todayCount: number;
}

export function InterviewerManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEquipe, setNewEquipe] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [filterEquipe, setFilterEquipe] = useState<string>('all');

  const queryClient = useQueryClient();

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    let session = data.session;

    if (!session || (session.expires_at && session.expires_at * 1000 < Date.now() + 60_000)) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed.session;
    }

    if (!session?.access_token) {
      throw new Error('Sessao expirada. Faca login novamente.');
    }

    return session.access_token;
  };

  // Fetch Interviewers with today's response count
  const { data: interviewers, isLoading } = useQuery({
    queryKey: ['interviewers'],
    queryFn: async () => {
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

      // Fetch today's response counts
      const today = new Date().toISOString().split('T')[0];
      const { data: todayResponses } = await supabase
        .from('respostas')
        .select('entrevistador_id')
        .in('entrevistador_id', userIds)
        .gte('created_at', today);

      const countMap = new Map<string, number>();
      (todayResponses || []).forEach(r => {
        countMap.set(r.entrevistador_id, (countMap.get(r.entrevistador_id) || 0) + 1);
      });

      return (profiles || []).map(p => ({
        ...p,
        todayCount: countMap.get(p.user_id) || 0,
      })) as Interviewer[];
    },
  });

  // Unique teams for filter
  const teams = Array.from(new Set(
    (interviewers || []).map(i => i.equipe).filter(Boolean)
  )) as string[];

  // Filter by team
  const filteredInterviewers = filterEquipe === 'all'
    ? interviewers
    : interviewers?.filter(i => i.equipe === filterEquipe);

  const deleteMutation = useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
      const accessToken = await getAccessToken();

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        const body = typeof data === 'object' && data && 'error' in data
          ? String((data as { error?: unknown }).error)
          : error.message;
        throw new Error(body || `Erro ao excluir entrevistador ${name}`);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviewers'] });
      toast.success('Entrevistador excluido com sucesso.');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir entrevistador', {
        description: error.message || 'Tente novamente.',
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, code, equipe }: { name: string; code: string; equipe: string }) => {
      const accessToken = await getAccessToken();

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { name, code, equipe },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        let message = error.message || 'Erro desconhecido ao criar entrevistador';

        if (typeof data === 'object' && data && 'error' in data) {
          message = String((data as { error?: unknown }).error || message);
        }

        if (error instanceof FunctionsHttpError) {
          const response = error.context?.response;
          if (response) {
            try {
              const body = await response.json();
              if (body?.error) message = body.error;
            } catch { /* ignore */ }
          }
        }
        throw new Error(message);
      }

      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interviewers'] });
      setIsCreateOpen(false);
      setNewName('');
      setNewEquipe('');
      setGeneratedCode('');
      toast.success('Entrevistador criado com sucesso!', {
        description: `Codigo de acesso: ${variables.code}`,
        duration: 8000,
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar entrevistador', {
        description: error.message || 'Tente novamente.',
      });
    },
  });

  const generateCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !generatedCode) return;
    createMutation.mutate({ name: newName, code: generatedCode, equipe: newEquipe.trim() });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold">Entrevistadores</h2>
          <p className="text-muted-foreground">Gerencie o acesso dos pesquisadores</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Team filter */}
          {teams.length > 0 && (
            <Select value={filterEquipe} onValueChange={setFilterEquipe}>
              <SelectTrigger className="w-[180px]">
                <Users className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas equipes</SelectItem>
                {teams.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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
                  Gere um codigo de acesso unico para o entrevistador fazer login.
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
                  <Label>Equipe (opcional)</Label>
                  <Input
                    value={newEquipe}
                    onChange={(e) => setNewEquipe(e.target.value)}
                    placeholder="Ex: Equipe Norte, Equipe Sul"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Codigo de Acesso</Label>
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
                    Este codigo sera usado como login e senha do entrevistador.
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
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead>Data e Hora</TableHead>
              <TableHead>Codigo</TableHead>
              <TableHead className="text-center">Coletas Hoje</TableHead>
              <TableHead className="w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredInterviewers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum entrevistador cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredInterviewers?.map((interviewer) => (
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
                    {interviewer.equipe
                      ? <Badge variant="secondary">{interviewer.equipe}</Badge>
                      : <span className="text-muted-foreground text-xs">—</span>
                    }
                  </TableCell>
                  <TableCell>
                    {new Date(interviewer.created_at).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono tracking-widest text-sm">
                      {interviewer.codigo_acesso || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={interviewer.todayCount > 0 ? 'default' : 'outline'}>
                      {interviewer.todayCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir entrevistador</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso vai deslogar o entrevistador e apagar o acesso e os registros associados. Esta acao nao pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate({
                              userId: interviewer.user_id,
                              name: interviewer.nome,
                            })}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Plus, 
  Key, 
  Copy, 
  Check, 
  Trash2,
  ClipboardList,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Survey {
  id: string;
  titulo: string;
  descricao: string | null;
  ativa: boolean;
  codigo_liberacao: string | null;
  created_at: string;
}

export function SurveyManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');

  // Fetch surveys
  const { data: surveys, isLoading } = useQuery({
    queryKey: ['admin-surveys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pesquisas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Survey[];
    }
  });

  // Create survey mutation
  const createMutation = useMutation({
    mutationFn: async (newSurvey: { titulo: string; descricao: string }) => {
      const { data, error } = await supabase
        .from('pesquisas')
        .insert({
          titulo: newSurvey.titulo,
          descricao: newSurvey.descricao || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-surveys'] });
      toast.success('Pesquisa criada!');
      setIsDialogOpen(false);
      setTitulo('');
      setDescricao('');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar pesquisa', {
        description: error.message
      });
    }
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase
        .from('pesquisas')
        .update({ ativa })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-surveys'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar pesquisa', {
        description: error.message
      });
    }
  });

  // Delete survey mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pesquisas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-surveys'] });
      toast.success('Pesquisa excluída');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir pesquisa', {
        description: error.message
      });
    }
  });

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Código copiado!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error('Digite um título para a pesquisa');
      return;
    }
    createMutation.mutate({ titulo, descricao });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Pesquisa
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Pesquisa</DialogTitle>
            <DialogDescription>
              Preencha os dados da pesquisa. Um código de liberação será gerado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSurvey}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Pesquisa de Satisfação"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o objetivo da pesquisa..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Criar Pesquisa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Surveys List */}
      {surveys?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma pesquisa criada ainda</p>
          <p className="text-sm">Clique em "Nova Pesquisa" para começar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {surveys?.map((survey) => (
            <div
              key={survey.id}
              className={cn(
                'card-elevated p-5 transition-all',
                !survey.ativa && 'opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg truncate">{survey.titulo}</h3>
                    {survey.ativa ? (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Ativa
                      </span>
                    ) : (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full flex items-center gap-1">
                        <EyeOff className="w-3 h-3" />
                        Inativa
                      </span>
                    )}
                  </div>
                  
                  {survey.descricao && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {survey.descricao}
                    </p>
                  )}

                  {/* Liberation Code */}
                  <div className="flex items-center gap-2 bg-accent/50 rounded-lg p-3">
                    <Key className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Código:</span>
                    <code className="font-mono font-bold text-foreground tracking-wider">
                      {survey.codigo_liberacao || '------'}
                    </code>
                    {survey.codigo_liberacao && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(survey.codigo_liberacao!)}
                        className="h-8 px-2"
                      >
                        {copiedCode === survey.codigo_liberacao ? (
                          <Check className="w-4 h-4 text-primary" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {survey.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                    <Switch
                      checked={survey.ativa}
                      onCheckedChange={(checked) => 
                        toggleMutation.mutate({ id: survey.id, ativa: checked })
                      }
                    />
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir esta pesquisa?')) {
                        deleteMutation.mutate(survey.id);
                      }
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Criada em {new Date(survey.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

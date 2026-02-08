import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataGrid } from '@/components/DataGrid';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useResponses } from '@/hooks/useResponses';
import {
    Check,
    ClipboardList,
    Copy,
    Key,
    Loader2,
    Plus,
    Trash2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Survey {
  id: string;
  titulo: string;
  descricao: string | null;
  ativa: boolean;
  codigo_liberacao: string | null;
  created_at: string;
}

type PromptType = 'espontanea' | 'estimulada' | 'mista';
type ResponseType = 'text' | 'radio' | 'checkbox' | 'select';

interface BlockDraft {
  id: string;
  titulo: string;
  descricao: string;
}

interface QuestionDraft {
  id: string;
  text: string;
  promptType: PromptType;
  responseType: ResponseType;
  optionsText: string;
  suggestedOptionsText: string;
  required: boolean;
  allowOther: boolean;
  blockId: string | null;
}

export function SurveyManager() {
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [activeSurveyTab, setActiveSurveyTab] = useState<'questionario' | 'resultados'>('questionario');
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [blocks, setBlocks] = useState<BlockDraft[]>([]);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  const createLocalId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const addBlock = () => {
    setBlocks(prev => [...prev, { id: createLocalId(), titulo: '', descricao: '' }]);
  };

  const updateBlock = (id: string, patch: Partial<BlockDraft>) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    setQuestions(prev => prev.map(q => (q.blockId === id ? { ...q, blockId: null } : q)));
  };

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        id: createLocalId(),
        text: '',
        promptType: 'estimulada',
        responseType: 'radio',
        optionsText: '',
        suggestedOptionsText: '',
        required: true,
        allowOther: false,
        blockId: null,
      }
    ]);
  };

  const updateQuestion = (id: string, patch: Partial<QuestionDraft>) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== id) return q;
      const next = { ...q, ...patch };

      if (patch.promptType === 'espontanea') {
        next.responseType = 'text';
        next.allowOther = false;
      }

      if (patch.responseType === 'text' && next.promptType !== 'espontanea') {
        next.promptType = 'espontanea';
        next.allowOther = false;
      }

      if (next.promptType === 'estimulada') {
        next.allowOther = false;
      }

      return next;
    }));
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

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

  useEffect(() => {
    if (!selectedSurveyId && surveys && surveys.length > 0) {
      setSelectedSurveyId(surveys[0].id);
    }
  }, [selectedSurveyId, surveys]);

  const { data: responses } = useResponses();

  // Create survey mutation (basic info only)
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
      return data as Survey;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-surveys'] });
      toast.success('Pesquisa criada!');
      setTitulo('');
      setDescricao('');
      setBlocks([]);
      setQuestions([]);
      setSelectedSurveyId(data.id);
      setActiveSurveyTab('questionario');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar pesquisa', {
        description: error.message
      });
    }
  });

  const { data: selectedSurvey, isLoading: selectedSurveyLoading } = useQuery({
    queryKey: ['survey-details', selectedSurveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pesquisas')
        .select(`
          id,
          titulo,
          descricao,
          ativa,
          codigo_liberacao,
          blocos_perguntas (
            id,
            titulo,
            descricao,
            ordem
          ),
          perguntas (
            id,
            texto,
            tipo,
            tipo_pergunta,
            opcoes,
            opcoes_sugeridas,
            permite_outro,
            obrigatoria,
            bloco_id,
            ordem
          )
        `)
        .eq('id', selectedSurveyId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedSurveyId
  });

  useEffect(() => {
    if (!selectedSurvey) return;

    const loadedBlocks = (selectedSurvey.blocos_perguntas || [])
      .sort((a: any, b: any) => a.ordem - b.ordem)
      .map((b: any) => ({
        id: b.id,
        titulo: b.titulo,
        descricao: b.descricao || ''
      }));

    const loadedQuestions = (selectedSurvey.perguntas || [])
      .sort((a: any, b: any) => a.ordem - b.ordem)
      .map((q: any) => ({
        id: q.id,
        text: q.texto,
        promptType: (q.tipo_pergunta || 'estimulada') as PromptType,
        responseType: (q.tipo || 'radio') as ResponseType,
        optionsText: (q.opcoes || []).join('\n'),
        suggestedOptionsText: (q.opcoes_sugeridas || []).join('\n'),
        required: !!q.obrigatoria,
        allowOther: !!q.permite_outro,
        blockId: q.bloco_id || null,
      }));

    setBlocks(loadedBlocks);
    setQuestions(loadedQuestions);
  }, [selectedSurvey]);

  const saveQuestionarioMutation = useMutation({
    mutationFn: async ({ surveyId, blocks, questions }: { surveyId: string; blocks: BlockDraft[]; questions: QuestionDraft[] }) => {
      const { error: deleteQuestionsError } = await supabase
        .from('perguntas')
        .delete()
        .eq('pesquisa_id', surveyId);
      if (deleteQuestionsError) throw deleteQuestionsError;

      const { error: deleteBlocksError } = await supabase
        .from('blocos_perguntas')
        .delete()
        .eq('pesquisa_id', surveyId);
      if (deleteBlocksError) throw deleteBlocksError;

      const blockIdByOrder = new Map<number, string>();

      if (blocks.length > 0) {
        const { data: createdBlocks, error: blocksError } = await supabase
          .from('blocos_perguntas')
          .insert(
            blocks.map((block, index) => ({
              pesquisa_id: surveyId,
              titulo: block.titulo,
              descricao: block.descricao || null,
              ordem: index,
            }))
          )
          .select('id, ordem');

        if (blocksError) throw blocksError;
        (createdBlocks || []).forEach((b) => blockIdByOrder.set(b.ordem, b.id));
      }

      if (questions.length > 0) {
        const { error: questionsError } = await supabase
          .from('perguntas')
          .insert(
            questions.map((question, index) => {
              const responseType = question.promptType === 'espontanea'
                ? 'text'
                : question.responseType;
              const options = question.optionsText
                .split('\n')
                .map(o => o.trim())
                .filter(Boolean);
              const suggested = question.suggestedOptionsText
                .split('\n')
                .map(o => o.trim())
                .filter(Boolean);
              const blockIndex = blocks.findIndex(b => b.id === question.blockId);
              const blockId = blockIndex >= 0 ? blockIdByOrder.get(blockIndex) || null : null;

              return {
                pesquisa_id: surveyId,
                bloco_id: blockId,
                texto: question.text,
                tipo: responseType,
                tipo_pergunta: question.promptType,
                opcoes: options.length > 0 ? options : null,
                opcoes_sugeridas: suggested.length > 0 ? suggested : null,
                permite_outro: question.promptType === 'mista' ? question.allowOther : false,
                obrigatoria: question.required,
                ordem: index,
              };
            })
          );

        if (questionsError) throw questionsError;
      }

      return true;
    },
    onSuccess: () => {
      toast.success('Questionario salvo!');
      queryClient.invalidateQueries({ queryKey: ['survey-details', selectedSurveyId] });
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar questionario', {
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
      setSelectedSurveyId(null);
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

  const validateQuestionario = () => {
    if (questions.length === 0) {
      toast.error('Adicione pelo menos uma pergunta');
      return false;
    }

    const invalidQuestion = questions.find((q) => {
      if (!q.text.trim()) return true;
      if (q.promptType !== 'espontanea' && q.responseType === 'text') return true;
      if (q.responseType !== 'text') {
        const options = q.optionsText
          .split('\n')
          .map(o => o.trim())
          .filter(Boolean);
        return options.length === 0;
      }
      return false;
    });

    if (invalidQuestion) {
      toast.error('Revise as perguntas', {
        description: 'Todas as perguntas precisam de texto e opcoes quando aplicavel.'
      });
      return false;
    }

    const invalidBlock = blocks.find((b) => b.titulo.trim().length === 0);
    if (invalidBlock) {
      toast.error('Blocos sem titulo', {
        description: 'Preencha o titulo de todos os blocos.'
      });
      return false;
    }

    return true;
  };

  const handleSaveQuestionario = () => {
    if (!selectedSurveyId) return;
    if (!validateQuestionario()) return;
    saveQuestionarioMutation.mutate({
      surveyId: selectedSurveyId,
      blocks,
      questions
    });
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

  const filteredResponses = selectedSurveyId
    ? (responses || []).filter((response) => response.surveyId === selectedSurveyId)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="card-elevated p-4 space-y-3">
            <div>
              <h3 className="font-semibold">Nova Pesquisa</h3>
              <p className="text-sm text-muted-foreground">Crie a pesquisa e depois monte o questionario.</p>
            </div>
            <form onSubmit={handleCreateSurvey} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Criar Pesquisa
              </Button>
            </form>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pesquisas</h3>
              <span className="text-xs text-muted-foreground">{surveys?.length || 0}</span>
            </div>
            {surveys?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-xl">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Nenhuma pesquisa criada ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {surveys?.map((survey) => (
                  <div
                    key={survey.id}
                    onClick={() => {
                      setSelectedSurveyId(survey.id);
                      setActiveSurveyTab('questionario');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedSurveyId(survey.id);
                        setActiveSurveyTab('questionario');
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'w-full text-left rounded-xl border p-4 transition-all',
                      selectedSurveyId === survey.id ? 'border-primary shadow-sm' : 'hover:border-primary/50',
                      !survey.ativa && 'opacity-70'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{survey.titulo}</p>
                        {survey.descricao && (
                          <p className="text-xs text-muted-foreground truncate">
                            {survey.descricao}
                          </p>
                        )}
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        survey.ativa ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      )}>
                        {survey.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Key className="w-3 h-3" />
                      <span>Código:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {survey.codigo_liberacao || '------'}
                      </span>
                      {survey.codigo_liberacao && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCopyCode(survey.codigo_liberacao!);
                          }}
                          className="h-6 px-2"
                        >
                          {copiedCode === survey.codigo_liberacao ? (
                            <Check className="w-3 h-3 text-primary" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!selectedSurveyId ? (
            <div className="card-elevated p-6 text-center text-muted-foreground">
              Selecione uma pesquisa para configurar o questionario e ver resultados.
            </div>
          ) : selectedSurveyLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{selectedSurvey?.titulo}</h2>
                  <p className="text-sm text-muted-foreground">Configure o questionario e acompanhe resultados.</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <Key className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Código:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {selectedSurvey?.codigo_liberacao || '------'}
                  </span>
                  {selectedSurvey?.codigo_liberacao && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCode(selectedSurvey.codigo_liberacao!)}
                      className="h-7 px-2"
                    >
                      {copiedCode === selectedSurvey.codigo_liberacao ? (
                        <Check className="w-3 h-3 text-primary" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <Tabs value={activeSurveyTab} onValueChange={(value) => setActiveSurveyTab(value as typeof activeSurveyTab)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="questionario">Questionario</TabsTrigger>
                  <TabsTrigger value="resultados">Coletas</TabsTrigger>
                </TabsList>

                <TabsContent value="questionario" className="space-y-4">
                  <div className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <Label>Blocos / Secoes</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addBlock}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Bloco
                      </Button>
                    </div>
                    {blocks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Sem blocos. Voce pode criar blocos para organizar o questionario.
                      </p>
                    ) : (
                      <Accordion type="multiple" className="space-y-2">
                        {blocks.map((block, index) => (
                          <AccordionItem key={block.id} value={block.id} className="rounded-lg border">
                            <AccordionTrigger className="px-3 py-2 text-sm">
                              <div className="flex w-full items-center justify-between gap-3">
                                <span>Bloco {index + 1}</span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {block.titulo || 'Sem titulo'}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3 pb-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-muted-foreground">Editar bloco</p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeBlock(block.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <Input
                                  value={block.titulo}
                                  onChange={(e) => updateBlock(block.id, { titulo: e.target.value })}
                                  placeholder="Titulo do bloco"
                                />
                                <Textarea
                                  value={block.descricao}
                                  onChange={(e) => updateBlock(block.id, { descricao: e.target.value })}
                                  rows={2}
                                  placeholder="Descricao (opcional)"
                                />
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>

                  <div className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <Label>Perguntas</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Pergunta
                      </Button>
                    </div>
                    {questions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma pergunta adicionada.</p>
                    ) : (
                      <Accordion type="multiple" className="space-y-2">
                        {questions.map((question, index) => (
                          <AccordionItem key={question.id} value={question.id} className="rounded-lg border">
                            <AccordionTrigger className="px-3 py-2 text-sm">
                              <div className="flex w-full items-center justify-between gap-3">
                                <span>Pergunta {index + 1}</span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {question.text || 'Sem texto'}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3 pb-3">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-muted-foreground">Editar pergunta</p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeQuestion(question.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <Textarea
                                  value={question.text}
                                  onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                                  rows={2}
                                  placeholder="Texto da pergunta"
                                />

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Tipo de Pergunta</Label>
                                    <Select
                                      value={question.promptType}
                                      onValueChange={(value) => updateQuestion(question.id, { promptType: value as PromptType })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="espontanea">Espontanea</SelectItem>
                                        <SelectItem value="estimulada">Estimulada</SelectItem>
                                        <SelectItem value="mista">Mista</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Tipo de Resposta</Label>
                                    <Select
                                      value={question.responseType}
                                      onValueChange={(value) => updateQuestion(question.id, { responseType: value as ResponseType })}
                                      disabled={question.promptType === 'espontanea'}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="text">Texto</SelectItem>
                                        <SelectItem value="radio">Escolha unica</SelectItem>
                                        <SelectItem value="checkbox">Multipla escolha</SelectItem>
                                        <SelectItem value="select">Lista suspensa</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {question.responseType !== 'text' && (
                                  <div className="space-y-2">
                                    <Label>Opcoes (uma por linha)</Label>
                                    <Textarea
                                      value={question.optionsText}
                                      onChange={(e) => updateQuestion(question.id, { optionsText: e.target.value })}
                                      rows={3}
                                    />
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <Label>Sugestoes (uma por linha)</Label>
                                  <Textarea
                                    value={question.suggestedOptionsText}
                                    onChange={(e) => updateQuestion(question.id, { suggestedOptionsText: e.target.value })}
                                    rows={2}
                                    placeholder="Opcional"
                                  />
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                                    <Label className="text-sm">Obrigatoria</Label>
                                    <Switch
                                      checked={question.required}
                                      onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                                    <Label className="text-sm">Permite outro</Label>
                                    <Switch
                                      checked={question.allowOther}
                                      onCheckedChange={(checked) => updateQuestion(question.id, { allowOther: checked })}
                                      disabled={question.promptType !== 'mista'}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Bloco</Label>
                                  <Select
                                    value={question.blockId || 'none'}
                                    onValueChange={(value) => updateQuestion(question.id, { blockId: value === 'none' ? null : value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Sem bloco</SelectItem>
                                      {blocks.map((block) => (
                                        <SelectItem key={block.id} value={block.id}>
                                          {block.titulo || 'Bloco sem titulo'}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveQuestionario} disabled={saveQuestionarioMutation.isPending}>
                      {saveQuestionarioMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Salvar Questionario
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="resultados" className="space-y-4">
                  <DataGrid responses={filteredResponses} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

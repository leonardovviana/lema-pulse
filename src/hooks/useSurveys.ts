import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Survey, Question } from '@/types/survey';

export function useSurveys() {
  return useQuery({
    queryKey: ['surveys'],
    queryFn: async (): Promise<Survey[]> => {
      const { data: pesquisas, error } = await supabase
        .from('pesquisas')
        .select(`
          id,
          titulo,
          descricao,
          ativa,
          created_at,
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
            opcoes,
            tipo_pergunta,
            opcoes_sugeridas,
            permite_outro,
            bloco_id,
            obrigatoria,
            ordem
          )
        `)
        .eq('ativa', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (pesquisas || []).map(p => {
        const blocos = (p.blocos_perguntas || [])
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map((b: any) => ({
            id: b.id,
            titulo: b.titulo,
            descricao: b.descricao,
            ordem: b.ordem
          }));
        const blocoMap = new Map(blocos.map(b => [b.id, b]));

        return {
        id: p.id,
        titulo: p.titulo,
        descricao: p.descricao || '',
        ativa: p.ativa,
        createdAt: p.created_at,
        blocos,
        perguntas: (p.perguntas || [])
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map((q: any): Question => ({
            id: q.id,
            text: q.texto,
            type: q.tipo as Question['type'],
            promptType: (q.tipo_pergunta || 'estimulada') as Question['promptType'],
            options: q.opcoes || undefined,
            suggestedOptions: q.opcoes_sugeridas || undefined,
            allowOther: q.permite_outro || false,
            required: q.obrigatoria
            blockId: q.bloco_id || null,
            blockTitle: q.bloco_id ? blocoMap.get(q.bloco_id)?.titulo || null : null
          }))
        };
      });
    }
  });
}

export function useSurveyById(id: string) {
  return useQuery({
    queryKey: ['survey', id],
    queryFn: async (): Promise<Survey | null> => {
      const { data: pesquisa, error } = await supabase
        .from('pesquisas')
        .select(`
          id,
          titulo,
          descricao,
          ativa,
          created_at,
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
            opcoes,
            tipo_pergunta,
            opcoes_sugeridas,
            permite_outro,
            bloco_id,
            obrigatoria,
            ordem
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!pesquisa) return null;

      const blocos = (pesquisa.blocos_perguntas || [])
        .sort((a: any, b: any) => a.ordem - b.ordem)
        .map((b: any) => ({
          id: b.id,
          titulo: b.titulo,
          descricao: b.descricao,
          ordem: b.ordem
        }));
      const blocoMap = new Map(blocos.map(b => [b.id, b]));

      return {
        id: pesquisa.id,
        titulo: pesquisa.titulo,
        descricao: pesquisa.descricao || '',
        ativa: pesquisa.ativa,
        createdAt: pesquisa.created_at,
        blocos,
        perguntas: (pesquisa.perguntas || [])
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map((q: any): Question => ({
            id: q.id,
            text: q.texto,
            type: q.tipo as Question['type'],
            promptType: (q.tipo_pergunta || 'estimulada') as Question['promptType'],
            options: q.opcoes || undefined,
            suggestedOptions: q.opcoes_sugeridas || undefined,
            allowOther: q.permite_outro || false,
            required: q.obrigatoria
            blockId: q.bloco_id || null,
            blockTitle: q.bloco_id ? blocoMap.get(q.bloco_id)?.titulo || null : null
          }))
      };
    },
    enabled: !!id
  });
}

export function useAllSurveys() {
  return useQuery({
    queryKey: ['all-surveys'],
    queryFn: async (): Promise<Survey[]> => {
      const { data: pesquisas, error } = await supabase
        .from('pesquisas')
        .select(`
          id,
          titulo,
          descricao,
          ativa,
          created_at,
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
            opcoes,
            tipo_pergunta,
            opcoes_sugeridas,
            permite_outro,
            bloco_id,
            obrigatoria,
            ordem
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (pesquisas || []).map(p => {
        const blocos = (p.blocos_perguntas || [])
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map((b: any) => ({
            id: b.id,
            titulo: b.titulo,
            descricao: b.descricao,
            ordem: b.ordem
          }));
        const blocoMap = new Map(blocos.map(b => [b.id, b]));

        return {
        id: p.id,
        titulo: p.titulo,
        descricao: p.descricao || '',
        ativa: p.ativa,
        createdAt: p.created_at,
        blocos,
        perguntas: (p.perguntas || [])
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map((q: any): Question => ({
            id: q.id,
            text: q.texto,
            type: q.tipo as Question['type'],
            promptType: (q.tipo_pergunta || 'estimulada') as Question['promptType'],
            options: q.opcoes || undefined,
            suggestedOptions: q.opcoes_sugeridas || undefined,
            allowOther: q.permite_outro || false,
            required: q.obrigatoria
            blockId: q.bloco_id || null,
            blockTitle: q.bloco_id ? blocoMap.get(q.bloco_id)?.titulo || null : null
          }))
        };
      });
    }
  });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (survey: { titulo: string; descricao: string; perguntas: Omit<Question, 'id'>[]; blocos?: { titulo: string; descricao?: string | null }[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create survey
      const { data: pesquisa, error: surveyError } = await supabase
        .from('pesquisas')
        .insert({
          titulo: survey.titulo,
          descricao: survey.descricao,
          created_by: user.id
        })
        .select('id')
        .single();

      if (surveyError) throw surveyError;

      // Create blocks
      const blockIdByIndex = new Map<number, string>();
      if (survey.blocos && survey.blocos.length > 0) {
        const { data: createdBlocks, error: blocksError } = await supabase
          .from('blocos_perguntas')
          .insert(
            survey.blocos.map((b, index) => ({
              pesquisa_id: pesquisa.id,
              titulo: b.titulo,
              descricao: b.descricao || null,
              ordem: index
            }))
          )
          .select('id, ordem');

        if (blocksError) throw blocksError;
        (createdBlocks || []).forEach((b: any) => blockIdByIndex.set(b.ordem, b.id));
      }

      // Create questions
      if (survey.perguntas.length > 0) {
        const { error: questionsError } = await supabase
          .from('perguntas')
          .insert(
            survey.perguntas.map((q, index) => ({
              pesquisa_id: pesquisa.id,
              bloco_id: (() => {
                if (!q.blockId || !survey.blocos?.length) return null;
                const blockIndex = survey.blocos.findIndex(b => b.id === q.blockId);
                return blockIndex >= 0 ? blockIdByIndex.get(blockIndex) || null : null;
              })(),
              texto: q.text,
              tipo: q.type,
              tipo_pergunta: q.promptType || 'estimulada',
              opcoes: q.options || null,
              opcoes_sugeridas: q.suggestedOptions || null,
              permite_outro: q.allowOther || false,
              obrigatoria: q.required || false,
              ordem: index
            }))
          );

        if (questionsError) throw questionsError;
      }

      return pesquisa.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      queryClient.invalidateQueries({ queryKey: ['all-surveys'] });
    }
  });
}

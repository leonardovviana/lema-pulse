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
          perguntas (
            id,
            texto,
            tipo,
            opcoes,
            obrigatoria,
            ordem
          )
        `)
        .eq('ativa', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (pesquisas || []).map(p => ({
        id: p.id,
        titulo: p.titulo,
        descricao: p.descricao || '',
        ativa: p.ativa,
        createdAt: p.created_at,
        perguntas: (p.perguntas || [])
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map((q: any): Question => ({
            id: q.id,
            text: q.texto,
            type: q.tipo as Question['type'],
            options: q.opcoes || undefined,
            required: q.obrigatoria
          }))
      }));
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
          perguntas (
            id,
            texto,
            tipo,
            opcoes,
            obrigatoria,
            ordem
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!pesquisa) return null;

      return {
        id: pesquisa.id,
        titulo: pesquisa.titulo,
        descricao: pesquisa.descricao || '',
        ativa: pesquisa.ativa,
        createdAt: pesquisa.created_at,
        perguntas: (pesquisa.perguntas || [])
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map((q: any): Question => ({
            id: q.id,
            text: q.texto,
            type: q.tipo as Question['type'],
            options: q.opcoes || undefined,
            required: q.obrigatoria
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
          perguntas (
            id,
            texto,
            tipo,
            opcoes,
            obrigatoria,
            ordem
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (pesquisas || []).map(p => ({
        id: p.id,
        titulo: p.titulo,
        descricao: p.descricao || '',
        ativa: p.ativa,
        createdAt: p.created_at,
        perguntas: (p.perguntas || [])
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map((q: any): Question => ({
            id: q.id,
            text: q.texto,
            type: q.tipo as Question['type'],
            options: q.opcoes || undefined,
            required: q.obrigatoria
          }))
      }));
    }
  });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (survey: { titulo: string; descricao: string; perguntas: Omit<Question, 'id'>[] }) => {
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

      // Create questions
      if (survey.perguntas.length > 0) {
        const { error: questionsError } = await supabase
          .from('perguntas')
          .insert(
            survey.perguntas.map((q, index) => ({
              pesquisa_id: pesquisa.id,
              texto: q.text,
              tipo: q.type,
              opcoes: q.options || null,
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

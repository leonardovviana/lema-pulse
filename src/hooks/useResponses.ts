import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AnswerValue, SurveyResponse } from '@/types/survey';

export function useResponses() {
  return useQuery({
    queryKey: ['responses'],
    queryFn: async (): Promise<SurveyResponse[]> => {
      const { data, error } = await supabase
        .from('respostas')
        .select(`
          id,
          pesquisa_id,
          entrevistador_id,
          respostas,
          audio_url,
          latitude,
          longitude,
          synced,
          client_id,
          created_at,
          pesquisas (
            titulo
          ),
          profiles:profiles!respostas_entrevistador_profile_fkey (
            nome
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(r => ({
        id: r.id,
        surveyId: r.pesquisa_id,
        surveyTitulo: (r.pesquisas as { titulo?: string } | null)?.titulo || 'Pesquisa Desconhecida',
        entrevistadorId: r.entrevistador_id,
        entrevistadorNome: (r.profiles as { nome?: string } | null)?.nome || 'Desconhecido',
        respostas: r.respostas as Record<string, AnswerValue>,
        audioBlob: r.audio_url || undefined,
        gps: r.latitude && r.longitude ? {
          latitude: r.latitude,
          longitude: r.longitude
        } : null,
        timestamp: r.created_at,
        synced: r.synced
      }));
    }
  });
}

export function useMyResponses() {
  return useQuery({
    queryKey: ['my-responses'],
    queryFn: async (): Promise<SurveyResponse[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('respostas')
        .select(`
          id,
          pesquisa_id,
          entrevistador_id,
          respostas,
          audio_url,
          latitude,
          longitude,
          synced,
          created_at,
          pesquisas (
            titulo
          )
        `)
        .eq('entrevistador_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(r => ({
        id: r.id,
        surveyId: r.pesquisa_id,
        surveyTitulo: (r.pesquisas as { titulo?: string } | null)?.titulo || 'Pesquisa Desconhecida',
        entrevistadorId: r.entrevistador_id,
        entrevistadorNome: '',
        respostas: r.respostas as Record<string, AnswerValue>,
        audioBlob: r.audio_url || undefined,
        gps: r.latitude && r.longitude ? {
          latitude: r.latitude,
          longitude: r.longitude
        } : null,
        timestamp: r.created_at,
        synced: r.synced
      }));
    }
  });
}

export function useDailyStats() {
  return useQuery({
    queryKey: ['daily-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('metas_diarias')
        .select('*')
        .eq('entrevistador_id', user.id)
        .eq('data', today)
        .maybeSingle();

      if (error) throw error;
      
      return data || { meta: 10, concluidas: 0 };
    }
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Total responses
      const { count: totalResponses } = await supabase
        .from('respostas')
        .select('*', { count: 'exact', head: true });

      // Today's responses
      const today = new Date().toISOString().split('T')[0];
      const { count: todayResponses } = await supabase
        .from('respostas')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Active interviewers (those with responses today)
      const { data: activeInterviewers } = await supabase
        .from('respostas')
        .select('entrevistador_id')
        .gte('created_at', today);

      const uniqueInterviewers = new Set(activeInterviewers?.map(r => r.entrevistador_id) || []);

      // Active surveys
      const { count: activeSurveys } = await supabase
        .from('pesquisas')
        .select('*', { count: 'exact', head: true })
        .eq('ativa', true);

      return {
        totalResponses: totalResponses || 0,
        todayResponses: todayResponses || 0,
        activeInterviewers: uniqueInterviewers.size,
        activeSurveys: activeSurveys || 0
      };
    }
  });
}

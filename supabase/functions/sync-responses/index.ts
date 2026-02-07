import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncPayload {
  responses: Array<{
    id: string;
    surveyId: string;
    respostas: Record<string, string | string[]>;
    audioBase64?: string;
    latitude?: number;
    longitude?: number;
    timestamp: string;
    clientId: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token for RLS
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: SyncPayload = await req.json();
    const { responses } = payload;

    if (!responses || !Array.isArray(responses)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: responses array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    const errors = [];

    for (const response of responses) {
      try {
        // Check if already synced (idempotency via client_id)
        const { data: existing } = await supabaseClient
          .from('respostas')
          .select('id')
          .eq('client_id', response.clientId)
          .maybeSingle();

        if (existing) {
          results.push({ clientId: response.clientId, status: 'already_synced', id: existing.id });
          continue;
        }

        let audioUrl: string | null = null;

        // Upload audio if provided
        if (response.audioBase64) {
          const audioBuffer = Uint8Array.from(atob(response.audioBase64), c => c.charCodeAt(0));
          const audioPath = `${user.id}/${response.clientId}.webm`;
          
          const { error: uploadError } = await supabaseClient.storage
            .from('audio-recordings')
            .upload(audioPath, audioBuffer, {
              contentType: 'audio/webm',
              upsert: true
            });

          if (!uploadError) {
            const { data: urlData } = supabaseClient.storage
              .from('audio-recordings')
              .getPublicUrl(audioPath);
            audioUrl = urlData.publicUrl;
          }
        }

        // Insert response
        const { data: inserted, error: insertError } = await supabaseClient
          .from('respostas')
          .insert({
            pesquisa_id: response.surveyId,
            entrevistador_id: user.id,
            respostas: response.respostas,
            audio_url: audioUrl,
            latitude: response.latitude,
            longitude: response.longitude,
            client_id: response.clientId,
            synced: true,
            created_at: response.timestamp
          })
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }

        // Update daily stats
        const today = new Date().toISOString().split('T')[0];
        await supabaseClient.rpc('increment_daily_completed', {
          p_entrevistador_id: user.id,
          p_data: today
        }).catch(() => {
          // Ignore if function doesn't exist, stats are optional
        });

        results.push({ clientId: response.clientId, status: 'synced', id: inserted.id });
      } catch (err) {
        errors.push({ clientId: response.clientId, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: results.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

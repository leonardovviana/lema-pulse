import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // Service role client — used for ALL operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify caller identity via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticacao ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token invalido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check admin role directly via service role client (no RPC dependency)
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !adminRole) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado — somente administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { name, code } = await req.json()

    if (!code || code.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Codigo deve ter no minimo 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!name || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nome e obrigatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user with dummy email
    const email = `${code}@lema.pulse`
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: code,
      email_confirm: true,
      user_metadata: { nome: name.trim() }
    })

    if (error) {
      // Handle duplicate user
      if (error.message?.includes('already') || error.message?.includes('duplicate')) {
        return new Response(
          JSON.stringify({ error: 'Ja existe um entrevistador com esse codigo' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw error
    }

    const newUserId = data.user?.id
    if (newUserId) {
      // Upsert profile (in case trigger already created it)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({ user_id: newUserId, nome: name.trim() }, { onConflict: 'user_id' })

      if (profileError) {
        console.error('Profile error:', profileError)
        // Non-fatal — continue
      }

      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: newUserId, role: 'entrevistador' }, { onConflict: 'user_id,role' })

      if (roleInsertError) {
        console.error('Role error:', roleInsertError)
        // Non-fatal — continue
      }
    }

    return new Response(
      JSON.stringify({ user: data.user, code }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('create-user error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno ao criar entrevistador' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

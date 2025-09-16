// Importa as ferramentas necessárias
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Edge Function 'delete-user' está pronta.");

Deno.serve(async (req) => {
  // Lida com o pedido de verificação CORS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Cria um cliente Supabase com o token de autenticação do utilizador que fez o pedido.
    // Isto é crucial para saber QUEM está a pedir para apagar a conta.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 2. Obtém os dados do utilizador a partir do token.
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError) throw userError;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Utilizador não autenticado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const userId = user.id;
    console.log(`A tentar apagar o utilizador com ID: ${userId}`);

    // 3. Cria um cliente Supabase com privilégios de administrador para poder apagar o utilizador.
    // Isto é seguro porque a chave de serviço (service_role_key) só existe no servidor.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Apaga o utilizador do sistema de autenticação do Supabase.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error(`Erro ao apagar utilizador ${userId}:`, deleteError.message);
      throw new Error(`Não foi possível apagar o utilizador: ${deleteError.message}`);
    }

    console.log(`Utilizador ${userId} apagado com sucesso.`);

    // 5. Retorna uma resposta de sucesso.
    return new Response(JSON.stringify({ message: 'Conta apagada com sucesso.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na função delete-user:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
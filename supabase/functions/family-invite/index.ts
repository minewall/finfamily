import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { email, inviterName, role, pessoaName, familyName, redirectTo } = await req.json();

    if (!email || typeof email !== 'string') {
      return json(400, { error: { type: 'invalid_input', message: 'email obrigatório' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json(500, { error: { type: 'config', message: 'SUPABASE_URL ou SERVICE_ROLE_KEY ausente' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const inviteOpts: Record<string, unknown> = {
      data: {
        invited_by: inviterName || null,
        family_name: familyName || null,
        role: role || 'member',
        pessoa_name: pessoaName || null,
      },
    };
    if (redirectTo) inviteOpts.redirectTo = redirectTo;

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, inviteOpts);

    if (error) {
      // Caso típico: usuário já existe. O vínculo via family_members continua válido
      // (acceptPendingInvite no login amarra), então retornamos info clara ao frontend.
      const alreadyExists =
        error.message?.toLowerCase().includes('already') ||
        error.message?.toLowerCase().includes('registered') ||
        (error as { status?: number }).status === 422;

      console.error('[family-invite] Supabase error:', error);
      return json(alreadyExists ? 200 : 500, {
        sent: false,
        alreadyExists,
        error: { type: 'supabase_invite', message: error.message },
      });
    }

    console.log(`[family-invite] sent to ${email} (redirectTo=${redirectTo || 'default'})`);
    return json(200, { sent: true, alreadyExists: false, userId: data?.user?.id || null });
  } catch (e) {
    console.error('[family-invite] exception:', e);
    return json(500, { error: { type: 'exception', message: (e as Error).message } });
  }
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

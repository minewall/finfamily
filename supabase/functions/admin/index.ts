// ═══════════════════════════════════════════════════════════════════
// EDGE FUNCTION: admin
// Operações administrativas protegidas por role='admin' no profiles.
// Ações disponíveis: listUsers, setTier, setRole, deleteUser, exportUser, stats
// ═══════════════════════════════════════════════════════════════════
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// [M1] CORS restritivo: allowlist de origens permitidas.
const ALLOWED_ORIGINS = new Set([
  'https://haile.com.br',
  'https://www.haile.com.br',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
]);
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://haile.com.br';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });

  const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY   = Deno.env.get('SERVICE_ROLE_KEY')!;
  const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;

  // ── Auth: verify caller is an admin user ─────────────────────────
  const authHeader = req.headers.get('authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json(401, { error: 'Unauthorized' }, req);

  // Use anon client to verify the JWT and get the caller's user_id
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !user) return json(401, { error: 'Invalid token' }, req);

  // Check role in profiles table
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return json(403, { error: 'Forbidden: admin only' }, req);

  // ── Dispatch action ───────────────────────────────────────────────
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }, req); }

  const { action, ...params } = body as { action: string; [k: string]: unknown };

  try {
    switch (action) {

      // List all users with their profile (tier, role, created_at)
      case 'listUsers': {
        const { data, error } = await adminClient
          .from('profiles')
          .select('id, email, full_name, role, tier, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit((params.limit as number) || 100);
        if (error) return json(500, { error: error.message }, req);
        return json(200, { users: data }, req);
      }

      // Change tier for a user: { userId, tier }
      case 'setTier': {
        const { userId, tier } = params as { userId: string; tier: string };
        if (!userId || !tier) return json(400, { error: 'userId and tier required' }, req);
        const valid = ['free', 'plus', 'premium', 'suspended'];
        if (!valid.includes(tier)) return json(400, { error: `tier must be one of: ${valid.join(', ')}` }, req);
        const { error } = await adminClient
          .from('profiles')
          .update({ tier })
          .eq('id', userId);
        if (error) return json(500, { error: error.message }, req);
        console.log(`[admin] setTier userId=${userId} tier=${tier} by admin=${user.id}`);
        return json(200, { ok: true }, req);
      }

      // Change role for a user: { userId, role } — use with care
      case 'setRole': {
        const { userId, role } = params as { userId: string; role: string };
        if (!userId || !role) return json(400, { error: 'userId and role required' }, req);
        const valid = ['user', 'admin'];
        if (!valid.includes(role)) return json(400, { error: `role must be one of: ${valid.join(', ')}` }, req);
        const { error } = await adminClient
          .from('profiles')
          .update({ role })
          .eq('id', userId);
        if (error) return json(500, { error: error.message }, req);
        console.log(`[admin] setRole userId=${userId} role=${role} by admin=${user.id}`);
        return json(200, { ok: true }, req);
      }

      // Delete user account + all data: { userId }
      case 'deleteUser': {
        const { userId } = params as { userId: string };
        if (!userId) return json(400, { error: 'userId required' }, req);
        if (userId === user.id) return json(400, { error: 'Cannot delete yourself' }, req);
        // CASCADE on auth.users → profiles, user_data, family_members
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) return json(500, { error: error.message }, req);
        console.log(`[admin] deleteUser userId=${userId} by admin=${user.id}`);
        return json(200, { ok: true }, req);
      }

      // Export all data for a user (LGPD): { userId }
      case 'exportUser': {
        const { userId } = params as { userId: string };
        if (!userId) return json(400, { error: 'userId required' }, req);
        const [profileRes, userDataRes, membersRes] = await Promise.all([
          adminClient.from('profiles').select('*').eq('id', userId).single(),
          adminClient.from('user_data').select('data, updated_at').eq('user_id', userId).single(),
          adminClient.from('family_members').select('*').eq('user_id', userId),
        ]);
        return json(200, {
          profile: profileRes.data,
          store_data: userDataRes.data,
          family_memberships: membersRes.data,
          exported_at: new Date().toISOString(),
        }, req);
      }

      // Waitlist stats — devolve linhas da view public.waitlist_stats
      // (agregação por dia/source; front consolida os números globais)
      case 'waitlistStats': {
        const { data, error } = await adminClient
          .from('waitlist_stats')
          .select('*');
        if (error) return json(500, { error: error.message }, req);
        return json(200, { stats: data }, req);
      }

      // Lista leads da waitlist — paginação simples + filtros opcionais
      // params: { limit?: number<=500, source?, invited?: bool, converted?: bool }
      case 'listWaitlist': {
        const limit = Math.min((params.limit as number) || 50, 500);
        let q = adminClient
          .from('waitlist')
          .select('id, name, email, profile, source, invited_at, signup_at, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (params.source)              q = q.eq('source', params.source as string);
        if (params.invited === false)   q = q.is('invited_at', null);
        if (params.invited === true)    q = q.not('invited_at', 'is', null);
        if (params.converted === true)  q = q.not('signup_at', 'is', null);
        if (params.converted === false) q = q.is('signup_at', null);
        const { data, error } = await q;
        if (error) return json(500, { error: error.message }, req);
        return json(200, { leads: data }, req);
      }

      // Proxy interno para a Edge Function waitlist-launch.
      // Encapsula o service role: o cliente nunca recebe a chave.
      case 'launchWaitlist': {
        const batchSize = (params.batchSize as number) || 50;
        const source    = params.source as string | undefined;
        const res = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-launch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ batchSize, ...(source ? { source } : {}) }),
        });
        const body = await res.json().catch(() => ({}));
        console.log(`[admin] launchWaitlist batchSize=${batchSize} source=${source ?? 'all'} by admin=${user.id}`);
        return json(res.status, body, req);
      }

      // App stats: total users, by tier, MAU estimate
      case 'stats': {
        const { data: counts } = await adminClient
          .from('profiles')
          .select('tier, created_at');
        if (!counts) return json(500, { error: 'Could not fetch stats' }, req);
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const byTier = counts.reduce((acc: Record<string, number>, p) => {
          acc[p.tier] = (acc[p.tier] || 0) + 1;
          return acc;
        }, {});
        const newLast30 = counts.filter(p => p.created_at >= thirtyDaysAgo).length;
        return json(200, {
          total: counts.length,
          by_tier: byTier,
          new_last_30_days: newLast30,
          as_of: now.toISOString(),
        }, req);
      }

      default:
        return json(400, { error: `Unknown action: ${action}` }, req);
    }
  } catch (e) {
    console.error(`[admin] action=${action} exception:`, e);
    return json(500, { error: (e as Error).message }, req);
  }
});

function json(status: number, body: unknown, req?: Request) {
  const cors = req ? corsHeaders(req) : { 'Access-Control-Allow-Origin': 'https://haile.com.br' };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}

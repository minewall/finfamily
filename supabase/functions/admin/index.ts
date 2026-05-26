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
        if (error) { console.error("[admin] db error:", error); return json(500, { error: "Erro ao processar a operação" }, req); }
        return json(200, { users: data }, req);
      }

      // Change tier for a user: { userId, tier }
      case 'setTier': {
        const { userId, tier } = params as { userId: string; tier: string };
        if (!userId || !tier) return json(400, { error: 'userId and tier required' }, req);
        const valid = ['free', 'always_free', 'plus', 'premium', 'suspended'];
        if (!valid.includes(tier)) return json(400, { error: `tier must be one of: ${valid.join(', ')}` }, req);
        const { error } = await adminClient
          .from('profiles')
          .update({ tier })
          .eq('id', userId);
        if (error) { console.error("[admin] db error:", error); return json(500, { error: "Erro ao processar a operação" }, req); }
        console.log(`[admin] setTier userId=${userId} tier=${tier} by admin=${user.id}`);
        return json(200, { ok: true }, req);
      }

      // Suspend user — preserva o tier atual em previous_tier
      case 'suspendUser': {
        const { userId } = params as { userId: string };
        if (!userId) return json(400, { error: 'userId required' }, req);
        if (userId === user.id) return json(400, { error: 'Cannot suspend yourself' }, req);
        // Lê tier atual pra salvar em previous_tier
        const { data: p } = await adminClient.from('profiles').select('tier').eq('id', userId).single();
        const prev = p?.tier && p.tier !== 'suspended' ? p.tier : 'free';
        const { error } = await adminClient
          .from('profiles')
          .update({ tier: 'suspended', previous_tier: prev })
          .eq('id', userId);
        if (error) { console.error("[admin] db error:", error); return json(500, { error: "Erro ao processar a operação" }, req); }
        console.log(`[admin] suspendUser userId=${userId} previous_tier=${prev} by admin=${user.id}`);
        return json(200, { ok: true, previous_tier: prev }, req);
      }

      // Reactivate user — restaura previous_tier (ou 'free' se não houver)
      case 'reactivateUser': {
        const { userId } = params as { userId: string };
        if (!userId) return json(400, { error: 'userId required' }, req);
        const { data: p } = await adminClient.from('profiles').select('previous_tier').eq('id', userId).single();
        const restoreTo = p?.previous_tier || 'free';
        const { error } = await adminClient
          .from('profiles')
          .update({ tier: restoreTo, previous_tier: null })
          .eq('id', userId);
        if (error) { console.error("[admin] db error:", error); return json(500, { error: "Erro ao processar a operação" }, req); }
        console.log(`[admin] reactivateUser userId=${userId} restored_to=${restoreTo} by admin=${user.id}`);
        return json(200, { ok: true, restored_to: restoreTo }, req);
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
        if (error) { console.error("[admin] db error:", error); return json(500, { error: "Erro ao processar a operação" }, req); }
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
        if (error) { console.error("[admin] db error:", error); return json(500, { error: "Erro ao processar a operação" }, req); }
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
        if (error) { console.error("[admin] db error:", error); return json(500, { error: "Erro ao processar a operação" }, req); }
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
        if (error) { console.error("[admin] db error:", error); return json(500, { error: "Erro ao processar a operação" }, req); }
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

      // AI usage stats: KPIs do mês + caps por tier + top users
      case 'aiUsageStats': {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Caps por tier
        const { data: caps } = await adminClient
          .from('ai_usage_caps')
          .select('tier, cap_tokens_month, soft_cap_pct')
          .order('cap_tokens_month');

        // Agregado do mês
        const { data: usage } = await adminClient
          .from('ai_usage')
          .select('user_id, input_tokens, output_tokens, cost_micro_usd')
          .gte('occurred_at', monthStart);

        const usageByUser: Record<string, { tokens: number; cost: number; requests: number }> = {};
        let totalTokens = 0, totalCost = 0, totalRequests = 0;
        for (const u of (usage || [])) {
          const t = (u.input_tokens || 0) + (u.output_tokens || 0);
          if (!usageByUser[u.user_id]) usageByUser[u.user_id] = { tokens: 0, cost: 0, requests: 0 };
          usageByUser[u.user_id].tokens   += t;
          usageByUser[u.user_id].cost     += (u.cost_micro_usd || 0);
          usageByUser[u.user_id].requests += 1;
          totalTokens   += t;
          totalCost     += (u.cost_micro_usd || 0);
          totalRequests += 1;
        }

        // Lookup tier + email pros top 20 users
        const topIds = Object.entries(usageByUser)
          .sort((a, b) => b[1].tokens - a[1].tokens)
          .slice(0, 20)
          .map(([uid]) => uid);
        let profilesByUser: Record<string, { email?: string; full_name?: string; tier?: string }> = {};
        if (topIds.length > 0) {
          const { data: profs } = await adminClient
            .from('profiles')
            .select('id, email, full_name, tier')
            .in('id', topIds);
          profilesByUser = Object.fromEntries((profs || []).map(p => [p.id, p]));
        }
        const capByTier: Record<string, number> = Object.fromEntries(
          (caps || []).map((c: any) => [c.tier, c.cap_tokens_month])
        );

        const topUsers = topIds.map(uid => {
          const u = usageByUser[uid];
          const p = profilesByUser[uid] || {};
          return {
            user_id:              uid,
            email:                p.email,
            full_name:            p.full_name,
            tier:                 p.tier || 'free',
            total_tokens:         u.tokens,
            total_cost_micro_usd: u.cost,
            request_count:        u.requests,
            cap_tokens:           capByTier[p.tier || 'free'] || 0,
          };
        });

        return json(200, {
          caps:                caps || [],
          totalTokens,
          totalCostMicroUsd:   totalCost,
          totalRequests,
          activeUsers:         Object.keys(usageByUser).length,
          topUsers,
          monthStart,
        }, req);
      }

      // Global app_settings — read all
      case 'getGlobalSettings': {
        const { data, error } = await adminClient
          .from('app_settings')
          .select('key, value, description, updated_at');
        if (error) return json(500, { error: error.message }, req);
        return json(200, { settings: data || [] }, req);
      }

      // Global app_settings — set { key, value }
      case 'setGlobalSetting': {
        const { key, value } = params as { key: string; value: unknown };
        if (!key) return json(400, { error: 'key required' }, req);
        // upsert
        const { error } = await adminClient
          .from('app_settings')
          .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });
        if (error) return json(500, { error: error.message }, req);
        console.log(`[admin] setGlobalSetting key=${key} by admin=${user.id}`);
        return json(200, { ok: true }, req);
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

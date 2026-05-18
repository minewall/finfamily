// ═══════════════════════════════════════════════════════════════════
// EDGE FUNCTION: admin
// Operações administrativas protegidas por role='admin' no profiles.
// Ações disponíveis: listUsers, setTier, setRole, deleteUser, exportUser, stats
// ═══════════════════════════════════════════════════════════════════
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY   = Deno.env.get('SERVICE_ROLE_KEY')!;
  const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;

  // ── Auth: verify caller is an admin user ─────────────────────────
  const authHeader = req.headers.get('authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json(401, { error: 'Unauthorized' });

  // Use anon client to verify the JWT and get the caller's user_id
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !user) return json(401, { error: 'Invalid token' });

  // Check role in profiles table
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return json(403, { error: 'Forbidden: admin only' });

  // ── Dispatch action ───────────────────────────────────────────────
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }); }

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
        if (error) return json(500, { error: error.message });
        return json(200, { users: data });
      }

      // Change tier for a user: { userId, tier }
      case 'setTier': {
        const { userId, tier } = params as { userId: string; tier: string };
        if (!userId || !tier) return json(400, { error: 'userId and tier required' });
        const valid = ['free', 'plus', 'premium', 'suspended'];
        if (!valid.includes(tier)) return json(400, { error: `tier must be one of: ${valid.join(', ')}` });
        const { error } = await adminClient
          .from('profiles')
          .update({ tier })
          .eq('id', userId);
        if (error) return json(500, { error: error.message });
        console.log(`[admin] setTier userId=${userId} tier=${tier} by admin=${user.id}`);
        return json(200, { ok: true });
      }

      // Change role for a user: { userId, role } — use with care
      case 'setRole': {
        const { userId, role } = params as { userId: string; role: string };
        if (!userId || !role) return json(400, { error: 'userId and role required' });
        const valid = ['user', 'admin'];
        if (!valid.includes(role)) return json(400, { error: `role must be one of: ${valid.join(', ')}` });
        const { error } = await adminClient
          .from('profiles')
          .update({ role })
          .eq('id', userId);
        if (error) return json(500, { error: error.message });
        console.log(`[admin] setRole userId=${userId} role=${role} by admin=${user.id}`);
        return json(200, { ok: true });
      }

      // Delete user account + all data: { userId }
      case 'deleteUser': {
        const { userId } = params as { userId: string };
        if (!userId) return json(400, { error: 'userId required' });
        if (userId === user.id) return json(400, { error: 'Cannot delete yourself' });
        // CASCADE on auth.users → profiles, user_data, family_members
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) return json(500, { error: error.message });
        console.log(`[admin] deleteUser userId=${userId} by admin=${user.id}`);
        return json(200, { ok: true });
      }

      // Export all data for a user (LGPD): { userId }
      case 'exportUser': {
        const { userId } = params as { userId: string };
        if (!userId) return json(400, { error: 'userId required' });
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
        });
      }

      // App stats: total users, by tier, MAU estimate
      case 'stats': {
        const { data: counts } = await adminClient
          .from('profiles')
          .select('tier, created_at');
        if (!counts) return json(500, { error: 'Could not fetch stats' });
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
        });
      }

      default:
        return json(400, { error: `Unknown action: ${action}` });
    }
  } catch (e) {
    console.error(`[admin] action=${action} exception:`, e);
    return json(500, { error: (e as Error).message });
  }
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

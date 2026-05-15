/* ═══════════════════════════════════════════════════════════════════
   SUPABASE-CLIENT.JS — Supabase connection + hybrid sync layer
   Estratégia: localStorage como cache local (instant), Supabase em background (sync)
═══════════════════════════════════════════════════════════════════ */
'use strict';

const SupabaseSync = (function () {
  const SUPABASE_URL = 'https://lpudgulhnfuwdttetwdn.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdWRndWxobmZ1d2R0dGV0d2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Nzg3MDUsImV4cCI6MjA5NDQ1NDcwNX0.cT0l012GjSeWV3mgA_-RIq4MEtrLvTUeGwd_cEuhH84';

  let _client = null;
  let _user   = null;
  let _syncTimer = null;
  let _pendingSync = false;
  let _onStatusChange = null;
  // family context: {groupId, ownerId, role, dataOwnerUserId}
  let _family = null;

  function _emitStatus(status) {
    if (_onStatusChange) _onStatusChange(status);
  }

  function init() {
    if (typeof window.supabase === 'undefined') {
      console.warn('SupabaseSync: SDK not loaded');
      return;
    }
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    _client.auth.onAuthStateChange((event, session) => {
      _user = session?.user || null;
      if (event === 'SIGNED_IN') _pullFromCloud();
    });
    _client.auth.getSession().then(({ data }) => {
      _user = data?.session?.user || null;
    });
  }

  // ── PUSH: localStorage → Supabase (debounced 2s) ─────────────────
  function schedulePush(data) {
    _pendingSync = true;
    _emitStatus('syncing');
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => _pushToCloud(data), 2000);
  }

  async function _pushToCloud(data) {
    if (!_client || !_user) { _emitStatus('offline'); return; }
    // Push to the data owner's record (own row if admin/editor writing to family)
    const targetUserId = (_family && _family.dataOwnerUserId) ? _family.dataOwnerUserId : _user.id;
    // Members (role=member) cannot push — read-only
    if (_family && _family.role === 'member') { _emitStatus('synced'); return; }
    try {
      const row = { user_id: targetUserId, data };
      if (_family) row.family_id = _family.groupId;
      const { error } = await _client.from('user_data').upsert(row, { onConflict: 'user_id' });
      if (error) { console.warn('SupabaseSync push error:', error.message); _emitStatus('error'); }
      else { _pendingSync = false; _emitStatus('synced'); }
    } catch (e) {
      console.warn('SupabaseSync push failed:', e);
      _emitStatus('error');
    }
  }

  // ── PULL: Supabase → localStorage (on login / page load) ─────────
  async function _pullFromCloud() {
    if (!_client || !_user) return null;
    // If member of a family, pull the owner's data
    const targetUserId = (_family && _family.dataOwnerUserId) ? _family.dataOwnerUserId : _user.id;
    try {
      const { data, error } = await _client
        .from('user_data')
        .select('data, updated_at')
        .eq('user_id', targetUserId)
        .single();
      if (error || !data) return null;
      return data.data;
    } catch (e) {
      console.warn('SupabaseSync pull failed:', e);
      return null;
    }
  }

  // ── FAMILY GROUP ──────────────────────────────────────────────────
  async function createOrGetFamilyGroup(name) {
    if (!_client || !_user) return { error: 'Não conectado' };
    // Check if group already exists for this user (owner)
    const { data: existing } = await _client
      .from('family_groups')
      .select('id, name')
      .eq('owner_id', _user.id)
      .maybeSingle();
    if (existing) return { data: existing };
    // Create new
    const { data, error } = await _client
      .from('family_groups')
      .insert({ name: name || 'Minha Família', owner_id: _user.id })
      .select()
      .single();
    if (!error && data) {
      // Link user_data to this family
      await _client.from('user_data').update({ family_id: data.id }).eq('user_id', _user.id);
    }
    return { data, error };
  }

  async function getFamilyGroup() {
    if (!_client || !_user) return null;
    const { data } = await _client
      .from('family_groups')
      .select('id, name')
      .eq('owner_id', _user.id)
      .maybeSingle();
    return data;
  }

  async function getFamilyMembers(groupId) {
    if (!_client || !groupId) return [];
    const { data } = await _client
      .from('family_members')
      .select('id, user_id, role, invited_email, accepted_at, created_at')
      .eq('family_id', groupId)
      .order('created_at');
    return data || [];
  }

  async function inviteMember(email, role) {
    if (!_client || !_user) return { error: 'Não conectado' };
    // Ensure group exists first
    const { data: group, error: ge } = await createOrGetFamilyGroup();
    if (ge || !group) return { error: 'Erro ao criar grupo familiar' };
    // Check if already invited
    const { data: existing } = await _client
      .from('family_members')
      .select('id')
      .eq('family_id', group.id)
      .eq('invited_email', email)
      .maybeSingle();
    if (existing) return { error: 'Este e-mail já foi convidado' };
    const { data, error } = await _client
      .from('family_members')
      .insert({ family_id: group.id, invited_email: email, role, user_id: null })
      .select()
      .single();
    return { data, error };
  }

  async function removeMember(memberId) {
    if (!_client) return;
    await _client.from('family_members').delete().eq('id', memberId);
  }

  // Called on login: check if current user has a pending invite and accept it
  async function acceptPendingInvite() {
    if (!_client || !_user) return null;
    const email = _user.email;
    if (!email) return null;
    // Look for unaccepted invitation matching this email
    const { data: invite } = await _client
      .from('family_members')
      .select('id, family_id, role')
      .eq('invited_email', email)
      .is('accepted_at', null)
      .maybeSingle();
    if (!invite) return null;
    // Accept: set user_id and accepted_at
    const { error } = await _client
      .from('family_members')
      .update({ user_id: _user.id, accepted_at: new Date().toISOString() })
      .eq('id', invite.id);
    if (!error) return invite;
    return null;
  }

  // Resolve family context for the current user (called after login)
  // Returns: null (owner/solo) | {groupId, ownerId, role, dataOwnerUserId}
  async function resolveFamilyContext() {
    if (!_client || !_user) return null;
    // Am I an owner?
    const { data: ownedGroup } = await _client
      .from('family_groups')
      .select('id')
      .eq('owner_id', _user.id)
      .maybeSingle();
    if (ownedGroup) {
      _family = { groupId: ownedGroup.id, ownerId: _user.id, role: 'admin', dataOwnerUserId: _user.id };
      return _family;
    }
    // Am I a member?
    const { data: membership } = await _client
      .from('family_members')
      .select('family_id, role, family_groups(owner_id)')
      .eq('user_id', _user.id)
      .not('accepted_at', 'is', null)
      .maybeSingle();
    if (membership) {
      const ownerId = membership.family_groups?.owner_id;
      _family = {
        groupId: membership.family_id,
        ownerId,
        role: membership.role,
        dataOwnerUserId: ownerId,
      };
      return _family;
    }
    _family = null;
    return null;
  }

  function getFamilyContext() { return _family; }

  // ── AUTH ──────────────────────────────────────────────────────────
  async function signUp(email, password) {
    if (!_client) return { error: 'SDK não carregado' };
    const { data, error } = await _client.auth.signUp({ email, password });
    return { data, error };
  }

  async function signIn(email, password) {
    if (!_client) return { error: 'SDK não carregado' };
    const { data, error } = await _client.auth.signInWithPassword({ email, password });
    if (!error) _user = data.user;
    return { data, error };
  }

  async function signOut() {
    if (!_client) return;
    await _client.auth.signOut();
    _user = null;
    _family = null;
  }

  function getUser() { return _user; }
  function isConnected() { return !!_client && !!_user; }
  function hasPendingSync() { return _pendingSync; }
  function onStatusChange(cb) { _onStatusChange = cb; }

  async function pullFromCloud() { return _pullFromCloud(); }
  async function pushToCloud(data) { return _pushToCloud(data); }

  return {
    init, schedulePush, pullFromCloud, pushToCloud, signUp, signIn, signOut,
    getUser, isConnected, hasPendingSync, onStatusChange,
    createOrGetFamilyGroup, getFamilyGroup, getFamilyMembers,
    inviteMember, removeMember, acceptPendingInvite, resolveFamilyContext, getFamilyContext,
  };
})();

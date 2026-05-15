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

  function _emitStatus(status) {
    // status: 'offline' | 'syncing' | 'synced' | 'error'
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
    // Recupera sessão existente
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
    try {
      const { error } = await _client.from('user_data').upsert({
        user_id: _user.id,
        data: data,
      }, { onConflict: 'user_id' });
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
    try {
      const { data, error } = await _client
        .from('user_data')
        .select('data, updated_at')
        .eq('user_id', _user.id)
        .single();
      if (error || !data) return null;
      return data.data;
    } catch (e) {
      console.warn('SupabaseSync pull failed:', e);
      return null;
    }
  }

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
  }

  function getUser() { return _user; }
  function isConnected() { return !!_client && !!_user; }
  function hasPendingSync() { return _pendingSync; }
  function onStatusChange(cb) { _onStatusChange = cb; }

  async function pullFromCloud() { return _pullFromCloud(); }
  async function pushToCloud(data) { return _pushToCloud(data); }

  return { init, schedulePush, pullFromCloud, pushToCloud, signUp, signIn, signOut, getUser, isConnected, hasPendingSync, onStatusChange };
})();

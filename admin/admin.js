/* ═══════════════════════════════════════════════════════════════════
   ADMIN.JS — Boot compartilhado, auth guard e utilitários
═══════════════════════════════════════════════════════════════════ */
'use strict';

const Admin = (() => {
  // ── Auth guard ────────────────────────────────────────────────────
  // Chama no DOMContentLoaded de cada página. Redireciona se não admin.
  async function boot(pageId) {
    // Sessão local (ff_auth no sessionStorage)
    if (sessionStorage.getItem('ff_auth') !== '1') {
      window.location.replace('../index.html');
      return false;
    }

    // Inicializa Supabase e aguarda sessão
    if (typeof SupabaseSync !== 'undefined') SupabaseSync.init();

    // Marca nav item ativo
    document.querySelectorAll('.admin-nav-item[data-page]').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });

    // Verifica role admin via edge function
    try {
      await waitForSession();
      await SupabaseSync.adminCall('stats'); // lança 403 se não for admin
      return true;
    } catch {
      window.location.replace('../index.html');
      return false;
    }
  }

  // Aguarda até getAccessToken() retornar (max 5s)
  async function waitForSession(maxMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const token = await SupabaseSync.getAccessToken();
      if (token) return token;
      await new Promise(r => setTimeout(r, 200));
    }
    throw new Error('Sessão não encontrada');
  }

  // ── Toast ─────────────────────────────────────────────────────────
  function toast(msg, type = 'success', ms = 3000) {
    let wrap = document.getElementById('admin-toast');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'admin-toast';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = `admin-toast-item ${type}`;
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  // ── Icon (Lucide via CDN — mesma função do app principal) ─────────
  function icon(name, { size = 16, color = 'currentColor', ...attrs } = {}) {
    const a = Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('');
    return `<svg data-lucide="${name}" width="${size}" height="${size}" stroke="${color}"
      viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" class="lucide"${a}><use href="#lucide-${name}"/></svg>`;
  }

  // Substitui <svg data-lucide> por ícones reais via lucide global
  function upgradeIcons(root = document) {
    if (typeof lucide !== 'undefined') lucide.createIcons({ nameAttr: 'data-lucide', rootNode: root });
  }

  // ── Sidebar HTML (injetado em cada página) ────────────────────────
  function renderSidebar(pageId) {
    const nav = [
      { section: 'Painel' },
      { page: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
      { section: 'Gestão' },
      { page: 'users',    icon: 'users',           label: 'Usuários' },
      { page: 'coach',    icon: 'bot',             label: 'Coach & IA' },
      { page: 'usage',    icon: 'activity',        label: 'Uso de IA' },
      { section: 'Sistema' },
      { page: 'logs',     icon: 'scroll-text',     label: 'Logs' },
      { page: 'settings', icon: 'settings-2',      label: 'Configurações' },
      { page: 'lgpd',     icon: 'shield-check',    label: 'LGPD',          soon: true },
    ];

    const items = nav.map(n => {
      if (n.section) return `<div class="admin-nav-section">${n.section}</div>`;
      const active = n.page === pageId ? 'active' : '';
      const href = n.page === 'dashboard' ? 'index.html' : `${n.page}.html`;
      const soon = n.soon ? ' <span style="font-size:9px;color:var(--text-4);margin-left:auto">em breve</span>' : '';
      const click = n.soon ? 'onclick="return false" style="opacity:.45;pointer-events:none"' : '';
      return `<a href="${href}" class="admin-nav-item ${active}" data-page="${n.page}" ${click}>
        <svg data-lucide="${n.icon}" width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#lucide-${n.icon}"/></svg>
        ${n.label}${soon}
      </a>`;
    }).join('');

    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) {
      sidebar.innerHTML = `
        <div class="admin-brand">
          <div class="admin-brand-icon">
            <svg data-lucide="shield" width="16" height="16" stroke="#fff" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#lucide-shield"/></svg>
          </div>
          <div>
            <div class="admin-brand-text">Haile</div>
            <div class="admin-brand-sub">Admin Panel</div>
          </div>
        </div>
        <nav class="admin-nav">${items}</nav>
        <div class="admin-sidebar-footer">
          <a href="../index.html" class="admin-back-link">
            <svg data-lucide="arrow-left" width="13" height="13" stroke="currentColor" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#lucide-arrow-left"/></svg>
            Voltar ao app
          </a>
        </div>`;
    }
    upgradeIcons();
  }

  return { boot, toast, icon, upgradeIcons, renderSidebar };
})();

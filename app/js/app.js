/* ═══════════════════════════════════════════════════════════════════
   APP.JS — Main application: routing, modules, UI
═══════════════════════════════════════════════════════════════════ */
'use strict';

const App = (function () {

  // ── UTILS ──────────────────────────────────────────────────────
  const Utils = {
    currency(n, symbol = 'R$') {
      return symbol + ' ' + Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    pct(n) { return (n * 100).toFixed(1) + '%'; },
    months: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    monthsFull: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
    changeArrow(pct) {
      if (pct > 0)  return `<span class="kpi-change up">▲ ${Math.abs(pct).toFixed(1)}%</span>`;
      if (pct < 0)  return `<span class="kpi-change down">▼ ${Math.abs(pct).toFixed(1)}%</span>`;
      return `<span class="kpi-change flat">— 0%</span>`;
    },
    icon: {
      arrow_up: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      arrow_down: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      warn: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2"/></svg>`,
      check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2"/></svg>`,
    },
    personColor(name) {
      return name === 'Roberto' ? '#3B82F6' : name === 'Mariana' ? '#D946EF' : name === 'Manuela' ? '#22C55E' : '#7C6EF8';
    },
    personInitial(name) { return name ? name[0].toUpperCase() : '?'; },
    // Retorna URL de avatar customizado (settings.pessoaAvatars), se houver.
    // Caso contrário retorna null — o consumidor usa personAvatarHtml().
    // Mantido para compat com handlers de upload custom em Configurações.
    personAvatar(name) {
      if (!name) return null;
      const overrides = (Store?.get?.()?.settings?.pessoaAvatars) || {};
      return overrides[name] || null;
    },
    /**
     * Retorna HTML do avatar padrão (iniciais sobre fundo da cor da pessoa).
     * @param {string} name - nome da pessoa
     * @param {Object} opts - { size?: 28, fontSize?: 12, title?: name }
     */
    personAvatarHtml(name, opts = {}) {
      if (!name) return '<span style="color:var(--text-4)">—</span>';
      const size = opts.size || 28;
      const fontSize = opts.fontSize || Math.round(size * 0.42);
      const color = Utils.personColor(name);
      const initial = Utils.personInitial(name);
      const title = opts.title || name;
      // Se houver foto custom em settings.pessoaAvatars[name], usa
      const custom = Utils.personAvatar(name);
      if (custom) {
        return `<span class="person-avatar" style="width:${size}px;height:${size}px;background:${color};border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0" title="${title}"><img src="${custom}" alt="${name}" style="width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.replaceWith(document.createTextNode('${initial}'))"></span>`;
      }
      return `<span class="person-avatar" style="width:${size}px;height:${size}px;background:${color};color:#fff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:${fontSize}px;font-weight:700;letter-spacing:0" title="${title}">${initial}</span>`;
    },
    fmtDate(dateStr) {
      const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
      const d = new Date(dateStr + 'T12:00:00');
      const dd = String(d.getDate()).padStart(2,'0');
      const mm = String(d.getMonth()+1).padStart(2,'0');
      return `${dd}/${mm} <span style="font-size:10px;color:var(--text-4)">${days[d.getDay()]}</span>`;
    },
  };

  // ── AUTOCOMPLETE ───────────────────────────────────────────────
  function setupAC(inputId, listId, items, onSelect) {
    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);
    if (!input || !list) return;
    function show(q) {
      const matches = q
        ? items.filter(s => s.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
        : [];
      if (!matches.length) { list.classList.remove('open'); return; }
      list.innerHTML = matches.map(s => `<div class="ac-item">${s}</div>`).join('');
      list.classList.add('open');
      list.querySelectorAll('.ac-item').forEach(item => {
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          input.value = item.textContent;
          list.classList.remove('open');
          if (onSelect) onSelect(item.textContent);
        });
      });
    }
    input.addEventListener('input', () => show(input.value));
    input.addEventListener('focus', () => { if (input.value) show(input.value); });
    input.addEventListener('blur',  () => setTimeout(() => list.classList.remove('open'), 150));
  }

  // ── TOAST ──────────────────────────────────────────────────────
  function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: Utils.icon.check, error: Utils.icon.warn, info: Utils.icon.info };
    el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${msg}</span>`;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 250);
    }, 3000);
  }

  // ── MODAL ──────────────────────────────────────────────────────
  const Modal = {
    overlay: null, modal: null,
    init() {
      this.overlay = document.getElementById('modalOverlay');
      document.getElementById('modalClose').addEventListener('click', () => this.close());
      this.overlay.addEventListener('click', e => { if (e.target === this.overlay) this.close(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    },
    open(title, bodyHTML, onSave, onDelete) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = bodyHTML;
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      const deleteBtn = onDelete ? `<button class="btn-danger" id="modalDelete">${icon('trash-2', {size:14})} Excluir</button><div style="flex:1"></div>` : '';
      footer.innerHTML = `${deleteBtn}<button class="btn-secondary" id="modalCancel">Cancelar</button><button class="btn-primary" id="modalSave">Salvar</button>`;
      document.getElementById('modal').appendChild(footer);
      document.getElementById('modalCancel').addEventListener('click', () => this.close());
      if (onSave)   document.getElementById('modalSave').addEventListener('click', onSave);
      if (onDelete) document.getElementById('modalDelete').addEventListener('click', onDelete);
      this.overlay.classList.add('open');
      this.overlay.setAttribute('aria-hidden', 'false');
      // Upgrade lucide icons inside modal
      if (typeof upgradeIcons === 'function') upgradeIcons(document.getElementById('modal'));
    },
    close() {
      this.overlay.classList.remove('open');
      this.overlay.setAttribute('aria-hidden', 'true');
      document.getElementById('modal').querySelectorAll('.modal-footer').forEach(el => el.remove());
    },
  };

  // ── ROUTER ────────────────────────────────────────────────────
  // ── Lucide Icons helper ────────────────────────────────────────
  // Renderiza um placeholder <i data-lucide="..."> que vai virar SVG quando
  // lucide.createIcons() rodar. Use em templates HTML/string.
  // Mapa de migração emoji → Lucide para ícones legados em localStorage
  const _EMOJI_TO_LUCIDE = {
    '🏠':'home','🛒':'shopping-cart','🚗':'car','❤️':'heart','👤':'user-round',
    '🐕':'dog','🎉':'party-popper','🏦':'landmark','💳':'credit-card','👧':'baby',
    '📚':'book-open','🎁':'gift','⚖️':'scale','💰':'banknote','📁':'tag',
    '🐈':'cat','✈️':'plane','🎬':'film','🎮':'gamepad-2','🍔':'utensils',
    '⛽':'fuel','💊':'pill','🏥':'stethoscope','📱':'phone','💼':'briefcase',
    '🛍️':'shopping-bag','🎵':'music','📺':'tv','✨':'sparkles',
  };
  function icon(name, opts = {}) {
    // Migra emoji → Lucide se necessário; fallback pra 'tag' se nome inválido
    let n = name || 'tag';
    if (_EMOJI_TO_LUCIDE[n]) n = _EMOJI_TO_LUCIDE[n];
    if (!/^[a-z0-9-]+$/.test(n)) n = 'tag';
    const size = opts.size || 16;
    const cls = opts.class || '';
    const color = opts.color ? `color:${opts.color};` : '';
    const style = `width:${size}px;height:${size}px;${color}${opts.style || ''}`;
    return `<i data-lucide="${n}" class="lucide-icon ${cls}" style="${style}"></i>`;
  }
  // Chama createIcons() no escopo dado (default: document).
  function upgradeIcons(root) {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try { window.lucide.createIcons({ root: root || document.body }); } catch (_) {}
    }
  }

  // Páginas cujo conteúdo depende do mês/ano selecionado.
  // Outras páginas (Patrimônio, Financiamentos, Investimentos, Metas, Contratos,
  // Cartões, Contas, Simulações, Recados, Reembolsos, Config) não mostram picker.
  const MONTH_AWARE_PAGES = new Set([
    'dashboard',
    'comparativo',
    // lancamentos/receitas/despesas gerenciam o próprio picker inline
  ]);

  const Router = {
    current: 'dashboard',
    pages: {},
    titles: {
      dashboard:     'Visão Geral',
      lancamentos:   'Lançamentos',
      receitas:      'Receitas',
      despesas:      'Despesas',
      contas:        'Contas Bancárias',
      cartoes:       'Cartões de Crédito',
      contratos:     'Contratos',
      reserva:       'Patrimônio',
      metas:         'Metas & Projetos',
      investimentos: 'Investimentos',
      financiamentos: 'Financiamentos',
      simulacoes:    'Simulações',
      patrimonio:    'Patrimônio & Investimentos',
      comparativo:   'Comparativo Mensal',
      config:        'Configurações',
    },
    init() {
      window.addEventListener('hashchange', () => this.route());
      document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', e => {
          e.preventDefault();
          const page = el.dataset.page;
          location.hash = '#' + page;
        });
      });
      this.route();
    },
    route() {
      const hash = location.hash.replace('#', '') || 'dashboard';
      this.navigate(hash);
    },
    navigate(page) {
      if (!this.pages[page]) page = 'dashboard';
      this.current = page;

      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
      });

      document.getElementById('pageTitle').textContent = this.titles[page] || page;

      const container = document.getElementById('pageContainer');
      container.innerHTML = '';
      container.scrollTop = 0;
      document.querySelector('.main')?.scrollTo(0, 0);
      const wrap = document.createElement('div');
      wrap.className = 'page-enter';
      container.appendChild(wrap);
      this.pages[page](wrap);
      // Picker mês/ano inserido dentro da página (não no header)
      if (MONTH_AWARE_PAGES.has(page)) renderPageMonthPicker(wrap);
      upgradeIcons(); // converte placeholders <i data-lucide> em SVGs
      // Liga handlers do Coach inline contextual (dismiss + ações)
      try { bindCoachInline(wrap); } catch (e) { /* helper opcional */ }
    },
    register(name, fn) { this.pages[name] = fn; },
  };

  // ── SHARED month/year state ───────────────────────────────────
  function getMonth() { return parseInt(document.getElementById('globalMonth').value, 10); }
  function getYear()  {
    const sel = document.getElementById('globalYear');
    return sel ? parseInt(sel.value, 10) : Store.get().settings.ano;
  }

  // Renderiza picker mês/ano contextual no topo de páginas month-aware.
  // Insere ANTES do primeiro filho do container (ou na posição indicada).
  // Sincroniza com #globalMonth/#globalYear (estado global) e dispara
  // change neles ao mudar — Router já reage e re-renderiza a página.
  function renderPageMonthPicker(target) {
    if (!target || target.querySelector?.('.page-month-picker')) return;
    const m = getMonth(), y = getYear();
    const monthsFull = Utils.monthsFull;
    const yearsOpts = ['2024','2025','2026','2027','2028'];
    const html = `
<div class="page-month-picker">
  <button type="button" class="page-mp-arrow" data-mp-prev aria-label="Mês anterior">‹</button>
  <select class="page-mp-select" data-mp-month>
    ${monthsFull.map((mn,i) => `<option value="${i+1}"${i+1===m?' selected':''}>${mn}</option>`).join('')}
  </select>
  <select class="page-mp-select page-mp-year" data-mp-year>
    ${yearsOpts.map(yr => `<option value="${yr}"${parseInt(yr)===y?' selected':''}>${yr}</option>`).join('')}
  </select>
  <button type="button" class="page-mp-arrow" data-mp-next aria-label="Próximo mês">›</button>
</div>`;
    const tmp = document.createElement('div');
    tmp.innerHTML = html.trim();
    const node = tmp.firstChild;
    target.insertBefore(node, target.firstChild);

    function syncAndReload(month, year) {
      document.getElementById('globalMonth').value = month;
      document.getElementById('globalYear').value = year;
      document.getElementById('globalMonth').dispatchEvent(new Event('change'));
    }

    node.querySelector('[data-mp-month]').addEventListener('change', e => {
      syncAndReload(parseInt(e.target.value, 10), getYear());
    });
    node.querySelector('[data-mp-year]').addEventListener('change', e => {
      syncAndReload(getMonth(), parseInt(e.target.value, 10));
    });
    node.querySelector('[data-mp-prev]').addEventListener('click', () => {
      let mm = getMonth(), yy = getYear();
      mm -= 1; if (mm < 1) { mm = 12; yy -= 1; }
      syncAndReload(mm, yy);
    });
    node.querySelector('[data-mp-next]').addEventListener('click', () => {
      let mm = getMonth(), yy = getYear();
      mm += 1; if (mm > 12) { mm = 1; yy += 1; }
      syncAndReload(mm, yy);
    });
  }

  // ── PERÍODO toggle (compartilhado entre Lançamentos/Receitas/Despesas) ──
  function periodRangeFor(p, month, year) {
    if (p === 'ano') return { start: 1, end: 12, label: `${year}` };
    if (p === 'sem') {
      const h1 = month <= 6;
      return { start: h1?1:7, end: h1?6:12, label: `${h1?'H1':'H2'} ${year} (${Utils.months[h1?0:6]}–${Utils.months[h1?5:11]})` };
    }
    if (p === 'tri') {
      const q = Math.ceil(month / 3);
      const s = (q-1)*3 + 1;
      return { start: s, end: s+2, label: `Q${q} ${year} (${Utils.months[s-1]}–${Utils.months[s+1]})` };
    }
    return { start: month, end: month, label: `${Utils.monthsFull[month-1]} ${year}` };
  }

  /**
   * Coach inline contextual — banner com avatar Hai + insight da tela.
   * Renderiza no formato compacto (1 linha de texto + 1-2 ações).
   *
   * @param {Object} cfg
   *   @param {string} cfg.contexto   - chip de contexto (ex: "Receitas · Maio")
   *   @param {string} cfg.titulo     - título curto
   *   @param {string} cfg.texto      - corpo do insight (suporta HTML inline)
   *   @param {string} [cfg.tone]     - 'positive' | 'attention' | 'critical' | 'neutral' (default)
   *   @param {Array<{label, action, color}>} [cfg.acoes] - botões (max 2)
   *   @param {string} [cfg.id]       - id do bloco (para event handlers únicos)
   */
  function coachInlineHTML(cfg) {
    if (!cfg) return '';
    const tone = cfg.tone || 'neutral';
    const id = cfg.id || 'coachInline_' + Math.random().toString(36).slice(2, 7);
    const acoes = (cfg.acoes || []).slice(0, 2);
    return `
<div class="coach-inline-card coach-inline--${tone} mb-4" id="${id}">
  <div class="coach-inline-avatar">
    <img src="/assets/favicon/apple-touch-icon-180.png" alt="Coach" width="36" height="36" style="border-radius:50%;object-fit:cover"/>
  </div>
  <div class="coach-inline-body">
    <div class="coach-inline-header">
      <span class="coach-inline-titulo">${cfg.titulo || 'Análise do Coach'}</span>
      ${cfg.contexto ? `<span class="coach-inline-label">${cfg.contexto}</span>` : ''}
    </div>
    <div class="coach-inline-texto">${cfg.texto || ''}</div>
    ${acoes.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      ${acoes.map((a, i) => `<button data-coach-action="${a.action || ''}" data-coach-host="${id}" style="background:${i === 0 ? 'var(--teal-coach-dim)' : 'transparent'};color:${i === 0 ? 'var(--teal-coach)' : 'var(--text-2)'};border:1px solid ${i === 0 ? 'rgba(45,207,192,0.3)' : 'var(--border)'};border-radius:8px;padding:6px 14px;font-size:12px;font-weight:500;cursor:pointer">${a.label}</button>`).join('')}
    </div>` : ''}
  </div>
  <button class="coach-inline-dismiss" data-coach-dismiss="${id}" title="Dispensar" style="background:none;border:none;color:var(--text-3);padding:4px;cursor:pointer;align-self:flex-start;display:flex">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </button>
</div>`;
  }

  /**
   * Liga os botões de dismiss/ação do Coach inline. Roda 1x após render.
   */
  function bindCoachInline(container) {
    container.querySelectorAll('[data-coach-dismiss]').forEach(b => {
      b.addEventListener('click', () => {
        const host = document.getElementById(b.dataset.coachDismiss);
        if (host) host.style.display = 'none';
      });
    });
    container.querySelectorAll('[data-coach-action]').forEach(b => {
      b.addEventListener('click', () => {
        const act = b.dataset.coachAction;
        // Ações padrão: abrir painel do Coach
        if (act === 'open-coach' || !act) {
          document.getElementById('coachToggleBtn')?.click();
        }
        // Outras ações: deixa o handler específico cuidar
      });
    });
  }

  function periodToggleHTML(stateKey, current) {
    return `<div class="period-toggle-bar" data-period-toggle="${stateKey}">
      ${[['mes','Mês'],['tri','Trimestre'],['sem','Semestre'],['ano','Ano']].map(([k,l]) =>
        `<button class="btn-secondary ${current===k?'active':''}" data-period="${k}" style="padding:6px 12px;font-size:12px">${l}</button>`
      ).join('')}
    </div>`;
  }

  function bindPeriodToggle(container, stateKey, onChange) {
    container.querySelectorAll(`[data-period-toggle="${stateKey}"] [data-period]`).forEach(btn => {
      btn.addEventListener('click', () => {
        localStorage.setItem(stateKey, btn.dataset.period);
        onChange();
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: DASHBOARD
  // ══════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════
  // DETECTOR DE ANOMALIAS
  // ══════════════════════════════════════════════════════════════
  function detectAnomalias(month, year, threshold = 0.30) {
    const despesas = Store.get().despesas;
    const cats = Object.keys(Store.CATEGORIES).filter(k => k !== 'receita');
    const result = [];

    for (const cat of cats) {
      const current = despesas
        .filter(d => d.year === year && d.month === month && d.category === cat)
        .reduce((a, d) => a + d.amount, 0);
      if (current === 0) continue;

      // Média dos últimos 3 meses com dados
      const prevVals = [];
      for (let i = 1; i <= 3; i++) {
        let m = month - i, y = year;
        if (m <= 0) { m += 12; y--; }
        const val = despesas
          .filter(d => d.year === y && d.month === m && d.category === cat)
          .reduce((a, d) => a + d.amount, 0);
        if (val > 0) prevVals.push(val);
      }
      if (prevVals.length === 0) continue;

      const avg   = prevVals.reduce((a, b) => a + b, 0) / prevVals.length;
      const delta = (current - avg) / avg;
      if (delta > threshold) {
        result.push({
          cat,
          label:   Store.CATEGORIES[cat]?.label || cat,
          color:   Store.CATEGORIES[cat]?.color || 'var(--accent)',
          current,
          avg,
          delta,
          mesesBase: prevVals.length,
        });
      }
    }
    return result.sort((a, b) => b.delta - a.delta);
  }

  function anomaliasHTML(anomalias, totalDesp) {
    if (!anomalias.length) return '';
    const avgImpact = anomalias.reduce((s,a) => s + a.delta, 0) / anomalias.length;
    const extraGasto = anomalias.reduce((s,a) => s + (a.current - a.avg), 0);
    const pctDasDespesas = totalDesp > 0 ? (extraGasto / totalDesp * 100) : 0;
    return `
<div class="card mb-6 anomalias-card" style="border-left:3px solid var(--amber);cursor:pointer" id="anomaliasCard">
  <div class="card-header" style="pointer-events:none">
    <div style="display:flex;align-items:center;gap:10px;flex:1">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="color:var(--amber);flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2"/></svg>
      <span style="font-size:13px;font-weight:600;color:var(--amber)">Anomalias Detectadas</span>
      <span class="badge badge-amber">${anomalias.length} categoria${anomalias.length > 1 ? 's' : ''}</span>
      <span style="font-size:12px;color:var(--text-3);margin-left:4px">· +${(avgImpact*100).toFixed(0)}% acima da média · impacto ${pctDasDespesas.toFixed(1)}% das despesas</span>
    </div>
    <svg id="anomaliasChevron" width="14" height="14" viewBox="0 0 24 24" fill="none" style="color:var(--text-4);transition:transform .2s;flex-shrink:0;pointer-events:none"><polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>
  <div id="anomaliasBody" style="display:none;margin-top:8px;flex-direction:column;gap:10px">
    ${anomalias.map(a => {
      const barW = Math.min((a.delta / 2) * 100, 100);
      return `<div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${a.color};flex-shrink:0"></span>
            <span style="font-size:13px;font-weight:600;color:var(--text-1)">${a.label}</span>
            <span class="badge badge-amber" style="font-size:10px">+${(a.delta*100).toFixed(0)}%</span>
          </div>
          <div style="text-align:right;font-size:12px">
            <span style="color:var(--red);font-weight:700">${Utils.currency(a.current)}</span>
            <span style="color:var(--text-4)"> vs média ${Utils.currency(a.avg)}</span>
          </div>
        </div>
        <div style="display:flex;gap:4px;align-items:center">
          <div style="flex:1;height:6px;background:var(--bg-elevated);border-radius:4px;overflow:hidden">
            <div style="width:${Math.min((a.avg/a.current)*100,100).toFixed(1)}%;height:100%;background:var(--text-4);border-radius:4px"></div>
          </div>
          <div style="width:${barW.toFixed(1)}%;height:6px;background:${a.color};border-radius:4px;max-width:60%;flex-shrink:0"></div>
        </div>
        <div style="font-size:10px;color:var(--text-4);margin-top:3px">Baseado em ${a.mesesBase} mês${a.mesesBase>1?'es':''} anteriores</div>
      </div>`;
    }).join('')}
  </div>
</div>`;
  }

  // ══════════════════════════════════════════════════════════════
  // PREVISÃO DE CAIXA 30 DIAS
  // ══════════════════════════════════════════════════════════════
  function buildPrevisaoCaixa(currentSaldo) {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Historical daily variable spending: avg of last 3 months / days
    const now = new Date();
    const nowM = now.getMonth() + 1;
    const nowY = now.getFullYear();
    let histTotal = 0, histDays = 0;
    for (let i = 1; i <= 3; i++) {
      let m = nowM - i, y = nowY;
      if (m <= 0) { m += 12; y--; }
      const daysInMonth = new Date(y, m, 0).getDate();
      // Only variable despesas (not from contratos)
      const varDesp = Store.get().despesas
        .filter(d => d.year === y && d.month === m && !d.contratoId)
        .reduce((a, d) => a + d.amount, 0);
      if (varDesp > 0) { histTotal += varDesp; histDays += daysInMonth; }
    }
    const dailyVar = histDays > 0 ? histTotal / histDays : 0;

    // Get contract installments in next 30 days
    const parcelas = Store.getProximasParcelas(30);
    const parcelasByDate = {};
    parcelas.forEach(p => {
      if (!parcelasByDate[p.date]) parcelasByDate[p.date] = [];
      parcelasByDate[p.date].push(p);
    });

    // Build day-by-day projection
    const days = [];
    let balance = currentSaldo;
    for (let i = 0; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const events = parcelasByDate[dateStr] || [];
      const fixedIn  = events.filter(e => e.kind === 'receita').reduce((a, e) => a + e.amount, 0);
      const fixedOut = events.filter(e => e.kind === 'despesa').reduce((a, e) => a + e.amount, 0);
      if (i > 0) balance += fixedIn - fixedOut - dailyVar;
      days.push({ date: d, dateStr, balance: Math.round(balance * 100) / 100, events, fixedIn, fixedOut });
    }

    // Find lowest balance point and first negative day
    const minDay = days.reduce((a, b) => b.balance < a.balance ? b : a);
    const firstNegDay = days.find(d => d.balance < 0);

    return { days, dailyVar, minDay, firstNegDay };
  }

  function renderPrevisaoCaixa(currentSaldo) {
    const { days, dailyVar, minDay, firstNegDay } = buildPrevisaoCaixa(currentSaldo);
    const today = days[0];
    const end   = days[days.length - 1];

    // Pick weekly checkpoints for the label axis (day 0, 7, 14, 21, 30)
    const checkpoints = [0, 7, 14, 21, 30].map(i => days[i]);

    // Key events (contract installments) in next 30 days
    const keyEvents = days.slice(1).flatMap(d => d.events.map(e => ({ ...e, day: d })))
      .sort((a, b) => a.day.dateStr.localeCompare(b.day.dateStr))
      .slice(0, 5);

    const endColor  = end.balance >= 0 ? 'var(--green)' : 'var(--red)';
    const minColor  = minDay.balance >= 0 ? 'var(--text-3)' : 'var(--red)';

    return `
<div class="card mb-6" id="previsaoCaixaCard">
  <div class="card-header">
    <span class="card-title">Previsão de Caixa — 30 dias</span>
    <span class="badge badge-accent">projeção</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 220px;gap:16px;padding:4px 0 0">
    <!-- Chart -->
    <div>
      <canvas id="chartPrevisaoCaixa" style="width:100%;height:130px"></canvas>
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        ${checkpoints.map(d => `<span style="font-size:10px;color:var(--text-4)">${d.date.getDate()}/${d.date.getMonth()+1}</span>`).join('')}
      </div>
      <div style="display:flex;gap:16px;margin-top:8px">
        <div>
          <div style="font-size:11px;color:var(--text-4)">Hoje</div>
          <div style="font-size:14px;font-weight:600;color:${today.balance>=0?'var(--green)':'var(--red)'}">${today.balance<0?'-':''}${Utils.currency(Math.abs(today.balance))}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-4)">Em 30 dias</div>
          <div style="font-size:14px;font-weight:600;color:${endColor}">${end.balance<0?'-':''}${Utils.currency(Math.abs(end.balance))}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-4)">Ponto mínimo</div>
          <div style="font-size:14px;font-weight:600;color:${minColor}">${minDay.balance<0?'-':''}${Utils.currency(Math.abs(minDay.balance))}</div>
        </div>
        ${dailyVar > 0 ? `<div>
          <div style="font-size:11px;color:var(--text-4)">Gasto variável/dia</div>
          <div style="font-size:13px;font-weight:500;color:var(--text-2)">${Utils.currency(dailyVar)}</div>
        </div>` : ''}
      </div>
      ${firstNegDay ? `<div style="margin-top:10px;padding:8px 12px;background:var(--red-dim);border-radius:8px;border-left:3px solid var(--red);font-size:12px;color:var(--red)">
        ⚠️ Saldo negativo previsto a partir de <strong>${firstNegDay.date.toLocaleDateString('pt-BR')}</strong>
      </div>` : ''}
    </div>
    <!-- Key events -->
    <div>
      <div style="font-size:11px;font-weight:600;color:var(--text-4);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Próximos vencimentos</div>
      ${keyEvents.length ? keyEvents.map(e => {
        const dias = Math.round((new Date(e.day.dateStr+'T12:00:00') - new Date()) / 86400000);
        const isRec = e.kind === 'receita';
        return `<div class="stat-row" style="padding:6px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:12px;font-weight:500;color:var(--text-1)">${e.desc}</div>
            <div style="font-size:10px;color:var(--text-4)">${e.day.date.toLocaleDateString('pt-BR')} · ${dias===0?'hoje':dias===1?'amanhã':`em ${dias}d`}</div>
          </div>
          <div style="font-size:12px;font-weight:600;color:${isRec?'var(--green)':'var(--red)'}">${isRec?'+':'-'}${Utils.currency(e.amount)}</div>
        </div>`;
      }).join('') : `<div style="font-size:12px;color:var(--text-4);padding-top:8px">Sem vencimentos nos próximos 30 dias.</div>`}
    </div>
  </div>
</div>`;
  }

  // ─── Fonte única de "estado do mês" ─────────────────────────────
  // Tanto heroMood (saudação) quanto coachInsight (card inline) consomem daqui
  // pra garantir coerência narrativa: o que o título diz, o coach reforça.
  function buildMonthState(ctx) {
    const { receita, despesa, saldo, util, limitePct, topCats, prevY, prevM,
            poder, month, currentPessoa } = ctx;

    // Variação da categoria top vs mês anterior
    let categoryDelta = null;
    if (topCats && topCats.length) {
      const [key, value] = topCats[0];
      const prevVal = (Store.get().despesas || [])
        .filter(d => d.year === prevY && d.month === prevM && d.category === key)
        .reduce((a, d) => a + d.amount, 0);
      const change = prevVal > 0 ? ((value - prevVal) / prevVal) : null;
      categoryDelta = { key, value, change, label: Store.CATEGORIES[key]?.label || key };
    }

    const catPctOfTotal = categoryDelta && despesa > 0
      ? Math.round((categoryDelta.value / despesa) * 100) : 0;

    // ── ESTADO 1: CRÍTICO (limite ultrapassado OU saldo negativo) ──
    if (util > limitePct || saldo < 0) {
      const over = Math.max(0, (util - limitePct) * receita);
      const limitBlown = util > limitePct;
      const driver = categoryDelta && categoryDelta.change >= 0.15
        ? ` O maior empurrão veio de ${categoryDelta.label} (+${Math.round(categoryDelta.change * 100)}%).` : '';
      return {
        tone: 'critico',
        icon: '⚠️',
        hero: {
          title: `Atenção, ${currentPessoa}.`,
          sub: limitBlown ? 'Você ultrapassou o limite de gastos do mês'
                          : 'Saldo negativo este mês — vamos revisar',
          moodTone: 'neg',
        },
        coach: {
          titulo: limitBlown ? 'Limite de gastos ultrapassado' : 'Saldo negativo este mês',
          texto: limitBlown
            ? `Você gastou ${Utils.pct(util)} da receita — ${Utils.currency(over)} acima do limite de ${Utils.pct(limitePct)}.${driver} Quer ver onde ajustar?`
            : `Despesas (${Utils.currency(despesa)}) excederam receitas (${Utils.currency(receita)}) em ${Utils.currency(Math.abs(saldo))}. Vamos olhar prioridades juntos?`,
          coachTone: 'warn',
        },
      };
    }

    // ── ESTADO 2: ATENÇÃO (próximo do limite) ──
    if (util > limitePct * 0.85) {
      const driver = categoryDelta && categoryDelta.change >= 0.15
        ? ` ${categoryDelta.label} subiu ${Math.round(categoryDelta.change * 100)}% — vale revisar.` : '';
      return {
        tone: 'atencao',
        icon: '⚠️',
        hero: {
          title: `Atenção ao ritmo, ${currentPessoa}.`,
          sub: `Você já usou ${Utils.pct(util)} da sua receita`,
          moodTone: 'neu',
        },
        coach: {
          titulo: 'Você está perto do limite',
          texto: `${Utils.pct(util)} da receita usada — falta ${Utils.currency((limitePct - util) * receita)} pra atingir o limite de ${Utils.pct(limitePct)}.${driver}`,
          coachTone: 'warn',
        },
      };
    }

    // ── ESTADO 3: ATENÇÃO (categoria top crescendo forte, mesmo com saldo bom) ──
    if (categoryDelta && categoryDelta.change >= 0.20) {
      return {
        tone: 'atencao_categoria',
        icon: '📈',
        hero: {
          title: `Bom controle, ${currentPessoa} — mas atenção.`,
          sub: `${categoryDelta.label} subiu ${Math.round(categoryDelta.change * 100)}% este mês`,
          moodTone: 'neu',
        },
        coach: {
          titulo: `${categoryDelta.label} subiu ${Math.round(categoryDelta.change * 100)}%`,
          texto: `${Utils.currency(categoryDelta.value)} em ${categoryDelta.label} — ${catPctOfTotal}% das despesas. O saldo geral está bom (${saldo >= 0 ? '+' : ''}${Utils.currency(saldo)}), mas vale entender o que puxou esse aumento.`,
          coachTone: 'warn',
        },
      };
    }

    // ── ESTADO 4: CELEBRAÇÃO (saldo positivo + bem abaixo do limite) ──
    if (saldo > 0 && util <= limitePct * 0.7) {
      const extra = poder && poder.poderDeEscolha > 0
        ? `Seu Poder de Escolha está em ${Utils.currency(poder.poderDeEscolha)} — bom momento para reforçar uma meta ou reserva.`
        : 'Continue assim.';
      return {
        tone: 'celebracao',
        icon: '🎉',
        hero: {
          title: `Excelente, ${currentPessoa}!`,
          sub: 'Você está bem dentro do seu limite — ótimo controle',
          moodTone: 'pos',
        },
        coach: {
          titulo: 'Mês em ótimo ritmo',
          texto: `Saldo de ${Utils.currency(saldo)} usando apenas ${Utils.pct(util)} da receita. ${extra}`,
          coachTone: 'pos',
        },
      };
    }

    // ── ESTADO 5: CONTROLE (default — saldo positivo, dentro do limite) ──
    const catLine = categoryDelta
      ? ` Maior gasto: ${categoryDelta.label} (${catPctOfTotal}% do total).` : '';
    return {
      tone: 'controle',
      icon: '✓',
      hero: {
        title: `Bom trabalho, ${currentPessoa}.`,
        sub: 'Saldo positivo este mês — continue assim',
        moodTone: 'pos',
      },
      coach: {
        titulo: 'Mês sob controle',
        texto: `Receitas ${Utils.currency(receita)} e despesas ${Utils.currency(despesa)} — saldo ${saldo >= 0 ? '+' : ''}${Utils.currency(saldo)}.${catLine}`,
        coachTone: 'neutral',
      },
    };
  }

  function renderDashboard(container) {
    const month = getMonth(), year = getYear();
    const data  = Store.get();
    const receita   = Store.sumReceitas(month, year);
    const despesa   = Store.sumDespesas(month, year);
    const saldo     = receita - despesa;
    const util      = receita > 0 ? despesa / receita : 0;
    const metaReceitaMensal = Store.getActiveMetaReceitaMensal() ?? data.settings.metaReceita;
    const limiteDespAbs = Store.getActiveLimiteDespMensal();
    const limitePct = limiteDespAbs && receita > 0 ? (limiteDespAbs / receita) : data.settings.limiteGasto;
    const patrimonio = Store.totalAtivos();

    const prevM = month > 1 ? month - 1 : 12;
    const prevY = month > 1 ? year      : year - 1;
    const prevRec = Store.sumReceitas(prevM, prevY);
    const prevDesp = Store.sumDespesas(prevM, prevY);
    const chgRec  = prevRec  > 0 ? ((receita  - prevRec)  / prevRec)  * 100 : 0;
    const chgDesp = prevDesp > 0 ? ((despesa  - prevDesp) / prevDesp) * 100 : 0;

    const catMap = Store.despesasByCategory(month, year);
    const topCats = Object.entries(catMap)
      .sort((a,b) => b[1]-a[1]).slice(0,5);

    const alerts = [];
    if (util > limitePct) alerts.push({ type:'danger',  title:'Limite de gastos ultrapassado!', text:`Você gastou ${Utils.pct(util)} da receita (limite: ${Utils.pct(limitePct)}).` });
    else if (util > limitePct * 0.9) alerts.push({ type:'warning', title:'Próximo do limite de gastos', text:`Você já usou ${Utils.pct(util)} da receita.` });
    if (receita < metaReceitaMensal) alerts.push({ type:'info', title:'Meta de receita não atingida', text:`Receita atual: ${Utils.currency(receita)} / Meta: ${Utils.currency(metaReceitaMensal)}` });
    if (saldo > 0 && alerts.filter(a => a.type === 'danger' || a.type === 'warning').length === 0)
      alerts.push({ type:'success', title:'Saldo positivo este mês', text:`Sobram ${Utils.currency(saldo)} após todas as despesas.` });

    const yrReceitas = Store.yearlyMonthly(year, 'receita');
    const yrDespesas = Store.yearlyMonthly(year, 'despesa');
    const tipoDesp = Store.sumDespesasByTipo(month, year);
    const _tiposList = Store.getTipos();
    const TIPO_INFO = {};
    _tiposList.forEach(t => { TIPO_INFO[t.id] = { label: t.label, color: t.color, desc: t.desc, comportamento: t.comportamento, icon: t.icon }; });
    const poder = Store.calcPoderDeEscolha(month, year);

    const heroGreeting = (() => {
      const h = new Date().getHours();
      if (h < 12) return 'Bom dia';
      if (h < 18) return 'Boa tarde';
      return 'Boa noite';
    })();
    const monthLabel = `${Utils.monthsFull[month-1]} ${year}`;
    const familyCtxHero = typeof SupabaseSync !== 'undefined' ? SupabaseSync.getFamilyContext() : null;
    const isMemberHero  = familyCtxHero && familyCtxHero.role === 'member';

    // Estado do mês (fonte única — heroMood + coachInsight derivam daqui)
    const monthState = buildMonthState({
      receita, despesa, saldo, util, limitePct, topCats,
      prevY, prevM, poder, month, currentPessoa: currentPessoa(),
    });
    const heroMood = {
      title: monthState.hero.title,
      sub: monthState.hero.sub,
      tone: monthState.hero.moodTone,
    };

    // ── Dados anuais (para seção 2) ───────────────────────────────
    const totalRec  = yrReceitas.reduce((a,b)=>a+b,0);
    const totalDesp = yrDespesas.reduce((a,b)=>a+b,0);
    const totalSaldo = totalRec - totalDesp;
    const mediaRec  = totalRec  / 12;
    const mediaDesp = totalDesp / 12;
    const activeMths = yrReceitas.map((r,i) => ({ r, d: yrDespesas[i] })).filter(m => m.r > 0 || m.d > 0);
    const avgRec  = activeMths.length ? activeMths.reduce((a,m) => a+m.r,0)/activeMths.length : 0;
    const avgDesp = activeMths.length ? activeMths.reduce((a,m) => a+m.d,0)/activeMths.length : 0;
    const avgSaldo = avgRec - avgDesp;
    const proj = Array.from({length: 3}, (_,k) => {
      const rawIdx = (month - 1) + 1 + k;
      const mIdx = rawIdx % 12;
      const yr   = year + Math.floor(rawIdx / 12);
      return { label: Utils.months[mIdx] + (yr !== year ? ' '+yr : ''), rec: avgRec, desp: avgDesp, saldo: avgSaldo };
    });
    const saldoAcc = (() => { let acc=0; return yrReceitas.map((r,i) => { acc += r-yrDespesas[i]; return acc; }); })();

    // ── Card 1: saúde financeira ──────────────────────────────────
    const healthPct = util;
    const healthOver = util > limitePct;
    const healthWarn = !healthOver && util > limitePct * 0.9;
    const healthColor = healthOver ? 'var(--red)' : healthWarn ? 'var(--amber)' : 'var(--green)';
    const healthBg    = healthOver ? 'var(--red-dim)' : healthWarn ? 'var(--amber-dim)' : 'var(--green-dim)';
    const healthLabel = healthOver ? 'Limite ultrapassado' : healthWarn ? 'Próximo do limite' : 'Dentro do orçamento';
    const healthIcon  = healthOver
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2"/></svg>`
      : healthWarn
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    // ── Card 4: maior despesa do mês (outlier) ────────────────────
    const despMes = Store.get().despesas.filter(d => d.year === year && d.month === month);
    const topDesp = despMes.length ? despMes.reduce((a,b) => b.amount > a.amount ? b : a) : null;

    // ── Coach inline insight (deriva do monthState — coerente com o hero) ──
    const coachInsight = {
      icon: monthState.icon,
      tone: monthState.coach.coachTone,
      titulo: monthState.coach.titulo,
      texto: monthState.coach.texto,
    };

    // ── Receitas por pessoa para donut ────────────────────────────
    const recsByPerson = {};
    Store.receitasByMonth(month, year).forEach(r => {
      recsByPerson[r.person] = (recsByPerson[r.person] || 0) + r.amount;
    });

    // Anomalias — badge only (card shown in Despesas)
    const anomalias = detectAnomalias(month, year);
    _updateAnomaliasBadge(anomalias.length);

    container.innerHTML = `

${(() => {
  // ── Banner / Card de Onboarding pendente ──
  const ob = Store.getOnboarding();
  if (ob.completed) return '';
  const meta = Store.getOnboardingGoal();
  if (!meta || !Array.isArray(meta.steps)) return '';
  const total = meta.steps.length;
  const done  = meta.steps.filter(s => s.completed).length;
  const pct   = Math.round((done / total) * 100);
  const startedAt = ob.startedAt ? new Date(ob.startedAt) : null;
  const daysSince = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 86400000) : 0;
  const overdue = daysSince >= 7;
  const remaining = total - done;
  const tone = overdue ? 'warn' : 'neutral';
  const title = overdue
    ? 'Seu setup com o Haile está atrasado'
    : (done === 0
        ? 'Vamos começar — quero te conhecer'
        : `Falta${remaining > 1 ? 'm' : ''} ${remaining} pergunta${remaining > 1 ? 's' : ''} pra eu te orientar melhor`);
  const sub = overdue
    ? `Já faz ${daysSince} dias desde que abri esta conversa. Sem suas respostas, minhas orientações ficam genéricas.`
    : 'Quanto mais eu sei sobre você, mais úteis ficam minhas recomendações.';
  return `
<div class="card mb-4" style="border:1px solid ${overdue ? 'var(--amber-dim,rgba(245,158,11,.30))' : 'var(--accent-dim)'};background:${overdue ? 'rgba(245,158,11,.06)' : 'var(--accent-dim)'};padding:18px 20px">
  <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
    <div style="width:38px;height:38px;border-radius:50%;background:var(--bg-card);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--border)">
      <img src="../assets/svg/haile-mark-indigo.svg" alt="" style="width:22px;height:22px"/>
    </div>
    <div style="flex:1;min-width:200px">
      <div style="font-size:14px;font-weight:700;color:var(--text-1);margin-bottom:2px">${title}</div>
      <div style="font-size:12px;color:var(--text-3);line-height:1.55">${sub}</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div style="font-size:11px;font-weight:600;color:var(--text-2)">${done}/${total} respondidas</div>
        <div style="width:120px;height:5px;background:var(--bg-elevated);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${overdue ? 'var(--amber)' : 'var(--accent)'};transition:width .3s;border-radius:3px"></div>
        </div>
      </div>
      <button class="btn-coach" id="btnContinuarOnboarding" style="padding:8px 14px;font-size:13px;white-space:nowrap">${done === 0 ? 'Começar' : 'Continuar'}</button>
    </div>
  </div>
</div>`;
})()}

<!-- ═══ REDESIGN 2026-05 ═══════════════════════════════════════════
     Sprint 1 — Dashboard (big bang): substitui hero+KPI+coach+charts
     pelo layout do redesign. Foundation: SvgCharts (svg-charts.js).
═══════════════════════════════════════════════════════════════════ -->

<!-- Greeting -->
<div class="dash-greeting mb-4">
  <div>
    <h1 class="dash-greeting-title">Olá, ${(() => {
      const p = Store.getProfile();
      const name = (p?.name && p.name !== 'Usuário') ? p.name.split(' ')[0] : 'você';
      return name;
    })()}.</h1>
    <p class="dash-greeting-sub">Equilíbrio entre receitas e despesas · ${monthLabel}</p>
  </div>
  ${isMemberHero ? '' : `
  <button class="dash-greeting-cta" id="btnNovaEntrada">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
    Novo Lançamento
  </button>`}
</div>

<!-- Hero grid 3 col: Poder de Escolha (1.25fr) · Receitas+Despesas · Saúde+Maior Gasto -->
<div class="dash-hero-grid mb-4">

  <!-- Poder de Escolha (hero) -->
  <div class="poder-hero ${poder.poderDeEscolha < 0 ? 'is-negative' : ''}">
    <div class="poder-hero-glow"></div>
    <div class="poder-hero-header">
      <div class="poder-hero-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/></svg>
      </div>
      <div class="poder-hero-meta">
        <div class="poder-hero-tag">Disponível agora</div>
        <div class="poder-hero-label">Poder de Escolha</div>
      </div>
      <div class="poder-hero-month">${Utils.monthsFull[month-1].slice(0,3)} ${year}</div>
    </div>

    <div class="poder-hero-main">
      <div class="poder-hero-value-wrap">
        <div class="poder-hero-value">${poder.poderDeEscolha<0?'-':''}${Utils.currency(Math.abs(poder.poderDeEscolha))}</div>
        <div class="poder-hero-sub">
          ${(poder.pct*100).toFixed(1)}% da receita mensal
          <span style="display:block;margin-top:2px;opacity:0.85">${poder.poderDeEscolha>=0?'livre para decidir agora':'já comprometeu sua reserva'}</span>
        </div>
      </div>
      <div class="poder-hero-gauge">
        ${SvgCharts.gauge(Math.max(0, Math.min(100, poder.pct*100)), { size: 78, color: 'var(--accent-2)', thickness: 9, bg: 'rgba(255,255,255,0.08)' })}
        <div class="poder-hero-gauge-label">
          <div class="poder-hero-gauge-pct">${Math.round(poder.pct*100)}%</div>
          <div class="poder-hero-gauge-cap">livre</div>
        </div>
      </div>
    </div>

    <div class="poder-hero-flow">
      <div class="poder-hero-flow-labels">
        <span>Comprometido ${Math.round((1-poder.pct)*100)}%</span>
        <span>Livre ${Math.round(poder.pct*100)}%</span>
      </div>
      <div class="poder-hero-flow-bar">
        <div class="poder-hero-flow-fill-c" style="width:${Math.round((1-poder.pct)*100)}%"></div>
        <div class="poder-hero-flow-fill-l" style="width:${Math.round(poder.pct*100)}%"></div>
      </div>
      <div class="poder-hero-flow-foot">
        <div>
          <div class="poder-hero-flow-foot-lbl">Receita</div>
          <div class="poder-hero-flow-foot-val">${Utils.currency(receita)}</div>
        </div>
        <div style="text-align:right">
          <div class="poder-hero-flow-foot-lbl">Compromissos</div>
          <div class="poder-hero-flow-foot-val">${Utils.currency(receita - poder.poderDeEscolha)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Coluna: Receitas + Despesas empilhadas -->
  <div class="dash-metric-col">
    <div class="metric-card">
      <div class="metric-card-head">
        <span class="metric-card-label">Receitas</span>
        <div class="metric-card-icon" style="background:var(--green-dim);color:var(--green)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
      </div>
      <div class="metric-card-value">${Utils.currency(receita)}</div>
      <div class="metric-card-delta">
        <span class="metric-card-delta-pill ${chgRec>=0?'pos':'neg'}">${chgRec>=0?'↑':'↓'} ${Math.abs(chgRec).toFixed(1)}%</span>
        <span class="metric-card-delta-cap">vs. mês anterior</span>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-card-head">
        <span class="metric-card-label">Despesas</span>
        <div class="metric-card-icon" style="background:var(--red-dim);color:var(--red)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
        </div>
      </div>
      <div class="metric-card-value">${Utils.currency(despesa)}</div>
      <div class="metric-card-delta">
        <span class="metric-card-delta-pill ${chgDesp<=0?'pos':'neg'}">${chgDesp<=0?'↓':'↑'} ${Math.abs(chgDesp).toFixed(1)}%</span>
        <span class="metric-card-delta-cap">vs. mês anterior</span>
      </div>
    </div>
  </div>

  <!-- Coluna: Saúde Financeira + Maior Gasto -->
  <div class="dash-metric-col">
    <div class="metric-card">
      <div class="metric-card-head">
        <span class="metric-card-label">Saúde Financeira</span>
        <div class="metric-card-icon" style="background:${healthBg};color:${healthColor}">${healthIcon.replace('width="22"','width="13"').replace('height="22"','height="13"')}</div>
      </div>
      <div class="metric-card-value" style="color:${healthColor}">${Utils.pct(healthPct)} <span style="font-size:12px;color:var(--text-3);font-weight:500">comprometido</span></div>
      ${SvgCharts.healthBar(Math.min(healthPct*100, 100))}
      <div class="metric-card-delta-cap" style="margin-top:2px">Ideal: <span style="color:var(--amber)">≤ 33%</span> comprometido (LLP)</div>
    </div>
    ${(() => {
      const topPct = topDesp && despesa > 0 ? (topDesp.amount / despesa * 100).toFixed(0) : null;
      const catLabel = topDesp ? (Store.CATEGORIES[topDesp.category]?.label || topDesp.category) : '—';
      const catColor = topDesp ? (Store.CATEGORIES[topDesp.category]?.color || 'var(--amber)') : 'var(--amber)';
      return `<div class="metric-card">
        <div class="metric-card-head">
          <span class="metric-card-label">Maior Gasto do Mês</span>
        </div>
        ${topDesp ? `
        <div class="metric-card-row">
          <div class="metric-card-row-icon" style="background:${catColor}1e;color:${catColor}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10"/></svg>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${catLabel}</div>
            <div style="font-size:18px;font-weight:700;color:var(--red);letter-spacing:-0.4px;line-height:1">${Utils.currency(topDesp.amount)}</div>
          </div>
        </div>
        ${topPct ? `<div class="metric-card-foot">${topPct}% do total de despesas</div>` : ''}
        ` : `<div class="metric-card-empty">Sem despesas no mês</div>`}
      </div>`;
    })()}
  </div>

</div>

<!-- Coach inline (banner) -->
<div class="coach-inline-card coach-inline--${coachInsight.tone} mb-6" id="coachInlineCard">
  <div class="coach-inline-avatar">
    <img src="/assets/favicon/apple-touch-icon-180.png" alt="Coach" width="36" height="36" style="border-radius:50%;object-fit:cover"/>
  </div>
  <div class="coach-inline-body">
    <div class="coach-inline-header">
      <span class="coach-inline-icon">${coachInsight.icon}</span>
      <span class="coach-inline-titulo">${coachInsight.titulo}</span>
      <span class="coach-inline-label">Coach Haile</span>
    </div>
    <div class="coach-inline-texto">${coachInsight.texto}</div>
  </div>
  <button class="coach-inline-cta" id="btnCoachInlineVer">Ver análise →</button>
</div>

<!-- Charts grid 2 col: Distribuição + Receitas por Pessoa -->
<div class="dash-section-tag mb-2">DISTRIBUIÇÃO · ${Utils.monthsFull[month-1].toUpperCase()} ${year}</div>
<div class="chart-grid mb-6">
  ${(() => {
    // Donut SVG inline — despesas por categoria
    const catData = topCats.map(([cat, val]) => ({
      label: Store.CATEGORIES[cat]?.label || cat,
      value: val,
      color: Store.CATEGORIES[cat]?.color || 'var(--text-3)',
    }));
    const totalCat = catData.reduce((a,d) => a+d.value, 0);
    const segments = catData.map(d => ({ v: d.value, c: d.color }));
    return `<div class="card dash-dist-card">
      <div class="dash-card-head">
        <span class="dash-card-title">DISTRIBUIÇÃO DE DESPESAS</span>
        <span class="dash-card-pill" style="background:var(--red-dim);color:var(--red)">${Utils.monthsFull[month-1]}</span>
      </div>
      ${catData.length ? `
      <div class="dash-dist-body">
        ${SvgCharts.donut(segments, { size: 128, thickness: 17, topText: totalCat >= 1000 ? `R$ ${(totalCat/1000).toFixed(0)}k` : `R$ ${totalCat.toFixed(0)}`, botText: 'despesas' })}
        <div class="dash-dist-legend">
          ${catData.map(d => `
            <div class="dash-dist-legend-item">
              <span class="dash-dist-dot" style="background:${d.color}"></span>
              <span class="dash-dist-lbl">${d.label}</span>
              <span class="dash-dist-val">${d.value >= 1000 ? 'R$ ' + (d.value/1000).toFixed(1) + 'k' : Utils.currency(d.value)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : `<div style="padding:32px 0;text-align:center;color:var(--text-3);font-size:13px">Sem despesas no mês</div>`}
    </div>`;
  })()}

  ${(() => {
    // LineChart SVG inline — receitas por pessoa (ano)
    const pessoas = (Store.PESSOAS || []);
    const PERSON_COLORS = ['var(--accent)', 'var(--green)', 'var(--amber)', 'var(--blue)', 'var(--pink)'];
    const series = pessoas.map((p, i) => {
      const data = [];
      for (let m = 1; m <= month; m++) {
        const recs = Store.receitasByMonth(m, year).filter(r => r.person === p);
        data.push(recs.reduce((a,r) => a + r.amount, 0));
      }
      return { name: p, c: PERSON_COLORS[i % PERSON_COLORS.length], data };
    }).filter(s => s.data.some(v => v > 0));
    const labels = Utils.months.slice(0, month);
    return `<div class="card dash-dist-card">
      <div class="dash-card-head">
        <span class="dash-card-title">RECEITAS POR PESSOA · ${year}</span>
        <span class="dash-card-pill" style="background:var(--green-dim);color:var(--green)">Mensal</span>
      </div>
      ${series.length ? `
      <div style="padding:8px 0">
        ${SvgCharts.lineChart(series, labels, { width: 380, height: 140 })}
      </div>
      <div class="dash-dist-pessoa-legend">
        ${series.map(s => `
          <div class="dash-dist-legend-item" style="flex:0 0 auto">
            <span class="dash-dist-dot" style="background:${s.c};border-radius:50%;width:7px;height:7px"></span>
            <span class="dash-dist-lbl">${s.name}</span>
          </div>
        `).join('')}
      </div>
      ` : `<div style="padding:32px 0;text-align:center;color:var(--text-3);font-size:13px">Sem receitas registradas no ano</div>`}
    </div>`;
  })()}
</div>

<!-- ═══ VISÃO ANUAL ═══════════════════════════════════════════════ -->
<div class="dash-section-tag mb-2">VISÃO ANUAL — ${year}</div>
<div class="dash-annual-grid mb-6">
  <div class="annual-card">
    <span class="annual-card-label">Receita Total ${year}</span>
    <div class="annual-card-value" style="color:var(--green)">${Utils.currency(totalRec)}</div>
    <div class="annual-card-progress">
      <div class="annual-card-progress-bar"><div style="width:${Math.min((mediaRec*month)/(totalRec||1)*100,100)}%;background:var(--green)"></div></div>
      <div class="annual-card-progress-cap">Média: ${Utils.currency(mediaRec)}/mês · ${month} de 12 meses</div>
    </div>
  </div>
  <div class="annual-card">
    <span class="annual-card-label">Despesa Total ${year}</span>
    <div class="annual-card-value" style="color:var(--red)">${Utils.currency(totalDesp)}</div>
    <div class="annual-card-progress">
      <div class="annual-card-progress-bar"><div style="width:${Math.min((mediaDesp*month)/(totalDesp||1)*100,100)}%;background:var(--red)"></div></div>
      <div class="annual-card-progress-cap">Média: ${Utils.currency(mediaDesp)}/mês · ${month} de 12 meses</div>
    </div>
  </div>
  <div class="annual-card">
    <span class="annual-card-label">Saldo do Ano</span>
    <div class="annual-card-value" style="color:${totalSaldo>=0?'var(--accent-2)':'var(--red)'}">${totalSaldo<0?'-':''}${Utils.currency(Math.abs(totalSaldo))}</div>
    <div class="annual-card-progress-cap" style="margin-top:6px">${totalSaldo>=0?'Sobrou no ano':'Déficit acumulado'}</div>
  </div>
</div>

${activeMths.length > 0 ? `
<div class="card mb-6">
  <div class="card-header">
    <span class="card-title">Projeção — Próximos 3 Meses</span>
    <span class="badge badge-accent">Baseado na média de ${activeMths.length} mês${activeMths.length>1?'es':''}</span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:4px 0 8px">
    ${proj.map(p => `
    <div style="background:var(--bg-elevated);border-radius:12px;padding:16px;border:1px solid var(--border)">
      <div style="font-size:12px;font-weight:700;color:var(--text-3);margin-bottom:12px;text-transform:uppercase;letter-spacing:.06em">${p.label}</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:13px">
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-3)">Receita est.</span><span style="color:var(--green);font-weight:600">${Utils.currency(p.rec)}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-3)">Despesa est.</span><span style="color:var(--red);font-weight:600">${Utils.currency(p.desp)}</span></div>
        <div style="height:1px;background:var(--border);margin:4px 0"></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-2);font-weight:600">Saldo est.</span><span style="color:${avgSaldo>=0?'var(--green)':'var(--red)'};font-weight:700">${p.saldo>=0?'':'-'}${Utils.currency(Math.abs(p.saldo))}</span></div>
      </div>
    </div>`).join('')}
  </div>
  <div style="font-size:11px;color:var(--text-4);padding-top:4px">Projeção baseada na média histórica dos meses com dados. Valores estimados.</div>
</div>` : ''}

<div class="table-section mb-6">
  <div class="card-header"><span class="card-title">Tabela Mensal ${year}</span></div>
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th>Mês</th><th class="num">Receitas</th><th class="num">Despesas</th><th class="num">Saldo</th><th class="num">% Gasto</th></tr></thead>
      <tbody>
        ${yrReceitas.map((rec,i)=>{
          const desp = yrDespesas[i]; const saldo2 = rec-desp; const pct = rec>0?desp/rec:0;
          const isFuture = rec === 0 && desp === 0;
          return `<tr style="${isFuture?'opacity:0.45':''}">
            <td>${Utils.monthsFull[i]}${isFuture?' <span style="font-size:10px;color:var(--text-4)">est.</span>':''}</td>
            <td class="num positive">${rec>0?Utils.currency(rec):'—'}</td>
            <td class="num negative">${desp>0?Utils.currency(desp):'—'}</td>
            <td class="num ${saldo2>=0?'positive':'negative'}">${rec>0||desp>0?(saldo2<0?'-':'')+Utils.currency(Math.abs(saldo2)):'—'}</td>
            <td class="num"><span class="badge ${pct>0.9?'badge-red':pct>0.7?'badge-amber':'badge-green'}">${rec>0?Utils.pct(pct):'—'}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot><tr>
        <td class="fw-700">Total</td>
        <td class="num positive fw-700">${Utils.currency(totalRec)}</td>
        <td class="num negative fw-700">${Utils.currency(totalDesp)}</td>
        <td class="num ${totalSaldo>=0?'positive':'negative'} fw-700">${totalSaldo<0?'-':''}${Utils.currency(Math.abs(totalSaldo))}</td>
        <td class="num"><span class="badge ${totalDesp/totalRec>0.7?'badge-red':'badge-green'}">${Utils.pct(totalDesp/totalRec||0)}</span></td>
      </tr></tfoot>
    </table>
  </div>
</div>

${renderPrevisaoCaixa(saldo)}

<div class="card mb-6">
  <div class="card-header"><span class="card-title">Próximas Parcelas (30 dias)</span><span class="badge badge-accent">contratos</span></div>
  ${renderProximasParcelas()}
</div>
    `;

    // Event handlers (charts já renderizados inline via SvgCharts)
    requestAnimationFrame(() => {
      // Coach inline — abre painel ao clicar em "Ver análise"
      document.getElementById('btnCoachInlineVer')?.addEventListener('click', () => {
        document.getElementById('coachToggleBtn')?.click();
      });

      // Continuar / Começar onboarding
      document.getElementById('btnContinuarOnboarding')?.addEventListener('click', () => {
        if (typeof showOnboarding === 'function') showOnboarding();
      });

      // Previsão de caixa 30 dias (mantém Canvas existente)
      const pcCanvas = document.getElementById('chartPrevisaoCaixa');
      if (pcCanvas) {
        const { days } = buildPrevisaoCaixa(saldo);
        const pcLabels = days.map((d, i) => i % 7 === 0 ? `${d.date.getDate()}/${d.date.getMonth()+1}` : '');
        const pcValues = days.map(d => d.balance);
        const minVal = Math.min(...pcValues);
        const lineColor = minVal < 0 ? 'var(--red)' : 'var(--green)';
        Charts.Line(pcCanvas, {
          labels: pcLabels,
          datasets: [{ label: 'Saldo Projetado', values: pcValues, color: lineColor }],
        }, { height: 130 });
      }
    });
  }

  function initKpiDnd(container) {
    // V1: posições fixas — drag-and-drop desativado
    return;

    // Drag state
    let dragging = null;

    grid.querySelectorAll('.kpi-card').forEach(card => {
      card.setAttribute('draggable', 'true');

      card.addEventListener('dragstart', e => {
        dragging = card;
        requestAnimationFrame(() => card.classList.add('kpi-dragging'));
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('kpi-dragging');
        grid.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('kpi-drop-over'));
        // Save new order
        const order = [...grid.querySelectorAll('[data-kpi-id]')].map(c => c.dataset.kpiId);
        Store.updateSettings({ kpiOrder: order });
        dragging = null;
      });

      card.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!dragging || dragging === card) return;
        grid.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('kpi-drop-over'));
        card.classList.add('kpi-drop-over');
        // Determine insertion point
        const rect = card.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const after = e.clientX > midX;
        if (after) {
          card.after(dragging);
        } else {
          card.before(dragging);
        }
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('kpi-drop-over');
      });

      card.addEventListener('drop', e => {
        e.preventDefault();
        card.classList.remove('kpi-drop-over');
      });
    });
  }

  function renderPersonReceitas(month, year) {
    const recs = Store.receitasByMonth(month, year);
    const byPerson = {};
    recs.forEach(r => { byPerson[r.person] = (byPerson[r.person] || 0) + r.amount; });
    const total = Object.values(byPerson).reduce((a,b) => a+b, 0) || 1;
    return Object.entries(byPerson).map(([p, v]) => `
      <div class="stat-row">
        <div style="display:flex;align-items:center;gap:8px">
          ${Utils.personAvatarHtml(p, { size: 28 })}
          <span class="stat-row-label">${p}</span>
        </div>
        <div>
          <div class="stat-row-value green">${Utils.currency(v)}</div>
          <div style="font-size:11px;color:var(--text-3);text-align:right">${((v/total)*100).toFixed(0)}%</div>
        </div>
      </div>
    `).join('') || '<div class="empty-state" style="padding:20px"><p>Sem receitas neste mês</p></div>';
  }

  function renderProximasParcelas() {
    const rows = Store.getProximasParcelas(30).slice(0, 6);
    if (!rows.length) return '<div class="empty-state" style="padding:20px"><p style="font-size:12px;color:var(--text-4)">Sem parcelas previstas para os próximos 30 dias.<br><a href="#contratos" style="color:var(--accent);font-size:12px">Cadastrar contratos recorrentes →</a></p></div>';
    const today = new Date(); today.setHours(0,0,0,0);
    return rows.map(p => {
      const c = Store.getContratoById(p.contratoId);
      const d = new Date(p.date+'T12:00:00');
      const dias = Math.round((d - today) / (1000*60*60*24));
      const isRec = p.kind === 'receita';
      const urgent = dias <= 3;
      return `
      <div class="stat-row">
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--text-1)">📑 ${p.desc}</div>
          <div style="font-size:11px;color:var(--text-3)">${c?.label || '—'} · ${d.toLocaleDateString('pt-BR')} <span style="color:var(--${urgent?'red':'text-4'})">(${dias===0?'hoje':dias===1?'amanhã':`em ${dias}d`})</span></div>
        </div>
        <div class="stat-row-value ${isRec?'green':'red'}">${Utils.currency(p.amount)}</div>
      </div>`;
    }).join('');
  }

  function renderPersonDespesas(month, year) {
    const map = Store.despesasPorPessoa(month, year);
    const total = Object.values(map).reduce((a,b) => a+b, 0) || 1;
    const entries = Object.entries(map).sort((a,b) => b[1]-a[1]);
    if (!entries.length) return '<div class="empty-state" style="padding:20px"><p>Sem despesas neste mês</p></div>';
    return entries.map(([p, v]) => `
      <div class="stat-row">
        <div style="display:flex;align-items:center;gap:8px">
          ${Utils.personAvatarHtml(p, { size: 28 })}
          <span class="stat-row-label">${p}</span>
        </div>
        <div>
          <div class="stat-row-value red">${Utils.currency(v)}</div>
          <div style="font-size:11px;color:var(--text-3);text-align:right">${((v/total)*100).toFixed(0)}%</div>
        </div>
      </div>`).join('');
  }

  function renderRecentTransactions(month, year) {
    const rows = [...Store.despesasByMonth(month, year)]
      .sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
    if (!rows.length) return '<div class="empty-state" style="padding:20px"><p>Sem lançamentos</p></div>';
    return rows.map(d => `
      <div class="stat-row">
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--text-1)">${d.desc}</div>
          <div style="font-size:11px;color:var(--text-3)">${d.sub} · ${d.date.slice(5)}</div>
        </div>
        <div class="stat-row-value red">${Utils.currency(d.amount)}</div>
      </div>
    `).join('');
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: LANÇAMENTOS
  // ══════════════════════════════════════════════════════════════
  function renderLancamentos(container) {
    const month = getMonth(), year = getYear();
    const period = localStorage.getItem('ff_lanc_period') || 'mes';
    const { start: mStart, end: mEnd, label: periodLabel } = periodRangeFor(period, month, year);

    const despesas = Store.get().despesas.filter(d => d.year === year && d.month >= mStart && d.month <= mEnd);
    const receitas = Store.get().receitas.filter(r => r.year === year && r.month >= mStart && r.month <= mEnd);

    let sortDir = 'asc';
    let activeTab = localStorage.getItem('ff_lanc_tab') || 'desp';

    container.innerHTML = `
<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">Lançamentos <span class="page-head-year">— ${year}</span></h1>
    <p class="page-head-meta">
      <span class="page-head-meta-total">${despesas.length + receitas.length} registros</span>
      <span class="page-head-meta-sep">·</span>
      <span class="page-head-meta-red">${despesas.length} despesas</span>
      <span class="page-head-meta-sep">·</span>
      <span class="page-head-meta-green">${receitas.length} receitas</span>
    </p>
  </div>
  <div class="view-tabs">
    <button class="view-tab view-tab--red ${activeTab==='desp'?'active':''}" id="btnTabDesp">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
      Despesas
    </button>
    <button class="view-tab view-tab--green ${activeTab==='rec'?'active':''}" id="btnTabRec">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
      Receitas
    </button>
    <button class="view-tab view-tab--violet ${activeTab==='cal'?'active':''}" id="btnTabCal">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
      Calendário
    </button>
  </div>
</div>
<div class="filter-header" id="filterHeader">
  <div class="filter-row-1" id="filterRow1">
    <div class="filter-sep"></div>
    ${periodToggleHTML('ff_lanc_period', period)}
    <div class="filter-row-1-actions">
      <select class="form-select" id="filterPessoa" style="min-width:140px">
        <option value="">Todas as pessoas</option>
        ${Store.PESSOAS.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
      <button class="btn-secondary" id="btnSort" title="Ordenar por data" style="white-space:nowrap;padding:6px 10px;font-size:12px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px"><path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        Data ↑
      </button>
    </div>
  </div>
  <div class="filter-row-2" id="filterBar">
    <div class="search-box" style="flex:1;min-width:180px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/></svg>
      <input type="text" id="searchInput" placeholder="Buscar por descrição…" />
    </div>
    <select class="form-select" id="filterCat" style="min-width:155px">
      <option value="">Todas as categorias</option>
      ${Store.categoriesOrdered().filter(([k]) => k !== 'receita').map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
    </select>
    <select class="form-select" id="filterSub" style="min-width:150px">
      <option value="">Todas as sub-categorias</option>
    </select>
    <select class="form-select" id="filterPay" style="min-width:130px">
      <option value="">Todos os pagamentos</option>
      ${Store.PAYMENT_METHODS.map(m => `<option value="${m}">${m}</option>`).join('')}
    </select>
    <button class="btn-secondary" id="btnClearFilters" title="Limpar filtros" style="white-space:nowrap;padding:6px 10px;font-size:12px;color:var(--text-3)">× Limpar</button>
  </div>
</div>
<div class="table-wrap" id="lancTable"></div>`;

    // Injeta picker mês/ano no início da filter-row-1
    renderPageMonthPicker(container.querySelector('#filterRow1'));

    // ── helpers ────────────────────────────────────────────────────
    function sortRows(rows) {
      return [...rows].sort((a, b) =>
        sortDir === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
      );
    }

    function pessoaAvatarHtml(person) {
      if (!person) return '<span style="color:var(--text-4)">—</span>';
      const colors = { Roberto: 'var(--haile-indigo)', Mariana: 'var(--green)', Manuela: 'var(--amber)', Família: 'var(--haile-teal)' };
      const bg = colors[person] || Utils.personColor(person);
      const ini = person[0].toUpperCase();
      return `<span class="lancamentos-pessoa-avatar" style="background:${bg}" title="${person}">${ini}</span>`;
    }

    function buildLancTable(rows, filter = {}) {
      let filtered = sortRows(rows);
      if (filter.search) filtered = filtered.filter(d => d.desc.toLowerCase().includes(filter.search.toLowerCase()));
      if (filter.cat)    filtered = filtered.filter(d => d.category === filter.cat);
      if (filter.sub)    filtered = filtered.filter(d => d.sub === filter.sub);
      if (filter.pay)    filtered = filtered.filter(d => d.pay === filter.pay);
      if (filter.pessoa) filtered = filtered.filter(d => d.split && d.split.some(s => s.person === filter.pessoa));
      const total = filtered.reduce((a, d) => a + d.amount, 0);
      if (filtered.length === 0) return '<div style="text-align:center;padding:40px;color:var(--text-4);font-size:13px">Nenhum lançamentos encontrado com os filtros aplicados.</div>';
      return `<table class="data-table">
<thead><tr>
  <th>Data</th><th>Descrição</th><th>Categoria</th><th>Pessoa</th><th>Pagamento</th><th class="num">Valor</th><th>Status</th><th style="position:sticky;right:0;background:var(--bg-card)"></th>
</tr></thead>
<tbody>
${filtered.map(d => {
  const c = d.contratoId ? Store.getContratoById(d.contratoId) : null;
  const paidState = d.paid === true ? 'on' : d.paid === false ? 'off' : (new Date(d.date+'T23:59:59') <= new Date() ? 'auto' : '');
  const isFuture = new Date(d.date+'T23:59:59') > new Date();
  const isScheduled = isFuture || d.paid === false;
  const statusBadge = isScheduled
    ? '<span class="lancamentos-status-badge agendado">Agendado</span>'
    : '<span class="lancamentos-status-badge pago">Pago</span>';
  const catInfo = Store.CATEGORIES[d.category];
  const catBg = catInfo?.color ? catInfo.color + '20' : 'var(--accent-dim)';
  const catColor = catInfo?.color || 'var(--accent)';
  const catLabel = catInfo?.label || d.category;
  const mainPerson = d.split && d.split.length ? d.split[0].person : (d.person || null);
  return `<tr class="row-clickable${(d.year||0)*12+(d.month||0) > year*12+month ? '" style="opacity:0.55"' : '"'} data-row-desp="${d.id}">
  <td class="muted" style="white-space:nowrap">${Utils.fmtDate(d.date)}</td>
  <td>
    <div>${d.desc}${d.desconto ? ` <span class="badge badge-green" style="font-size:10px">desc -${Utils.currency(d.economia||0)}</span>` : ''}${d.split && d.split.length > 1 ? ` <span class="badge badge-accent" style="font-size:10px" title="${d.split.map(s=>s.person+': '+Utils.currency(s.valor)).join(' · ')}">👥 ${d.split.map(s=>s.person[0]).join('+')}</span>` : ''}</div>
    ${d.sub ? `<div class="lancamentos-sub">${d.sub}</div>` : ''}
  </td>
  <td><span class="lancamentos-cat-pill" style="background:${catBg};color:${catColor}">${catLabel}</span></td>
  <td>${pessoaAvatarHtml(mainPerson)}</td>
  <td><span class="badge ${d.pay==='Cartão'?'badge-accent':d.pay==='Dinheiro'?'badge-amber':'badge-blue'}">${d.pay||''}</span></td>
  <td class="num negative">${Utils.currency(d.amount)}</td>
  <td>${statusBadge}</td>
  <td style="white-space:nowrap;position:sticky;right:0;background:var(--bg-card);width:42px">
    ${c ? `<button class="btn-ghost" title="${paidState==='on'?'Pago ✓ (clique para desmarcar)':paidState==='auto'?'Considerado pago (data passou) — clique p/ marcar/desmarcar manualmente':'Marcar como pago'}" style="font-size:12px;color:${paidState==='on'?'var(--green)':paidState==='auto'?'var(--green-dim,#22C55E80)':'var(--text-4)'}" data-paid-desp="${d.id}">${paidState==='on'?'✓':paidState==='auto'?'◐':'○'}</button>` : ''}
  </td>
</tr>`;}).join('')}
</tbody>
<tfoot><tr>
  <td colspan="6" class="fw-700">Total (${filtered.length} lançamentos)</td>
  <td class="num negative fw-700">${Utils.currency(total)}</td>
  <td style="position:sticky;right:0;background:var(--bg-card)"></td>
</tr></tfoot>
</table>`;
    }

    function buildRecTable(rows, filter = {}) {
      let filtered = sortRows(rows);
      if (filter.search) filtered = filtered.filter(r => r.desc.toLowerCase().includes(filter.search.toLowerCase()));
      if (filter.cat)    filtered = filtered.filter(r => r.person === filter.cat);
      if (filter.pessoa) filtered = filtered.filter(r => r.person === filter.pessoa);
      const total = filtered.reduce((a, r) => a + r.amount, 0);
      if (filtered.length === 0) return '<div style="text-align:center;padding:40px;color:var(--text-4);font-size:13px">Nenhum lançamento encontrado.</div>';
      return `<table class="data-table">
<thead><tr>
  <th>Data</th><th>Descrição</th><th>Pessoa</th><th>Tipo</th><th>Contrato</th><th class="num">Valor</th><th></th>
</tr></thead>
<tbody>
${filtered.map(r => {
  const c = r.contratoId ? Store.getContratoById(r.contratoId) : null;
  const paidState = r.paid === true ? 'on' : r.paid === false ? 'off' : (new Date(r.date+'T23:59:59') <= new Date() ? 'auto' : '');
  const isFuture = (r.year||0)*12+(r.month||0) > year*12+month;
  return `<tr class="row-clickable${isFuture ? '" style="opacity:0.55"' : '"'} data-row-rec="${r.id}">
  <td class="muted" style="white-space:nowrap">${Utils.fmtDate(r.date)}${isFuture ? ' <span style="font-size:10px;color:var(--accent);font-weight:600">futuro</span>' : ''}</td>
  <td>${r.desc}</td>
  <td><span class="person-chip">${Utils.personAvatarHtml(r.person, { size: 22, fontSize: 10 })}${r.person}</span></td>
  <td class="muted">${({salario:'Salário',contrato:'Contrato',pensao:'Pensão',emprestimo:'Empréstimo',outros:'Outros'})[r.type]||r.type||''}</td>
  <td>${c ? `<span class="badge badge-accent" style="font-size:10px" title="Contrato: ${c.label}">📑 ${c.label}</span>` : '<span class="muted">—</span>'}</td>
  <td class="num positive">${Utils.currency(r.amount)}</td>
  <td style="white-space:nowrap;width:42px">
    ${c ? `<button class="btn-ghost" title="${paidState==='on'?'Recebido ✓':paidState==='auto'?'Considerado recebido (data passou)':'Marcar como recebido'}" style="font-size:12px;color:${paidState==='on'?'var(--green)':paidState==='auto'?'var(--green-dim,#22C55E80)':'var(--text-4)'}" data-paid-rec="${r.id}">${paidState==='on'?'✓':paidState==='auto'?'◐':'○'}</button>` : ''}
  </td>
</tr>`;}).join('')}
</tbody>
<tfoot><tr><td colspan="5" class="fw-700">Total (${filtered.length})</td><td class="num positive fw-700">${Utils.currency(total)}</td><td></td></tr></tfoot>
</table>`;
    }

    // ── tab state ─────────────────────────────────────────────────
    function getFilters() {
      return {
        search: document.getElementById('searchInput')?.value || '',
        cat:    document.getElementById('filterCat')?.value    || '',
        sub:    document.getElementById('filterSub')?.value    || '',
        pay:    document.getElementById('filterPay')?.value    || '',
        pessoa: document.getElementById('filterPessoa')?.value || '',
      };
    }

    function updateSubFilter(cat) {
      const subSel = document.getElementById('filterSub');
      if (!subSel) return;
      const subs = (cat && Store.SUBCATEGORIES[cat]) || [];
      subSel.innerHTML = `<option value="">Todas as sub-categorias</option>` +
        subs.map(s => `<option value="${s}">${s}</option>`).join('');
      subSel.disabled = subs.length === 0;
    }

    function updateSortBtn() {
      const btn = document.getElementById('btnSort');
      if (btn) btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px"><path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Data ${sortDir === 'asc' ? '↑' : '↓'}`;
    }

    function showDespFilters(show) {
      const sub = document.getElementById('filterSub');
      const pay = document.getElementById('filterPay');
      const sort = document.getElementById('btnSort');
      if (sub)  sub.style.display  = show ? '' : 'none';
      if (pay)  pay.style.display  = show ? '' : 'none';
      if (sort) sort.style.display = show ? '' : 'none';
    }

    function refilter() {
      const f = getFilters();
      const tbl = document.getElementById('lancTable');
      if (!tbl) return;
      if (activeTab === 'desp') {
        tbl.innerHTML = buildLancTable(despesas, f);
      } else {
        tbl.innerHTML = buildRecTable(receitas, f);
      }
      attachDeleteHandlers();
    }

    function attachDeleteHandlers() {
      container.querySelectorAll('[data-del-desp]').forEach(btn => {
        btn.addEventListener('click', () => {
          Store.deleteDespesa(btn.dataset.delDesp);
          refilter();
          toast('Despesa removida', 'success');
        });
      });
      container.querySelectorAll('[data-del-rec]').forEach(btn => {
        btn.addEventListener('click', () => {
          Store.deleteReceita(btn.dataset.delRec);
          refilter();
          toast('Receita removida', 'success');
        });
      });
      container.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const tr = e.target.closest('tr[data-row-desp]');
        if (tr) openEditDespesa(tr.dataset.rowDesp, refilter);
      }, { capture: false });
      container.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const tr = e.target.closest('tr[data-row-rec]');
        if (tr) openEditReceita(tr.dataset.rowRec, refilter);
      }, { capture: false });
      container.querySelectorAll('[data-paid-desp]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.paidDesp;
          const d = Store.get().despesas.find(x => x.id === id);
          if (!d) return;
          const next = d.paid === true ? false : true;
          Store.updateDespesa(id, { paid: next });
          refilter();
          toast(next ? 'Parcela marcada como paga' : 'Parcela desmarcada', 'success');
        });
      });
      container.querySelectorAll('[data-paid-rec]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.paidRec;
          const r = Store.get().receitas.find(x => x.id === id);
          if (!r) return;
          const next = r.paid === true ? false : true;
          Store.updateReceita(id, { paid: next });
          refilter();
          toast(next ? 'Parcela marcada como recebida' : 'Parcela desmarcada', 'success');
        });
      });
    }

    bindPeriodToggle(container, 'ff_lanc_period', () => renderLancamentos(container));

    // ── wire up tabs & filters ────────────────────────────────────
    function buildCalendar() {
      const tbl = document.getElementById('lancTable');
      if (!tbl) return;

      // Group entries by day (YYYY-MM-DD)
      const byDay = {};
      despesas.forEach(d => {
        if (!byDay[d.date]) byDay[d.date] = { desp: [], rec: [] };
        byDay[d.date].desp.push(d);
      });
      receitas.forEach(r => {
        if (!byDay[r.date]) byDay[r.date] = { desp: [], rec: [] };
        byDay[r.date].rec.push(r);
      });

      // Totais do mês para sumário no rodapé
      const totMesRec  = receitas.reduce((s, r) => s + r.amount, 0);
      const totMesDesp = despesas.reduce((s, d) => s + d.amount, 0);
      const saldoMes   = totMesRec - totMesDesp;

      const daysInMonth = new Date(year, month, 0).getDate();
      const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun
      const weeks = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

      let html = `<div class="cal-grid">`;
      html += weeks.map(w => `<div class="cal-head">${w}</div>`).join('');

      // blank leading cells
      for (let i = 0; i < firstWeekday; i++) html += `<div class="cal-cell cal-empty"></div>`;

      for (let day = 1; day <= daysInMonth; day++) {
        const mm = String(month).padStart(2,'0');
        const dd = String(day).padStart(2,'0');
        const dateKey = `${year}-${mm}-${dd}`;
        const entries = byDay[dateKey] || { desp: [], rec: [] };
        const today = new Date(); const isToday = today.getFullYear()===year && today.getMonth()+1===month && today.getDate()===day;
        const totalDesp = entries.desp.reduce((a,d) => a + d.amount, 0);
        const totalRec  = entries.rec.reduce((a,r) => a + r.amount, 0);
        const hasTx = entries.desp.length + entries.rec.length > 0;

        html += `<div class="cal-cell${isToday?' cal-today':''}${hasTx?' cal-has-tx':''}" data-cal-date="${dateKey}">
  <span class="cal-day-num">${day}</span>
  <div class="cal-dots">
    ${entries.rec.length  ? `<span class="cal-dot cal-dot-green"  title="${entries.rec.length} receita(s)"></span>` : ''}
    ${entries.desp.length ? `<span class="cal-dot cal-dot-red"    title="${entries.desp.length} despesa(s)"></span>` : ''}
  </div>
  ${hasTx ? `<div class="cal-amounts">
    ${totalRec  ? `<span class="cal-amt-rec">+${Utils.currency(totalRec)}</span>` : ''}
    ${totalDesp ? `<span class="cal-amt-desp">-${Utils.currency(totalDesp)}</span>` : ''}
  </div>` : ''}
</div>`;
      }
      html += `</div>`;

      // Rodapé com sumário do mês (redesign 2026-05)
      html += `<div class="cal-summary">
  <div class="cal-summary-item">
    <span class="cal-summary-dot" style="background:var(--green)"></span>
    <span class="cal-summary-lbl">Receitas</span>
    <span class="cal-summary-val" style="color:var(--green)">+${Utils.currency(totMesRec)}</span>
  </div>
  <div class="cal-summary-item">
    <span class="cal-summary-dot" style="background:var(--red)"></span>
    <span class="cal-summary-lbl">Despesas</span>
    <span class="cal-summary-val" style="color:var(--red)">-${Utils.currency(totMesDesp)}</span>
  </div>
  <div class="cal-summary-item cal-summary-saldo">
    <span class="cal-summary-lbl">Saldo do mês</span>
    <span class="cal-summary-val" style="color:${saldoMes >= 0 ? 'var(--green)' : 'var(--red)'}">${saldoMes < 0 ? '-' : '+'}${Utils.currency(Math.abs(saldoMes))}</span>
  </div>
</div>`;

      // Popover HTML (hidden, shown on click)
      html += `<div id="calPopover" class="cal-popover" style="display:none"></div>`;
      tbl.innerHTML = html;

      // Click handler
      tbl.querySelectorAll('.cal-cell[data-cal-date]').forEach(cell => {
        cell.addEventListener('click', e => {
          const dateKey = cell.dataset.calDate;
          const entries = byDay[dateKey] || { desp: [], rec: [] };
          if (!entries.desp.length && !entries.rec.length) return;
          const pop = document.getElementById('calPopover');
          const [yyyy, mm2, dd2] = dateKey.split('-');
          let rows = '';
          entries.rec.forEach(r => {
            rows += `<div class="cal-pop-row"><span class="cal-pop-dot cal-dot-green"></span><span class="cal-pop-desc">${r.desc}</span><span class="cal-pop-val positive">+${Utils.currency(r.amount)}</span></div>`;
          });
          entries.desp.forEach(d => {
            const cat = Store.CATEGORIES[d.category];
            rows += `<div class="cal-pop-row"><span class="cal-pop-dot cal-dot-red"></span><span class="cal-pop-desc">${d.desc} <span style="font-size:10px;color:var(--text-4)">${cat?.label||d.category}</span></span><span class="cal-pop-val negative">-${Utils.currency(d.amount)}</span></div>`;
          });
          pop.innerHTML = `<div class="cal-pop-head">${dd2}/${mm2}/${yyyy}</div>${rows}`;
          pop.style.display = 'block';
          // position near cell
          const rect = cell.getBoundingClientRect();
          const contRect = tbl.getBoundingClientRect();
          let left = rect.left - contRect.left;
          let top  = rect.bottom - contRect.top + 4;
          pop.style.left = Math.min(left, contRect.width - 220) + 'px';
          pop.style.top  = top + 'px';
          e.stopPropagation();
        });
      });

      // Close popover on outside click
      document.addEventListener('click', function closePop() {
        const pop = document.getElementById('calPopover');
        if (pop) pop.style.display = 'none';
        document.removeEventListener('click', closePop);
      });
    }

    document.getElementById('btnTabDesp').addEventListener('click', () => {
      activeTab = 'desp'; localStorage.setItem('ff_lanc_tab', 'desp');
      document.getElementById('btnTabDesp').classList.add('active');
      document.getElementById('btnTabRec').classList.remove('active');
      document.getElementById('btnTabCal').classList.remove('active');
      document.getElementById('filterBar').style.display = '';
      // Restore desp category options
      document.getElementById('filterCat').innerHTML =
        `<option value="">Todas as categorias</option>` +
        Store.categoriesOrdered().filter(([k]) => k !== 'receita')
          .map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('');
      updateSubFilter('');
      showDespFilters(true);
      refilter();
    });

    document.getElementById('btnTabRec').addEventListener('click', () => {
      activeTab = 'rec'; localStorage.setItem('ff_lanc_tab', 'rec');
      document.getElementById('btnTabRec').classList.add('active');
      document.getElementById('btnTabDesp').classList.remove('active');
      document.getElementById('btnTabCal').classList.remove('active');
      document.getElementById('filterBar').style.display = '';
      document.getElementById('filterCat').innerHTML =
        `<option value="">Todas as pessoas</option>` +
        Store.PESSOAS.map(p => `<option value="${p}">${p}</option>`).join('');
      showDespFilters(false);
      refilter();
    });

    document.getElementById('btnTabCal').addEventListener('click', () => {
      activeTab = 'cal'; localStorage.setItem('ff_lanc_tab', 'cal');
      document.getElementById('btnTabCal').classList.add('active');
      document.getElementById('btnTabDesp').classList.remove('active');
      document.getElementById('btnTabRec').classList.remove('active');
      document.getElementById('filterBar').style.display = 'none';
      buildCalendar();
    });

    document.getElementById('searchInput').addEventListener('input', refilter);

    document.getElementById('filterCat').addEventListener('change', () => {
      if (activeTab === 'desp') updateSubFilter(document.getElementById('filterCat').value);
      refilter();
    });

    document.getElementById('filterSub').addEventListener('change', refilter);
    document.getElementById('filterPay').addEventListener('change', refilter);
    document.getElementById('filterPessoa').addEventListener('change', refilter);
    document.getElementById('btnClearFilters').addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      document.getElementById('filterCat').selectedIndex = 0;
      document.getElementById('filterSub').selectedIndex = 0;
      document.getElementById('filterPay').selectedIndex = 0;
      document.getElementById('filterPessoa').selectedIndex = 0;
      if (activeTab === 'desp') updateSubFilter('');
      refilter();
    });

    document.getElementById('btnSort').addEventListener('click', () => {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      updateSortBtn();
      refilter();
    });

    // ── initial render — restore active tab ──────────────────────
    if (activeTab === 'cal') {
      document.getElementById('btnTabCal').classList.add('active');
      document.getElementById('btnTabDesp').classList.remove('active');
      document.getElementById('filterBar').style.display = 'none';
      buildCalendar();
    } else if (activeTab === 'rec') {
      document.getElementById('btnTabRec').classList.add('active');
      document.getElementById('btnTabDesp').classList.remove('active');
      document.getElementById('filterCat').innerHTML =
        `<option value="">Todas as pessoas</option>` +
        Store.PESSOAS.map(p => `<option value="${p}">${p}</option>`).join('');
      showDespFilters(false);
      refilter();
    } else {
      refilter();
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: RECEITAS
  // ══════════════════════════════════════════════════════════════
  function renderReceitas(container) {
    const year = getYear(), month = getMonth();
    const period = localStorage.getItem('ff_rec_period') || 'mes';
    const { start: mStart, end: mEnd, label: periodLabel } = periodRangeFor(period, month, year);
    const yrRec = Store.yearlyMonthly(year, 'receita');
    const totalAno = yrRec.reduce((a,b) => a+b, 0);
    const media = totalAno / 12;

    // Valor Futuro: soma de Recebimentos Futuros do ano + projeção das parcelas
    // de contratos de receita ainda não realizadas
    const today = new Date();
    const rfPendentes = Store.getRecebimentosFuturos().filter(rf => {
      const ano = rf.ano || parseInt((rf.data || '').slice(0,4));
      return ano === year && rf.status !== 'recebido';
    }).reduce((s, rf) => s + (rf.valor || rf.amount || 0), 0);
    const contratosFuturas = Store.get().receitas
      .filter(r => r.contratoId && r.year === year && r.paid !== true)
      .filter(r => new Date(r.date + 'T23:59:59') > today)
      .reduce((s, r) => s + r.amount, 0);
    const valorFuturo = rfPendentes + contratosFuturas;
    const projecaoAno = totalAno + valorFuturo;
    const metaAnual = (Store.getActiveMetaReceitaMensal() ?? Store.get().settings.metaReceita) * 12;
    const pctMeta = metaAnual > 0 ? projecaoAno / metaAnual : 0;
    const statusCol = pctMeta >= 1 ? 'green' : pctMeta >= 0.8 ? 'amber' : 'red';

    // Per-person yearly
    const pessoas = Store.PESSOAS;
    const byPerson = {};
    Store.get().receitas.filter(r => r.year === year).forEach(r => {
      byPerson[r.person] = byPerson[r.person] || Array(12).fill(0);
      byPerson[r.person][r.month-1] += r.amount;
    });

    // ── Coach inline contextual (redesign 2026-05) ───────────────
    const recMesAtual = Store.sumReceitas(month, year);
    const recMesAnt   = Store.sumReceitas(month > 1 ? month-1 : 12, month > 1 ? year : year-1);
    const recChg = recMesAnt > 0 ? ((recMesAtual - recMesAnt) / recMesAnt * 100) : 0;
    const recRecorrentes = Store.get().receitas
      .filter(r => r.year === year && r.month === month && r.type === 'contrato')
      .reduce((s, r) => s + r.amount, 0);
    const pctRecorrente = recMesAtual > 0 ? (recRecorrentes / recMesAtual * 100) : 0;
    const _recCoach = (() => {
      if (recMesAtual === 0) return { tone: 'neutral', titulo: 'Sem receitas registradas neste mês',
        texto: 'Comece registrando seu salário, contratos recorrentes ou rendimentos eventuais.' };
      if (recChg >= 10) return { tone: 'positive', titulo: 'Receita em alta este mês',
        texto: `Sua receita de <strong>${Utils.currency(recMesAtual)}</strong> está <strong style="color:var(--green)">${recChg.toFixed(1)}% acima</strong> do mês anterior. Boa hora para reforçar metas ou reserva.` };
      if (recChg <= -10) return { tone: 'attention', titulo: 'Receita caiu vs mês anterior',
        texto: `Sua receita de <strong>${Utils.currency(recMesAtual)}</strong> está <strong style="color:var(--amber)">${Math.abs(recChg).toFixed(1)}% abaixo</strong> do mês anterior. Verifique se contratos recorrentes estão em dia.` };
      if (pctRecorrente >= 70) return { tone: 'positive', titulo: 'Receita majoritariamente recorrente',
        texto: `<strong>${pctRecorrente.toFixed(0)}%</strong> da sua receita vem de fontes recorrentes — boa previsibilidade para planejar compromissos e metas.` };
      return { tone: 'neutral', titulo: 'Sua receita está estável',
        texto: `${Utils.currency(recMesAtual)} este mês. ${pctRecorrente > 0 ? `<strong>${pctRecorrente.toFixed(0)}%</strong> vem de fontes recorrentes.` : 'Considere registrar fontes recorrentes para previsibilidade.'}` };
    })();

    container.innerHTML = `
<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">Receitas <span class="page-head-year">— ${year}</span></h1>
    <p class="page-head-meta">
      <span class="page-head-meta-green">${Utils.currency(totalAno)}</span>
      <span class="page-head-meta-sep">·</span>
      <span class="page-head-meta-total">média ${Utils.currency(media)}/mês</span>
    </p>
  </div>
</div>

${coachInlineHTML({
  contexto: `Receitas · ${Utils.monthsFull[month-1]}`,
  titulo: _recCoach.titulo,
  texto: _recCoach.texto,
  tone: _recCoach.tone,
  acoes: [{ label: 'Ver análise completa', action: 'open-coach' }],
})}

<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Total ${year}</div>
      <div class="kpi-value green">${Utils.currency(totalAno)}</div>
      <div class="kpi-sub">Soma de todas as receitas</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--teal);--kpi-bg:var(--teal-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16 7 22 7 22 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Média Mensal</div>
      <div class="kpi-value" style="color:var(--teal)">${Utils.currency(media)}</div>
      <div class="kpi-sub">Meta: ${Utils.currency((Store.getActiveMetaReceitaMensal() ?? Store.get().settings.metaReceita))}</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Meses OK</div>
      <div class="kpi-value accent">${yrRec.filter(v => v >= (Store.getActiveMetaReceitaMensal() ?? Store.get().settings.metaReceita)).length}/12</div>
      <div class="kpi-sub">Atingiram a meta mínima</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--blue);--kpi-bg:var(--blue-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Melhor Mês</div>
      <div class="kpi-value" style="color:var(--blue)">${Utils.currency(Math.max(...yrRec))}</div>
      <div class="kpi-sub">${Utils.months[yrRec.indexOf(Math.max(...yrRec))]} ${year}</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--${statusCol});--kpi-bg:var(--${statusCol}-dim,rgba(245,158,11,.12));grid-column:span 2">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body" style="flex:1">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div>
          <div class="kpi-label">Valor Futuro</div>
          <div class="kpi-value" style="color:var(--${statusCol})">${Utils.currency(valorFuturo)}</div>
          <div class="kpi-sub">${valorFuturo === 0 ? 'Nenhum recebimento futuro previsto' : `Projeção ${year}: ${Utils.currency(projecaoAno)}`}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="kpi-label">Meta Anual</div>
          <div style="font-size:14px;font-weight:600;font-family:var(--mono);color:var(--text-1)">${Utils.currency(metaAnual)}</div>
          <div class="kpi-sub">${(pctMeta*100).toFixed(0)}% atingido</div>
        </div>
      </div>
      <div class="progress-bar" style="margin-top:10px"><div class="progress-fill ${statusCol}" style="width:${Math.min(pctMeta,1)*100}%"></div></div>
    </div>
  </div>
</div>


<div class="card mb-6">
  <div class="card-header"><span class="card-title">Por Pessoa — ${year}</span></div>
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr>
        <th>Pessoa</th>
        ${Utils.months.map(m=>`<th class="num">${m}</th>`).join('')}
        <th class="num">Total</th>
      </tr></thead>
      <tbody>
        ${Object.entries(byPerson).map(([p, vals]) => `<tr>
          <td><span class="person-chip">${Utils.personAvatarHtml(p, { size: 22, fontSize: 10 })}${p}</span></td>
          ${vals.map(v => `<td class="num ${v>0?'positive':'muted'}">${v>0?Utils.currency(v):'—'}</td>`).join('')}
          <td class="num positive fw-700">${Utils.currency(vals.reduce((a,b)=>a+b,0))}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr>
        <td class="fw-700">Total</td>
        ${yrRec.map(v => `<td class="num positive fw-700">${v>0?Utils.currency(v):'—'}</td>`).join('')}
        <td class="num positive fw-700">${Utils.currency(totalAno)}</td>
      </tr></tfoot>
    </table>
  </div>
</div>

<div class="filter-header mb-2">
  <div class="filter-row-1" id="recFilterRow1">
    <div class="filter-sep"></div>
    ${periodToggleHTML('ff_rec_period', period)}
    <div class="filter-row-1-actions">
      <button class="btn-primary" id="btnAddRec">+ Nova Receita</button>
    </div>
  </div>
</div>

<div class="card mb-6">
  <div class="card-header">
    <span class="card-title">Receitas — ${periodLabel}</span>
  </div>
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th>Data</th><th>Descrição</th><th>Pessoa</th><th class="num">Valor</th><th></th></tr></thead>
      <tbody>
        ${Store.get().receitas.filter(r=>r.year===year && r.month>=mStart && r.month<=mEnd).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>{
          const tipoLabel = ({salario:'Salário',contrato:'Contrato',pensao:'Pensão',emprestimo:'Empréstimo',outros:'Outros'})[r.type]||r.type||'';
          const subLabel = r.sub || tipoLabel;
          return `<tr class="row-clickable" data-row-rec="${r.id}">
          <td class="muted" style="white-space:nowrap">${Utils.fmtDate(r.date)}</td>
          <td>
            <div>${r.desc}</div>
            ${subLabel ? `<div class="lancamentos-sub">${subLabel}</div>` : ''}
          </td>
          <td><span class="person-chip">${Utils.personAvatarHtml(r.person, { size: 22, fontSize: 10 })}${r.person}</span></td>
          <td class="num positive">${Utils.currency(r.amount)}</td>
        </tr>`;}).join('')}
      </tbody>
    </table>
  </div>
</div>

<div class="card mb-6">
  <div class="card-header">
    <span class="card-title">Recebimentos Futuros</span>
    <button class="btn-xs" id="btnAddRf">+ Novo</button>
  </div>
  ${(() => {
    const rfs = Store.getRecebimentosFuturos().slice().sort((a,b) => {
      const da = a.data || `${a.ano}-${String(a.mes).padStart(2,'0')}-01`;
      const db = b.data || `${b.ano}-${String(b.mes).padStart(2,'0')}-01`;
      return da.localeCompare(db);
    });
    if (!rfs.length) return '<div class="empty-state" style="padding:24px;text-align:center;color:var(--text-4);font-size:12px">Nenhum recebimento futuro cadastrado. Use para planejar entradas previstas (PLR, reembolsos, vendas, etc).</div>';
    return rfs.map(rf => {
      const data = rf.data || `${rf.ano}-${String(rf.mes).padStart(2,'0')}-05`;
      const d = new Date(data + 'T12:00:00');
      return `
      <div class="stat-row">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text-1)">${rf.descricao || rf.desc}</div>
          <div style="font-size:11px;color:var(--text-3)">${d.toLocaleDateString('pt-BR')} · ${rf.responsavel || rf.person || '—'}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="stat-row-value green">${Utils.currency(rf.valor || rf.amount)}</div>
          <button class="btn-icon-sm success" data-realizar-rf="${rf.id}" title="Realizar (vira receita)">${icon('check', {size:14})}</button>
          <button class="btn-icon-sm danger" data-del-rf="${rf.id}" title="Excluir">${icon('trash-2', {size:14})}</button>
        </div>
      </div>`;
    }).join('');
  })()}
</div>`;


    container.querySelectorAll('[data-del-rec]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.deleteReceita(btn.dataset.delRec);
        renderReceitas(container);
        toast('Receita removida', 'success');
      });
    });
    container.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      const tr = e.target.closest('tr[data-row-rec]');
      if (tr) openEditReceita(tr.dataset.rowRec, () => renderReceitas(container));
    });

    renderPageMonthPicker(container.querySelector('#recFilterRow1'));
    document.getElementById('btnAddRec')?.addEventListener('click', () => openAddReceita(container));
    bindPeriodToggle(container, 'ff_rec_period', () => renderReceitas(container));

    document.getElementById('btnAddRf')?.addEventListener('click', () => openRfModal(container));
    container.querySelectorAll('[data-del-rf]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Excluir este recebimento futuro?')) return;
        Store.deleteRecebimentoFuturo(btn.dataset.delRf);
        renderReceitas(container);
        toast('Recebimento futuro removido', 'success');
      });
    });
    container.querySelectorAll('[data-realizar-rf]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.realizarRecebimentoFuturo(btn.dataset.realizarRf);
        renderReceitas(container);
        toast('Recebimento convertido em receita', 'success');
      });
    });
  }

  function openRfModal(container) {
    const today = new Date().toISOString().slice(0,10);
    const html = `<div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Descrição</label><input class="form-input" id="fRfDesc" placeholder="Ex: PLR, Reembolso, Venda Y"/></div>
      <div class="form-group"><label class="form-label">Valor (R$)</label><input class="form-input" id="fRfAmt" type="number" step="0.01"/></div>
      <div class="form-group"><label class="form-label">Data prevista</label><input class="form-input" id="fRfDate" type="date" value="${today}"/></div>
      <div class="form-group"><label class="form-label">Responsável</label><select class="form-select" id="fRfPerson">${Store.PESSOAS.map(p=>`<option>${p}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Tipo</label><select class="form-select" id="fRfType">
        <option value="salario">Salário</option><option value="contrato">Contrato</option>
        <option value="pensao">Pensão</option><option value="emprestimo">Empréstimo</option>
        <option value="outros" selected>Outros</option>
      </select></div>
    </div>`;
    Modal.open('Novo Recebimento Futuro', html, () => {
      const desc = document.getElementById('fRfDesc').value.trim();
      const valor = parseFloat(document.getElementById('fRfAmt').value);
      const data = document.getElementById('fRfDate').value;
      const responsavel = document.getElementById('fRfPerson').value;
      const type = document.getElementById('fRfType').value;
      if (!desc || !valor || !data) return toast('Preencha descrição, valor e data', 'error');
      const d = new Date(data + 'T12:00:00');
      Store.addRecebimentoFuturo({
        descricao: desc, valor, data, responsavel, type,
        mes: d.getMonth() + 1, ano: d.getFullYear(), status: 'pendente',
      });
      Modal.close();
      renderReceitas(container);
      toast('Recebimento futuro cadastrado', 'success');
    });
  }

  function openAddReceita(refreshContainer) {
    const suggestions = Store.receitaSuggestions();
    const suggestMap  = Object.fromEntries(suggestions.map(s => [s.desc, s]));
    const html = `<div class="form-grid">
      <div class="form-group form-full">
        <label class="form-label">Descrição</label>
        <div class="ac-wrap">
          <input class="form-input" id="fRecDesc" placeholder="Ex: Salário, Contrato, Pensão…" autocomplete="off"/>
          <div class="ac-list" id="fRecDescAc"></div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Valor (R$)</label><input class="form-input" id="fRecAmt" type="number" step="0.01" placeholder="0,00"/></div>
      <div class="form-group"><label class="form-label">Data</label><input class="form-input" id="fRecDate" type="date" value="${new Date().toISOString().slice(0,10)}"/></div>
      <div class="form-group"><label class="form-label">Pessoa</label><select class="form-select" id="fRecPerson">${Store.PESSOAS.map(p=>`<option>${p}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Tipo</label><select class="form-select" id="fRecType">
        <option value="salario">Salário</option><option value="contrato">Contrato</option>
        <option value="pensao">Pensão</option><option value="emprestimo">Empréstimo</option>
        <option value="outros">Outros</option>
      </select></div>
    </div>`;
    Modal.open('Nova Receita', html, () => {
      const desc   = document.getElementById('fRecDesc').value.trim();
      const amount = parseFloat(document.getElementById('fRecAmt').value);
      const date   = document.getElementById('fRecDate').value;
      const person = document.getElementById('fRecPerson').value;
      const type   = document.getElementById('fRecType').value;
      if (!desc || !amount || !date) return toast('Preencha todos os campos', 'error');
      const d = new Date(date);
      Store.addReceita({ desc, amount, date, person, type, category: 'receita', month: d.getMonth()+1, year: d.getFullYear() });
      Modal.close();
      renderReceitas(refreshContainer);
      toast('Receita adicionada!', 'success');
    });
    setTimeout(() => {
      setupAC('fRecDesc', 'fRecDescAc', suggestions.map(s => s.desc), val => {
        const match = suggestMap[val];
        if (match) {
          const pSel = document.getElementById('fRecPerson');
          const tSel = document.getElementById('fRecType');
          if (pSel && match.person) pSel.value = match.person;
          if (tSel && match.type)   tSel.value = match.type;
        }
      });
    }, 50);
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: DESPESAS
  // ══════════════════════════════════════════════════════════════
  function renderDespesas(container) {
    const month = getMonth(), year = getYear();
    const period = localStorage.getItem('ff_desp_period') || 'mes';
    const { start: mStart, end: mEnd, label: periodLabel } = periodRangeFor(period, month, year);

    const despesas = Store.get().despesas.filter(d => d.year === year && d.month >= mStart && d.month <= mEnd);
    const catMap = {};
    despesas.forEach(d => { catMap[d.category] = (catMap[d.category] || 0) + d.amount; });
    const total = Object.values(catMap).reduce((a,b) => a+b, 0);

    const catSorted = Object.entries(catMap).sort((a,b) => b[1]-a[1]);

    const yrDesp = Store.yearlyMonthly(year, 'despesa');

    const familyCtx = typeof SupabaseSync !== 'undefined' ? SupabaseSync.getFamilyContext() : null;
    const isMember  = familyCtx && familyCtx.role === 'member';

    const anomalias = period === 'mes' ? detectAnomalias(month, year) : [];

    // ── Coach inline contextual (redesign 2026-05) ───────────────
    const _despCoach = (() => {
      if (despesas.length === 0) return { tone: 'neutral', titulo: 'Sem despesas no período',
        texto: 'Comece registrando seus gastos para o Coach analisar padrões e categorias.' };
      const topCat = catSorted[0];
      const topPct = total > 0 ? (topCat[1] / total * 100) : 0;
      const catLabel = Store.CATEGORIES[topCat[0]]?.label || topCat[0];
      if (anomalias.length >= 2) return { tone: 'critical', titulo: `${anomalias.length} categorias com salto detectado`,
        texto: `O Coach identificou aumentos significativos em <strong>${anomalias.slice(0,2).map(a => Store.CATEGORIES[a.cat]?.label || a.cat).join(', ')}</strong> este mês. Vale revisar antes de virar comprometimento.` };
      if (topPct >= 50) return { tone: 'attention', titulo: `${catLabel} concentra ${topPct.toFixed(0)}% das despesas`,
        texto: `${Utils.currency(topCat[1])} foi em <strong>${catLabel}</strong>. Uma única categoria com mais de metade dos gastos vale uma revisão por subcategoria.` };
      if (topPct >= 35) return { tone: 'attention', titulo: 'Concentração em uma categoria',
        texto: `<strong>${catLabel}</strong> representa <strong>${topPct.toFixed(0)}%</strong> das suas despesas (${Utils.currency(topCat[1])}). Vale acompanhar a evolução nos próximos meses.` };
      return { tone: 'neutral', titulo: 'Despesas distribuídas',
        texto: `${Utils.currency(total)} em ${despesas.length} lançamentos, lideradas por <strong>${catLabel}</strong> (${topPct.toFixed(0)}%). Distribuição saudável.` };
    })();

    container.innerHTML = `
<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">Despesas <span class="page-head-year">— ${periodLabel}</span></h1>
    <p class="page-head-meta">
      <span class="page-head-meta-red">${Utils.currency(total)}</span>
      <span class="page-head-meta-sep">·</span>
      <span class="page-head-meta-total">${despesas.length} lançamentos</span>
      ${catSorted.length ? `<span class="page-head-meta-sep">·</span><span class="page-head-meta-total">${catSorted.length} categorias</span>` : ''}
    </p>
  </div>
</div>
${isMember ? `
<div class="card mb-4" style="border-color:var(--amber)30;background:var(--amber)08">
  <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--amber)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    Você está no modo Membro — veja apenas suas despesas e rateios.
  </div>
</div>` : ''}
${coachInlineHTML({
  contexto: `Despesas · ${Utils.monthsFull[month-1]}`,
  titulo: _despCoach.titulo,
  texto: _despCoach.texto,
  tone: _despCoach.tone,
  acoes: [{ label: 'Ver análise completa', action: 'open-coach' }],
})}

<div class="filter-header mb-4">
  <div class="filter-row-1" id="despFilterRow1">
    <div class="filter-sep"></div>
    ${periodToggleHTML('ff_desp_period', period)}
    <div class="filter-row-1-actions">
      ${isMember
        ? `<button class="btn-primary" id="btnAddDesp">+ Lançar Despesa</button>`
        : `<button class="btn-primary" id="btnAddDesp">+ Nova Despesa</button>`}
    </div>
  </div>
</div>

<div class="chart-grid mb-6">
  <div class="card">
    <div class="card-header"><span class="card-title">Distribuição por Categoria</span></div>
    <div class="chart-wrap"><canvas id="chartDespCat" class="chart-canvas"></canvas></div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title">Por Pessoa</span></div>
    <div class="chart-with-legend">
      <canvas id="chartDespPessoa"></canvas>
      <div class="donut-legend" id="despPessoaLegend"></div>
    </div>
  </div>
</div>


<div class="card mb-6">
  <div class="card-header"><span class="card-title">Por Categoria — ${year}</span><span style="font-size:11px;color:var(--text-4)">visão anual completa</span></div>
  <div class="table-wrap">
    <table class="data-table" style="min-width:960px">
      <thead><tr>
        <th>Categoria</th>
        ${Utils.months.map(m=>`<th class="num" style="font-size:11px;padding:8px 6px">${m}</th>`).join('')}
        <th class="num">Total</th>
      </tr></thead>
      <tbody>
        ${(() => {
          const byCat = {};
          Store.get().despesas.filter(d => d.year === year).forEach(d => {
            byCat[d.category] = byCat[d.category] || Array(12).fill(0);
            byCat[d.category][d.month - 1] += d.amount;
          });
          const ordered = Object.entries(byCat)
            .filter(([k]) => k !== 'receita')
            .sort((a,b) => b[1].reduce((x,y)=>x+y,0) - a[1].reduce((x,y)=>x+y,0));
          return ordered.map(([cat, vals]) => {
            const info = Store.CATEGORIES[cat] || {};
            const total = vals.reduce((a,b) => a+b, 0);
            return `<tr>
              <td><span class="badge" style="background:${(info.color||'#7C6EF8')+'20'};color:${info.color||'#7C6EF8'};white-space:nowrap">${info.label||cat}</span></td>
              ${vals.map(v => `<td class="num ${v>0?'negative':'muted'}" style="font-family:'JetBrains Mono',monospace;font-size:11px;white-space:nowrap;padding:8px 6px">${v>0?Utils.currency(v):'—'}</td>`).join('')}
              <td class="num negative fw-700" style="font-family:'JetBrains Mono',monospace;font-size:11px;white-space:nowrap;padding:8px 6px">${Utils.currency(total)}</td>
            </tr>`;
          }).join('');
        })()}
      </tbody>
      <tfoot><tr>
        <td class="fw-700">Total</td>
        ${yrDesp.map(v => `<td class="num negative fw-700" style="font-family:'JetBrains Mono',monospace;font-size:11px;white-space:nowrap;padding:8px 6px">${v>0?Utils.currency(v):'—'}</td>`).join('')}
        <td class="num negative fw-700" style="font-family:'JetBrains Mono',monospace;font-size:11px;white-space:nowrap">${Utils.currency(yrDesp.reduce((a,b)=>a+b,0))}</td>
      </tr></tfoot>
    </table>
  </div>
</div>

${anomaliasHTML(anomalias, total)}

<div class="card">
  <div class="card-header">
    <span class="card-title">Detalhamento — ${Utils.monthsFull[month-1]}</span>
    <div style="display:flex;gap:8px">
      <select class="form-select" id="despPessoaFilter" style="width:150px">
        <option value="">Todas as pessoas</option>
        ${Store.PESSOAS.map(p=>`<option value="${p}">${p}</option>`).join('')}
      </select>
      <select class="form-select" id="despCatFilter" style="width:180px">
        <option value="">Todas as categorias</option>
        ${Store.categoriesOrdered().filter(([k])=>k!=='receita').map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="table-wrap" id="despTable">
    ${buildDespTable(despesas)}
  </div>
</div>`;

    function buildDespTable(rows, catFilter = '', pessoaFilter = '') {
      let filtered = rows;
      if (catFilter)    filtered = filtered.filter(d => d.category === catFilter);
      if (pessoaFilter) filtered = filtered.filter(d => d.split && d.split.some(s => s.person === pessoaFilter));
      const tot = filtered.reduce((a,d) => a+d.amount, 0);
      return `<table class="data-table">
<thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Pessoa</th><th>Pagamento</th><th class="num">Valor</th></tr></thead>
<tbody>${filtered.sort((a,b)=>a.date.localeCompare(b.date)).map(d=>{
  const isFut = (d.year||0)*12+(d.month||0) > year*12+month;
  // Pessoa principal: split[0] (pagador) ou d.person
  const mainPerson = d.split && d.split.length ? d.split[0].person : (d.person || null);
  const splitInfo = d.split && d.split.length > 1
    ? ` <span class="badge badge-accent" style="font-size:10px;margin-left:4px" title="${d.split.map(s=>s.person+': '+Utils.currency(s.valor)).join(' · ')}">+${d.split.length-1}</span>`
    : '';
  return`<tr class="row-clickable${isFut?' style="opacity:0.55"':'"'} data-row-desp="${d.id}">
  <td class="muted" style="white-space:nowrap">${Utils.fmtDate(d.date)}${isFut?' <span style="font-size:10px;color:var(--accent);font-weight:600">futuro</span>':''}</td>
  <td style="font-weight:500">
    <div>${d.desc}${d.desconto?` <span class="badge badge-green" title="Economia: ${Utils.currency(d.economia||0)}">desc.</span>`:''}</div>
    ${d.sub ? `<div class="lancamentos-sub">${d.sub}</div>` : ''}
  </td>
  <td><span class="badge" style="background:${Store.CATEGORIES[d.category]?.color+'20'};color:${Store.CATEGORIES[d.category]?.color}">${Store.CATEGORIES[d.category]?.label||d.category}</span></td>
  <td>${mainPerson ? `<span class="person-chip">${Utils.personAvatarHtml(mainPerson, { size: 22, fontSize: 10 })}${mainPerson}${splitInfo}</span>` : '<span class="muted">—</span>'}</td>
  <td><span class="badge ${d.pay==='Cartão'?'badge-accent':d.pay==='Dinheiro'?'badge-amber':'badge-blue'}">${d.pay||''}</span></td>
  <td class="num negative">${Utils.currency(d.amount)}</td>
</tr>`}).join('')}</tbody>
<tfoot><tr><td colspan="5" class="fw-700">Total</td><td class="num negative fw-700">${Utils.currency(tot)}</td></tr></tfoot>
</table>`;
    }

    requestAnimationFrame(() => {
      // HBar: distribuição por categoria com valor + percentual
      const hbarData = catSorted.slice(0, 8).map(([cat, val]) => ({
        label: Store.CATEGORIES[cat]?.label || cat,
        value: val,
        color: Store.CATEGORIES[cat]?.color,
        pct:   total > 0 ? (val / total * 100) : 0,
      }));
      Charts.HBar(document.getElementById('chartDespCat'), hbarData, {
        barH: 24, padL: 150, padR: 110, gap: 7, showPct: true,
      });

      // Donut: Por Pessoa
      const pessoaMap = Store.despesasPorPessoaRange(mStart, mEnd, year);
      const pessoaEntries = Object.entries(pessoaMap).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]);
      const totalP = pessoaEntries.reduce((s,[,v]) => s+v, 0);
      const donutPessoa = pessoaEntries.map(([p, v]) => ({
        label: p, value: v, color: Utils.personColor(p),
      }));
      if (donutPessoa.length) {
        Charts.Donut(document.getElementById('chartDespPessoa'), donutPessoa, {
          size: 190, centerLabel: Charts.fmt(totalP, true), centerSub: 'total',
        });
        document.getElementById('despPessoaLegend').innerHTML = donutPessoa.map(d => `
          <div class="donut-legend-item">
            <div class="donut-legend-dot" style="background:${d.color}"></div>
            <span class="donut-legend-label">${d.label}</span>
            <span class="donut-legend-pct">${totalP > 0 ? ((d.value/totalP)*100).toFixed(0) : 0}%</span>
            <span class="donut-legend-val">${Charts.fmt(d.value, true)}</span>
          </div>`).join('');
      } else {
        document.getElementById('despPessoaLegend').innerHTML =
          '<div style="font-size:12px;color:var(--text-4);padding:8px">Sem rateio no período</div>';
      }
    });

    function refilterDespTable() {
      const cat    = document.getElementById('despCatFilter')?.value    || '';
      const pessoa = document.getElementById('despPessoaFilter')?.value || '';
      document.getElementById('despTable').innerHTML = buildDespTable(despesas, cat, pessoa);
      attachDespDeleteHandlers();
    }
    document.getElementById('despCatFilter').addEventListener('change', refilterDespTable);
    document.getElementById('despPessoaFilter').addEventListener('change', refilterDespTable);

    function attachDespDeleteHandlers() {
      container.querySelectorAll('[data-del-desp]').forEach(btn => {
        btn.addEventListener('click', () => {
          Store.deleteDespesa(btn.dataset.delDesp);
          renderDespesas(container);
          toast('Despesa removida', 'success');
        });
      });
      container.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const tr = e.target.closest('tr[data-row-desp]');
        if (tr) openEditDespesa(tr.dataset.rowDesp, () => renderDespesas(container));
      });
    }
    attachDespDeleteHandlers();

    renderPageMonthPicker(container.querySelector('#despFilterRow1'));
    document.getElementById('btnAddDesp')?.addEventListener('click', () => {
      if (isMember && familyCtx?.pessoaName) openMemberDespesa(familyCtx.pessoaName, () => renderDespesas(container));
      else openAddDespesa(container);
    });
    bindPeriodToggle(container, 'ff_desp_period', () => renderDespesas(container));

    // Anomalias card toggle
    document.getElementById('anomaliasCard')?.addEventListener('click', () => {
      const body    = document.getElementById('anomaliasBody');
      const chevron = document.getElementById('anomaliasChevron');
      if (!body) return;
      const open = body.style.display === 'flex';
      body.style.display = open ? 'none' : 'flex';
      if (chevron) chevron.style.transform = open ? '' : 'rotate(180deg)';
    });
  }

  // ── Helper: seção de rateio reutilizável em modais de despesa ──
  function splitSectionHTML() {
    return `
<div class="form-group form-full" style="display:flex;align-items:center;gap:16px;padding:4px 0;flex-wrap:wrap">
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
    <input type="checkbox" id="fDRatear" style="width:16px;height:16px;accent-color:var(--accent)">
    <span class="form-label" style="margin:0">Ratear entre pessoas</span>
  </label>
  <div id="fDRateioMode" style="display:none;align-items:center;gap:6px">
    <span style="font-size:11px;color:var(--text-3)">Inserir em:</span>
    <div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden">
      <button type="button" data-rateio-mode="valor"
        style="padding:3px 10px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:var(--accent);color:#fff" id="fDModeValor">R$</button>
      <button type="button" data-rateio-mode="pct"
        style="padding:3px 10px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:transparent;color:var(--text-2)" id="fDModePct">%</button>
    </div>
  </div>
</div>
<div id="fDRateioBox" style="display:none;grid-column:1/-1;background:var(--bg-elevated);border-radius:8px;padding:12px">
  <div id="fDRateioList"></div>
  <button type="button" class="btn-xs" id="fDRateioAdd" style="margin-top:8px">+ Pessoa</button>
  <div id="fDRateioSummary" style="font-size:11px;color:var(--text-3);margin-top:8px"></div>
</div>`;
  }

  // Retorna interface: { read(): split[] | null }
  function setupSplitUI(amountInputId, initialSplit) {
    // rows armazena sempre em R$ internamente; pct é só modo de entrada
    let rows = (initialSplit || []).map(s => ({ person: s.person, valor: Number(s.valor) || 0 }));
    let mode = 'valor';
    // pcts armazena o percentual digitado por linha para recalcular quando o total muda
    let pcts = [];

    const cb      = document.getElementById('fDRatear');
    const box     = document.getElementById('fDRateioBox');
    const modeBox = document.getElementById('fDRateioMode');
    const btnVal  = document.getElementById('fDModeValor');
    const btnPct  = document.getElementById('fDModePct');

    function getAmount() { return parseFloat(document.getElementById(amountInputId)?.value) || 0; }

    function applyModeStyle() {
      const isVal = mode === 'valor';
      btnVal.style.background = isVal ? 'var(--accent)' : 'transparent';
      btnVal.style.color      = isVal ? '#fff' : 'var(--text-2)';
      btnPct.style.background = isVal ? 'transparent' : 'var(--accent)';
      btnPct.style.color      = isVal ? 'var(--text-2)' : '#fff';
    }

    function renderRows() {
      const list = document.getElementById('fDRateioList');
      const amt = getAmount();
      if (pcts.length !== rows.length) pcts = rows.map(r => amt > 0 ? (r.valor / amt * 100) : 0);
      list.innerHTML = rows.map((r, i) => {
        const v = mode === 'valor' ? r.valor.toFixed(2) : (pcts[i] ?? 0).toFixed(1);
        const unit = mode === 'valor' ? 'R$' : '%';
        const step = mode === 'valor' ? '0.01' : '0.1';
        return `<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center" data-row="${i}">
          <select class="form-select" data-field="person" style="flex:1">
            ${Store.PESSOAS.map(p => `<option ${r.person===p?'selected':''}>${p}</option>`).join('')}
          </select>
          <div style="display:flex;align-items:center;gap:0;border:1px solid var(--border);border-radius:6px;overflow:hidden">
            <input class="form-input" data-field="valor" type="number" step="${step}" min="0" value="${v}"
              style="width:90px;border:none;border-radius:0;text-align:right">
            <span style="padding:0 8px;font-size:12px;font-weight:600;color:var(--text-3);background:var(--bg-elevated);border-left:1px solid var(--border)">${unit}</span>
          </div>
          <button type="button" class="btn-icon-sm danger" data-action="remove" title="Remover">${icon('trash-2', {size:14})}</button>
        </div>`;
      }).join('');

      list.querySelectorAll('[data-row]').forEach(row => {
        const idx = parseInt(row.dataset.row);
        row.querySelector('[data-field="person"]').addEventListener('change', e => { rows[idx].person = e.target.value; updateSummary(); });
        row.querySelector('[data-field="valor"]').addEventListener('input', e => {
          const raw = parseFloat(e.target.value) || 0;
          if (mode === 'pct') {
            pcts[idx] = raw;
            rows[idx].valor = (raw / 100) * getAmount();
          } else {
            rows[idx].valor = raw;
            pcts[idx] = getAmount() > 0 ? (raw / getAmount() * 100) : 0;
          }
          updateSummary();
        });
        row.querySelector('[data-action="remove"]').addEventListener('click', () => { rows.splice(idx, 1); pcts.splice(idx, 1); renderRows(); });
      });
      updateSummary();
    }

    function updateSummary() {
      const amt = getAmount();
      const total = rows.reduce((s, r) => s + (Number(r.valor) || 0), 0);
      const resto = Math.max(0, amt - total);
      const over = total > amt + 0.01;
      const sum = document.getElementById('fDRateioSummary');
      if (!sum) return;
      const totalPct = amt > 0 ? (total / amt * 100).toFixed(1) : '0.0';
      sum.innerHTML = `
        Alocado: <strong>${Utils.currency(total)}</strong> (${totalPct}%) de ${Utils.currency(amt)}
        · Família: <strong>${Utils.currency(resto)}</strong>
        ${over ? '<span style="color:var(--red)"> · Soma excede o valor</span>' : ''}`;
    }

    function setOpen(on) {
      box.style.display     = on ? 'block' : 'none';
      modeBox.style.display = on ? 'flex' : 'none';
      if (on && rows.length === 0) {
        rows = [{ person: Store.PESSOAS[0] || 'Roberto', valor: 0 }];
        pcts = [0];
      }
      if (on) renderRows();
    }

    cb.addEventListener('change', () => setOpen(cb.checked));

    [btnVal, btnPct].forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.rateioMode;
      applyModeStyle();
      renderRows();
    }));

    document.getElementById('fDRateioAdd').addEventListener('click', () => {
      const used = new Set(rows.map(r => r.person));
      const next = Store.PESSOAS.find(p => !used.has(p)) || Store.PESSOAS[0];
      rows.push({ person: next, valor: 0 });
      pcts.push(0);
      renderRows();
    });

    // Quando o valor total muda, recalcula em modo % para manter os percentuais
    document.getElementById(amountInputId)?.addEventListener('input', () => {
      if (mode === 'pct') {
        const amt = getAmount();
        rows = rows.map((r, i) => ({ ...r, valor: (pcts[i] ?? 0) / 100 * amt }));
      } else {
        const amt = getAmount();
        pcts = rows.map(r => amt > 0 ? (r.valor / amt * 100) : 0);
      }
      updateSummary();
    });

    if (initialSplit && initialSplit.length) {
      cb.checked = true;
      setOpen(true);
    }

    return {
      read() {
        if (!cb.checked) return null;
        return rows.filter(r => r.valor > 0).map(r => ({ person: r.person, valor: Math.round(r.valor * 100) / 100 }));
      }
    };
  }

  const IA_KEYWORDS = [
    // moradia
    { kws: ['aluguel'], cat: 'moradia', sub: 'Aluguel' },
    { kws: ['energia','luz','cemig','cpfl','coelba','enel'], cat: 'moradia', sub: 'Energia Elétrica' },
    { kws: ['agua','saneamento','sabesp','copasa','embasa'], cat: 'moradia', sub: 'Água e Saneamento' },
    { kws: ['netflix'], cat: 'moradia', sub: 'Netflix' },
    { kws: ['hbo','max'], cat: 'moradia', sub: 'HBO' },
    { kws: ['spotify'], cat: 'moradia', sub: 'Spotify' },
    { kws: ['amazon prime','prime video'], cat: 'moradia', sub: 'Amazon Prime' },
    { kws: ['apple','icloud'], cat: 'moradia', sub: 'Apple' },
    { kws: ['ifood'], cat: 'moradia', sub: 'iFood' },
    { kws: ['internet','tim','claro','vivo','oi','net','condominio','condomínio'], cat: 'moradia', sub: 'TV / Internet / Telefone' },
    { kws: ['reforma','reparo','manutencao','manutenção','pintura','encanador','eletricista'], cat: 'moradia', sub: 'Reparos e Manutenção' },
    { kws: ['movel','móvel','moveis','móveis','sofa','sofá','armario','armário'], cat: 'moradia', sub: 'Móveis e itens casa' },
    // alimentacao
    { kws: ['supermercado','mercado','carrefour','extra','walmart','atacadao','atacadão','assai','assaí','pao de acucar','pão de açúcar','hortifruti'], cat: 'alimentacao', sub: 'Supermercado' },
    { kws: ['feira','sacolao','sacolão','horta','verdura'], cat: 'alimentacao', sub: 'Feira / Sacolão' },
    { kws: ['padaria','confeitaria','pao','pão','cafe','café'], cat: 'alimentacao', sub: 'Padaria' },
    { kws: ['acougue','açougue','carne','churrasco'], cat: 'alimentacao', sub: 'Açougue' },
    { kws: ['nespresso','capsula','cápsula'], cat: 'alimentacao', sub: 'Nespresso' },
    { kws: ['sorvete','gelato'], cat: 'alimentacao', sub: 'Sorveteria' },
    { kws: ['agua mineral','galao','galão','mineral'], cat: 'alimentacao', sub: 'Água' },
    { kws: ['lanche','faculdade','cantina'], cat: 'alimentacao', sub: 'Lanche na Faculdade' },
    { kws: ['restaurante','almoco','almoço','jantar','pizza','sushi','hamburguer','hamburgueria','mc donalds','mcdonalds','burguer king','subway'], cat: 'alimentacao', sub: 'Supermercado' },
    // transporte
    { kws: ['uber','99','cabify','taxi','táxi'], cat: 'transporte', sub: 'Uber' },
    { kws: ['combustivel','combustível','gasolina','etanol','diesel','posto'], cat: 'transporte', sub: 'Combustível' },
    { kws: ['estacionamento','parking','zona azul'], cat: 'transporte', sub: 'Estacionamento' },
    { kws: ['multa','denatran','detran'], cat: 'transporte', sub: 'Multas' },
    { kws: ['ipva'], cat: 'transporte', sub: 'IPVA' },
    { kws: ['seguro auto','porto seguro auto'], cat: 'transporte', sub: 'Seguro' },
    { kws: ['oficina','mecanico','mecânico','revisao','revisão','pneu','borracheiro'], cat: 'transporte', sub: 'Manutenção' },
    { kws: ['aluguel carro','localiza','movida','unidas'], cat: 'transporte', sub: 'Aluguel Carro' },
    // saude
    { kws: ['unimed','amil','bradesco saude','saude','hapvida','sulamerica'], cat: 'saude', sub: 'Convênio Médico' },
    { kws: ['farmacia','farmácia','drogaria','droga','medicamento','remedio','remédio'], cat: 'saude', sub: 'Medicamentos' },
    { kws: ['dentista','odonto','ortodontia'], cat: 'saude', sub: 'Dentista' },
    { kws: ['pronto socorro','emergencia','emergência','hospital','clinica','clínica','consulta'], cat: 'saude', sub: 'Emergências' },
    { kws: ['higiene','shampoo','sabonete','creme','desodorante'], cat: 'saude', sub: 'Higiene Pessoal' },
    // pessoal
    { kws: ['cabelo','salao','salão','cabeleireiro','manicure','pedicure','estetica','estética','spa'], cat: 'pessoal', sub: 'Beleza' },
    { kws: ['roupa','calcado','calçado','tenis','tênis','vestuario','vestuário','zara','renner','riachuelo','hm'], cat: 'pessoal', sub: 'Vestuário' },
    { kws: ['assinatura','revista','jornal'], cat: 'pessoal', sub: 'Assinaturas' },
    { kws: ['presente','gift'], cat: 'pessoal', sub: 'Presentes' },
    // dogs
    { kws: ['pet','racao','ração','veterinario','veterinário','banho tosa','banho e tosa','dog','gato','cachorro'], cat: 'dogs', sub: 'Ração' },
    // lazer
    { kws: ['cinema','teatro','show','ingresso','eventim','sympla'], cat: 'lazer', sub: 'Entretenimento' },
    { kws: ['viagem','hotel','airbnb','passagem','voo','decolar','latam','gol'], cat: 'lazer', sub: 'Viagem' },
    { kws: ['academia','smart fit','bodytech','crossfit'], cat: 'saude', sub: 'Convênio Médico' },
    // financeiro
    { kws: ['juros','taxa','tarifa bancaria','tarifa','anuidade','cartao','cartão','fatura'], cat: 'financeiro', sub: 'Tarifas Bancárias' },
    { kws: ['emprestimo','empréstimo','financiamento','parcela'], cat: 'financeiro', sub: 'Empréstimos' },
    { kws: ['seguro vida','seguro residencial'], cat: 'financeiro', sub: 'Seguros' },
    // educacao
    { kws: ['faculdade','mensalidade','colegio','colégio','escola','curso','material escolar','livro'], cat: 'educacao', sub: 'Mensalidade' },
    // beneficios / assessorias
    { kws: ['contador','contabilidade','advocacia','advogado','consultoria'], cat: 'assessorias', sub: 'Assessoria' },
  ];

  function suggestCategory(desc) {
    const data = Store.get();
    const knowledge = (data.settings && data.settings.iaKnowledge) || {};
    const norm = desc.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    if (!norm) return null;
    // Check user's personal knowledge base first
    if (knowledge[norm]) return knowledge[norm];
    // Partial match in knowledge base
    for (const [key, val] of Object.entries(knowledge)) {
      if (norm.includes(key) || key.includes(norm)) return val;
    }
    // Keyword dictionary
    for (const entry of IA_KEYWORDS) {
      if (entry.kws.some(kw => norm.includes(kw))) {
        return { category: entry.cat, sub: entry.sub };
      }
    }
    return null;
  }

  function openAddDespesa(refreshContainer) {
    const cats = Store.categoriesOrdered().filter(([k])=>k!=='receita');
    const suggestions = Store.descSuggestions();
    const suggestMap  = Object.fromEntries(suggestions.map(s => [s.desc, s]));
    const html = `<div class="form-grid">
      <div class="form-group form-full">
        <label class="form-label">Descrição</label>
        <div class="ac-wrap">
          <input class="form-input" id="fDDesc" placeholder="Ex: Supermercado, Combustível…" autocomplete="off"/>
          <div class="ac-list" id="fDDescAc"></div>
        </div>
        <div id="fDIaSuggest" style="display:none;margin-top:6px"></div>
      </div>
      <div class="form-group"><label class="form-label">Valor (R$)</label><input class="form-input" id="fDAmt" type="number" step="0.01" placeholder="0,00"/></div>
      <div class="form-group"><label class="form-label">Data</label><input class="form-input" id="fDDate" type="date" value="${new Date().toISOString().slice(0,10)}"/></div>
      <div class="form-group"><label class="form-label">Categoria</label>
        <select class="form-select" id="fDCat">${cats.map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">Sub-categoria</label><select class="form-select" id="fDSub"></select></div>
      <div class="form-group"><label class="form-label">Pagamento</label>
        <select class="form-select" id="fDPay">${Store.PAYMENT_METHODS.map(m=>`<option>${m}</option>`).join('')}</select>
      </div>
      <div class="form-group" id="fDCartaoRow" style="display:none"><label class="form-label">Cartão</label>
        <select class="form-select" id="fDCartao">${(Store.get().cartoes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select>
      </div>
      <div class="form-group form-full" style="display:flex;align-items:center;gap:20px;padding:4px 0">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="fDParcelado" style="width:16px;height:16px;accent-color:var(--accent)">
          <span class="form-label" style="margin:0">Parcelado</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="fDDesconto" style="width:16px;height:16px;accent-color:var(--green)">
          <span class="form-label" style="margin:0">Houve desconto?</span>
        </label>
      </div>
      <div class="form-group form-full">
        <label class="form-label">Visibilidade</label>
        <div class="vis-toggle">
          <button type="button" class="vis-btn active" data-vis="familiar" id="visBtnFamiliar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            Familiar
            <span class="vis-btn-hint">visível pra todos</span>
          </button>
          <button type="button" class="vis-btn" data-vis="particular" id="visBtnParticular">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Particular
            <span class="vis-btn-hint">só você</span>
          </button>
        </div>
        <input type="hidden" id="fDVis" value="familiar"/>
      </div>
      <div class="form-group form-full" id="fDReembolsoRow" style="display:none">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:8px">
          <input type="checkbox" id="fDReembolso" style="width:16px;height:16px;accent-color:var(--amber)">
          <span class="form-label" style="margin:0;color:var(--amber)">Solicitar reembolso</span>
        </label>
        <div id="fDReembolsoOpts" style="display:none;display:flex;gap:8px;margin-top:4px">
          <select class="form-select" id="fDReembolsoDe" style="flex:1">
            ${Store.PESSOAS.map(p => `<option value="${p}">${p}</option>`).join('')}
            <option value="Família">Família (grupo)</option>
          </select>
          <input class="form-input" type="number" id="fDReembolsoValor" step="0.01" placeholder="Valor a reembolsar" style="flex:1"/>
        </div>
      </div>
      <div id="fDDescontoOpts" style="display:none;grid-column:1/-1" class="form-group">
        <label class="form-label">Valor Original (R$)</label>
        <input class="form-input" id="fDValorOriginal" type="number" step="0.01" placeholder="Valor sem desconto"/>
        <div style="font-size:11px;color:var(--green);margin-top:4px" id="fDEconomia"></div>
      </div>
      <div id="fDParceladoOpts" class="hidden form-group form-full" style="display:none;gap:16px;grid-template-columns:1fr 1fr">
        <div class="form-group">
          <label class="form-label">Nº de parcelas</label>
          <select class="form-select" id="fDParcelas">${[2,3,4,5,6,7,8,9,10,11,12,18,24].map(n=>`<option value="${n}">${n}x</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Valor por parcela</label>
          <div class="form-input" id="fDParcelaInfo" style="display:flex;align-items:center;color:var(--accent);font-weight:700;background:var(--bg-elevated)">—</div>
        </div>
      </div>
      ${splitSectionHTML()}
    </div>`;
    let splitApi = null;
    Modal.open('Nova Despesa', html, () => {
      const desc          = document.getElementById('fDDesc').value.trim();
      const amount        = parseFloat(document.getElementById('fDAmt').value);
      const date          = document.getElementById('fDDate').value;
      const cat           = document.getElementById('fDCat').value;
      const sub           = document.getElementById('fDSub').value;
      const pay           = document.getElementById('fDPay').value;
      const cartaoId      = pay === 'Cartão' ? (document.getElementById('fDCartao')?.value || null) : null;
      const parcelado     = document.getElementById('fDParcelado').checked;
      const parcelas      = parseInt(document.getElementById('fDParcelas')?.value || '1');
      const temDesconto   = document.getElementById('fDDesconto')?.checked;
      const valorOriginal = temDesconto ? parseFloat(document.getElementById('fDValorOriginal')?.value || '0') : 0;
      const economia      = temDesconto && valorOriginal > amount ? valorOriginal - amount : 0;
      const split         = splitApi?.read() || null;
      const visibilidade  = document.getElementById('fDVis')?.value || 'familiar';
      const temReembolso  = visibilidade === 'particular' && document.getElementById('fDReembolso')?.checked;
      const reembolsoDe   = temReembolso ? (document.getElementById('fDReembolsoDe')?.value || 'Família') : null;
      const reembolsoVal  = temReembolso ? (parseFloat(document.getElementById('fDReembolsoValor')?.value) || amount) : null;
      if (!desc || !amount || !date) return toast('Preencha todos os campos', 'error');
      if (split) {
        const sum = split.reduce((s,r)=>s+r.valor,0);
        if (sum > amount + 0.01) return toast('Soma do rateio excede o valor', 'error');
      }
      const extraFields = temDesconto && economia > 0 ? { desconto: true, valorOriginal, economia } : {};
      if (split) extraFields.split = split;
      if (cartaoId) extraFields.cartaoId = cartaoId;
      extraFields.visibilidade = visibilidade;
      if (temReembolso) extraFields.reembolso = {
        para: currentPessoa(), de: reembolsoDe, valor: reembolsoVal, status: 'pendente', criadoEm: new Date().toISOString().slice(0,10)
      };
      if (parcelado && parcelas > 1) {
        Store.addDespesaParcelada({ desc, amount: parseFloat((amount / parcelas).toFixed(2)), date, category: cat, sub, pay, parcelas, ...extraFields });
        toast(`${parcelas} parcelas lançadas!`, 'success');
      } else {
        const d = new Date(date);
        Store.addDespesa({ desc, amount, date, category: cat, sub, pay, month: d.getMonth()+1, year: d.getFullYear(), ...extraFields });
        toast('Despesa adicionada!', 'success');
      }
      Modal.close();
      updateReembolsosBadge();
      renderDespesas(refreshContainer);
    });
    function updateSubs() {
      const cat = document.getElementById('fDCat')?.value;
      const subs = Store.SUBCATEGORIES[cat] || [];
      const sel = document.getElementById('fDSub');
      if (sel) sel.innerHTML = subs.map(s=>`<option>${s}</option>`).join('');
    }
    function updateParcelaInfo() {
      const amt = parseFloat(document.getElementById('fDAmt')?.value) || 0;
      const n   = parseInt(document.getElementById('fDParcelas')?.value || '1');
      const el  = document.getElementById('fDParcelaInfo');
      if (el) el.textContent = n > 1 && amt ? Utils.currency(amt / n) + '/mês' : '—';
    }
    setTimeout(() => {
      splitApi = setupSplitUI('fDAmt', null);
      document.getElementById('fDCat')?.addEventListener('change', updateSubs);
      updateSubs();
      document.getElementById('fDParcelado')?.addEventListener('change', e => {
        const opts = document.getElementById('fDParceladoOpts');
        if (opts) opts.style.display = e.target.checked ? 'grid' : 'none';
      });
      document.getElementById('fDDesconto')?.addEventListener('change', e => {
        const opts = document.getElementById('fDDescontoOpts');
        if (opts) opts.style.display = e.target.checked ? 'block' : 'none';
      });
      document.getElementById('fDPay')?.addEventListener('change', e => {
        const row = document.getElementById('fDCartaoRow');
        if (row) row.style.display = e.target.value === 'Cartão' ? 'block' : 'none';
      });
      function updateEconomia() {
        const amt = parseFloat(document.getElementById('fDAmt')?.value) || 0;
        const orig = parseFloat(document.getElementById('fDValorOriginal')?.value) || 0;
        const el = document.getElementById('fDEconomia');
        if (el) el.textContent = orig > amt ? `💰 Economia: ${Utils.currency(orig - amt)}` : '';
      }
      document.getElementById('fDValorOriginal')?.addEventListener('input', updateEconomia);
      document.getElementById('fDAmt')?.addEventListener('input', () => { updateParcelaInfo(); updateEconomia(); });
      document.getElementById('fDParcelas')?.addEventListener('change', updateParcelaInfo);

      // Visibilidade toggle
      document.querySelectorAll('#visBtnFamiliar, #visBtnParticular').forEach(btn => {
        btn.addEventListener('click', () => {
          const vis = btn.dataset.vis;
          document.getElementById('fDVis').value = vis;
          document.querySelectorAll('#visBtnFamiliar, #visBtnParticular').forEach(b => {
            b.classList.toggle('active', b.dataset.vis === vis);
            b.classList.toggle('vis-btn--particular', b.dataset.vis === 'particular');
          });
          const reembolsoRow = document.getElementById('fDReembolsoRow');
          if (reembolsoRow) reembolsoRow.style.display = vis === 'particular' ? 'block' : 'none';
        });
      });
      document.getElementById('fDReembolso')?.addEventListener('change', e => {
        const opts = document.getElementById('fDReembolsoOpts');
        if (opts) opts.style.display = e.target.checked ? 'flex' : 'none';
        // Pre-fill valor with despesa amount
        if (e.target.checked) {
          const amt = document.getElementById('fDAmt')?.value;
          const valEl = document.getElementById('fDReembolsoValor');
          if (valEl && amt) valEl.value = amt;
        }
      });

      const catLabels = Object.fromEntries(Store.categoriesOrdered().map(([k,v]) => [k, v.label]));
      document.getElementById('fDDesc')?.addEventListener('input', e => {
        const chip = document.getElementById('fDIaSuggest');
        if (!chip) return;
        const suggestion = suggestCategory(e.target.value);
        if (suggestion) {
          const catLabel = catLabels[suggestion.category] || suggestion.category;
          chip.innerHTML = `<button type="button" class="ia-suggest-btn" data-cat="${suggestion.category}" data-sub="${suggestion.sub || ''}">
            💡 ${catLabel}${suggestion.sub ? ' › ' + suggestion.sub : ''} <span style="opacity:.6;font-size:11px">— confirmar</span>
          </button>`;
          chip.style.display = 'block';
          chip.querySelector('.ia-suggest-btn')?.addEventListener('click', () => {
            const catSel = document.getElementById('fDCat');
            if (catSel) { catSel.value = suggestion.category; updateSubs(); }
            if (suggestion.sub) setTimeout(() => { const s = document.getElementById('fDSub'); if (s) s.value = suggestion.sub; }, 30);
            // Save to knowledgebase
            const norm = e.target.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
            if (norm) {
              const d = Store.get(); d.settings = d.settings || {};
              d.settings.iaKnowledge = d.settings.iaKnowledge || {};
              d.settings.iaKnowledge[norm] = { category: suggestion.category, sub: suggestion.sub, confidence: 1.0 };
              Store.save(d);
            }
            chip.style.display = 'none';
          });
        } else {
          chip.style.display = 'none';
        }
      });

      setupAC('fDDesc', 'fDDescAc', suggestions.map(s => s.desc), val => {
        const match = suggestMap[val];
        if (match) {
          const catSel = document.getElementById('fDCat');
          if (catSel) { catSel.value = match.category; updateSubs(); }
          setTimeout(() => { const s = document.getElementById('fDSub'); if (s && match.sub) s.value = match.sub; }, 30);
        }
      });
    }, 50);
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: METAS
  // ══════════════════════════════════════════════════════════════
  function renderMetas(container) {
    const year  = getYear();
    const month = getMonth();
    const metas = Store.get().metas.filter(m => m.active !== false);

    const TYPE_META = {
      limite_desp: { icon: '🛑', label: 'Limite de Despesa' },
      min_receita: { icon: '💰', label: 'Receita Mínima' },
      reserva:     { icon: '🏦', label: 'Reserva' },
      objetivo:    { icon: '🎯', label: 'Objetivo' },
    };
    const STATUS_CLASS = { ok: 'green', warn: 'amber', over: 'red', neutral: 'accent' };
    const STATUS_BADGE = { ok: '✓ No alvo', warn: '⚠ Atenção', over: '✗ Crítico', neutral: '○ Sem dados' };

    const objetivos = metas.filter(m => m.type === 'objetivo');
    const indicadores = metas.filter(m => m.type !== 'objetivo');

    // ── Coach insight cross-meta ──────────────────────────────────
    const metasInsight = (() => {
      const criticas  = indicadores.filter(m => Store.getMetaPerformance(m.id, year, month).status === 'over');
      const atencao   = indicadores.filter(m => Store.getMetaPerformance(m.id, year, month).status === 'warn');
      const noAlvo    = indicadores.filter(m => Store.getMetaPerformance(m.id, year, month).status === 'ok');
      const objsPerf  = objetivos.map(m => ({ m, p: Store.getMetaPerformance(m.id, year, month) }));
      const objsOk    = objsPerf.filter(({p}) => p.pct >= 1);
      const topObj    = objsPerf.sort((a,b) => b.p.pct - a.p.pct)[0];

      if (criticas.length > 0) {
        const c = criticas[0];
        const perf = Store.getMetaPerformance(c.id, year, month);
        return { icon:'⚠️', tone:'warn', titulo: `${c.label} ultrapassou o limite`,
          texto: `${Utils.currency(perf.current)} atual vs ${Utils.currency(perf.target)} de meta — ${((perf.pct-1)*100).toFixed(0)}% acima. ${criticas.length > 1 ? `Mais ${criticas.length-1} indicador(es) também em alerta.` : 'Revise seus gastos nesta categoria.'}` };
      }
      if (atencao.length > 0) {
        return { icon:'📊', tone:'neutral', titulo: `${atencao.length} indicador(es) pedindo atenção`,
          texto: `${atencao.map(m => m.label).join(', ')} ${atencao.length === 1 ? 'está' : 'estão'} próximo(s) do limite. ${noAlvo.length > 0 ? `${noAlvo.length} no alvo.` : ''} Veja o Coach para recomendações.` };
      }
      if (objsOk.length > 0) {
        return { icon:'🎉', tone:'pos', titulo: `${objsOk.length} objetivo${objsOk.length > 1 ? 's' : ''} atingido${objsOk.length > 1 ? 's' : ''}!`,
          texto: `${objsOk.map(({m}) => m.label).join(', ')} ${objsOk.length === 1 ? 'foi concluído' : 'foram concluídos'}. Excelente disciplina financeira — considere criar um novo objetivo.` };
      }
      if (topObj) {
        return { icon:'🎯', tone:'neutral', titulo: `${topObj.m.label}: ${(topObj.p.pct*100).toFixed(0)}% concluído`,
          texto: `${Utils.currency(topObj.p.current)} de ${Utils.currency(topObj.p.target)}. ${topObj.p.pct < 0.5 ? 'Você está na metade do caminho — continue!' : 'Quase lá! Faltam ' + Utils.currency(Math.max(0, topObj.p.target - topObj.p.current)) + '.'}` };
      }
      return { icon:'💡', tone:'neutral', titulo: 'Defina suas metas financeiras',
        texto: 'Adicione limites de despesa, metas de receita, reservas e objetivos para que o Coach acompanhe sua evolução automaticamente.' };
    })();

    container.innerHTML = `
<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">Metas <span class="page-head-year">&amp; Projetos</span></h1>
    <p class="page-head-meta">
      <span class="page-head-meta-total">${metas.length} meta${metas.length!==1?'s':''} ativa${metas.length!==1?'s':''}</span>
      <span class="page-head-meta-sep">·</span>
      <span style="color:var(--text-3)">limites, reservas e objetivos com performance automática</span>
    </p>
  </div>
  <button class="btn-primary" id="btnAddMeta">+ Nova Meta</button>
</div>

<div class="coach-inline-card coach-inline--${metasInsight.tone} mb-6">
  <div class="coach-inline-avatar">
    <img src="/assets/favicon/apple-touch-icon-180.png" alt="Coach" width="36" height="36" style="border-radius:50%;object-fit:cover"/>
  </div>
  <div class="coach-inline-body">
    <div class="coach-inline-header">
      <span class="coach-inline-icon">${metasInsight.icon}</span>
      <span class="coach-inline-titulo">${metasInsight.titulo}</span>
      <span class="coach-inline-label">Coach Haile</span>
    </div>
    <div class="coach-inline-texto">${metasInsight.texto}</div>
  </div>
  <button class="coach-inline-cta" id="btnMetasCoachVer">Ver análise →</button>
</div>

${indicadores.length === 0 ? '' : `
<div class="section-label mb-3" style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)">Indicadores</div>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;margin-bottom:24px">
  ${indicadores.map(m => {
    const perf = Store.getMetaPerformance(m.id, year, month);
    const t = TYPE_META[m.type] || { icon:'📌', label:m.type };
    const color = STATUS_CLASS[perf.status] || 'accent';
    const isAnual = m.period === 'anual';
    return `
    <div class="card" data-edit-meta="${m.id}" style="border-top:3px solid var(--${color})">
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">${t.icon}</span>
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text-1)">${m.label}</div>
            <div style="font-size:11px;color:var(--text-4)">${t.label} · ${isAnual?'Anual':'Mensal'}${m.category?' · '+(Store.CATEGORIES[m.category]?.label||m.category):''}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          ${m.type==='reserva'?`<button class="btn-icon-sm" data-action="snap-meta" data-id="${m.id}" title="Marcar snapshot">${icon('camera', {size:14})}</button>`:''}
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin:8px 0 6px">
        <div>
          <div style="font-size:11px;color:var(--text-3)">Atual${isAnual&&m.type!=='reserva'?' (acum.)':''}</div>
          <div style="font-size:22px;font-weight:800;font-family:var(--mono);color:var(--${color})">${Utils.currency(perf.current)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--text-3)">Meta</div>
          <div style="font-size:13px;color:var(--text-2);font-family:var(--mono)">${Utils.currency(perf.target)}</div>
        </div>
      </div>

      <div class="progress-bar progress-lg" style="margin-bottom:6px">
        <div class="progress-fill ${color}" style="width:${Math.min(perf.pct,1)*100}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);margin-bottom:8px">
        <span>${(perf.pct*100).toFixed(0)}% da meta</span>
        <span class="badge badge-${color}">${STATUS_BADGE[perf.status]}</span>
      </div>

      ${isAnual && m.type!=='reserva' ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;padding-top:8px;border-top:1px solid var(--border)">
          <div><div style="color:var(--text-4)">Média/mês</div><div style="font-weight:700;font-family:var(--mono)">${Utils.currency(perf.mediaMensal)}</div></div>
          <div><div style="color:var(--text-4)">Projeção anual</div><div style="font-weight:700;font-family:var(--mono)">${Utils.currency(perf.projecaoAnual)}</div></div>
        </div>` : ''}

      ${m.type==='reserva' ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;padding-top:8px;border-top:1px solid var(--border)">
          <div><div style="color:var(--text-4)">vs snapshot</div><div style="font-weight:700;color:var(--${perf.delta>=0?'green':'red'})">${perf.delta>=0?'▲':'▼'} ${Utils.currency(perf.delta||0)}</div></div>
          <div><div style="color:var(--text-4)">Falta</div><div style="font-weight:700;font-family:var(--mono)">${Utils.currency(Math.max(0,perf.target-perf.current))}</div></div>
        </div>
        ${(() => {
          const h = m.history || [];
          if (h.length < 2) return `<div style="font-size:10px;color:var(--text-4);margin-top:8px">Histórico: ${h.length} snapshot${h.length===1?'':'s'} — registre mais para ver tendência</div>`;
          const values = h.map(p => p.value);
          const min = Math.min(...values), max = Math.max(...values);
          const range = max - min || 1;
          const W = 240, H = 36;
          const pts = values.map((v, i) => {
            const x = (i / (values.length - 1)) * W;
            const y = H - ((v - min) / range) * H;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(' ');
          const last = values[values.length-1], first = values[0];
          const trend = last >= first ? 'green' : 'red';
          return `
          <div style="margin-top:10px">
            <div style="font-size:10px;color:var(--text-4);margin-bottom:2px">Evolução · ${h.length} snapshots</div>
            <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block">
              <polyline fill="none" stroke="var(--${trend})" stroke-width="1.5" points="${pts}"/>
              ${values.map((v,i) => {
                const x = (i / (values.length - 1)) * W;
                const y = H - ((v - min) / range) * H;
                return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.8" fill="var(--${trend})"/>`;
              }).join('')}
            </svg>
          </div>`;
        })()}` : ''}
    </div>`;
  }).join('')}
</div>`}

${objetivos.length === 0 ? '' : `
<div class="dash-section-tag mb-2">OBJETIVOS</div>
<div class="metas-objetivos-grid mb-6">
  ${objetivos.map(m => {
    const perf = Store.getMetaPerformance(m.id, year, month);
    const pct = Math.min(perf.pct, 1);
    const pctNum = Math.round(pct * 100);
    const gaugeColor = pct >= 1 ? 'var(--green)' : pct > 0.5 ? 'var(--accent)' : 'var(--amber)';
    const statusLabel = pct >= 1 ? 'Atingida' : `${pctNum}% concluído`;
    const statusColor = pct >= 1 ? 'var(--green)' : 'var(--text-2)';
    const deadlineStr = m.deadline ? new Date(m.deadline + 'T12:00:00').toLocaleDateString('pt-BR') : null;
    return `
    <div class="meta-card-redesign" data-edit-meta="${m.id}">
      <div class="meta-card-head">
        <div class="meta-card-tag">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          Objetivo
        </div>
      </div>
      <div class="meta-card-name">${m.label}</div>
      <div class="meta-card-body">
        <div class="meta-card-left">
          <div class="meta-card-value">${Utils.currency(perf.current)}</div>
          <div class="meta-card-target">de ${Utils.currency(perf.target)}</div>
          <div class="meta-card-progress">
            <div class="meta-card-progress-fill" style="width:${pctNum}%;background:${gaugeColor}"></div>
          </div>
          <div class="meta-card-status" style="color:${statusColor}">
            ${statusLabel}${pct < 1 ? ` · faltam ${Utils.currency(perf.target - perf.current)}` : ''}
          </div>
        </div>
        <div class="meta-card-gauge">
          ${SvgCharts.gauge(pctNum, { size: 72, color: gaugeColor, thickness: 8 })}
          <div class="meta-card-gauge-label">
            <div class="meta-card-gauge-pct">${pctNum}%</div>
          </div>
        </div>
      </div>
      ${deadlineStr ? `<div class="meta-card-deadline">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Prazo: ${deadlineStr}
      </div>` : ''}
    </div>`;
  }).join('')}
</div>`}

${indicadores.filter(m => m.type !== 'reserva').length ? `
<div class="table-section">
  <div class="card-header"><span class="card-title">Performance por mês — ${year}</span></div>
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr>
        <th>Meta</th>
        ${Utils.months.map(m => `<th class="num">${m}</th>`).join('')}
        <th class="num">Total/Proj</th>
        <th class="num">Alvo</th>
      </tr></thead>
      <tbody>
      ${indicadores.filter(m => m.type !== 'reserva').map(m => {
        const perf = Store.getMetaPerformance(m.id, year, month);
        const isLimit = m.type === 'limite_desp';
        return `<tr>
          <td><strong>${m.label}</strong><div style="font-size:10px;color:var(--text-4)">${m.period==='anual'?'Anual':'Mensal'}</div></td>
          ${perf.byMonth.map((v) => {
            const cmp = m.period === 'mensal' ? perf.target : (perf.target / 12);
            const okv = isLimit ? v <= cmp : v >= cmp;
            const cls = v === 0 ? 'muted' : (okv ? 'positive' : 'negative');
            return `<td class="num ${cls}">${v?Utils.currency(v).replace('R$ ',''):'—'}</td>`;
          }).join('')}
          <td class="num fw-700">${Utils.currency(m.period==='anual'?perf.projecaoAnual:perf.byMonth.reduce((a,b)=>a+b,0))}</td>
          <td class="num muted">${Utils.currency(m.period==='anual'?perf.target:perf.target*12)}</td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>
</div>` : ''}`;

    document.getElementById('btnAddMeta')?.addEventListener('click', () => openMetaModal(null, container));
    document.getElementById('btnMetasCoachVer')?.addEventListener('click', () => document.getElementById('coachToggleBtn')?.click());

    container.querySelectorAll('[data-edit-meta]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const m = Store.get().metas.find(m => m.id === card.dataset.editMeta);
        if (m) openMetaModal(m, container);
      });
    });
    container.querySelectorAll('[data-action="atingida"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = Store.get().metas.find(m => m.id === btn.dataset.id);
        if (!m) return;
        Store.updateMeta(m.id, { current: m.target });
        renderMetas(container);
        toast('Meta marcada como atingida!', 'success');
      });
    });
    _bindMetaSnapshot(container);
  }

  function openMetaModal(meta, container) {
    const isEdit = !!meta;
    const m = meta || {};
    const cats = Store.categoriesOrdered();
    const html = `<div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Nome da Meta</label><input class="form-input" id="fMLabel" placeholder="Ex: Limite Lazer, Receita Mín. Mensal" value="${m.label||''}"/></div>
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-select" id="fMType">
          <option value="limite_desp" ${m.type==='limite_desp'?'selected':''}>🛑 Limite de Despesa</option>
          <option value="min_receita" ${m.type==='min_receita'?'selected':''}>💰 Receita Mínima</option>
          <option value="reserva"     ${m.type==='reserva'?'selected':''}>🏦 Reserva (auto)</option>
          <option value="objetivo"    ${(m.type==='objetivo'||!isEdit)?'selected':''}>🎯 Objetivo Único</option>
        </select>
      </div>
      <div class="form-group" id="fMPeriodGroup">
        <label class="form-label">Período</label>
        <select class="form-select" id="fMPeriod">
          <option value="mensal" ${m.period==='mensal'||!m.period?'selected':''}>📅 Mensal</option>
          <option value="anual"  ${m.period==='anual'?'selected':''}>📆 Anual</option>
        </select>
      </div>
      <div class="form-group form-full" id="fMCatGroup">
        <label class="form-label">Categoria (opcional, p/ limites por categoria)</label>
        <select class="form-select" id="fMCat">
          <option value="">— Todas —</option>
          ${cats.filter(([k]) => k !== 'receita').map(([k,v]) => `<option value="${k}" ${m.category===k?'selected':''}>${v.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label" id="fMTargetLabel">Valor Alvo (R$)</label><input class="form-input" id="fMTarget" type="number" step="100" value="${m.target||''}"/></div>
      <div class="form-group" id="fMCurrentGroup"><label class="form-label">Valor Atual (R$)</label><input class="form-input" id="fMCurrent" type="number" step="100" value="${m.current||0}"/></div>
      <div class="form-group form-full" id="fMDeadlineGroup"><label class="form-label">Prazo</label><input class="form-input" id="fMDeadline" type="date" value="${m.deadline||''}"/></div>
    </div>`;
    Modal.open(isEdit ? 'Editar Meta' : 'Nova Meta', html, () => {
      const type = document.getElementById('fMType').value;
      const data = {
        label: document.getElementById('fMLabel').value.trim(),
        type,
        period: type === 'objetivo' ? 'unico' : document.getElementById('fMPeriod').value,
        category: document.getElementById('fMCat').value || null,
        target: parseFloat(document.getElementById('fMTarget').value),
        current: parseFloat(document.getElementById('fMCurrent').value) || 0,
        deadline: document.getElementById('fMDeadline').value || null,
        active: true,
      };
      if (!data.label || !data.target) return toast('Preencha nome e valor alvo', 'error');
      if (isEdit) {
        Store.updateMeta(meta.id, data);
        toast('Meta atualizada', 'success');
      } else {
        Store.get().metas.push({ id: '_' + Date.now(), ...data });
        Store.persist();
        toast('Meta criada', 'success');
      }
      Modal.close();
      renderMetas(container);
    }, isEdit ? () => {
      Store.deleteMeta(meta.id);
      Modal.close();
      renderMetas(container);
      toast('Meta excluída', 'success');
    } : null);

    setTimeout(() => {
      const typeSel = document.getElementById('fMType');
      function updateUI() {
        const t = typeSel.value;
        document.getElementById('fMPeriodGroup').style.display  = t === 'objetivo' ? 'none' : '';
        document.getElementById('fMCatGroup').style.display     = (t === 'limite_desp' || t === 'min_receita') ? '' : 'none';
        document.getElementById('fMDeadlineGroup').style.display= t === 'objetivo' ? '' : 'none';
        document.getElementById('fMCurrentGroup').style.display = t === 'objetivo' ? '' : 'none';
        const lbl = document.getElementById('fMTargetLabel');
        if      (t === 'limite_desp') lbl.textContent = 'Limite máximo (R$)';
        else if (t === 'min_receita') lbl.textContent = 'Receita mínima (R$)';
        else if (t === 'reserva')     lbl.textContent = 'Meta de reserva (R$)';
        else                          lbl.textContent = 'Valor alvo (R$)';
      }
      typeSel.addEventListener('change', updateUI);
      updateUI();
    }, 50);
  }

  // Handler de snapshot (chamado pelo botão 📸 do card de reserva)
  function _bindMetaSnapshot(container) {
    container.querySelectorAll('[data-action="snap-meta"]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.snapshotReserva(btn.dataset.id);
        renderMetas(container);
        toast('Snapshot atualizado', 'success');
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: CONTRATOS
  // ══════════════════════════════════════════════════════════════
  const _contratoExpanded = new Set();

  function renderContratos(container) {
    const contratos = Store.getContratos();
    const month = getMonth(), year = getYear();
    const today = new Date().toISOString().slice(0, 10);
    const allData = Store.get();

    function calcStatus(c, perf) {
      if (c.status === 'quitado') return 'quitado';
      const linked = (c.kind === 'receita' ? allData.receitas : allData.despesas)
        .filter(x => x.contratoId === c.id);
      if (linked.some(x => x.date < today && x.paid === false)) return 'atrasado';
      if (perf.parcelasRestantes === 0) return 'encerrado';
      return 'ativo';
    }
    const STATUS_LABEL = { ativo:'Ativo', atrasado:'Atrasado', encerrado:'Encerrado', quitado:'Quitado' };
    const STATUS_COLOR = { ativo:'var(--green)', atrasado:'var(--red)', encerrado:'var(--text-3)', quitado:'var(--accent)' };

    const filterStatus = localStorage.getItem('ff_contratos_status') || 'todos';
    const filterPessoa = localStorage.getItem('ff_contratos_pessoa') || '';

    // KPIs
    let totReceitaMes = 0, totDespesaMes = 0;
    contratos.filter(c => c.active !== false).forEach(c => {
      const perf = Store.getContratoPerformance(c.id);
      const mesAtual = (c.kind === 'receita' ? allData.receitas : allData.despesas)
        .filter(x => x.contratoId === c.id && x.month === month && x.year === year)
        .reduce((s, x) => s + x.amount, 0);
      if (c.kind === 'receita') totReceitaMes += mesAtual;
      else totDespesaMes += mesAtual;
    });
    const receitaMes = Store.sumReceitas(month, year);
    const despesaMes = Store.sumDespesas(month, year);

    // build rows with status
    let rows = contratos.map(c => ({
      c, perf: Store.getContratoPerformance(c.id),
    })).map(({c, perf}) => ({ c, perf, status: calcStatus(c, perf) }));

    const filtered = rows.filter(({c, status}) =>
      (filterStatus === 'todos' || status === filterStatus) &&
      (!filterPessoa || c.responsavel === filterPessoa)
    );

    const pessoas = [...new Set(contratos.map(c => c.responsavel).filter(Boolean))];

    // ── Sub-nav natureza (Compromissos = Recorrentes + Dívidas) ──
    const naturezaTab = localStorage.getItem('ff_comp_natureza') || 'todos';
    const nRec = contratos.filter(c => (c.natureza || 'recorrente') === 'recorrente').length;
    const nDiv = contratos.filter(c => c.natureza === 'divida').length;

    // Filtra rows pela natureza selecionada
    if (naturezaTab !== 'todos') {
      rows = rows.filter(r => {
        const c = contratos.find(x => x.id === r.id);
        return c && ((c.natureza || 'recorrente') === naturezaTab);
      });
    }

    container.innerHTML = `
<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">Compromissos</h1>
    <p class="page-head-meta">
      <span class="page-head-meta-total">${contratos.length} compromisso${contratos.length!==1?'s':''}</span>
      ${rows.filter(r => r.status === 'ativo').length ? `<span class="page-head-meta-sep">·</span><span style="color:var(--green);font-weight:600">${rows.filter(r => r.status === 'ativo').length} ativo${rows.filter(r => r.status === 'ativo').length!==1?'s':''}</span>` : ''}
      ${rows.filter(r => r.status === 'atrasado').length ? `<span class="page-head-meta-sep">·</span><span style="color:var(--red);font-weight:600">${rows.filter(r => r.status === 'atrasado').length} atrasado${rows.filter(r => r.status === 'atrasado').length!==1?'s':''}</span>` : ''}
      <span class="page-head-meta-sep">·</span>
      <span style="color:var(--text-3)">contratos recorrentes e dívidas — parcelas viram Receitas/Despesas</span>
    </p>
  </div>
  <button class="btn-primary" id="btnAddContrato">+ Novo Compromisso</button>
</div>

<div class="view-tabs mb-4">
  <button class="view-tab view-tab--violet ${naturezaTab==='todos'?'active':''}" data-nat-tab="todos">
    Todos <span style="opacity:0.7;margin-left:4px">(${contratos.length})</span>
  </button>
  <button class="view-tab view-tab--green ${naturezaTab==='recorrente'?'active':''}" data-nat-tab="recorrente">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
    Recorrentes <span style="opacity:0.7;margin-left:4px">(${nRec})</span>
  </button>
  <button class="view-tab view-tab--red ${naturezaTab==='divida'?'active':''}" data-nat-tab="divida">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    Dívidas <span style="opacity:0.7;margin-left:4px">(${nDiv})</span>
  </button>
</div>

${(() => {
  // Coach inline contextual — Compromissos
  const pctComp = receitaMes > 0 ? (totDespesaMes / receitaMes * 100) : 0;
  const atrasadas = rows.filter(r => r.status === 'atrasado').length;
  let cc;
  if (contratos.length === 0) cc = { tone: 'neutral', titulo: 'Nenhum compromisso cadastrado',
    texto: 'Adicione contratos recorrentes (assinaturas, aluguel) e dívidas (financiamento) para o Coach acompanhar parcelas e comprometimento automaticamente.' };
  else if (atrasadas > 0) cc = { tone: 'critical', titulo: `${atrasadas} parcela${atrasadas>1?'s':''} atrasada${atrasadas>1?'s':''}`,
    texto: `Há compromissos com pagamento em atraso. Quitar primeiro evita juros e mantém sua Saúde Financeira em verde.` };
  else if (pctComp >= 70) cc = { tone: 'critical', titulo: 'Comprometimento crítico',
    texto: `Seus compromissos consomem <strong style="color:var(--red)">${pctComp.toFixed(0)}%</strong> da receita do mês. O ideal LLP é ≤ 33%. Hora de renegociar dívidas ou reduzir recorrentes.` };
  else if (pctComp >= 50) cc = { tone: 'attention', titulo: 'Comprometimento elevado',
    texto: `<strong style="color:var(--amber)">${pctComp.toFixed(0)}%</strong> da receita está em compromissos fixos. Reduzir ${naturezaTab === 'todos' ? 'recorrentes não-essenciais' : 'parcelas'} aumenta seu Poder de Escolha.` };
  else cc = { tone: 'positive', titulo: 'Comprometimento saudável',
    texto: `Seus compromissos consomem <strong style="color:var(--green)">${pctComp.toFixed(0)}%</strong> da receita — dentro do ideal LLP de 33%. Continue assim.` };
  return coachInlineHTML({
    contexto: `Compromissos · ${Utils.monthsFull[month-1]}`,
    titulo: cc.titulo,
    texto: cc.texto,
    tone: cc.tone,
    acoes: [{ label: 'Ver análise completa', action: 'open-coach' }],
  });
})()}

${(() => {
  // Card resumo de Financiamentos (mostra em aba "Dívidas" ou "Todos")
  if (naturezaTab === 'recorrente') return '';
  const fins = (typeof Store.getFinanciamentos === 'function') ? Store.getFinanciamentos() : [];
  if (fins.length === 0) return '';
  const totSaldo = fins.reduce((s, f) => {
    const pagas = f.parcelasPagas || 0;
    const totalParc = f.prazo || 0;
    const valor = f.valorFinanciado || 0;
    const restante = Math.max(0, ((totalParc - pagas) / Math.max(1, totalParc)) * valor);
    return s + restante;
  }, 0);
  return `
<div class="card mb-4" style="border-color:rgba(255,74,104,0.25);background:linear-gradient(135deg,rgba(255,74,104,0.05),var(--bg-card))">
  <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
    <div style="width:42px;height:42px;border-radius:12px;background:rgba(255,74,104,0.15);display:flex;align-items:center;justify-content:center;color:var(--red);flex-shrink:0">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01"/></svg>
    </div>
    <div style="flex:1;min-width:200px">
      <div style="font-size:13px;font-weight:700;color:var(--text-1);margin-bottom:2px">${fins.length} financiamento${fins.length!==1?'s':''} ativo${fins.length!==1?'s':''}</div>
      <div style="font-size:11.5px;color:var(--text-3)">Saldo devedor estimado: <strong style="color:var(--red)">${Utils.currency(totSaldo)}</strong></div>
    </div>
    <button class="btn-secondary" onclick="Router.navigate('financiamentos')" style="white-space:nowrap">
      Gerenciar
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    </button>
  </div>
  <div style="font-size:11px;color:var(--text-4);margin-top:10px;line-height:1.5">
    Financiamentos com cálculo SAC/Price ficam em tela dedicada por terem amortização e juros calculados separadamente. Eles também são tipo "Dívida" mas o detalhamento fica em <a href="#financiamentos" style="color:var(--accent)">Financiamentos</a>.
  </div>
</div>`;
})()}

<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16 7 22 7 22 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Receita via Contratos</div>
      <div class="kpi-value" style="color:var(--green)">${Utils.currency(totReceitaMes)}</div>
      <div class="kpi-sub">${Utils.pct(receitaMes > 0 ? totReceitaMes / receitaMes : 0)} da receita do mês</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16 17 22 17 22 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Despesa via Contratos</div>
      <div class="kpi-value" style="color:var(--red)">${Utils.currency(totDespesaMes)}</div>
      <div class="kpi-sub">${Utils.pct(despesaMes > 0 ? totDespesaMes / despesaMes : 0)} da despesa do mês</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Contratos Ativos</div>
      <div class="kpi-value accent">${rows.filter(r => r.status === 'ativo').length}</div>
      <div class="kpi-sub">${rows.filter(r => r.status === 'atrasado').length} atrasado(s) · ${contratos.length} total</div>
    </div>
  </div>
</div>

<div class="card mb-6">
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <div style="display:flex;gap:6px;flex-wrap:wrap" data-status-filter>
      ${['todos','ativo','atrasado','encerrado','quitado'].map(s => `
        <button class="btn-secondary ${filterStatus===s?'active':''}" data-status="${s}" style="padding:5px 12px;font-size:12px">${s==='todos'?'Todos':STATUS_LABEL[s]}</button>
      `).join('')}
    </div>
    <select class="form-select" id="contratosPessoa" style="width:160px;margin-left:auto">
      <option value="">Todas as pessoas</option>
      ${pessoas.map(p => `<option value="${p}" ${filterPessoa===p?'selected':''}>${p}</option>`).join('')}
    </select>
  </div>
</div>

${contratos.length === 0 ? `
  <div class="empty-state" style="padding:48px;text-align:center;border:1px dashed var(--border);border-radius:12px">
    <div style="font-size:14px;color:var(--text-3);margin-bottom:8px">Nenhum contrato cadastrado</div>
    <div style="font-size:12px;color:var(--text-4)">Clique em "Novo Contrato" para começar.</div>
  </div>
` : `
<div class="card" style="padding:0;overflow:hidden">
  <div class="table-wrap">
    <table class="data-table" style="min-width:900px">
      <thead><tr>
        <th>Tipo</th><th>Contrato</th><th>Responsável</th>
        <th class="num">Parcela/mês</th><th class="num">Valor Pago</th><th class="num">Total</th>
        <th style="min-width:140px">Parcelas</th>
        <th>Status</th><th></th>
      </tr></thead>
      <tbody>
      ${filtered.length === 0 ? `<tr><td colspan="9" style="text-align:center;color:var(--text-4);padding:24px">Nenhum contrato para este filtro</td></tr>` :
        filtered.map(({c, perf, status}) => {
          const isRec = c.kind === 'receita';
          const cat = Store.CATEGORIES[c.category] || { label: c.category, icon: '📄' };
          const pctW = Math.round(perf.pctValor * 100);
          const linked = (isRec ? allData.receitas : allData.despesas)
            .filter(x => x.contratoId === c.id)
            .sort((a,b) => a.parcelaNum - b.parcelaNum);
          const cells = linked.map(p => {
            const color = p.paid === true ? 'var(--green)'
              : p.date < today && p.paid === false ? 'var(--red)'
              : p.date <= today ? 'var(--amber)'
              : 'var(--border)';
            return `<span title="${new Date(p.date+'T12:00:00').toLocaleDateString('pt-BR')} · ${Utils.currency(p.amount)}" style="flex:1 0 2px;min-width:2px;max-width:10px;height:7px;border-radius:1px;background:${color}"></span>`;
          }).join('');
          const iniStr = new Date(c.dataInicio+'T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
          const fimStr = c.dataFim ? new Date(c.dataFim+'T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}) : '—';
          const isExpanded = _contratoExpanded.has(c.id);
          const detailRows = isExpanded ? (() => {
            const PSTATUS = p => {
              if (p.paid === true)  return { label: 'Pago',     color: 'var(--green)' };
              if (p.date < today && p.paid === false) return { label: 'Atrasado', color: 'var(--red)' };
              if (p.date <= today)  return { label: 'Vencido',  color: 'var(--amber)' };
              return { label: 'Futuro', color: 'var(--text-4)' };
            };
            return `<tr class="parcelas-detail-row" data-detail-for="${c.id}">
              <td colspan="9" style="padding:0;background:var(--surface-2)">
                <div style="padding:12px 16px 16px">
                  <div style="font-size:11px;font-weight:600;color:var(--text-3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Parcelas — ${c.label}</div>
                  <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead>
                      <tr style="border-bottom:1px solid var(--border)">
                        <th style="text-align:left;padding:4px 8px;color:var(--text-4);font-weight:500">#</th>
                        <th style="text-align:left;padding:4px 8px;color:var(--text-4);font-weight:500">Vencimento</th>
                        <th style="text-align:right;padding:4px 8px;color:var(--text-4);font-weight:500">Valor</th>
                        <th style="text-align:left;padding:4px 8px;color:var(--text-4);font-weight:500">Método</th>
                        <th style="text-align:left;padding:4px 8px;color:var(--text-4);font-weight:500">Status</th>
                        <th style="text-align:left;padding:4px 8px;color:var(--text-4);font-weight:500">Confirmação</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${linked.map(p => {
                        const ps = PSTATUS(p);
                        const dt = new Date(p.date+'T12:00:00').toLocaleDateString('pt-BR');
                        const paidAt = p.paidDate ? new Date(p.paidDate+'T12:00:00').toLocaleDateString('pt-BR') : (p.paid === true ? dt : '—');
                        return `<tr style="border-bottom:1px solid var(--border-faint, var(--border))">
                          <td style="padding:5px 8px;color:var(--text-3)">${p.parcelaNum||'—'}</td>
                          <td style="padding:5px 8px;color:var(--text-2);font-family:var(--mono)">${dt}</td>
                          <td style="padding:5px 8px;text-align:right;font-family:var(--mono);font-weight:600;color:${isRec?'var(--green)':'var(--text-1)'}">${Utils.currency(p.amount)}</td>
                          <td style="padding:5px 8px;color:var(--text-3)">${p.pay||'—'}</td>
                          <td style="padding:5px 8px"><span style="font-size:11px;font-weight:600;color:${ps.color}">${ps.label}</span></td>
                          <td style="padding:5px 8px;font-family:var(--mono);color:${p.paid===true?'var(--green)':'var(--text-4)'}">${paidAt}</td>
                        </tr>`;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>`;
          })() : '';
          const TIPO_CONTRATO_CFG = {
            assinatura: { label: 'Assinatura', icon: 'smartphone',  color: 'var(--accent)',     bg: 'var(--accent-dim)' },
            servico:    { label: 'Serviço',    icon: 'wrench',       color: 'var(--amber)',      bg: 'var(--amber-dim)' },
            aluguel:    { label: 'Aluguel',    icon: 'home',         color: 'var(--teal)',       bg: 'var(--teal-dim,#14B8A618)' },
            seguro:     { label: 'Seguro',     icon: 'shield',       color: '#8B5CF6',           bg: 'rgba(139,92,246,.12)' },
            outro:      { label: 'Outro',      icon: 'file-text',    color: 'var(--text-3)',     bg: 'var(--bg-elevated)' },
          };
          const tc = TIPO_CONTRATO_CFG[c.tipoContrato || 'outro'];
          const dotColor = cat.color || (isRec ? 'var(--green)' : 'var(--accent)');
          return `<tr class="row-clickable" data-action="edit-contrato" data-id="${c.id}">
            <td>
              <span class="badge" style="background:${isRec?'var(--green-dim)':'var(--red-dim)'};color:${isRec?'var(--green)':'var(--red)'}">${isRec?'Receita':'Despesa'}</span>
              <div style="margin-top:4px"><span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:3px 8px;border-radius:5px;background:${tc.bg};color:${tc.color}">${icon(tc.icon, { size: 10 })} ${tc.label}</span></div>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0;display:inline-block"></span>
                <span style="font-weight:600;color:var(--text-1)">${c.label}</span>
              </div>
              <div style="font-size:11px;color:var(--text-4);display:inline-flex;align-items:center;gap:4px">${icon(cat.icon||'tag', { size: 12, color: cat.color })} ${cat.label}${c.sub?' / '+c.sub:''} · ${iniStr}→${fimStr}</div>
            </td>
            <td style="color:var(--text-2)">${c.responsavel||'—'}</td>
            <td class="num fw-700" style="font-family:var(--mono)">${Utils.currency(c.valorParcela)}</td>
            <td class="num fw-700" style="font-family:var(--mono);color:${isRec?'var(--green)':'var(--accent)'}">${Utils.currency(perf.valorCumprido)}</td>
            <td class="num" style="font-family:var(--mono);color:var(--text-3)">${Utils.currency(perf.valorTotal)}</td>
            <td>
              <div style="font-size:11px;color:var(--text-3);margin-bottom:3px">${perf.cumpridas}/${perf.totalParcelas} · ${pctW}%</div>
              <div style="display:flex;gap:1px;height:7px;overflow:hidden;max-width:180px;border-radius:2px">${cells}</div>
            </td>
            <td><span class="badge" style="background:${STATUS_COLOR[status]}20;color:${STATUS_COLOR[status]}">${STATUS_LABEL[status]}</span></td>
            <td style="white-space:nowrap">
              <button class="btn-icon-sm" data-action="toggle-detail" data-id="${c.id}" title="Ver parcelas">${icon(isExpanded ? 'chevron-down' : 'chevron-right', {size:14})}</button>
              <button class="btn-icon-sm success" data-action="mark-past" data-id="${c.id}" title="Marcar passadas como pagas">${icon('check-check', {size:14})}</button>
            </td>
          </tr>${detailRows}`;
        }).join('')
      }
      </tbody>
    </table>
  </div>
</div>
<div style="display:flex;gap:12px;margin-top:8px;font-size:11px;color:var(--text-4);flex-wrap:wrap;padding:0 2px">
  <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:7px;border-radius:2px;background:var(--green);display:inline-block"></span>Pago</span>
  <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:7px;border-radius:2px;background:var(--amber);display:inline-block"></span>Vencido (auto)</span>
  <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:7px;border-radius:2px;background:var(--red);display:inline-block"></span>Atrasado</span>
  <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:7px;border-radius:2px;background:var(--border);display:inline-block"></span>Futuro</span>
  <span style="margin-left:auto;display:flex;align-items:center;gap:6px">${icon('check-check',{size:12})} marcar todas as parcelas passadas como pagas</span>
</div>`}`;

    if (!container.dataset.contratosBound) {
      container.dataset.contratosBound = '1';
      container.addEventListener('click', e => {
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
          const action = actionBtn.dataset.action, id = actionBtn.dataset.id;
          if (action === 'toggle-detail') {
            if (_contratoExpanded.has(id)) _contratoExpanded.delete(id);
            else _contratoExpanded.add(id);
            renderContratos(container);
          } else if (action === 'edit-contrato') {
            const c = Store.getContratos().find(x => x.id === id);
            if (c) openContratoModal(c, container);
          } else if (action === 'del-contrato') {
            if (!confirm('Excluir contrato e todos os lançamentos vinculados?')) return;
            Store.deleteContrato(id, true);
            renderContratos(container);
            toast('Contrato excluído', 'success');
          } else if (action === 'mark-past') {
            Store.markAllPastParcelas(id);
            renderContratos(container);
            toast('Parcelas passadas marcadas como pagas', 'success');
          } else if (action === 'add-contrato') {
            openContratoModal(null, container);
          }
          return;
        }
        const statusBtn = e.target.closest('[data-status]');
        if (statusBtn) {
          localStorage.setItem('ff_contratos_status', statusBtn.dataset.status);
          renderContratos(container);
        }
        const natBtn = e.target.closest('[data-nat-tab]');
        if (natBtn) {
          localStorage.setItem('ff_comp_natureza', natBtn.dataset.natTab);
          renderContratos(container);
        }
      });
      container.addEventListener('change', e => {
        if (e.target.id === 'contratosPessoa') {
          localStorage.setItem('ff_contratos_pessoa', e.target.value);
          renderContratos(container);
        }
      });
    }
    document.getElementById('btnAddContrato')?.addEventListener('click', () => openContratoModal(null, container));
  }

  function openContratoModal(contrato, container) {
    const isEdit = !!contrato;
    const c = contrato || {};
    const cats = Store.categoriesOrdered();
    const today = new Date().toISOString().slice(0,10);
    const html = `<div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Descrição</label><input class="form-input" id="fCLabel" placeholder="Ex: Aluguel Apto, Contrato Bridge" value="${c.label||''}"/></div>
      <div class="form-group"><label class="form-label">Tipo</label>
        <select class="form-select" id="fCKind">
          <option value="despesa" ${c.kind==='despesa'||!isEdit?'selected':''}>Despesa</option>
          <option value="receita" ${c.kind==='receita'?'selected':''}>Receita</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Categoria do compromisso</label>
        <select class="form-select" id="fCNatureza">
          <option value="recorrente" ${(c.natureza||'recorrente')==='recorrente'?'selected':''}>Recorrente (assinatura, aluguel, salário)</option>
          <option value="divida" ${c.natureza==='divida'?'selected':''}>Dívida (financiamento, empréstimo)</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Tipo de Contrato</label>
        <select class="form-select" id="fCTipo">
          <option value="assinatura" ${c.tipoContrato==='assinatura'?'selected':''}>Assinatura</option>
          <option value="servico" ${c.tipoContrato==='servico'?'selected':''}>Serviço</option>
          <option value="aluguel" ${c.tipoContrato==='aluguel'?'selected':''}>Aluguel</option>
          <option value="seguro" ${c.tipoContrato==='seguro'?'selected':''}>Seguro</option>
          <option value="outro" ${(!c.tipoContrato||c.tipoContrato==='outro')?'selected':''}>Outro</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Responsável</label>
        <select class="form-select" id="fCResp">
          ${Store.PESSOAS.map(p => `<option ${c.responsavel===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Categoria</label>
        <select class="form-select" id="fCCat">
          ${cats.map(([k,v]) => `<option value="${k}" ${c.category===k?'selected':''}>${v.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" id="fCSubGroup"><label class="form-label">Subcategoria</label>
        <select class="form-select" id="fCSub"></select>
      </div>
      <div class="form-group"><label class="form-label">Data de Início</label><input class="form-input" id="fCIni" type="date" value="${c.dataInicio||today}"/></div>
      <div class="form-group"><label class="form-label">Data de Vigência (fim)</label><input class="form-input" id="fCFim" type="date" value="${c.dataFim||''}"/></div>
      <div class="form-group"><label class="form-label">Valor da Parcela (R$)</label><input class="form-input" id="fCParcela" type="number" step="0.01" value="${c.valorParcela||''}"/></div>
      <div class="form-group"><label class="form-label">Nº Parcelas</label><input class="form-input" id="fCQtd" type="number" min="1" value="${c.parcelas||12}"/></div>
      <div class="form-group"><label class="form-label">Entrada (R$, opcional)</label><input class="form-input" id="fCEntrada" type="number" step="0.01" value="${c.entrada||0}"/></div>
      <div class="form-group"><label class="form-label">Dia de Vencimento</label><input class="form-input" id="fCDia" type="number" min="1" max="31" value="${c.diaVencimento||5}"/></div>
      <div class="form-group" id="fCPayGroup"><label class="form-label">Método</label>
        <select class="form-select" id="fCPay">
          ${Store.PAYMENT_METHODS.map(p => `<option ${c.pay===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group form-full"><label class="form-label">Observações</label><input class="form-input" id="fCNotes" value="${c.notes||''}"/></div>
    </div>`;
    Modal.open(isEdit ? 'Editar Compromisso' : 'Novo Compromisso', html, () => {
      const data = {
        label: document.getElementById('fCLabel').value.trim(),
        kind:  document.getElementById('fCKind').value,
        natureza: document.getElementById('fCNatureza').value,
        responsavel: document.getElementById('fCResp').value,
        category: document.getElementById('fCCat').value,
        sub: document.getElementById('fCSub').value,
        dataInicio: document.getElementById('fCIni').value,
        dataFim: document.getElementById('fCFim').value,
        valorParcela: parseFloat(document.getElementById('fCParcela').value),
        parcelas: parseInt(document.getElementById('fCQtd').value, 10),
        entrada: parseFloat(document.getElementById('fCEntrada').value) || 0,
        diaVencimento: parseInt(document.getElementById('fCDia').value, 10) || null,
        pay: document.getElementById('fCPay').value,
        notes: document.getElementById('fCNotes').value,
        tipoContrato: document.getElementById('fCTipo').value,
        active: true,
      };
      if (!data.label || !data.valorParcela || !data.parcelas || !data.dataInicio) {
        return toast('Preencha descrição, início, valor da parcela e quantidade', 'error');
      }
      if (isEdit) {
        Store.updateContrato(contrato.id, data);
        toast('Compromisso atualizado — lançamentos regerados', 'success');
      } else {
        Store.addContrato(data);
        toast('Compromisso criado — lançamentos gerados', 'success');
      }
      Modal.close();
      renderContratos(container);
    }, isEdit ? () => {
      // Excluir compromisso (e seus lançamentos vinculados)
      if (!confirm('Excluir este compromisso? Os lançamentos vinculados também serão removidos.')) return;
      Store.deleteContrato(contrato.id, true);
      Modal.close();
      toast('Compromisso removido', 'success');
      renderContratos(container);
    } : null);

    setTimeout(() => {
      const kindSel = document.getElementById('fCKind');
      const catSel = document.getElementById('fCCat');
      const subSel = document.getElementById('fCSub');
      const subGrp = document.getElementById('fCSubGroup');
      const payGrp = document.getElementById('fCPayGroup');

      function fillSub() {
        const cat = catSel.value;
        const subs = Store.SUBCATEGORIES[cat] || [];
        subSel.innerHTML = subs.map(s => `<option ${c.sub===s?'selected':''}>${s}</option>`).join('') || '<option value="">—</option>';
      }
      function updateKindUI() {
        const isDesp = kindSel.value === 'despesa';
        subGrp.style.display = isDesp ? '' : 'none';
        payGrp.style.display = isDesp ? '' : 'none';
      }
      catSel.addEventListener('change', fillSub);
      kindSel.addEventListener('change', updateKindUI);
      fillSub();
      updateKindUI();
    }, 50);
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: CONTAS & CARTÕES
  // ══════════════════════════════════════════════════════════════
  function openContaModal(conta, container) {
    const isEdit = !!conta;
    const ct = conta || {};
    const COLORS = ['#7C6EF8','#22C55E','#3B82F6','#F59E0B','#EC4899','#14B8A6','#EF4444','#F97316'];
    let selectedColor = ct.cor || COLORS[0];
    const html = `<div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Nome da conta</label><input class="form-input" id="fCtNomeE" value="${ct.nome||''}" placeholder="Ex: Conta Principal"/></div>
      <div class="form-group"><label class="form-label">Categoria</label>
        <select class="form-select" id="fCtCategoriaE">
          <option value="bancaria" ${(ct.categoria||'bancaria')==='bancaria'?'selected':''}>Bancária</option>
          <option value="digital"  ${ct.categoria==='digital'?'selected':''}>Digital</option>
          <option value="cripto"   ${ct.categoria==='cripto'?'selected':''}>Cripto</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Banco / Wallet</label>
        <input class="form-input" id="fCtBancoE" list="bankListCE" value="${ct.banco||''}" placeholder="Itaú, Nubank…"/>
        <datalist id="bankListCE">${Store.BANKS.map(b=>`<option>${b}</option>`).join('')}</datalist>
      </div>
      <div class="form-group"><label class="form-label">Tipo</label>
        <select class="form-select" id="fCtTipoE">${Store.ACCOUNT_TYPES.map(t=>`<option ${ct.tipo===t?'selected':''}>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group form-full"><label class="form-label">Saldo (R$)</label><input class="form-input" id="fCtSaldoE" type="number" step="0.01" value="${ct.saldo!=null?ct.saldo:0}"/></div>
      <div class="form-group form-full"><label class="form-label">Cor</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px" id="colorPickerE">
          ${COLORS.map(c=>`<div data-c="${c}" style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${c===selectedColor?'var(--text-1)':'transparent'};transition:border .15s"></div>`).join('')}
        </div>
      </div>
    </div>`;
    Modal.open(isEdit ? 'Editar Conta' : 'Nova Conta', html, () => {
      const nome  = document.getElementById('fCtNomeE').value.trim();
      const banco = document.getElementById('fCtBancoE').value.trim();
      const tipo  = document.getElementById('fCtTipoE').value;
      const categoria = document.getElementById('fCtCategoriaE').value;
      const saldo = parseFloat(document.getElementById('fCtSaldoE').value) || 0;
      if (!nome || !banco) return toast('Preencha nome e banco', 'error');
      if (isEdit) {
        Object.assign(conta, { nome, banco, tipo, categoria, saldo, cor: selectedColor });
        Store.persist();
        toast('Conta atualizada!', 'success');
      } else {
        Store.addConta({ nome, banco, tipo, categoria, saldo, cor: selectedColor });
        toast('Conta adicionada!', 'success');
      }
      Modal.close();
      renderContas(container);
    }, isEdit ? () => {
      Store.deleteConta(conta.id);
      Modal.close();
      renderContas(container);
      toast('Conta removida', 'success');
    } : null);
    setTimeout(() => {
      document.getElementById('colorPickerE')?.querySelectorAll('[data-c]').forEach(dot => {
        dot.addEventListener('click', () => {
          selectedColor = dot.dataset.c;
          document.getElementById('colorPickerE').querySelectorAll('[data-c]').forEach(d => d.style.border = '3px solid transparent');
          dot.style.border = '3px solid var(--text-1)';
        });
      });
    }, 50);
  }

  function openCartaoModal(cc, container) {
    const isEdit = !!cc;
    const c = cc || {};
    const html = `<div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Nome do cartão</label><input class="form-input" id="fCcNomeE" value="${c.name||''}" placeholder="Ex: Itaú Click"/></div>
      <div class="form-group"><label class="form-label">Banco</label>
        <input class="form-input" id="fCcBancoE" list="bankListCCE" value="${c.banco||''}" placeholder="Itaú, Nubank…"/>
        <datalist id="bankListCCE">${Store.BANKS.map(b=>`<option>${b}</option>`).join('')}</datalist>
      </div>
      <div class="form-group"><label class="form-label">Limite (R$)</label><input class="form-input" id="fCcLimitE" type="number" step="100" value="${c.limit||''}"/></div>
      <div class="form-group"><label class="form-label">Fecha dia</label><input class="form-input" id="fCcCloseE" type="number" min="1" max="28" value="${c.closingDay||25}"/></div>
      <div class="form-group"><label class="form-label">Vence dia</label><input class="form-input" id="fCcDueE" type="number" min="1" max="28" value="${c.dueDay||3}"/></div>
    </div>`;
    Modal.open(isEdit ? 'Editar Cartão' : 'Novo Cartão', html, () => {
      const name  = document.getElementById('fCcNomeE').value.trim();
      const banco = document.getElementById('fCcBancoE').value.trim();
      const limit = parseFloat(document.getElementById('fCcLimitE').value);
      const closingDay = parseInt(document.getElementById('fCcCloseE').value);
      const dueDay     = parseInt(document.getElementById('fCcDueE').value);
      if (!name || !banco || !limit) return toast('Preencha nome, banco e limite', 'error');
      if (isEdit) {
        Object.assign(cc, { name, banco, limit, closingDay, dueDay });
        Store.persist();
        toast('Cartão atualizado!', 'success');
      } else {
        Store.addCartao({ name, banco, limit, closingDay, dueDay, color: 'default', parcelas: [] });
        toast('Cartão adicionado!', 'success');
      }
      Modal.close();
      renderContas(container);
    }, isEdit ? () => {
      Store.deleteCartao(cc.id);
      Modal.close();
      renderContas(container);
      toast('Cartão removido', 'success');
    } : null);
  }

  function renderContas(container, mode = 'all') {
    const cartoes = Store.get().cartoes;
    const allContas = Store.get().contas || [];
    const month = getMonth(), year = getYear();
    const showContas  = mode === 'all' || mode === 'contas';
    const showCartoes = mode === 'all' || mode === 'cartoes';

    // Sub-nav por categoria (apenas quando mostrando contas) — redesign 2026-05
    const categoriaTab = showContas ? (localStorage.getItem('ff_contas_categoria') || 'todos') : 'todos';
    const contas = (showContas && categoriaTab !== 'todos')
      ? allContas.filter(c => (c.categoria || 'bancaria') === categoriaTab)
      : allContas;
    const nBancarias = allContas.filter(c => (c.categoria || 'bancaria') === 'bancaria').length;
    const nDigitais  = allContas.filter(c => c.categoria === 'digital').length;
    const nCripto    = allContas.filter(c => c.categoria === 'cripto').length;

    const headerTitle = mode === 'cartoes' ? 'Cartões de Crédito' : mode === 'contas' ? 'Contas' : 'Contas & Cartões';
    const headerSub   = mode === 'cartoes' ? 'Gerencie seus cartões de crédito e parcelamentos'
                       : mode === 'contas' ? 'Bancárias, digitais e wallets de cripto'
                       : 'Gerencie suas contas e cartões de crédito';

    container.innerHTML = `
<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">${headerTitle}</h1>
    <p class="page-head-meta">
      ${showContas  ? `<span class="page-head-meta-total">${contas.length} conta${contas.length!==1?'s':''}</span>` : ''}
      ${showContas && showCartoes ? `<span class="page-head-meta-sep">·</span>` : ''}
      ${showCartoes ? `<span class="page-head-meta-total">${cartoes.length} cartão${cartoes.length!==1?'ões':''}</span>` : ''}
      ${(showContas || showCartoes) ? `<span class="page-head-meta-sep">·</span>` : ''}
      <span style="color:var(--text-3)">${headerSub}</span>
    </p>
  </div>
  <div class="flex gap-2">
    ${showContas ? `<button class="btn-secondary" id="btnAddConta">+ Nova Conta</button>` : ''}
    ${showCartoes ? `<button class="btn-primary" id="btnAddCartao">+ Novo Cartão</button>` : ''}
  </div>
</div>

${showContas ? `
<div class="view-tabs mb-4">
  <button class="view-tab view-tab--violet ${categoriaTab==='todos'?'active':''}" data-conta-categoria="todos">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    Todas <span style="opacity:0.7;margin-left:4px">(${allContas.length})</span>
  </button>
  <button class="view-tab view-tab--green ${categoriaTab==='bancaria'?'active':''}" data-conta-categoria="bancaria">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V10l7-4 7 4v11M9 21V13h6v8"/></svg>
    Bancárias <span style="opacity:0.7;margin-left:4px">(${nBancarias})</span>
  </button>
  <button class="view-tab view-tab--violet ${categoriaTab==='digital'?'active':''}" data-conta-categoria="digital">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
    Digitais <span style="opacity:0.7;margin-left:4px">(${nDigitais})</span>
  </button>
  <button class="view-tab view-tab--red ${categoriaTab==='cripto'?'active':''}" data-conta-categoria="cripto">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.5 8h4.5a2.5 2.5 0 010 5h-4.5V8zM9.5 13h5a2.5 2.5 0 010 5h-5v-5z"/></svg>
    Cripto <span style="opacity:0.7;margin-left:4px">(${nCripto})</span>
  </button>
</div>

<div class="section-label mb-3" style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)">${categoriaTab==='bancaria'?'Contas Bancárias':categoriaTab==='digital'?'Contas Digitais':categoriaTab==='cripto'?'Wallets Cripto':'Contas'}</div>

${(() => {
  const saldoTotal = contas.reduce((a, ct) => a + (ct.saldo || 0), 0);
  const lancamentos = (Store.get().lancamentos || []).filter(l => {
    const [ly, lm] = (l.data || '').split('-').map(Number);
    return ly === year && lm === month;
  });
  const entradasMes = lancamentos.filter(l => l.tipo === 'receita').reduce((a, l) => a + (l.valor || 0), 0);
  const saidasMes  = lancamentos.filter(l => l.tipo === 'despesa').reduce((a, l) => a + (l.valor || 0), 0);
  return `
<div class="card mb-4" style="background:linear-gradient(135deg,var(--accent-dim) 0%,var(--bg-card) 100%);border:1.5px solid var(--accent)">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:4px">Saldo Consolidado</div>
      <div style="font-size:32px;font-weight:900;font-family:var(--mono);color:${saldoTotal >= 0 ? 'var(--green)' : 'var(--red)'}">${Utils.currency(saldoTotal)}</div>
      <div style="font-size:12px;color:var(--text-3);margin-top:2px">${contas.length} conta${contas.length !== 1 ? 's' : ''} cadastrada${contas.length !== 1 ? 's' : ''}</div>
    </div>
    <div style="display:flex;gap:24px">
      <div style="text-align:center">
        <div style="font-size:11px;font-weight:600;color:var(--text-3);margin-bottom:4px">Entradas do Mês</div>
        <div style="font-size:18px;font-weight:800;font-family:var(--mono);color:var(--green)">+${Utils.currency(entradasMes)}</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:11px;font-weight:600;color:var(--text-3);margin-bottom:4px">Saídas do Mês</div>
        <div style="font-size:18px;font-weight:800;font-family:var(--mono);color:var(--red)">-${Utils.currency(saidasMes)}</div>
      </div>
    </div>
  </div>
</div>`;
})()}

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:32px">
  ${contas.length ? contas.map(ct => `
  <div class="card" data-edit-conta="${ct.id}" style="border-top:3px solid ${ct.cor}">
    <div style="font-size:11px;font-weight:700;color:var(--text-3);letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px">${ct.banco}</div>
    <div style="font-size:15px;font-weight:700;color:var(--text-1);margin-bottom:2px">${ct.nome}</div>
    <div style="font-size:11px;color:var(--text-4);margin-bottom:12px">${ct.tipo}</div>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:2px">Saldo</div>
    <div style="font-size:22px;font-weight:800;font-family:var(--mono);color:${ct.cor}">${Utils.currency(ct.saldo)}</div>
  </div>`).join('') : '<div class="empty-state"><p>Nenhuma conta cadastrada</p></div>'}
</div>
` : ''}

${showCartoes ? `
${mode === 'all' ? '<div class="section-label mb-3" style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)">Cartões de Crédito</div>' : ''}

${cartoes.length ? (() => {
  // ── Timeline de vencimentos (redesign 2026-05) ─────────────────
  const today = new Date();
  const hoje = today.getDate();
  // Calcula próximo vencimento de cada cartão (este mês ou próximo)
  const items = cartoes.map(cc => {
    const due = cc.dueDay || 10;
    let target = new Date(today.getFullYear(), today.getMonth(), due);
    if (target < today) target = new Date(today.getFullYear(), today.getMonth() + 1, due);
    const dias = Math.ceil((target - today) / (86400000));
    // Soma parcelas ativas neste mês (fatura aproximada)
    const fatura = cc.parcelas.reduce((s, p) => {
      const [sy, sm] = p.inicio.split('-').map(Number);
      const idx = (target.getFullYear() * 12 + target.getMonth() + 1) - (sy * 12 + sm);
      return idx >= 0 && idx < p.qtd ? s + p.parcela : s;
    }, 0);
    return {
      id: cc.id,
      nome: cc.name,
      cor: cc.color || cc.cor || 'var(--accent)',
      due, dias, fatura, target,
    };
  }).sort((a, b) => a.dias - b.dias);

  return `
<div class="cards-timeline mb-4">
  <div class="cards-timeline-head">
    <div>
      <div class="cards-timeline-title">Próximos vencimentos</div>
      <div class="cards-timeline-sub">Faturas dos próximos dias · ordenadas por proximidade</div>
    </div>
    <div class="cards-timeline-today">Hoje: dia <strong>${hoje}</strong></div>
  </div>
  <div class="cards-timeline-track" style="--n:${items.length}">
    <div class="cards-timeline-line"></div>
    ${items.map(it => {
      const urgent = it.dias <= 5;
      const past = it.dias <= 0;
      return `<div class="cards-timeline-item">
        <div class="cards-timeline-dot" style="background:${urgent ? 'var(--amber)' : it.cor};box-shadow:0 0 0 3px var(--bg-card),0 0 0 4px ${urgent ? 'rgba(255,169,48,0.35)' : 'rgba(255,255,255,0.05)'}"></div>
        <div class="cards-timeline-day" style="color:${urgent ? 'var(--amber)' : 'var(--text-3)'}">DIA ${it.due}</div>
        <div class="cards-timeline-name">${it.nome.length > 12 ? it.nome.slice(0,12)+'…' : it.nome}</div>
        <div class="cards-timeline-amt">${it.fatura >= 1000 ? 'R$ ' + (it.fatura/1000).toFixed(1) + 'k' : 'R$ ' + it.fatura.toFixed(0)}</div>
        <div class="cards-timeline-dias">${past ? 'venceu' : it.dias === 1 ? 'amanhã' : it.dias + ' dias'}</div>
      </div>`;
    }).join('')}
  </div>
</div>`;
})() : ''}

${(() => {
  const limiteTotal = cartoes.reduce((a, cc) => a + (cc.limit || 0), 0);
  const utilizadoTotal = cartoes.reduce((a, cc) => a + cc.parcelas.reduce((s, p) => s + p.parcela, 0), 0);
  const lancamentos = (Store.get().lancamentos || []).filter(l => {
    const [ly, lm] = (l.data || '').split('-').map(Number);
    return ly === year && lm === month && l.tipo === 'despesa';
  });
  const utilizadoMes = lancamentos.filter(l => {
    const cat = (l.categoria || '').toLowerCase();
    return cat === 'cartoes' || cartoes.some(cc => cc.id === l.cartaoId);
  }).reduce((a, l) => a + (l.valor || 0), 0);
  const parcelasMes = cartoes.reduce((a, cc) => {
    return a + cc.parcelas.reduce((s, p) => {
      const [sy, sm] = p.inicio.split('-').map(Number);
      const idx = (year * 12 + month) - (sy * 12 + sm);
      return idx >= 0 && idx < p.qtd ? s + p.parcela : s;
    }, 0);
  }, 0);
  const usoPct = limiteTotal > 0 ? Math.round(utilizadoTotal / limiteTotal * 100) : 0;
  return `
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
  <div class="card" style="text-align:center">
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);margin-bottom:6px">Limite Total</div>
    <div style="font-size:22px;font-weight:900;font-family:var(--mono);color:var(--text-1)">${Utils.currency(limiteTotal)}</div>
    <div style="font-size:11px;color:var(--text-4);margin-top:2px">${cartoes.length} cartão${cartoes.length !== 1 ? 'ões' : ''}</div>
  </div>
  <div class="card" style="text-align:center">
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);margin-bottom:6px">Comprometido</div>
    <div style="font-size:22px;font-weight:900;font-family:var(--mono);color:${usoPct > 80 ? 'var(--red)' : usoPct > 60 ? 'var(--amber)' : 'var(--text-1)'}">${Utils.currency(utilizadoTotal)}</div>
    <div style="font-size:11px;color:var(--text-4);margin-top:2px">${usoPct}% do limite</div>
  </div>
  <div class="card" style="text-align:center">
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);margin-bottom:6px">Parcelas/Mês</div>
    <div style="font-size:22px;font-weight:900;font-family:var(--mono);color:var(--red)">${Utils.currency(parcelasMes)}</div>
    <div style="font-size:11px;color:var(--text-4);margin-top:2px">este mês</div>
  </div>
</div>`;
})()}

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:28px">
  ${cartoes.map(cc => {
    const totalParcelas = cc.parcelas.reduce((a,p)=>a+p.parcela,0);
    const usado = totalParcelas;
    const livre = cc.limit - usado;
    const pct = Math.min(100, Math.round(usado / cc.limit * 100));
    const usageClass = pct > 80 ? 'over' : pct > 60 ? 'warn' : '';
    const cardClass = cc.color === 'gold' ? 'card-gold' : cc.color === 'black' ? 'card-black' : cc.color === 'platinum' ? 'card-platinum' : '';
    return `
    <div class="cc-card ${cardClass}" data-edit-cartao="${cc.id}">
      <div class="cc-top">
        <div class="cc-bank-block">
          <div class="cc-bank">${cc.banco}</div>
          <div class="cc-name">${cc.name}</div>
        </div>
        <div class="cc-chip"></div>
      </div>
      <div class="cc-limit-block">
        <div class="cc-limit-label">Limite</div>
        <div class="cc-limit-value">${Utils.currency(cc.limit)}</div>
        <div class="cc-usage">
          <div class="cc-usage-bar"><div class="cc-usage-fill ${usageClass}" style="width:${pct}%"></div></div>
          <div class="cc-usage-meta"><span class="used">${pct}% usado</span><span>${Utils.currency(usado)} de ${Utils.currency(cc.limit)}</span></div>
        </div>
      </div>
      <div class="cc-bottom">
        <div><div class="cc-meta-label">Compr.</div><div class="cc-meta-value neg">${Utils.currency(usado)}</div></div>
        <div><div class="cc-meta-label">Disp.</div><div class="cc-meta-value pos">${Utils.currency(livre)}</div></div>
        <div><div class="cc-meta-label">Fecha</div><div class="cc-meta-value">dia ${cc.closingDay}</div></div>
        <div><div class="cc-meta-label">Vence</div><div class="cc-meta-value">dia ${cc.dueDay}</div></div>
      </div>
    </div>`;
  }).join('')}
</div>

<div class="card mb-6">
  <div class="card-header"><span class="card-title">Parcelamentos Ativos</span></div>
  ${cartoes.map(cc => `
    <div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:var(--text-2);margin-bottom:8px;padding:8px 0;border-bottom:1px solid var(--border)">${cc.name}</div>
      ${cc.parcelas.length ? cc.parcelas.map(p => {
        const [sy, sm] = p.inicio.split('-').map(Number);
        const now  = year * 12 + month;
        const start = sy * 12 + sm;
        const parcPaga = Math.min(now - start + 1, p.qtd);
        const restantes = p.qtd - parcPaga;
        const pct = parcPaga / p.qtd;
        return `
        <div class="timeline-item">
          <div class="timeline-dot" style="background:${cc.color==='gold'?'var(--amber)':'var(--accent)'}"></div>
          <div style="flex:1">
            <div class="timeline-desc">${p.desc}</div>
            <div class="timeline-meta">${parcPaga}/${p.qtd} parcelas · ${restantes} restantes · Total: ${Utils.currency(p.total)}</div>
            <div class="progress-bar" style="margin-top:6px"><div class="progress-fill" style="width:${Math.round(pct*100)}%"></div></div>
          </div>
          <div class="timeline-value">${Utils.currency(p.parcela)}/mês</div>
          <div style="display:flex;gap:4px;margin-left:8px;align-items:center">
            <button class="btn-icon-sm" data-action="edit-parcela" data-cc="${cc.id}" data-pid="${p.id}" title="Editar">${icon('pencil', {size:14})}</button>
            <button class="btn-icon-sm success" data-action="quitar-parcela" data-cc="${cc.id}" data-pid="${p.id}" title="Quitar">${icon('check', {size:14})}</button>
            <button class="btn-icon-sm danger" data-action="del-parcela" data-cc="${cc.id}" data-pid="${p.id}" title="Excluir">${icon('trash-2', {size:14})}</button>
          </div>
        </div>`;
      }).join('') : '<div style="padding:8px 0;font-size:13px;color:var(--text-4)">Sem parcelamentos ativos</div>'}
    </div>
  `).join('')}
</div>

<div class="card">
  <div class="card-header"><span class="card-title">Impacto por Mês — Próximos 6 Meses</span></div>
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th>Mês</th>${cartoes.map(cc=>`<th class="num">${cc.name}</th>`).join('')}<th class="num">Total</th></tr></thead>
      <tbody>
        ${Array.from({length:6},(_,i)=>{
          const m = ((month-1+i)%12)+1;
          const y = year + Math.floor((month-1+i)/12);
          const cols = cartoes.map(cc => {
            return cc.parcelas.reduce((a,p)=>{
              const [sy,sm] = p.inicio.split('-').map(Number);
              const idx = (y*12+m) - (sy*12+sm);
              return idx>=0 && idx<p.qtd ? a+p.parcela : a;
            },0);
          });
          const tot = cols.reduce((a,b)=>a+b,0);
          return `<tr>
            <td>${Utils.months[m-1]} ${y}</td>
            ${cols.map(c=>`<td class="num ${c>0?'negative':''}">${c>0?Utils.currency(c):'—'}</td>`).join('')}
            <td class="num negative fw-700">${tot>0?Utils.currency(tot):'—'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
</div>
` : ''}`;

    // Event handlers
    container.querySelectorAll('[data-edit-conta]').forEach(card => {
      card.addEventListener('click', () => {
        const ct = Store.get().contas.find(c => c.id === card.dataset.editConta);
        if (ct) openContaModal(ct, container);
      });
    });
    container.querySelectorAll('[data-edit-cartao]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const cc = Store.get().cartoes.find(c => c.id === card.dataset.editCartao);
        if (cc) openCartaoModal(cc, container);
      });
    });

    // ── Parcelamentos actions ────────────────────────────────────
    container.querySelectorAll('[data-action="del-parcela"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cc = Store.get().cartoes.find(c => c.id === btn.dataset.cc);
        if (!cc || !confirm(`Excluir parcelamento "${cc.parcelas.find(p=>p.id===btn.dataset.pid)?.desc}"?`)) return;
        cc.parcelas = cc.parcelas.filter(p => p.id !== btn.dataset.pid);
        Store.persist();
        renderContas(container);
        toast('Parcelamento excluído!', 'success');
      });
    });

    container.querySelectorAll('[data-action="quitar-parcela"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cc = Store.get().cartoes.find(c => c.id === btn.dataset.cc);
        if (!cc || !confirm('Quitar este parcelamento (marcar como concluído)?')) return;
        cc.parcelas = cc.parcelas.filter(p => p.id !== btn.dataset.pid);
        Store.persist();
        renderContas(container);
        toast('Parcelamento quitado!', 'success');
      });
    });

    container.querySelectorAll('[data-action="edit-parcela"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cc = Store.get().cartoes.find(c => c.id === btn.dataset.cc);
        const p  = cc?.parcelas.find(p => p.id === btn.dataset.pid);
        if (!p) return;
        const html = `<div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Descrição</label><input class="form-input" id="fPDesc" value="${p.desc}"/></div>
          <div class="form-group"><label class="form-label">Total (R$)</label><input class="form-input" id="fPTotal" type="number" step="0.01" value="${p.total}"/></div>
          <div class="form-group"><label class="form-label">Parcelas</label><input class="form-input" id="fPQtd" type="number" min="1" max="60" value="${p.qtd}"/></div>
          <div class="form-group"><label class="form-label">Valor/parcela (R$)</label><input class="form-input" id="fPParcela" type="number" step="0.01" value="${p.parcela}"/></div>
          <div class="form-group"><label class="form-label">Início (YYYY-MM)</label><input class="form-input" id="fPInicio" value="${p.inicio}"/></div>
        </div>`;
        Modal.open('Editar Parcelamento', html, () => {
          p.desc    = document.getElementById('fPDesc').value.trim() || p.desc;
          p.total   = parseFloat(document.getElementById('fPTotal').value) || p.total;
          p.qtd     = parseInt(document.getElementById('fPQtd').value) || p.qtd;
          p.parcela = parseFloat(document.getElementById('fPParcela').value) || p.parcela;
          p.inicio  = document.getElementById('fPInicio').value || p.inicio;
          Store.persist();
          Modal.close();
          renderContas(container);
          toast('Parcelamento atualizado!', 'success');
        });
      });
    });

    // Sub-nav handler — Bancárias/Digitais/Cripto
    container.querySelectorAll('[data-conta-categoria]').forEach(btn => {
      btn.addEventListener('click', () => {
        localStorage.setItem('ff_contas_categoria', btn.dataset.contaCategoria);
        renderContas(container, mode);
      });
    });

    document.getElementById('btnAddConta')?.addEventListener('click', () => {
      const COLORS = ['#7C6EF8','#22C55E','#3B82F6','#F59E0B','#EC4899','#14B8A6','#EF4444','#F97316'];
      let selectedColor = COLORS[0];
      // Pré-seleciona a categoria com base na sub-aba ativa
      const _defaultCategoria = (categoriaTab && categoriaTab !== 'todos') ? categoriaTab : 'bancaria';
      const html = `<div class="form-grid">
        <div class="form-group form-full"><label class="form-label">Nome da conta</label><input class="form-input" id="fCtNome" placeholder="Ex: Conta Principal"/></div>
        <div class="form-group"><label class="form-label">Categoria</label>
          <select class="form-select" id="fCtCategoria">
            <option value="bancaria" ${_defaultCategoria==='bancaria'?'selected':''}>Bancária (banco tradicional)</option>
            <option value="digital"  ${_defaultCategoria==='digital'?'selected':''}>Digital (Nubank, Inter, C6...)</option>
            <option value="cripto"   ${_defaultCategoria==='cripto'?'selected':''}>Cripto (wallet, exchange)</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Banco / Wallet</label>
          <input class="form-input" id="fCtBanco" list="bankListC" placeholder="Itaú, Nubank, Binance…"/>
          <datalist id="bankListC">${Store.BANKS.map(b=>`<option>${b}</option>`).join('')}</datalist>
        </div>
        <div class="form-group"><label class="form-label">Tipo</label>
          <select class="form-select" id="fCtTipo">${Store.ACCOUNT_TYPES.map(t=>`<option>${t}</option>`).join('')}</select>
        </div>
        <div class="form-group form-full"><label class="form-label">Saldo inicial (R$)</label><input class="form-input" id="fCtSaldo" type="number" step="0.01" value="0"/></div>
        <div class="form-group form-full"><label class="form-label">Cor</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px" id="colorPicker">
            ${COLORS.map((c,i)=>`<div data-c="${c}" style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${i===0?'var(--text-1)':'transparent'};transition:border .15s"></div>`).join('')}
          </div>
        </div>
      </div>`;
      Modal.open('Nova Conta', html, () => {
        const nome  = document.getElementById('fCtNome').value;
        const banco = document.getElementById('fCtBanco').value;
        const tipo  = document.getElementById('fCtTipo').value;
        const categoria = document.getElementById('fCtCategoria').value;
        const saldo = parseFloat(document.getElementById('fCtSaldo').value) || 0;
        if (!nome || !banco) return toast('Preencha nome e banco', 'error');
        Store.addConta({ nome, banco, tipo, categoria, saldo, cor: selectedColor });
        Modal.close();
        renderContas(container);
        toast('Conta adicionada!', 'success');
      });
      setTimeout(() => {
        document.getElementById('colorPicker')?.querySelectorAll('[data-c]').forEach(dot => {
          dot.addEventListener('click', () => {
            selectedColor = dot.dataset.c;
            document.getElementById('colorPicker').querySelectorAll('[data-c]').forEach(d => d.style.border = '3px solid transparent');
            dot.style.border = '3px solid var(--text-1)';
          });
        });
      }, 50);
    });

    document.getElementById('btnAddCartao')?.addEventListener('click', () => {
      const html = `<div class="form-grid">
        <div class="form-group form-full"><label class="form-label">Nome do cartão</label><input class="form-input" id="fCcNome" placeholder="Ex: Itaú Click"/></div>
        <div class="form-group"><label class="form-label">Banco</label>
          <input class="form-input" id="fCcBanco" list="bankListCC" placeholder="Itaú, Nubank…"/>
          <datalist id="bankListCC">${Store.BANKS.map(b=>`<option>${b}</option>`).join('')}</datalist>
        </div>
        <div class="form-group"><label class="form-label">Limite (R$)</label><input class="form-input" id="fCcLimit" type="number" step="100" placeholder="10000"/></div>
        <div class="form-group"><label class="form-label">Fecha dia</label><input class="form-input" id="fCcClose" type="number" min="1" max="28" value="25"/></div>
        <div class="form-group"><label class="form-label">Vence dia</label><input class="form-input" id="fCcDue" type="number" min="1" max="28" value="3"/></div>
      </div>`;
      Modal.open('Novo Cartão de Crédito', html, () => {
        const name  = document.getElementById('fCcNome').value;
        const banco = document.getElementById('fCcBanco').value;
        const limit = parseFloat(document.getElementById('fCcLimit').value);
        const closingDay = parseInt(document.getElementById('fCcClose').value);
        const dueDay     = parseInt(document.getElementById('fCcDue').value);
        if (!name || !banco || !limit) return toast('Preencha nome, banco e limite', 'error');
        Store.addCartao({ name, banco, limit, closingDay, dueDay, color: 'default', parcelas: [] });
        Modal.close();
        renderContas(container);
        toast('Cartão adicionado!', 'success');
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: RESERVA & PATRIMÔNIO (merged)
  // ══════════════════════════════════════════════════════════════
  const RESERVA_TIPOS = ['Renda Fixa - CDB','Renda Fixa - LCI/LCA','Renda Fixa - Tesouro Selic','Renda Fixa - Poupança','Renda Variável - Ações/FII','Renda Variável - ETF','Reserva em Dinheiro','Outros'];
  const IMPOSTO_OPTS  = [{ label:'Isento (LCI/LCA/Poupança)', val:0 },{ label:'15% (acima de 720 dias)', val:0.15 },{ label:'17,5% (361–720 dias)', val:0.175 },{ label:'20% (até 360 dias)', val:0.20 }];
  const MESES_LABEL   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  function renderReservaPatrimonio(container) {
    // ── data ────────────────────────────────────────────────────
    const investimentos = Store.get().reservas || [];
    const futuros       = Store.get().recebimentosFuturos || [];
    const ativos        = Store.get().ativos;
    const { usdBrl = 5.85, eurBrl = 6.40 } = Store.get().settings;
    const total = Store.totalAtivos(); // now correctly sums reservas+ativos

    function toBRL(a) {
      const val = a.qty * a.unitPrice;
      if (a.currency === 'USD') return val * usdBrl;
      if (a.currency === 'EUR') return val * eurBrl;
      return val;
    }

    function yieldLiq(r) {
      if (!r.rendimento || (r.tipo||'').includes('Dinheiro')) return 0;
      return (r.valorInvestido || 0) * (r.rendimento / 100) * (1 - (r.imposto || 0));
    }

    const totalInv   = investimentos.reduce((s, r) => s + (r.valorAtual || r.valorInvestido || 0), 0);
    const totalAtiv  = ativos.reduce((s, a) => s + toBRL(a), 0);
    const totalFutPend = futuros.filter(f => f.status !== 'recebido').reduce((s, f) => s + f.valor, 0);
    const rendimento = investimentos.reduce((s, r) => s + yieldLiq(r), 0);

    const byType = {};
    ativos.forEach(a => { byType[a.type] = (byType[a.type] || 0) + toBRL(a); });
    if (totalInv > 0) byType['Reserva'] = totalInv;

    const TYPE_COLORS = { 'Crypto':'#F59E0B','Token':'#7C6EF8','FIAT BR':'#22C55E','FIAT EUR':'#3B82F6','Reserva':'#14B8A6' };
    const metaRes  = (Store.get().metas || []).find(m => m.type === 'reserva');
    const pctMeta  = metaRes ? Math.min((totalInv / metaRes.target) * 100, 100).toFixed(0) : null;

    container.innerHTML = `
<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">Reserva <span class="page-head-year">&amp; Patrimônio</span></h1>
    <p class="page-head-meta">
      <span class="page-head-meta-green">${Utils.currency(total)}</span>
      <span class="page-head-meta-sep">·</span>
      <span class="page-head-meta-total">${investimentos.length} investimento${investimentos.length!==1?'s':''}</span>
      <span class="page-head-meta-sep">·</span>
      <span style="color:var(--text-3)">USD R$ ${usdBrl} · EUR R$ ${eurBrl}</span>
    </p>
  </div>
  <div class="flex gap-2">
    <button class="btn-secondary" id="btnEditRates">${icon('pencil', {size:14})} Cotações</button>
    <button class="btn-primary"   id="btnAddInv">+ Novo Investimento</button>
  </div>
</div>

${(() => {
  // Coach inline contextual — Patrimônio
  const pctRend = totalInv > 0 ? (rendimento / totalInv * 100) : 0;
  const concentrado = Object.values(byType).sort((a,b)=>b-a)[0] || 0;
  const pctTopClass = total > 0 ? (concentrado / total * 100) : 0;
  let pc;
  if (total === 0) pc = { tone: 'neutral', titulo: 'Comece a construir seu patrimônio',
    texto: 'Registre seus investimentos, imóveis e ativos para o Coach acompanhar evolução, distribuição por classe e estratégia de aporte.' };
  else if (pctRend >= 12) pc = { tone: 'positive', titulo: 'Rendimento acima do CDI',
    texto: `Seus investimentos rendem em média <strong style="color:var(--green)">${pctRend.toFixed(1)}% ao ano</strong>. Mantenha o foco em produtos isentos (LCI/LCA) e acima de 100% CDI.` };
  else if (pctTopClass >= 70) pc = { tone: 'attention', titulo: 'Concentração elevada em uma classe',
    texto: `<strong>${pctTopClass.toFixed(0)}%</strong> do patrimônio está em uma única classe. Diversificar reduz risco — vale considerar realocar parte para classes complementares.` };
  else pc = { tone: 'neutral', titulo: 'Patrimônio diversificado',
    texto: `Total atual: <strong>${Utils.currency(total)}</strong> com rendimento estimado de <strong>${Utils.currency(rendimento)}/ano</strong> (${pctRend.toFixed(1)}% a.a.). Distribuição saudável entre classes.` };
  return coachInlineHTML({
    contexto: `Patrimônio · ${new Date().getFullYear()}`,
    titulo: pc.titulo,
    texto: pc.texto,
    tone: pc.tone,
    acoes: [{ label: 'Ver análise completa', action: 'open-coach' }],
  });
})()}

<!-- KPIs -->
<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Patrimônio Total</div>
      <div class="kpi-value accent">${Utils.currency(total)}</div>
      <div class="kpi-sub">Reservas + Ativos em BRL</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:#14B8A6;--kpi-bg:#14B8A618">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 22V9M3 9l9-7 9 7M3 9h18M21 22V9M9 22v-5h6v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Total em Reservas</div>
      <div class="kpi-value" style="color:#14B8A6">${Utils.currency(totalInv)}</div>
      <div class="kpi-sub">${metaRes ? `${pctMeta}% da meta · ${Utils.currency(metaRes.target)}` : `${investimentos.length} investimento${investimentos.length!==1?'s':''}`}</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16 7 22 7 22 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Rendimento Est./ano</div>
      <div class="kpi-value green">${Utils.currency(rendimento)}</div>
      <div class="kpi-sub">Projeção anual líquida após IR</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--blue);--kpi-bg:var(--blue-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="18" y="3" width="4" height="18" rx="1" stroke="currentColor" stroke-width="2"/><rect x="10" y="8" width="4" height="13" rx="1" stroke="currentColor" stroke-width="2"/><rect x="2" y="13" width="4" height="8" rx="1" stroke="currentColor" stroke-width="2"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Outros Ativos</div>
      <div class="kpi-value" style="color:var(--blue)">${Utils.currency(totalAtiv)}</div>
      <div class="kpi-sub">${ativos.length} ativo${ativos.length!==1?'s':''} (Crypto, FIAT…)</div>
    </div>
  </div>
  ${totalFutPend > 0 ? `
  <div class="kpi-card" style="--kpi-color:var(--amber);--kpi-bg:var(--amber-dim,#F59E0B18)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Recebimentos Futuros</div>
      <div class="kpi-value" style="color:var(--amber)">${Utils.currency(totalFutPend)}</div>
      <div class="kpi-sub">${futuros.filter(f=>f.status!=='recebido').length} pendente${futuros.filter(f=>f.status!=='recebido').length!==1?'s':''}</div>
    </div>
  </div>` : ''}
</div>

<!-- Charts -->
<div class="chart-grid mb-6" style="grid-template-columns:1fr 1.6fr">
  <div class="card">
    <div class="card-header"><span class="card-title">Distribuição do Portfólio</span></div>
    <div class="chart-with-legend">
      <canvas id="chartPatDonut"></canvas>
      <div class="donut-legend" id="patLegend" style="width:100%;margin-top:8px"></div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title">Evolução Patrimonial ${getYear()}</span>
      <span class="badge badge-accent">Estimado</span>
    </div>
    <div class="chart-wrap"><canvas id="chartPatEvolucao" class="chart-canvas"></canvas></div>
  </div>
</div>

<!-- Investimentos & Reservas -->
<div class="section-header mb-4">
  <div class="section-title">Investimentos & Reservas</div>
</div>
${investimentos.length === 0
  ? `<div class="card mb-6" style="text-align:center;padding:40px;color:var(--text-4)">Nenhum investimento cadastrado — clique em <strong>+ Novo Investimento</strong> para começar.</div>`
  : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:24px">
  ${investimentos.map(r => {
    const liq = yieldLiq(r);
    const tagColor = (r.tipo||'').includes('Dinheiro') ? 'var(--text-3)' : (r.tipo||'').includes('Variável') ? 'var(--blue)' : 'var(--green)';
    const valAtual = r.valorAtual || r.valorInvestido || 0;
    const ganho = valAtual - (r.valorInvestido || 0);
    return `
  <div class="card" data-edit-inv="${r.id}" style="border-top:3px solid ${tagColor}">
    <div class="card-header">
      <div>
        <div style="font-weight:700;font-size:14px;color:var(--text-1)">${r.nome}</div>
        <div style="font-size:11px;color:var(--text-4);margin-top:2px">${r.tipo||''}</div>
      </div>
    </div>
    <div style="margin:12px 0 8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
      <div><div style="color:var(--text-4)">Investido</div><div style="font-weight:700">${Utils.currency(r.valorInvestido||0)}</div></div>
      <div><div style="color:var(--text-4)">Valor Atual</div><div style="font-weight:700;color:var(--green)">${Utils.currency(valAtual)}</div></div>
      ${r.rendimento ? `<div><div style="color:var(--text-4)">Rendimento</div><div style="font-weight:600;color:var(--accent)">${r.rendimento}% a.a.</div></div>` : ''}
      ${ganho !== 0 ? `<div><div style="color:var(--text-4)">Ganho</div><div style="font-weight:600;color:${ganho>=0?'var(--green)':'var(--red)'}">${ganho>=0?'+':''}${Utils.currency(ganho)}</div></div>` : ''}
      ${liq ? `<div style="grid-column:1/-1"><div style="color:var(--text-4)">Rend. Líq. Est./ano</div><div style="font-weight:700;color:var(--green)">${Utils.currency(liq)}</div></div>` : ''}
    </div>
    ${r.carencia ? `<div style="font-size:11px;color:var(--text-4);margin-top:4px">🔒 Carência: ${new Date(r.carencia+'T12:00:00').toLocaleDateString('pt-BR')}</div>` : ''}
  </div>`;
  }).join('')}
</div>`}

<!-- Outros Ativos -->
${ativos.length > 0 ? `
<div class="section-header mb-4"><div class="section-title">Outros Ativos</div></div>
<div class="card mb-6">
  <div class="card-header"><span class="card-title">Crypto, FIAT & Tokens</span>
    <button class="btn-xs" id="btnAddAtivo">+ Ativo</button>
  </div>
  <div>
    ${ativos.sort((a,b)=>toBRL(b)-toBRL(a)).map(a => {
      const brl = toBRL(a);
      const pct = ((brl/total)*100).toFixed(1);
      const col = TYPE_COLORS[a.type] || '#7C6EF8';
      return `
      <div class="asset-row" data-edit-ativo="${a.id}" style="cursor:pointer">
        <div class="asset-logo" style="border-color:${col}20;color:${col}">${a.platform.slice(0,3).toUpperCase()}</div>
        <div>
          <div class="asset-name">${a.platform}</div>
          <div class="asset-type">${a.type} · Atualiz: ${a.updated}</div>
        </div>
        <div>
          <div class="asset-qty">${a.qty.toLocaleString('pt-BR')} @ ${a.unitPrice} ${a.currency}</div>
          <div class="asset-qty">${pct}% do portfólio</div>
        </div>
        <div>
          <div class="asset-value">${Utils.currency(brl)}</div>
          <div style="font-size:11px;color:var(--text-3);text-align:right">${(a.qty * a.unitPrice).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2})} ${a.currency}</div>
        </div>
      </div>`;
    }).join('')}
  </div>
</div>` : `
<div class="section-header mb-4"><div class="section-title">Outros Ativos</div></div>
<div class="card mb-6" style="text-align:center;padding:32px;color:var(--text-4)">
  Nenhum outro ativo cadastrado.
  <button class="btn-xs" id="btnAddAtivo" style="margin-left:12px">+ Ativo</button>
</div>`}

<!-- Imóveis -->
${(() => {
  const imoveis = Store.getImoveis();
  return `
<div class="section-header mb-4" style="margin-top:32px">
  <div><div class="section-title">Imóveis</div><div class="section-sub">Casa, apartamento, sala — equity, rentabilidade e custos recorrentes</div></div>
  <button class="btn-primary" id="btnAddImovel">+ Novo Imóvel</button>
</div>
${imoveis.length === 0
  ? `<div class="card mb-6" style="text-align:center;padding:32px;color:var(--text-4)">Nenhum imóvel cadastrado.</div>`
  : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px;margin-bottom:24px">
  ${imoveis.map(im => {
    const valEst = Store.imovelValorEstimado(im);
    const valoriz = valEst - (im.valorCompra || 0);
    const valorizPct = im.valorCompra > 0 ? (valoriz / im.valorCompra) * 100 : 0;
    const equity = Store.imovelEquity(im);
    const custoAnual = Store.imovelCustoAnual(im);
    const receitaAnual = Store.imovelReceitaAnual(im);
    const rentab = Store.imovelRentabilidadeAluguel(im);
    const fluxoMensal = (im.aluguelMensal || 0) - (im.condominioMensal || 0) - (im.manutencaoMensal || 0) - (im.parcelaFinanciamento || 0) - ((im.iptuAnual || 0) / 12);
    const tipoLabel = { casa: 'Casa', apartamento: 'Apartamento', sala: 'Sala comercial', terreno: 'Terreno', outro: 'Outro' };
    return `
  <div class="card" data-edit-imovel="${im.id}" style="border-top:3px solid var(--teal)">
    <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">${tipoLabel[im.tipo] || 'Imóvel'}${im.alugado ? ' · Alugado' : ''}${im.financiado ? ' · Financiado' : ''}</div>
    <div style="font-size:16px;font-weight:700;color:var(--text-1);margin-bottom:2px">${im.apelido || im.endereco || 'Imóvel'}</div>
    ${im.endereco ? `<div style="font-size:11px;color:var(--text-4);margin-bottom:10px">${im.endereco}</div>` : '<div style="margin-bottom:10px"></div>'}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;font-size:12px">
      <div><div style="color:var(--text-4)">Valor compra</div><div style="font-weight:600">${Utils.currency(im.valorCompra||0)}</div></div>
      <div><div style="color:var(--text-4)">Valor atual</div><div style="font-weight:700;color:var(--teal);font-family:var(--mono)">${Utils.currency(valEst)}</div></div>
    </div>
    ${valoriz !== 0 ? `<div style="font-size:11px;color:${valoriz>=0?'var(--green)':'var(--red)'};margin-bottom:8px">${valoriz>=0?'▲':'▼'} ${Utils.currency(Math.abs(valoriz))} (${valorizPct.toFixed(1)}%) ${valoriz>=0?'de valorização':'de desvalorização'}</div>` : ''}

    ${im.financiado ? `
    <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:10px">
      <div style="font-size:11px;color:var(--text-4);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:6px">Financiamento</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
        <div><div style="color:var(--text-4)">Saldo devedor</div><div style="font-weight:600;color:var(--red)">${Utils.currency(im.saldoDevedor||0)}</div></div>
        <div><div style="color:var(--text-4)">Equity</div><div style="font-weight:700;color:var(--green);font-family:var(--mono)">${Utils.currency(equity)}</div></div>
        <div style="grid-column:1/-1"><div style="color:var(--text-4)">Parcela mensal</div><div style="font-weight:600">${Utils.currency(im.parcelaFinanciamento||0)}</div></div>
      </div>
    </div>` : ''}

    <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:10px">
      <div style="font-size:11px;color:var(--text-4);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:6px">Custos recorrentes</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
        <div><div style="color:var(--text-4)">IPTU/ano</div><div style="font-weight:600">${Utils.currency(im.iptuAnual||0)}</div></div>
        <div><div style="color:var(--text-4)">Condomínio/mês</div><div style="font-weight:600">${Utils.currency(im.condominioMensal||0)}</div></div>
        <div><div style="color:var(--text-4)">Manutenção/mês</div><div style="font-weight:600">${Utils.currency(im.manutencaoMensal||0)}</div></div>
        <div><div style="color:var(--text-4)">Custo total/ano</div><div style="font-weight:700;color:var(--red);font-family:var(--mono)">${Utils.currency(custoAnual)}</div></div>
      </div>
    </div>

    ${im.alugado ? `
    <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:10px">
      <div style="font-size:11px;color:var(--text-4);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:6px">Aluguel</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
        <div><div style="color:var(--text-4)">Aluguel/mês</div><div style="font-weight:600;color:var(--green)">${Utils.currency(im.aluguelMensal||0)}</div></div>
        <div><div style="color:var(--text-4)">Rentab./ano</div><div style="font-weight:700;color:var(--green);font-family:var(--mono)">${(rentab*100).toFixed(2)}%</div></div>
        <div style="grid-column:1/-1"><div style="color:var(--text-4)">Fluxo mensal líquido</div><div style="font-weight:700;color:${fluxoMensal>=0?'var(--green)':'var(--red)'};font-family:var(--mono)">${fluxoMensal>=0?'+':''}${Utils.currency(fluxoMensal)}</div></div>
      </div>
    </div>` : ''}

    <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">
      ${im.iptuAnual > 0 ? `<button class="btn-xs" data-prog-iptu="${im.id}">Programar IPTU</button>` : ''}
      ${im.condominioMensal > 0 ? `<button class="btn-xs" data-prog-cond="${im.id}">Programar Condomínio</button>` : ''}
      ${im.financiado && im.parcelaFinanciamento > 0 ? `<button class="btn-xs" data-prog-fin="${im.id}">Programar Parcela</button>` : ''}
      ${im.alugado && im.aluguelMensal > 0 ? `<button class="btn-xs btn-green" data-prog-alug="${im.id}">Programar Aluguel</button>` : ''}
    </div>
  </div>`;
  }).join('')}
</div>`}`;
})()}

<!-- Veículos -->
${(() => {
  const veiculos = Store.getVeiculos();
  return `
<div class="section-header mb-4" style="margin-top:32px">
  <div><div class="section-title">Veículos</div><div class="section-sub">Carros, motos e outros — depreciação automática e custos anuais</div></div>
  <button class="btn-primary" id="btnAddVeiculo">+ Novo Veículo</button>
</div>
${veiculos.length === 0
  ? `<div class="card mb-6" style="text-align:center;padding:32px;color:var(--text-4)">Nenhum veículo cadastrado.</div>`
  : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;margin-bottom:24px">
  ${veiculos.map(v => {
    const valEst = Store.veiculoValorEstimado(v);
    const desvalorizacao = v.valorCompra - valEst;
    const desvalPct = v.valorCompra > 0 ? (desvalorizacao / v.valorCompra) * 100 : 0;
    const custoAnual = Store.veiculoCustoAnual(v);
    const idade = v.dataCompra ? ((Date.now() - new Date(v.dataCompra).getTime()) / (1000*60*60*24*365.25)).toFixed(1) : '—';
    return `
  <div class="card" data-edit-veiculo="${v.id}" style="border-top:3px solid var(--accent)">
    <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">${v.marca||'—'} ${v.modelo||''}</div>
    <div style="font-size:16px;font-weight:700;color:var(--text-1);margin-bottom:8px">${v.apelido || v.modelo || 'Veículo'}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;font-size:12px">
      <div><div style="color:var(--text-4)">Ano</div><div style="font-weight:600">${v.ano || '—'}</div></div>
      <div><div style="color:var(--text-4)">Idade</div><div style="font-weight:600">${idade}a</div></div>
      <div><div style="color:var(--text-4)">Valor compra</div><div style="font-weight:600">${Utils.currency(v.valorCompra||0)}</div></div>
      <div><div style="color:var(--text-4)">Valor estimado</div><div style="font-weight:700;color:var(--accent);font-family:var(--mono)">${Utils.currency(valEst)}</div></div>
    </div>
    ${desvalorizacao > 0 ? `<div style="font-size:11px;color:var(--red);margin-bottom:8px">▼ ${Utils.currency(desvalorizacao)} (${desvalPct.toFixed(1)}%) de depreciação</div>` : ''}
    <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:10px">
      <div style="font-size:11px;color:var(--text-4);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:6px">Custo anual</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
        <div><div style="color:var(--text-4)">IPVA</div><div style="font-weight:600">${Utils.currency(v.ipvaAnual||0)}</div></div>
        <div><div style="color:var(--text-4)">Seguro</div><div style="font-weight:600">${Utils.currency(v.seguroAnual||0)}</div></div>
        <div><div style="color:var(--text-4)">Manutenção/mês</div><div style="font-weight:600">${Utils.currency(v.manutencaoMensal||0)}</div></div>
        <div><div style="color:var(--text-4)">Total/ano</div><div style="font-weight:700;color:var(--red);font-family:var(--mono)">${Utils.currency(custoAnual)}</div></div>
      </div>
    </div>
    <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">
      ${v.ipvaAnual > 0 ? `<button class="btn-xs" data-prog-ipva="${v.id}">Programar IPVA</button>` : ''}
      ${v.seguroAnual > 0 ? `<button class="btn-xs" data-prog-seguro="${v.id}">Programar Seguro</button>` : ''}
    </div>
  </div>`;
  }).join('')}
</div>`}`;
})()}

<!-- Passivos -->
${(() => {
  const passivos = Store.getPassivos();
  const totalPass = Store.totalPassivos();
  const totalEco  = passivos.filter(p => p.status !== 'quitado' && p.valorAcordado)
    .reduce((s,p) => s + (p.valorOriginal - p.valorAcordado), 0);
  const TIPO_LABEL = { banco:'Banco', cartao:'Cartão', empresarial:'Empresarial', pessoal:'Pessoal', emprestimo:'Empréstimo a Terceiros', juridico:'Processo Jurídico', bloqueio:'Bloqueio' };
  const STATUS_LABEL = { pendente:'Pendente', em_negociacao:'Em Negociação', acordado:'Acordado', quitado:'Quitado' };
  const STATUS_COLOR = { pendente:'var(--red)', em_negociacao:'var(--amber)', acordado:'var(--accent)', quitado:'var(--green)' };
  return `
<div class="section-header mb-4" style="margin-top:32px">
  <div><div class="section-title">Passivos & Dívidas</div><div class="section-sub">Dívidas e obrigações — não impactam o fluxo mensal enquanto pendentes</div></div>
  <button class="btn-primary" id="btnAddPassivo">+ Novo Passivo</button>
</div>
${totalPass > 0 ? `
<div class="kpi-grid mb-4">
  <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Total Passivo</div>
      <div class="kpi-value" style="color:var(--red)">${Utils.currency(totalPass)}</div>
      <div class="kpi-sub">${passivos.filter(p=>p.status!=='quitado').length} dívida(s) em aberto</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" stroke-width="2"/><line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="14" x2="14" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Patrimônio Líquido</div>
      <div class="kpi-value" style="color:${total-totalPass>=0?'var(--accent)':'var(--red)'}">${Utils.currency(total - totalPass)}</div>
      <div class="kpi-sub">Ativos − Passivos</div>
    </div>
  </div>
  ${totalEco > 0 ? `
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Economia Negociada</div>
      <div class="kpi-value" style="color:var(--green)">${Utils.currency(totalEco)}</div>
      <div class="kpi-sub">Desconto obtido nos acordos</div>
    </div>
  </div>` : ''}
</div>` : ''}
${passivos.length === 0
  ? `<div class="card" style="text-align:center;padding:32px;color:var(--text-4)">Nenhum passivo cadastrado. Ótimo sinal!</div>`
  : `<div class="card mb-4">
  <div class="table-wrap">
    <table class="data-table" style="min-width:780px">
      <thead><tr>
        <th>Descrição</th><th>Tipo</th><th>Responsável</th><th>Credor</th>
        <th class="num">Valor Original</th><th class="num">Proposta</th><th class="num">Acordado</th>
        <th>Status</th><th>Referência</th><th></th>
      </tr></thead>
      <tbody>
      ${passivos.map(p => {
        const desc = p.desc || '—';
        const tipo = TIPO_LABEL[p.tipo] || p.tipo || '—';
        const st   = p.status || 'pendente';
        const dataRef = p.dataRef ? new Date(p.dataRef+'T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'numeric'}) : '—';
        const descPct = p.valorOriginal && p.valorAcordado
          ? ((1 - p.valorAcordado/p.valorOriginal)*100).toFixed(0) + '% desc.'
          : p.valorOriginal && p.valorProposta
          ? ((1 - p.valorProposta/p.valorOriginal)*100).toFixed(0) + '% prop.'
          : '';
        return `<tr class="row-clickable" data-action="edit-passivo" data-id="${p.id}">
          <td>
            <div style="font-weight:600;color:var(--text-1)">${desc}</div>
            ${p.notes ? `<div style="font-size:11px;color:var(--text-4)">${p.notes}</div>` : ''}
            ${p.contratoId ? `<div style="font-size:11px;color:var(--accent)">📋 Contrato gerado</div>` : ''}
          </td>
          <td style="color:var(--text-3)">${tipo}</td>
          <td style="color:var(--text-2)">${p.responsavel||'—'}</td>
          <td style="color:var(--text-2)">${p.credor||'—'}</td>
          <td class="num" style="font-family:var(--mono);color:var(--red)">${Utils.currency(p.valorOriginal||0)}</td>
          <td class="num" style="font-family:var(--mono);color:var(--amber)">${p.valorProposta ? Utils.currency(p.valorProposta) : '—'}</td>
          <td class="num" style="font-family:var(--mono);color:var(--green)">
            ${p.valorAcordado ? Utils.currency(p.valorAcordado) : '—'}
            ${descPct ? `<div style="font-size:10px;color:var(--text-4)">${descPct}</div>` : ''}
          </td>
          <td><span class="badge" style="background:${STATUS_COLOR[st]}20;color:${STATUS_COLOR[st]}">${STATUS_LABEL[st]||st}</span></td>
          <td style="font-size:12px;color:var(--text-4)">${dataRef}</td>
          <td style="white-space:nowrap">
            ${st !== 'quitado' && st !== 'acordado' ? `<button class="btn-icon-sm" data-action="passivo-contrato" data-id="${p.id}" title="Gerar contrato">${icon('file-text', {size:14})}</button>` : ''}
            ${st !== 'quitado' ? `<button class="btn-icon-sm warning" data-action="passivo-despesa" data-id="${p.id}" title="Lançar em despesas">${icon('receipt', {size:14})}</button>` : ''}
          </td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>
  <div style="font-size:11px;color:var(--text-4);margin-top:8px;display:flex;gap:16px">
    <span>📋 = gerar contrato parcelado</span>
    <span>💸 = lançar pagamento avulso em despesas</span>
  </div>
</div>`}`;
})()}

`;

    // ── Charts ────────────────────────────────────────────────────
    requestAnimationFrame(() => {
      const donutData = Object.entries(byType).map(([type, val]) => ({
        label: type, value: val, color: TYPE_COLORS[type] || '#7C6EF8',
      }));
      if (donutData.length) {
        Charts.Donut(document.getElementById('chartPatDonut'), donutData, {
          size: 200, centerLabel: Charts.fmt(total, true), centerSub: 'BRL',
        });
        const legend = document.getElementById('patLegend');
        const tot2 = donutData.reduce((a,d)=>a+d.value,0)||1;
        legend.innerHTML = donutData.map(d=>`
          <div class="donut-legend-item">
            <div class="donut-legend-dot" style="background:${d.color}"></div>
            <span class="donut-legend-label">${d.label}</span>
            <span class="donut-legend-pct">${((d.value/tot2)*100).toFixed(1)}%</span>
            <span class="donut-legend-val">${Charts.fmt(d.value,true)}</span>
          </div>`).join('');
      }

      // Evolution chart
      const yr = getYear();
      const yrRec  = Store.yearlyMonthly(yr, 'receita');
      const yrDesp = Store.yearlyMonthly(yr, 'despesa');
      const totalAccSaldo = yrRec.reduce((a,r,i) => a + r - yrDesp[i], 0);
      const baseline = total - totalAccSaldo;
      let running = 0;
      const evolLabels = [], evolValues = [];
      yrRec.forEach((r, i) => {
        if (r === 0 && yrDesp[i] === 0) return;
        running += r - yrDesp[i];
        evolLabels.push(Utils.months[i]);
        evolValues.push(Math.max(0, baseline + running));
      });
      const evoEl = document.getElementById('chartPatEvolucao');
      if (evoEl) {
        if (evolLabels.length > 1) {
          Charts.Line(evoEl, {
            labels: evolLabels,
            datasets: [{ label: 'Patrimônio', values: evolValues, color: '#14B8A6' }],
          }, { height: 165 });
        } else {
          evoEl.parentElement.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-4);font-size:13px">Dados insuficientes (mínimo 2 meses com lançamentos)</div>';
        }
      }
    });

    // ── event handlers ────────────────────────────────────────────
    const re = () => renderReservaPatrimonio(container);

    document.getElementById('btnAddInv')?.addEventListener('click', () => openInvModal(null, re));
    document.getElementById('btnAddPassivo')?.addEventListener('click', () => openPassivoModal(null, re));
    document.getElementById('btnAddAtivo')?.addEventListener('click', () => openAtivoModal(null, re));
    document.getElementById('btnAddVeiculo')?.addEventListener('click', () => openVeiculoModal(null, re));
    document.getElementById('btnAddImovel')?.addEventListener('click', () => openImovelModal(null, re));

    // Veículos + Imóveis: clique direto + programação de custos
    container.querySelectorAll('[data-edit-veiculo]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const v = Store.getVeiculos().find(x => x.id === card.dataset.editVeiculo);
        if (v) openVeiculoModal(v, re);
      });
    });
    container.querySelectorAll('[data-edit-imovel]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const im = Store.getImoveis().find(x => x.id === card.dataset.editImovel);
        if (im) openImovelModal(im, re);
      });
    });
    container.addEventListener('click', e => {
      const ipva = e.target.closest('[data-prog-ipva]');
      if (ipva) { const v = Store.getVeiculos().find(x => x.id === ipva.dataset.progIpva); if (v) _programarCustoVeiculo(v, 'ipva', re); return; }
      const seg = e.target.closest('[data-prog-seguro]');
      if (seg) { const v = Store.getVeiculos().find(x => x.id === seg.dataset.progSeguro); if (v) _programarCustoVeiculo(v, 'seguro', re); return; }
      const iptu = e.target.closest('[data-prog-iptu]');
      if (iptu) { const im = Store.getImoveis().find(x => x.id === iptu.dataset.progIptu); if (im) _programarCustoImovel(im, 'iptu', re); return; }
      const cond = e.target.closest('[data-prog-cond]');
      if (cond) { const im = Store.getImoveis().find(x => x.id === cond.dataset.progCond); if (im) _programarCustoImovel(im, 'condominio', re); return; }
      const fin  = e.target.closest('[data-prog-fin]');
      if (fin)  { const im = Store.getImoveis().find(x => x.id === fin.dataset.progFin); if (im) _programarCustoImovel(im, 'financiamento', re); return; }
      const alug = e.target.closest('[data-prog-alug]');
      if (alug) { const im = Store.getImoveis().find(x => x.id === alug.dataset.progAlug); if (im) _programarCustoImovel(im, 'aluguel', re); return; }
    });
    document.getElementById('btnEditRates')?.addEventListener('click', () => {
      const html = `<div class="form-grid">
        <div class="form-group"><label class="form-label">USD → BRL</label><input class="form-input" id="fUSD" type="number" step="0.01" value="${usdBrl}"/></div>
        <div class="form-group"><label class="form-label">EUR → BRL</label><input class="form-input" id="fEUR" type="number" step="0.01" value="${eurBrl}"/></div>
      </div>`;
      Modal.open('Atualizar Cotações', html, () => {
        Store.updateSettings({ usdBrl: parseFloat(document.getElementById('fUSD').value), eurBrl: parseFloat(document.getElementById('fEUR').value) });
        Modal.close(); re(); toast('Cotações atualizadas!', 'success');
      });
    });

    // Investimentos + Ativos: clique direto
    container.querySelectorAll('[data-edit-inv]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const r = investimentos.find(r => r.id === card.dataset.editInv);
        if (r) openInvModal(r, re);
      });
    });
    container.querySelectorAll('[data-edit-ativo]').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const a = Store.get().ativos.find(a => a.id === row.dataset.editAtivo);
        if (a) openAtivoModal(a, re);
      });
    });

    container.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;

      if (action === 'del-futuro') {
        if (!confirm('Excluir?')) return;
        Store.deleteRecebimentoFuturo(id); re();
      }
      if (action === 'rec-recebido') {
        const f = (Store.get().recebimentosFuturos||[]).find(f => f.id === id);
        if (f) { f.status = 'recebido'; Store.persist(); re(); toast('Marcado como recebido!', 'success'); }
      }
      if (action === 'edit-passivo') {
        const p = Store.getPassivos().find(p => p.id === id);
        if (p) openPassivoModal(p, re);
      }
      if (action === 'passivo-contrato') {
        const p = Store.getPassivos().find(p => p.id === id);
        if (p) openPassivoToContratoModal(p, re);
      }
      if (action === 'passivo-despesa') {
        const p = Store.getPassivos().find(p => p.id === id);
        if (p) openPassivoDespesaModal(p, re);
      }
    });
  }

  function openPassivoModal(passivo, onSaved) {
    const isEdit = !!passivo;
    const p = passivo || {};
    const TIPOS = ['banco','cartao','empresarial','pessoal','emprestimo','juridico','bloqueio'];
    const TIPO_LABEL = { banco:'Banco', cartao:'Cartão', empresarial:'Empresarial', pessoal:'Pessoal', emprestimo:'Empréstimo a Terceiros', juridico:'Processo Jurídico', bloqueio:'Bloqueio' };
    const STATUS_OPTS = ['pendente','em_negociacao','acordado','quitado'];
    const STATUS_LABEL = { pendente:'Pendente', em_negociacao:'Em Negociação', acordado:'Acordado', quitado:'Quitado' };
    const html = `<div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Descrição</label>
        <input class="form-input" id="fPDesc" placeholder="Ex: Cartão XP atrasado, Dívida Banco Itaú" value="${p.desc||''}"/>
      </div>
      <div class="form-group"><label class="form-label">Tipo</label>
        <select class="form-select" id="fPTipo">
          ${TIPOS.map(t => `<option value="${t}" ${p.tipo===t?'selected':''}>${TIPO_LABEL[t]}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Responsável</label>
        <select class="form-select" id="fPResp">
          ${Store.PESSOAS.map(ps => `<option value="${ps}" ${p.responsavel===ps?'selected':''}>${ps}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Credor</label>
        <input class="form-input" id="fPCreedor" placeholder="Nome do banco, pessoa ou empresa" value="${p.credor||''}"/>
      </div>
      <div class="form-group"><label class="form-label">Valor Original (R$)</label>
        <input class="form-input" id="fPValOrig" type="number" step="0.01" placeholder="0,00" value="${p.valorOriginal||''}"/>
      </div>
      <div class="form-group"><label class="form-label">Proposta do Credor (R$)</label>
        <input class="form-input" id="fPValProp" type="number" step="0.01" placeholder="Opcional" value="${p.valorProposta||''}"/>
      </div>
      <div class="form-group"><label class="form-label">Valor Acordado (R$)</label>
        <input class="form-input" id="fPValAcord" type="number" step="0.01" placeholder="Apenas se acordo fechado" value="${p.valorAcordado||''}"/>
      </div>
      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-select" id="fPStatus">
          ${STATUS_OPTS.map(s => `<option value="${s}" ${(p.status||'pendente')===s?'selected':''}>${STATUS_LABEL[s]}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Data de Referência</label>
        <input class="form-input" id="fPData" type="date" value="${p.dataRef||''}"/>
      </div>
      <div class="form-group form-full"><label class="form-label">Observações</label>
        <input class="form-input" id="fPNotes" placeholder="Número do processo, contrato, etc." value="${p.notes||''}"/>
      </div>
    </div>`;
    Modal.open(isEdit ? 'Editar Passivo' : 'Novo Passivo', html, () => {
      const data = {
        desc:          document.getElementById('fPDesc').value.trim(),
        tipo:          document.getElementById('fPTipo').value,
        credor:        document.getElementById('fPCreedor').value.trim(),
        responsavel:   document.getElementById('fPResp').value,
        valorOriginal: parseFloat(document.getElementById('fPValOrig').value) || 0,
        valorProposta: parseFloat(document.getElementById('fPValProp').value) || null,
        valorAcordado: parseFloat(document.getElementById('fPValAcord').value) || null,
        status:        document.getElementById('fPStatus').value,
        dataRef:       document.getElementById('fPData').value || null,
        notes:         document.getElementById('fPNotes').value.trim(),
      };
      if (!data.desc || !data.valorOriginal) return toast('Preencha descrição e valor original', 'error');
      if (isEdit) Store.updatePassivo(passivo.id, data);
      else Store.addPassivo(data);
      Modal.close();
      onSaved();
      toast(isEdit ? 'Passivo atualizado' : 'Passivo cadastrado', 'success');
    }, isEdit ? () => {
      Store.deletePassivo(passivo.id);
      Modal.close();
      onSaved();
      toast('Passivo removido', 'success');
    } : null);
  }

  function openPassivoToContratoModal(passivo, onSaved) {
    const valorSugerido = passivo.valorAcordado || passivo.valorProposta || passivo.valorOriginal || 0;
    const today = new Date().toISOString().slice(0,10);
    const html = `<div class="form-grid">
      <div class="form-group form-full">
        <div style="padding:10px 12px;background:var(--surface-2);border-radius:8px;font-size:13px;color:var(--text-2)">
          Passivo: <strong>${passivo.desc}</strong> — ${Utils.currency(passivo.valorOriginal)}
          ${passivo.valorAcordado ? ` → Acordado: <strong style="color:var(--green)">${Utils.currency(passivo.valorAcordado)}</strong>` : ''}
        </div>
      </div>
      <div class="form-group"><label class="form-label">Valor da Parcela (R$)</label>
        <input class="form-input" id="fPC_parcela" type="number" step="0.01" value="${(valorSugerido/12).toFixed(2)}"/>
      </div>
      <div class="form-group"><label class="form-label">Nº de Parcelas</label>
        <input class="form-input" id="fPC_qtd" type="number" min="1" value="12"/>
      </div>
      <div class="form-group"><label class="form-label">Data de Início</label>
        <input class="form-input" id="fPC_ini" type="date" value="${today}"/>
      </div>
      <div class="form-group"><label class="form-label">Dia de Vencimento</label>
        <input class="form-input" id="fPC_dia" type="number" min="1" max="31" value="10"/>
      </div>
      <div class="form-group"><label class="form-label">Método</label>
        <select class="form-select" id="fPC_pay">
          ${Store.PAYMENT_METHODS.map(m => `<option>${m}</option>`).join('')}
        </select>
      </div>
    </div>`;
    Modal.open('Gerar Contrato para Passivo', html, () => {
      const contratoData = {
        label:        passivo.desc,
        kind:         'despesa',
        responsavel:  Store.PESSOAS[0],
        category:     'financeiro',
        sub:          'Acordo de Dívida',
        dataInicio:   document.getElementById('fPC_ini').value,
        valorParcela: parseFloat(document.getElementById('fPC_parcela').value),
        parcelas:     parseInt(document.getElementById('fPC_qtd').value, 10),
        entrada:      0,
        diaVencimento: parseInt(document.getElementById('fPC_dia').value, 10),
        pay:          document.getElementById('fPC_pay').value,
        notes:        `Gerado a partir do passivo: ${passivo.desc}`,
        active:       true,
      };
      if (!contratoData.valorParcela || !contratoData.parcelas) return toast('Preencha valor e parcelas', 'error');
      Store.addContrato(contratoData);
      const contratos = Store.getContratos();
      const novo = contratos[contratos.length - 1];
      Store.updatePassivo(passivo.id, { status: 'acordado', contratoId: novo.id });
      Modal.close();
      onSaved();
      toast('Contrato criado e passivo marcado como acordado!', 'success');
    });
  }

  function openPassivoDespesaModal(passivo, onSaved) {
    const valorSugerido = passivo.valorAcordado || passivo.valorProposta || passivo.valorOriginal || 0;
    const today = new Date().toISOString().slice(0,10);
    const html = `<div class="form-grid">
      <div class="form-group form-full">
        <div style="padding:10px 12px;background:var(--surface-2);border-radius:8px;font-size:13px;color:var(--text-2)">
          Lançar pagamento de: <strong>${passivo.desc}</strong>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Valor (R$)</label>
        <input class="form-input" id="fPD_val" type="number" step="0.01" value="${valorSugerido.toFixed(2)}"/>
      </div>
      <div class="form-group"><label class="form-label">Data</label>
        <input class="form-input" id="fPD_data" type="date" value="${today}"/>
      </div>
      <div class="form-group"><label class="form-label">Método</label>
        <select class="form-select" id="fPD_pay">
          ${Store.PAYMENT_METHODS.map(m => `<option>${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group form-full">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
          <input type="checkbox" id="fPD_quitar"/> Marcar passivo como Quitado após lançamento
        </label>
      </div>
    </div>`;
    Modal.open('Lançar Pagamento em Despesas', html, () => {
      const val  = parseFloat(document.getElementById('fPD_val').value);
      const data = document.getElementById('fPD_data').value;
      const pay  = document.getElementById('fPD_pay').value;
      const quitar = document.getElementById('fPD_quitar').checked;
      if (!val || !data) return toast('Preencha valor e data', 'error');
      const d = new Date(data+'T12:00:00');
      Store.addDespesa({
        desc: `Pgto: ${passivo.desc}`,
        amount: val, date: data,
        month: d.getMonth() + 1, year: d.getFullYear(),
        category: 'financeiro', sub: 'Acordo de Dívida',
        pay, split: [],
      });
      if (quitar) Store.updatePassivo(passivo.id, { status: 'quitado' });
      Modal.close();
      onSaved();
      toast('Despesa lançada' + (quitar ? ' e passivo quitado!' : '!'), 'success');
    });
  }

  // Alias para compatibilidade com rotas existentes
  function renderReserva(container)   { renderReservaPatrimonio(container); }
  function renderPatrimonio(container){ renderReservaPatrimonio(container); }

  // ── Modal: Investimento (ex-openReservaModal) ─────────────────
  function openInvModal(res, onSaved) {
    const isEdit = !!res;
    const html = `<div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Nome / Descrição</label><input class="form-input" id="fRNome" placeholder="Ex: CDB Nubank 110% CDI" value="${isEdit?res.nome:''}"/></div>
      <div class="form-group form-full"><label class="form-label">Tipo de Produto</label>
        <select class="form-select" id="fRTipo">${RESERVA_TIPOS.map(t=>`<option value="${t}" ${isEdit&&res.tipo===t?'selected':''}>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">Valor Investido (R$)</label><input class="form-input" id="fRInv" type="number" step="100" placeholder="0" value="${isEdit?res.valorInvestido:''}"/></div>
      <div class="form-group"><label class="form-label">Valor Atual (R$)</label><input class="form-input" id="fRAtual" type="number" step="100" placeholder="0" value="${isEdit&&res.valorAtual?res.valorAtual:''}"/></div>
      <div class="form-group"><label class="form-label">Rendimento (% a.a.)</label><input class="form-input" id="fRRend" type="number" step="0.1" placeholder="Ex: 12.5" value="${isEdit&&res.rendimento?res.rendimento:''}"/></div>
      <div class="form-group"><label class="form-label">Imposto de Renda</label>
        <select class="form-select" id="fRImp">${IMPOSTO_OPTS.map(o=>`<option value="${o.val}" ${isEdit&&res.imposto===o.val?'selected':''}>${o.label}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">Carência (data)</label><input class="form-input" id="fRCarencia" type="date" value="${isEdit&&res.carencia?res.carencia:''}"/></div>
    </div>`;
    Modal.open(isEdit ? 'Editar Investimento' : 'Novo Investimento', html, () => {
      const nome = document.getElementById('fRNome').value.trim();
      const tipo = document.getElementById('fRTipo').value;
      const valorInvestido = parseFloat(document.getElementById('fRInv').value) || 0;
      const valorAtual     = parseFloat(document.getElementById('fRAtual').value) || valorInvestido;
      const rendimento     = parseFloat(document.getElementById('fRRend').value) || 0;
      const imposto        = parseFloat(document.getElementById('fRImp').value) || 0;
      const carencia       = document.getElementById('fRCarencia').value;
      if (!nome) return toast('Preencha o nome', 'error');
      if (isEdit) {
        Store.updateReserva(res.id, { nome, tipo, valorInvestido, valorAtual, rendimento, imposto, carencia });
        toast('Atualizado!', 'success');
      } else {
        Store.addReserva({ nome, tipo, valorInvestido, valorAtual, rendimento, imposto, carencia });
        toast('Investimento adicionado!', 'success');
      }
      Modal.close(); if (onSaved) onSaved();
    }, isEdit ? () => {
      Store.deleteReserva(res.id);
      Modal.close();
      if (onSaved) onSaved();
      toast('Investimento removido', 'success');
    } : null);
  }

  // ── Modal: Ativo (crypto/FIAT) ────────────────────────────────
  function openVeiculoModal(veiculo, onSaved) {
    const isEdit = !!veiculo;
    const v = veiculo || {};
    const hoje = new Date().toISOString().slice(0, 10);
    const html = `
<div class="form-grid">
  <div class="form-group"><label class="form-label">Marca</label><input class="form-input" id="fVMarca" placeholder="Ex.: Toyota" value="${v.marca||''}"></div>
  <div class="form-group"><label class="form-label">Modelo</label><input class="form-input" id="fVModelo" placeholder="Ex.: Corolla XEi" value="${v.modelo||''}"></div>
  <div class="form-group"><label class="form-label">Apelido (opcional)</label><input class="form-input" id="fVApelido" placeholder="Ex.: Carro da Mari" value="${v.apelido||''}"></div>
  <div class="form-group"><label class="form-label">Ano</label><input class="form-input" id="fVAno" type="number" value="${v.ano || new Date().getFullYear()}" min="1980" max="${new Date().getFullYear()+1}"></div>
  <div class="form-group"><label class="form-label">Placa (opcional)</label><input class="form-input" id="fVPlaca" placeholder="ABC-1D23" value="${v.placa||''}"></div>
  <div class="form-group"><label class="form-label">Cor (opcional)</label><input class="form-input" id="fVCor" placeholder="Branca" value="${v.cor||''}"></div>
  <div class="form-group"><label class="form-label">Valor de compra (R$)</label><input class="form-input" id="fVValor" type="number" step="100" value="${v.valorCompra||''}"></div>
  <div class="form-group"><label class="form-label">Data da compra</label><input class="form-input" id="fVData" type="date" value="${v.dataCompra||hoje}"></div>
  <div class="form-group"><label class="form-label">Valor atual (R$) — opcional</label><input class="form-input" id="fVValorAtual" type="number" step="100" value="${v.valorAtual||''}" placeholder="Calcula auto se vazio"></div>
  <div class="form-group"><label class="form-label">Depreciação anual (%)</label><input class="form-input" id="fVDeprec" type="number" step="0.5" value="${v.depreciacaoAnualPct || 10}" min="0" max="50"></div>
  <div class="form-group"><label class="form-label">IPVA anual (R$)</label><input class="form-input" id="fVIPVA" type="number" step="50" value="${v.ipvaAnual||''}"></div>
  <div class="form-group"><label class="form-label">Seguro anual (R$)</label><input class="form-input" id="fVSeguro" type="number" step="50" value="${v.seguroAnual||''}"></div>
  <div class="form-group"><label class="form-label">Manutenção mensal estimada (R$)</label><input class="form-input" id="fVManut" type="number" step="50" value="${v.manutencaoMensal||''}"></div>
  <div class="form-group form-full"><label class="form-label">Observações</label><input class="form-input" id="fVNotes" value="${v.notes||''}"></div>
</div>`;
    Modal.open(isEdit ? 'Editar Veículo' : 'Novo Veículo', html, () => {
      const data = {
        marca:                document.getElementById('fVMarca').value.trim(),
        modelo:               document.getElementById('fVModelo').value.trim(),
        apelido:              document.getElementById('fVApelido').value.trim(),
        ano:                  parseInt(document.getElementById('fVAno').value) || null,
        placa:                document.getElementById('fVPlaca').value.trim(),
        cor:                  document.getElementById('fVCor').value.trim(),
        valorCompra:          parseFloat(document.getElementById('fVValor').value) || 0,
        dataCompra:           document.getElementById('fVData').value,
        valorAtual:           parseFloat(document.getElementById('fVValorAtual').value) || 0,
        depreciacaoAnualPct:  parseFloat(document.getElementById('fVDeprec').value) || 10,
        ipvaAnual:            parseFloat(document.getElementById('fVIPVA').value) || 0,
        seguroAnual:          parseFloat(document.getElementById('fVSeguro').value) || 0,
        manutencaoMensal:     parseFloat(document.getElementById('fVManut').value) || 0,
        notes:                document.getElementById('fVNotes').value.trim(),
      };
      if (!data.marca || !data.modelo) return toast('Preencha marca e modelo', 'error');
      if (!data.valorCompra) return toast('Informe o valor de compra', 'error');
      if (isEdit) { Store.updateVeiculo(veiculo.id, data); toast('Veículo atualizado', 'success'); }
      else        { Store.addVeiculo(data);                 toast('Veículo cadastrado', 'success'); }
      Modal.close();
      if (onSaved) onSaved();
    }, isEdit ? () => {
      Store.deleteVeiculo(veiculo.id);
      Modal.close();
      if (onSaved) onSaved();
      toast('Veículo removido', 'success');
    } : null);
  }

  // Cria contrato recorrente anual com o IPVA ou Seguro do veículo
  function _programarCustoVeiculo(v, tipo, onDone) {
    const valor = tipo === 'ipva' ? v.ipvaAnual : v.seguroAnual;
    if (!valor) return toast(`Cadastre o valor do ${tipo.toUpperCase()} primeiro`, 'error');
    const label = tipo === 'ipva' ? `IPVA ${v.modelo || v.apelido}` : `Seguro ${v.modelo || v.apelido}`;
    const hoje = new Date();
    const html = `
<div class="form-grid">
  <div class="form-group form-full"><label class="form-label">Descrição</label><input class="form-input" id="fPVLabel" value="${label}"></div>
  <div class="form-group"><label class="form-label">Valor anual (R$)</label><input class="form-input" id="fPVValor" type="number" step="50" value="${valor}"></div>
  <div class="form-group"><label class="form-label">Mês de cobrança</label><select class="form-input" id="fPVMes">${Utils.monthsFull.map((m,i)=>`<option value="${i+1}"${i===hoje.getMonth()?' selected':''}>${m}</option>`).join('')}</select></div>
  <div class="form-group"><label class="form-label">Dia do mês</label><input class="form-input" id="fPVDia" type="number" min="1" max="28" value="10"></div>
  <div class="form-group"><label class="form-label">Repetir por (anos)</label><input class="form-input" id="fPVAnos" type="number" min="1" max="10" value="5"></div>
</div>
<div style="font-size:11px;color:var(--text-3);margin-top:8px">Será criado um contrato anual de despesa categoria "Transporte".</div>`;
    Modal.open(`Programar ${tipo.toUpperCase()} — ${v.modelo || v.apelido}`, html, () => {
      const lbl   = document.getElementById('fPVLabel').value.trim() || label;
      const val   = parseFloat(document.getElementById('fPVValor').value) || valor;
      const mes   = parseInt(document.getElementById('fPVMes').value) || 1;
      const dia   = parseInt(document.getElementById('fPVDia').value) || 10;
      const anos  = parseInt(document.getElementById('fPVAnos').value) || 5;
      const ano   = hoje.getFullYear();
      const ini   = `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
      const fimD  = new Date(ano + anos, mes - 1, dia);
      const fim   = fimD.toISOString().slice(0, 10);
      Store.addContrato({
        label: lbl, kind: 'despesa', responsavel: currentPessoa(),
        category: 'transporte', sub: tipo === 'ipva' ? 'IPVA' : 'Seguro',
        dataInicio: ini, dataFim: fim,
        valorParcela: val, parcelas: anos, entrada: 0,
        diaVencimento: dia, pay: 'transferencia',
        notes: `Gerado a partir do veículo cadastrado: ${v.marca} ${v.modelo}.`,
        active: true,
        // Periodicidade anual — campo opcional usado pelo gerador de lançamentos
        periodicidade: 'anual',
      });
      Modal.close();
      toast(`${tipo.toUpperCase()} programado por ${anos} anos`, 'success');
      if (onDone) onDone();
    });
  }

  function openImovelModal(imovel, onSaved) {
    const isEdit = !!imovel;
    const im = imovel || {};
    const hoje = new Date().toISOString().slice(0, 10);
    const TIPOS = [['casa','Casa'],['apartamento','Apartamento'],['sala','Sala comercial'],['terreno','Terreno'],['outro','Outro']];
    const html = `
<div class="form-grid">
  <div class="form-group"><label class="form-label">Tipo</label>
    <select class="form-select" id="fIMTipo">${TIPOS.map(([v,l])=>`<option value="${v}"${im.tipo===v?' selected':''}>${l}</option>`).join('')}</select>
  </div>
  <div class="form-group"><label class="form-label">Apelido</label><input class="form-input" id="fIMApelido" placeholder="Ex.: Casa da família" value="${im.apelido||''}"></div>
  <div class="form-group form-full"><label class="form-label">Endereço</label><input class="form-input" id="fIMEnd" placeholder="Rua, número, cidade" value="${im.endereco||''}"></div>
  <div class="form-group"><label class="form-label">Valor de compra (R$)</label><input class="form-input" id="fIMValor" type="number" step="1000" value="${im.valorCompra||''}"></div>
  <div class="form-group"><label class="form-label">Data da compra</label><input class="form-input" id="fIMData" type="date" value="${im.dataCompra||hoje}"></div>
  <div class="form-group"><label class="form-label">Valor atual (R$) — opcional</label><input class="form-input" id="fIMValorAtual" type="number" step="1000" value="${im.valorAtual||''}" placeholder="Calcula auto se vazio"></div>
  <div class="form-group"><label class="form-label">Valorização anual (%)</label><input class="form-input" id="fIMValoriz" type="number" step="0.5" value="${im.valorizacaoAnualPct||0}" min="-10" max="20"></div>

  <div class="form-group form-full">
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-1);cursor:pointer;margin-bottom:6px">
      <input type="checkbox" id="fIMFinanciado" ${im.financiado?'checked':''}> Imóvel financiado
    </label>
  </div>
  <div class="form-group"><label class="form-label">Saldo devedor (R$)</label><input class="form-input" id="fIMSaldo" type="number" step="1000" value="${im.saldoDevedor||''}"></div>
  <div class="form-group"><label class="form-label">Parcela do financiamento (R$/mês)</label><input class="form-input" id="fIMParc" type="number" step="50" value="${im.parcelaFinanciamento||''}"></div>

  <div class="form-group"><label class="form-label">IPTU anual (R$)</label><input class="form-input" id="fIMIPTU" type="number" step="50" value="${im.iptuAnual||''}"></div>
  <div class="form-group"><label class="form-label">Condomínio mensal (R$)</label><input class="form-input" id="fIMCond" type="number" step="10" value="${im.condominioMensal||''}"></div>
  <div class="form-group form-full"><label class="form-label">Manutenção mensal estimada (R$)</label><input class="form-input" id="fIMManut" type="number" step="10" value="${im.manutencaoMensal||''}"></div>

  <div class="form-group form-full">
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-1);cursor:pointer;margin-bottom:6px">
      <input type="checkbox" id="fIMAlugado" ${im.alugado?'checked':''}> Imóvel alugado (recebo aluguel)
    </label>
  </div>
  <div class="form-group form-full"><label class="form-label">Aluguel mensal recebido (R$)</label><input class="form-input" id="fIMAluguel" type="number" step="50" value="${im.aluguelMensal||''}"></div>

  <div class="form-group form-full"><label class="form-label">Observações</label><input class="form-input" id="fIMNotes" value="${im.notes||''}"></div>
</div>`;
    Modal.open(isEdit ? 'Editar Imóvel' : 'Novo Imóvel', html, () => {
      const data = {
        tipo:                 document.getElementById('fIMTipo').value,
        apelido:              document.getElementById('fIMApelido').value.trim(),
        endereco:             document.getElementById('fIMEnd').value.trim(),
        valorCompra:          parseFloat(document.getElementById('fIMValor').value) || 0,
        dataCompra:           document.getElementById('fIMData').value,
        valorAtual:           parseFloat(document.getElementById('fIMValorAtual').value) || 0,
        valorizacaoAnualPct:  parseFloat(document.getElementById('fIMValoriz').value) || 0,
        financiado:           document.getElementById('fIMFinanciado').checked,
        saldoDevedor:         parseFloat(document.getElementById('fIMSaldo').value) || 0,
        parcelaFinanciamento: parseFloat(document.getElementById('fIMParc').value) || 0,
        iptuAnual:            parseFloat(document.getElementById('fIMIPTU').value) || 0,
        condominioMensal:     parseFloat(document.getElementById('fIMCond').value) || 0,
        manutencaoMensal:     parseFloat(document.getElementById('fIMManut').value) || 0,
        alugado:              document.getElementById('fIMAlugado').checked,
        aluguelMensal:        parseFloat(document.getElementById('fIMAluguel').value) || 0,
        notes:                document.getElementById('fIMNotes').value.trim(),
      };
      if (!data.apelido && !data.endereco) return toast('Informe um apelido ou endereço', 'error');
      if (!data.valorCompra) return toast('Informe o valor de compra', 'error');
      if (isEdit) { Store.updateImovel(imovel.id, data); toast('Imóvel atualizado', 'success'); }
      else        { Store.addImovel(data);               toast('Imóvel cadastrado', 'success'); }
      Modal.close();
      if (onSaved) onSaved();
    }, isEdit ? () => {
      Store.deleteImovel(imovel.id);
      Modal.close();
      if (onSaved) onSaved();
      toast('Imóvel removido', 'success');
    } : null);
  }

  function _programarCustoImovel(im, tipo, onDone) {
    const cfg = {
      iptu:          { valor: im.iptuAnual,            label: `IPTU ${im.apelido||im.endereco||'imóvel'}`,        kind: 'despesa', cat: 'moradia', sub: 'IPTU',          period: 'anual',  defaultAnos: 5 },
      condominio:    { valor: im.condominioMensal,     label: `Condomínio ${im.apelido||im.endereco||'imóvel'}`,  kind: 'despesa', cat: 'moradia', sub: 'Condomínio',    period: 'mensal', defaultAnos: 2 },
      financiamento: { valor: im.parcelaFinanciamento, label: `Parcela financ. ${im.apelido||im.endereco||''}`,   kind: 'despesa', cat: 'moradia', sub: 'Financiamento', period: 'mensal', defaultAnos: 30 },
      aluguel:       { valor: im.aluguelMensal,        label: `Aluguel ${im.apelido||im.endereco||'imóvel'}`,     kind: 'receita', cat: 'receita', sub: 'Aluguel',       period: 'mensal', defaultAnos: 2 },
    }[tipo];
    if (!cfg || !cfg.valor) return toast('Cadastre o valor primeiro no imóvel', 'error');

    const hoje = new Date();
    const labelPeriodo = cfg.period === 'anual' ? 'Ano' : 'Mês';
    const html = `
<div class="form-grid">
  <div class="form-group form-full"><label class="form-label">Descrição</label><input class="form-input" id="fPILabel" value="${cfg.label}"></div>
  <div class="form-group"><label class="form-label">Valor (R$/${cfg.period==='anual'?'ano':'mês'})</label><input class="form-input" id="fPIValor" type="number" step="50" value="${cfg.valor}"></div>
  ${cfg.period === 'anual'
    ? `<div class="form-group"><label class="form-label">Mês de cobrança</label><select class="form-input" id="fPIMes">${Utils.monthsFull.map((m,i)=>`<option value="${i+1}"${i===hoje.getMonth()?' selected':''}>${m}</option>`).join('')}</select></div>`
    : `<div class="form-group"><label class="form-label">Mês de início</label><select class="form-input" id="fPIMes">${Utils.monthsFull.map((m,i)=>`<option value="${i+1}"${i===hoje.getMonth()?' selected':''}>${m}</option>`).join('')}</select></div>`}
  <div class="form-group"><label class="form-label">Dia</label><input class="form-input" id="fPIDia" type="number" min="1" max="28" value="${cfg.period==='anual'?10:5}"></div>
  <div class="form-group"><label class="form-label">Repetir por (${cfg.period==='anual'?'anos':'meses'})</label><input class="form-input" id="fPIQtd" type="number" min="1" max="${cfg.period==='anual'?40:360}" value="${cfg.period==='anual'?cfg.defaultAnos:cfg.defaultAnos*12}"></div>
</div>
<div style="font-size:11px;color:var(--text-3);margin-top:8px">Será criado um contrato ${cfg.period} de ${cfg.kind} (categoria ${cfg.cat}).</div>`;
    Modal.open(`Programar ${tipo} — ${im.apelido||im.endereco||'imóvel'}`, html, () => {
      const lbl   = document.getElementById('fPILabel').value.trim() || cfg.label;
      const val   = parseFloat(document.getElementById('fPIValor').value) || cfg.valor;
      const mes   = parseInt(document.getElementById('fPIMes').value) || 1;
      const dia   = parseInt(document.getElementById('fPIDia').value) || 5;
      const qtd   = parseInt(document.getElementById('fPIQtd').value) || 1;
      const ano   = hoje.getFullYear();
      const ini   = `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
      Store.addContrato({
        label: lbl, kind: cfg.kind, responsavel: currentPessoa(),
        category: cfg.cat, sub: cfg.sub,
        dataInicio: ini,
        valorParcela: val, parcelas: qtd, entrada: 0,
        diaVencimento: dia, pay: cfg.kind === 'receita' ? 'transferencia' : 'transferencia',
        notes: `Gerado a partir do imóvel cadastrado.`,
        active: true,
        periodicidade: cfg.period,
      });
      Modal.close();
      toast(`${cfg.label} programado`, 'success');
      if (onDone) onDone();
    });
  }

  function openAtivoModal(ativo, onSaved) {
    const isEdit = !!ativo;
    const TYPES = ['Crypto','Token','FIAT BR','FIAT EUR'];
    const CURRENCIES = ['BRL','USD','EUR'];
    const html = `
<div class="form-grid">
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">Nome / Plataforma</label>
    <input class="form-input" id="fAP" placeholder="Ex: Bitcoin, Wise" value="${isEdit?ativo.platform:''}"/>
  </div>
  <div class="form-group">
    <label class="form-label">Tipo</label>
    <select class="form-select" id="fAT">${TYPES.map(t=>`<option${isEdit&&t===ativo.type?' selected':''}>${t}</option>`).join('')}</select>
  </div>
  <div class="form-group">
    <label class="form-label">Moeda</label>
    <select class="form-select" id="fACur">${CURRENCIES.map(c=>`<option${isEdit&&c===ativo.currency?' selected':''}>${c}</option>`).join('')}</select>
  </div>
  <div class="form-group">
    <label class="form-label">Quantidade</label>
    <input class="form-input" id="fAQ" type="number" step="any" value="${isEdit?ativo.qty:1}"/>
  </div>
  <div class="form-group">
    <label class="form-label">Preço unitário</label>
    <input class="form-input" id="fAU" type="number" step="any" value="${isEdit?ativo.unitPrice:0}"/>
  </div>
  <div class="form-group">
    <label class="form-label">Data atualização</label>
    <input class="form-input" id="fAD" type="date" value="${isEdit?ativo.updated:''}"/>
  </div>
</div>`;
    Modal.open(isEdit ? 'Editar Ativo' : 'Novo Ativo', html, () => {
      const patch = {
        platform : document.getElementById('fAP').value.trim(),
        type     : document.getElementById('fAT').value,
        currency : document.getElementById('fACur').value,
        qty      : parseFloat(document.getElementById('fAQ').value) || 0,
        unitPrice: parseFloat(document.getElementById('fAU').value) || 0,
        updated  : document.getElementById('fAD').value,
      };
      if (!patch.platform) return toast('Preencha o nome/plataforma', 'error');
      if (isEdit) { Store.updateAtivo(ativo.id, patch); toast('Ativo atualizado!', 'success'); }
      else {
        const newAtivo = { id: 'a'+Date.now(), ...patch };
        Store.get().ativos.push(newAtivo); Store.persist(); toast('Ativo adicionado!', 'success');
      }
      Modal.close(); if (onSaved) onSaved();
    }, isEdit ? () => {
      Store.deleteAtivo(ativo.id);
      Modal.close();
      if (onSaved) onSaved();
      toast('Ativo excluído', 'success');
    } : null);
  }

  // ── Modal: Recebimento Futuro (renamed to avoid conflict) ─────
  function openFuturoModal2(onSaved) {
    const thisYear = new Date().getFullYear();
    const html = `<div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Descrição</label><input class="form-input" id="fFDesc" placeholder="Ex: Rescisão, Dividendos…"/></div>
      <div class="form-group"><label class="form-label">Valor Esperado (R$)</label><input class="form-input" id="fFValor" type="number" step="100"/></div>
      <div class="form-group"><label class="form-label">Mês Previsto</label>
        <select class="form-select" id="fFMes">${MESES_LABEL.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">Ano</label><input class="form-input" id="fFAno" type="number" value="${thisYear}" min="${thisYear}"/></div>
    </div>`;
    Modal.open('Recebimento Futuro Previsto', html, () => {
      const descricao = document.getElementById('fFDesc').value.trim();
      const valor     = parseFloat(document.getElementById('fFValor').value) || 0;
      const mes       = parseInt(document.getElementById('fFMes').value);
      const ano       = parseInt(document.getElementById('fFAno').value) || thisYear;
      if (!descricao || !valor) return toast('Preencha descrição e valor', 'error');
      Store.addRecebimentoFuturo({ descricao, valor, mes, ano, status: 'pendente' });
      toast('Adicionado!', 'success');
      Modal.close(); if (onSaved) onSaved();
    });
  }


  // ══════════════════════════════════════════════════════════════
  // PAGE: COMPARATIVO
  // ══════════════════════════════════════════════════════════════
  function renderComparativo(container) {
    const month = getMonth(), year = getYear();
    const eu = currentPessoa();
    const cor = Utils.personColor(eu);

    // ── Dados filtrados por pessoa ────────────────────────────────
    const todasDesp = Store.get().despesas;
    const todasRec  = Store.get().receitas;

    // Despesas do mês atribuídas a esta pessoa (split ou responsavel)
    function despPessoa(m, y) {
      return todasDesp.filter(d => d.year === y && d.month === m).reduce((acc, d) => {
        if (d.split && d.split.length) {
          const minha = d.split.find(s => s.person === eu);
          return acc + (minha ? minha.valor : 0);
        }
        return d.responsavel === eu ? acc + d.amount : acc;
      }, 0);
    }
    // Receitas do mês desta pessoa
    function recPessoa(m, y) {
      return todasRec.filter(r => r.year === y && r.month === m && r.person === eu)
        .reduce((a, r) => a + r.amount, 0);
    }

    const despMes   = despPessoa(month, year);
    const recMes    = recPessoa(month, year);
    const saldoMes  = recMes - despMes;

    // Histórico mensal individual
    const yrMeuDesp = Array.from({length:12}, (_,i) => despPessoa(i+1, year));
    const yrMeuRec  = Array.from({length:12}, (_,i) => recPessoa(i+1, year));
    const yrMeuSaldo = yrMeuRec.map((r,i) => r - yrMeuDesp[i]);

    const totalMeuRec  = yrMeuRec.reduce((a,b)=>a+b,0);
    const totalMeuDesp = yrMeuDesp.reduce((a,b)=>a+b,0);
    const totalMeuSaldo = totalMeuRec - totalMeuDesp;
    const mediaMeuDesp = totalMeuDesp / Math.max(1, yrMeuDesp.filter(d=>d>0).length);

    // Maior gasto do mês desta pessoa
    const despMesLista = todasDesp.filter(d => d.year===year && d.month===month).filter(d => {
      if (d.split && d.split.length) return d.split.some(s => s.person === eu && s.valor > 0);
      return d.responsavel === eu;
    });
    const topDesp = despMesLista.length ? despMesLista.reduce((a,b) => {
      const va = a.split?.find(s=>s.person===eu)?.valor ?? a.amount;
      const vb = b.split?.find(s=>s.person===eu)?.valor ?? b.amount;
      return vb > va ? b : a;
    }) : null;

    // Top categorias do mês desta pessoa
    const catMap = {};
    despMesLista.forEach(d => {
      const val = d.split?.find(s=>s.person===eu)?.valor ?? d.amount;
      catMap[d.category] = (catMap[d.category]||0) + val;
    });
    const topCats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // Últimos lançamentos desta pessoa
    const recentDesp = [...despMesLista].sort((a,b) => b.date.localeCompare(a.date)).slice(0,8);
    const recentRec  = todasRec.filter(r=>r.year===year&&r.month===month&&r.person===eu)
      .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);

    container.innerHTML = `
<div class="dash-hero" style="border-left-color:${cor}">
  <div class="dash-hero-left">
    <div class="dash-hero-greeting" style="color:${cor}">Meu Painel — ${eu}</div>
    <div class="dash-hero-month">${Utils.monthsFull[month-1]} ${year}</div>
  </div>
  <div class="dash-hero-stats">
    <div class="dash-hero-stat"><div class="dash-hero-stat-label">Receitas</div><div class="dash-hero-stat-value pos">${Utils.currency(recMes)}</div></div>
    <div class="dash-hero-stat"><div class="dash-hero-stat-label">Despesas</div><div class="dash-hero-stat-value neg">${Utils.currency(despMes)}</div></div>
    <div class="dash-hero-stat"><div class="dash-hero-stat-label">Saldo</div><div class="dash-hero-stat-value ${saldoMes>=0?'pos':'neg'}">${saldoMes<0?'-':''}${Utils.currency(Math.abs(saldoMes))}</div></div>
  </div>
</div>

<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Receita do Mês</div>
      <div class="kpi-value green">${Utils.currency(recMes)}</div>
      <div class="kpi-sub">Total anual: ${Utils.currency(totalMeuRec)}</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 12V22H4V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 7H2v5h20V7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Despesas do Mês</div>
      <div class="kpi-value red">${Utils.currency(despMes)}</div>
      <div class="kpi-sub">Média mensal: ${Utils.currency(mediaMeuDesp)}</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:${saldoMes>=0?'var(--accent)':'var(--red)'};--kpi-bg:${saldoMes>=0?'var(--accent-dim)':'var(--red-dim)'}">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 3h18v4H3zM3 10h18M8 10v11M16 10v11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Saldo Pessoal</div>
      <div class="kpi-value ${saldoMes>=0?'accent':'red'}">${saldoMes<0?'-':''}${Utils.currency(Math.abs(saldoMes))}</div>
      <div class="kpi-sub">Anual: ${totalMeuSaldo>=0?'':'-'}${Utils.currency(Math.abs(totalMeuSaldo))}</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--amber);--kpi-bg:var(--amber-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Maior Gasto do Mês</div>
      <div class="kpi-value" style="color:var(--amber)">${topDesp ? Utils.currency(topDesp.split?.find(s=>s.person===eu)?.valor ?? topDesp.amount) : '—'}</div>
      <div class="kpi-sub" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${topDesp ? topDesp.desc + ' · ' + (Store.CATEGORIES[topDesp.category]?.label||topDesp.category) : 'Sem despesas'}</div>
    </div>
  </div>
</div>

<div class="chart-grid mb-6">
  <div class="card">
    <div class="card-header"><span class="card-title">Meus Gastos por Mês — ${year}</span></div>
    <div class="chart-wrap"><canvas id="chartMeuAnual" class="chart-canvas"></canvas></div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title">Meu Saldo Acumulado — ${year}</span></div>
    <div class="chart-wrap"><canvas id="chartMeuSaldo" class="chart-canvas"></canvas></div>
  </div>
</div>

${topCats.length ? `
<div class="chart-grid mb-6">
  <div class="card">
    <div class="card-header"><span class="card-title">Minhas Categorias — ${Utils.monthsFull[month-1]}</span></div>
    <div class="chart-with-legend">
      <canvas id="chartMeuDonut"></canvas>
      <div class="donut-legend" id="meuDonutLegend"></div>
    </div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title">Últimas Receitas</span><span class="badge badge-green">${Utils.monthsFull[month-1]}</span></div>
    ${recentRec.length ? `<div style="display:flex;flex-direction:column;gap:0">
      ${recentRec.map(r => `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--text-1)">${r.desc}</div>
          <div style="font-size:11px;color:var(--text-4)">${Utils.fmtDate(r.date)}</div>
        </div>
        <span style="font-size:14px;font-weight:700;color:var(--green)">${Utils.currency(r.amount)}</span>
      </div>`).join('')}
    </div>` : '<div style="padding:24px;text-align:center;color:var(--text-4);font-size:13px">Sem receitas no período</div>'}
  </div>
</div>` : ''}

<div class="card mb-6">
  <div class="card-header"><span class="card-title">Meus Lançamentos — ${Utils.monthsFull[month-1]}</span><span class="badge badge-red">${recentDesp.length} itens</span></div>
  ${recentDesp.length ? `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="num">Valor</th></tr></thead>
    <tbody>
      ${recentDesp.map(d => {
        const val = d.split?.find(s=>s.person===eu)?.valor ?? d.amount;
        const cat = Store.CATEGORIES[d.category];
        return `<tr>
          <td class="muted" style="white-space:nowrap">${Utils.fmtDate(d.date)}</td>
          <td>${d.desc}${d.split?.length ? ` <span class="badge badge-accent" style="font-size:10px">rateio</span>` : ''}</td>
          <td><span class="badge" style="background:${cat?.color+'20'};color:${cat?.color}">${cat?.label||d.category}</span></td>
          <td class="num negative">${Utils.currency(val)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div>` : '<div style="padding:24px;text-align:center;color:var(--text-4);font-size:13px">Sem despesas no período</div>'}
</div>

<div class="card">
  <div class="card-header"><span class="card-title">Histórico Mensal — ${year}</span></div>
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th>Mês</th><th class="num">Receitas</th><th class="num">Despesas</th><th class="num">Saldo</th></tr></thead>
      <tbody>
        ${yrMeuRec.map((rec,i) => {
          const desp = yrMeuDesp[i]; const s = rec-desp;
          const empty = rec===0&&desp===0;
          return `<tr style="${empty?'opacity:0.4':''}">
            <td>${Utils.monthsFull[i]}</td>
            <td class="num positive">${rec>0?Utils.currency(rec):'—'}</td>
            <td class="num negative">${desp>0?Utils.currency(desp):'—'}</td>
            <td class="num ${s>=0?'positive':'negative'}">${rec>0||desp>0?(s<0?'-':'')+Utils.currency(Math.abs(s)):'—'}</td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot><tr>
        <td class="fw-700">Total</td>
        <td class="num positive fw-700">${Utils.currency(totalMeuRec)}</td>
        <td class="num negative fw-700">${Utils.currency(totalMeuDesp)}</td>
        <td class="num ${totalMeuSaldo>=0?'positive':'negative'} fw-700">${totalMeuSaldo<0?'-':''}${Utils.currency(Math.abs(totalMeuSaldo))}</td>
      </tr></tfoot>
    </table>
  </div>
</div>`;

    requestAnimationFrame(() => {
      Charts.Bar(document.getElementById('chartMeuAnual'), {
        labels: Utils.months,
        datasets: [
          { label:'Receitas', values:yrMeuRec,  color: cor },
          { label:'Despesas', values:yrMeuDesp, color:'#EF4444' },
        ],
      }, { height: 165 });

      // ── Reembolsos embedded no Meu Painel ─────────────────────────
      const reembWrap = document.createElement('div');
      container.appendChild(reembWrap);
      renderReembolsos(reembWrap, 'embedded');

      let saldoAcc2 = 0;
      Charts.Line(document.getElementById('chartMeuSaldo'), {
        labels: Utils.months,
        datasets: [{ label:'Saldo', values: yrMeuSaldo.map(s => { saldoAcc2+=s; return saldoAcc2; }), color: cor }],
      }, { height: 150 });

      if (topCats.length && document.getElementById('chartMeuDonut')) {
        const donutData = topCats.map(([cat, val], i) => ({
          label: Store.CATEGORIES[cat]?.label||cat,
          value: val,
          color: Store.CATEGORIES[cat]?.color || Charts.PALETTE[i],
        }));
        Charts.Donut(document.getElementById('chartMeuDonut'), donutData, {
          size: 170, centerLabel: Charts.fmt(despMes, true), centerSub: 'total',
        });
        const td = donutData.reduce((a,d)=>a+d.value,0)||1;
        document.getElementById('meuDonutLegend').innerHTML = donutData.map(d => `
          <div class="donut-legend-item">
            <div class="donut-legend-dot" style="background:${d.color}"></div>
            <span class="donut-legend-label">${d.label}</span>
            <span class="donut-legend-pct">${((d.value/td)*100).toFixed(0)}%</span>
            <span class="donut-legend-val">${Charts.fmt(d.value, true)}</span>
          </div>`).join('');
      }
    });
  }


  // ══════════════════════════════════════════════════════════════
  // GLOBAL: Add Lançamento (from topbar button)
  // ══════════════════════════════════════════════════════════════
  function openNovaEntrada() {
    const cats = Store.categoriesOrdered().filter(([k])=>k!=='receita');
    const dSugs = Store.descSuggestions();
    const dSugMap = Object.fromEntries(dSugs.map(s => [s.desc, s]));
    const rSugs = Store.receitaSuggestions();
    const rSugMap = Object.fromEntries(rSugs.map(s => [s.desc, s]));
    const today = new Date().toISOString().slice(0,10);
    let novaEntradaSplitApi = null;
    const html = `
<div class="tabs" style="margin-bottom:16px">
  <button class="tab active" id="tabDesp">Despesa</button>
  <button class="tab" id="tabRec">Receita</button>
</div>
<div id="formDesp" class="form-grid">
  <div class="form-group form-full">
    <label class="form-label">Descrição</label>
    <div class="ac-wrap">
      <input class="form-input" id="nDesc" placeholder="Ex: Supermercado…" autocomplete="off"/>
      <div class="ac-list" id="nDescAc"></div>
    </div>
  </div>
  <div class="form-group"><label class="form-label">Valor (R$)</label><input class="form-input" id="nAmt" type="number" step="0.01"/></div>
  <div class="form-group"><label class="form-label">Data</label><input class="form-input" id="nDate" type="date" value="${today}"/></div>
  <div class="form-group"><label class="form-label">Categoria</label><select class="form-select" id="nCat">${cats.map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select></div>
  <div class="form-group"><label class="form-label">Sub-categoria</label><select class="form-select" id="nSub"></select></div>
  <div class="form-group"><label class="form-label">Pagamento</label><select class="form-select" id="nPay">${Store.PAYMENT_METHODS.map(m=>`<option>${m}</option>`).join('')}</select></div>
  <div class="form-group" id="nCartaoRow" style="display:none"><label class="form-label">Cartão</label>
    <select class="form-select" id="nCartao">${(Store.get().cartoes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select>
  </div>
  <div class="form-group form-full" style="display:flex;align-items:center;gap:20px;padding:2px 0">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
      <input type="checkbox" id="nParcelado" style="width:16px;height:16px;accent-color:var(--accent)">
      <span class="form-label" style="margin:0">Parcelado</span>
    </label>
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
      <input type="checkbox" id="nDesconto" style="width:16px;height:16px;accent-color:var(--green)">
      <span class="form-label" style="margin:0">Houve desconto?</span>
    </label>
  </div>
  <div id="nDescontoOpts" style="display:none;grid-column:1/-1" class="form-group">
    <label class="form-label">Valor Original (R$)</label>
    <input class="form-input" id="nValorOriginal" type="number" step="0.01" placeholder="Valor sem desconto"/>
    <div style="font-size:11px;color:var(--green);margin-top:4px" id="nEconomia"></div>
  </div>
  <div id="nParceladoOpts" style="display:none;grid-column:1/-1;display:none;gap:16px" class="form-grid">
    <div class="form-group">
      <label class="form-label">Nº de parcelas</label>
      <select class="form-select" id="nParcelas">${[2,3,4,5,6,7,8,9,10,11,12,18,24].map(n=>`<option value="${n}">${n}x</option>`).join('')}</select>
    </div>
    <div class="form-group">
      <label class="form-label">Valor por parcela</label>
      <div class="form-input" id="nParcelaInfo" style="display:flex;align-items:center;color:var(--accent);font-weight:700;background:var(--bg-elevated)">—</div>
    </div>
  </div>
  ${splitSectionHTML()}
</div>
<div id="formRec" class="form-grid hidden">
  <div class="form-group form-full">
    <label class="form-label">Descrição</label>
    <div class="ac-wrap">
      <input class="form-input" id="nRDesc" placeholder="Ex: Salário, Contrato…" autocomplete="off"/>
      <div class="ac-list" id="nRDescAc"></div>
    </div>
  </div>
  <div class="form-group"><label class="form-label">Valor (R$)</label><input class="form-input" id="nRAmt" type="number" step="0.01"/></div>
  <div class="form-group"><label class="form-label">Data</label><input class="form-input" id="nRDate" type="date" value="${today}"/></div>
  <div class="form-group"><label class="form-label">Pessoa</label><select class="form-select" id="nRPerson">${Store.PESSOAS.map(p=>`<option>${p}</option>`).join('')}</select></div>
  <div class="form-group"><label class="form-label">Tipo</label><select class="form-select" id="nRType">
    <option value="salario">Salário</option><option value="contrato">Contrato</option>
    <option value="pensao">Pensão</option><option value="outros">Outros</option>
  </select></div>
</div>`;
    Modal.open('Novo Lançamento', html, () => {
      const isDesp = !document.getElementById('formDesp').classList.contains('hidden');
      if (isDesp) {
        const desc=document.getElementById('nDesc').value.trim();
        const amount=parseFloat(document.getElementById('nAmt').value);
        const date=document.getElementById('nDate').value;
        const cat=document.getElementById('nCat').value;
        const sub=document.getElementById('nSub').value;
        const pay=document.getElementById('nPay').value;
        const cartaoId=pay==='Cartão'?(document.getElementById('nCartao')?.value||null):null;
        const parcelado=document.getElementById('nParcelado').checked;
        const parcelas=parseInt(document.getElementById('nParcelas')?.value||'1');
        const temDesc=document.getElementById('nDesconto')?.checked;
        const valorOrig=temDesc?parseFloat(document.getElementById('nValorOriginal')?.value||'0'):0;
        const economia=temDesc&&valorOrig>amount?valorOrig-amount:0;
        const extraD=temDesc&&economia>0?{desconto:true,valorOriginal:valorOrig,economia}:{};
        if (cartaoId) extraD.cartaoId=cartaoId;
        if (!desc||!amount||!date) return toast('Preencha todos os campos','error');
        const splitVal = novaEntradaSplitApi?.read() || null;
        if (splitVal) extraD.split=splitVal;
        if (parcelado && parcelas > 1) {
          Store.addDespesaParcelada({ desc, amount: parseFloat((amount/parcelas).toFixed(2)), date, category:cat, sub, pay, parcelas, ...extraD });
          toast(`${parcelas} parcelas lançadas!`, 'success');
        } else {
          const d=new Date(date);
          Store.addDespesa({desc,amount,date,category:cat,sub,pay,month:d.getMonth()+1,year:d.getFullYear(),...extraD});
          toast('Despesa adicionada!', 'success');
        }
      } else {
        const desc=document.getElementById('nRDesc').value.trim();
        const amount=parseFloat(document.getElementById('nRAmt').value);
        const date=document.getElementById('nRDate').value;
        const person=document.getElementById('nRPerson').value;
        const type=document.getElementById('nRType').value;
        if (!desc||!amount||!date) return toast('Preencha todos os campos','error');
        const d=new Date(date);
        Store.addReceita({desc,amount,date,person,type,category:'receita',month:d.getMonth()+1,year:d.getFullYear()});
        toast('Receita adicionada!', 'success');
      }
      Modal.close();
      Router.navigate(Router.current);
    });
    setTimeout(() => {
      const updateSubs = () => {
        const cat = document.getElementById('nCat')?.value;
        const subs = Store.SUBCATEGORIES[cat]||[];
        const sel = document.getElementById('nSub');
        if (sel) sel.innerHTML = subs.map(s=>`<option>${s}</option>`).join('');
      };
      const updateParcelaInfo = () => {
        const amt = parseFloat(document.getElementById('nAmt')?.value) || 0;
        const n   = parseInt(document.getElementById('nParcelas')?.value || '1');
        const el  = document.getElementById('nParcelaInfo');
        if (el) el.textContent = n > 1 && amt ? Utils.currency(amt/n) + '/mês' : '—';
      };
      document.getElementById('nPay')?.addEventListener('change', e => {
        const row = document.getElementById('nCartaoRow');
        if (row) row.style.display = e.target.value === 'Cartão' ? 'block' : 'none';
      });
      document.getElementById('nParcelado')?.addEventListener('change', e => {
        const opts = document.getElementById('nParceladoOpts');
        if (opts) opts.style.display = e.target.checked ? 'grid' : 'none';
      });
      document.getElementById('nDesconto')?.addEventListener('change', e => {
        const opts = document.getElementById('nDescontoOpts');
        if (opts) opts.style.display = e.target.checked ? 'block' : 'none';
      });
      function updateNEconomia() {
        const amt = parseFloat(document.getElementById('nAmt')?.value) || 0;
        const orig = parseFloat(document.getElementById('nValorOriginal')?.value) || 0;
        const el = document.getElementById('nEconomia');
        if (el) el.textContent = orig > amt ? `💰 Economia: ${Utils.currency(orig - amt)}` : '';
      }
      document.getElementById('nValorOriginal')?.addEventListener('input', updateNEconomia);
      document.getElementById('nParcelas')?.addEventListener('change', updateParcelaInfo);
      document.getElementById('nAmt')?.addEventListener('input', () => { updateParcelaInfo(); updateNEconomia(); });
      setupAC('nDesc', 'nDescAc', dSugs.map(s => s.desc), val => {
        const match = dSugMap[val];
        if (match) {
          const catSel = document.getElementById('nCat');
          if (catSel) { catSel.value = match.category; updateSubs(); }
          setTimeout(() => { const s = document.getElementById('nSub'); if (s && match.sub) s.value = match.sub; }, 30);
        }
      });
      setupAC('nRDesc', 'nRDescAc', rSugs.map(s => s.desc), val => {
        const match = rSugMap[val];
        if (match) {
          const p = document.getElementById('nRPerson'); if (p && match.person) p.value = match.person;
          const t = document.getElementById('nRType');   if (t && match.type)   t.value = match.type;
        }
      });
      document.getElementById('nCat')?.addEventListener('change', updateSubs);
      updateSubs();
      novaEntradaSplitApi = setupSplitUI('nAmt', null);
      document.getElementById('tabDesp')?.addEventListener('click', () => {
        document.getElementById('formDesp').classList.remove('hidden');
        document.getElementById('formRec').classList.add('hidden');
        document.getElementById('tabDesp').classList.add('active');
        document.getElementById('tabRec').classList.remove('active');
      });
      document.getElementById('tabRec')?.addEventListener('click', () => {
        document.getElementById('formRec').classList.remove('hidden');
        document.getElementById('formDesp').classList.add('hidden');
        document.getElementById('tabRec').classList.add('active');
        document.getElementById('tabDesp').classList.remove('active');
      });
    }, 50);
  }

  // ══════════════════════════════════════════════════════════════
  // MEMBER DESPESA — formulário simplificado (perfil Membro)
  // ══════════════════════════════════════════════════════════════
  function openMemberDespesa(pessoaName, onSaved) {
    const cats = Store.categoriesOrdered().filter(([k]) => k !== 'receita');
    const html = `
<div style="margin-bottom:12px;font-size:12px;color:var(--amber);display:flex;align-items:center;gap:6px">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
  Lançamento como <strong>${pessoaName}</strong> — visível para toda a família
</div>
<div class="form-grid">
  <div class="form-group form-full">
    <label class="form-label">Descrição</label>
    <input class="form-input" id="fMDesc" placeholder="Ex: Lanche, Material escolar…" autocomplete="off"/>
  </div>
  <div class="form-group"><label class="form-label">Valor (R$)</label><input class="form-input" id="fMAmt" type="number" step="0.01" placeholder="0,00"/></div>
  <div class="form-group"><label class="form-label">Data</label><input class="form-input" id="fMDate" type="date" value="${new Date().toISOString().slice(0,10)}"/></div>
  <div class="form-group"><label class="form-label">Categoria</label>
    <select class="form-select" id="fMCat">${cats.map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select>
  </div>
  <div class="form-group"><label class="form-label">Sub-categoria</label><select class="form-select" id="fMSub"></select></div>
  <div class="form-group"><label class="form-label">Pagamento</label>
    <select class="form-select" id="fMPay">${Store.PAYMENT_METHODS.map(m=>`<option>${m}</option>`).join('')}</select>
  </div>
</div>`;

    Modal.open('Lançar Despesa', html, () => {
      const desc   = document.getElementById('fMDesc').value.trim();
      const amount = parseFloat(document.getElementById('fMAmt').value);
      const date   = document.getElementById('fMDate').value;
      const cat    = document.getElementById('fMCat').value;
      const sub    = document.getElementById('fMSub').value;
      const pay    = document.getElementById('fMPay').value;
      if (!desc || !amount || !date) return toast('Preencha todos os campos', 'error');
      const d = new Date(date);
      Store.addDespesa({
        desc, amount, date, category: cat, sub, pay,
        month: d.getMonth()+1, year: d.getFullYear(),
        responsavel: pessoaName,
        split: [{ person: pessoaName, valor: amount, share: 100 }],
      });
      // Push imediato para a nuvem para que o admin veja
      if (typeof SupabaseSync !== 'undefined') SupabaseSync.schedulePush(Store.get());
      toast('Despesa lançada!', 'success');
      Modal.close();
      if (onSaved) onSaved();
    });

    setTimeout(() => {
      const updateSubs = () => {
        const subs = Store.SUBCATEGORIES[document.getElementById('fMCat')?.value] || [];
        const sel  = document.getElementById('fMSub');
        if (sel) sel.innerHTML = subs.map(s=>`<option>${s}</option>`).join('');
      };
      updateSubs();
      document.getElementById('fMCat')?.addEventListener('change', updateSubs);
    }, 0);
  }

  // ══════════════════════════════════════════════════════════════
  // EDIT MODALS — Despesa & Receita
  // ══════════════════════════════════════════════════════════════
  function openEditDespesa(id, onSaved) {
    const d = Store.get().despesas.find(d => d.id === id);
    if (!d) return;
    const cats = Store.categoriesOrdered().filter(([k]) => k !== 'receita');
    const html = `<div class="form-grid">
      <div class="form-group form-full">
        <label class="form-label">Descrição</label>
        <input class="form-input" id="eDDesc" value="${d.desc.replace(/"/g,'&quot;')}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Valor (R$)</label>
        <input class="form-input" id="eDAmt" type="number" step="0.01" value="${d.amount}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Data</label>
        <input class="form-input" id="eDDate" type="date" value="${d.date}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-select" id="eDCat">
          ${cats.map(([k,v]) => `<option value="${k}"${k===d.category?' selected':''}>${v.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Sub-categoria</label>
        <select class="form-select" id="eDSub">
          ${(Store.SUBCATEGORIES[d.category]||[]).map(s => `<option${s===d.sub?' selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Pagamento</label>
        <select class="form-select" id="eDPay">
          ${Store.PAYMENT_METHODS.map(m => `<option${m===d.pay?' selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group form-full" style="display:flex;align-items:center;gap:20px;padding:2px 0">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="eDDesconto" style="width:16px;height:16px;accent-color:var(--green)"${d.desconto?' checked':''}>
          <span class="form-label" style="margin:0">Houve desconto?</span>
        </label>
      </div>
      <div id="eDDescontoOpts" style="display:${d.desconto?'block':'none'};grid-column:1/-1" class="form-group">
        <label class="form-label">Valor Original (R$)</label>
        <input class="form-input" id="eDValorOriginal" type="number" step="0.01" value="${d.valorOriginal||''}"/>
        <div style="font-size:11px;color:var(--green);margin-top:4px" id="eDEconomia">${d.economia?'💰 Economia: '+Utils.currency(d.economia):''}</div>
      </div>
      ${splitSectionHTML().replace(/fD/g, 'fD')}
      ${(() => {
        const tipoEfetivo = Store.getDespesaTipo ? Store.getDespesaTipo(d) : null;
        const tipos = Store.getTipos ? Store.getTipos() : [];
        return `
      <div class="form-group form-full" style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:var(--bg-elevated)">
        <label class="form-label" style="margin-bottom:6px">Tipo deste lançamento <span style="font-weight:400;color:var(--text-3);text-transform:none;letter-spacing:normal;font-size:11px">(opcional — sobrescreve o tipo da subcategoria)</span></label>
        <select class="form-select" id="eDTipoOverride">
          <option value="">Herdar da subcategoria (${(Store.getTipoById && Store.getTipoById(tipoEfetivo)?.label) || tipoEfetivo || '—'})</option>
          ${tipos.map(t => `<option value="${t.id}" ${d.tipoOverride===t.id?'selected':''}>${t.label}</option>`).join('')}
        </select>
      </div>`;
      })()}
      <div class="form-group form-full">
        <label class="form-label">Visibilidade</label>
        <div class="vis-toggle">
          <button type="button" class="vis-btn${(d.visibilidade||'familiar')==='familiar'?' active':''}" data-vis="familiar" id="eDVisBtnFamiliar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            Familiar
            <span class="vis-btn-hint">visível pra todos</span>
          </button>
          <button type="button" class="vis-btn${(d.visibilidade||'familiar')==='particular'?' active':''}" data-vis="particular" id="eDVisBtnParticular">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Particular
            <span class="vis-btn-hint">só você</span>
          </button>
        </div>
        <input type="hidden" id="eDVis" value="${d.visibilidade||'familiar'}"/>
      </div>
      <div id="eDReembolsoRow" class="form-group form-full" style="display:${(d.visibilidade||'familiar')==='particular'?'block':'none'};background:var(--amber-bg,rgba(245,158,11,.07));border-radius:10px;padding:12px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:8px">
          <input type="checkbox" id="eDReembolso" style="width:16px;height:16px;accent-color:var(--amber)"${d.reembolso?' checked':''}>
          <span class="form-label" style="margin:0;color:var(--amber)">Solicitar reembolso</span>
        </label>
        <div id="eDReembolsoFields" style="display:${d.reembolso?'block':'none'}">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
            <div>
              <label class="form-label">Quem reembolsa</label>
              <select class="form-select" id="eDReembolsoDe">
                ${Store.PESSOAS.map(p => `<option${p===(d.reembolso?.de||'')?' selected':''}>${p}</option>`).join('')}
                <option${'Família'===(d.reembolso?.de||'')?' selected':''}>Família</option>
              </select>
            </div>
            <div>
              <label class="form-label">Valor a reembolsar (R$)</label>
              <input class="form-input" id="eDReembolsoValor" type="number" step="0.01" value="${d.reembolso?.valor||''}"/>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    let editSplitApi = null;
    Modal.open('Editar Despesa', html, () => {
      const desc   = document.getElementById('eDDesc').value.trim();
      const amount = parseFloat(document.getElementById('eDAmt').value);
      const date   = document.getElementById('eDDate').value;
      const cat    = document.getElementById('eDCat').value;
      const sub    = document.getElementById('eDSub').value;
      const pay    = document.getElementById('eDPay').value;
      const temDesc = document.getElementById('eDDesconto').checked;
      const valorOrig = temDesc ? parseFloat(document.getElementById('eDValorOriginal').value||'0') : 0;
      const economia  = temDesc && valorOrig > amount ? valorOrig - amount : 0;
      const split    = editSplitApi?.read() || null;
      const tipoOverride = document.getElementById('eDTipoOverride')?.value || null;
      const visibilidade = document.getElementById('eDVis')?.value || 'familiar';
      const temReembolso = visibilidade === 'particular' && document.getElementById('eDReembolso')?.checked;
      const reembolsoDe  = temReembolso ? (document.getElementById('eDReembolsoDe')?.value || 'Família') : null;
      const reembolsoVal = temReembolso ? (parseFloat(document.getElementById('eDReembolsoValor')?.value) || amount) : null;
      if (!desc || !amount || !date) return toast('Preencha todos os campos', 'error');
      if (split) {
        const sum = split.reduce((s,r)=>s+r.valor,0);
        if (sum > amount + 0.01) return toast('Soma do rateio excede o valor', 'error');
      }
      const dt = new Date(date);
      const updates = {
        desc, amount, date, category: cat, sub, pay,
        month: dt.getMonth() + 1, year: dt.getFullYear(),
        desconto: temDesc && economia > 0, valorOriginal: valorOrig, economia,
        split: split || null,
        tipoOverride: tipoOverride || null,
        visibilidade,
        reembolso: temReembolso ? {
          para: d.reembolso?.para || currentPessoa(),
          de: reembolsoDe, valor: reembolsoVal,
          status: d.reembolso?.status || 'pendente',
          criadoEm: d.reembolso?.criadoEm || new Date().toISOString().slice(0,10),
        } : null,
      };
      Store.updateDespesa(id, updates);
      Modal.close();
      toast('Despesa atualizada!', 'success');
      updateReembolsosBadge();
      if (onSaved) onSaved();
    }, () => {
      // Excluir (dentro do modal de edição — redesign 2026-05)
      if (!confirm('Excluir esta despesa? A ação não pode ser desfeita.')) return;
      Store.deleteDespesa(id);
      Modal.close();
      toast('Despesa removida', 'success');
      if (onSaved) onSaved();
    });

    setTimeout(() => {
      editSplitApi = setupSplitUI('eDAmt', d.split || null);
      document.getElementById('eDCat')?.addEventListener('change', () => {
        const cat = document.getElementById('eDCat').value;
        const sel = document.getElementById('eDSub');
        if (sel) sel.innerHTML = (Store.SUBCATEGORIES[cat]||[]).map(s=>`<option>${s}</option>`).join('');
      });
      document.getElementById('eDDesconto')?.addEventListener('change', e => {
        document.getElementById('eDDescontoOpts').style.display = e.target.checked ? 'block' : 'none';
      });
      function updateEd() {
        const amt  = parseFloat(document.getElementById('eDAmt')?.value) || 0;
        const orig = parseFloat(document.getElementById('eDValorOriginal')?.value) || 0;
        const el   = document.getElementById('eDEconomia');
        if (el) el.textContent = orig > amt ? `💰 Economia: ${Utils.currency(orig - amt)}` : '';
      }
      document.getElementById('eDValorOriginal')?.addEventListener('input', updateEd);
      document.getElementById('eDAmt')?.addEventListener('input', updateEd);
      document.querySelectorAll('#eDVisBtnFamiliar,#eDVisBtnParticular').forEach(btn => {
        btn.addEventListener('click', () => {
          const vis = btn.dataset.vis;
          document.querySelectorAll('#eDVisBtnFamiliar,#eDVisBtnParticular').forEach(b => {
            b.classList.toggle('active', b.dataset.vis === vis);
            b.classList.toggle('vis-btn--particular', b.dataset.vis === 'particular');
          });
          document.getElementById('eDVis').value = vis;
          const row = document.getElementById('eDReembolsoRow');
          if (row) row.style.display = vis === 'particular' ? 'block' : 'none';
        });
      });
      document.getElementById('eDReembolso')?.addEventListener('change', e => {
        document.getElementById('eDReembolsoFields').style.display = e.target.checked ? 'block' : 'none';
      });
    }, 50);
  }

  function openEditReceita(id, onSaved) {
    const r = Store.get().receitas.find(r => r.id === id);
    if (!r) return;
    const html = `<div class="form-grid">
      <div class="form-group form-full">
        <label class="form-label">Descrição</label>
        <input class="form-input" id="eRDesc" value="${r.desc.replace(/"/g,'&quot;')}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Valor (R$)</label>
        <input class="form-input" id="eRAmt" type="number" step="0.01" value="${r.amount}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Data</label>
        <input class="form-input" id="eRDate" type="date" value="${r.date}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Pessoa</label>
        <select class="form-select" id="eRPerson">
          ${Store.PESSOAS.map(p => `<option${p===r.person?' selected':''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-select" id="eRType">
          <option value="salario"${r.type==='salario'?' selected':''}>Salário</option>
          <option value="contrato"${r.type==='contrato'?' selected':''}>Contrato</option>
          <option value="pensao"${r.type==='pensao'?' selected':''}>Pensão</option>
          <option value="emprestimo"${r.type==='emprestimo'?' selected':''}>Empréstimo</option>
          <option value="outros"${r.type==='outros'?' selected':''}>Outros</option>
        </select>
      </div>
    </div>`;

    Modal.open('Editar Receita', html, () => {
      const desc   = document.getElementById('eRDesc').value.trim();
      const amount = parseFloat(document.getElementById('eRAmt').value);
      const date   = document.getElementById('eRDate').value;
      const person = document.getElementById('eRPerson').value;
      const type   = document.getElementById('eRType').value;
      if (!desc || !amount || !date) return toast('Preencha todos os campos', 'error');
      const dt = new Date(date);
      Store.updateReceita(id, {
        desc, amount, date, person, type,
        month: dt.getMonth() + 1, year: dt.getFullYear(),
      });
      Modal.close();
      toast('Receita atualizada!', 'success');
      if (onSaved) onSaved();
    }, () => {
      // Excluir (dentro do modal — redesign 2026-05)
      if (!confirm('Excluir esta receita? A ação não pode ser desfeita.')) return;
      Store.deleteReceita(id);
      Modal.close();
      toast('Receita removida', 'success');
      if (onSaved) onSaved();
    });
  }

  // ── CARTÕES (rota separada — só seção de cartões) ──
  function renderCartoes(container) {
    renderContas(container, 'cartoes');
  }

  // ══════════════════════════════════════════════════════════════
  // SIMULADOR — wrapper que unifica Investimentos + Simulações
  // sub-nav: INVESTIR (renderInvestimentos) · OBJETIVOS · DÍVIDAS
  // (redesign 2026-05 — backlog project_backlog_unify_simulador.md)
  // ══════════════════════════════════════════════════════════════
  function renderSimulador(container) {
    const BUCKET_KEY = 'ff_sim_bucket';
    const bucket = localStorage.getItem(BUCKET_KEY) || 'investir';

    // Buckets que controlam quais sub-abas de Simulações aparecem
    const BUCKETS = {
      investir: { label: 'Investir', desc: 'portfólio, evolução patrimonial e comparativo de produtos' },
      objetivos: { label: 'Objetivos', desc: 'viagem, reserva, metas, FIRE — calculadoras orientadas a objetivos' },
      dividas: { label: 'Dívidas', desc: 'amortização de empréstimos e financiamentos' },
    };
    const cur = BUCKETS[bucket] || BUCKETS.investir;

    container.innerHTML = `
<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">Simulador <span class="page-head-year">— ${cur.label}</span></h1>
    <p class="page-head-meta">
      <span style="color:var(--text-3)">${cur.desc}</span>
    </p>
  </div>
</div>

<div class="view-tabs mb-4">
  <button class="view-tab view-tab--green ${bucket==='investir'?'active':''}" data-bucket="investir">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
    Investir
  </button>
  <button class="view-tab view-tab--violet ${bucket==='objetivos'?'active':''}" data-bucket="objetivos">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
    Objetivos
  </button>
  <button class="view-tab view-tab--red ${bucket==='dividas'?'active':''}" data-bucket="dividas">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
    Dívidas
  </button>
</div>

${(() => {
  // Coach inline contextual — Simulador
  const tips = {
    investir:  { tone: 'neutral', titulo: 'Compare antes de investir',
      texto: 'Use o comparador de produtos para ver CDB vs LCI vs Tesouro lado a lado. Considere prazo, liquidez e imposto antes de decidir.' },
    objetivos: { tone: 'neutral', titulo: 'Defina prazo + valor + rentabilidade',
      texto: 'Cada simulador exige 3 inputs: quanto você quer, em quanto tempo, e a rentabilidade esperada. O Coach sugere quanto aportar por mês.' },
    dividas:   { tone: 'attention', titulo: 'Quitar dívida cara é o melhor investimento',
      texto: 'Dívidas com juros acima de 1% ao mês geralmente rendem mais quitar do que investir. Use a amortização SAC para ver o impacto de antecipar parcelas.' },
  };
  const tc = tips[bucket] || tips.investir;
  return coachInlineHTML({
    contexto: `Simulador · ${cur.label}`,
    titulo: tc.titulo,
    texto: tc.texto,
    tone: tc.tone,
    acoes: [{ label: 'Ver análise completa', action: 'open-coach' }],
  });
})()}

<div id="simBucketContent"></div>`;

    // Bind tabs
    container.querySelectorAll('[data-bucket]').forEach(btn => {
      btn.addEventListener('click', () => {
        localStorage.setItem(BUCKET_KEY, btn.dataset.bucket);
        renderSimulador(container);
      });
    });

    // Renderiza conteúdo do bucket no modo embed (sem page-head próprio)
    const child = container.querySelector('#simBucketContent');
    window._simEmbedded = true;
    try {
      if (bucket === 'investir') {
        renderInvestimentos(child);
      } else if (bucket === 'objetivos') {
        window._simBucketFilter = ['viagem', 'reserva', 'compra', 'juros', 'fire', 'meta'];
        renderSimulacoes(child);
      } else if (bucket === 'dividas') {
        window._simBucketFilter = ['amortizacao'];
        renderSimulacoes(child);
      }
    } finally {
      // Limpa flags (mas pode ter side-effect async pendente — aceitável)
      setTimeout(() => {
        window._simEmbedded = false;
        window._simBucketFilter = null;
      }, 100);
    }
  }

  // ── INVESTIMENTOS (aba dedicada — comparador + curva patrimonial) ─
  async function renderInvestimentos(container) {
    const data    = Store.get();
    const reservas = data.reservas || [];
    const ativos   = data.ativos   || [];
    const imoveis  = (typeof Store.getImoveis  === 'function') ? Store.getImoveis()  : [];
    const veiculos = (typeof Store.getVeiculos === 'function') ? Store.getVeiculos() : [];

    const totalInvestido = reservas.reduce((s, r) => s + (r.valorInvestido || 0), 0);
    const totalAtual     = reservas.reduce((s, r) => s + (r.valorAtual || r.valorInvestido || 0), 0);
    const ganho          = totalAtual - totalInvestido;
    const rendPct        = totalInvestido > 0 ? (ganho / totalInvestido) * 100 : 0;

    // Rendimento estimado/ano: soma (taxa anual * valor atual) de cada reserva
    const rendEstAno = reservas.reduce((s, r) => {
      const taxa = (r.taxaAnual || 0) / 100;
      const val  = r.valorAtual || r.valorInvestido || 0;
      return s + val * taxa;
    }, 0);

    // Outros ativos (imóveis + veículos + ativos manuais)
    const toBRL = a => (a.moeda === 'USD' ? (a.valor||0)*5.2 : a.moeda === 'EUR' ? (a.valor||0)*5.7 : (a.valor||0));
    const outrosAtivos = ativos.reduce((s,a) => s + toBRL(a), 0)
      + imoveis.reduce((s,im) => s + (im.valorAtual || im.valorCompra || 0), 0)
      + veiculos.reduce((s,v) => s + (v.valorAtual || v.valorCompra || 0), 0);

    // Distribuição por tipo (donut)
    const TIPO_COLORS = { 'Renda Fixa':'#22C55E','Renda Variável':'#7367F0','Crypto':'#F59E0B','Dinheiro':'#9CA3AF','Outros':'#14B8A6' };
    const byTipo = {};
    reservas.forEach(r => {
      const tipo = r.tipo || 'Outros';
      byTipo[tipo] = (byTipo[tipo] || 0) + (r.valorAtual || r.valorInvestido || 0);
    });

    // Saldo médio mensal sobrando (últimos 6 meses) para sugerir aporte
    const hojeD = new Date();
    let saldoSomado = 0, mesesUsados = 0;
    for (let k = 0; k < 6; k++) {
      const d = new Date(hojeD); d.setMonth(d.getMonth() - k);
      const rec  = Store.sumReceitas(d.getMonth() + 1, d.getFullYear());
      const desp = Store.sumDespesas(d.getMonth() + 1, d.getFullYear());
      if (rec > 0 || desp > 0) { saldoSomado += (rec - desp); mesesUsados++; }
    }
    const saldoMedio = mesesUsados ? Math.max(0, Math.round(saldoSomado / mesesUsados)) : 500;

    const _embed = window._simEmbedded;
    container.innerHTML = `
${_embed ? '' : `<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">Investimentos</h1>
    <p class="page-head-meta">
      <span class="page-head-meta-green">${Utils.currency(totalAtual)}</span>
      <span class="page-head-meta-sep">·</span>
      <span class="page-head-meta-total">${reservas.length} aplicação${reservas.length!==1?'ões':''}</span>
      <span class="page-head-meta-sep">·</span>
      <span style="color:var(--text-3)">portfólio, evolução e comparativo de produtos</span>
    </p>
  </div>
  <button class="btn-secondary" onclick="Router.navigate('patrimonio')" style="white-space:nowrap">${icon('bar-chart-2',{size:14})} Reserva & Patrimônio</button>
</div>`}

<!-- 4 KPIs — Figma spec -->
<div class="kpi-grid mb-6" style="grid-template-columns:repeat(4,1fr)">
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-icon">${icon('landmark',{size:22})}</div>
    <div class="kpi-body">
      <div class="kpi-label">Total em Reservas</div>
      <div class="kpi-value accent">${Utils.currency(totalAtual)}</div>
      <div class="kpi-sub">${reservas.length} aplicação${reservas.length!==1?'ões':''} · ${rendPct.toFixed(1)}% ganho</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-icon">${icon('trending-up',{size:22})}</div>
    <div class="kpi-body">
      <div class="kpi-label">Rendimento Est./Ano</div>
      <div class="kpi-value green">${Utils.currency(rendEstAno)}</div>
      <div class="kpi-sub">${totalAtual > 0 ? ((rendEstAno/totalAtual)*100).toFixed(1)+'% a.a. médio' : 'adicione taxas para calcular'}</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:${ganho>=0?'var(--teal)':'var(--red)'};--kpi-bg:${ganho>=0?'var(--teal-dim,#14B8A618)':'var(--red-dim)'}">
    <div class="kpi-icon">${icon('arrow-up-right',{size:22})}</div>
    <div class="kpi-body">
      <div class="kpi-label">Ganho Acumulado</div>
      <div class="kpi-value" style="color:${ganho>=0?'var(--teal)':'var(--red)'}">${ganho>=0?'+':''}${Utils.currency(ganho)}</div>
      <div class="kpi-sub">vs ${Utils.currency(totalInvestido)} investido</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--amber);--kpi-bg:var(--amber-dim)">
    <div class="kpi-icon">${icon('building-2',{size:22})}</div>
    <div class="kpi-body">
      <div class="kpi-label">Outros Ativos</div>
      <div class="kpi-value" style="color:var(--amber)">${Utils.currency(outrosAtivos)}</div>
      <div class="kpi-sub">imóveis, veículos, ativos manuais</div>
    </div>
  </div>
</div>

<!-- Donut + Evolução patrimonial (Figma: dois charts lado a lado) -->
${reservas.length > 0 ? `
<div class="chart-grid mb-6" style="grid-template-columns:1fr 2fr;align-items:start;gap:16px">
  <div class="card">
    <div class="card-header"><span class="card-title">Distribuição do Portfólio</span></div>
    <div style="display:flex;justify-content:center;padding:8px 0">
      <canvas id="chartInvDonut" width="180" height="180"></canvas>
    </div>
    <div id="invDonutLegend" style="display:flex;flex-direction:column;gap:6px;padding:0 4px 4px"></div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title">Evolução Patrimonial — ${getYear()}</span>
      <span style="font-size:11px;color:var(--text-4)">reservas + saldo acumulado</span>
    </div>
    <div class="chart-wrap"><canvas id="chartInvEvolucao" class="chart-canvas" height="200"></canvas></div>
  </div>
</div>

<!-- Portfólio cards -->
<div class="card mb-6">
  <div class="card-header">
    <span class="card-title">Portfólio Atual</span>
    <span style="font-size:11px;color:var(--text-4)">Gerencie em <a href="#patrimonio" onclick="Router.navigate('patrimonio')" style="color:var(--accent)">Reserva & Patrimônio</a></span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:4px 0">
    ${reservas.map(r => {
      const valAtual = r.valorAtual || r.valorInvestido || 0;
      const ganhoR   = valAtual - (r.valorInvestido || 0);
      const rendR    = r.valorInvestido > 0 ? (ganhoR / r.valorInvestido * 100) : 0;
      const tipoColor = TIPO_COLORS[r.tipo] || 'var(--text-3)';
      const pctPortfolio = totalAtual > 0 ? (valAtual / totalAtual * 100).toFixed(1) : 0;
      return `<div style="border:1px solid var(--border);border-radius:10px;padding:14px;background:var(--surface-2);position:relative">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:${tipoColor};flex-shrink:0"></span>
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${tipoColor}">${r.tipo||'Aplicação'}</span>
          <span style="margin-left:auto;font-size:10px;color:var(--text-4)">${pctPortfolio}%</span>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${r.nome||r.label||'—'}">${r.nome||r.label||'—'}</div>
        <div style="font-size:18px;font-weight:800;font-family:var(--mono);color:var(--text-1)">${Utils.currency(valAtual)}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
          <span style="font-size:11px;color:${ganhoR>=0?'var(--green)':'var(--red)'}">${ganhoR>=0?'+':''}${Utils.currency(ganhoR)} (${rendR.toFixed(1)}%)</span>
          ${r.taxaAnual ? `<span style="font-size:10px;color:var(--text-4)">${r.taxaAnual}% a.a.</span>` : ''}
        </div>
        <div style="height:3px;border-radius:2px;background:var(--border);margin-top:8px">
          <div style="height:3px;border-radius:2px;width:${Math.min(pctPortfolio,100)}%;background:${tipoColor}"></div>
        </div>
      </div>`;
    }).join('')}
  </div>
</div>` : `
<div class="card mb-6" style="text-align:center;padding:32px;border:1.5px dashed var(--border)">
  <div style="font-size:14px;color:var(--text-3);margin-bottom:6px">Nenhuma aplicação cadastrada</div>
  <div style="font-size:12px;color:var(--text-4)">Adicione em <a href="#patrimonio" onclick="Router.navigate('patrimonio')" style="color:var(--accent)">Reserva & Patrimônio</a> para ver seu portfólio aqui</div>
</div>`}

<!-- Header de taxas -->
<div class="rates-strip card mb-6" id="invRatesStrip">
  <div style="padding:14px;font-size:12px;color:var(--text-3)">Carregando taxas de referência…</div>
</div>

<!-- Comparador -->
<div class="chart-grid mb-6" style="grid-template-columns:380px 1fr;align-items:start">
  <div class="card">
    <div class="card-header"><span class="card-title">Comparar produtos</span></div>
    <div class="form-grid" style="grid-template-columns:1fr">
      <div class="form-group"><label class="form-label">Capital inicial (R$)</label><input class="form-input" id="ivCap" type="number" step="100" value="${Math.round(totalInvestido || 1000)}"></div>
      <div class="form-group"><label class="form-label">Aporte mensal (R$)</label><input class="form-input" id="ivAporte" type="number" step="50" value="${saldoMedio}"><div style="font-size:11px;color:var(--text-3);margin-top:4px">Sugerido pelo saldo médio (${mesesUsados ? `${mesesUsados} meses` : 'sem dados'})</div></div>
      <div class="form-group"><label class="form-label">Horizonte (anos)</label><input class="form-input" id="ivAnos" type="number" min="1" max="40" value="10"></div>
      <div class="form-group"><label class="form-label">Inflação esperada (% a.a.)</label><input class="form-input" id="ivInfl" type="number" step="0.1" value="4.5"><div style="font-size:11px;color:var(--text-3);margin-top:4px">Para produtos IPCA+ e cálculo de poder de compra</div></div>
      <div class="form-group"><label class="form-label">IR estimado (%)</label><input class="form-input" id="ivIR" type="number" step="1" value="15"><div style="font-size:11px;color:var(--text-3);margin-top:4px">15% após 2 anos. LCI/LCA são isentas.</div></div>
    </div>
    <button class="btn-primary w-full" style="margin-top:16px;display:none" id="btnCompInv">Comparar</button>
  </div>
  <div id="ivCompResult" class="card" style="display:none">
    <div class="card-header"><span class="card-title">Evolução comparada</span></div>
    <div id="ivCompBody"></div>
  </div>
</div>

<!-- Calculadora reversa -->
<div class="chart-grid mb-6" style="grid-template-columns:380px 1fr;align-items:start">
  <div class="card">
    <div class="card-header"><span class="card-title">Quanto preciso aportar?</span></div>
    <div class="form-grid" style="grid-template-columns:1fr">
      <div class="form-group"><label class="form-label">Quero ter (R$)</label><input class="form-input" id="ivAlvo" type="number" step="1000" value="100000"></div>
      <div class="form-group"><label class="form-label">Em quantos anos?</label><input class="form-input" id="ivAlvoAnos" type="number" min="1" max="40" value="10"></div>
      <div class="form-group"><label class="form-label">Capital atual (R$)</label><input class="form-input" id="ivAlvoCap" type="number" step="100" value="0"></div>
    </div>
    <button class="btn-primary w-full" style="margin-top:16px;display:none" id="btnRevInv">Calcular aporte por produto</button>
  </div>
  <div id="ivRevResult" class="card" style="display:none">
    <div class="card-header"><span class="card-title">Aporte mensal necessário</span></div>
    <div id="ivRevBody"></div>
  </div>
</div>

<!-- ── FEE ANALYZER ─────────────────────────────────────────── -->
<div class="card mb-6">
  <div class="card-header">
    <span class="card-title">${icon('alert-triangle',{size:15})} Fee Analyzer — O Custo Invisível</span>
    <span style="font-size:11px;color:var(--text-4)">Quanto as taxas vão custar ao longo do tempo?</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end;margin-bottom:16px">
    <div class="form-group" style="margin-bottom:0">
      <label class="form-label">Capital investido (R$)</label>
      <input class="form-input" id="feeCapital" type="number" value="${Math.round(totalInvestido || 10000)}" min="1">
    </div>
    <div class="form-group" style="margin-bottom:0">
      <label class="form-label">Taxa atual do fundo (% a.a.)</label>
      <input class="form-input" id="feeTaxaFundo" type="number" step="0.1" value="2.0" min="0">
    </div>
    <div class="form-group" style="margin-bottom:0">
      <label class="form-label">Horizonte (anos)</label>
      <input class="form-input" id="feeAnos" type="number" min="1" max="40" value="20">
    </div>
    <button class="btn-primary" style="display:none" id="btnFeeAnalyzer">Calcular</button>
  </div>
  <div id="feeResult"></div>
</div>

<!-- ── COACH DO PORTFÓLIO ─────────────────────────────────────── -->
<div class="card mb-6" style="border:1px solid rgba(115,103,240,0.25);background:linear-gradient(135deg,rgba(115,103,240,0.06) 0%,rgba(6,182,212,0.04) 100%)">
  <div class="card-header">
    <span class="card-title" style="display:flex;align-items:center;gap:8px">
      <img src="assets/svg/haile-mark-white.svg" alt="" style="width:18px;height:auto;opacity:.9">
      Coach do Portfólio
    </span>
    <span style="font-size:11px;color:var(--text-4)">Pergunte sobre sua carteira em linguagem natural</span>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px" id="coachPortfolioSuggestions">
    ${[
      'Minha carteira está bem diversificada?',
      'Quanto tempo para atingir R$ 500k?',
      'Meu portfólio está batendo o CDI?',
      'Qual a taxa média da minha carteira?',
      'Como posso melhorar meus investimentos?',
      'Quanto rende meu portfólio por ano?',
    ].map(q => `<button class="coach-suggestion coach-portfolio-q" style="font-size:12px;padding:6px 12px">${q}</button>`).join('')}
  </div>
  <div style="display:flex;gap:8px">
    <input class="form-input" id="coachPortfolioInput" placeholder="Ex: Com R$ 800/mês, quando atinjo R$ 1 milhão?" style="flex:1">
    <button class="btn-primary" id="coachPortfolioSend" style="white-space:nowrap;padding:0 20px">${icon('sparkles',{size:14})} Perguntar</button>
  </div>
  <div id="coachPortfolioResp" style="display:none;margin-top:14px;padding:14px;background:var(--surface-2);border-radius:10px;font-size:14px;line-height:1.65;color:var(--text-1)"></div>
</div>

<!-- ── COMPARADOR DE CENÁRIOS ────────────────────────────────── -->
<div class="card mb-6">
  <div class="card-header">
    <span class="card-title">${icon('git-branch',{size:15})} Comparador de Cenários — E se…?</span>
    <span style="font-size:11px;color:var(--text-4)">Compare até 3 cenários no mesmo gráfico</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">
    ${[1,2,3].map(n => `
    <div style="border:1px solid var(--border);border-radius:10px;padding:14px;background:var(--surface-2)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="width:10px;height:10px;border-radius:50%;background:${n===1?'#7367F0':n===2?'#22C55E':'#F59E0B'};flex-shrink:0"></span>
        <span style="font-size:12px;font-weight:600;color:var(--text-2)">Cenário ${n}</span>
        ${n > 1 ? `<label class="toggle-switch" style="margin-left:auto" title="Ativar cenário ${n}"><input type="checkbox" id="cen${n}Active" ${n===2?'checked':''}><span class="toggle-track"><span class="toggle-thumb"></span></span></label>` : ''}
      </div>
      <div class="form-group" style="margin-bottom:8px">
        <label class="form-label" style="font-size:11px">Capital (R$)</label>
        <input class="form-input" id="cen${n}Cap" type="number" value="${n===1?Math.round(totalInvestido||5000):n===2?Math.round(totalInvestido||5000):Math.round(totalInvestido||5000)}" style="padding:6px 10px;font-size:13px">
      </div>
      <div class="form-group" style="margin-bottom:8px">
        <label class="form-label" style="font-size:11px">Aporte/mês (R$)</label>
        <input class="form-input" id="cen${n}Aporte" type="number" value="${n===1?500:n===2?1000:1500}" style="padding:6px 10px;font-size:13px">
      </div>
      <div class="form-group" style="margin-bottom:8px">
        <label class="form-label" style="font-size:11px">Taxa (% a.a.)</label>
        <input class="form-input" id="cen${n}Taxa" type="number" step="0.1" value="${n===1?10:n===2?12:14}" style="padding:6px 10px;font-size:13px">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label" style="font-size:11px">Horizonte (anos)</label>
        <input class="form-input" id="cen${n}Anos" type="number" min="1" max="40" value="10" style="padding:6px 10px;font-size:13px">
      </div>
    </div>`).join('')}
  </div>
  <button style="display:none" id="btnCenarios">Calcular</button>
  <div id="cenariosResult"></div>
</div>`;

    // ── Donut + Evolução patrimonial ─────────────────────────────
    requestAnimationFrame(() => {
      // Donut de distribuição por tipo
      const donutEl = document.getElementById('chartInvDonut');
      if (donutEl && Object.keys(byTipo).length) {
        const donutData = Object.entries(byTipo).map(([tipo, val]) => ({
          label: tipo, value: val, color: TIPO_COLORS[tipo] || '#7C6EF8',
        }));
        Charts.Donut(donutEl, donutData, {
          size: 180, centerLabel: Charts.fmt(totalAtual, true), centerSub: 'total',
        });
        const legend = document.getElementById('invDonutLegend');
        if (legend) {
          const tot = donutData.reduce((s,d)=>s+d.value,0)||1;
          legend.innerHTML = donutData.map(d=>`
            <div class="donut-legend-item">
              <div class="donut-legend-dot" style="background:${d.color}"></div>
              <span class="donut-legend-label">${d.label}</span>
              <span class="donut-legend-pct">${((d.value/tot)*100).toFixed(1)}%</span>
              <span class="donut-legend-val">${Charts.fmt(d.value,true)}</span>
            </div>`).join('');
        }
      }

      // Evolução patrimonial anual
      const evoEl = document.getElementById('chartInvEvolucao');
      if (evoEl) {
        const yr = getYear();
        const yrRec  = Store.yearlyMonthly(yr, 'receita');
        const yrDesp = Store.yearlyMonthly(yr, 'despesa');
        const totalAccSaldo = yrRec.reduce((a,r,i) => a + r - yrDesp[i], 0);
        const baseline = totalAtual - totalAccSaldo;
        let running = 0;
        const evolLabels = [], evolValues = [], evolAporteValues = [];
        let cumAporte = 0;
        yrRec.forEach((r, i) => {
          if (r === 0 && yrDesp[i] === 0) return;
          running += r - yrDesp[i];
          cumAporte += r;
          evolLabels.push(Utils.months[i]);
          evolValues.push(Math.max(0, parseFloat((baseline + running).toFixed(0))));
          evolAporteValues.push(parseFloat(cumAporte.toFixed(0)));
        });
        if (evolLabels.length > 1) {
          Charts.Line(evoEl, {
            labels: evolLabels,
            datasets: [
              { label: 'Patrimônio', values: evolValues, color: '#7367F0', fill: true },
              { label: 'Receitas acum.', values: evolAporteValues, color: '#22C55E', dashed: true },
            ],
          }, { height: 200 });
        } else {
          evoEl.parentElement.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-4);font-size:13px">Dados insuficientes (mínimo 2 meses)</div>';
        }
      }
    });

    // Header de taxas
    const rates = await MarketRates.get();
    document.getElementById('invRatesStrip').innerHTML = `
<div style="display:flex;align-items:stretch;gap:0;flex-wrap:wrap">
  <div style="flex:1;min-width:120px;padding:14px 16px;border-right:1px solid var(--border)"><div style="font-size:10px;font-weight:700;color:var(--text-4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">SELIC</div><div style="font-size:18px;font-weight:800;color:var(--accent);font-family:var(--mono)">${rates.selic.toFixed(2)}% <span style="font-size:11px;color:var(--text-3);font-weight:500">a.a.</span></div></div>
  <div style="flex:1;min-width:120px;padding:14px 16px;border-right:1px solid var(--border)"><div style="font-size:10px;font-weight:700;color:var(--text-4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">CDI</div><div style="font-size:18px;font-weight:800;color:var(--accent);font-family:var(--mono)">${rates.cdi.toFixed(2)}% <span style="font-size:11px;color:var(--text-3);font-weight:500">a.a.</span></div></div>
  <div style="flex:1;min-width:120px;padding:14px 16px;border-right:1px solid var(--border)"><div style="font-size:10px;font-weight:700;color:var(--text-4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">Poupança</div><div style="font-size:18px;font-weight:800;color:var(--text-2);font-family:var(--mono)">${rates.poupanca.toFixed(2)}% <span style="font-size:11px;color:var(--text-3);font-weight:500">a.a.</span></div></div>
  <div style="flex:2;min-width:240px;padding:14px 16px"><div style="font-size:10px;font-weight:700;color:var(--text-4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Premissas dos produtos</div><div style="font-size:12px;color:var(--text-2);line-height:1.5"><strong>CDB</strong> 100% CDI · <strong>LCI/LCA</strong> 90% CDI (isento IR) · <strong>Tesouro Selic</strong> ~SELIC · <strong>IPCA+</strong> IPCA + 6% a.a.</div></div>
</div>`;

    // Lista de produtos a comparar
    function _produtos(inflPct) {
      return [
        { key: 'poup',   nome: 'Poupança',         taxa: rates.poupanca, isento: true,  color: '#9CA3AF' },
        { key: 'selic',  nome: 'Tesouro Selic',    taxa: rates.selic,    isento: false, color: '#0EA5E9' },
        { key: 'cdb',    nome: 'CDB 100% CDI',     taxa: rates.cdi,      isento: false, color: '#7367F0' },
        { key: 'lci',    nome: 'LCI/LCA 90% CDI',  taxa: rates.cdi*0.9,  isento: true,  color: '#22C55E' },
        { key: 'ipca',   nome: 'Tesouro IPCA+',    taxa: inflPct + 6,    isento: false, color: '#F59E0B' },
      ];
    }

    function _evolucao(pv, pmt, anualPct, meses, ir) {
      const i = annualToMonthly(anualPct);
      const serie = [];
      let saldo = pv, totalAportado = pv;
      for (let m = 1; m <= meses; m++) {
        saldo = saldo * (1 + i) + pmt;
        totalAportado += pmt;
        serie.push(saldo);
      }
      const rendimentoBruto = saldo - totalAportado;
      const rendimentoLiq = rendimentoBruto * (1 - ir);
      const totalLiq = totalAportado + rendimentoLiq;
      return { serie, totalAportado, saldoBruto: saldo, rendimentoBruto, rendimentoLiq, totalLiq };
    }

    document.getElementById('btnCompInv').addEventListener('click', () => {
      const pv     = parseFloat(document.getElementById('ivCap').value) || 0;
      const pmt    = parseFloat(document.getElementById('ivAporte').value) || 0;
      const anos   = parseInt(document.getElementById('ivAnos').value) || 10;
      const inflPct= parseFloat(document.getElementById('ivInfl').value) || 4.5;
      const irPct  = (parseFloat(document.getElementById('ivIR').value) || 15) / 100;
      const meses  = anos * 12;
      const inflM  = annualToMonthly(inflPct);
      const produtos = _produtos(inflPct);

      const resultados = produtos.map(p => {
        const r = _evolucao(pv, pmt, p.taxa, meses, p.isento ? 0 : irPct);
        // Poder de compra (descontando inflação)
        const poderCompra = r.totalLiq / Math.pow(1 + inflM, meses);
        return { ...p, ...r, poderCompra };
      });
      // Ordena por totalLiq desc
      resultados.sort((a, b) => b.totalLiq - a.totalLiq);
      const melhor = resultados[0];

      document.getElementById('ivCompResult').style.display = '';
      const labels = Array.from({ length: anos }, (_, k) => `${k+1}a`);
      // Pega valor da série a cada 12 meses
      const datasetsLine = resultados.map(r => ({
        label: r.nome,
        values: Array.from({ length: anos }, (_, k) => parseFloat(r.serie[(k+1)*12 - 1].toFixed(2))),
        color: r.color,
      }));

      document.getElementById('ivCompBody').innerHTML = `
<div style="font-size:13px;color:var(--text-2);margin-bottom:14px">
  Em <strong>${anos} anos</strong> com capital ${Utils.currency(pv)} + aporte ${Utils.currency(pmt)}/mês:
  o melhor produto é <strong style="color:${melhor.color}">${melhor.nome}</strong>, acumulando <strong>${Utils.currency(melhor.totalLiq)}</strong> líquidos.
</div>
<div class="chart-wrap" style="margin-bottom:16px"><canvas id="chartInvComp" class="chart-canvas" height="240"></canvas></div>
<div class="table-wrap"><table class="data-table">
  <thead><tr><th>Produto</th><th class="num">Taxa</th><th class="num">Total aportado</th><th class="num">Bruto</th><th class="num">Líquido (após IR)</th><th class="num">Poder de compra</th></tr></thead>
  <tbody>${resultados.map(r => `
    <tr style="${r === melhor ? 'background:rgba(34,197,94,0.06)' : ''}">
      <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r.color};margin-right:8px;vertical-align:middle"></span><strong>${r.nome}</strong>${r.isento ? ' <span style="font-size:10px;color:var(--green)">isento IR</span>' : ''}</td>
      <td class="num">${r.taxa.toFixed(2)}% a.a.</td>
      <td class="num">${Utils.currency(r.totalAportado)}</td>
      <td class="num">${Utils.currency(r.saldoBruto)}</td>
      <td class="num positive fw-700">${Utils.currency(r.totalLiq)}</td>
      <td class="num muted">${Utils.currency(r.poderCompra)}</td>
    </tr>`).join('')}</tbody>
</table></div>
<div style="font-size:11px;color:var(--text-3);margin-top:8px">
  "Poder de compra" desconta inflação de ${inflPct}% a.a. — mostra quanto seu dinheiro valeria em poder aquisitivo de hoje.
</div>`;
      if (window._chartInvComp) window._chartInvComp.destroy();
      window._chartInvComp = Charts.Line(document.getElementById('chartInvComp'),
        { labels, datasets: datasetsLine }, { height: 240 });
    });

    document.getElementById('btnRevInv').addEventListener('click', () => {
      const alvo  = parseFloat(document.getElementById('ivAlvo').value) || 0;
      const anos  = parseInt(document.getElementById('ivAlvoAnos').value) || 10;
      const cap   = parseFloat(document.getElementById('ivAlvoCap').value) || 0;
      const inflPct = parseFloat(document.getElementById('ivInfl').value) || 4.5;
      const meses = anos * 12;
      const produtos = _produtos(inflPct);
      const linhas = produtos.map(p => {
        const i = annualToMonthly(p.taxa);
        const capCresce = cap * Math.pow(1 + i, meses);
        const falta = Math.max(0, alvo - capCresce);
        const pmt = falta > 0 ? pmtForFV(falta, i, meses) : 0;
        return { ...p, pmt, capCresce };
      });
      linhas.sort((a, b) => a.pmt - b.pmt);
      const menor = linhas[0];

      document.getElementById('ivRevResult').style.display = '';
      document.getElementById('ivRevBody').innerHTML = `
<div style="font-size:13px;color:var(--text-2);margin-bottom:14px">
  Para acumular <strong>${Utils.currency(alvo)}</strong> em <strong>${anos} anos</strong>${cap > 0 ? ` partindo de ${Utils.currency(cap)}` : ''}:
  o menor aporte é com <strong style="color:${menor.color}">${menor.nome}</strong> = <strong>${Utils.currency(menor.pmt)}/mês</strong>.
</div>
<div class="table-wrap"><table class="data-table">
  <thead><tr><th>Produto</th><th class="num">Taxa</th><th class="num">Aporte mensal</th><th class="num">Total aportado</th></tr></thead>
  <tbody>${linhas.map(l => `
    <tr style="${l === menor ? 'background:rgba(34,197,94,0.06)' : ''}">
      <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${l.color};margin-right:8px;vertical-align:middle"></span><strong>${l.nome}</strong></td>
      <td class="num">${l.taxa.toFixed(2)}% a.a.</td>
      <td class="num positive fw-700">${Utils.currency(l.pmt)}</td>
      <td class="num">${Utils.currency(l.pmt * meses)}</td>
    </tr>`).join('')}</tbody>
</table></div>`;
    });

    // Auto-calc para comparador e calculadora reversa
    const _autoCalcInv = (ids, btnId) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.click();
      ids.forEach(id => { document.getElementById(id)?.addEventListener('input', () => btn.click()); });
    };
    _autoCalcInv(['ivCap','ivAporte','ivAnos','ivInfl','ivIR'], 'btnCompInv');
    _autoCalcInv(['ivAlvo','ivAlvoAnos','ivAlvoCap'], 'btnRevInv');

    // ── COACH DO PORTFÓLIO ────────────────────────────────────────
    function askCoachPortfolio(pergunta) {
      if (!pergunta.trim()) return;
      const respEl = document.getElementById('coachPortfolioResp');
      if (respEl) {
        respEl.style.display = 'block';
        respEl.innerHTML = `<span style="color:var(--accent);font-size:13px;display:flex;align-items:center;gap:6px">${icon('sparkles',{size:13})} Abrindo o Coach com sua pergunta…</span>`;
      }
      // Usa a API pública do Coach — abre o painel e envia a pergunta
      if (window.FFCoach?.ask) {
        window.FFCoach.ask(pergunta);
        if (respEl) {
          setTimeout(() => {
            respEl.innerHTML = `<span style="color:var(--text-3);font-size:12px">✓ Pergunta enviada ao Coach — veja o painel à direita →</span>`;
          }, 400);
        }
      } else {
        if (respEl) respEl.innerHTML = `<span style="color:var(--text-4);font-size:13px">Abra o Coach (ícone no topo) e pergunte diretamente.</span>`;
      }
    }

    document.getElementById('coachPortfolioSend')?.addEventListener('click', () => {
      const input = document.getElementById('coachPortfolioInput');
      if (input) { askCoachPortfolio(input.value); input.value = ''; }
    });
    document.getElementById('coachPortfolioInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('coachPortfolioSend')?.click();
    });
    document.querySelectorAll('.coach-portfolio-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('coachPortfolioInput');
        if (input) input.value = btn.textContent;
        askCoachPortfolio(btn.textContent);
      });
    });

    // ── FEE ANALYZER ─────────────────────────────────────────────
    function calcFeeAnalyzer() {
      const capital  = parseFloat(document.getElementById('feeCapital')?.value) || 10000;
      const taxaFundo = parseFloat(document.getElementById('feeTaxaFundo')?.value) || 2;
      const anos     = parseInt(document.getElementById('feeAnos')?.value) || 20;
      // Benchmark: Tesouro Selic (taxa ~0.1% a.a. de custódia B3)
      const BENCHMARKS = [
        { nome: 'Tesouro Selic', taxa: 0.1, color: '#0EA5E9' },
        { nome: 'ETF / Index Fund', taxa: 0.2, color: '#22C55E' },
        { nome: 'CDB direto', taxa: 0.0, color: '#14B8A6' },
      ];
      // Rendimento base = SELIC (usamos taxaFundo como retorno bruto igual para todos —
      // queremos mostrar só o impacto da taxa de adm, mantendo retorno bruto constante)
      const retornoBruto = (rates?.selic || 13) ; // % a.a.
      function valorFinal(cap, taxaAdm, nAnos) {
        // Retorno líquido anual = retornoBruto - taxaAdm
        const taxaLiq = Math.max(0, retornoBruto - taxaAdm) / 100;
        return cap * Math.pow(1 + taxaLiq, nAnos);
      }
      const vFundo = valorFinal(capital, taxaFundo, anos);
      const resultEl = document.getElementById('feeResult');
      if (!resultEl) return;

      const rows = BENCHMARKS.map(b => {
        const vAltern = valorFinal(capital, b.taxa, anos);
        const economia = vAltern - vFundo;
        const pctEconomia = vFundo > 0 ? (economia / vFundo * 100) : 0;
        return { ...b, vAltern, economia, pctEconomia };
      });

      // Gráfico de evolução ano a ano
      const labels = Array.from({length: anos}, (_,i) => `${i+1}a`);
      const dssets = [
        {
          label: `Fundo (${taxaFundo}% taxa)`,
          values: labels.map((_,i) => parseFloat(valorFinal(capital, taxaFundo, i+1).toFixed(0))),
          color: '#EF4444',
        },
        ...rows.map(b => ({
          label: `${b.nome} (${b.taxa}% taxa)`,
          values: labels.map((_,i) => parseFloat(valorFinal(capital, b.taxa, i+1).toFixed(0))),
          color: b.color,
          dashed: true,
        })),
      ];

      resultEl.innerHTML = `
<div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 18px;margin-bottom:16px">
  <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--red);margin-bottom:4px">⚠️ Custo real da taxa de ${taxaFundo}% a.a. em ${anos} anos</div>
  <div style="font-size:13px;color:var(--text-2);line-height:1.6">
    Capital de <strong style="color:var(--text-1)">${Utils.currency(capital)}</strong> rendendo com retorno bruto de <strong style="color:var(--text-1)">${retornoBruto.toFixed(1)}% a.a.</strong>:
    no fundo com taxa <strong style="color:var(--red)">${taxaFundo}%</strong> → <strong style="color:var(--text-1)">${Utils.currency(vFundo)}</strong>.
    A diferença para alternativas de baixo custo pode passar de <strong style="color:var(--red)">${Utils.currency(rows[0].economia)}</strong>.
  </div>
</div>
<div class="chart-wrap mb-4"><canvas id="chartFeeAnalyzer" class="chart-canvas" height="200"></canvas></div>
<div class="table-wrap">
  <table class="data-table">
    <thead><tr>
      <th>Alternativa</th><th class="num">Taxa adm.</th>
      <th class="num">Valor final</th><th class="num">Economia vs fundo</th><th class="num">Diferença %</th>
    </tr></thead>
    <tbody>
      <tr style="background:rgba(239,68,68,0.05)">
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#EF4444;margin-right:8px;vertical-align:middle"></span><strong>Fundo atual</strong></td>
        <td class="num">${taxaFundo.toFixed(2)}% a.a.</td>
        <td class="num fw-700">${Utils.currency(vFundo)}</td>
        <td class="num muted">—</td>
        <td class="num muted">referência</td>
      </tr>
      ${rows.map(r => `
      <tr>
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r.color};margin-right:8px;vertical-align:middle"></span>${r.nome}</td>
        <td class="num">${r.taxa.toFixed(2)}% a.a.</td>
        <td class="num positive fw-700">${Utils.currency(r.vAltern)}</td>
        <td class="num positive fw-700">+${Utils.currency(r.economia)}</td>
        <td class="num positive">+${r.pctEconomia.toFixed(1)}%</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>
<div style="font-size:11px;color:var(--text-4);margin-top:8px">
  Retorno bruto fixo de ${retornoBruto.toFixed(1)}% a.a. (Meta SELIC atual) para todos os produtos — a diferença é <em>exclusivamente</em> a taxa de administração.
</div>`;
      if (window._chartFeeAnalyzer) window._chartFeeAnalyzer.destroy();
      window._chartFeeAnalyzer = Charts.Line(document.getElementById('chartFeeAnalyzer'),
        { labels, datasets: dssets }, { height: 200 });
    }
    _autoCalcInv(['feeCapital','feeTaxaFundo','feeAnos'], 'btnFeeAnalyzer');
    document.getElementById('btnFeeAnalyzer')?.addEventListener('click', calcFeeAnalyzer);
    // Dispara imediatamente após taxas carregarem (rates já disponível aqui)
    calcFeeAnalyzer();

    // ── COMPARADOR DE CENÁRIOS ────────────────────────────────────
    function calcCenarios() {
      const CEN_COLORS = ['#7367F0','#22C55E','#F59E0B'];
      const cenarios = [1,2,3].map(n => {
        const active = n === 1 ? true : (document.getElementById(`cen${n}Active`)?.checked ?? false);
        return {
          n, active,
          label: `Cenário ${n}`,
          cap:   parseFloat(document.getElementById(`cen${n}Cap`)?.value) || 0,
          aporte:parseFloat(document.getElementById(`cen${n}Aporte`)?.value) || 0,
          taxa:  parseFloat(document.getElementById(`cen${n}Taxa`)?.value) || 10,
          anos:  parseInt(document.getElementById(`cen${n}Anos`)?.value) || 10,
          color: CEN_COLORS[n-1],
        };
      }).filter(c => c.active);

      const maxAnos = Math.max(...cenarios.map(c => c.anos));
      const labels = Array.from({length: maxAnos}, (_,i) => `${i+1}a`);

      const datasets = cenarios.map(c => {
        const i = annualToMonthly(c.taxa);
        const values = [];
        for (let ano = 1; ano <= maxAnos; ano++) {
          if (ano > c.anos) { values.push(null); continue; }
          const meses = ano * 12;
          let s = c.cap;
          for (let m = 0; m < meses; m++) s = s * (1 + i) + c.aporte;
          values.push(parseFloat(s.toFixed(0)));
        }
        return { label: c.label, values, color: c.color };
      });

      const resultEl = document.getElementById('cenariosResult');
      if (!resultEl) return;

      resultEl.innerHTML = `
<div class="chart-wrap mb-4"><canvas id="chartCenarios" class="chart-canvas" height="220"></canvas></div>
<div class="table-wrap">
  <table class="data-table">
    <thead><tr><th>Cenário</th><th class="num">Capital</th><th class="num">Aporte/mês</th><th class="num">Taxa</th><th class="num">Horizonte</th><th class="num">Valor Final</th></tr></thead>
    <tbody>
      ${cenarios.map((c,idx) => {
        const vFinal = datasets[idx].values.filter(v => v !== null).slice(-1)[0] || 0;
        return `<tr>
          <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color};margin-right:8px;vertical-align:middle"></span><strong>${c.label}</strong></td>
          <td class="num">${Utils.currency(c.cap)}</td>
          <td class="num">${Utils.currency(c.aporte)}/mês</td>
          <td class="num">${c.taxa.toFixed(1)}% a.a.</td>
          <td class="num">${c.anos} anos</td>
          <td class="num fw-700" style="color:${c.color}">${Utils.currency(vFinal)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>`;
      if (window._chartCenarios) window._chartCenarios.destroy();
      window._chartCenarios = Charts.Line(document.getElementById('chartCenarios'),
        { labels, datasets }, { height: 220 });
    }

    // Auto-calc cenários: re-calcula ao mudar qualquer input
    const _cenIds = [
      'cen1Cap','cen1Aporte','cen1Taxa','cen1Anos',
      'cen2Cap','cen2Aporte','cen2Taxa','cen2Anos','cen2Active',
      'cen3Cap','cen3Aporte','cen3Taxa','cen3Anos','cen3Active',
    ];
    document.getElementById('btnCenarios')?.addEventListener('click', calcCenarios);
    _cenIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', calcCenarios);
    });
    calcCenarios();
  }

  // ── FINANCIAMENTOS ─────────────────────────────────────────────
  function renderFinanciamentos(container) {
    const fins = Store.getFinanciamentos();
    const totalDevedor = Store.totalFinanciamentosDevedor();
    const TIPO_LABEL = { imovel: 'Imóvel', veiculo: 'Veículo', pessoal: 'Pessoal', estudantil: 'Estudantil', empresarial: 'Empresarial' };
    const TIPO_COLOR = { imovel: 'var(--teal)', veiculo: 'var(--accent)', pessoal: 'var(--amber)', estudantil: 'var(--green)', empresarial: 'var(--red)' };

    // Calcular KPIs adicionais
    const totalPagoGlobal = fins.reduce((s, f) => s + Store.financiamentoTotalPago(f), 0);
    const totalJurosGlobal = fins.reduce((s, f) => s + Store.financiamentoTotalJuros(f), 0);
    const mediaJuros = fins.length > 0
      ? fins.reduce((s, f) => s + (f.taxaMensal || 0), 0) / fins.length
      : 0;
    const proxParcelaMes = fins.reduce((s, f) => {
      const k = Math.min((f.parcelasPagas || 0) + 1, f.prazo || 0);
      return s + (k > 0 ? Store.financiamentoParcelaNa(f, k) : 0);
    }, 0);

    container.innerHTML = `
<div class="page-head mb-4">
  <div>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:6px">
      <a href="#contratos" onclick="Router.navigate('contratos')" style="color:var(--text-3);text-decoration:none">Compromissos</a>
      <span style="opacity:0.5">/</span>
      <span style="color:var(--text-2)">Financiamentos</span>
    </div>
    <h1 class="page-head-title">Financiamentos</h1>
    <p class="page-head-meta">
      <span class="page-head-meta-total">imóveis, veículos e outros</span>
      <span class="page-head-meta-sep">·</span>
      <span style="color:var(--text-3)">controle de saldo devedor, juros e antecipação (SAC/Price)</span>
    </p>
  </div>
  <button class="btn-primary" id="btnAddFin">+ Novo Financiamento</button>
</div>

${fins.length > 0 ? `
<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 21h18M5 21V7l7-4 7 4v14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body"><div class="kpi-label">Saldo Devedor Total</div><div class="kpi-value red">${Utils.currency(totalDevedor)}</div><div class="kpi-sub">${fins.length} financiamento${fins.length>1?'s':''} ativo${fins.length>1?'s':''}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body"><div class="kpi-label">Parcela Mensal</div><div class="kpi-value accent">${Utils.currency(proxParcelaMes)}</div><div class="kpi-sub">soma das próximas parcelas</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16 7 22 7 22 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body"><div class="kpi-label">Total Já Pago</div><div class="kpi-value green">${Utils.currency(totalPagoGlobal)}</div><div class="kpi-sub">capital amortizado + juros pagos</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--amber);--kpi-bg:var(--amber-dim,#F59E0B18)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body"><div class="kpi-label">Média de Juros</div><div class="kpi-value" style="color:var(--amber)">${mediaJuros.toFixed(2)}% a.m.</div><div class="kpi-sub">total de juros no contrato: ${Utils.currency(totalJurosGlobal)}</div></div>
  </div>
</div>

<!-- Gráficos -->
<div class="chart-grid mb-6">
  <div class="card">
    <div class="card-header"><span class="card-title">Evolução do Saldo Devedor</span><span class="badge badge-accent">${getYear()}</span></div>
    <div class="chart-wrap"><canvas id="chartFinEvolucao" class="chart-canvas"></canvas></div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title">Amortização vs Juros — ${Utils.monthsFull[getMonth()-1]} ${getYear()}</span></div>
    <div class="chart-wrap"><canvas id="chartFinAmortJuros" class="chart-canvas"></canvas></div>
  </div>
</div>
` : ''}

${fins.length === 0
  ? `<div class="card" style="text-align:center;padding:40px;color:var(--text-4)">Nenhum financiamento cadastrado.<br><br>Clique em <strong>+ Novo Financiamento</strong> para começar.</div>`
  : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px">
    ${fins.map(f => {
      const parcelaInicial = Store.financiamentoParcelaInicial(f);
      const proxK = Math.min((f.parcelasPagas||0)+1, f.prazo||0);
      const proxParcela = proxK > 0 ? Store.financiamentoParcelaNa(f, proxK) : 0;
      const saldo = Store.financiamentoSaldoDevedor(f);
      const totalPago = Store.financiamentoTotalPago(f);
      const totalRestante = Store.financiamentoTotalRestante(f);
      const totalJuros = Store.financiamentoTotalJuros(f);
      const cet = Store.financiamentoCETAnual(f);
      const progresso = f.prazo ? ((f.parcelasPagas||0) / f.prazo) * 100 : 0;
      const cor = TIPO_COLOR[f.type] || 'var(--accent)';
      return `
    <div class="card" style="border-top:3px solid ${cor};position:relative">
      <button class="btn-icon-sm danger" style="position:absolute;top:8px;right:8px" data-del-fin="${f.id}" title="Remover">${icon('trash-2', {size:14})}</button>
      <button class="btn-icon-sm" style="position:absolute;top:8px;right:36px" data-edit-fin="${f.id}" title="Editar">${icon('pencil', {size:14})}</button>
      <div style="font-size:11px;font-weight:700;color:${cor};text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">${TIPO_LABEL[f.type] || f.type} · ${f.sistema === 'sac' ? 'SAC' : 'Price'}</div>
      <div style="font-size:16px;font-weight:700;color:var(--text-1);margin-bottom:2px">${f.label}</div>
      ${f.banco ? `<div style="font-size:11px;color:var(--text-4);margin-bottom:10px">${f.banco}</div>` : '<div style="margin-bottom:10px"></div>'}

      <div class="progress-bar" style="margin-bottom:6px"><div class="progress-fill" style="width:${progresso}%;background:${cor}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);margin-bottom:14px">
        <span>${f.parcelasPagas||0}/${f.prazo} pagas (${progresso.toFixed(0)}%)</span>
        <span>Taxa ${(f.taxaMensal||0).toFixed(2)}% a.m. · CET ${cet.toFixed(2)}% a.a.</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;font-size:12px;margin-bottom:12px">
        <div><div style="color:var(--text-4)">Próxima parcela</div><div style="font-weight:700;color:var(--text-1);font-family:var(--mono)">${Utils.currency(proxParcela)}</div></div>
        <div><div style="color:var(--text-4)">Parcela inicial</div><div style="font-weight:600;font-family:var(--mono)">${Utils.currency(parcelaInicial)}</div></div>
        <div><div style="color:var(--text-4)">Saldo devedor</div><div style="font-weight:700;color:var(--red);font-family:var(--mono)">${Utils.currency(saldo)}</div></div>
        <div><div style="color:var(--text-4)">Já pago</div><div style="font-weight:600;color:var(--green);font-family:var(--mono)">${Utils.currency(totalPago)}</div></div>
        <div><div style="color:var(--text-4)">Falta pagar (nominal)</div><div style="font-weight:600;font-family:var(--mono)">${Utils.currency(totalRestante)}</div></div>
        <div><div style="color:var(--text-4)">Total juros do contrato</div><div style="font-weight:700;color:var(--red);font-family:var(--mono)">${Utils.currency(totalJuros)}</div></div>
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn-xs" data-pagar-fin="${f.id}">+1 parcela paga</button>
        <button class="btn-xs" data-tabela-fin="${f.id}">Ver tabela</button>
        <button class="btn-xs" data-antec-fin="${f.id}">Simular antecipação</button>
        <button class="btn-xs" data-prog-fin-c="${f.id}">Programar lançamento</button>
      </div>
    </div>`;
    }).join('')}
  </div>`}`;

    const re = () => renderFinanciamentos(container);
    document.getElementById('btnAddFin')?.addEventListener('click', () => openFinanciamentoModal(null, re));

    // ── Gráficos de financiamento ──────────────────────────────
    if (fins.length > 0) {
      requestAnimationFrame(() => {
        const year = getYear(), month = getMonth();

        // Gráfico 1: Evolução do saldo devedor ao longo do ano (mês a mês)
        const labelsEv = Utils.months;
        const datasetsEv = fins.map((f, idx) => {
          const COLORS = ['#7367F0','#22C55E','#F59E0B','#3B82F6','#EC4899'];
          const values = labelsEv.map((_, mIdx) => {
            const mNum = mIdx + 1;
            // Quantas parcelas pagas até este mês do ano?
            const dataInicio = new Date((f.dataInicio || `${year}-01-01`) + 'T12:00:00');
            const mesesDecorridos = (year - dataInicio.getFullYear()) * 12 + (mNum - (dataInicio.getMonth() + 1));
            const parcelaAteM = Math.min(Math.max(0, mesesDecorridos + 1), f.prazo || 0);
            let saldo = f.valorFinanciado || 0;
            for (let k = 1; k <= parcelaAteM; k++) {
              const parcela = Store.financiamentoParcelaNa(f, k);
              const juros = saldo * ((f.taxaMensal || 0) / 100);
              const amort = parcela - juros;
              saldo = Math.max(0, saldo - amort);
            }
            return parseFloat(saldo.toFixed(2));
          });
          return { label: f.label, values, color: COLORS[idx % COLORS.length] };
        });
        const elEv = document.getElementById('chartFinEvolucao');
        if (elEv) {
          if (window._chartFinEv) window._chartFinEv.destroy();
          window._chartFinEv = Charts.Line(elEv,
            { labels: labelsEv, datasets: datasetsEv },
            { height: 220 }
          );
        }

        // Gráfico 2: Amortização vs Juros no mês atual (grouped bar por contrato)
        const labelsAJ = fins.map(f => f.label.length > 14 ? f.label.slice(0, 14) + '…' : f.label);
        const amortData = [], jurosData = [];
        fins.forEach(f => {
          const k = (f.parcelasPagas || 0) + 1;
          if (k > (f.prazo || 0)) { amortData.push(0); jurosData.push(0); return; }
          const dataInicio = new Date((f.dataInicio || `${year}-01-01`) + 'T12:00:00');
          let saldo = f.valorFinanciado || 0;
          for (let i = 1; i < k; i++) {
            const p = Store.financiamentoParcelaNa(f, i);
            const j = saldo * ((f.taxaMensal || 0) / 100);
            saldo = Math.max(0, saldo - (p - j));
          }
          const juros = parseFloat((saldo * ((f.taxaMensal || 0) / 100)).toFixed(2));
          const parcela = Store.financiamentoParcelaNa(f, k);
          const amort  = parseFloat(Math.max(0, parcela - juros).toFixed(2));
          amortData.push(amort);
          jurosData.push(juros);
        });
        const elAJ = document.getElementById('chartFinAmortJuros');
        if (elAJ && typeof Charts.GroupedBar === 'function') {
          if (window._chartFinAJ) window._chartFinAJ.destroy();
          window._chartFinAJ = Charts.GroupedBar(elAJ,
            { labels: labelsAJ, datasets: [
              { label: 'Amortização', values: amortData, color: '#22C55E' },
              { label: 'Juros',       values: jurosData, color: '#EF4444' },
            ]},
            { height: 220 }
          );
        } else if (elAJ) {
          // Fallback: bar simples empilhado
          const maxV = Math.max(...fins.map((_, i) => amortData[i] + jurosData[i]), 1);
          elAJ.parentElement.innerHTML = `
<div style="padding:16px 0">
  ${fins.map((f, i) => {
    const tot = amortData[i] + jurosData[i];
    const pctA = tot > 0 ? (amortData[i] / tot * 100) : 0;
    const pctJ = tot > 0 ? (jurosData[i] / tot * 100) : 0;
    return `<div style="margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:4px">${f.label}</div>
      <div style="display:flex;height:20px;border-radius:6px;overflow:hidden;background:var(--surface-2)">
        <div style="width:${pctA}%;background:#22C55E;display:flex;align-items:center;justify-content:center">
          ${pctA > 15 ? `<span style="font-size:10px;color:#fff;font-weight:600">${Utils.currency(amortData[i])}</span>` : ''}
        </div>
        <div style="width:${pctJ}%;background:#EF4444;display:flex;align-items:center;justify-content:center">
          ${pctJ > 15 ? `<span style="font-size:10px;color:#fff;font-weight:600">${Utils.currency(jurosData[i])}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:12px;font-size:11px;color:var(--text-3);margin-top:3px">
        <span><span style="color:#22C55E">●</span> Amort. ${Utils.currency(amortData[i])}</span>
        <span><span style="color:#EF4444">●</span> Juros ${Utils.currency(jurosData[i])}</span>
      </div>
    </div>`;
  }).join('')}
  <div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:var(--text-4)">
    <span><span style="color:#22C55E">■</span> Amortização (capital)</span>
    <span><span style="color:#EF4444">■</span> Juros</span>
  </div>
</div>`;
        }
      });
    }

    container.addEventListener('click', e => {
      const editBtn = e.target.closest('[data-edit-fin]');
      if (editBtn) { const f = fins.find(x => x.id === editBtn.dataset.editFin); if (f) openFinanciamentoModal(f, re); return; }
      const delBtn = e.target.closest('[data-del-fin]');
      if (delBtn) { if (!confirm('Remover este financiamento?')) return; Store.deleteFinanciamento(delBtn.dataset.delFin); re(); toast('Removido', 'success'); return; }
      const pagBtn = e.target.closest('[data-pagar-fin]');
      if (pagBtn) {
        const f = fins.find(x => x.id === pagBtn.dataset.pagarFin);
        if (f) { Store.updateFinanciamento(f.id, { parcelasPagas: Math.min((f.parcelasPagas||0)+1, f.prazo) }); re(); toast('Parcela contabilizada', 'success'); }
        return;
      }
      const tabBtn = e.target.closest('[data-tabela-fin]');
      if (tabBtn) { const f = fins.find(x => x.id === tabBtn.dataset.tabelaFin); if (f) _showTabelaFinanciamento(f); return; }
      const antBtn = e.target.closest('[data-antec-fin]');
      if (antBtn) { const f = fins.find(x => x.id === antBtn.dataset.antecFin); if (f) _showAntecipacaoModal(f, re); return; }
      const progBtn = e.target.closest('[data-prog-fin-c]');
      if (progBtn) { const f = fins.find(x => x.id === progBtn.dataset.progFinC); if (f) _programarParcelaFin(f, re); return; }
    });
  }

  function openFinanciamentoModal(financiamento, onSaved) {
    const isEdit = !!financiamento;
    const f = financiamento || {};
    const TIPOS = [['imovel','Imóvel'],['veiculo','Veículo'],['pessoal','Pessoal'],['estudantil','Estudantil'],['empresarial','Empresarial']];
    const hoje = new Date().toISOString().slice(0, 10);
    const html = `
<div class="form-grid">
  <div class="form-group"><label class="form-label">Tipo</label>
    <select class="form-select" id="fFNTipo">${TIPOS.map(([v,l])=>`<option value="${v}"${f.type===v?' selected':''}>${l}</option>`).join('')}</select>
  </div>
  <div class="form-group"><label class="form-label">Sistema</label>
    <select class="form-select" id="fFNSistema">
      <option value="price"${f.sistema==='price'?' selected':''}>Price (parcela fixa)</option>
      <option value="sac"${f.sistema==='sac'?' selected':''}>SAC (parcela decrescente)</option>
    </select>
  </div>
  <div class="form-group form-full"><label class="form-label">Descrição</label><input class="form-input" id="fFNLabel" placeholder="Ex.: Apto Vila Mariana" value="${f.label||''}"></div>
  <div class="form-group form-full"><label class="form-label">Banco / Credor</label><input class="form-input" id="fFNBanco" placeholder="Caixa, Itaú, Santander..." value="${f.banco||''}"></div>
  <div class="form-group"><label class="form-label">Valor financiado (R$)</label><input class="form-input" id="fFNValor" type="number" step="1000" value="${f.valorFinanciado||''}"></div>
  <div class="form-group"><label class="form-label">Taxa de juros mensal (%)</label><input class="form-input" id="fFNTaxa" type="number" step="0.01" value="${f.taxaMensal||''}" placeholder="Ex.: 0.8"></div>
  <div class="form-group"><label class="form-label">Prazo (meses)</label><input class="form-input" id="fFNPrazo" type="number" step="1" min="1" max="600" value="${f.prazo||''}" placeholder="Ex.: 360"></div>
  <div class="form-group"><label class="form-label">Parcelas já pagas</label><input class="form-input" id="fFNPagas" type="number" step="1" min="0" value="${f.parcelasPagas||0}"></div>
  <div class="form-group"><label class="form-label">Data do contrato</label><input class="form-input" id="fFNData" type="date" value="${f.dataInicio||hoje}"></div>
  <div class="form-group form-full"><label class="form-label">Observações</label><input class="form-input" id="fFNNotes" value="${f.notes||''}"></div>
</div>`;
    Modal.open(isEdit ? 'Editar Financiamento' : 'Novo Financiamento', html, () => {
      const data = {
        type:             document.getElementById('fFNTipo').value,
        sistema:          document.getElementById('fFNSistema').value,
        label:            document.getElementById('fFNLabel').value.trim(),
        banco:            document.getElementById('fFNBanco').value.trim(),
        valorFinanciado:  parseFloat(document.getElementById('fFNValor').value) || 0,
        taxaMensal:       parseFloat(document.getElementById('fFNTaxa').value) || 0,
        prazo:            parseInt(document.getElementById('fFNPrazo').value) || 0,
        parcelasPagas:    parseInt(document.getElementById('fFNPagas').value) || 0,
        dataInicio:       document.getElementById('fFNData').value,
        notes:            document.getElementById('fFNNotes').value.trim(),
      };
      if (!data.label) return toast('Informe a descrição', 'error');
      if (!data.valorFinanciado || !data.prazo) return toast('Preencha valor e prazo', 'error');
      if (isEdit) { Store.updateFinanciamento(financiamento.id, data); toast('Financiamento atualizado', 'success'); }
      else        { Store.addFinanciamento(data);                      toast('Financiamento cadastrado', 'success'); }
      Modal.close();
      if (onSaved) onSaved();
    });
  }

  function _showTabelaFinanciamento(f) {
    const n = f.prazo || 0;
    const rows = [];
    let saldo = f.valorFinanciado || 0;
    let totalJuros = 0;
    for (let k = 1; k <= n; k++) {
      const parcela = Store.financiamentoParcelaNa(f, k);
      const juros = saldo * (f.taxaMensal/100 || 0);
      const amort = parcela - juros;
      saldo = Math.max(0, saldo - amort);
      totalJuros += juros;
      if (k <= 6 || k % Math.max(1, Math.floor(n/24)) === 0 || k === n || saldo < 1) {
        rows.push({ k, parcela, juros, amort, saldo, pago: k <= (f.parcelasPagas||0) });
      }
    }
    const html = `
<div class="table-wrap" style="max-height:60vh;overflow-y:auto"><table class="data-table">
  <thead><tr><th>#</th><th class="num">Parcela</th><th class="num">Juros</th><th class="num">Amortização</th><th class="num">Saldo</th></tr></thead>
  <tbody>${rows.map(r => `
    <tr style="${r.pago?'opacity:0.5':''}">
      <td>${r.k}${r.pago?' ✓':''}</td>
      <td class="num">${Utils.currency(r.parcela)}</td>
      <td class="num negative">${Utils.currency(r.juros)}</td>
      <td class="num positive">${Utils.currency(r.amort)}</td>
      <td class="num">${Utils.currency(r.saldo)}</td>
    </tr>`).join('')}</tbody>
  <tfoot><tr><td class="fw-700">Total juros</td><td colspan="4" class="num fw-700 negative">${Utils.currency(totalJuros)}</td></tr></tfoot>
</table></div>`;
    Modal.open(`${f.label} — tabela ${f.sistema === 'sac' ? 'SAC' : 'Price'}`, html, () => Modal.close(), { okText: 'Fechar' });
  }

  function _showAntecipacaoModal(f, onDone) {
    const saldoAtual = Store.financiamentoSaldoDevedor(f);
    const html = `
<div class="form-grid">
  <div class="form-group form-full" style="background:var(--bg-elevated);border-radius:8px;padding:12px">
    <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:4px">Saldo devedor atual</div>
    <div style="font-size:20px;font-weight:800;color:var(--red);font-family:var(--mono)">${Utils.currency(saldoAtual)}</div>
  </div>
  <div class="form-group"><label class="form-label">Valor a amortizar (R$)</label><input class="form-input" id="fANValor" type="number" step="1000" value="${Math.round(saldoAtual*0.1)}"></div>
  <div class="form-group"><label class="form-label">Estratégia</label>
    <select class="form-select" id="fANEstrat">
      <option value="prazo">Reduzir prazo (manter parcela)</option>
      <option value="parcela">Reduzir parcela (manter prazo)</option>
    </select>
  </div>
</div>
<div id="anResult" style="margin-top:12px"></div>
<div style="margin-top:8px;display:flex;justify-content:flex-end"><button class="btn-secondary" id="btnAnCalc">Calcular</button></div>`;
    Modal.open(`Antecipar — ${f.label}`, html, () => Modal.close(), { okText: 'Fechar' });
    setTimeout(() => {
      const btn = document.getElementById('btnAnCalc');
      if (!btn) return;
      btn.addEventListener('click', () => {
        const v = parseFloat(document.getElementById('fANValor').value) || 0;
        const est = document.getElementById('fANEstrat').value;
        if (!v) return toast('Informe um valor', 'error');
        const r = Store.financiamentoAntecipar(f, v, est);
        const html = r.quitacao
          ? `<div class="alert-strip success"><div class="alert-text"><div class="alert-title">Quitação total!</div><div class="alert-sub">Você economiza <strong>${Utils.currency(r.jurosEconomizados)}</strong> em juros e ${r.mesesEconomizados} parcelas.</div></div></div>`
          : `<div class="alert-strip success"><div class="alert-text"><div class="alert-title">Economia da antecipação</div><div class="alert-sub">${est === 'prazo'
              ? `Reduz <strong>${r.mesesEconomizados} meses</strong> do prazo (novo total: ${r.novosMeses}). Mantém parcela em ${Utils.currency(r.novaParcela)}.`
              : `Parcela cai de ${Utils.currency(Store.financiamentoParcelaInicial(f))} para <strong>${Utils.currency(r.novaParcela)}</strong> (economia ${Utils.currency(r.reducaoParcela)}/mês).`} Você economiza <strong style="color:var(--green)">${Utils.currency(r.jurosEconomizados)}</strong> em juros.</div></div></div>`;
        document.getElementById('anResult').innerHTML = html;
      });
    }, 50);
  }

  function _programarParcelaFin(f, onDone) {
    const prox = Math.min((f.parcelasPagas||0)+1, f.prazo);
    const valor = Store.financiamentoParcelaNa(f, prox);
    const restante = f.prazo - (f.parcelasPagas||0);
    if (!valor || restante <= 0) return toast('Financiamento já quitado', 'info');
    const cat = f.type === 'imovel' ? 'moradia' : f.type === 'veiculo' ? 'transporte' : 'financeiro';
    const hoje = new Date();
    Store.addContrato({
      label: `Parcela ${f.label}`,
      kind: 'despesa', responsavel: currentPessoa(),
      category: cat, sub: 'Financiamento',
      dataInicio: hoje.toISOString().slice(0, 10),
      valorParcela: valor, parcelas: restante, entrada: 0,
      diaVencimento: hoje.getDate(), pay: 'transferencia',
      notes: `Gerado a partir do financiamento "${f.label}". Sistema ${f.sistema?.toUpperCase()}, taxa ${f.taxaMensal}% a.m.`,
      active: true,
      periodicidade: 'mensal',
    });
    toast(`Contrato de ${restante} parcelas criado`, 'success');
    if (onDone) onDone();
  }

  // ── MARKET RATES (BCB API + cache local 12h) ─────────────────────
  const MarketRates = (() => {
    const CACHE_KEY = 'ff_market_rates';
    const TTL_MS = 12 * 60 * 60 * 1000;

    async function _fetchBCB(serie) {
      const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/1?formato=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`BCB ${serie} ${res.status}`);
      const arr = await res.json();
      return parseFloat(String(arr[0].valor).replace(',', '.'));
    }

    function _poupanca(selicAnual) {
      // Regra: SELIC > 8.5% a.a. → poupança = 6.17% a.a. (0.5% am) + TR (~0)
      //        SELIC ≤ 8.5% a.a. → poupança = 70% Meta SELIC + TR
      if (selicAnual > 8.5) return 6.17;
      return selicAnual * 0.7;
    }

    function _read() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const c = JSON.parse(raw);
        if (Date.now() - c.ts > TTL_MS) return null;
        return c.data;
      } catch { return null; }
    }

    async function get() {
      const cached = _read();
      if (cached) return cached;
      try {
        const [selic, cdiDiario] = await Promise.all([
          _fetchBCB(1178), // SELIC anualizada (Meta Selic % a.a.)
          _fetchBCB(12),   // CDI diário (% ao dia)
        ]);
        // Anualizar CDI: (1 + diario/100)^252 - 1
        const cdiAnual = (Math.pow(1 + cdiDiario / 100, 252) - 1) * 100;
        const data = {
          selic, cdi: cdiAnual, poupanca: _poupanca(selic),
          fetchedAt: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        return data;
      } catch (e) {
        console.warn('MarketRates: falha BCB, usando fallback', e);
        return { selic: 14.75, cdi: 14.65, poupanca: 6.17, fetchedAt: Date.now(), fallback: true };
      }
    }

    return { get };
  })();

  // Helpers financeiros
  function annualToMonthly(annualPct) {
    return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
  }
  // PMT para acumular FV em n meses à taxa i (mensal). FV = PMT * ((1+i)^n - 1) / i
  function pmtForFV(fv, i, n) {
    if (i === 0) return fv / n;
    return fv * i / (Math.pow(1 + i, n) - 1);
  }
  // n meses para acumular FV com PMT à taxa i
  function nForFV(fv, pmt, i) {
    if (i === 0) return Math.ceil(fv / pmt);
    return Math.ceil(Math.log(1 + fv * i / pmt) / Math.log(1 + i));
  }

  // ── SIMULAÇÕES ──────────────────────────────────────────────────
  function renderSimulacoes(container) {
    const saldo  = Store.sumReceitas(getMonth(), getYear()) - Store.sumDespesas(getMonth(), getYear());
    const patrimonio = Store.totalAtivos();

    const _embed = window._simEmbedded;
    const _filter = window._simBucketFilter || null;
    const _allTabs = [
      { k: 'viagem',      label: 'Viagem' },
      { k: 'reserva',     label: 'Reserva Emergência' },
      { k: 'compra',      label: 'Compra: à vista vs parcelado' },
      { k: 'juros',       label: 'Juros Compostos' },
      { k: 'amortizacao', label: 'Amortização SAC' },
      { k: 'fire',        label: 'FIRE / Independência' },
      { k: 'meta',        label: 'Simulador de Meta' },
    ];
    const _tabs = _filter ? _allTabs.filter(t => _filter.includes(t.k)) : _allTabs;
    const _firstTab = _tabs[0]?.k || 'viagem';

    container.innerHTML = `
${_embed ? '' : `<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">Simulações</h1>
    <p class="page-head-meta">
      <span class="page-head-meta-total">cenários financeiros</span>
      <span class="page-head-meta-sep">·</span>
      <span style="color:var(--text-3)">baseado nos seus dados reais</span>
    </p>
  </div>
</div>`}

<!-- HEADER DE TAXAS (BCB) -->
<div class="rates-strip card mb-6" id="ratesStrip">
  <div class="rates-loading" style="padding:14px;font-size:12px;color:var(--text-3)">Carregando taxas de referência…</div>
</div>

<!-- TABS (filtradas se embeddado em renderSimulador) -->
<div class="tabs mb-6" id="simTabs">
  ${_tabs.map((t, i) => `<button class="tab${i === 0 ? ' active' : ''}" data-sim="${t.k}">${t.label}</button>`).join('')}
</div>

<div id="simContent"></div>`;

    // Popular header de taxas (assíncrono)
    MarketRates.get().then(rates => {
      const strip = document.getElementById('ratesStrip');
      if (!strip) return;
      const dt = new Date(rates.fetchedAt).toLocaleDateString('pt-BR');
      strip.innerHTML = `
<div style="display:flex;align-items:stretch;gap:0;flex-wrap:wrap">
  <div class="rate-item" style="flex:1;min-width:120px;padding:14px 16px;border-right:1px solid var(--border)">
    <div style="font-size:10px;font-weight:700;color:var(--text-4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">Meta SELIC</div>
    <div style="font-size:18px;font-weight:800;color:var(--accent);font-family:var(--mono)">${rates.selic.toFixed(2)}% <span style="font-size:11px;color:var(--text-3);font-weight:500">a.a.</span></div>
  </div>
  <div class="rate-item" style="flex:1;min-width:120px;padding:14px 16px;border-right:1px solid var(--border)">
    <div style="font-size:10px;font-weight:700;color:var(--text-4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">CDI</div>
    <div style="font-size:18px;font-weight:800;color:var(--accent);font-family:var(--mono)">${rates.cdi.toFixed(2)}% <span style="font-size:11px;color:var(--text-3);font-weight:500">a.a.</span></div>
  </div>
  <div class="rate-item" style="flex:1;min-width:120px;padding:14px 16px;border-right:1px solid var(--border)">
    <div style="font-size:10px;font-weight:700;color:var(--text-4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">Poupança</div>
    <div style="font-size:18px;font-weight:800;color:var(--text-2);font-family:var(--mono)">${rates.poupanca.toFixed(2)}% <span style="font-size:11px;color:var(--text-3);font-weight:500">a.a.</span></div>
  </div>
  <div class="rate-item" style="flex:2;min-width:240px;padding:14px 16px">
    <div style="font-size:10px;font-weight:700;color:var(--text-4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Referência de produtos de renda fixa</div>
    <div style="font-size:12px;color:var(--text-2);line-height:1.5">
      <strong>CDB</strong> 90-110% CDI · <strong>LCI/LCA</strong> 85-95% CDI (isento IR) · <strong>Tesouro Selic</strong> ~SELIC
    </div>
  </div>
</div>
<div style="padding:8px 16px;font-size:10px;color:var(--text-4);border-top:1px solid var(--border);background:var(--bg-elevated)">
  ${rates.fallback ? '⚠️ Fonte BCB indisponível — usando valores de referência fixos.' : `Fonte: Banco Central do Brasil · atualizado ${dt}`}
</div>`;
    });

    // Auto-calc helper: fires btn click immediately + on any input/change
    function autoCalc(inputIds, btnId) {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.click();
      inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => btn.click());
      });
    }

    function renderJuros() {
      document.getElementById('simContent').innerHTML = `
<div class="chart-grid" style="grid-template-columns:380px 1fr;align-items:start">
  <div class="card">
    <div class="card-header"><span class="card-title">Parâmetros</span></div>
    <div class="form-grid" style="grid-template-columns:1fr">
      <div class="form-group">
        <label class="form-label">Capital Inicial (R$)</label>
        <input class="form-input" id="jCapital" type="number" value="${Math.max(patrimonio,1000).toFixed(0)}" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Aporte Mensal (R$)</label>
        <input class="form-input" id="jAporte" type="number" value="${Math.max(saldo,0).toFixed(0)}" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Taxa de Juros ao Mês (%)</label>
        <input class="form-input" id="jTaxa" type="number" value="1.0" step="0.01" min="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">Período (meses)</label>
        <input class="form-input" id="jMeses" type="number" value="120" min="1" max="600">
      </div>
      <div class="form-group">
        <label class="form-label">Imposto de Renda (%)</label>
        <input class="form-input" id="jIR" type="number" value="15" min="0" max="30">
      </div>
    </div>
    <button class="btn-primary w-full" style="margin-top:16px;display:none" id="btnCalcJuros">Calcular</button>
  </div>
  <div id="jResult" class="card" style="display:none">
    <div class="card-header"><span class="card-title">Resultado</span></div>
    <div id="jResultBody"></div>
    <div class="chart-wrap" style="margin-top:16px"><canvas id="chartJuros" class="chart-canvas" height="220"></canvas></div>
  </div>
</div>`;
      document.getElementById('btnCalcJuros').addEventListener('click', () => {
        const C = parseFloat(document.getElementById('jCapital').value) || 0;
        const A = parseFloat(document.getElementById('jAporte').value) || 0;
        const i = (parseFloat(document.getElementById('jTaxa').value) || 1) / 100;
        const n = parseInt(document.getElementById('jMeses').value) || 120;
        const ir = (parseFloat(document.getElementById('jIR').value) || 15) / 100;
        // Compound growth month by month
        let saldoAcc = C, totalAportado = C;
        const labels = [], dataAcc = [], dataAport = [];
        for (let m = 1; m <= n; m++) {
          saldoAcc = saldoAcc * (1 + i) + A;
          totalAportado += A;
          if (m % Math.max(1, Math.floor(n/24)) === 0 || m === n) {
            labels.push(`${m}m`);
            dataAcc.push(parseFloat(saldoAcc.toFixed(2)));
            dataAport.push(parseFloat(totalAportado.toFixed(2)));
          }
        }
        const rendimentoBruto = saldoAcc - totalAportado;
        const rendimentoLiq = rendimentoBruto * (1 - ir);
        const totalLiq = totalAportado + rendimentoLiq;
        document.getElementById('jResult').style.display = '';
        document.getElementById('jResultBody').innerHTML = `
<div class="kpi-grid" style="grid-template-columns:1fr 1fr;gap:12px;margin-bottom:0">
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Montante Bruto</div><div class="kpi-value green">${Utils.currency(saldoAcc)}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Montante Líquido (após IR)</div><div class="kpi-value accent">${Utils.currency(totalLiq)}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--teal);--kpi-bg:var(--teal-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Total Aportado</div><div class="kpi-value" style="color:var(--teal)">${Utils.currency(totalAportado)}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--amber);--kpi-bg:var(--amber-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Rendimento Líquido</div><div class="kpi-value" style="color:var(--amber)">${Utils.currency(rendimentoLiq)}</div></div>
  </div>
</div>`;
        if (window._chartJuros) window._chartJuros.destroy();
        window._chartJuros = Charts.Line(document.getElementById('chartJuros'),
          { labels, datasets: [
            { label: 'Montante', values: dataAcc, color: '#7367F0', fill: true },
            { label: 'Aportado', values: dataAport, color: '#22C55E', dashed: true },
          ]}, { height: 220 });
      });
      autoCalc(['jCapital','jAporte','jTaxa','jMeses','jIR'], 'btnCalcJuros');
    }

    function renderAmortizacao() {
      document.getElementById('simContent').innerHTML = `
<div class="chart-grid" style="grid-template-columns:380px 1fr;align-items:start">
  <div class="card">
    <div class="card-header"><span class="card-title">Parâmetros do Financiamento</span></div>
    <div class="form-grid" style="grid-template-columns:1fr">
      <div class="form-group">
        <label class="form-label">Valor Financiado (R$)</label>
        <input class="form-input" id="aValor" type="number" value="300000" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">Taxa de Juros ao Mês (%)</label>
        <input class="form-input" id="aTaxa" type="number" value="0.8" step="0.01" min="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">Prazo (meses)</label>
        <input class="form-input" id="aPrazo" type="number" value="360" min="1" max="600">
      </div>
      <div class="form-group">
        <label class="form-label">Amortização Extra Mensal (R$)</label>
        <input class="form-input" id="aExtra" type="number" value="0" min="0">
      </div>
    </div>
    <button class="btn-primary w-full" style="margin-top:16px;display:none" id="btnCalcAmort">Calcular</button>
  </div>
  <div id="aResult" class="card" style="display:none">
    <div class="card-header"><span class="card-title">Simulação de Empréstimo / SAC</span></div>
    <div id="aResultBody"></div>
    <div class="chart-wrap" style="margin-top:16px"><canvas id="chartAmortSaldo" class="chart-canvas" height="200"></canvas></div>
  </div>
</div>`;
      document.getElementById('btnCalcAmort').addEventListener('click', () => {
        const PV = parseFloat(document.getElementById('aValor').value) || 300000;
        const i  = (parseFloat(document.getElementById('aTaxa').value) || 0.8) / 100;
        const n  = parseInt(document.getElementById('aPrazo').value) || 360;
        const extra = parseFloat(document.getElementById('aExtra').value) || 0;
        const amortBase = PV / n;
        let saldoD = PV, totalJuros = 0, mes = 0;
        const rows = [];
        // Para o gráfico: coleta todos os meses
        const chartLabels = [], chartSaldo = [], chartJurosAcc = [];
        let jurosAcc = 0;
        while (saldoD > 0.01 && mes < n) {
          mes++;
          const juros = saldoD * i;
          const amort = Math.min(amortBase + extra, saldoD);
          const parcela = juros + amort;
          saldoD = Math.max(0, saldoD - amort);
          totalJuros += juros;
          jurosAcc += juros;
          if (mes <= 6 || mes % 12 === 0 || saldoD < 1) {
            rows.push({ mes, parcela, amort, juros, saldo: saldoD });
          }
          // Gráfico: a cada 3 meses (ou todos se < 36 meses)
          if (mes % Math.max(1, Math.floor(mes < 36 ? 1 : n/40)) === 0 || saldoD < 1) {
            chartLabels.push(`${mes}m`);
            chartSaldo.push(parseFloat(saldoD.toFixed(0)));
            chartJurosAcc.push(parseFloat(jurosAcc.toFixed(0)));
          }
        }
        const economiaExtra = extra > 0 ? (() => {
          let s2 = PV, j2 = 0, m2 = 0;
          const amBase2 = PV / n;
          while (s2 > 0.01 && m2 < n) { m2++; j2 += s2*i; s2 = Math.max(0,s2-amBase2); }
          return { meses: n - mes, juros: j2 - totalJuros };
        })() : null;
        document.getElementById('aResult').style.display = '';
        document.getElementById('aResultBody').innerHTML = `
<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
  <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Total de Juros</div><div class="kpi-value red">${Utils.currency(totalJuros)}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Prazo Real</div><div class="kpi-value accent">${mes} meses</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Custo Total</div><div class="kpi-value green">${Utils.currency(PV + totalJuros)}</div></div>
  </div>
</div>
${economiaExtra ? `<div class="alert-strip success mb-4"><span class="alert-icon">${Utils.icon.check}</span><div class="alert-text"><div class="alert-title">Amortização extra economiza ${Utils.currency(economiaExtra.juros)} em juros e quita ${economiaExtra.meses} meses antes</div></div></div>` : ''}
<div class="table-wrap"><table class="data-table">
  <thead><tr><th>Mês</th><th class="num">Parcela</th><th class="num">Amortização</th><th class="num">Juros</th><th class="num">Saldo</th></tr></thead>
  <tbody>${rows.map(r => `<tr><td>${r.mes}</td><td class="num">${Utils.currency(r.parcela)}</td><td class="num">${Utils.currency(r.amort)}</td><td class="num negative">${Utils.currency(r.juros)}</td><td class="num">${Utils.currency(r.saldo)}</td></tr>`).join('')}</tbody>
</table></div>`;
        // Gráfico de evolução do saldo devedor
        if (window._chartAmortSaldo) window._chartAmortSaldo.destroy();
        window._chartAmortSaldo = Charts.Line(document.getElementById('chartAmortSaldo'), {
          labels: chartLabels,
          datasets: [
            { label: 'Saldo Devedor', values: chartSaldo, color: '#EF4444', fill: true },
            { label: 'Juros Acumulados', values: chartJurosAcc, color: '#F59E0B', dashed: true },
          ],
        }, { height: 200 });
      });
      autoCalc(['aValor','aTaxa','aPrazo','aExtra'], 'btnCalcAmort');
    }

    function renderFIRE() {
      const totalInv = Store.totalAtivos();
      document.getElementById('simContent').innerHTML = `
<div class="chart-grid" style="grid-template-columns:380px 1fr;align-items:start">
  <div class="card">
    <div class="card-header"><span class="card-title">Minha Situação</span></div>
    <div class="form-grid" style="grid-template-columns:1fr">
      <div class="form-group">
        <label class="form-label">Patrimônio Atual (R$)</label>
        <input class="form-input" id="fPatrim" type="number" value="${Math.max(totalInv,0).toFixed(0)}">
      </div>
      <div class="form-group">
        <label class="form-label">Poupança Mensal (R$)</label>
        <input class="form-input" id="fPoupanca" type="number" value="${Math.max(saldo,0).toFixed(0)}">
      </div>
      <div class="form-group">
        <label class="form-label">Despesa Mensal Desejada na IF (R$)</label>
        <input class="form-input" id="fDespesa" type="number" value="${Store.sumDespesas(getMonth(),getYear()).toFixed(0)}">
      </div>
      <div class="form-group">
        <label class="form-label">Retorno Real Anual (%)</label>
        <input class="form-input" id="fRetorno" type="number" value="6" step="0.5">
        <span class="form-hint">Retorno após inflação. IPCA histórico ~4%, CDI ~10%.</span>
      </div>
      <div class="form-group">
        <label class="form-label">Regra de Retirada (%/ano)</label>
        <input class="form-input" id="fSWR" type="number" value="4" step="0.5">
        <span class="form-hint">4% = Regra dos 25x (Trinity Study). 3% = mais conservador.</span>
      </div>
    </div>
    <button class="btn-primary w-full" style="margin-top:16px;display:none" id="btnCalcFIRE">Calcular</button>
  </div>
  <div id="fResult" class="card" style="display:none">
    <div class="card-header"><span class="card-title">Resultado FIRE</span></div>
    <div id="fResultBody"></div>
    <div class="chart-wrap" style="margin-top:16px"><canvas id="chartFIRE" class="chart-canvas" height="200"></canvas></div>
  </div>
</div>`;
      document.getElementById('btnCalcFIRE').addEventListener('click', () => {
        const P0   = parseFloat(document.getElementById('fPatrim').value) || 0;
        const aporte = parseFloat(document.getElementById('fPoupanca').value) || 0;
        const despIF = parseFloat(document.getElementById('fDespesa').value) || 5000;
        const r    = (parseFloat(document.getElementById('fRetorno').value) || 6) / 100;
        const swr  = (parseFloat(document.getElementById('fSWR').value) || 4) / 100;
        const alvo = despIF * 12 / swr;
        const iMes = Math.pow(1 + r, 1/12) - 1;
        let saldoF = P0, meses = 0;
        const labels = [], data = [];
        while (saldoF < alvo && meses < 600) {
          meses++;
          saldoF = saldoF * (1 + iMes) + aporte;
          if (meses % 12 === 0) { labels.push(`Ano ${meses/12}`); data.push(parseFloat(saldoF.toFixed(0))); }
        }
        const anos = Math.floor(meses/12), mesesRest = meses % 12;
        const anoAtingimento = new Date().getFullYear() + anos;
        document.getElementById('fResult').style.display = '';
        document.getElementById('fResultBody').innerHTML = `
<div class="kpi-grid" style="grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Patrimônio Alvo (${(swr*100).toFixed(0)}% SWR)</div><div class="kpi-value accent">${Utils.currency(alvo)}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Prazo para IF</div><div class="kpi-value green">${anos} anos ${mesesRest > 0 ? mesesRest+'m' : ''}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--blue);--kpi-bg:var(--blue-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Ano de Atingimento</div><div class="kpi-value" style="color:var(--blue)">${meses < 600 ? anoAtingimento : '> '+anoAtingimento}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--teal);--kpi-bg:var(--teal-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Renda Mensal Passiva</div><div class="kpi-value" style="color:var(--teal)">${Utils.currency(despIF)}</div></div>
  </div>
</div>`;
        if (window._chartFIRE) window._chartFIRE.destroy();
        window._chartFIRE = Charts.Line(document.getElementById('chartFIRE'),
          { labels, datasets: [
            { label: 'Patrimônio', values: data, color: '#7367F0', fill: true },
            { label: 'Alvo', values: Array(labels.length).fill(alvo), color: '#22C55E', dashed: true },
          ]}, { height: 200 });
      });
      autoCalc(['fPatrim','fPoupanca','fDespesa','fRetorno','fSWR'], 'btnCalcFIRE');
    }

    function renderMetaSim() {
      document.getElementById('simContent').innerHTML = `
<div class="chart-grid" style="grid-template-columns:380px 1fr;align-items:start">
  <div class="card">
    <div class="card-header"><span class="card-title">Simular Meta</span></div>
    <div class="form-grid" style="grid-template-columns:1fr">
      <div class="form-group">
        <label class="form-label">Descrição da Meta</label>
        <input class="form-input" id="mDesc" type="text" placeholder="Ex: Viagem para Europa, Casa própria…">
      </div>
      <div class="form-group">
        <label class="form-label">Valor Necessário (R$)</label>
        <input class="form-input" id="mValor" type="number" value="30000" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">Já tenho guardado (R$)</label>
        <input class="form-input" id="mJaTenho" type="number" value="0" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Consigo poupar por mês (R$)</label>
        <input class="form-input" id="mAporte" type="number" value="${Math.max(saldo*0.5,0).toFixed(0)}" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Rendimento mensal (%)</label>
        <input class="form-input" id="mTaxa" type="number" value="1.0" step="0.01" min="0">
      </div>
    </div>
    <button class="btn-primary w-full" style="margin-top:16px;display:none" id="btnCalcMeta">Calcular</button>
  </div>
  <div id="mResult" class="card" style="display:none">
    <div id="mResultBody"></div>
    <div class="chart-wrap" style="margin-top:16px"><canvas id="chartMeta" class="chart-canvas" height="200"></canvas></div>
  </div>
</div>`;
      document.getElementById('btnCalcMeta').addEventListener('click', () => {
        const desc  = document.getElementById('mDesc').value || 'Meta';
        const alvo  = parseFloat(document.getElementById('mValor').value) || 30000;
        const base  = parseFloat(document.getElementById('mJaTenho').value) || 0;
        const aporte = parseFloat(document.getElementById('mAporte').value) || 1000;
        const i    = (parseFloat(document.getElementById('mTaxa').value) || 1) / 100;
        let s = base, meses = 0;
        const labels = [], data = [];
        while (s < alvo && meses < 600) {
          meses++;
          s = s * (1 + i) + aporte;
          labels.push(`${meses}m`);
          data.push(parseFloat(Math.min(s, alvo * 1.05).toFixed(0)));
        }
        const anos = Math.floor(meses/12), mr = meses % 12;
        const prazoTexto = anos > 0 ? `${anos} ano${anos>1?'s':''} e ${mr} mês${mr>1?'es':''}` : `${meses} meses`;
        const atingimento = new Date(); atingimento.setMonth(atingimento.getMonth() + meses);
        const dtFmt = atingimento.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        document.getElementById('mResult').style.display = '';
        document.getElementById('mResultBody').innerHTML = `
<div class="card-header"><span class="card-title">${desc}</span></div>
<div class="kpi-grid" style="grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Prazo</div><div class="kpi-value accent">${meses < 600 ? prazoTexto : 'Não atingível'}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Previsão de Conclusão</div><div class="kpi-value green" style="font-size:15px">${meses < 600 ? dtFmt : '—'}</div></div>
  </div>
</div>
<div class="progress-bar progress-lg mb-4" style="margin-top:4px"><div class="progress-fill" style="width:${Math.min((base/alvo)*100,100).toFixed(1)}%;background:var(--accent)"></div></div>
<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);margin-bottom:16px">
  <span>Já guardado: ${Utils.currency(base)}</span><span>Alvo: ${Utils.currency(alvo)}</span>
</div>`;
        if (window._chartMeta) window._chartMeta.destroy();
        const step = Math.max(1, Math.floor(meses/24));
        const lFiltered = labels.filter((_,idx) => idx % step === 0 || idx === labels.length-1);
        const dFiltered = data.filter((_,idx) => idx % step === 0 || idx === data.length-1);
        window._chartMeta = Charts.Line(document.getElementById('chartMeta'),
          { labels: lFiltered, datasets: [
            { label: 'Acumulado', values: dFiltered, color: '#7367F0', fill: true },
            { label: 'Alvo', values: Array(lFiltered.length).fill(alvo), color: '#22C55E', dashed: true },
          ]}, { height: 200 });
      });
      autoCalc(['mDesc','mValor','mJaTenho','mAporte','mTaxa'], 'btnCalcMeta');
    }

    // ── helper compartilhado: aplicar conversões ───────────────────
    function _gerarMetaELancamento(opts) {
      // opts: { titulo, valorAlvo, prazoMeses, aporteMensal, taxaUsadaPct }
      const dataAlvo = (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + opts.prazoMeses);
        return d.toISOString().slice(0, 10);
      })();
      const html = `
        <div class="form-grid" style="grid-template-columns:1fr">
          <div class="form-group">
            <label class="form-label">Salvar como…</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-2)"><input type="checkbox" id="cnvMeta" checked> Meta (acompanhamento)</label>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-2)"><input type="checkbox" id="cnvLanc" checked> Aporte programado mensal</label>
            </div>
          </div>
          <div class="form-group"><label class="form-label">Título</label><input class="form-input" id="cnvTitulo" value="${opts.titulo}"></div>
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group"><label class="form-label">Valor alvo (R$)</label><input class="form-input" id="cnvAlvo" type="number" value="${opts.valorAlvo.toFixed(2)}" step="0.01"></div>
            <div class="form-group"><label class="form-label">Aporte mensal (R$)</label><input class="form-input" id="cnvAporte" type="number" value="${opts.aporteMensal.toFixed(2)}" step="0.01"></div>
          </div>
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group"><label class="form-label">Data alvo</label><input class="form-input" id="cnvData" type="date" value="${dataAlvo}"></div>
            <div class="form-group"><label class="form-label">Categoria do aporte</label>
              <select class="form-input" id="cnvCat"><option value="financeiro">Desp. Financeiras</option><option value="pessoal">Pessoal</option><option value="lazer">Lazer</option></select>
            </div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-3);margin-top:8px">Aporte considera ${opts.taxaUsadaPct}% a.a. — você pode ajustar valores antes de salvar.</div>`;
      Modal.open('Converter simulação em ações', html, () => {
        const fazerMeta = document.getElementById('cnvMeta').checked;
        const fazerLanc = document.getElementById('cnvLanc').checked;
        const titulo   = document.getElementById('cnvTitulo').value.trim() || opts.titulo;
        const alvo     = parseFloat(document.getElementById('cnvAlvo').value) || opts.valorAlvo;
        const aporte   = parseFloat(document.getElementById('cnvAporte').value) || opts.aporteMensal;
        const data     = document.getElementById('cnvData').value || dataAlvo;
        const cat      = document.getElementById('cnvCat').value;
        if (!fazerMeta && !fazerLanc) return toast('Selecione ao menos uma opção', 'error');
        if (fazerMeta) {
          Store.get().metas.push({
            id: '_' + Date.now(),
            label: titulo, type: 'objetivo', period: 'pontual',
            target: alvo, deadline: data, atual: 0,
            origem: 'simulacao',
          });
          Store.persist();
        }
        if (fazerLanc) {
          const hoje = new Date().toISOString().slice(0, 10);
          Store.addContrato({
            label: `Aporte — ${titulo}`,
            kind: 'despesa',
            responsavel: currentPessoa(),
            category: cat,
            sub: 'Aporte programado',
            dataInicio: hoje,
            dataFim: data,
            valorParcela: aporte,
            parcelas: opts.prazoMeses,
            entrada: 0,
            diaVencimento: new Date().getDate(),
            pay: 'transferencia',
            notes: `Aporte gerado pela Simulação. Alvo: ${Utils.currency(alvo)} em ${opts.prazoMeses} meses.`,
            active: true,
          });
        }
        Modal.close();
        toast(`${fazerMeta && fazerLanc ? 'Meta + aporte criados' : fazerMeta ? 'Meta criada' : 'Aporte programado'}`, 'success');
      });
    }

    // ── VIAGEM ─────────────────────────────────────────────────────
    function renderViagem() {
      const hoje = new Date();
      const futuro = new Date(hoje); futuro.setMonth(futuro.getMonth() + 12);
      const dataAlvoDefault = futuro.toISOString().slice(0, 10);
      const reservaTotal = Store.totalAtivos();
      document.getElementById('simContent').innerHTML = `
<div class="chart-grid" style="grid-template-columns:380px 1fr;align-items:start">
  <div class="card">
    <div class="card-header"><span class="card-title">Planejar viagem</span></div>
    <div class="form-grid" style="grid-template-columns:1fr">
      <div class="form-group"><label class="form-label">Destino</label><input class="form-input" id="vDestino" placeholder="Ex.: Bariloche em julho" value="Próxima viagem"></div>
      <div class="form-group"><label class="form-label">Custo total estimado (R$)</label><input class="form-input" id="vCusto" type="number" value="8000" step="100" min="100"></div>
      <div class="form-group"><label class="form-label">Data alvo</label><input class="form-input" id="vData" type="date" value="${dataAlvoDefault}"></div>
      <div class="form-group"><label class="form-label">Aplicação</label>
        <select class="form-input" id="vTaxa">
          <option value="cdi100">CDB 100% CDI</option>
          <option value="cdi110">CDB 110% CDI (premium)</option>
          <option value="cdi90">LCI/LCA 90% CDI (isento IR)</option>
          <option value="selic">Tesouro Selic</option>
          <option value="poup">Poupança</option>
        </select>
      </div>
      ${reservaTotal > 0 ? `
      <div class="form-group" style="background:var(--bg-elevated);border-radius:8px;padding:12px;border-left:3px solid var(--accent)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <label class="form-label" style="margin-bottom:0">Usar parte da reserva</label>
          <span style="font-size:12px;color:var(--text-3);font-family:var(--mono)">disponível: <strong style="color:var(--accent)">${Utils.currency(reservaTotal)}</strong></span>
        </div>
        <input class="form-input" id="vUsarReserva" type="range" min="0" max="${Math.floor(reservaTotal)}" value="0" step="100" style="padding:0">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);margin-top:4px;font-family:var(--mono)">
          <span>R$ 0</span><span id="vUsarReservaVal" style="font-weight:700;color:var(--text-1)">R$ 0,00</span><span>${Utils.currency(reservaTotal)}</span>
        </div>
      </div>` : ''}
    </div>
    <button class="btn-primary w-full" style="margin-top:16px" id="btnCalcViagem">Calcular aporte mensal</button>
  </div>
  <div id="vResult" class="card" style="display:none">
    <div class="card-header"><span class="card-title">Resultado</span></div>
    <div id="vResultBody"></div>
  </div>
</div>`;
      // Atualização viva do label do slider
      const slider = document.getElementById('vUsarReserva');
      if (slider) {
        slider.addEventListener('input', () => {
          document.getElementById('vUsarReservaVal').textContent = Utils.currency(parseFloat(slider.value) || 0);
        });
      }

      document.getElementById('btnCalcViagem').addEventListener('click', async () => {
        const destino = document.getElementById('vDestino').value.trim() || 'Viagem';
        const fv      = parseFloat(document.getElementById('vCusto').value) || 0;
        const data    = document.getElementById('vData').value;
        const opcao   = document.getElementById('vTaxa').value;
        const reservaUsada = parseFloat(document.getElementById('vUsarReserva')?.value) || 0;
        if (!fv || !data) return toast('Preencha custo e data', 'error');
        const dAlvo = new Date(data);
        const hojeD = new Date();
        const meses = Math.max(1, Math.round((dAlvo - hojeD) / (30.44 * 24 * 3600 * 1000)));

        const rates = await MarketRates.get();
        const taxasAnuais = {
          cdi100: rates.cdi, cdi110: rates.cdi * 1.10, cdi90: rates.cdi * 0.90,
          selic:  rates.selic, poup: rates.poupanca,
        };
        const taxaAnual = taxasAnuais[opcao];
        const i = annualToMonthly(taxaAnual);

        // Cenário A: só aportes (sem reserva)
        const pmtA = pmtForFV(fv, i, meses);
        const totalAportadoA = pmtA * meses;

        // Cenário B: usa parte da reserva + aportes do resto
        const capitalCresce = reservaUsada * Math.pow(1 + i, meses);
        const faltaFV = Math.max(0, fv - capitalCresce);
        const pmtB = faltaFV > 0 ? pmtForFV(faltaFV, i, meses) : 0;
        const totalAportadoB = pmtB * meses;

        // Custo de oportunidade: a reserva, se ficasse rendendo, teria virado capitalCresce
        const oportunidadePerdida = capitalCresce - reservaUsada;
        // Economia em aportes (cenário B vs A) — comparação em valor nominal
        const economiaAportes = totalAportadoA - totalAportadoB - reservaUsada;

        // Projeção do cenário escolhido (B se reservaUsada > 0, senão A)
        const pmtEscolhido = reservaUsada > 0 ? pmtB : pmtA;
        let acc = reservaUsada; const rows = [];
        for (let m = 1; m <= meses; m++) {
          acc = acc * (1 + i) + pmtEscolhido;
          rows.push({ m, aporte: pmtEscolhido, acc });
        }

        document.getElementById('vResult').style.display = '';
        const usandoReserva = reservaUsada > 0;
        document.getElementById('vResultBody').innerHTML = `
<div class="kpi-grid" style="grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Aporte mensal</div><div class="kpi-value accent" style="font-size:22px">${Utils.currency(pmtEscolhido)}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--teal);--kpi-bg:var(--teal-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Total aportado</div><div class="kpi-value" style="color:var(--teal);font-size:18px">${Utils.currency(pmtEscolhido * meses)}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Rendimento</div><div class="kpi-value green" style="font-size:18px">${Utils.currency(fv - pmtEscolhido*meses - reservaUsada)}</div></div>
  </div>
</div>
<div style="font-size:13px;color:var(--text-2);margin-bottom:14px">
  Em <strong>${meses} meses</strong> com <strong>${taxaAnual.toFixed(2)}% a.a.</strong>${usandoReserva ? ` usando <strong>${Utils.currency(reservaUsada)}</strong> da reserva` : ''} você acumula <strong>${Utils.currency(fv)}</strong>.
</div>

${usandoReserva ? `
<div style="background:var(--bg-elevated);border-radius:8px;padding:14px;margin-bottom:14px">
  <div style="font-size:12px;color:var(--text-3);margin-bottom:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:700">Comparação: usar reserva vs aporte total</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div>
      <div style="font-size:11px;color:var(--text-4);margin-bottom:4px">Sem usar reserva</div>
      <div style="font-size:16px;font-weight:700;color:var(--text-1);font-family:var(--mono)">${Utils.currency(pmtA)}/mês</div>
      <div style="font-size:11px;color:var(--text-3)">Reserva continua rendendo</div>
    </div>
    <div>
      <div style="font-size:11px;color:var(--text-4);margin-bottom:4px">Usando ${Utils.currency(reservaUsada)}</div>
      <div style="font-size:16px;font-weight:700;color:var(--accent);font-family:var(--mono)">${Utils.currency(pmtB)}/mês</div>
      <div style="font-size:11px;color:var(--text-3)">Aporte cai ${Utils.currency(pmtA - pmtB)}/mês</div>
    </div>
  </div>
  <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;color:var(--text-2);line-height:1.6">
    Você abre mão de <strong style="color:var(--red)">${Utils.currency(oportunidadePerdida)}</strong> que a reserva renderia, mas reduz o aporte total em <strong style="color:var(--green)">${Utils.currency((pmtA - pmtB) * meses)}</strong> ao longo dos ${meses} meses.
    ${i > 0 ? '<br><em style="color:var(--text-3)">Como o rendimento é o mesmo nos dois cenários, financeiramente é equivalente — a escolha é entre liquidez (manter reserva) e fluxo de caixa (aliviar aportes).</em>' : ''}
  </div>
</div>` : ''}

<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
  <button class="btn-primary" id="vSaveBtn">→ Converter em meta + aporte</button>
  <button class="btn-coach" id="vCoachBtn" style="padding:10px 18px">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 4.6L18.4 9.4l-4.6 1.8L12 15.8l-1.8-4.6L5.6 9.4l4.6-1.8L12 3z" fill="currentColor"/></svg>
    Consultar Coach
  </button>
</div>

<div class="table-wrap" style="max-height:260px;overflow-y:auto"><table class="data-table">
  <thead><tr><th>Mês</th><th class="num">Aporte</th><th class="num">Saldo acumulado</th></tr></thead>
  <tbody>${rows.filter((_,k) => k%Math.max(1, Math.floor(meses/12))===0 || k === meses-1).map(r => `<tr><td>${r.m}</td><td class="num">${Utils.currency(r.aporte)}</td><td class="num positive">${Utils.currency(r.acc)}</td></tr>`).join('')}</tbody>
</table></div>`;

        document.getElementById('vSaveBtn').addEventListener('click', () => {
          _gerarMetaELancamento({
            titulo: destino, valorAlvo: fv, prazoMeses: meses,
            aporteMensal: pmtEscolhido, taxaUsadaPct: taxaAnual.toFixed(2),
          });
        });
        document.getElementById('vCoachBtn').addEventListener('click', () => {
          const msg = `Simulei uma viagem: "${destino}", custo R$ ${fv.toFixed(2)} em ${meses} meses, aplicando em ${opcao} (${taxaAnual.toFixed(2)}% a.a.).
Aporte mensal sem usar reserva: R$ ${pmtA.toFixed(2)}.
${usandoReserva ? `Se eu usar R$ ${reservaUsada.toFixed(2)} da minha reserva (tenho R$ ${reservaTotal.toFixed(2)} disponível), aporte cai pra R$ ${pmtB.toFixed(2)}/mês.` : `Minha reserva total disponível é R$ ${reservaTotal.toFixed(2)}.`}
Considerando meu fluxo de caixa atual e a perda de liquidez, qual sua recomendação?`;
          window.FFCoach?.ask(msg);
        });
      });
    }

    // ── RESERVA DE EMERGÊNCIA ──────────────────────────────────────
    function renderReserva2() {
      // Média de despesas dos últimos 6 meses
      const hoje = new Date();
      let totalDesp = 0, mesesContados = 0;
      for (let k = 0; k < 6; k++) {
        const d = new Date(hoje); d.setMonth(d.getMonth() - k);
        const v = Store.sumDespesas(d.getMonth() + 1, d.getFullYear());
        if (v > 0) { totalDesp += v; mesesContados++; }
      }
      const despMedia = mesesContados ? Math.round(totalDesp / mesesContados) : 5000;
      const reservaTotal = Store.totalAtivos();

      document.getElementById('simContent').innerHTML = `
<div class="chart-grid" style="grid-template-columns:380px 1fr;align-items:start">
  <div class="card">
    <div class="card-header"><span class="card-title">Reserva de emergência</span></div>
    <div class="form-grid" style="grid-template-columns:1fr">
      <div class="form-group"><label class="form-label">Despesa mensal média (R$)</label><input class="form-input" id="rDespMes" type="number" value="${despMedia}" step="100"><div style="font-size:11px;color:var(--text-3);margin-top:4px">${mesesContados ? `Calculado dos últimos ${mesesContados} meses` : 'Sem dados — informe um valor estimado'}</div></div>
      <div class="form-group"><label class="form-label">Cobertura desejada</label>
        <select class="form-input" id="rMulti"><option value="3">3 meses (mínimo)</option><option value="6" selected>6 meses (recomendado)</option><option value="12">12 meses (conservador)</option></select>
      </div>
      <div class="form-group"><label class="form-label">Aporte mensal disponível (R$)</label><input class="form-input" id="rAporte" type="number" value="500" step="50" min="10"></div>
      <div class="form-group"><label class="form-label">Aplicação</label>
        <select class="form-input" id="rTaxa">
          <option value="cdi100" selected>CDB 100% CDI (liquidez diária)</option>
          <option value="cdi90">LCI/LCA 90% CDI (carência 90d)</option>
          <option value="selic">Tesouro Selic</option>
          <option value="poup">Poupança</option>
        </select>
      </div>
    </div>
    <button class="btn-primary w-full" style="margin-top:16px" id="btnCalcReserva">Calcular tempo até completar</button>
  </div>
  <div id="rResult" class="card" style="display:none">
    <div class="card-header"><span class="card-title">Resultado</span></div>
    <div id="rResultBody"></div>
  </div>
</div>`;
      document.getElementById('btnCalcReserva').addEventListener('click', async () => {
        const desp   = parseFloat(document.getElementById('rDespMes').value) || despMedia;
        const multi  = parseInt(document.getElementById('rMulti').value) || 6;
        const aporte = parseFloat(document.getElementById('rAporte').value) || 500;
        const opcao  = document.getElementById('rTaxa').value;
        const alvo   = desp * multi;
        const falta  = Math.max(0, alvo - reservaTotal);

        const rates = await MarketRates.get();
        const taxasAnuais = { cdi100: rates.cdi, cdi90: rates.cdi*0.9, selic: rates.selic, poup: rates.poupanca };
        const taxaAnual = taxasAnuais[opcao];
        const i = annualToMonthly(taxaAnual);
        const meses = falta > 0 ? nForFV(falta, aporte, i) : 0;

        // Projeção (a partir da reserva atual)
        let acc = reservaTotal; const rows = [];
        for (let m = 1; m <= meses; m++) { acc = acc * (1 + i) + aporte; rows.push({ m, acc }); }

        const cobertura = reservaTotal / desp;
        const jaCompleta = reservaTotal >= alvo;

        document.getElementById('rResult').style.display = '';
        document.getElementById('rResultBody').innerHTML = `
${reservaTotal > 0 ? `
<div class="alert-strip ${jaCompleta ? 'success' : 'info'} mb-4">
  <span class="alert-icon">${jaCompleta ? Utils.icon.check : Utils.icon.info}</span>
  <div class="alert-text">
    <div class="alert-title">Você já tem ${Utils.currency(reservaTotal)} guardado</div>
    <div class="alert-sub">Cobre ${cobertura.toFixed(1)} meses de despesa atual. ${jaCompleta ? 'Meta já atingida! 🎉' : `Falta ${Utils.currency(falta)} para completar ${multi} meses.`}</div>
  </div>
</div>` : ''}
<div class="kpi-grid" style="grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Valor alvo</div><div class="kpi-value accent" style="font-size:20px">${Utils.currency(alvo)}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--teal);--kpi-bg:var(--teal-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Tempo para completar</div><div class="kpi-value" style="color:var(--teal);font-size:20px">${jaCompleta ? '✓' : meses + ' meses'}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Rendimento estimado</div><div class="kpi-value green" style="font-size:18px">${Utils.currency(Math.max(0, alvo - reservaTotal - aporte*meses))}</div></div>
  </div>
</div>
<div style="font-size:13px;color:var(--text-2);margin-bottom:14px">
  ${jaCompleta
    ? `Você já tem ${cobertura.toFixed(1)} meses cobertos — pode focar em outros objetivos.`
    : `Aportando <strong>${Utils.currency(aporte)}/mês</strong> a <strong>${taxaAnual.toFixed(2)}% a.a.</strong>, você completa a reserva em <strong>~${meses} meses</strong>.`}
</div>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
  ${!jaCompleta ? `<button class="btn-primary" id="rSaveBtn">→ Converter em meta + aporte</button>` : ''}
  <button class="btn-coach" id="rCoachBtn" style="padding:10px 18px">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 4.6L18.4 9.4l-4.6 1.8L12 15.8l-1.8-4.6L5.6 9.4l4.6-1.8L12 3z" fill="currentColor"/></svg>
    Consultar Coach
  </button>
</div>
${!jaCompleta ? `<div class="table-wrap" style="max-height:260px;overflow-y:auto"><table class="data-table">
  <thead><tr><th>Mês</th><th class="num">Saldo acumulado</th></tr></thead>
  <tbody>${rows.filter((_,k) => k%Math.max(1, Math.floor(meses/12))===0 || k === meses-1).map(r => `<tr><td>${r.m}</td><td class="num positive">${Utils.currency(r.acc)}</td></tr>`).join('')}</tbody>
</table></div>` : ''}`;

        const btnSave = document.getElementById('rSaveBtn');
        if (btnSave) btnSave.addEventListener('click', () => {
          _gerarMetaELancamento({
            titulo: `Reserva de emergência (${multi} meses)`,
            valorAlvo: alvo, prazoMeses: meses, aporteMensal: aporte,
            taxaUsadaPct: taxaAnual.toFixed(2),
          });
        });
        document.getElementById('rCoachBtn').addEventListener('click', () => {
          const msg = `Estou planejando minha reserva de emergência.
Despesa mensal média: R$ ${desp.toFixed(2)} (últimos ${mesesContados || 0} meses).
Meta: cobrir ${multi} meses = R$ ${alvo.toFixed(2)}.
Reserva atual: R$ ${reservaTotal.toFixed(2)} (${cobertura.toFixed(1)} meses cobertos).
${jaCompleta ? 'Já atingi a meta — vale aumentar pra 12 meses ou direcionar pra investimentos de longo prazo?' : `Falta R$ ${falta.toFixed(2)}. Aportando R$ ${aporte.toFixed(2)}/mês a ${taxaAnual.toFixed(2)}% a.a. levaria ~${meses} meses.`}
Considerando meu cenário, qual sua recomendação?`;
          window.FFCoach?.ask(msg);
        });
      });
    }

    // ── COMPRA: à vista vs parcelado ───────────────────────────────
    function renderCompra() {
      const reservaTotal = Store.totalAtivos();
      document.getElementById('simContent').innerHTML = `
<div class="chart-grid" style="grid-template-columns:380px 1fr;align-items:start">
  <div class="card">
    <div class="card-header"><span class="card-title">Comparar opções</span></div>
    <div class="form-grid" style="grid-template-columns:1fr">
      <div class="form-group"><label class="form-label">O que você vai comprar?</label><input class="form-input" id="cDesc" placeholder="Ex.: Geladeira nova" value="Compra"></div>
      <div class="form-group"><label class="form-label">Preço à vista (R$)</label><input class="form-input" id="cVista" type="number" value="5000" step="100" min="1"></div>
      <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Valor da parcela (R$)</label><input class="form-input" id="cParc" type="number" value="500" step="10" min="1"></div>
        <div class="form-group"><label class="form-label">Nº de parcelas</label><input class="form-input" id="cQtd" type="number" value="12" min="1" max="60"></div>
      </div>
      <div class="form-group"><label class="form-label">Taxa de oportunidade (a.a.)</label>
        <select class="form-input" id="cTaxa">
          <option value="cdi100">CDB 100% CDI</option>
          <option value="cdi90">LCI/LCA 90% CDI (isento IR)</option>
          <option value="selic">Tesouro Selic</option>
          <option value="poup">Poupança</option>
        </select>
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">Onde você renderia o dinheiro se pagar à vista</div>
      </div>
      ${reservaTotal > 0 ? `
      <div class="form-group" style="background:var(--bg-elevated);border-radius:8px;padding:12px;border-left:3px solid var(--accent)">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-1);cursor:pointer">
          <input type="checkbox" id="cUsarReserva"> Usar reserva pra pagar à vista
        </label>
        <div style="font-size:11px;color:var(--text-3);margin-top:4px;font-family:var(--mono)">Reserva disponível: <strong style="color:var(--accent)">${Utils.currency(reservaTotal)}</strong></div>
      </div>` : ''}
    </div>
    <button class="btn-primary w-full" style="margin-top:16px" id="btnCalcCompra">Comparar</button>
  </div>
  <div id="cResult" class="card" style="display:none">
    <div class="card-header"><span class="card-title">Recomendação</span></div>
    <div id="cResultBody"></div>
  </div>
</div>`;

      document.getElementById('btnCalcCompra').addEventListener('click', async () => {
        const desc  = document.getElementById('cDesc').value.trim() || 'Compra';
        const vista = parseFloat(document.getElementById('cVista').value) || 0;
        const pmt   = parseFloat(document.getElementById('cParc').value) || 0;
        const n     = parseInt(document.getElementById('cQtd').value) || 0;
        const opcao = document.getElementById('cTaxa').value;
        const usarReserva = !!document.getElementById('cUsarReserva')?.checked;
        if (!vista || !pmt || !n) return toast('Preencha preço à vista, parcela e nº', 'error');
        if (usarReserva && reservaTotal < vista) {
          return toast(`Reserva insuficiente: ${Utils.currency(reservaTotal)} < ${Utils.currency(vista)}`, 'error');
        }

        const rates = await MarketRates.get();
        const taxasAnuais = { cdi100: rates.cdi, cdi90: rates.cdi*0.9, selic: rates.selic, poup: rates.poupanca };
        const taxaAnual = taxasAnuais[opcao];
        const i = annualToMonthly(taxaAnual);

        // Total nominal pago no parcelado
        const totalNominal = pmt * n;
        // Juro implícito no parcelado: encontrar j tal que vista = PMT * (1-(1+j)^-n)/j
        // Resolvemos por bissecção.
        function pvParcelado(j) {
          if (j === 0) return pmt * n;
          return pmt * (1 - Math.pow(1 + j, -n)) / j;
        }
        let lo = 0, hi = 1, mid = 0;
        for (let k = 0; k < 60; k++) {
          mid = (lo + hi) / 2;
          if (pvParcelado(mid) > vista) lo = mid; else hi = mid;
        }
        const jMensal = mid;
        const jAnual = (Math.pow(1 + jMensal, 12) - 1) * 100;

        // Valor presente das parcelas descontado pela taxa de oportunidade
        const vp = pvParcelado(i);
        const diff = vp - vista; // positivo = parcelado custa mais em VP
        const vistaMelhor = diff > 0;

        // Quanto rende se aplicar a diferença mês a mês (cenário "à vista + aplicar o que sobrou")
        // Cenário alternativo: paga à vista hoje; nos próximos n meses, em vez de parcela, aplica o pmt
        // Após n meses, terá: pmt * ((1+i)^n - 1)/i (rendimento futuro)
        const fvAplicacao = pmt * (Math.pow(1 + i, n) - 1) / i;

        document.getElementById('cResult').style.display = '';
        const corVista = vistaMelhor ? 'var(--green)' : 'var(--red)';
        const corParc  = vistaMelhor ? 'var(--red)'  : 'var(--green)';

        document.getElementById('cResultBody').innerHTML = `
<div class="alert-strip ${vistaMelhor ? 'success' : 'warning'} mb-4">
  <span class="alert-icon">${vistaMelhor ? Utils.icon.check : Utils.icon.warn}</span>
  <div class="alert-text">
    <div class="alert-title">${vistaMelhor ? 'À vista é melhor' : 'Parcelado pode valer a pena'}</div>
    <div class="alert-sub">${vistaMelhor
      ? `Valor presente do parcelado é <strong>${Utils.currency(Math.abs(diff))}</strong> maior que à vista.`
      : `Valor presente do parcelado é <strong>${Utils.currency(Math.abs(diff))}</strong> menor — o dinheiro à vista vale mais aplicado.`}</div>
  </div>
</div>

<div class="kpi-grid" style="grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
  <div class="kpi-card" style="--kpi-color:${corVista};--kpi-bg:var(--green-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">À vista (hoje)</div><div class="kpi-value" style="color:${corVista};font-size:20px">${Utils.currency(vista)}</div><div class="kpi-sub">Pago de uma vez</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:${corParc};--kpi-bg:var(--red-dim);padding:14px">
    <div class="kpi-body"><div class="kpi-label">Parcelado (total)</div><div class="kpi-value" style="color:${corParc};font-size:20px">${Utils.currency(totalNominal)}</div><div class="kpi-sub">${n}× de ${Utils.currency(pmt)}</div></div>
  </div>
</div>

<div style="background:var(--bg-elevated);border-radius:8px;padding:14px;margin-bottom:14px">
  <div style="font-size:12px;color:var(--text-3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em;font-weight:700">Decomposição</div>
  <div style="display:grid;gap:6px;font-size:13px">
    <div style="display:flex;justify-content:space-between"><span>Juros implícitos do parcelamento</span><strong>${jAnual.toFixed(2)}% a.a.</strong></div>
    <div style="display:flex;justify-content:space-between"><span>Sua taxa de oportunidade</span><strong>${taxaAnual.toFixed(2)}% a.a.</strong></div>
    <div style="display:flex;justify-content:space-between"><span>Valor presente do parcelado</span><strong>${Utils.currency(vp)}</strong></div>
    <div style="display:flex;justify-content:space-between"><span>Se pagar à vista e aplicar ${Utils.currency(pmt)}/mês por ${n}m</span><strong>${Utils.currency(fvAplicacao)} em ${n} meses</strong></div>
  </div>
</div>

${usarReserva ? `
<div style="background:var(--bg-elevated);border-radius:8px;padding:14px;margin-bottom:14px;border-left:3px solid var(--amber)">
  <div style="font-size:12px;color:var(--text-3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em;font-weight:700">Cenário: pagar à vista usando reserva</div>
  <div style="font-size:13px;color:var(--text-2);line-height:1.6">
    Sua reserva cai de <strong>${Utils.currency(reservaTotal)}</strong> para <strong>${Utils.currency(reservaTotal - vista)}</strong>.
    Você economiza <strong style="color:var(--green)">${Utils.currency(totalNominal - vista)}</strong> em juros do parcelado,
    mas abre mão de <strong style="color:var(--red)">${Utils.currency(fvAplicacao - pmt*n + (vista * (Math.pow(1+i, n) - 1)))}</strong> de rendimento que a reserva geraria nos próximos ${n} meses.
  </div>
</div>` : ''}
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
  ${vistaMelhor
    ? `<button class="btn-primary" id="cSaveMeta">→ Criar meta "Juntar ${Utils.currency(vista)} para ${desc}"</button>`
    : `<button class="btn-primary" id="cSaveContrato">→ Criar contrato com as ${n} parcelas</button>`}
  <button class="btn-coach" id="cCoachBtn" style="padding:10px 18px">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 4.6L18.4 9.4l-4.6 1.8L12 15.8l-1.8-4.6L5.6 9.4l4.6-1.8L12 3z" fill="currentColor"/></svg>
    Consultar Coach
  </button>
</div>`;

        const btnMeta = document.getElementById('cSaveMeta');
        if (btnMeta) btnMeta.addEventListener('click', () => {
          // Sugere prazo de ~6 meses como default; usuário ajusta no modal
          const sugerido = pmtForFV(vista, i, 6);
          _gerarMetaELancamento({
            titulo: `Juntar para ${desc}`,
            valorAlvo: vista, prazoMeses: 6, aporteMensal: sugerido,
            taxaUsadaPct: taxaAnual.toFixed(2),
          });
        });
        const btnCont = document.getElementById('cSaveContrato');
        if (btnCont) btnCont.addEventListener('click', () => {
          const hoje = new Date().toISOString().slice(0, 10);
          const fim = (() => { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); })();
          Store.addContrato({
            label: desc,
            kind: 'despesa',
            responsavel: currentPessoa(),
            category: 'financeiro',
            sub: 'Compra parcelada',
            dataInicio: hoje,
            dataFim: fim,
            valorParcela: pmt,
            parcelas: n,
            entrada: 0,
            diaVencimento: new Date().getDate(),
            pay: 'cartao',
            notes: `Contrato gerado pela Simulação de Compra. Total nominal: ${Utils.currency(totalNominal)}.`,
            active: true,
          });
          toast(`Contrato de ${n}× ${Utils.currency(pmt)} criado`, 'success');
        });

        document.getElementById('cCoachBtn').addEventListener('click', () => {
          const msg = `Estou em dúvida sobre uma compra: "${desc}".
À vista: R$ ${vista.toFixed(2)}. Parcelado: ${n}× R$ ${pmt.toFixed(2)} (total R$ ${totalNominal.toFixed(2)}).
Juros implícitos do parcelamento: ${jAnual.toFixed(2)}% a.a. vs minha taxa de oportunidade ${taxaAnual.toFixed(2)}% a.a.
Valor presente do parcelado: R$ ${vp.toFixed(2)} (${vistaMelhor ? 'à vista é melhor' : 'parcelado é melhor'} na minha taxa).
Reserva disponível: R$ ${reservaTotal.toFixed(2)}.
${usarReserva ? `Pensei em usar a reserva pra pagar à vista — reserva cairia pra R$ ${(reservaTotal - vista).toFixed(2)}.` : ''}
Considerando meu fluxo e liquidez, o que recomenda?`;
          window.FFCoach?.ask(msg);
        });
      });
    }

    const renders = { viagem: renderViagem, reserva: renderReserva2, compra: renderCompra, juros: renderJuros, amortizacao: renderAmortizacao, fire: renderFIRE, meta: renderMetaSim };
    renders[_firstTab]?.();

    container.querySelector('#simTabs').addEventListener('click', e => {
      const btn = e.target.closest('[data-sim]');
      if (!btn) return;
      container.querySelectorAll('#simTabs .tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      renders[btn.dataset.sim]?.();
    });
  }

  // ══════════════════════════════════════════════════════════════
  // RECADOS — localStorage store
  // ══════════════════════════════════════════════════════════════
  const Recados = {
    _key: 'ff_recados',
    getAll() {
      try { return JSON.parse(localStorage.getItem(this._key) || '[]'); } catch { return []; }
    },
    save(list) { localStorage.setItem(this._key, JSON.stringify(list)); },
    add(from, to, content, linkedId, linkedType) {
      const list = this.getAll();
      const rec = { id: Date.now() + '_' + Math.random().toString(36).slice(2,7), from, to, content, read: false, created_at: new Date().toISOString(), linked_id: linkedId || null, linked_type: linkedType || null };
      list.unshift(rec);
      this.save(list);
      return rec;
    },
    markRead(id) {
      const list = this.getAll().map(r => r.id === id ? { ...r, read: true } : r);
      this.save(list);
    },
    markAllRead(forPessoa) {
      const list = this.getAll().map(r => (r.to === forPessoa || r.to === 'Todos') && !r.read ? { ...r, read: true } : r);
      this.save(list);
    },
    delete(id) { this.save(this.getAll().filter(r => r.id !== id)); },
    unreadFor(pessoa) { return this.getAll().filter(r => (r.to === pessoa || r.to === 'Todos') && !r.read).length; },
  };

  function currentPessoa() {
    const ctx = typeof SupabaseSync !== 'undefined' ? SupabaseSync.getFamilyContext() : null;
    if (ctx?.pessoaName) return ctx.pessoaName;
    return Store.getProfile()?.name || Store.PESSOAS[0] || 'Usuário';
  }

  function _updateAnomaliasBadge(count) {
    let badge = document.getElementById('anomaliasBadge');
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
  }

  function updateReembolsosBadge() {
    const badge = document.getElementById('reembolsosBadge');
    if (!badge) return;
    const count = Store.getReembolsosPendentes().length;
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
  }

  // ══════════════════════════════════════════════════════════════
  // ROTINA DO COACH — gera recados periódicos persistidos
  // Roda em init(). Idempotente: cada recado tem routine_key único e
  // só é criado se ainda não existe. Mesmo refresh múltiplo só gera 1.
  //
  // Calendário:
  //   - Segunda          → weekly_recap (resumo da semana anterior)
  //   - Quinta           → midweek_check (check de meio de semana)
  //   - Dia 1-3 do mês   → month_open (plano do mês + retrospectiva)
  //   - Dia 25-28        → month_close (faltam X dias, onde estamos)
  //   - Eventos (sempre) → event_alert (limite estourado, anomalia, meta)
  // ══════════════════════════════════════════════════════════════
  function _isoWeekKey(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  function _addRoutineRecado(routineKey, tipo, titulo, texto) {
    const data = Store.get();
    if (!data.recados) data.recados = [];
    if (data.recados.some(r => r.routine_key === routineKey)) return false;
    data.recados.unshift({
      id: 'auto_' + routineKey,
      tipo, titulo, texto,
      data: new Date().toISOString(),
      lido: false,
      pessoa: null,
      routine_key: routineKey,
      source: 'coach_routine',
    });
    Store.persist();
    return true;
  }

  function _coachWeeklyRecap(today) {
    const wkKey = _isoWeekKey(today);
    const routineKey = `weekly_recap_${wkKey}`;
    // Calcula semana anterior (segunda passada → domingo passado)
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    const end = new Date(today);
    end.setDate(end.getDate() - 1);
    const despSemana = (Store.get().despesas || []).filter(d => {
      const dt = new Date(d.year, d.month - 1, d.day || 1);
      return dt >= start && dt <= end;
    });
    const total = despSemana.reduce((a, d) => a + d.amount, 0);
    const byCat = {};
    despSemana.forEach(d => { byCat[d.category] = (byCat[d.category] || 0) + d.amount; });
    const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    const catLine = topCat
      ? `O destaque foi ${Store.CATEGORIES[topCat[0]]?.label || topCat[0]} (${Utils.currency(topCat[1])}).`
      : '';
    const texto = total > 0
      ? `Você gastou ${Utils.currency(total)} nos últimos 7 dias em ${despSemana.length} lançamentos. ${catLine} Esta semana é um bom momento pra revisar onde reforçar.`
      : `Sem despesas registradas nos últimos 7 dias. Quer aproveitar pra organizar os lançamentos da semana?`;
    return _addRoutineRecado(routineKey, 'insight', 'Resumo da semana', texto);
  }

  function _coachMidweekCheck(today) {
    const wkKey = _isoWeekKey(today);
    const routineKey = `midweek_check_${wkKey}`;
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const anomalias = detectAnomalias(month, year);
    let titulo, texto, tipo;
    if (anomalias.length > 0) {
      const a = anomalias[0];
      titulo = `Atenção: ${a.label} fora do padrão`;
      texto = `${Utils.currency(a.current)} em ${a.label} este mês — ${Math.round(a.delta * 100)}% acima da média (${Utils.currency(a.avg)}). ${anomalias.length > 1 ? `Mais ${anomalias.length - 1} categoria(s) também merecem revisão.` : 'Vale entender o que mudou.'}`;
      tipo = 'alerta';
    } else {
      const receita = Store.sumReceitas(month, year);
      const despesa = Store.sumDespesas(month, year);
      const saldo = receita - despesa;
      titulo = 'Meio de semana — tudo no ritmo';
      texto = `Sem anomalias detectadas. Saldo do mês até agora: ${saldo >= 0 ? '+' : ''}${Utils.currency(saldo)}. Continue acompanhando seus lançamentos.`;
      tipo = 'insight';
    }
    return _addRoutineRecado(routineKey, tipo, titulo, texto);
  }

  function _coachMonthOpen(today) {
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const routineKey = `month_open_${year}-${String(month).padStart(2, '0')}`;
    const prevM = month > 1 ? month - 1 : 12;
    const prevY = month > 1 ? year : year - 1;
    const prevRec = Store.sumReceitas(prevM, prevY);
    const prevDesp = Store.sumDespesas(prevM, prevY);
    const prevSaldo = prevRec - prevDesp;
    const mNome = Utils.monthsFull[month - 1];
    const mNomePrev = Utils.monthsFull[prevM - 1];
    const texto = prevRec > 0 || prevDesp > 0
      ? `${mNome} começou. Em ${mNomePrev} você teve ${Utils.currency(prevRec)} de receita, ${Utils.currency(prevDesp)} de despesa e saldo ${prevSaldo >= 0 ? '+' : ''}${Utils.currency(prevSaldo)}. ${prevSaldo > 0 ? 'Ótima base para repetir.' : 'Vamos juntos virar o jogo este mês.'}`
      : `${mNome} começou. Vamos definir as prioridades juntos? Comece registrando suas receitas e despesas fixas.`;
    return _addRoutineRecado(routineKey, 'insight', `${mNome} começou`, texto);
  }

  function _coachMonthClose(today) {
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const routineKey = `month_close_${year}-${String(month).padStart(2, '0')}`;
    const lastDay = new Date(year, month, 0).getDate();
    const remaining = lastDay - today.getDate();
    const receita = Store.sumReceitas(month, year);
    const despesa = Store.sumDespesas(month, year);
    const saldo = receita - despesa;
    const titulo = `Faltam ${remaining} dias do mês`;
    const texto = `Você está em ${Utils.currency(despesa)} de despesa e ${Utils.currency(receita)} de receita — saldo ${saldo >= 0 ? '+' : ''}${Utils.currency(saldo)}. ${saldo > 0 ? `Bom espaço pra reforçar uma meta antes de virar o mês.` : `Vale segurar gastos nos próximos ${remaining} dias pra fechar melhor.`}`;
    return _addRoutineRecado(routineKey, saldo >= 0 ? 'insight' : 'alerta', titulo, texto);
  }

  function _coachEventAlerts(today) {
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const data = Store.get();
    const receita = Store.sumReceitas(month, year);
    const despesa = Store.sumDespesas(month, year);
    const util = receita > 0 ? despesa / receita : 0;
    const limiteDespAbs = Store.getActiveLimiteDespMensal();
    const limitePct = limiteDespAbs && receita > 0 ? (limiteDespAbs / receita) : (data.settings?.limiteGasto || 0.8);
    let generated = 0;
    // Evento: limite ultrapassado no mês corrente
    if (util > limitePct) {
      const routineKey = `event_limit_${monthKey}`;
      const over = (util - limitePct) * receita;
      if (_addRoutineRecado(
        routineKey, 'alerta', 'Limite de gastos ultrapassado',
        `Você passou ${Utils.currency(over)} acima do limite de ${Utils.pct(limitePct)} este mês. Vamos juntos identificar onde ajustar?`
      )) generated++;
    }
    // Evento: meta de objetivo atingida (≥100%)
    (data.metas || []).filter(m => m.type === 'objetivo' && m.active !== false).forEach(m => {
      const perf = Store.getMetaPerformance(m.id, year, month);
      if (perf.pct >= 1) {
        const routineKey = `event_meta_${m.id}`;
        if (_addRoutineRecado(
          routineKey, 'meta', `Meta atingida: ${m.label}`,
          `Você atingiu ${Utils.currency(perf.current)} do alvo de ${Utils.currency(perf.target)}. Excelente disciplina — hora de planejar a próxima conquista.`
        )) generated++;
      }
    });
    return generated;
  }

  function runCoachRoutine(forcedDate) {
    const today = forcedDate ? new Date(forcedDate) : new Date();
    const dow = today.getDay(); // 0=Dom, 1=Seg, 4=Qui
    const dom = today.getDate(); // dia do mês
    try {
      if (dow === 1) _coachWeeklyRecap(today);
      if (dow === 4) _coachMidweekCheck(today);
      if (dom >= 1 && dom <= 3) _coachMonthOpen(today);
      if (dom >= 25 && dom <= 28) _coachMonthClose(today);
      _coachEventAlerts(today);
    } catch (err) {
      console.warn('[coach-routine] falha:', err);
    }
  }

  // Expor pra DevTools/testes
  window._coachRoutine = { runCoachRoutine, _coachWeeklyRecap, _coachMidweekCheck, _coachMonthOpen, _coachMonthClose, _coachEventAlerts };

  // ══════════════════════════════════════════════════════════════
  // PAGE: PAINEL DA FAMÍLIA (redesign 2026-05)
  // Visão consolidada por membro com dados reais do Store.
  // ══════════════════════════════════════════════════════════════
  function renderPainelFamilia(container) {
    const month = getMonth(), year = getYear();
    const monthLabel = `${Utils.monthsFull[month-1]} ${year}`;
    const pessoas = (Store.PESSOAS || []).filter(p => p !== 'Família');
    const receita = Store.sumReceitas(month, year);
    const despesa = Store.sumDespesas(month, year);
    const poder   = Store.calcPoderDeEscolha(month, year);
    const familyCtx = typeof SupabaseSync !== 'undefined' ? SupabaseSync.getFamilyContext() : null;

    // Por pessoa: receita, despesa (considerando split), e poder estimado
    const allRec   = Store.receitasByMonth(month, year);
    const allDesp  = Store.despesasByMonth(month, year);
    const totalRec = allRec.reduce((s, r) => s + r.amount, 0);

    const memberData = pessoas.map(p => {
      const recP = allRec.filter(r => r.person === p).reduce((s, r) => s + r.amount, 0);
      const despP = allDesp.reduce((s, d) => {
        // Considera split se existir; senão considera 100% do "pagador" (d.person)
        if (Array.isArray(d.split) && d.split.length) {
          const sl = d.split.find(x => x.person === p);
          return s + (sl?.valor || 0);
        }
        return d.person === p ? s + d.amount : s;
      }, 0);
      const poderP = recP - despP;
      return {
        person: p,
        receita: recP,
        despesa: despP,
        poder: poderP,
        pctContribReceita: totalRec > 0 ? (recP / totalRec * 100) : 0,
        color: Utils.personColor(p),
        avatar: Utils.personAvatar(p),
      };
    }).filter(m => m.receita > 0 || m.despesa > 0);

    // Metas familiares (heurística: meta cuja descrição menciona "famí" ou que tem tag familiar)
    const allMetas = (Store.get().metas || []).filter(m => m.active !== false);
    const metasFamilia = allMetas.filter(m =>
      /famí|familia/i.test(m.label || '') ||
      m.tipo === 'familia' ||
      // se não há tag clara, fallback: metas tipo viagem, casa, carro são compartilhadas
      /viagem|casa|carro|imóvel|imovel/i.test(m.label || '')
    ).slice(0, 4);

    // Tem família multi-usuário ativa?
    const isMultiUser = familyCtx && (familyCtx.role === 'admin' || familyCtx.role === 'editor' || familyCtx.role === 'member');
    const familyName = familyCtx?.groupName || 'Minha Família';

    container.innerHTML = `
<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">Painel da Família</h1>
    <p class="page-head-meta">
      <span class="page-head-meta-total">${familyName}</span>
      <span class="page-head-meta-sep">·</span>
      <span class="page-head-meta-total">${memberData.length} ${memberData.length === 1 ? 'pessoa ativa' : 'pessoas ativas'}</span>
      <span class="page-head-meta-sep">·</span>
      <span style="color:var(--text-3)">${monthLabel}</span>
    </p>
  </div>
</div>

${memberData.length === 0 ? `
<div class="card" style="padding:36px;text-align:center">
  <div style="font-size:14px;color:var(--text-2);margin-bottom:6px">Ainda não há movimento nas pessoas da família.</div>
  <div style="font-size:12px;color:var(--text-3)">Lance receitas e despesas para ver a consolidação aqui.</div>
</div>` : `

<!-- Hero consolidado da família -->
<div class="dash-hero-grid mb-4">
  <div class="poder-hero ${poder.poderDeEscolha < 0 ? 'is-negative' : ''}">
    <div class="poder-hero-glow"></div>
    <div class="poder-hero-header">
      <div class="poder-hero-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
      </div>
      <div class="poder-hero-meta">
        <div class="poder-hero-tag">Família consolidada</div>
        <div class="poder-hero-label">Poder de Escolha</div>
      </div>
      <div class="poder-hero-month">${Utils.monthsFull[month-1].slice(0,3)} ${year}</div>
    </div>
    <div class="poder-hero-main">
      <div class="poder-hero-value-wrap">
        <div class="poder-hero-value">${poder.poderDeEscolha<0?'-':''}${Utils.currency(Math.abs(poder.poderDeEscolha))}</div>
        <div class="poder-hero-sub">
          ${(poder.pct*100).toFixed(1)}% da receita familiar
          <span style="display:block;margin-top:2px;opacity:0.85">livre após todos os compromissos da família</span>
        </div>
      </div>
      <div class="poder-hero-gauge">
        ${SvgCharts.gauge(Math.max(0, Math.min(100, poder.pct*100)), { size: 78, color: 'var(--accent-2)', thickness: 9 })}
        <div class="poder-hero-gauge-label">
          <div class="poder-hero-gauge-pct">${Math.round(poder.pct*100)}%</div>
          <div class="poder-hero-gauge-cap">livre</div>
        </div>
      </div>
    </div>
    <div class="poder-hero-flow">
      <div class="poder-hero-flow-foot">
        <div>
          <div class="poder-hero-flow-foot-lbl">Receita família</div>
          <div class="poder-hero-flow-foot-val">${Utils.currency(receita)}</div>
        </div>
        <div style="text-align:right">
          <div class="poder-hero-flow-foot-lbl">Compromissos</div>
          <div class="poder-hero-flow-foot-val">${Utils.currency(despesa)}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="dash-metric-col">
    <div class="metric-card">
      <div class="metric-card-head">
        <span class="metric-card-label">Receita Familiar</span>
        <div class="metric-card-icon" style="background:var(--green-dim);color:var(--green)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
      </div>
      <div class="metric-card-value">${Utils.currency(receita)}</div>
      <div class="metric-card-delta-cap">soma de todas as pessoas</div>
    </div>
    <div class="metric-card">
      <div class="metric-card-head">
        <span class="metric-card-label">Despesa Familiar</span>
        <div class="metric-card-icon" style="background:var(--red-dim);color:var(--red)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
        </div>
      </div>
      <div class="metric-card-value">${Utils.currency(despesa)}</div>
      <div class="metric-card-delta-cap">incluindo rateios</div>
    </div>
  </div>

  <div class="dash-metric-col">
    <div class="metric-card">
      <div class="metric-card-head">
        <span class="metric-card-label">Maior Contribuição</span>
      </div>
      ${(() => {
        const top = [...memberData].sort((a,b) => b.receita - a.receita)[0];
        if (!top) return `<div class="metric-card-empty">Sem dados</div>`;
        return `<div class="metric-card-row">
          <span style="width:42px;height:42px;border-radius:50%;flex-shrink:0;background:${top.color};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:17px">${Utils.personInitial(top.person)}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:2px">${top.person}</div>
            <div style="font-size:18px;font-weight:700;color:var(--green);letter-spacing:-0.4px;line-height:1">${Utils.currency(top.receita)}</div>
          </div>
        </div>
        <div class="metric-card-foot">${top.pctContribReceita.toFixed(0)}% da receita da família</div>`;
      })()}
    </div>
    <div class="metric-card">
      <div class="metric-card-head">
        <span class="metric-card-label">Saúde da Família</span>
      </div>
      <div class="metric-card-value" style="color:${despesa/receita > 0.85 ? 'var(--red)' : despesa/receita > 0.66 ? 'var(--amber)' : 'var(--green)'}">${Utils.pct(receita > 0 ? despesa/receita : 0)} <span style="font-size:11px;color:var(--text-3);font-weight:500">comprometido</span></div>
      ${SvgCharts.healthBar(Math.min((receita > 0 ? despesa/receita : 0)*100, 100))}
      <div class="metric-card-delta-cap" style="margin-top:2px">Ideal LLP: ≤ 33% comprometido</div>
    </div>
  </div>
</div>

<!-- Membros -->
<div class="dash-section-tag mb-2">CONTRIBUIÇÃO POR MEMBRO · ${monthLabel.toUpperCase()}</div>
<div class="family-members-grid mb-6">
  ${memberData.map(m => {
    const poderPct = m.receita > 0 ? Math.max(0, m.poder / m.receita * 100) : 0;
    const comprometido = m.receita - m.poder;
    return `<div class="family-member-card" style="--member-color:${m.color}">
      <div class="family-member-head">
        <div class="family-member-avatar" style="background:${m.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px">${Utils.personInitial(m.person)}</div>
        <div style="flex:1;min-width:0">
          <div class="family-member-name">${m.person}</div>
          <div class="family-member-role">${m.pctContribReceita.toFixed(0)}% da receita familiar</div>
        </div>
      </div>
      <div class="family-member-stats">
        <div>
          <div class="family-member-stat-lbl">Receita</div>
          <div class="family-member-stat-val" style="color:var(--green)">${Utils.currency(m.receita)}</div>
        </div>
        <div>
          <div class="family-member-stat-lbl">Comprometido</div>
          <div class="family-member-stat-val" style="color:var(--red)">${Utils.currency(comprometido)}</div>
        </div>
        <div>
          <div class="family-member-stat-lbl">Poder de Escolha</div>
          <div class="family-member-stat-val" style="color:${m.poder >= 0 ? 'var(--accent-2)' : 'var(--red)'}">${m.poder<0?'-':''}${Utils.currency(Math.abs(m.poder))}</div>
        </div>
      </div>
      <div class="family-member-bar">
        <div class="family-member-bar-fill" style="width:${Math.max(0, Math.min(100, poderPct))}%;background:${m.color}"></div>
      </div>
      <div class="family-member-bar-cap">${poderPct.toFixed(0)}% livre · ${(100-poderPct).toFixed(0)}% comprometido</div>
    </div>`;
  }).join('')}
</div>

${metasFamilia.length ? `
<!-- Metas compartilhadas -->
<div class="dash-section-tag mb-2">METAS COMPARTILHADAS</div>
<div class="chart-grid mb-6" style="grid-template-columns:1fr">
  <div class="card">
    <div style="display:flex;flex-direction:column;gap:14px">
      ${metasFamilia.map(m => {
        const target = m.target || 0;
        const atual  = m.atual || 0;
        const pct = target > 0 ? Math.min(atual/target*100, 100) : 0;
        return `<div style="display:flex;align-items:center;gap:14px">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--accent-2)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:13px;font-weight:600;color:var(--text-1)">${m.label}</span>
              <span style="font-size:12px;color:var(--text-2);font-variant-numeric:tabular-nums">${Utils.currency(atual)} <span style="color:var(--text-4)">/ ${Utils.currency(target)}</span></span>
            </div>
            <div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.06);overflow:hidden">
              <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:3px"></div>
            </div>
            <div style="font-size:11px;color:var(--text-3);margin-top:4px">${pct.toFixed(0)}% concluído</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>
</div>` : ''}

${isMultiUser ? '' : `
<div class="card mb-4" style="border-color:rgba(74,168,255,0.3);background:rgba(74,168,255,0.05)">
  <div style="display:flex;gap:12px;align-items:flex-start">
    <div style="width:32px;height:32px;border-radius:10px;background:rgba(74,168,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--blue)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
    </div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:2px">Modo individual</div>
      <div style="font-size:12px;color:var(--text-3);line-height:1.55">Para acompanhar a família com múltiplos logins, convide membros em <a href="#config" style="color:var(--accent)">Configurações → Grupo Familiar</a>.</div>
    </div>
  </div>
</div>`}
`}`;
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: TRIBUTÁRIO (redesign 2026-05 — módulo NOVO)
  // IRPF + IPTU + IPVA + Outros + Calendário Fiscal de 12 meses
  // ══════════════════════════════════════════════════════════════
  function renderTributario(container) {
    const ano = getYear();
    const allTribs = Store.getTributos().filter(t => (t.ano || ano) === ano);
    const irpf  = allTribs.find(t => t.tipo === 'irpf');
    const iptus = allTribs.filter(t => t.tipo === 'iptu');
    const ipvas = allTribs.filter(t => t.tipo === 'ipva');
    const outrs = allTribs.filter(t => t.tipo === 'outros');

    const totIptu = iptus.reduce((s, t) => s + (t.valor || 0), 0);
    const totIpva = ipvas.reduce((s, t) => s + (t.valor || 0), 0);
    const totOutr = outrs.reduce((s, t) => s + (t.valor || 0), 0);
    const irpfNet = irpf ? ((irpf.aReceber || 0) - (irpf.aPagar || 0)) : 0;
    const totAno  = totIptu + totIpva + totOutr - irpfNet;

    // Calendário fiscal: gera próximos 12 meses com vencimentos
    const today = new Date();
    const calendar = [];
    for (let k = 0; k < 12; k++) {
      const dt = new Date(today.getFullYear(), today.getMonth() + k, 1);
      const mIdx = dt.getMonth(), yIdx = dt.getFullYear();
      const items = [];
      // IRPF: ajusta parcelas mensais a partir de Maio do ano da declaração
      if (irpf && irpf.totalParcelas) {
        for (let p = 1; p <= irpf.totalParcelas; p++) {
          const irpfMes = 4 + (p - 1);  // Maio = mês 4 (zero-indexed)
          if (irpfMes === mIdx && yIdx === ano) {
            items.push({ tag: 'irpf', label: `IRPF · ${p}ª parc.`, dia: 30, valor: (irpf.aPagar || 0) / irpf.totalParcelas });
          }
        }
      }
      // IPTU/IPVA/Outros — parcelas a partir do vencimentoMes (default Janeiro)
      for (const t of [...iptus, ...ipvas, ...outrs]) {
        const vMes = (t.vencimentoMes || 1) - 1;
        const parcelas = t.parcelas || 1;
        const valorParc = (t.valor || 0) / parcelas;
        for (let p = 0; p < parcelas; p++) {
          const pMes = (vMes + p) % 12;
          const pAno = (t.ano || ano) + Math.floor((vMes + p) / 12);
          if (pMes === mIdx && pAno === yIdx) {
            items.push({
              tag: t.tipo, label: `${t.label} · ${p + 1}ª`,
              dia: t.vencimentoDia || 10, valor: valorParc,
            });
          }
        }
      }
      calendar.push({ mes: Utils.months[mIdx], ano: yIdx, items: items.sort((a,b) => a.dia - b.dia) });
    }

    const isEmpty = allTribs.length === 0;

    container.innerHTML = `
<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">Tributário <span class="page-head-year">— ${ano}</span></h1>
    <p class="page-head-meta">
      <span class="page-head-meta-total">${allTribs.length} item${allTribs.length!==1?'s':''}</span>
      <span class="page-head-meta-sep">·</span>
      <span style="color:var(--text-3)">IRPF, IPTU, IPVA e calendário fiscal</span>
    </p>
  </div>
  <button class="btn-primary" id="btnAddTributo">+ Novo Tributo</button>
</div>

${!isEmpty ? (() => {
  // Coach inline — próximo vencimento + insight
  const proximaCell = calendar.find(c => c.items.length > 0);
  const proximoItem = proximaCell?.items[0];
  let tc;
  if (irpf?.aReceber) tc = { tone: 'positive', titulo: 'Restituição de IRPF prevista',
    texto: `Você tem <strong style="color:var(--green)">${Utils.currency(irpf.aReceber)}</strong> a receber de restituição. Direcionar para reserva de emergência ou amortizar uma dívida costuma ser o uso mais eficiente.` };
  else if (irpf?.aPagar && (irpf.pagas || 0) < (irpf.totalParcelas || 1)) tc = { tone: 'attention', titulo: 'IRPF em parcelamento',
    texto: `${irpf.pagas || 0}/${irpf.totalParcelas} parcelas pagas. Próxima parcela: <strong>${Utils.currency((irpf.aPagar || 0) / irpf.totalParcelas)}</strong>. Mantenha o débito automático para evitar multa.` };
  else if (proximoItem) tc = { tone: 'attention', titulo: `Próximo vencimento: ${proximaCell.mes}/${proximaCell.ano}`,
    texto: `${proximoItem.label} no dia ${proximoItem.dia} — <strong>${Utils.currency(proximoItem.valor)}</strong>. Programe pagamento ou débito automático.` };
  else tc = { tone: 'neutral', titulo: 'Calendário fiscal em dia',
    texto: `${allTribs.length} tributo${allTribs.length!==1?'s':''} cadastrado${allTribs.length!==1?'s':''} para ${ano}. Total a planejar: <strong>${totAno >= 0 ? Utils.currency(totAno) : Utils.currency(Math.abs(totAno)) + ' (recebimento líquido)'}</strong>.` };
  return coachInlineHTML({
    contexto: `Tributário · ${ano}`,
    titulo: tc.titulo,
    texto: tc.texto,
    tone: tc.tone,
    acoes: [{ label: 'Ver análise completa', action: 'open-coach' }],
  });
})() : ''}

${isEmpty ? `
<div class="card" style="padding:36px;text-align:center">
  <div style="font-size:14px;color:var(--text-2);margin-bottom:6px">Nenhum tributo cadastrado para ${ano}.</div>
  <div style="font-size:12px;color:var(--text-3);margin-bottom:16px">Adicione IRPF, IPTU, IPVA ou outros tributos para ver o calendário fiscal.</div>
  <button class="btn-primary" id="btnAddTributoEmpty">+ Cadastrar primeiro tributo</button>
</div>` : `

<!-- KPIs -->
<div class="dash-annual-grid mb-6" style="grid-template-columns:repeat(4,1fr)">
  <div class="annual-card">
    <span class="annual-card-label">Total do Ano</span>
    <div class="annual-card-value" style="color:${totAno >= 0 ? 'var(--red)' : 'var(--green)'}">${totAno<0?'-':''}${Utils.currency(Math.abs(totAno))}</div>
    <div class="annual-card-progress-cap" style="margin-top:6px">${totAno >= 0 ? 'a pagar' : 'a receber líquido'}</div>
  </div>
  <div class="annual-card">
    <span class="annual-card-label">IRPF</span>
    <div class="annual-card-value" style="color:${irpf?.aReceber ? 'var(--green)' : 'var(--text-1)'}">${irpf ? (irpf.aReceber ? '+' + Utils.currency(irpf.aReceber) : irpf.aPagar ? '-' + Utils.currency(irpf.aPagar) : '—') : '—'}</div>
    <div class="annual-card-progress-cap" style="margin-top:6px">${irpf ? (irpf.aReceber ? 'restituição prevista' : irpf.aPagar ? 'parcelado ' + (irpf.pagas || 0) + '/' + (irpf.totalParcelas || 1) : 'declaração entregue') : 'não declarado'}</div>
  </div>
  <div class="annual-card">
    <span class="annual-card-label">IPTU</span>
    <div class="annual-card-value" style="color:var(--amber)">${Utils.currency(totIptu)}</div>
    <div class="annual-card-progress-cap" style="margin-top:6px">${iptus.length} imóvel${iptus.length!==1?'s':''}</div>
  </div>
  <div class="annual-card">
    <span class="annual-card-label">IPVA</span>
    <div class="annual-card-value" style="color:var(--blue)">${Utils.currency(totIpva)}</div>
    <div class="annual-card-progress-cap" style="margin-top:6px">${ipvas.length} veículo${ipvas.length!==1?'s':''}</div>
  </div>
</div>

<!-- IRPF Card detalhado -->
${irpf ? `
<div class="dash-section-tag mb-2">DECLARAÇÃO DE IMPOSTO DE RENDA · ${irpf.ano || ano - 1}</div>
<div class="card mb-6" style="border-left:3px solid ${irpf.aReceber ? 'var(--green)' : 'var(--amber)'};padding:18px 22px">
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
    <div>
      <div style="font-size:9.5px;font-weight:700;color:var(--text-3);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px">Status</div>
      <div style="font-size:14px;font-weight:600;color:var(--text-1)">${irpf.status === 'declarada' ? 'Declarada' : irpf.status === 'pendente' ? 'Pendente' : 'Em rascunho'}</div>
      ${irpf.dataEntrega ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">Entrega: ${irpf.dataEntrega}</div>` : ''}
    </div>
    <div>
      <div style="font-size:9.5px;font-weight:700;color:var(--text-3);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px">${irpf.aReceber ? 'A receber' : 'A pagar'}</div>
      <div style="font-size:18px;font-weight:700;color:${irpf.aReceber ? 'var(--green)' : 'var(--red)'};letter-spacing:-0.3px;font-variant-numeric:tabular-nums">${Utils.currency(irpf.aReceber || irpf.aPagar || 0)}</div>
      ${irpf.aPagar && irpf.totalParcelas ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">Parcela: ${Utils.currency(irpf.aPagar/irpf.totalParcelas)}</div>` : ''}
    </div>
    <div style="display:flex;align-items:flex-start;justify-content:flex-end;gap:8px">
      <button class="btn-secondary btn-sm" data-edit-trib="${irpf.id}">${icon('pencil',{size:13})} Editar</button>
    </div>
  </div>
  ${irpf.aPagar && irpf.totalParcelas ? `
  <div style="margin-top:16px">
    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:11px;color:var(--text-3)">Parcelas pagas: ${irpf.pagas || 0} de ${irpf.totalParcelas}</span>
      <span style="font-size:11px;color:var(--text-2);font-weight:600">${Math.round((irpf.pagas || 0) / irpf.totalParcelas * 100)}%</span>
    </div>
    <div style="height:5px;border-radius:3px;background:rgba(255,255,255,0.06);overflow:hidden">
      <div style="height:100%;width:${(irpf.pagas || 0) / irpf.totalParcelas * 100}%;background:var(--amber);border-radius:3px"></div>
    </div>
  </div>` : ''}
</div>` : ''}

${iptus.length ? `
<div class="dash-section-tag mb-2">IPTU — IMÓVEIS</div>
<div class="card mb-6" style="padding:0;overflow:hidden">
  <table class="data-table">
    <thead><tr><th>Imóvel</th><th>Responsável</th><th class="num">Valor</th><th class="num">Parcelas</th><th class="num">Pagas</th><th></th></tr></thead>
    <tbody>
      ${iptus.map(t => `<tr class="row-clickable" data-edit-trib="${t.id}">
        <td>${t.label}</td>
        <td>${t.pessoa || '—'}</td>
        <td class="num">${Utils.currency(t.valor || 0)}</td>
        <td class="num">${t.parcelas || 1}</td>
        <td class="num"><span class="badge ${t.pagas >= (t.parcelas || 1) ? 'badge-green' : 'badge-amber'}">${t.pagas || 0}/${t.parcelas || 1}</span></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

${ipvas.length ? `
<div class="dash-section-tag mb-2">IPVA — VEÍCULOS</div>
<div class="card mb-6" style="padding:0;overflow:hidden">
  <table class="data-table">
    <thead><tr><th>Veículo</th><th>Responsável</th><th class="num">Valor</th><th class="num">Parcelas</th><th class="num">Pagas</th></tr></thead>
    <tbody>
      ${ipvas.map(t => `<tr class="row-clickable" data-edit-trib="${t.id}">
        <td>${t.label}${t.placa ? `<div style="font-size:10px;color:var(--text-4);margin-top:2px;font-family:var(--mono)">${t.placa}</div>` : ''}</td>
        <td>${t.pessoa || '—'}</td>
        <td class="num">${Utils.currency(t.valor || 0)}</td>
        <td class="num">${t.parcelas || 1}</td>
        <td class="num"><span class="badge ${t.pagas >= (t.parcelas || 1) ? 'badge-green' : 'badge-amber'}">${t.pagas || 0}/${t.parcelas || 1}</span></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

${outrs.length ? `
<div class="dash-section-tag mb-2">OUTROS TRIBUTOS E TAXAS</div>
<div class="card mb-6" style="padding:0;overflow:hidden">
  <table class="data-table">
    <thead><tr><th>Descrição</th><th>Responsável</th><th class="num">Valor</th></tr></thead>
    <tbody>
      ${outrs.map(t => `<tr class="row-clickable" data-edit-trib="${t.id}">
        <td>${t.label}</td>
        <td>${t.pessoa || '—'}</td>
        <td class="num">${Utils.currency(t.valor || 0)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<!-- Calendário fiscal -->
<div class="dash-section-tag mb-2">CALENDÁRIO FISCAL — PRÓXIMOS 12 MESES</div>
<div class="tributario-calendar mb-6">
  ${calendar.map((c, i) => `
    <div class="tributario-cal-cell ${c.items.length ? '' : 'empty'} ${i === 0 ? 'current' : ''}">
      <div class="tributario-cal-mes">${c.mes} <span style="opacity:0.6;font-weight:400">${c.ano}</span></div>
      ${c.items.length ? `
        <div class="tributario-cal-items">
          ${c.items.map(it => `
            <div class="tributario-cal-item">
              <span class="tributario-cal-tag tag-${it.tag}">${it.tag.toUpperCase()}</span>
              <span class="tributario-cal-lbl">${it.label}</span>
              <span class="tributario-cal-val">${Utils.currency(it.valor)}</span>
            </div>
          `).join('')}
        </div>
      ` : `<div class="tributario-cal-empty">sem vencimentos</div>`}
    </div>
  `).join('')}
</div>
`}`;

    // Handlers
    function bindActions() {
      container.querySelectorAll('#btnAddTributo, #btnAddTributoEmpty').forEach(b =>
        b.addEventListener('click', () => openTributoModal(null, container))
      );
      container.querySelectorAll('[data-edit-trib]').forEach(b =>
        b.addEventListener('click', () => {
          const t = Store.getTributos().find(x => x.id === b.dataset.editTrib);
          if (t) openTributoModal(t, container);
        })
      );
      // Botões data-del-trib removidos — Excluir agora vive dentro do modal de edição
    }
    bindActions();
  }

  function openTributoModal(tributo, container) {
    const isEdit = !!tributo;
    const t = tributo || {};
    const pessoas = (Store.PESSOAS || []).concat(['Família']);
    const html = `<div class="form-grid">
      <div class="form-group"><label class="form-label">Tipo</label>
        <select class="form-select" id="fTbTipo">
          <option value="irpf"   ${t.tipo==='irpf'  ?'selected':''}>IRPF (Declaração)</option>
          <option value="iptu"   ${t.tipo==='iptu'  ?'selected':''}>IPTU (Imóvel)</option>
          <option value="ipva"   ${t.tipo==='ipva'  ?'selected':''}>IPVA (Veículo)</option>
          <option value="outros" ${t.tipo==='outros'?'selected':''}>Outros (Taxa, contribuição)</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Ano</label>
        <input class="form-input" id="fTbAno" type="number" value="${t.ano || getYear()}"/>
      </div>
      <div class="form-group form-full"><label class="form-label">Descrição</label>
        <input class="form-input" id="fTbLabel" placeholder="Ex: Casa Vila Madalena, Volvo XC60..." value="${(t.label||'').replace(/"/g,'&quot;')}"/>
      </div>
      <div class="form-group"><label class="form-label">Valor (R$)</label>
        <input class="form-input" id="fTbValor" type="number" step="0.01" value="${t.valor || ''}"/>
      </div>
      <div class="form-group"><label class="form-label">Parcelas</label>
        <input class="form-input" id="fTbParcelas" type="number" min="1" value="${t.parcelas || 1}"/>
      </div>
      <div class="form-group"><label class="form-label">Parcelas pagas</label>
        <input class="form-input" id="fTbPagas" type="number" min="0" value="${t.pagas || 0}"/>
      </div>
      <div class="form-group"><label class="form-label">Mês 1ª parcela</label>
        <select class="form-select" id="fTbVencMes">
          ${Utils.months.map((m,i)=>`<option value="${i+1}" ${(t.vencimentoMes||1)===i+1?'selected':''}>${Utils.monthsFull[i]}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Dia do vencimento</label>
        <input class="form-input" id="fTbVencDia" type="number" min="1" max="31" value="${t.vencimentoDia || 10}"/>
      </div>
      <div class="form-group form-full"><label class="form-label">Responsável</label>
        <select class="form-select" id="fTbPessoa">
          <option value="">—</option>
          ${pessoas.map(p=>`<option ${t.pessoa===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group form-full irpf-only" style="display:${(t.tipo||'iptu')==='irpf'?'block':'none'}">
        <label class="form-label">Status da declaração</label>
        <select class="form-select" id="fTbStatus">
          <option value="rascunho" ${t.status==='rascunho'?'selected':''}>Em rascunho</option>
          <option value="declarada" ${t.status==='declarada'?'selected':''}>Declarada</option>
          <option value="pendente" ${t.status==='pendente'?'selected':''}>Pendente</option>
        </select>
      </div>
      <div class="form-group irpf-only" style="display:${(t.tipo||'iptu')==='irpf'?'block':'none'}">
        <label class="form-label">A receber (R$)</label>
        <input class="form-input" id="fTbAReceber" type="number" step="0.01" value="${t.aReceber || ''}"/>
      </div>
      <div class="form-group irpf-only" style="display:${(t.tipo||'iptu')==='irpf'?'block':'none'}">
        <label class="form-label">A pagar parcelado (R$)</label>
        <input class="form-input" id="fTbAPagar" type="number" step="0.01" value="${t.aPagar || ''}"/>
      </div>
      <div class="form-group ipva-only" style="display:${(t.tipo||'iptu')==='ipva'?'block':'none'}">
        <label class="form-label">Placa</label>
        <input class="form-input" id="fTbPlaca" placeholder="ABC1A23" value="${t.placa||''}"/>
      </div>
    </div>`;
    Modal.open(isEdit ? 'Editar Tributo' : 'Novo Tributo', html, () => {
      const tipo = document.getElementById('fTbTipo').value;
      const data = {
        tipo,
        ano: parseInt(document.getElementById('fTbAno').value, 10) || getYear(),
        label: document.getElementById('fTbLabel').value.trim(),
        valor: parseFloat(document.getElementById('fTbValor').value) || 0,
        parcelas: parseInt(document.getElementById('fTbParcelas').value, 10) || 1,
        pagas: parseInt(document.getElementById('fTbPagas').value, 10) || 0,
        vencimentoMes: parseInt(document.getElementById('fTbVencMes').value, 10) || 1,
        vencimentoDia: parseInt(document.getElementById('fTbVencDia').value, 10) || 10,
        pessoa: document.getElementById('fTbPessoa').value || null,
      };
      if (tipo === 'irpf') {
        data.status = document.getElementById('fTbStatus').value;
        data.aReceber = parseFloat(document.getElementById('fTbAReceber').value) || 0;
        data.aPagar = parseFloat(document.getElementById('fTbAPagar').value) || 0;
        if (data.aPagar > 0 && !data.totalParcelas) data.totalParcelas = data.parcelas;
      }
      if (tipo === 'ipva') {
        data.placa = (document.getElementById('fTbPlaca')?.value || '').toUpperCase();
      }
      if (!data.label) return toast('Informe a descrição', 'error');
      if (isEdit) Store.updateTributo(tributo.id, data);
      else        Store.addTributo(data);
      Modal.close();
      renderTributario(container);
      toast(isEdit ? 'Tributo atualizado' : 'Tributo criado', 'success');
    }, isEdit ? () => {
      // Excluir tributo (dentro do modal — redesign 2026-05)
      if (!confirm('Excluir este tributo? A ação não pode ser desfeita.')) return;
      Store.deleteTributo(tributo.id);
      Modal.close();
      renderTributario(container);
      toast('Tributo removido', 'success');
    } : null);
    // Toggle de campos por tipo
    setTimeout(() => {
      const tipoSel = document.getElementById('fTbTipo');
      function refresh() {
        const v = tipoSel.value;
        document.querySelectorAll('.irpf-only').forEach(el => el.style.display = v === 'irpf' ? 'block' : 'none');
        document.querySelectorAll('.ipva-only').forEach(el => el.style.display = v === 'ipva' ? 'block' : 'none');
      }
      tipoSel.addEventListener('change', refresh);
      refresh();
    }, 50);
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: REEMBOLSOS
  // ══════════════════════════════════════════════════════════════
  function renderReembolsos(container, mode = 'standalone') {
    const pendentes = Store.getReembolsosPendentes();
    const todos = Store.get().despesas.filter(d => d.reembolso);
    const pagos = todos.filter(d => d.reembolso.status === 'pago');

    const totalPendente = pendentes.reduce((s,d) => s + (d.reembolso.valor || d.amount), 0);
    const embedded = mode === 'embedded';

    function rowHTML(d, isPendente) {
      const r = d.reembolso;
      const val = r.valor || d.amount;
      return `<tr>
        <td>
          <div style="font-weight:500">${d.desc}</div>
          <div style="font-size:11px;color:var(--text-4)">${d.date} · ${d.category}</div>
        </td>
        <td class="muted" style="font-size:12px">${r.para} → ${r.de}</td>
        <td class="num" style="color:var(--amber)">${Utils.currency(val)}</td>
        <td style="text-align:center">
          ${isPendente
            ? `<span class="badge badge-amber">pendente</span>`
            : `<span class="badge badge-green">pago em ${r.paidAt||''}</span>`}
        </td>
        <td style="text-align:right">
          ${isPendente
            ? `<button class="btn btn-sm btn-outline" data-mark-paid="${d.id}" style="font-size:11px;padding:4px 10px">Marcar pago</button>`
            : ''}
        </td>
      </tr>`;
    }

    container.innerHTML = `
      ${embedded
        ? `<div class="section-header mb-4" style="margin-top:32px"><div><div class="section-title">Reembolsos</div><div class="section-sub">Despesas que estão sendo reembolsadas por outra pessoa</div></div></div>`
        : `<div class="page-header"><h1 class="page-title">Reembolsos</h1></div>`}
      ${pendentes.length > 0 ? `
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="card kpi-card">
          <div class="kpi-label">Pendentes</div>
          <div class="kpi-value" style="color:var(--amber)">${pendentes.length}</div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-label">Total a receber</div>
          <div class="kpi-value" style="color:var(--amber)">${Utils.currency(totalPendente)}</div>
        </div>
      </div>` : ''}
      <div class="table-section mb-6">
        <div class="card-header"><span class="card-title">Pendentes de pagamento</span></div>
        ${pendentes.length === 0
          ? `<div style="padding:32px;text-align:center;color:var(--text-4);font-size:13px">Nenhum reembolso pendente 🎉</div>`
          : `<div class="table-wrap"><table class="data-table">
              <thead><tr>
                <th>Despesa</th>
                <th>De → Para</th>
                <th class="num">Valor</th>
                <th style="text-align:center">Status</th>
                <th></th>
              </tr></thead>
              <tbody>${pendentes.map(d => rowHTML(d, true)).join('')}</tbody>
            </table></div>`}
      </div>
      ${pagos.length > 0 ? `
      <div class="table-section">
        <div class="card-header"><span class="card-title">Histórico — pagos</span></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr>
            <th>Despesa</th>
            <th>De → Para</th>
            <th class="num">Valor</th>
            <th style="text-align:center">Status</th>
            <th></th>
          </tr></thead>
          <tbody>${pagos.map(d => rowHTML(d, false)).join('')}</tbody>
        </table></div>
      </div>` : ''}
    `;

    container.querySelectorAll('[data-mark-paid]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.marcarReembolsoPago(btn.dataset.markPaid);
        updateReembolsosBadge();
        renderReembolsos(container, mode);
        toast('Reembolso marcado como pago!', 'success');
      });
    });
  }

  function updateRecadosBadge() {
    const badge = document.getElementById('recadosBadge');
    if (!badge) return;
    // Conta não-lidos em data.recados (sistema unificado da rotina do Coach)
    const count = (Store.get().recados || []).filter(r => !r.lido).length;
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: MEU PAINEL (widgets customizáveis)
  // ══════════════════════════════════════════════════════════════
  function renderMeuPainel(container) {
    const month = getMonth(), year = getYear();
    const data  = Store.get();
    const receita  = Store.sumReceitas(month, year);
    const despesa  = Store.sumDespesas(month, year);
    const saldo    = receita - despesa;
    const patrimonio = Store.totalAtivos();

    // ── Config de widgets ─────────────────────────────────────────
    const WIDGETS_DEF = [
      { id: 'saldo_mes',      label: 'Saldo do Mês',         icon: 'trending-up',    default: true },
      { id: 'patrimonio',     label: 'Patrimônio',           icon: 'landmark',       default: true },
      { id: 'metas',          label: 'Metas em Andamento',   icon: 'target',         default: true },
      { id: 'coach',          label: 'Recados do Coach',     icon: 'sparkles',       default: true },
      { id: 'desp_cat',       label: 'Despesas por Categoria', icon: 'pie-chart',    default: true },
      { id: 'parcelas',       label: 'Próximas Parcelas',    icon: 'calendar-clock', default: true },
      { id: 'transacoes',     label: 'Últimas Transações',   icon: 'list',           default: true },
      { id: 'poder_escolha',  label: 'Poder de Escolha',     icon: 'zap',            default: false },
    ];
    const savedVis = JSON.parse(localStorage.getItem('painel_widgets') || 'null');
    const vis = {}; // widget visibility
    WIDGETS_DEF.forEach(w => {
      vis[w.id] = savedVis ? (savedVis[w.id] !== undefined ? savedVis[w.id] : w.default) : w.default;
    });

    function saveVis() { localStorage.setItem('painel_widgets', JSON.stringify(vis)); }

    // ── Render helpers ────────────────────────────────────────────
    function wSaldoMes() {
      const prevM = month > 1 ? month - 1 : 12;
      const prevY = month > 1 ? year : year - 1;
      const prevRec  = Store.sumReceitas(prevM, prevY);
      const prevDesp = Store.sumDespesas(prevM, prevY);
      const chgRec   = prevRec  > 0 ? ((receita - prevRec)  / prevRec)  * 100 : 0;
      const chgDesp  = prevDesp > 0 ? ((despesa - prevDesp) / prevDesp) * 100 : 0;
      const saldoColor = saldo >= 0 ? 'var(--green)' : 'var(--red)';
      return `
<div class="card widget-card" data-widget="saldo_mes">
  <div class="card-header"><span class="card-title">${icon('trending-up',{size:15})} Saldo do Mês</span>
    <span style="font-size:11px;color:var(--text-4)">${Utils.monthsFull[month-1]} ${year}</span></div>
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);gap:12px">
    <div class="kpi-card" style="--kpi-color:${saldoColor};--kpi-bg:${saldo>=0?'var(--green-dim)':'var(--red-dim)'};padding:14px">
      <div class="kpi-body"><div class="kpi-label">Saldo</div><div class="kpi-value" style="color:${saldoColor}">${Utils.currency(saldo)}</div></div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim);padding:14px">
      <div class="kpi-body"><div class="kpi-label">Receitas</div><div class="kpi-value green">${Utils.currency(receita)}</div>
        <div class="kpi-sub" style="color:${chgRec>=0?'var(--green)':'var(--red)'}">${chgRec>=0?'▲':'▼'} ${Math.abs(chgRec).toFixed(1)}% vs mês ant.</div>
      </div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim);padding:14px">
      <div class="kpi-body"><div class="kpi-label">Despesas</div><div class="kpi-value red">${Utils.currency(despesa)}</div>
        <div class="kpi-sub" style="color:${chgDesp<=0?'var(--green)':'var(--red)'}">${chgDesp>=0?'▲':'▼'} ${Math.abs(chgDesp).toFixed(1)}% vs mês ant.</div>
      </div>
    </div>
  </div>
</div>`;
    }

    function wPatrimonio() {
      const passivos = (data.passivos || []).reduce((s, p) => s + (p.valor || 0), 0);
      const liquido  = patrimonio - passivos;
      return `
<div class="card widget-card" data-widget="patrimonio">
  <div class="card-header"><span class="card-title">${icon('landmark',{size:15})} Patrimônio</span>
    <a href="#patrimonio" onclick="Router.navigate('patrimonio')" style="font-size:11px;color:var(--accent)">Ver detalhes →</a></div>
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);gap:12px">
    <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim);padding:14px">
      <div class="kpi-body"><div class="kpi-label">Ativos</div><div class="kpi-value accent">${Utils.currency(patrimonio)}</div></div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim);padding:14px">
      <div class="kpi-body"><div class="kpi-label">Passivos</div><div class="kpi-value red">${Utils.currency(passivos)}</div></div>
    </div>
    <div class="kpi-card" style="--kpi-color:${liquido>=0?'var(--green)':'var(--red)'};--kpi-bg:${liquido>=0?'var(--green-dim)':'var(--red-dim)'};padding:14px">
      <div class="kpi-body"><div class="kpi-label">Patrimônio Líquido</div><div class="kpi-value" style="color:${liquido>=0?'var(--green)':'var(--red)'}">${Utils.currency(liquido)}</div></div>
    </div>
  </div>
</div>`;
    }

    function wMetas() {
      const metas = (data.metas || []).filter(m => !m.concluida).slice(0, 4);
      if (!metas.length) return `
<div class="card widget-card" data-widget="metas">
  <div class="card-header"><span class="card-title">${icon('target',{size:15})} Metas em Andamento</span></div>
  <div class="empty-state" style="padding:20px"><p>Nenhuma meta ativa. <a href="#metas" onclick="Router.navigate('metas')" style="color:var(--accent)">Criar meta →</a></p></div>
</div>`;
      return `
<div class="card widget-card" data-widget="metas">
  <div class="card-header"><span class="card-title">${icon('target',{size:15})} Metas em Andamento</span>
    <a href="#metas" onclick="Router.navigate('metas')" style="font-size:11px;color:var(--accent)">Ver todas →</a></div>
  <div style="display:flex;flex-direction:column;gap:12px">
    ${metas.map(m => {
      const pct = m.alvo > 0 ? Math.min((m.atual || 0) / m.alvo * 100, 100) : 0;
      const cor  = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--accent)' : 'var(--amber)';
      const dataAlvo = m.dataAlvo ? new Date(m.dataAlvo+'T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}) : '—';
      return `<div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-weight:500;font-size:13px">${m.desc || m.label}</span>
          <span style="font-size:11px;color:var(--text-3)">${Utils.currency(m.atual||0)} / ${Utils.currency(m.alvo)} · até ${dataAlvo}</span>
        </div>
        <div class="progress-bar" style="height:6px;border-radius:3px">
          <div class="progress-fill" style="width:${pct.toFixed(1)}%;background:${cor};border-radius:3px"></div>
        </div>
      </div>`;
    }).join('')}
  </div>
</div>`;
    }

    function wCoach() {
      const recados = (data.recados || []).filter(r => !r.lido).slice(0, 3);
      const TIPO_COACH = {
        insight: { label:'Insight', color:'var(--accent)', bg:'var(--accent-dim)' },
        alerta:  { label:'Alerta',  color:'var(--red)',    bg:'var(--red-dim)' },
        dica:    { label:'Dica',    color:'var(--green)',  bg:'var(--green-dim)' },
        meta:    { label:'Meta',    color:'var(--teal)',   bg:'var(--teal-dim,#14B8A618)' },
      };
      if (!recados.length) return `
<div class="card widget-card" data-widget="coach">
  <div class="card-header"><span class="card-title">${icon('sparkles',{size:15})} Recados do Coach</span></div>
  <div class="empty-state" style="padding:20px"><p style="font-size:12px;color:var(--text-4)">Nenhum recado novo. O Coach vai se manifestar em breve 😊</p></div>
</div>`;
      return `
<div class="card widget-card" data-widget="coach">
  <div class="card-header"><span class="card-title">${icon('sparkles',{size:15})} Recados do Coach</span>
    <a href="#recados" onclick="Router.navigate('recados')" style="font-size:11px;color:var(--accent)">Ver todos →</a></div>
  <div style="display:flex;flex-direction:column;gap:10px">
    ${recados.map(r => {
      const tc = TIPO_COACH[r.tipo] || TIPO_COACH.insight;
      return `<div style="border-left:3px solid ${tc.color};padding:8px 12px;background:${tc.bg};border-radius:0 8px 8px 0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${tc.color}">${tc.label}</span>
        </div>
        <div style="font-size:13px;color:var(--text-1);line-height:1.4">${r.titulo}</div>
        ${r.texto ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">${r.texto.slice(0,90)}${r.texto.length>90?'…':''}</div>` : ''}
      </div>`;
    }).join('')}
  </div>
</div>`;
    }

    function wDespCat() {
      const catMap = Store.despesasByCategory(month, year);
      const top = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
      const total = top.reduce((s,[,v])=>s+v,0) || 1;
      if (!top.length) return `
<div class="card widget-card" data-widget="desp_cat">
  <div class="card-header"><span class="card-title">${icon('pie-chart',{size:15})} Despesas por Categoria</span></div>
  <div class="empty-state" style="padding:20px"><p>Sem despesas este mês.</p></div>
</div>`;
      return `
<div class="card widget-card" data-widget="desp_cat">
  <div class="card-header"><span class="card-title">${icon('pie-chart',{size:15})} Despesas por Categoria</span>
    <a href="#despesas" onclick="Router.navigate('despesas')" style="font-size:11px;color:var(--accent)">Ver todas →</a></div>
  <div style="display:flex;flex-direction:column;gap:8px">
    ${top.map(([k,v]) => {
      const cat = Store.CATEGORIES[k] || { label: k, color: '#7367F0' };
      const pct = (v / total * 100).toFixed(1);
      return `<div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
          <span style="display:flex;align-items:center;gap:5px">
            <span style="width:8px;height:8px;border-radius:50%;background:${cat.color||'var(--accent)'};display:inline-block"></span>
            ${cat.label}
          </span>
          <span style="font-family:var(--mono);color:var(--text-2)">${Utils.currency(v)} <span style="color:var(--text-4)">${pct}%</span></span>
        </div>
        <div style="height:4px;border-radius:2px;background:var(--border)">
          <div style="height:4px;border-radius:2px;width:${pct}%;background:${cat.color||'var(--accent)'}"></div>
        </div>
      </div>`;
    }).join('')}
  </div>
</div>`;
    }

    function wParcelas() {
      return `
<div class="card widget-card" data-widget="parcelas">
  <div class="card-header"><span class="card-title">${icon('calendar-clock',{size:15})} Próximas Parcelas</span>
    <a href="#contratos" onclick="Router.navigate('contratos')" style="font-size:11px;color:var(--accent)">Ver contratos →</a></div>
  <div id="wpParcelasBody">${renderProximasParcelas()}</div>
</div>`;
    }

    function wTransacoes() {
      const recent = [...(data.despesas||[]), ...(data.receitas||[])]
        .filter(t => t.year === year && t.month === month)
        .sort((a,b) => (b.date||'').localeCompare(a.date||''))
        .slice(0, 6);
      if (!recent.length) return `
<div class="card widget-card" data-widget="transacoes">
  <div class="card-header"><span class="card-title">${icon('list',{size:15})} Últimas Transações</span></div>
  <div class="empty-state" style="padding:20px"><p>Sem transações este mês.</p></div>
</div>`;
      return `
<div class="card widget-card" data-widget="transacoes">
  <div class="card-header"><span class="card-title">${icon('list',{size:15})} Últimas Transações</span>
    <a href="#lancamentos" onclick="Router.navigate('lancamentos')" style="font-size:11px;color:var(--accent)">Ver todas →</a></div>
  <div style="display:flex;flex-direction:column;gap:0">
    ${recent.map((t,i) => {
      const isRec = !!t.type;
      const dt = t.date ? new Date(t.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '—';
      const cat = Store.CATEGORIES[t.category] || { label: t.category||'—', color:'var(--text-4)' };
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;${i>0?'border-top:1px solid var(--border-faint,var(--border))':''}">
        <span style="width:7px;height:7px;border-radius:50%;background:${isRec?'var(--green)':'var(--red)'};flex-shrink:0"></span>
        <span style="flex:1;font-size:13px;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.desc||'—'}</span>
        <span style="font-size:11px;color:var(--text-4);white-space:nowrap">${cat.label}</span>
        <span style="font-family:var(--mono);font-size:13px;font-weight:600;color:${isRec?'var(--green)':'var(--text-1)'};white-space:nowrap">${isRec?'+':'−'}${Utils.currency(t.amount)}</span>
        <span style="font-size:11px;color:var(--text-4);white-space:nowrap">${dt}</span>
      </div>`;
    }).join('')}
  </div>
</div>`;
    }

    function wPoderEscolha() {
      const poder = Store.calcPoderDeEscolha(month, year);
      const pct = poder ? Math.round((poder.livre / (poder.receita||1)) * 100) : 0;
      const cor  = pct >= 30 ? 'var(--green)' : pct >= 15 ? 'var(--amber)' : 'var(--red)';
      return `
<div class="card widget-card" data-widget="poder_escolha">
  <div class="card-header"><span class="card-title">${icon('zap',{size:15})} Poder de Escolha</span></div>
  ${poder ? `
  <div class="kpi-grid" style="grid-template-columns:1fr 1fr 1fr;gap:12px">
    <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim);padding:14px">
      <div class="kpi-body"><div class="kpi-label">Fixo</div><div class="kpi-value red">${Utils.currency(poder.fixo)}</div></div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--amber);--kpi-bg:var(--amber-dim);padding:14px">
      <div class="kpi-body"><div class="kpi-label">Variável</div><div class="kpi-value" style="color:var(--amber)">${Utils.currency(poder.variavel)}</div></div>
    </div>
    <div class="kpi-card" style="--kpi-color:${cor};--kpi-bg:${pct>=30?'var(--green-dim)':pct>=15?'var(--amber-dim)':'var(--red-dim)'};padding:14px">
      <div class="kpi-body"><div class="kpi-label">Livre (${pct}%)</div><div class="kpi-value" style="color:${cor}">${Utils.currency(poder.livre)}</div></div>
    </div>
  </div>` : `<div class="empty-state" style="padding:16px"><p>Sem dados suficientes.</p></div>`}
</div>`;
    }

    const WIDGET_RENDER = {
      saldo_mes:     wSaldoMes,
      patrimonio:    wPatrimonio,
      metas:         wMetas,
      coach:         wCoach,
      desp_cat:      wDespCat,
      parcelas:      wParcelas,
      transacoes:    wTransacoes,
      poder_escolha: wPoderEscolha,
    };

    // ── Drawer de personalização ──────────────────────────────────
    function buildCustomizeDrawer() {
      return `
<div id="painelCustomizeDrawer" style="position:fixed;top:0;right:0;width:300px;height:100vh;background:var(--surface);border-left:1px solid var(--border);z-index:200;padding:24px;overflow-y:auto;box-shadow:-4px 0 20px rgba(0,0,0,.15)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <div style="font-weight:700;font-size:16px">Personalizar Painel</div>
    <button id="btnCloseDrawer" style="background:none;border:none;cursor:pointer;color:var(--text-3)">${icon('x',{size:18})}</button>
  </div>
  <div style="font-size:12px;color:var(--text-4);margin-bottom:16px">Escolha quais widgets exibir no seu painel.</div>
  <div style="display:flex;flex-direction:column;gap:12px">
    ${WIDGETS_DEF.map(w => `
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px;border-radius:8px;background:var(--surface-2);transition:background .15s">
      <input type="checkbox" id="wToggle_${w.id}" ${vis[w.id]?'checked':''} style="width:16px;height:16px;accent-color:var(--accent)">
      <span style="display:flex;align-items:center;gap:6px;font-size:13px">
        ${icon(w.icon,{size:14})}
        ${w.label}
      </span>
    </label>`).join('')}
  </div>
  <button id="btnApplyWidgets" class="btn-primary w-full" style="margin-top:20px">Aplicar</button>
</div>
<div id="painelOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:199" id="painelOverlay"></div>`;
    }

    // ── Render principal ──────────────────────────────────────────
    function buildPainel() {
      const visibleWidgets = WIDGETS_DEF.filter(w => vis[w.id]);
      const html = visibleWidgets.map(w => WIDGET_RENDER[w.id]()).join('');
      return html || `<div class="empty-state card" style="padding:40px;text-align:center"><p>Nenhum widget selecionado.<br>Clique em <strong>Personalizar</strong> para escolher o que exibir.</p></div>`;
    }

    container.innerHTML = `
<div class="page-head mb-4">
  <div>
    <h1 class="page-head-title">Meu Painel</h1>
    <p class="page-head-meta">
      <span class="page-head-meta-total">sua visão personalizada</span>
      <span class="page-head-meta-sep">·</span>
      <span style="color:var(--text-3)">widgets configuráveis das finanças pessoais</span>
    </p>
  </div>
  <button class="btn-secondary" id="btnPersonalizarPainel">${icon('sliders-horizontal',{size:14})} Personalizar</button>
</div>

${coachInlineHTML({
  contexto: `Meu Painel · ${Utils.monthsFull[getMonth()-1]}`,
  titulo: 'Personalize seu painel',
  texto: 'O Coach mostra os widgets mais relevantes ao seu perfil. Use <strong>Personalizar</strong> para ajustar quais blocos quer ver — receitas, despesas, metas, contratos, reembolsos.',
  tone: 'neutral',
  acoes: [{ label: 'Ver análise completa', action: 'open-coach' }],
})}

${renderPageMonthPicker(container)}
<div id="painelWidgetsArea" style="display:grid;grid-template-columns:1fr;gap:16px">
  ${buildPainel()}
</div>`;

    // ── Eventos ───────────────────────────────────────────────────
    document.getElementById('btnPersonalizarPainel')?.addEventListener('click', () => {
      if (document.getElementById('painelCustomizeDrawer')) return;
      document.body.insertAdjacentHTML('beforeend', buildCustomizeDrawer());

      document.getElementById('btnCloseDrawer')?.addEventListener('click', closeDrawer);
      document.getElementById('painelOverlay')?.addEventListener('click', closeDrawer);

      document.getElementById('btnApplyWidgets')?.addEventListener('click', () => {
        WIDGETS_DEF.forEach(w => {
          const cb = document.getElementById(`wToggle_${w.id}`);
          if (cb) vis[w.id] = cb.checked;
        });
        saveVis();
        closeDrawer();
        document.getElementById('painelWidgetsArea').innerHTML = buildPainel();
      });
    });

    function closeDrawer() {
      document.getElementById('painelCustomizeDrawer')?.remove();
      document.getElementById('painelOverlay')?.remove();
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: RECADOS
  // ══════════════════════════════════════════════════════════════
  function renderRecados(container) {
    // Recados são gerados pela rotina do Coach (runCoachRoutine em init).
    // Sem seed manual — se está vazio, é porque ainda não houve disparo
    // de calendário/evento que justifique um recado.
    const data = Store.get();
    if (!data.recados) data.recados = [];

    // ── helpers ────────────────────────────────────────────────────
    function fmtRelTime(isoStr) {
      const diff = Date.now() - new Date(isoStr).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1)  return 'agora';
      if (m < 60) return `há ${m}min`;
      const h = Math.floor(m / 60);
      if (h < 24) return `há ${h}h`;
      const d = Math.floor(h / 24);
      return `há ${d}d`;
    }

    const TIPO_CONFIG = {
      insight:     { iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>', label: 'Insight',     iconColor: 'var(--accent)',     bgColor: 'var(--accent-dim)' },
      alerta:      { iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', label: 'Alerta',      iconColor: 'var(--amber)',      bgColor: 'var(--amber-dim)' },
      dica:        { iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15"/></svg>', label: 'Dica',        iconColor: 'var(--green)',      bgColor: 'var(--green-dim)' },
      meta:        { iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>', label: 'Meta',        iconColor: 'var(--teal-coach)', bgColor: 'var(--teal-coach-dim)' },
      oportunidade:{ iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', label: 'Oportunidade',iconColor: 'var(--green)',      bgColor: 'var(--green-dim)' },
      conquista:   { iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18.4 9.4l-4.6 1.8L12 15.8l-1.8-4.6L5.6 9.4l4.6-1.8z"/></svg>',           label: 'Conquista',    iconColor: 'var(--accent-2)',   bgColor: 'var(--accent-dim)' },
    };

    const PESSOA_CONFIG = [
      { id: null,       label: 'Coach IA', initial: '✦', bg: 'linear-gradient(135deg, var(--haile-indigo) 0%, var(--haile-teal) 100%)' },
      { id: 'roberto',  label: 'Roberto',  initial: 'R', bg: 'var(--haile-indigo)' },
      { id: 'mariana',  label: 'Mariana',  initial: 'M', bg: 'var(--green)' },
      { id: 'familia',  label: 'Família',  initial: 'F', bg: 'var(--amber)' },
    ];

    let selectedPessoa = 'all'; // 'all' = Coach IA (sem filtro), ou id da pessoa
    let filterLido = 'todos';   // 'todos' | 'nao_lidos'

    function getRecados() {
      let recs = Store.get().recados || [];
      if (selectedPessoa !== 'all') {
        recs = recs.filter(r => r.pessoa === selectedPessoa);
      }
      if (filterLido === 'nao_lidos') {
        recs = recs.filter(r => !r.lido);
      }
      return recs;
    }

    function countNaoLidos() {
      return (Store.get().recados || []).filter(r => !r.lido).length;
    }

    function buildCardsHtml(recs) {
      if (!recs.length) return `<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" style="color:var(--text-4)"><path d="M12 3l1.8 4.6L18.4 9.4l-4.6 1.8L12 15.8l-1.8-4.6L5.6 9.4l4.6-1.8L12 3z" fill="currentColor" opacity=".3"/></svg><p>Nenhum recado encontrado.</p></div>`;
      return recs.map(r => {
        const tc = TIPO_CONFIG[r.tipo] || TIPO_CONFIG.insight;
        // Heurística: link contextual baseado no tipo
        const acoes = {
          alerta:       { label: 'Ver detalhes',   target: 'despesas' },
          oportunidade: { label: 'Simular agora',  target: 'simulador' },
          conquista:    { label: 'Ver meta',       target: 'metas' },
          meta:         { label: 'Ver meta',       target: 'metas' },
          insight:      { label: 'Ver análise',    target: null },
          dica:         { label: 'Aprender mais',  target: null },
        };
        const act = acoes[r.tipo] || acoes.insight;
        return `<div class="recado-card-redesign${r.lido ? '' : ' nao-lido'}" data-rc-id="${r.id}" style="--rc-color:${tc.iconColor}">
  <div class="recado-tipo-icon-redesign" style="background:${tc.bgColor};color:${tc.iconColor}">${tc.iconSvg}</div>
  <div class="recado-card-body">
    <div class="recado-card-head-redesign">
      <span class="recado-card-tag" style="background:${tc.bgColor};color:${tc.iconColor}">${tc.label}</span>
      ${!r.lido ? `<span class="recado-card-unread-dot" style="background:${tc.iconColor}"></span>` : ''}
      <span class="recado-card-time">${fmtRelTime(r.data)}</span>
    </div>
    <div class="recado-card-title-redesign">${r.titulo}</div>
    <div class="recado-card-text-redesign">${r.texto}</div>
    <div class="recado-card-actions">
      <button class="recado-action-primary" data-rc-action="${act.target || ''}" data-rc-host="${r.id}" style="background:${tc.bgColor};color:${tc.iconColor};border-color:${tc.iconColor}40">
        ${act.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
      <button class="recado-action-secondary" data-rc-toggle-lido="${r.id}">
        ${r.lido ? 'Marcar como não lido' : 'Marcar como lido'}
      </button>
    </div>
  </div>
</div>`;
      }).join('');
    }

    function renderCards() {
      const box = document.getElementById('rcCardsBox');
      if (box) box.innerHTML = buildCardsHtml(getRecados());
      // Atualizar badge sidebar
      const badge = document.getElementById('recadosBadge');
      if (badge) {
        const n = countNaoLidos();
        badge.textContent = n;
        badge.style.display = n > 0 ? '' : 'none';
      }
      // Atualizar contador
      const ct = document.getElementById('rcTotalCount');
      if (ct) ct.textContent = `${getRecados().length} recado${getRecados().length !== 1 ? 's' : ''}`;
      // Atualizar não lidos
      const nl = document.getElementById('rcNaoLidosCount');
      if (nl) {
        const n = countNaoLidos();
        nl.style.display = n > 0 ? '' : 'none';
        nl.textContent = `● ${n} não lido${n !== 1 ? 's' : ''}`;
      }
      // Toggle lido/não-lido (botão secundário)
      container.querySelectorAll('[data-rc-toggle-lido]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.rcToggleLido;
          const recs = Store.get().recados || [];
          const rec = recs.find(x => x.id === id);
          if (rec) {
            rec.lido = !rec.lido;
            Store.persist();
            renderCards();
          }
        });
      });
      // Ação primária (navega) + marca como lido
      container.querySelectorAll('[data-rc-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.rcHost;
          const target = btn.dataset.rcAction;
          const recs = Store.get().recados || [];
          const rec = recs.find(x => x.id === id);
          if (rec && !rec.lido) { rec.lido = true; Store.persist(); }
          if (target) Router.navigate(target);
          else { document.getElementById('coachToggleBtn')?.click(); }
        });
      });
      // Clique no card todo: marca como lido (sem navegar)
      container.querySelectorAll('.recado-card-redesign').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.rcId;
          const recs = Store.get().recados || [];
          const rec = recs.find(x => x.id === id);
          if (rec && !rec.lido) {
            rec.lido = true;
            Store.persist();
            renderCards();
          }
        });
      });
    }

    const naoLidosTotal = countNaoLidos();

    container.innerHTML = `
<div class="page-head mb-4">
  <div style="display:flex;align-items:center;gap:14px">
    <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,var(--teal-coach),var(--blue));display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px var(--teal-coach-dim)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 4.6L18.4 9.4l-4.6 1.8L12 15.8l-1.8-4.6L5.6 9.4l4.6-1.8L12 3z" fill="#fff"/><path d="M19 14l.9 2.3L22.2 17l-2.3.9L19 20l-.9-2.1L15.8 17l2.3-.7L19 14z" fill="#fff"/></svg>
    </div>
    <div>
      <h1 class="page-head-title">Recados do Coach</h1>
      <p class="page-head-meta">
        ${naoLidosTotal > 0 ? `<span style="color:var(--teal-coach);font-weight:600">${naoLidosTotal} não lido${naoLidosTotal!==1?'s':''}</span><span class="page-head-meta-sep">·</span>` : ''}
        <span style="color:var(--text-3)">insights e recomendações personalizadas da sua IA financeira</span>
      </p>
    </div>
  </div>
</div>

<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
  <div class="lanc-type-toggle">
    <button class="lanc-type-btn active" id="rcBtnTodos">Todos</button>
    <button class="lanc-type-btn" id="rcBtnNaoLidos">Não lidos${naoLidosTotal > 0 ? ` <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:var(--accent);color:#fff;font-size:10px;font-weight:700;margin-left:4px">${naoLidosTotal}</span>` : ''}</button>
  </div>
  <div style="margin-left:auto;display:flex;align-items:center;gap:10px">
    <span id="rcTotalCount" style="font-size:12px;color:var(--text-3)">${(Store.get().recados||[]).length} recados</span>
    ${naoLidosTotal > 0 ? `<button class="btn-ghost" id="rcBtnMarcarTodos" style="font-size:12px;color:var(--accent);white-space:nowrap">Marcar todos como lidos</button>` : ''}
  </div>
</div>

<div class="recados-avatar-filter" id="rcAvatarFilter">
  ${PESSOA_CONFIG.map(p => `
    <div class="recados-persona${p.id === null ? ' active' : ''}" data-rc-pessoa="${p.id === null ? 'all' : p.id}">
      <div class="recados-persona-avatar" style="background:${p.bg}">${p.initial}</div>
      <div class="recados-persona-name">${p.label}</div>
    </div>
  `).join('')}
</div>

<div id="rcCardsBox"></div>`;

    renderCards();

    // Avatar filter
    container.querySelectorAll('[data-rc-pessoa]').forEach(el => {
      el.addEventListener('click', () => {
        selectedPessoa = el.dataset.rcPessoa;
        container.querySelectorAll('[data-rc-pessoa]').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        renderCards();
      });
    });

    // Lido filter
    document.getElementById('rcBtnTodos').addEventListener('click', () => {
      filterLido = 'todos';
      document.getElementById('rcBtnTodos').classList.add('active');
      document.getElementById('rcBtnNaoLidos').classList.remove('active');
      renderCards();
    });
    document.getElementById('rcBtnNaoLidos').addEventListener('click', () => {
      filterLido = 'nao_lidos';
      document.getElementById('rcBtnNaoLidos').classList.add('active');
      document.getElementById('rcBtnTodos').classList.remove('active');
      renderCards();
    });

    // Marcar todos como lidos
    document.getElementById('rcBtnMarcarTodos')?.addEventListener('click', () => {
      const d = Store.get();
      (d.recados || []).forEach(r => { r.lido = true; });
      Store.persist();
      renderRecados(container);
    });

    // Update badge on load
    updateRecadosBadge();
  }

  // ── INIT ───────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════
  // PAGE: CONFIGURAÇÕES
  // ══════════════════════════════════════════════════════════════
  function renderConfig(container) {
    const section = localStorage.getItem('ff_config_section') || 'categorias';

    // ── Card de perfil no topo ──────────────────────────────────────
    const profileData = Store.getProfile();
    const profileName = profileData?.name || Store.PESSOAS[0] || 'Usuário';
    const profileInitial = profileName[0]?.toUpperCase() || '?';
    const profileEmail = (typeof SupabaseSync !== 'undefined' ? SupabaseSync.getUser?.()?.email : null) || '';

    container.innerHTML = `
${section === 'perfil' ? '' : `
<div class="config-profile-card">
  <div class="config-profile-avatar">${profileInitial}</div>
  <div style="flex:1;min-width:0">
    <div class="config-profile-name">${profileName}</div>
    ${profileEmail ? `<div class="config-profile-email">${profileEmail}</div>` : ''}
  </div>
  <button class="btn-outline btn-sm" id="btnEditPerfil">Editar Perfil</button>
</div>`}
<div style="display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:start">
  <aside class="card" style="padding:8px">
    ${[
      { group: 'CONTA' },
      ['perfil',     'user-round',      'Perfil',          'Nome, foto, informações pessoais'],
      ['senha',      'key-round',       'Senha & Segurança','Alterar senha, 2FA'],
      { group: 'FINANÇAS' },
      ['categorias', 'folder-tree',     'Categorias',      'Gerencie categorias e subcategorias'],
      ['tipos',      'tag',             'Tipos',           'Comportamento Minewall'],
      ['pessoas',    'users',           'Grupo Familiar',  'Membros e permissões'],
      ['cotacoes',   'arrow-left-right','Cotações',        'USD, EUR e outras moedas'],
      { group: 'PERSONALIZAÇÃO' },
      ['coach',      'sparkles',        'Haile Coach',     'Personalidade e preferências da IA'],
      ['aparencia',  'palette',         'Aparência',       'Tema claro/escuro'],
      ['notificacoes','bell',           'Notificações',    'Push e e-mail'],
      { group: 'SISTEMA' },
      ['backup',     'database',        'Backup & Dados',  'Exportar, importar, limpar'],
      ['sobre',      'info',            'Sobre',           'Versão e créditos'],
    ].map(item => {
      if (item.group) return `<div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-4);padding:10px 12px 4px;margin-top:4px">${item.group}</div>`;
      const [k, ic, l, sub] = item;
      const isActive = section === k;
      return `<button class="config-tab ${isActive?'active':''}" data-section="${k}"
        style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 12px;border:none;background:${isActive?'var(--bg-elevated)':'transparent'};color:${isActive?'var(--text-1)':'var(--text-2)'};border-radius:8px;cursor:pointer;margin-bottom:1px">
        <span style="flex-shrink:0;color:${isActive?'var(--accent)':'var(--text-3)'}">${icon(ic, { size: 16 })}</span>
        <span style="flex:1;min-width:0">
          <span style="display:block;font-size:13px;font-weight:${isActive?'600':'500'}">${l}</span>
          <span style="display:block;font-size:11px;color:var(--text-4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</span>
        </span>
        <span style="color:var(--text-4);opacity:.5">${icon('chevron-right',{size:14})}</span>
      </button>`;
    }).join('')}
  </aside>
  <main id="configContent"></main>
</div>`;

    container.addEventListener('click', e => {
      const btn = e.target.closest('[data-section]');
      if (!btn) return;
      localStorage.setItem('ff_config_section', btn.dataset.section);
      renderConfig(container);
    });

    const content = document.getElementById('configContent');
    if      (section === 'categorias') renderConfigCategorias(content);
    else if (section === 'tipos')      renderConfigTipos(content);
    else if (section === 'coach')      renderConfigCoach(content);
    else if (section === 'pessoas')    renderConfigPessoas(content);
    else if (section === 'cotacoes')   renderConfigCotacoes(content);
    else if (section === 'aparencia')  renderConfigAparencia(content);
    else if (section === 'backup')        renderConfigBackup(content);
    else if (section === 'perfil')        renderConfigPerfil(content);
    else if (section === 'senha')         renderConfigSenha(content);
    else if (section === 'notificacoes')  renderConfigNotificacoes(content);
    else                                   renderConfigSobre(content);
    upgradeIcons(container);

    document.getElementById('btnEditPerfil')?.addEventListener('click', () => {
      localStorage.setItem('ff_config_section', 'perfil');
      renderConfig(container);
    });
  }

  function renderConfigTipos(content) {
    const tipos = Store.getTipos();
    const cats = Store.categoriesOrdered();
    const COMPORT = {
      essencial:    { label: 'Essencial',    tag: 'SOBREVIVÊNCIA', desc: 'Não posso viver sem isso este mês — sai do Poder de Escolha', impact: 'comprometido' },
      obrigatorio:  { label: 'Obrigatório',  tag: 'IMPOSTO',       desc: 'Imposição externa (pensão, multa, IR) — sai do Poder de Escolha', impact: 'comprometido' },
      comprometido: { label: 'Comprometido', tag: 'COM CUSTO',     desc: 'Tem custo de cancelar — sai do Poder de Escolha', impact: 'comprometido' },
      opcional:     { label: 'Opcional',     tag: 'LIVRE',         desc: 'Posso cortar amanhã sem dor — entra no Poder de Escolha', impact: 'livre' },
      eventual:     { label: 'Eventual',     tag: 'IRREGULAR',     desc: 'Não é mensal, pontual — entra no Poder de Escolha', impact: 'livre' },
    };

    // Conta categorias por tipo + calcula pesos reais a partir das despesas do mês
    const month = getMonth(), year = getYear();
    const receita = Store.sumReceitas(month, year);
    const despMes = Store.despesasByMonth(month, year);
    const totalDesp = despMes.reduce((s, d) => s + d.amount, 0);

    const catsPorTipo = {};
    const valorPorTipo = {};
    tipos.forEach(t => { catsPorTipo[t.id] = []; valorPorTipo[t.id] = 0; });
    cats.forEach(([key, info]) => {
      if (!info || key === 'receita') return;
      const tid = Store.getCatTipo(key);
      if (!catsPorTipo[tid]) { catsPorTipo[tid] = []; valorPorTipo[tid] = 0; }
      catsPorTipo[tid].push({ key, label: info.label, color: info.color, icon: info.icon });
      // Soma despesas dessa categoria no mês
      const catTotal = despMes.filter(d => d.category === key).reduce((s, d) => s + d.amount, 0);
      valorPorTipo[tid] += catTotal;
    });

    // Calcula peso (% da receita) por tipo
    const pesoPorTipo = {};
    tipos.forEach(t => {
      pesoPorTipo[t.id] = receita > 0 ? (valorPorTipo[t.id] / receita * 100) : 0;
    });
    const totalCompr = tipos
      .filter(t => COMPORT[t.comportamento]?.impact === 'comprometido')
      .reduce((s, t) => s + pesoPorTipo[t.id], 0);
    const pctLivre = Math.max(0, 100 - totalCompr);
    const poder = receita - tipos
      .filter(t => COMPORT[t.comportamento]?.impact === 'comprometido')
      .reduce((s, t) => s + valorPorTipo[t.id], 0);

    content.innerHTML = `
<div class="section-header mb-4">
  <div>
    <div class="section-title">Tipos</div>
    <div class="section-sub">Classifique suas categorias por comportamento. Define o que entra no <strong>Poder de Escolha</strong> mensal.</div>
  </div>
  <button class="btn-primary" id="btnAddTipo">+ Novo Tipo</button>
</div>

${receita > 0 ? `
<!-- ── LLP Flow: visualização do Poder de Escolha (redesign 2026-05) ── -->
<div class="llp-flow-card mb-4">
  <div class="llp-flow-label">Como os tipos formam seu Poder de Escolha · ${Utils.monthsFull[month-1]}</div>
  <div class="llp-flow-row">
    <div class="llp-flow-receita">
      <div class="llp-flow-mini-lbl">RECEITA</div>
      <div class="llp-flow-mini-val" style="color:var(--green)">${Utils.currency(receita)}</div>
    </div>
    <div class="llp-flow-op">−</div>
    <div class="llp-flow-compr">
      <div class="llp-flow-mini-lbl">COMPROMETIMENTOS (${totalCompr.toFixed(0)}%)</div>
      <div class="llp-flow-compr-row">
        ${tipos.filter(t => COMPORT[t.comportamento]?.impact === 'comprometido').map(t => `
          <div class="llp-flow-compr-cell" style="flex:${Math.max(1, pesoPorTipo[t.id])};background:${t.color}22;border-color:${t.color}30">
            <div style="display:flex;align-items:center;gap:4px">
              <span style="width:6px;height:6px;border-radius:2px;background:${t.color};flex-shrink:0"></span>
              <span style="font-size:10px;font-weight:600;color:${t.color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.label}</span>
            </div>
            <div style="font-size:11px;font-weight:700;color:var(--text-1);font-variant-numeric:tabular-nums">${pesoPorTipo[t.id].toFixed(0)}%</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="llp-flow-op">→</div>
    <div class="llp-flow-poder">
      <div class="llp-flow-mini-lbl" style="color:rgba(180,175,255,0.6)">PODER DE ESCOLHA</div>
      <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px">${pctLivre.toFixed(0)}%</div>
      <div style="font-size:10px;color:rgba(180,175,255,0.6);font-variant-numeric:tabular-nums">${Utils.currency(Math.max(0, poder))}</div>
    </div>
  </div>

  <div class="llp-flow-stacked">
    ${tipos.map(t => {
      const cmpt = COMPORT[t.comportamento]?.impact === 'comprometido';
      const w = Math.max(0.5, pesoPorTipo[t.id]);
      return `<div title="${t.label}: ${pesoPorTipo[t.id].toFixed(0)}%" style="width:${w}%;background:${t.color};opacity:${cmpt?0.9:0.55}"></div>`;
    }).join('')}
    <div style="flex:1;background:var(--accent-2);opacity:0.7" title="Livre: ${pctLivre.toFixed(0)}%"></div>
  </div>

  <div class="llp-flow-legend">
    ${tipos.map(t => `
      <div class="llp-flow-legend-item">
        <span style="width:7px;height:7px;border-radius:2px;background:${t.color}"></span>
        <span style="color:var(--text-2)">${t.label}</span>
        <span style="color:var(--text-1);font-weight:600;font-variant-numeric:tabular-nums">${pesoPorTipo[t.id].toFixed(0)}%</span>
      </div>
    `).join('')}
    <div class="llp-flow-legend-item">
      <span style="width:7px;height:7px;border-radius:2px;background:var(--accent-2);opacity:0.7"></span>
      <span style="color:var(--text-2)">Livre</span>
      <span style="color:var(--accent-2);font-weight:600;font-variant-numeric:tabular-nums">${pctLivre.toFixed(0)}%</span>
    </div>
  </div>

  <div class="llp-flow-caption">
    <span style="color:var(--red);font-weight:600">Essencial</span>,
    <span style="color:var(--blue);font-weight:600">Obrigatório</span> e
    <span style="color:var(--amber);font-weight:600">Comprometido</span>
    reduzem seu Poder de Escolha antes do mês começar.
    <span style="color:var(--green);font-weight:600">Opcional</span> e
    <span style="color:var(--accent-2);font-weight:600">Eventual</span>
    são gastos <em>dentro</em> do que sobra — você decide.
  </div>
</div>
` : ''}

<div class="tipos-grid">
${tipos.map(t => {
  const info = COMPORT[t.comportamento] || COMPORT.opcional;
  const catsAqui = catsPorTipo[t.id] || [];
  const peso = pesoPorTipo[t.id] || 0;
  return `
  <div class="tipo-card-redesign" style="--tipo-color:${t.color}">
    <div class="tipo-card-actions-top">
      <button class="btn-icon-sm" data-edit-tipo="${t.id}" title="Editar">${icon('pencil', {size:14})}</button>
      ${!t.builtin ? `<button class="btn-icon-sm danger" data-del-tipo="${t.id}" title="Remover">${icon('trash-2', {size:14})}</button>` : ''}
    </div>
    <div class="tipo-card-head">
      <span class="tipo-card-tag" style="background:${t.color}22;color:${t.color}">${info.tag}</span>
      ${t.builtin ? `<span style="font-size:10px;color:var(--text-4);font-weight:500">padrão</span>` : ''}
    </div>
    <div class="tipo-card-name">${t.label}</div>
    <div class="tipo-card-headline" style="color:${t.color}">${info.desc.split(' — ')[0]}</div>
    ${t.desc && t.desc !== info.desc ? `<div class="tipo-card-desc">${t.desc}</div>` : `<div class="tipo-card-desc">${info.desc.split(' — ')[1] || ''}</div>`}
    <div class="tipo-card-meta">
      <span>${catsAqui.length} categoria${catsAqui.length===1?'':'s'}</span>
      ${peso > 0 ? `<span class="tipo-card-peso" style="color:${t.color}">${peso.toFixed(0)}% da receita</span>` : ''}
    </div>
    ${catsAqui.length > 0 ? `<div class="tipo-card-chips">
      ${catsAqui.slice(0,8).map(c => `<span style="background:${c.color}20;color:${c.color}">${c.label}</span>`).join('')}
      ${catsAqui.length>8?`<span style="background:transparent;color:var(--text-4)">+${catsAqui.length-8}</span>`:''}
    </div>` : ''}
  </div>`;
}).join('')}
</div>

<div class="section-header mb-3" style="margin-top:28px">
  <div>
    <div class="section-title" style="font-size:14px">Atribuição de categorias</div>
    <div class="section-sub">Clique no badge pra trocar o tipo de cada categoria. As subcategorias herdam (mas podem ser sobrescritas em Categorias).</div>
  </div>
</div>
<div class="card" style="padding:0">
  <div class="table-wrap"><table class="data-table">
    <thead><tr><th>Categoria</th><th>Tipo atual</th><th></th></tr></thead>
    <tbody>
    ${cats.filter(([k]) => k !== 'receita').map(([key, info]) => {
      if (!info) return '';
      const tid = Store.getCatTipo(key);
      const t = Store.getTipoById(tid) || tipos[0];
      return `
      <tr>
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${info.color};margin-right:8px;vertical-align:middle"></span><strong>${info.label}</strong></td>
        <td><span style="display:inline-block;background:${t.color}20;color:${t.color};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600">${t.icon||''} ${t.label}</span></td>
        <td style="text-align:right"><button class="btn-xs" data-set-cat-tipo="${key}">Trocar</button></td>
      </tr>`;
    }).join('')}
    </tbody>
  </table></div>
</div>`;

    document.getElementById('btnAddTipo')?.addEventListener('click', () => _openTipoModal(null, () => renderConfigTipos(content)));

    content.addEventListener('click', e => {
      const edit = e.target.closest('[data-edit-tipo]');
      if (edit) { const t = tipos.find(x => x.id === edit.dataset.editTipo); if (t) _openTipoModal(t, () => renderConfigTipos(content)); return; }
      const del = e.target.closest('[data-del-tipo]');
      if (del) {
        if (!confirm('Remover este tipo? Categorias que o usam voltam pra "Opcional".')) return;
        try { Store.deleteTipo(del.dataset.delTipo); renderConfigTipos(content); toast('Tipo removido', 'success'); }
        catch (err) { toast(err.message, 'error'); }
        return;
      }
      const setCat = e.target.closest('[data-set-cat-tipo]');
      if (setCat) {
        const catKey = setCat.dataset.setCatTipo;
        const tuple = cats.find(([k]) => k === catKey);
        if (tuple) _openSelectTipoForCat({ key: tuple[0], label: tuple[1].label, color: tuple[1].color, icon: tuple[1].icon }, () => renderConfigTipos(content));
      }
    });
    upgradeIcons(content);
  }

  function _openTipoModal(tipo, onSaved) {
    const isEdit = !!tipo;
    const t = tipo || {};
    const isBuiltin = !!t.builtin;
    const COMPORT_OPTS = [
      ['essencial',    'shield-alert',  '#EF4444', 'Essencial',    'Não posso viver sem isso este mês'],
      ['obrigatorio',  'scale',         '#A78BFA', 'Obrigatório',  'Imposição externa (pensão, multa, IR)'],
      ['comprometido', 'lock',          '#F59E0B', 'Comprometido', 'Posso cortar mas com custo de cancelar'],
      ['opcional',     'circle-check',  '#22C55E', 'Opcional',     'Posso cortar amanhã sem dor'],
      ['eventual',     'calendar-days', '#0EA5E9', 'Eventual',     'Não é mensal — pontual'],
    ];
    const COLORS = ['#EF4444','#A78BFA','#F59E0B','#22C55E','#0EA5E9','#7C6EF8','#14B8A6','#EC4899','#F97316','#06B6D4'];
    const html = `
<div class="form-grid">
  <div class="form-group form-full">
    <label class="form-label">Nome</label>
    <input class="form-input" id="fTLabel" value="${t.label || ''}" ${isBuiltin ? 'disabled style="opacity:0.6"' : ''} placeholder="Ex.: Qualidade de Vida">
    ${isBuiltin ? '<div style="font-size:11px;color:var(--text-4);margin-top:4px">Tipos padrão não podem ser renomeados</div>' : ''}
  </div>
  <div class="form-group form-full">
    <label class="form-label">Descrição</label>
    <input class="form-input" id="fTDesc" value="${t.desc || ''}" placeholder="Quando esse tipo se aplica? Ex.: itens que melhoram meu dia mas posso cortar">
  </div>
  <div class="form-group">
    <label class="form-label">Ícone</label>
    <input class="form-input" id="fTIcon" value="${t.icon || '✦'}" maxlength="2" placeholder="🎯">
  </div>
  <div class="form-group">
    <label class="form-label">Cor</label>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
      ${COLORS.map(c => `<label style="cursor:pointer"><input type="radio" name="fTColor" value="${c}" ${(t.color===c||(!t.color&&c===COLORS[5]))?'checked':''} style="display:none"><span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:${c};border:2px solid ${t.color===c?'#fff':'transparent'};box-shadow:0 0 0 2px ${t.color===c?c:'transparent'}"></span></label>`).join('')}
    </div>
  </div>
  <div class="form-group form-full">
    <label class="form-label">Comportamento financeiro ${isBuiltin?'<span style="font-size:11px;color:var(--text-4);font-weight:500">(não editável em tipo padrão)</span>':''}</label>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
      ${COMPORT_OPTS.map(([v, iconName, color, label, desc]) => `
        <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;cursor:${isBuiltin?'default':'pointer'};${(t.comportamento||'opcional')===v?'background:var(--bg-elevated);border-color:var(--accent)':''}">
          <input type="radio" name="fTComp" value="${v}" ${(t.comportamento||'opcional')===v?'checked':''} ${isBuiltin?'disabled':''}>
          <div style="width:28px;height:28px;border-radius:8px;background:${color}1a;color:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon(iconName, { size: 16, color })}</div>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text-1)">${label}</div>
            <div style="font-size:11px;color:var(--text-3)">${desc}</div>
          </div>
        </label>`).join('')}
    </div>
  </div>
</div>`;
    Modal.open(isEdit ? `Editar Tipo — ${t.label}` : 'Novo Tipo', html, () => {
      const label = document.getElementById('fTLabel').value.trim();
      const descricao = document.getElementById('fTDesc').value.trim();
      const icon = document.getElementById('fTIcon').value.trim() || '✦';
      const colorEl = document.querySelector('input[name="fTColor"]:checked');
      const compEl = document.querySelector('input[name="fTComp"]:checked');
      const color = colorEl ? colorEl.value : '#7C6EF8';
      const comportamento = compEl ? compEl.value : 'opcional';
      try {
        if (isEdit) {
          const patch = { icon, color, desc: descricao };
          if (!isBuiltin) { patch.label = label; patch.comportamento = comportamento; }
          Store.updateTipo(t.id, patch);
          toast('Tipo atualizado', 'success');
        } else {
          if (!label) return toast('Informe o nome', 'error');
          Store.addTipo({ label, descricao, color, icon, comportamento });
          toast('Tipo criado', 'success');
        }
      } catch (err) { return toast(err.message, 'error'); }
      Modal.close();
      if (onSaved) onSaved();
    });
  }

  function _openSelectTipoForCat(cat, onSaved) {
    const tipos = Store.getTipos();
    const current = Store.getCatTipo(cat.key);
    const html = `
<div class="form-group form-full">
  <label class="form-label">Tipo da categoria "${cat.label}"</label>
  <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
    ${tipos.map(t => `
    <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;${current===t.id?'background:var(--bg-elevated);border-color:'+t.color:''}">
      <input type="radio" name="catTipo" value="${t.id}" ${current===t.id?'checked':''}>
      <span style="font-size:18px">${t.icon||'✦'}</span>
      <div>
        <div style="font-size:13px;font-weight:600;color:${t.color}">${t.label}</div>
        <div style="font-size:11px;color:var(--text-3)">${t.desc || ''}</div>
      </div>
    </label>`).join('')}
  </div>
</div>
<div style="font-size:11px;color:var(--text-3);margin-top:8px">Subcategorias dessa categoria que não tinham tipo próprio herdam essa escolha.</div>`;
    Modal.open('Mover categoria de tipo', html, () => {
      const sel = document.querySelector('input[name="catTipo"]:checked');
      if (!sel) return Modal.close();
      Store.setCatTipo(cat.key, sel.value);
      Modal.close();
      toast(`"${cat.label}" movida pra ${Store.getTipoById(sel.value)?.label}`, 'success');
      if (onSaved) onSaved();
    });
  }

  function renderConfigCategorias(content) {
    const cats = Store.categoriesOrdered();
    content.innerHTML = `
<div class="section-header mb-4">
  <div><div class="section-title">Categorias & Subcategorias</div>
  <div class="section-sub">Adicione, renomeie ou exclua categorias e suas subcategorias</div></div>
  <button class="btn-primary" id="btnAddCat">+ Nova Categoria</button>
</div>

<div id="catSortList" style="display:flex;flex-direction:column;gap:8px">
  ${cats.map(([key, info]) => {
    const usage = Store.getCategoriaUsage(key);
    const subs = Store.SUBCATEGORIES[key] || [];
    const isProtected = key === 'receita';
    return `
    <details class="card" draggable="true" data-cat-key="${key}" style="padding:0;cursor:grab">
      <summary style="display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;list-style:none">
        <span style="font-size:16px;color:var(--text-4);cursor:grab" title="Arrastar para reordenar">⠿</span>
        <span style="width:36px;height:36px;border-radius:10px;background:${info.color}1a;color:${info.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon(info.icon || 'tag', { size: 18, color: info.color })}</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:var(--text-1)">${info.label}</div>
          <div style="font-size:11px;color:var(--text-4)">key: <code>${key}</code> · ${usage} lançamento(s) · ${subs.length} subcat.</div>
        </div>
        <span class="badge" style="background:${info.color}20;color:${info.color}">${info.color}</span>
        <button class="btn-icon-sm" data-action="edit-cat" data-key="${key}" title="Editar">${icon('pencil', {size:14})}</button>
        ${isProtected ? '<span class="badge badge-amber" title="Reservada">🔒</span>'
          : `<button class="btn-xs btn-red" data-action="del-cat" data-key="${key}" ${usage>0?'disabled style="opacity:.4;cursor:not-allowed"':''} title="${usage>0?'Existem lançamentos':'Excluir'}">✕</button>`}
      </summary>
      <div style="padding:0 16px 14px 60px">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Subcategorias</div>
        ${subs.length === 0 ? '<div style="font-size:12px;color:var(--text-4);font-style:italic;padding:4px 0">Nenhuma subcategoria</div>'
          : subs.map(s => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px dashed var(--border)">
              <span style="flex:1;font-size:13px;color:var(--text-2)">${s}</span>
              <button class="btn-icon-sm" data-action="ren-sub" data-cat="${key}" data-sub="${s.replace(/"/g,'&quot;')}" title="Renomear">${icon('pencil', {size:14})}</button>
              <button class="btn-icon-sm danger" data-action="del-sub" data-cat="${key}" data-sub="${s.replace(/"/g,'&quot;')}" title="Excluir">${icon('trash-2', {size:14})}</button>
            </div>`).join('')}
        <button class="btn-xs" style="margin-top:10px" data-action="add-sub" data-cat="${key}">+ Subcategoria</button>
      </div>
    </details>`;
  }).join('')}
</div>`;

    // ── Drag-and-drop reorder ─────────────────────────────────────
    let dragSrc = null;
    const list = document.getElementById('catSortList');
    list.querySelectorAll('[data-cat-key]').forEach(el => {
      el.addEventListener('dragstart', e => {
        dragSrc = el;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => el.style.opacity = '0.4', 0);
      });
      el.addEventListener('dragend', () => { el.style.opacity = ''; dragSrc = null; });
      el.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (el !== dragSrc) el.style.outline = '2px dashed var(--accent)';
      });
      el.addEventListener('dragleave', () => { el.style.outline = ''; });
      el.addEventListener('drop', e => {
        e.preventDefault();
        el.style.outline = '';
        if (!dragSrc || dragSrc === el) return;
        const items = [...list.querySelectorAll('[data-cat-key]')];
        const fromIdx = items.indexOf(dragSrc);
        const toIdx   = items.indexOf(el);
        const order = items.map(i => i.dataset.catKey);
        order.splice(fromIdx, 1);
        order.splice(toIdx, 0, dragSrc.dataset.catKey);
        Store.setCategoryOrder(order);
        renderConfigCategorias(content);
        toast('Ordem salva', 'success');
      });
    });

    document.getElementById('btnAddCat').addEventListener('click', () => openCategoriaModal(null));
    content.querySelectorAll('[data-action="edit-cat"]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openCategoriaModal(b.dataset.key); }));
    content.querySelectorAll('[data-action="del-cat"]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      if (!confirm(`Excluir a categoria "${Store.CATEGORIES[b.dataset.key].label}"?`)) return;
      try { Store.deleteCategoria(b.dataset.key); renderConfigCategorias(content); toast('Categoria excluída', 'success'); }
      catch (err) { toast(err.message, 'error'); }
    }));
    content.querySelectorAll('[data-action="add-sub"]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      const name = prompt('Nome da subcategoria:');
      if (!name) return;
      try { Store.addSubcategoria(b.dataset.cat, name); renderConfigCategorias(content); toast('Subcategoria adicionada', 'success'); }
      catch (err) { toast(err.message, 'error'); }
    }));
    content.querySelectorAll('[data-action="ren-sub"]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      const old = b.dataset.sub;
      const newName = prompt('Novo nome:', old);
      if (!newName || newName === old) return;
      try { Store.renameSubcategoria(b.dataset.cat, old, newName); renderConfigCategorias(content); toast('Subcategoria renomeada (lançamentos atualizados)', 'success'); }
      catch (err) { toast(err.message, 'error'); }
    }));
    content.querySelectorAll('[data-action="del-sub"]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      if (!confirm(`Excluir a subcategoria "${b.dataset.sub}"?`)) return;
      try { Store.deleteSubcategoria(b.dataset.cat, b.dataset.sub); renderConfigCategorias(content); toast('Subcategoria excluída', 'success'); }
      catch (err) { toast(err.message, 'error'); }
    }));
    upgradeIcons(content);
  }

  // Set curado de ícones Lucide relevantes para categorias financeiras
  const CATEGORY_ICONS = [
    'home','sofa','utensils','shopping-cart','shopping-bag','car','fuel','plane','train',
    'heart','stethoscope','pill','dumbbell','smile','baby','dog','cat','book-open','graduation-cap',
    'film','music','gamepad-2','party-popper','tv','gift','sparkles','star','cake','wine',
    'briefcase','laptop','phone','wifi','zap','droplet','flame','wrench','hammer','spray-can',
    'banknote','credit-card','wallet','trending-up','piggy-bank','landmark','receipt','scale','tag',
    'sun','tree-pine','flower','globe','map-pin','umbrella','shirt','scissors','glasses',
  ];
  function openCategoriaModal(key) {
    const isEdit = !!key;
    const c = isEdit ? Store.CATEGORIES[key] : { label:'', icon:'tag', color:'#7C6EF8' };
    // Normaliza ícone legado (emoji) → 'tag' se não estiver na lista Lucide
    const currentIcon = CATEGORY_ICONS.includes(c.icon) ? c.icon : 'tag';
    const COLOR_SWATCHES = ['#7C6EF8','#22C55E','#3B82F6','#EC4899','#F59E0B','#F97316','#14B8A6','#6366F1','#8B5CF6','#EF4444','#0EA5E9','#D946EF','#84CC16','#06B6D4'];
    const html = `<div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Nome</label><input class="form-input" id="fCatLabel" value="${c.label}" placeholder="Ex: Educação"/></div>
      <div class="form-group form-full">
        <label class="form-label">Ícone</label>
        <div class="cat-icon-grid">
          ${CATEGORY_ICONS.map(n => `<button type="button" class="cat-icon-pick ${n === currentIcon ? 'active' : ''}" data-icon="${n}" title="${n}">${icon(n, { size: 18 })}</button>`).join('')}
        </div>
        <input type="hidden" id="fCatIcon" value="${currentIcon}">
      </div>
      <div class="form-group form-full">
        <label class="form-label">Cor</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
          ${COLOR_SWATCHES.map(col => `<button type="button" data-color="${col}" class="cat-color-pick ${col.toLowerCase() === c.color.toLowerCase() ? 'active' : ''}" style="width:28px;height:28px;border-radius:50%;background:${col};border:2px solid ${col.toLowerCase() === c.color.toLowerCase() ? '#fff' : 'transparent'};box-shadow:0 0 0 2px ${col.toLowerCase() === c.color.toLowerCase() ? col : 'transparent'};cursor:pointer"></button>`).join('')}
        </div>
        <input type="hidden" id="fCatColor" value="${c.color}">
      </div>
    </div>`;
    Modal.open(isEdit?'Editar Categoria':'Nova Categoria', html, () => {
      const label = document.getElementById('fCatLabel').value.trim();
      const ic = document.getElementById('fCatIcon').value.trim() || 'tag';
      const color = document.getElementById('fCatColor').value;
      if (!label) return toast('Nome obrigatório', 'error');
      try {
        if (isEdit) Store.updateCategoria(key, { label, icon: ic, color });
        else Store.addCategoria({ label, icon: ic, color });
        Modal.close();
        renderConfigCategorias(document.getElementById('configContent'));
        toast(isEdit?'Categoria atualizada':'Categoria criada', 'success');
      } catch (err) { toast(err.message, 'error'); }
    });
    // Interatividade: seleção de ícone e cor
    setTimeout(() => {
      const modal = document.getElementById('modal');
      modal.querySelectorAll('[data-icon]').forEach(btn => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('[data-icon]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById('fCatIcon').value = btn.dataset.icon;
        });
      });
      modal.querySelectorAll('[data-color]').forEach(btn => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('[data-color]').forEach(b => {
            b.classList.remove('active');
            b.style.border = '2px solid transparent';
            b.style.boxShadow = '0 0 0 2px transparent';
          });
          btn.classList.add('active');
          btn.style.border = '2px solid #fff';
          btn.style.boxShadow = `0 0 0 2px ${btn.dataset.color}`;
          document.getElementById('fCatColor').value = btn.dataset.color;
        });
      });
    }, 50);
  }

  function renderConfigCoach(content) {
    const data = Store.get();
    const current = (data.settings && data.settings.coachPersonality) || 'mentor';
    const personalities = [
      { key: 'mentor',       iconName: 'heart-handshake', label: 'Mentor', short: 'Conselho dos pais',
        desc: 'Acolhedor, paciente, encorajador. Celebra conquistas com genuinidade, sugere sem impor.',
        sample: '"Que bom ver que você economizou R$ 450 este mês! Que tal direcionar uma parte para a viagem da família? Vocês merecem esse descanso."' },
      { key: 'educador',     iconName: 'graduation-cap', label: 'Educador', short: 'Mestre paciente',
        desc: 'Didático, explicativo. Ensina o "porquê" junto com o "o quê". Usa analogias do dia-a-dia.',
        sample: '"Aporte de R$ 500/mês no CDB 100% CDI rende mais que poupança porque o CDI hoje está em 14,40% a.a. (poupança rende ~6,17%). Em 12 meses, a diferença gira em torno de R$ 240."' },
      { key: 'profissional', iconName: 'briefcase', label: 'Profissional', short: 'CFO pessoal',
        desc: 'Direto, técnico, sério. Respeita seu tempo, foca em dados. Sem rodeios emocionais.',
        sample: '"Seu Poder de Escolha este mês é R$ 4.850. Considerando seu comprometimento de 65%, há espaço para aporte adicional de R$ 800 sem risco."' },
    ];

    content.innerHTML = `
<div class="section-header mb-4">
  <div>
    <div class="section-title">Personalidade do Haile</div>
    <div class="section-sub">Escolha o tom de voz com que o Coach conversa com você. Você pode mudar a qualquer momento.</div>
  </div>
</div>

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:20px">
${personalities.map(p => `
  <button class="coach-persona-card ${current === p.key ? 'active' : ''}" data-persona="${p.key}"
    style="background:${current===p.key?'var(--haile-indigo-soft)':'var(--bg-card)'};border:1px solid ${current===p.key?'var(--haile-indigo)':'var(--border)'};border-radius:var(--radius-lg);padding:18px;text-align:left;cursor:pointer;transition:all var(--t-fast);color:var(--text-1)">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg, var(--haile-indigo), var(--haile-teal));display:flex;align-items:center;justify-content:center;color:#fff">${icon(p.iconName, { size: 18, color: '#fff' })}</div>
      <div>
        <div style="font-size:14px;font-weight:700;color:${current===p.key?'var(--haile-indigo-deep)':'var(--text-1)'}">${p.label}</div>
        <div style="font-size:11px;color:var(--text-3)">${p.short}</div>
      </div>
      ${current === p.key ? '<div style="margin-left:auto;font-size:11px;color:var(--haile-indigo);font-weight:600">✓ Ativa</div>' : ''}
    </div>
    <div style="font-size:12px;color:var(--text-2);line-height:1.5;margin-bottom:10px">${p.desc}</div>
    <div style="font-size:11px;color:var(--text-3);font-style:italic;line-height:1.5;padding-top:10px;border-top:1px dashed var(--border)">
      ${p.sample}
    </div>
  </button>
`).join('')}
</div>

<div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:12px 14px;font-size:12px;color:var(--text-3);line-height:1.6">
  <strong style="color:var(--text-2)">Em breve:</strong> personalidades de "guru" — coaches financeiros licenciados com tom de figuras conhecidas do mercado brasileiro. Cobrança separada.
</div>`;

    content.addEventListener('click', e => {
      const btn = e.target.closest('[data-persona]');
      if (!btn) return;
      const key = btn.dataset.persona;
      if (!data.settings) data.settings = {};
      data.settings.coachPersonality = key;
      Store.persist();
      renderConfigCoach(content);
      toast(`Personalidade alterada para ${personalities.find(p => p.key === key)?.label}`, 'success');
    });
    upgradeIcons(content);
  }

  function renderConfigPessoas(content) {
    const pessoas = Store.PESSOAS;
    const isConnected = typeof SupabaseSync !== 'undefined' && SupabaseSync.isConnected();
    const ctx = typeof SupabaseSync !== 'undefined' ? SupabaseSync.getFamilyContext() : null;
    const isAdmin = !ctx || ctx.role === 'admin';

    content.innerHTML = `
<div class="section-header mb-4">
  <div><div class="section-title">Grupo Familiar</div>
  <div class="section-sub">Pessoas usadas em Receitas, Contratos e Rateios</div></div>
  <button class="btn-primary" id="btnAddPessoa">+ Nova Pessoa</button>
</div>
<div style="display:flex;flex-direction:column;gap:8px" id="pessoasList">
  ${pessoas.map(p => {
    const usage = Store.get().receitas.filter(r => r.person === p).length;
    return `
    <div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 16px">
      ${Utils.personAvatarHtml(p, { size: 36, fontSize: 14 })}
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700;color:var(--text-1)">${p}</div>
        <div style="font-size:11px;color:var(--text-4)">${usage} receita(s) vinculada(s)</div>
      </div>
      <button class="btn-icon-sm" data-action="ren-pessoa" data-name="${p}" title="Renomear">${icon('pencil', {size:14})}</button>
      <button class="btn-xs btn-red" data-action="del-pessoa" data-name="${p}" ${usage>0?'disabled style="opacity:.4;cursor:not-allowed"':''}>✕</button>
    </div>`;
  }).join('')}
</div>

${isConnected && isAdmin ? `
<!-- ── Acesso na Nuvem ── -->
<div class="section-header mb-4" style="margin-top:32px">
  <div>
    <div class="section-title">Acesso na Nuvem</div>
    <div class="section-sub">Convide membros da família para acessar o Haile</div>
  </div>
</div>
<div class="card" style="padding:16px 20px;margin-bottom:12px">
  <div style="font-size:12px;color:var(--text-3);margin-bottom:12px">Convidar novo membro</div>
  <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
    <div style="flex:1;min-width:160px">
      <label class="form-label" style="font-size:10px">E-mail</label>
      <input class="form-input" id="fInviteEmail" type="email" placeholder="email@exemplo.com" style="font-size:13px"/>
    </div>
    <div style="width:140px">
      <label class="form-label" style="font-size:10px">Perfil</label>
      <select class="form-input" id="fInviteRole" style="font-size:13px">
        <option value="editor">Editor (acesso total)</option>
        <option value="member">Membro (só os próprios)</option>
      </select>
    </div>
    <div style="width:130px;display:none" id="fPessoaGroup">
      <label class="form-label" style="font-size:10px">Pessoa local</label>
      <select class="form-input" id="fInvitePessoa" style="font-size:13px">
        ${Store.PESSOAS.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
    </div>
    <button class="btn-primary" id="btnInvite" style="white-space:nowrap">Convidar</button>
  </div>
  <div style="margin-top:8px;font-size:11px;color:var(--text-4)">
    Editor: vê e edita tudo · Membro: selecione qual pessoa local corresponde a este usuário
  </div>
</div>
<div id="familyMembersList"><div style="font-size:12px;color:var(--text-4);padding:8px">Carregando membros…</div></div>
` : isConnected && !isAdmin ? `
<div class="card" style="padding:16px;margin-top:24px;border-color:var(--accent)20">
  <div style="font-size:13px;color:var(--text-2)">Você está conectado como <strong style="color:var(--accent)">${ctx.role}</strong> na família.</div>
  <div style="font-size:11px;color:var(--text-4);margin-top:4px">Apenas o administrador pode gerenciar membros.</div>
</div>
` : `
<div class="card" style="padding:16px;margin-top:24px;border-style:dashed">
  <div style="font-size:13px;color:var(--text-3)">Faça login com sua conta Supabase para habilitar o acesso multi-usuário.</div>
</div>
`}`;

    document.getElementById('btnAddPessoa').addEventListener('click', () => {
      const name = prompt('Nome da pessoa:');
      if (!name) return;
      try { Store.addPessoa(name); renderConfigPessoas(content); toast('Pessoa cadastrada', 'success'); }
      catch (err) { toast(err.message, 'error'); }
    });
    content.querySelectorAll('[data-action="ren-pessoa"]').forEach(b => b.addEventListener('click', () => {
      const old = b.dataset.name;
      const newName = prompt('Novo nome:', old);
      if (!newName || newName === old) return;
      try { Store.renamePessoa(old, newName); renderConfigPessoas(content); toast('Pessoa renomeada (receitas atualizadas)', 'success'); }
      catch (err) { toast(err.message, 'error'); }
    }));
    content.querySelectorAll('[data-action="del-pessoa"]').forEach(b => b.addEventListener('click', () => {
      if (!confirm(`Excluir "${b.dataset.name}"?`)) return;
      try { Store.deletePessoa(b.dataset.name); renderConfigPessoas(content); toast('Pessoa excluída', 'success'); }
      catch (err) { toast(err.message, 'error'); }
    }));

    if (isConnected && isAdmin) {
      _loadFamilyMembers();

      // Show/hide pessoa selector based on role
      document.getElementById('fInviteRole').addEventListener('change', e => {
        const pg = document.getElementById('fPessoaGroup');
        if (pg) pg.style.display = e.target.value === 'member' ? 'block' : 'none';
      });

      document.getElementById('btnInvite').addEventListener('click', async () => {
        const email = document.getElementById('fInviteEmail').value.trim();
        const role  = document.getElementById('fInviteRole').value;
        const pessoaName = role === 'member' ? (document.getElementById('fInvitePessoa')?.value || null) : null;
        if (!email) return toast('Informe o e-mail', 'error');
        if (role === 'member' && !pessoaName) return toast('Selecione a pessoa local para o membro', 'error');
        const btn = document.getElementById('btnInvite');
        btn.disabled = true; btn.textContent = 'Enviando…';
        const { error, emailResult } = await SupabaseSync.inviteMember(email, role, pessoaName);
        btn.disabled = false; btn.textContent = 'Convidar';
        if (error) return toast(typeof error === 'string' ? error : (error.message || 'Erro ao convidar'), 'error');
        document.getElementById('fInviteEmail').value = '';
        if (emailResult?.sent) {
          toast(`Convite enviado para ${email} — pedimos para verificar o e-mail.`, 'success');
        } else if (emailResult?.alreadyExists) {
          toast(`${email} já tem conta. O vínculo é feito no próximo login dela.`, 'info');
        } else {
          toast(`Convite registrado para ${email}, mas o e-mail não foi enviado. Avise manualmente.`, 'error');
        }
        _loadFamilyMembers();
      });
    }

    async function _loadFamilyMembers() {
      const listEl = document.getElementById('familyMembersList');
      if (!listEl) return;
      const group = await SupabaseSync.getFamilyGroup();
      if (!group) {
        listEl.innerHTML = '<div style="font-size:12px;color:var(--text-4);padding:8px">Nenhum grupo criado ainda. Convide um membro para criar automaticamente.</div>';
        return;
      }
      const members = await SupabaseSync.getFamilyMembers(group.id);
      if (!members.length) {
        listEl.innerHTML = '<div style="font-size:12px;color:var(--text-4);padding:8px">Nenhum membro convidado ainda.</div>';
        return;
      }
      const ROLE_LABELS = { admin: 'Admin', editor: 'Editor', member: 'Membro' };
      const ROLE_COLORS = { admin: 'var(--accent)', editor: 'var(--green)', member: 'var(--amber)' };
      const STATUS_LABELS = { active: 'Ativo', pending: 'Pendente', expired: 'Expirado' };
      const STATUS_COLORS = { active: 'var(--green)', pending: 'var(--amber)', expired: 'var(--red, #C92764)' };

      function _daysUntil(iso) {
        const ms = new Date(iso).getTime() - Date.now();
        return Math.ceil(ms / 86400000);
      }
      function _agoLabel(iso) {
        const d = _daysUntil(iso);
        if (d > 1)  return `expira em ${d} dias`;
        if (d === 1) return 'expira amanhã';
        if (d === 0) return 'expira hoje';
        return `expirou há ${Math.abs(d)} dia${Math.abs(d) > 1 ? 's' : ''}`;
      }

      listEl.innerHTML = `
<div style="display:flex;flex-direction:column;gap:6px">
  ${members.map(m => {
    const email = m.invited_email || '—';
    const role  = m.role;
    const status = SupabaseSync.inviteStatus(m);
    const isActive  = status === 'active';
    const isPending = status === 'pending';
    const isExpired = status === 'expired';

    const subParts = [];
    if (isActive)  subParts.push('Ativo desde ' + new Date(m.accepted_at).toLocaleDateString('pt-BR'));
    if (isPending) subParts.push(m.expires_at ? _agoLabel(m.expires_at) : 'Aguardando login');
    if (isExpired) subParts.push(_agoLabel(m.expires_at));
    if (m.last_resent_at && (isPending || isExpired)) {
      subParts.push('reenviado em ' + new Date(m.last_resent_at).toLocaleDateString('pt-BR'));
    }
    if (m.pessoa_name) subParts.push(`→ ${m.pessoa_name}`);
    const sub = subParts.join(' · ');

    const actions = isActive
      ? `<button class="btn-icon-sm danger" data-action="remove" data-member-id="${m.id}" title="Remover acesso">${icon('user-minus', {size:14})}</button>`
      : `
        <button class="btn-icon-sm" data-action="resend" data-member-id="${m.id}" title="Reenviar convite" style="color:var(--accent)">${icon('refresh-cw', {size:14})}</button>
        <button class="btn-icon-sm danger" data-action="cancel" data-member-id="${m.id}" title="Cancelar convite">${icon('x', {size:14})}</button>
      `;

    return `
    <div class="card" style="display:flex;align-items:center;gap:12px;padding:10px 16px">
      <div class="person-avatar" style="background:${ROLE_COLORS[role]}20;color:${ROLE_COLORS[role]};width:34px;height:34px;font-size:12px;font-weight:700;border:1px solid ${ROLE_COLORS[role]}40">
        ${email.slice(0,2).toUpperCase()}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${email}</div>
        <div style="font-size:11px;color:var(--text-4)">${sub}</div>
      </div>
      <span class="badge" style="background:${STATUS_COLORS[status]}1a;color:${STATUS_COLORS[status]};border:1px solid ${STATUS_COLORS[status]}40;font-size:10px">${STATUS_LABELS[status]}</span>
      <span class="badge" style="background:${ROLE_COLORS[role]}20;color:${ROLE_COLORS[role]}">${ROLE_LABELS[role]||role}</span>
      <div style="display:flex;gap:4px">${actions}</div>
    </div>`;
  }).join('')}
</div>`;

      upgradeIcons(listEl);

      // Remover (ativo)
      listEl.querySelectorAll('[data-action="remove"]').forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Remover acesso deste membro? Ele perde acesso ao grupo imediatamente.')) return;
        await SupabaseSync.removeMember(b.dataset.memberId);
        toast('Membro removido', 'success');
        _loadFamilyMembers();
      }));

      // Cancelar (pendente/expirado)
      listEl.querySelectorAll('[data-action="cancel"]').forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Cancelar este convite? Pode convidar novamente depois.')) return;
        await SupabaseSync.removeMember(b.dataset.memberId);
        toast('Convite cancelado', 'success');
        _loadFamilyMembers();
      }));

      // Reenviar (pendente/expirado)
      listEl.querySelectorAll('[data-action="resend"]').forEach(b => b.addEventListener('click', async () => {
        const btn = b;
        btn.disabled = true;
        const { error, emailResult } = await SupabaseSync.resendInvite(btn.dataset.memberId);
        btn.disabled = false;
        if (error) return toast(typeof error === 'string' ? error : (error.message || 'Erro ao reenviar'), 'error');
        if (emailResult?.sent) toast('Convite reenviado e validade estendida por 7 dias', 'success');
        else                   toast('Validade estendida — verifique se o e-mail chegou', 'info');
        _loadFamilyMembers();
      }));
    }
  }

  function renderConfigCotacoes(content) {
    const s = Store.get().settings;
    content.innerHTML = `
<div class="section-header mb-4">
  <div><div class="section-title">Cotações de Moeda</div>
  <div class="section-sub">Conversão de ativos em USD e EUR para BRL no Patrimônio</div></div>
</div>
<div class="card">
  <div class="form-grid">
    <div class="form-group"><label class="form-label">USD → BRL</label><input class="form-input" id="fUsd" type="number" step="0.0001" value="${s.usdBrl}"/></div>
    <div class="form-group"><label class="form-label">EUR → BRL</label><input class="form-input" id="fEur" type="number" step="0.0001" value="${s.eurBrl}"/></div>
  </div>
  <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
    <button class="btn-primary" id="btnSaveRates">Salvar</button>
  </div>
</div>`;
    document.getElementById('btnSaveRates').addEventListener('click', () => {
      const usdBrl = parseFloat(document.getElementById('fUsd').value);
      const eurBrl = parseFloat(document.getElementById('fEur').value);
      if (!usdBrl || !eurBrl) return toast('Informe valores válidos', 'error');
      Store.updateSettings({ usdBrl, eurBrl });
      toast('Cotações atualizadas', 'success');
    });
  }

  function _doExportBackup() {
    const blob = new Blob([JSON.stringify(Store.exportData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `haile-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup exportado', 'success');
  }

  function _doImportBackup(file) {
    if (!file) return;
    if (!confirm('Importar este backup vai SUBSTITUIR todos os dados atuais. Continuar?')) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Store.importData(JSON.parse(reader.result));
        toast('Backup importado — recarregando…', 'success');
        setTimeout(() => location.reload(), 800);
      } catch (err) { toast('Erro ao importar: ' + err.message, 'error'); }
    };
    reader.readAsText(file);
  }

  function renderConfigBackup(content) {
    const data = Store.get();
    const counts = {
      Receitas: data.receitas.length, Despesas: data.despesas.length,
      Contratos: (data.contratos||[]).length, Metas: data.metas.length,
      Cartões: data.cartoes.length, Ativos: data.ativos.length,
    };
    content.innerHTML = `
<div class="section-header mb-4">
  <div><div class="section-title">Backup & Dados</div>
  <div class="section-sub">Seus dados ficam salvos na sua conta. Exporte ou restaure um arquivo de backup quando quiser.</div></div>
</div>
<div class="card mb-4">
  <div class="card-header"><span class="card-title">Resumo</span></div>
  ${Object.entries(counts).map(([k,v]) => `<div class="stat-row"><span class="stat-row-label">${k}</span><span class="stat-row-value">${v}</span></div>`).join('')}
</div>
<div class="card">
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start">
    <button class="btn-primary"   id="btnDoExport">${icon('download', {size:13})} Exportar meus dados</button>
    <button class="btn-secondary" id="btnDoImport">${icon('upload', {size:13})} Restaurar meus dados</button>
    <div style="flex:1"></div>
    <button class="btn-secondary" id="btnDoSeed">${icon('rotate-ccw', {size:13})} Restaurar exemplo</button>
    <button class="btn-secondary" id="btnDoClear" style="color:var(--red);border-color:rgba(255,74,104,0.3)">${icon('trash-2', {size:13})} Limpar tudo</button>
    <input type="file" id="fileDoImport" accept="application/json" style="display:none"/>
  </div>
  <div style="margin-top:10px;font-size:11px;color:var(--text-3);line-height:1.5">
    <strong style="color:var(--text-2)">Restaurar exemplo:</strong> apaga seus dados e carrega o conjunto de demonstração pré-cadastrado.<br>
    <strong style="color:var(--red)">Limpar tudo:</strong> apaga seus dados completamente — sem dados de exemplo. Útil para começar do zero.
  </div>
</div>`;
    document.getElementById('btnDoExport').addEventListener('click', _doExportBackup);
    document.getElementById('btnDoImport').addEventListener('click', () => document.getElementById('fileDoImport').click());
    document.getElementById('fileDoImport').addEventListener('change', e => {
      _doImportBackup(e.target.files?.[0]);
      e.target.value = '';
    });
    document.getElementById('btnDoSeed').addEventListener('click', () => {
      if (!confirm('Apagar seus dados e carregar o conjunto de demonstração pré-cadastrado?')) return;
      Store.resetData();
      toast('Dados de exemplo restaurados — recarregando…', 'success');
      setTimeout(() => location.reload(), 600);
    });
    document.getElementById('btnDoClear').addEventListener('click', () => {
      if (!confirm('⚠ Apagar TODOS os dados? Esta ação não pode ser desfeita.')) return;
      if (!confirm('Tem certeza? Você vai começar do zero, sem dados de exemplo.')) return;
      Store.clearAll();
      toast('Todos os dados foram apagados — recarregando…', 'success');
      setTimeout(() => location.reload(), 600);
    });
  }

  function renderConfigAparencia(content) {
    content.innerHTML = `
<div class="section-header mb-4">
  <div><div class="section-title">Aparência</div>
  <div class="section-sub">Tema visual da aplicação</div></div>
</div>
<div class="card" style="padding:18px 20px">
  <div style="display:flex;align-items:flex-start;gap:14px">
    <div style="width:38px;height:38px;border-radius:10px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--accent)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
    </div>
    <div style="flex:1">
      <div style="font-size:14px;font-weight:600;color:var(--text-1);margin-bottom:4px">Tema escuro (padrão)</div>
      <div style="font-size:12px;color:var(--text-3);line-height:1.55">O Haile foi desenhado com tema escuro para reduzir cansaço visual em sessões prolongadas. Tema claro está no roadmap.</div>
    </div>
  </div>
</div>`;
  }

  const AVATAR_OPTIONS = ['👤','👨','👩','🧑','👨‍💼','👩‍💼','🧔','👱','🧑‍💻','👨‍💻','👩‍💻'];
  const TIMEZONES = [
    'America/Sao_Paulo','America/Manaus','America/Belem','America/Fortaleza',
    'America/Recife','America/Maceio','America/Bahia','America/Campo_Grande',
    'America/Cuiaba','America/Porto_Velho','America/Boa_Vista',
    'America/Rio_Branco','America/Noronha',
    'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
    'Europe/Lisbon','Europe/London','Europe/Paris','Europe/Berlin',
    'UTC',
  ];

  // ─── ICP Sprint 2 — Banco de perguntas + modal ─────────────────
  // Adicionar novas categorias aqui conforme sprints avançam.
  const ICP_QUESTIONS = {
    // ── Tolerância a risco (10 perguntas) ──────────────────────────
    risk: [
      {
        id: 'risk_1', version: 1,
        pergunta: 'Se você tivesse R$ 20.000 disponíveis hoje, o que faria?',
        opcoes: [
          { id: 'a', label: 'Deixaria na poupança ou conta corrente',       sub: 'Sem risco, liquidez total' },
          { id: 'b', label: 'Aplicaria em renda fixa conservadora',         sub: 'Tesouro, CDB, LCI/LCA' },
          { id: 'c', label: 'Dividiria entre renda fixa e variável',        sub: 'Um pouco de tudo' },
          { id: 'd', label: 'Investiria buscando retorno maior',            sub: 'Ações, fundos ou cripto' },
        ],
      },
      {
        id: 'risk_2', version: 1,
        pergunta: 'Como você se sente quando perde dinheiro — seja num investimento, num negócio ou emprestando para a pessoa errada?',
        opcoes: [
          { id: 'a', label: 'Fico muito mal e fico com medo de repetir',    sub: 'Prefiro não arriscar de novo' },
          { id: 'b', label: 'Fico tenso, mas consigo seguir em frente',     sub: 'Demoro algumas semanas' },
          { id: 'c', label: 'Analiso o que deu errado e aprendo',           sub: 'Encaro como lição' },
          { id: 'd', label: 'Encaro como parte do jogo',                    sub: 'Faz parte do processo' },
        ],
      },
      {
        id: 'risk_3', version: 1,
        pergunta: 'Qual frase descreve melhor sua relação com dívida?',
        opcoes: [
          { id: 'a', label: 'Evito a qualquer custo',                       sub: 'Dívida me tira o sono' },
          { id: 'b', label: 'Aceito só para bens essenciais',               sub: 'Imóvel, carro — com planejamento' },
          { id: 'c', label: 'Uso crédito de forma estratégica',             sub: 'Quando o retorno justifica' },
          { id: 'd', label: 'Me sinto confortável alavancando',             sub: 'Para crescer mais rápido' },
        ],
      },
      {
        id: 'risk_4', version: 1,
        pergunta: 'Em quanto tempo você precisaria resgatar uma reserva de emergência, se necessário?',
        opcoes: [
          { id: 'a', label: 'Imediatamente',                                sub: 'Preciso de liquidez diária' },
          { id: 'b', label: 'Em até 30 dias',                               sub: 'Posso esperar um pouco' },
          { id: 'c', label: 'Em até 6 meses',                              sub: 'Tenho margem para isso' },
          { id: 'd', label: 'Poderia esperar mais de 1 ano',               sub: 'Tenho outras fontes no curto prazo' },
        ],
      },
      {
        id: 'risk_5', version: 1,
        pergunta: 'Você já perdeu dinheiro em algum investimento ou negócio?',
        opcoes: [
          { id: 'a', label: 'Não, e prefiro que continue assim',            sub: 'Isso me preocupa bastante' },
          { id: 'b', label: 'Sim, pequenas perdas',                        sub: 'Me deixou mais cauteloso' },
          { id: 'c', label: 'Sim, e aprendi com isso',                     sub: 'Hoje estou mais tranquilo' },
          { id: 'd', label: 'Sim, várias vezes',                           sub: 'Faz parte do processo' },
        ],
      },
      {
        id: 'risk_6', version: 1,
        pergunta: 'Qual cenário de investimento você prefere?',
        opcoes: [
          { id: 'a', label: 'Ganhar 6% ao ano com certeza absoluta',        sub: 'Sem risco, sem surpresas' },
          { id: 'b', label: 'Entre 4% e 10% com baixo risco de perda',     sub: 'Conservador com potencial' },
          { id: 'c', label: 'Entre 0% e 20% com chance real de perda',     sub: 'Aceito oscilações' },
          { id: 'd', label: 'Arriscar perder 20% para ganhar 40%+',        sub: 'Alto risco, alto retorno' },
        ],
      },
      {
        id: 'risk_7', version: 1,
        pergunta: 'Quando ouve "a bolsa caiu 5% hoje", qual é sua primeira reação?',
        opcoes: [
          { id: 'a', label: 'Fico apreensivo e checo meus investimentos',  sub: 'Me preocupa' },
          { id: 'b', label: 'Noto, mas não deixo afetar meu humor',        sub: 'Sei que passa' },
          { id: 'c', label: 'Penso se é hora de comprar mais',             sub: 'Vejo como oportunidade' },
          { id: 'd', label: 'Nem ligo — volatilidade é normal',            sub: 'Faz parte do mercado' },
        ],
      },
      {
        id: 'risk_8', version: 1,
        pergunta: 'Na sua carreira ou negócio, o que você prefere?',
        opcoes: [
          { id: 'a', label: 'Estabilidade garantida',                      sub: 'Mesmo com salário menor' },
          { id: 'b', label: 'Boa base com algum bônus',                   sub: 'Estabilidade + recompensa' },
          { id: 'c', label: 'Renda variável com potencial alto',           sub: 'Assumo a volatilidade' },
          { id: 'd', label: 'Máxima autonomia e risco',                   sub: 'Busco grande retorno' },
        ],
      },
      {
        id: 'risk_9', version: 1,
        pergunta: 'Quando toma uma decisão importante e dá errado, como costuma reagir?',
        opcoes: [
          { id: 'a', label: 'Fico mal por muito tempo',                    sub: 'Demoro a retomar o ritmo' },
          { id: 'b', label: 'Fico abalado, mas me recupero em semanas',   sub: 'Passa com o tempo' },
          { id: 'c', label: 'Analiso o que deu errado e sigo em frente',  sub: 'Prefiro aprender e agir' },
          { id: 'd', label: 'Encaro como aprendizado e parto pro próximo', sub: 'Não me prendo ao passado' },
        ],
      },
      {
        id: 'risk_10', version: 1,
        pergunta: 'Como você se descreveria como investidor hoje?',
        opcoes: [
          { id: 'a', label: 'Conservador',                                 sub: 'Proteger o que tenho é prioridade' },
          { id: 'b', label: 'Moderado',                                    sub: 'Aceito algum risco com equilíbrio' },
          { id: 'c', label: 'Arrojado',                                    sub: 'Busco crescimento mesmo com oscilações' },
          { id: 'd', label: 'Agressivo',                                   sub: 'Maximizar retorno é o que importa' },
        ],
      },
    ],

    // ── Valores & Prioridades (8 perguntas) ────────────────────────
    // Captura disciplina, abdicação de prazeres, consciência de trade-offs
    // e mentalidade sobre tempo + dinheiro — drivers essenciais pro Coach.
    values: [
      {
        id: 'values_1', version: 1,
        pergunta: 'O que você nunca cortaria do orçamento, mesmo em aperto?',
        opcoes: [
          { id: 'a', label: 'Educação dos filhos',           sub: 'Escola, cursos, faculdade' },
          { id: 'b', label: 'Saúde e bem-estar',             sub: 'Plano, terapia, exercício' },
          { id: 'c', label: 'Alimentação de qualidade',      sub: 'Comida boa e saudável' },
          { id: 'd', label: 'Lazer em família',              sub: 'Viagens, encontros, experiências' },
        ],
      },
      {
        id: 'values_2', version: 1,
        pergunta: 'Você conseguiria abrir mão de um prazer hoje para ter algo muito melhor daqui a 5 anos?',
        opcoes: [
          { id: 'a', label: 'Raramente — prefiro aproveitar o presente',   sub: 'O agora vale mais' },
          { id: 'b', label: 'Depende do prazer e da recompensa',           sub: 'Analiso caso a caso' },
          { id: 'c', label: 'Na maioria das vezes, sim',                   sub: 'Tenho paciência razoável' },
          { id: 'd', label: 'Sim, sem dificuldade',                        sub: 'Foco no longo prazo' },
        ],
      },
      {
        id: 'values_3', version: 1,
        pergunta: 'Se precisasse escolher entre uma viagem de fim de semana e pagar uma dívida, o que faria?',
        opcoes: [
          { id: 'a', label: 'Viagem — equilíbrio também importa',          sub: 'Vivo o presente' },
          { id: 'b', label: 'Depende do valor e da dívida',               sub: 'Avaliaria cada caso' },
          { id: 'c', label: 'Pagaria a dívida, mas talvez renegociasse a viagem', sub: 'Tentaria ter os dois' },
          { id: 'd', label: 'Pagaria a dívida sem pensar duas vezes',      sub: 'Dívida em dia primeiro' },
        ],
      },
      {
        id: 'values_4', version: 1,
        pergunta: 'Como você enxerga a relação entre disciplina e resultado financeiro?',
        opcoes: [
          { id: 'a', label: 'Sorte importa tanto quanto disciplina',       sub: 'Não é só esforço' },
          { id: 'b', label: 'Disciplina ajuda, mas não é tudo',           sub: 'O contexto também importa' },
          { id: 'c', label: 'Disciplina consistente gera resultado certo', sub: 'Quem planta, colhe' },
          { id: 'd', label: 'É o fator mais importante — sem ela, nada',  sub: 'Tudo começa na disciplina' },
        ],
      },
      {
        id: 'values_5', version: 1,
        pergunta: 'O que te move mais a agir em relação ao dinheiro?',
        opcoes: [
          { id: 'a', label: 'Medo de passar por aperto',                  sub: 'Quero evitar o pior' },
          { id: 'b', label: 'Vontade de proporcionar mais à família',      sub: 'Penso nos que amo' },
          { id: 'c', label: 'Desejo de conquistar objetivos específicos',  sub: 'Tenho metas claras' },
          { id: 'd', label: 'Busca de liberdade e independência',         sub: 'Não depender de ninguém' },
        ],
      },
      {
        id: 'values_6', version: 1,
        pergunta: 'Você consegue enxergar com clareza o impacto das suas escolhas de hoje no seu futuro financeiro?',
        opcoes: [
          { id: 'a', label: 'Raramente — o futuro parece distante',       sub: 'É difícil conectar isso' },
          { id: 'b', label: 'Às vezes, mas perco o fio facilmente',       sub: 'A rotina atrapalha' },
          { id: 'c', label: 'Na maior parte do tempo sim',                sub: 'Costumo pensar nos efeitos' },
          { id: 'd', label: 'Sim, com bastante clareza',                  sub: 'Considero isso em cada decisão' },
        ],
      },
      {
        id: 'values_7', version: 1,
        pergunta: 'Quando recebe um dinheiro extra (bônus, 13º, herança), qual é sua primeira reação?',
        opcoes: [
          { id: 'a', label: 'Já sei em que gastar — tenho vontades represadas', sub: 'Mereci aproveitar' },
          { id: 'b', label: 'Pago alguma dívida ou conta importante',     sub: 'Alivio o que está pesando' },
          { id: 'c', label: 'Divido: uma parte aproveito, o resto guardo', sub: 'Equilíbrio entre prazer e futuro' },
          { id: 'd', label: 'Invisto ou guardo quase tudo',               sub: 'Dinheiro parado é dinheiro perdido' },
        ],
      },
      {
        id: 'values_8', version: 1,
        pergunta: 'Como você avalia sua saúde financeira hoje, de forma honesta?',
        opcoes: [
          { id: 'a', label: 'Estou no vermelho ou muito apertado',        sub: 'Preciso de ajuda urgente' },
          { id: 'b', label: 'Pago as contas, mas não sobra nada',        sub: 'Estável, mas sem folga' },
          { id: 'c', label: 'Tenho alguma reserva e consigo planejar',   sub: 'Estou no caminho certo' },
          { id: 'd', label: 'Estou bem e já penso em multiplicar',       sub: 'Posso ir além do básico' },
        ],
      },
    ],
  };

  // Estado do modal de perguntas ICP
  let _icpModal = {
    catId: null, qIdx: 0, selected: null, extra: '',
    isReview: false,    // todas as perguntas já foram respondidas (modo edição)
    anyChange: false,   // alguma resposta foi alterada/adicionada nesta sessão
    prevAnswers: {},    // { perguntaId: opcaoId } com respostas anteriores
  };

  function _icpCatMeta(catId) {
    const cats = Store.getContextoCategories();
    return cats.find(c => c.id === catId) || null;
  }

  /** Mapa { perguntaId: opcaoId } com as respostas já dadas pelo usuário. */
  function _icpGetAnsweredMap(catId) {
    const respostas = Store.getContextoRespostas ? Store.getContextoRespostas(catId) : [];
    const map = {};
    respostas.forEach(r => { if (r.opcaoId) map[r.perguntaId] = r.opcaoId; });
    return map;
  }

  /** Total de perguntas + respondidas + idx da primeira pendente. */
  function _icpQuestionsState(catId) {
    const allQs   = ICP_QUESTIONS[catId] || [];
    const answered = Store.getContextoAnsweredIds(catId);
    const firstPending = allQs.findIndex(q => !answered.includes(q.id));
    return {
      allQs,
      answeredCount: answered.length,
      total: allQs.length,
      firstPendingIdx: firstPending === -1 ? 0 : firstPending,
      isComplete: allQs.length > 0 && answered.length >= allQs.length,
    };
  }

  function openICPModal(catId) {
    const st = _icpQuestionsState(catId);
    if (!st.total) {
      toast('Categoria sem perguntas disponíveis ainda.', 'info');
      return;
    }
    const prevAnswers = _icpGetAnsweredMap(catId);
    const initialIdx  = st.isComplete ? 0 : st.firstPendingIdx;
    _icpModal = {
      catId,
      qIdx: initialIdx,
      selected: prevAnswers[st.allQs[initialIdx]?.id] || null,
      extra: '',
      isReview: st.isComplete,
      anyChange: false,
      prevAnswers,
    };
    _renderICPModal();
  }

  // ─── ICP Modal — Redesign Mai/2026 ────────────────────────────
  // Funções internas: _buildICPOptionsHtml, _wireICPOptions,
  // _renderICPModal (cria overlay), _updateICPModalContent (atualiza
  // body in-place com animação), _icpModalAdvance, _renderICPCelebration,
  // _closeICPModal.
  // ──────────────────────────────────────────────────────────────

  function _buildICPOptionsHtml(q) {
    return q.opcoes.map(op => `
      <button class="icp-opt${_icpModal.selected === op.id ? ' selected' : ''}"
              type="button" data-val="${op.id}">
        <div class="icp-opt-indicator">
          <svg class="icp-opt-check" width="11" height="11" viewBox="0 0 24 24"
               fill="none" stroke="#fff" stroke-width="3"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <div class="icp-opt-text">
          <div class="icp-opt-label">${op.label}</div>
          ${op.sub ? `<div class="icp-opt-sub">${op.sub}</div>` : ''}
        </div>
        ${op.identified ? `
          <div class="icp-identified-badge">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Identificado
          </div>` : ''}
      </button>`).join('');
  }

  function _wireICPOptions(q, isLast) {
    const optionsEl = document.getElementById('icpOptions');
    if (!optionsEl) return;
    optionsEl.addEventListener('click', e => {
      const btn = e.target.closest('.icp-opt');
      if (!btn) return;
      _icpModal.selected = btn.dataset.val;
      document.querySelectorAll('#icpOptions .icp-opt').forEach(b =>
        b.classList.toggle('selected', b.dataset.val === _icpModal.selected)
      );
      // Recalcula label/hint do footer baseado na mudança (review mode etc)
      const fState   = _icpFooterState();
      const hintDot  = document.getElementById('icpHintDot');
      const hintText = document.getElementById('icpHintText');
      const nextBtn  = document.getElementById('icpNext');
      if (hintDot)  hintDot.classList.toggle('pending', fState.hintPending);
      if (hintText) hintText.textContent = fState.hint;
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.className = 'icp-next-btn' + (fState.isLast ? ' is-last' : '');
        nextBtn.innerHTML = _icpNextBtnHtml();
      }
      if (q.textarea) {
        const wrap = document.getElementById('icpTextareaWrap');
        if (wrap) wrap.style.display = 'block';
      }
    });
    const extraEl = document.getElementById('icpExtra');
    if (extraEl) extraEl.addEventListener('input', e => { _icpModal.extra = e.target.value; });
    const nextBtn = document.getElementById('icpNext');
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (!_icpModal.selected) return;
      _icpModalAdvance();
    });
  }

  // Calcula labels do footer baseado no estado atual (review/edit/last/etc)
  function _icpFooterState() {
    const { catId, qIdx, selected, isReview, prevAnswers } = _icpModal;
    const allQs = ICP_QUESTIONS[catId] || [];
    const q = allQs[qIdx];
    const isLast = qIdx + 1 >= allQs.length;
    const prev = q ? prevAnswers[q.id] : null;
    const hasSel = !!selected;
    const changed = hasSel && prev && selected !== prev;
    let label, hint, hintPending = false;
    if (!hasSel) {
      label = isLast ? 'Concluir' : 'Continuar';
      hint  = 'Selecione uma opção';
      hintPending = true;
    } else if (isReview && !changed) {
      label = isLast ? 'Concluir' : 'Próxima';
      hint  = 'Sua resposta atual';
    } else if (changed) {
      label = isLast ? 'Atualizar e concluir' : 'Atualizar';
      hint  = 'Você mudou a resposta';
    } else {
      // Nova resposta (não tinha antes)
      label = isLast ? 'Concluir' : 'Continuar';
      hint  = 'Pronto pra avançar';
    }
    return { label, hint, hintPending, isLast, q, prev };
  }

  function _icpNextBtnHtml() {
    const { label, isLast } = _icpFooterState();
    return `${label}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        ${isLast ? '<path d="M20 6L9 17l-5-5"/>' : '<path d="M5 12h14M12 5l7 7-7 7"/>'}
      </svg>`;
  }

  function _renderICPModal() {
    const { catId, qIdx, isReview } = _icpModal;
    const cat   = _icpCatMeta(catId);
    const allQs = ICP_QUESTIONS[catId] || [];
    const total = allQs.length;

    document.getElementById('icpModalOverlay')?.remove();

    if (!total) {
      _renderICPCelebration(catId);
      return;
    }

    const q = allQs[Math.min(qIdx, total - 1)];
    const currentNum = qIdx + 1;
    const pct = Math.round((currentNum / total) * 100);
    const catName = cat?.name || catId;
    const catIcon = cat?.icon || 'user';
    const fState  = _icpFooterState();

    const overlay = document.createElement('div');
    overlay.className = 'icp-modal-overlay';
    overlay.id = 'icpModalOverlay';
    overlay.innerHTML = `
      <div class="icp-modal" id="icpModalCard" role="dialog" aria-modal="true"
           aria-label="Pergunta ${currentNum} de ${total}">
        <div class="icp-prog"><div class="icp-prog-fill" id="icpProgFill" style="width:${pct}%"></div></div>
        <div class="icp-hdr">
          <div class="icp-hdr-left">
            <div class="icp-cat-icon-wrap" id="icpCatIconWrap">
              ${icon(catIcon, { size: 14, color: '#7367F0' })}
            </div>
            <div>
              <div class="icp-supertitle">Haile te conhecendo</div>
              <div class="icp-subtitle" id="icpSubtitle">
                ${catName}<span class="icp-dot">·</span><span class="icp-count">${currentNum} de ${total}</span>
              </div>
            </div>
          </div>
          <button class="icp-x-btn" id="icpClose" aria-label="Fechar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        ${isReview ? `
        <div class="icp-review-banner" id="icpReviewBanner">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Revisando suas respostas — você pode ajustar qualquer uma
        </div>` : ''}
        <div class="icp-body-wrap" id="icpBodyWrap">
          <h2 class="icp-q-text">${q.pergunta}</h2>
          <div class="icp-options-list" id="icpOptions">${_buildICPOptionsHtml(q)}</div>
          <div id="icpTextareaWrap" style="display:none" class="icp-textarea-anim">
            <label class="icp-textarea-label">Quer contar mais? <span>· opcional</span></label>
            <textarea id="icpExtra" class="icp-textarea-field"
              placeholder="Adicione contexto ou detalhes...">${_icpModal.extra}</textarea>
          </div>
        </div>
        <div class="icp-footer">
          <div class="icp-footer-hint" id="icpFooterHint">
            <span class="icp-hint-dot${fState.hintPending ? ' pending' : ''}" id="icpHintDot"></span>
            <span id="icpHintText">${fState.hint}</span>
          </div>
          <button class="icp-next-btn${fState.isLast ? ' is-last' : ''}" id="icpNext"
                  ${_icpModal.selected ? '' : 'disabled'}>
            ${_icpNextBtnHtml()}
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    upgradeIcons(document.getElementById('icpCatIconWrap'));

    overlay.addEventListener('click', e => { if (e.target === overlay) _closeICPModal(); });
    document.getElementById('icpClose').addEventListener('click', _closeICPModal);
    _wireICPOptions(q, fState.isLast);
  }

  function _updateICPModalContent() {
    const { catId, qIdx, isReview, prevAnswers } = _icpModal;
    const cat   = _icpCatMeta(catId);
    const allQs = ICP_QUESTIONS[catId] || [];
    const total = allQs.length;

    if (!total) {
      document.getElementById('icpModalOverlay')?.remove();
      _renderICPCelebration(catId);
      return;
    }

    const q = allQs[Math.min(qIdx, total - 1)];
    const currentNum = qIdx + 1;
    const pct = Math.round((currentNum / total) * 100);
    const catName = cat?.name || catId;

    // Pré-seleciona resposta anterior (se houver) ao trocar de pergunta
    _icpModal.selected = prevAnswers[q.id] || null;
    _icpModal.extra    = '';
    const fState = _icpFooterState();

    // Atualizar barra de progresso
    const progFill = document.getElementById('icpProgFill');
    if (progFill) progFill.style.width = pct + '%';

    // Atualizar contador no header
    const subtitle = document.getElementById('icpSubtitle');
    if (subtitle) {
      subtitle.innerHTML = `${catName}<span class="icp-dot">·</span><span class="icp-count">${currentNum} de ${total}</span>`;
    }

    // Atualizar body com animação
    const body = document.getElementById('icpBodyWrap');
    if (!body) { _renderICPModal(); return; }

    body.innerHTML = `
      <h2 class="icp-q-text">${q.pergunta}</h2>
      <div class="icp-options-list" id="icpOptions">${_buildICPOptionsHtml(q)}</div>
      <div id="icpTextareaWrap" style="display:none" class="icp-textarea-anim">
        <label class="icp-textarea-label">Quer contar mais? <span>· opcional</span></label>
        <textarea id="icpExtra" class="icp-textarea-field"
          placeholder="Adicione contexto ou detalhes...">${_icpModal.extra}</textarea>
      </div>`;
    body.classList.remove('anim-out');
    body.classList.add('anim-in');
    body.addEventListener('animationend', () => body.classList.remove('anim-in'), { once: true });

    // Atualizar footer
    const hintDot  = document.getElementById('icpHintDot');
    const hintText = document.getElementById('icpHintText');
    const nextBtn  = document.getElementById('icpNext');
    if (hintDot)  { hintDot.classList.toggle('pending', fState.hintPending); }
    if (hintText) { hintText.textContent = fState.hint; }
    if (nextBtn)  {
      nextBtn.disabled = !_icpModal.selected;
      nextBtn.className = 'icp-next-btn' + (fState.isLast ? ' is-last' : '');
      nextBtn.innerHTML = _icpNextBtnHtml();
      // Re-wire click (remover listener antigo via clone)
      const newBtn = nextBtn.cloneNode(true);
      nextBtn.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        if (!_icpModal.selected) return;
        _icpModalAdvance();
      });
    }

    _wireICPOptions(q, fState.isLast);
  }

  function _icpModalAdvance() {
    const { catId, qIdx, selected, extra, prevAnswers } = _icpModal;
    const allQs = ICP_QUESTIONS[catId] || [];
    const q  = allQs[qIdx];

    // Só persiste se houver mudança de fato (nova resposta ou alteração)
    if (selected && q) {
      const prev = prevAnswers[q.id];
      const isNewOrChanged = !prev || prev !== selected || !!extra;
      if (isNewOrChanged) {
        const opcaoLabel = q.opcoes.find(o => o.id === selected)?.label || selected;
        const resposta   = extra ? `${opcaoLabel} — ${extra.trim()}` : opcaoLabel;
        Store.addContextoResposta(catId, {
          perguntaId: q.id,
          pergunta:   q.pergunta,
          resposta,
          opcaoId:    selected,
          extra:      extra ? extra.trim() : '',
          version:    q.version || 1,
        });
        _icpModal.prevAnswers[q.id] = selected;
        _icpModal.anyChange = true;
      }
    }

    const nextIdx = qIdx + 1;

    if (nextIdx >= allQs.length) {
      // Última pergunta — fechar com celebração apenas se houve alteração
      document.getElementById('icpModalOverlay')?.remove();
      if (_icpModal.anyChange) {
        _renderICPCelebration(catId);
      } else {
        _closeICPModal();
      }
    } else {
      // Próxima pergunta — anima body saindo e atualiza
      _icpModal.qIdx = nextIdx;
      const body = document.getElementById('icpBodyWrap');
      if (body) {
        body.classList.add('anim-out');
        body.addEventListener('animationend', _updateICPModalContent, { once: true });
      } else {
        _renderICPModal();
      }
    }
  }

  function _renderICPCelebration(catId) {
    const cat   = _icpCatMeta(catId);
    const allCats = Store.getContextoCategories();
    const icp   = Store.calculateICP();
    const level = Store.getContextoLevel(icp);
    const totalQAll = allCats.reduce((s, c) => s + c.total, 0);
    const catData   = allCats.find(c => c.id === catId);
    const catGain   = catData && totalQAll > 0
      ? Math.round((catData.answered / totalQAll) * 100) : 0;

    const LEVELS_ORDER = ['Recém-chegado', 'Apresentado', 'Conhecido', 'Próximo', 'Confidente'];
    const levelIdx = LEVELS_ORDER.indexOf(level.name);

    const circumference = 2 * Math.PI * 46;
    const dashAfter  = circumference * (icp / 100);
    const dashBefore = circumference * (Math.max(0, icp - catGain) / 100);

    const levelBars = LEVELS_ORDER.map((_, i) => {
      const reached    = i <= levelIdx;
      const isCurrent  = i === levelIdx;
      return `<span style="width:${isCurrent ? 14 : 8}px;height:4px;border-radius:99px;
        background:${reached ? (isCurrent ? '#9990ff' : 'rgba(115,103,240,0.5)') : 'rgba(255,255,255,0.12)'}">
        </span>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.className = 'icp-modal-overlay';
    overlay.id = 'icpModalOverlay';
    overlay.innerHTML = `
      <div class="icp-modal icp-celebration" id="icpModalCard" role="dialog" aria-modal="true">
        <div class="icp-prog"><div class="icp-prog-fill icp-prog-shimmer" style="width:100%"></div></div>
        <button class="icp-x-btn" id="icpClose" aria-label="Fechar"
                style="position:absolute;top:14px;right:14px;z-index:2;color:rgba(255,255,255,0.5)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div style="padding:34px 24px 22px;text-align:center;position:relative">
          <!-- Ring -->
          <div style="position:relative;width:140px;height:140px;margin:0 auto 22px">
            <div class="icp-ring-glow"></div>
            <svg width="140" height="140" viewBox="0 0 100 100"
                 style="position:absolute;inset:0;transform:rotate(-90deg)">
              <circle cx="50" cy="50" r="46" fill="none"
                      stroke="rgba(255,255,255,0.08)" stroke-width="4"/>
              <circle cx="50" cy="50" r="46" fill="none"
                      stroke="rgba(115,103,240,0.4)" stroke-width="4" stroke-linecap="round"
                      stroke-dasharray="${circumference}"
                      stroke-dashoffset="${circumference - dashBefore}"/>
              <circle cx="50" cy="50" r="46" fill="none"
                      stroke="url(#icpVGrad)" stroke-width="4" stroke-linecap="round"
                      stroke-dasharray="${dashAfter} ${circumference}"
                      stroke-dashoffset="0"
                      style="animation:icp-ring-draw 1.6s cubic-bezier(.5,1.4,.4,1) 0.2s both;
                             --from:${(circumference - dashBefore).toFixed(2)}px;
                             --to:${(circumference - dashAfter).toFixed(2)}px"/>
              <defs>
                <linearGradient id="icpVGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#9990ff"/>
                  <stop offset="100%" stop-color="#7367F0"/>
                </linearGradient>
              </defs>
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;
                        align-items:center;justify-content:center">
              <div style="font-size:38px;font-weight:700;color:#fff;letter-spacing:-1.4px;
                          line-height:1;font-variant-numeric:tabular-nums">${icp}%</div>
              <div class="icp-cel-gain" style="animation:icp-fade-up 0.5s ease 1.1s both">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
                +${catGain}
              </div>
            </div>
          </div>

          <!-- Chip -->
          <div class="icp-cel-chip" style="animation:icp-fade-up 0.5s ease 0.25s both">
            <span style="width:6px;height:6px;border-radius:99px;background:#9990ff"></span>
            Categoria completa
          </div>

          <!-- Título -->
          <h2 style="font-size:24px;font-weight:700;letter-spacing:-0.7px;color:#fff;
                     line-height:1.15;margin-bottom:8px;animation:icp-fade-up 0.5s ease 0.4s both">
            ${cat?.name || catId} completa
          </h2>
          <p style="font-size:13.5px;color:rgba(255,255,255,0.6);line-height:1.5;
                    max-width:340px;margin:0 auto 22px;animation:icp-fade-up 0.5s ease 0.55s both">
            O Haile te conhece melhor agora. Suas respostas foram salvas.
          </p>

          <!-- Level card -->
          <div class="icp-cel-level" style="animation:icp-fade-up 0.5s ease 0.7s both">
            <div class="icp-cel-level-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff"
                   stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>
              </svg>
            </div>
            <div style="flex:1;min-width:0;text-align:left">
              <div style="font-size:10.5px;font-weight:700;color:rgba(255,255,255,0.55);
                          letter-spacing:.08em;text-transform:uppercase">Nível atual</div>
              <div style="font-size:17px;font-weight:700;color:#fff;margin-top:1px;
                          letter-spacing:-0.3px">Você é ${level.name}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:2px;
                        color:rgba(255,255,255,0.5);font-size:9px;font-weight:600">
              <div style="display:flex;gap:3px">${levelBars}</div>
              <span>${levelIdx + 1} de 5</span>
            </div>
          </div>

          <!-- Botões -->
          <div style="display:flex;flex-direction:column;gap:8px;
                      animation:icp-fade-up 0.5s ease 0.85s both">
            <button id="icpCelViewProfile" class="icp-cel-cta-primary">
              Ver meu perfil
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button id="icpCelClose" class="icp-cel-cta-ghost">Fechar</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) _closeICPModal(); });
    document.getElementById('icpClose').addEventListener('click', _closeICPModal);
    document.getElementById('icpCelClose').addEventListener('click', _closeICPModal);
    document.getElementById('icpCelViewProfile').addEventListener('click', () => {
      _closeICPModal();
      // Navega para aba Perfil ICP (dentro de Configurações)
      setTimeout(() => {
        const cfgBtn = document.querySelector('[data-page="config"]');
        if (cfgBtn) cfgBtn.click();
        setTimeout(() => {
          const icpTab = document.querySelector('[data-cfg-tab="icp"]');
          if (icpTab) icpTab.click();
        }, 120);
      }, 250);
    });
  }

  function _closeICPModal() {
    const overlay = document.getElementById('icpModalOverlay');
    if (!overlay) return;
    overlay.classList.add('closing');
    overlay.addEventListener('animationend', () => {
      overlay.remove();
      // Refresh da tela de Perfil para atualizar ICP
      const content = document.getElementById('config-content');
      if (content) renderConfigPerfil(content);
    }, { once: true });
  }

  // ─────────────────────────────────────────────────────────────────
  function renderConfigPerfil(content) {
    const p = Store.getProfile();
    const fullName = p.name || '';
    const initial = (fullName.trim()[0] || '?').toUpperCase();
    const profileColor = Utils.personColor(fullName) || 'var(--accent)';
    const email = (typeof SupabaseSync !== 'undefined' ? SupabaseSync.getUser?.()?.email : null) || '';

    // Calcula idade a partir da data de nascimento
    const idadeStr = (() => {
      if (!p.birthdate) return '';
      const dt = new Date(p.birthdate);
      if (isNaN(dt.getTime())) return '';
      const diff = Date.now() - dt.getTime();
      const idade = Math.floor(diff / (365.25 * 86400000));
      return idade > 0 ? `${idade} anos` : '';
    })();

    content.innerHTML = `
<div class="section-header mb-4"><div>
  <div class="section-title">Perfil</div>
  <div class="section-sub">Suas informações pessoais — o Coach usa esses dados pra te conhecer melhor.</div>
</div></div>
<div class="card" style="max-width:640px">
  <!-- Header com avatar + nome em destaque -->
  <div style="display:flex;align-items:center;gap:18px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border)">
    <div style="position:relative;flex-shrink:0">
      <div style="width:76px;height:76px;border-radius:50%;background:${profileColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;box-shadow:0 6px 20px ${profileColor}33">${initial}</div>
      <button class="btn-secondary btn-sm" disabled title="Em breve" style="position:absolute;bottom:-4px;right:-4px;width:28px;height:28px;border-radius:50%;padding:0;display:flex;align-items:center;justify-content:center;background:var(--bg-elevated);border:2px solid var(--bg-card);color:var(--text-3);cursor:not-allowed">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </button>
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-size:18px;font-weight:700;color:var(--text-1);margin-bottom:4px">${fullName || '—'}</div>
      <div style="font-size:12px;color:var(--text-3)">
        ${email ? `<span>${email}</span>` : ''}
        ${idadeStr ? `${email?'<span style="opacity:0.5;margin:0 6px">·</span>':''}<span>${idadeStr}</span>` : ''}
      </div>
      <div style="font-size:10.5px;color:var(--text-4);margin-top:4px">Foto de perfil — em breve</div>
    </div>
  </div>

  <!-- Form -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div>
      <label style="font-size:11px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Nome</label>
      <input id="pfFirstName" class="form-input" value="${(p.firstName||fullName.split(' ')[0]||'').replace(/"/g,'&quot;')}" placeholder="Primeiro nome"/>
    </div>
    <div>
      <label style="font-size:11px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Sobrenome</label>
      <input id="pfLastName" class="form-input" value="${(p.lastName||fullName.split(' ').slice(1).join(' ')||'').replace(/"/g,'&quot;')}" placeholder="Sobrenome"/>
    </div>
    <div>
      <label style="font-size:11px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Data de nascimento</label>
      <input id="pfBirthdate" type="date" class="form-input" value="${p.birthdate || ''}"/>
    </div>
    <div>
      <label style="font-size:11px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Gênero <span style="font-weight:400;text-transform:none;color:var(--text-4);letter-spacing:0">opcional</span></label>
      <select id="pfGender" class="form-input">
        <option value="" ${!p.gender?'selected':''}>Prefiro não dizer</option>
        <option value="feminino" ${p.gender==='feminino'?'selected':''}>Feminino</option>
        <option value="masculino" ${p.gender==='masculino'?'selected':''}>Masculino</option>
        <option value="nao-binario" ${p.gender==='nao-binario'?'selected':''}>Não-binário</option>
        <option value="outro" ${p.gender==='outro'?'selected':''}>Outro</option>
      </select>
    </div>
    <div>
      <label style="font-size:11px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Profissão</label>
      <input id="pfProfession" class="form-input" value="${(p.profession||'').replace(/"/g,'&quot;')}" placeholder="Ex: Desenvolvedor, Médica…"/>
    </div>
    <div>
      <label style="font-size:11px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Cidade</label>
      <input id="pfCity" class="form-input" value="${(p.city||'').replace(/"/g,'&quot;')}" placeholder="Ex: São Paulo, SP"/>
    </div>
    <div style="grid-column:1/-1">
      <label style="font-size:11px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Fuso horário</label>
      <select id="pfTz" class="form-input" style="max-width:320px">
        ${TIMEZONES.map(tz => `<option value="${tz}" ${tz===(p.timezone||'America/Sao_Paulo')?'selected':''}>${tz}</option>`).join('')}
      </select>
    </div>
  </div>
  <div style="margin-top:14px;font-size:11px;color:var(--text-4);line-height:1.5">
    Esses dados ficam armazenados em sua conta e são usados para personalizar o Coach. Você pode editá-los a qualquer momento.
  </div>
  <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
    <button class="btn-primary" id="btnSavePerfil">Salvar</button>
    <button class="btn-secondary" id="btnRefazerOnboarding">Refazer configuração inicial</button>
  </div>
  <div id="perfilMsg" style="display:none;margin-top:10px;font-size:13px;color:var(--green)">✓ Perfil salvo</div>
</div>

${(() => {
  // ──────────────────────────────────────────────────────────────
  // ICP — Índice de Contexto Pessoal (Sprint 1 — esqueleto)
  // Schema persiste em Store.contexto. Modal de pergunta vem em sprint
  // futura — por enquanto cards mostram "Em breve" no CTA.
  // ──────────────────────────────────────────────────────────────
  const cats   = Store.getContextoCategories();
  const icp    = Store.calculateICP();
  const level  = Store.getContextoLevel(icp);
  const next   = Store.getContextoNextLevel(icp);
  const totalRespondidas = cats.reduce((s, c) => s + c.answered, 0);
  const totalPerguntas   = cats.reduce((s, c) => s + c.total, 0);

  return `
<div class="section-header mb-4" style="margin-top:32px">
  <div>
    <div class="section-title">Contexto pessoal pro Coach</div>
    <div class="section-sub">Quanto mais o Coach te conhece, mais útil ele consegue ser. Você decide o que quer compartilhar.</div>
  </div>
</div>

<!-- HeroICP -->
<div class="icp-hero">
  <div class="icp-hero-glow" style="background:radial-gradient(circle, ${level.color}28 0%, transparent 70%)"></div>
  <div class="icp-hero-glow icp-hero-glow-2"></div>
  <div class="icp-hero-grid">
    <div class="icp-hero-visual">
      ${SvgCharts.gauge(icp, { size: 168, color: level.color, thickness: 14, bg: 'rgba(255,255,255,0.06)' })}
      <div class="icp-hero-visual-label">
        <div class="icp-hero-pct" style="color:${level.color}">${icp}%</div>
        <div class="icp-hero-pct-cap">ICP</div>
      </div>
    </div>
    <div class="icp-hero-story">
      <div class="icp-hero-level-pill" style="background:${level.color}1c;border-color:${level.color}30;color:${level.color}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>
        Nível · ${level.name}
      </div>
      <h2 class="icp-hero-title">${icp === 0 ? 'O Coach ainda está te conhecendo.' : icp >= 86 ? 'O Coach te conhece de verdade.' : 'O Coach está aprendendo sobre você.'}</h2>
      <p class="icp-hero-desc">${level.desc}</p>
      ${next ? `
      <div class="icp-hero-next">
        <div class="icp-hero-next-head">
          <span class="icp-hero-next-lbl">Próximo nível</span>
          <span class="icp-hero-next-val" style="color:${next.color}">${next.name} · ${next.min}%</span>
        </div>
        <div class="icp-hero-next-bar"><div style="width:${Math.min(100, (icp / next.min) * 100)}%;background:linear-gradient(90deg, ${level.color}, ${next.color})"></div></div>
        <div class="icp-hero-next-cap">Faltam <strong style="color:var(--text-1)">${next.min - icp}%</strong> — responda mais perguntas em qualquer categoria abaixo.</div>
      </div>` : ''}
      <div class="icp-hero-hai">
        <div class="icp-hero-hai-avatar">Hai</div>
        <div class="icp-hero-hai-quote">"Quanto mais eu sei sobre suas crenças, medos e sonhos, mais útil consigo ser quando você precisa decidir."</div>
      </div>
    </div>
  </div>
</div>

<!-- Coach inline — explicação da seção -->
${coachInlineHTML({
  id: 'icpCoachInfo',
  tone: 'neutral',
  titulo: 'Como funciona',
  contexto: `${totalRespondidas}/${totalPerguntas} respondidas`,
  texto: 'Responda as perguntas de cada categoria pra eu entender melhor o seu perfil — quanto mais eu te conhecer, mais útil consigo ser. Suas respostas ficam salvas e você pode atualizá-las a qualquer momento.',
})}

<!-- CategoryGrid -->
<div class="dash-section-tag mt-6 mb-2">CATEGORIAS DE CONTEXTO</div>
<div class="icp-cat-grid">
  ${cats.map(c => {
    const pct = c.total > 0 ? Math.round((c.answered / c.total) * 100) : 0;
    const isEmpty = c.answered === 0;
    const hasBank = !!ICP_QUESTIONS[c.id];
    const ctaLabel = hasBank
      ? (c.answered > 0 ? 'Continuar' : 'Responder')
      : 'Em breve';
    const cardCls = [
      'icp-cat-card',
      isEmpty ? 'is-empty' : '',
      hasBank ? 'is-active' : 'is-disabled',
    ].filter(Boolean).join(' ');
    const dataAttr = hasBank ? `data-icp-open="${c.id}"` : '';
    return `<div class="${cardCls}" ${dataAttr} style="--cat-color:${c.color}"
                 role="${hasBank ? 'button' : 'group'}"
                 tabindex="${hasBank ? '0' : '-1'}"
                 aria-disabled="${hasBank ? 'false' : 'true'}">
      <div class="icp-cat-head">
        <div class="icp-cat-icon">${icon(c.icon, { size: 16 })}</div>
        <div class="icp-cat-pct">${c.answered}/${c.total}</div>
      </div>
      <div class="icp-cat-name">${c.name}</div>
      <div class="icp-cat-desc">${c.desc}</div>
      <div class="icp-cat-bar"><div style="width:${pct}%"></div></div>
      ${c.last ? `<div class="icp-cat-last">${c.last.length > 60 ? c.last.slice(0, 60) + '…' : c.last}</div>` : `<div class="icp-cat-empty">Nenhuma resposta ainda</div>`}
      <div class="icp-cat-footer">
        <span class="icp-cat-cta-label">${ctaLabel}</span>
        ${hasBank ? `<svg class="icp-cat-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>` : ''}
      </div>
    </div>`;
  }).join('')}
</div>

`;
})()}`;

    document.getElementById('btnSavePerfil').addEventListener('click', () => {
      const firstName  = document.getElementById('pfFirstName').value.trim();
      const lastName   = document.getElementById('pfLastName').value.trim();
      const birthdate  = document.getElementById('pfBirthdate').value || null;
      const gender     = document.getElementById('pfGender').value || null;
      const profession = document.getElementById('pfProfession').value.trim() || null;
      const city       = document.getElementById('pfCity').value.trim() || null;
      const timezone   = document.getElementById('pfTz').value;

      if (!firstName) { toast('Nome obrigatório', 'error'); return; }
      const fullName = [firstName, lastName].filter(Boolean).join(' ');

      Store.setProfile({
        name: fullName,
        firstName, lastName, birthdate, gender, profession, city, timezone,
      });

      // ── Alimenta categoria 'basic' do ICP automaticamente ────────
      // 5 campos = 5 perguntas da categoria basic (total: 5 → 100%)
      // Campos vazios são removidos da contagem (não inflam falsamente o ICP).
      const fmtBirthdate = birthdate ? new Date(birthdate + 'T12:00:00').toLocaleDateString('pt-BR') : '';
      const camposBasic = [
        { id: 'basic.nome',       pergunta: 'Como podemos te chamar?',         resposta: fullName },
        { id: 'basic.nascimento', pergunta: 'Quando você nasceu?',             resposta: fmtBirthdate },
        { id: 'basic.profissao',  pergunta: 'Qual sua profissão?',             resposta: profession },
        { id: 'basic.cidade',     pergunta: 'Onde você mora?',                 resposta: city },
        { id: 'basic.fuso',       pergunta: 'Em qual fuso horário você está?', resposta: timezone },
      ];
      camposBasic.forEach(c => {
        Store.addContextoResposta('basic', { perguntaId: c.id, pergunta: c.pergunta, resposta: c.resposta || '' });
      });

      // Refresh tela pra atualizar avatar + cálculo de idade + ICP
      renderConfigPerfil(content);
      const msg = document.getElementById('perfilMsg');
      if (msg) { msg.style.display = 'block'; setTimeout(() => { msg.style.display = 'none'; }, 2500); }
      toast('Perfil salvo · ICP atualizado', 'success');
    });

    // ICP — clique direto no card inteiro (padrão clique direto)
    document.querySelectorAll('[data-icp-open]').forEach(card => {
      card.addEventListener('click', () => openICPModal(card.dataset.icpOpen));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openICPModal(card.dataset.icpOpen);
        }
      });
    });

    document.getElementById('btnRefazerOnboarding').addEventListener('click', () => {
      Store.resetOnboarding();
      showOnboarding();
    });

    // Liga botão de dismiss do coach inline
    if (typeof bindCoachInline === 'function') bindCoachInline(content);
  }

  async function _sha256Hex(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function renderConfigSenha(content) {
    content.innerHTML = `
<div class="section-header mb-4"><div>
  <div class="section-title">Trocar Senha</div>
  <div class="section-sub">A nova senha entra em vigor imediatamente</div>
</div></div>
<div class="card" style="max-width:400px">
  <div style="display:grid;gap:14px">
    <div>
      <label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Usuário</label>
      <input id="csUser" class="form-input" placeholder="Usuário atual" autocomplete="username"/>
    </div>
    <div>
      <label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Senha Atual</label>
      <input id="csOld" class="form-input" type="password" placeholder="••••••••" autocomplete="current-password"/>
    </div>
    <div>
      <label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Nova Senha</label>
      <input id="csNew" class="form-input" type="password" placeholder="••••••••" autocomplete="new-password"/>
    </div>
    <div>
      <label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Confirmar Nova Senha</label>
      <input id="csConfirm" class="form-input" type="password" placeholder="••••••••" autocomplete="new-password"/>
    </div>
  </div>
  <div id="csError" style="display:none;background:#ef444418;border:1px solid #ef444440;border-radius:8px;color:var(--red);font-size:13px;padding:10px 14px;margin-top:14px"></div>
  <div style="margin-top:16px">
    <button class="btn-primary" id="btnSaveSenha">Alterar Senha</button>
  </div>
  <div id="csSuccess" style="display:none;margin-top:10px;font-size:13px;color:var(--green)">✓ Senha alterada. Será pedida no próximo login.</div>
</div>`;

    document.getElementById('btnSaveSenha').addEventListener('click', async () => {
      const user    = document.getElementById('csUser').value.trim();
      const oldPass = document.getElementById('csOld').value;
      const newPass = document.getElementById('csNew').value;
      const confirm = document.getElementById('csConfirm').value;
      const errEl   = document.getElementById('csError');
      const okEl    = document.getElementById('csSuccess');

      function showErr(msg) { errEl.textContent = msg; errEl.style.display = 'block'; okEl.style.display = 'none'; }

      if (!user || !oldPass || !newPass) { showErr('Preencha todos os campos.'); return; }
      if (newPass !== confirm) { showErr('Nova senha e confirmação não coincidem.'); return; }
      if (newPass.length < 6) { showErr('A nova senha deve ter no mínimo 6 caracteres.'); return; }

      const oldHash = await _sha256Hex(`${user}:${oldPass}`);
      const storedHash = Store.getCredHash() || '1dc7c1b6bfb072f6b957888d9a974cc477a5e059ae92b1552c956dc246399da2';
      if (oldHash !== storedHash) { showErr('Usuário ou senha atual incorretos.'); return; }

      const newHash = await _sha256Hex(`${user}:${newPass}`);
      Store.setCredHash(newHash);
      errEl.style.display = 'none';
      okEl.style.display = 'block';
      document.getElementById('csOld').value = '';
      document.getElementById('csNew').value = '';
      document.getElementById('csConfirm').value = '';
    });
  }

  const CLAUDE_MODELS = [
    { id: 'claude-haiku-4-5-20251001',  label: 'Haiku 4.5',  desc: 'Rápido · ~$0,0003/pergunta · recomendado para uso diário' },
    { id: 'claude-sonnet-4-6',          label: 'Sonnet 4.6', desc: 'Mais inteligente · ~$0,007/pergunta · melhor para análises complexas' },
    { id: 'claude-opus-4-7',            label: 'Opus 4.7',   desc: 'Máxima capacidade · maior custo · uso pontual' },
  ];

  function renderConfigNotificacoes(content) {
    const settings = Store.get().settings || {};
    const notif = settings.notificacoes || {};

    function toggle(key, val) {
      const d = Store.get();
      d.settings = d.settings || {};
      d.settings.notificacoes = d.settings.notificacoes || {};
      d.settings.notificacoes[key] = val;
      Store.save(d);
      renderConfigNotificacoes(content);
    }

    const rows = [
      { group: 'PUSH' },
      { key: 'pushAtivo',       label: 'Notificações Push',        sub: 'Alertas no dispositivo em tempo real',               default: true },
      { key: 'pushMeta',        label: 'Metas atingidas',          sub: 'Aviso quando uma meta for concluída',                default: true },
      { key: 'pushVencimento',  label: 'Vencimentos próximos',     sub: 'Contratos e faturas vencendo em 3 dias',             default: true },
      { key: 'pushCoach',       label: 'Insights do Coach',        sub: 'Quando o Coach tiver uma análise nova para você',    default: false },
      { group: 'E-MAIL' },
      { key: 'emailResumoMes',  label: 'Resumo mensal',            sub: 'Relatório consolidado do mês no 1º dia útil',        default: true },
      { key: 'emailInsights',   label: 'Insights personalizados',  sub: 'Análises e recomendações do Coach semanalmente',     default: false },
      { key: 'emailAlerta',     label: 'Alertas críticos',         sub: 'Orçamento estourado, meta em risco, etc.',           default: true },
    ];

    content.innerHTML = `
<div class="section-header mb-6">
  <div>
    <div class="section-title">Notificações</div>
    <div class="section-sub">Controle o que o Haile te avisa e por qual canal</div>
  </div>
</div>
<div class="card">
  ${rows.map(r => {
    if (r.group) return `<div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-4);padding:14px 16px 6px;border-top:1px solid var(--border)">${r.group}</div>`;
    const val = r.key in notif ? notif[r.key] : r.default;
    return `<div class="stat-row" style="padding:12px 16px">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text-1)">${r.label}</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:2px">${r.sub}</div>
      </div>
      <label class="toggle-switch" style="flex-shrink:0">
        <input type="checkbox" ${val?'checked':''} data-notif-key="${r.key}">
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
    </div>`;
  }).join('')}
</div>
<div style="font-size:11px;color:var(--text-4);margin-top:12px;padding:0 4px">
  Push requer permissão do navegador. E-mails são enviados para o endereço da sua conta.
</div>`;

    content.querySelectorAll('[data-notif-key]').forEach(el => {
      el.addEventListener('change', () => toggle(el.dataset.notifKey, el.checked));
    });
  }

  function renderConfigSobre(content) {
    const settings   = Store.get().settings || {};
    const savedKey   = settings.claudeApiKey || '';
    const savedModel = settings.claudeModel  || 'claude-haiku-4-5-20251001';

    content.innerHTML = `
<div class="section-header mb-4"><div><div class="section-title">Sobre</div></div></div>
<div class="card mb-4">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
    <div style="width:48px;height:48px;border-radius:12px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:20px">📊</div>
    <div>
      <div style="font-size:18px;font-weight:800">Haile</div>
      <div style="font-size:12px;color:var(--text-3)">Versão <strong style="color:var(--text-2)">DINO</strong> · Gestão financeira familiar</div>
    </div>
  </div>
  <div style="font-size:13px;color:var(--text-2);line-height:1.6">
    App roda 100% no navegador. Dados em <code>localStorage</code> — sem backend.
  </div>
</div>

<div class="card" id="adminAIConfig" style="display:none">
  <div class="card-header" style="margin-bottom:16px">
    <span class="card-title">AI Coach — Configuração <span style="font-size:10px;font-weight:600;background:var(--accent-dim);color:var(--accent);padding:2px 8px;border-radius:999px;margin-left:8px;letter-spacing:.04em;text-transform:uppercase">Admin</span></span>
  </div>

  <div style="margin-bottom:16px;padding:12px;background:var(--green-dim,rgba(34,197,94,.08));border-radius:8px;border:1px solid rgba(34,197,94,.2)">
    <div style="font-size:12px;font-weight:600;color:var(--green);margin-bottom:4px">Coach via Supabase Edge Function</div>
    <div style="font-size:12px;color:var(--text-3);line-height:1.6">
      A chave Anthropic fica armazenada com segurança no servidor Supabase — nunca exposta no browser.<br>
      Para ativar, configure o secret <code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px">ANTHROPIC_API_KEY</code> no painel Supabase e faça o deploy da Edge Function.
    </div>
  </div>

  <div style="border-top:1px solid var(--border);padding-top:16px">
    <div style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">Modelo</div>
    <div style="display:flex;flex-direction:column;gap:8px" id="modelSelector">
      ${CLAUDE_MODELS.map(m => `
      <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${savedModel===m.id?'var(--accent)':'var(--border)'};background:${savedModel===m.id?'var(--accent-dim)':'transparent'};cursor:pointer;transition:border-color .15s">
        <input type="radio" name="claudeModel" value="${m.id}" ${savedModel===m.id?'checked':''} style="margin-top:2px;accent-color:var(--accent)">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text-1)">${m.label}</div>
          <div style="font-size:11px;color:var(--text-3);margin-top:2px">${m.desc}</div>
        </div>
      </label>`).join('')}
    </div>
    <button class="btn-primary" id="saveModelBtn" style="margin-top:12px">Salvar modelo</button>
  </div>
</div>`;

    document.getElementById('saveModelBtn')?.addEventListener('click', () => {
      const sel = document.querySelector('input[name="claudeModel"]:checked')?.value;
      if (!sel) return;
      Store.updateSettings({ claudeModel: sel });
      const m = CLAUDE_MODELS.find(x => x.id === sel);
      toast(`Modelo alterado para ${m?.label}`, 'success');
      renderConfigSobre(content);
    });
    // Highlight selected on change
    document.getElementById('modelSelector')?.addEventListener('change', e => {
      document.querySelectorAll('#modelSelector label').forEach(l => {
        const radio = l.querySelector('input[type="radio"]');
        l.style.borderColor = radio?.checked ? 'var(--accent)' : 'var(--border)';
        l.style.background  = radio?.checked ? 'var(--accent-dim)' : 'transparent';
      });
    });

    // Admin gate — só revela seção de modelo se usuário for admin via Supabase
    (async () => {
      if (typeof SupabaseSync === 'undefined') return;
      try {
        const token = await SupabaseSync.getAccessToken();
        if (!token) return;
        await SupabaseSync.adminCall('stats');
        const card = document.getElementById('adminAIConfig');
        if (card) card.style.display = '';
      } catch { /* não-admin: mantém oculto */ }
    })();
  }

  function init() {
    Store.init();

    // Sync cloud → local após login (non-blocking)
    if (typeof SupabaseSync !== 'undefined') {
      SupabaseSync.init();

      // Wires sync badge in topbar
      const syncDot   = document.getElementById('syncDot');
      const syncLabel = document.getElementById('syncLabel');
      const SYNC_STATES = {
        offline: { color: 'var(--text-4)', label: 'Offline'        },
        syncing: { color: 'var(--amber)',  label: 'Sincronizando…' },
        synced:  { color: 'var(--green)',  label: 'Sincronizado'   },
        error:   { color: 'var(--red)',    label: 'Erro de sync'   },
      };
      SupabaseSync.onStatusChange(status => {
        const s = SYNC_STATES[status] || SYNC_STATES.offline;
        if (syncDot)   syncDot.style.background = s.color;
        if (syncLabel) syncLabel.textContent     = s.label;
      });

      // Resolve family context, accept pending invites, then pull data
      (async () => {
        // Aguarda auth estar pronto pra evitar pull/push antes de _user setar
        // (race condition que fazia o branch "nuvem vazia" disparar à toa)
        if (typeof SupabaseSync.whenAuthReady === 'function') {
          await SupabaseSync.whenAuthReady();
        }
        const inviteResult = await SupabaseSync.acceptPendingInvite();
        // Convite expirado: avisa o usuário (admin precisa reenviar)
        if (inviteResult?.expired) {
          setTimeout(() => {
            toast('Seu convite familiar expirou. Peça ao administrador para reenviar.', 'error');
          }, 600);
        }
        const ctx = await SupabaseSync.resolveFamilyContext();

        // Se admin, garante que user_data tem family_id vinculado (para editores/membros lerem)
        if (!ctx || ctx.role === 'admin') {
          await SupabaseSync.ensureFamilyIdLinked();
        }

        const cloudData = await SupabaseSync.pullFromCloud();
        const localTs = Store.get()._syncedAt || 0;
        const cloudTs = cloudData?._syncedAt  || 0;

        if (cloudData && cloudData.despesas && cloudTs >= localTs) {
          // Nuvem mais recente (ou igual) → nuvem ganha
          localStorage.setItem('finfamily_v1', JSON.stringify(cloudData));
          Store.init();
          if (syncDot)   syncDot.style.background = 'var(--green)';
          if (syncLabel) syncLabel.textContent = ctx?.role && ctx.role !== 'admin'
            ? `Conectado (${ctx.role})` : 'Sincronizado';
          console.log('Haile: nuvem ganhou (cloud', new Date(cloudTs).toISOString(), ')');
        } else if (cloudData && cloudData.despesas && localTs > cloudTs) {
          // Local mais recente → local ganha, push para sincronizar
          if (!ctx || ctx.role !== 'member') SupabaseSync.schedulePush(Store.get());
          if (syncDot)   syncDot.style.background = 'var(--amber)';
          if (syncLabel) syncLabel.textContent = 'Sincronizando…';
          console.log('Haile: local ganhou (local', new Date(localTs).toISOString(),
            '> cloud', new Date(cloudTs).toISOString(), ')');
        } else {
          // Sem dados na nuvem → push local
          if (!ctx || ctx.role === 'admin') SupabaseSync.schedulePush(Store.get());
          console.log('Haile: nuvem vazia, enviando dados locais');
        }

        // Apply member-role restrictions after data is settled
        if (ctx && ctx.role === 'member') {
          if (ctx.pessoaName) Store.applyMemberFilter(ctx.pessoaName);
          _applyMemberNav();
          // Re-render current page with filtered data
          Router.navigate(Router.current || 'despesas');
        }
      })();
    }

    // Remove legacy despesas with invalid/unknown categories (e.g. 'patrimônio')
    const validCats = Object.keys(Store.CATEGORIES);
    const invalidCats = [...new Set(
      Store.get().despesas
        .map(d => d.category)
        .filter(c => c && !validCats.includes(c))
    )];
    if (invalidCats.length) Store.cleanDespesasByCategory(invalidCats);
    Modal.init();

    // Register pages
    Router.register('dashboard',     renderDashboard);
    Router.register('meupainel',     renderMeuPainel);
    Router.register('lancamentos',   renderLancamentos);
    Router.register('receitas',      renderReceitas);
    Router.register('despesas',      renderDespesas);
    Router.register('contas',        (c) => renderContas(c, 'contas'));
    Router.register('cartoes',       renderCartoes);
    Router.register('contratos',     renderContratos);
    Router.register('compromissos',  renderContratos); // alias do redesign
    Router.register('reserva',       renderReserva);
    Router.register('metas',         renderMetas);
    Router.register('investimentos', renderInvestimentos);
    Router.register('financiamentos', renderFinanciamentos);
    Router.register('simulacoes',    renderSimulacoes);
    Router.register('simulador',     renderSimulador); // wrapper redesign 2026-05
    Router.register('patrimonio',    renderPatrimonio);
    Router.register('comparativo',   renderComparativo);
    Router.register('recados',       renderRecados);
    Router.register('reembolsos',    renderReembolsos);
    Router.register('familia',       renderPainelFamilia); // redesign 2026-05
    Router.register('tributario',    renderTributario);    // redesign 2026-05 — módulo novo
    Router.register('config',        renderConfig);


    // Month / Year selectors
    document.getElementById('globalMonth').addEventListener('change', () => Router.navigate(Router.current));
    document.getElementById('globalYear')?.addEventListener('change', () => Router.navigate(Router.current));

    // "Novo Lançamento" agora vive dentro do hero do Dashboard — handler é
    // anexado em renderDashboard. Mantemos delegação global por segurança.
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#btnNovaEntrada');
      if (btn) openNovaEntrada();
    });

    // Tema: fixado em dark (redesign 2026-05 — app é dark-only)
    // O tema light ainda existe no CSS como fallback mas não é mais selecionável.
    (() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('ff_theme', 'dark');
    })();

    document.getElementById('btnLogout')?.addEventListener('click', async () => {
      if (!confirm('Sair da conta?')) return;
      if (typeof SupabaseSync !== 'undefined') await SupabaseSync.signOut();
      // Limpa TUDO da sessão pra evitar que o próximo usuário no mesmo
      // navegador herde dados do anterior (bug Mai/2026).
      sessionStorage.removeItem('ff_auth');
      sessionStorage.removeItem('ff_user_email');
      localStorage.removeItem('finfamily_v1');
      // Limpa também o auth-token do Supabase pra forçar nova sessão limpa
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k));
      window.location.replace('../login.html');
    });

    // Sidebar toggle (mobile) + overlay + auto-close
    function sidebarClose() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.remove('open');
      document.body.classList.remove('sidebar-open');
    }
    function sidebarToggle() {
      const isOpen = document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebarOverlay').classList.toggle('open', isOpen);
      document.body.classList.toggle('sidebar-open', isOpen);
    }

    document.getElementById('sidebarToggle').addEventListener('click', sidebarToggle);
    document.getElementById('sidebarOverlay').addEventListener('click', sidebarClose);

    // Close sidebar when a nav item is clicked on mobile
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 900) sidebarClose();
      });
    });

    // Apply saved theme
    const { tema } = Store.get().settings || {};
    if (tema) document.documentElement.dataset.theme = tema;

    // Define mês/ano atuais como default no seletor global (em vez de hardcoded)
    (() => {
      const now = new Date();
      const m = String(now.getMonth() + 1);
      const y = String(now.getFullYear());
      const mSel = document.getElementById('globalMonth');
      const ySel = document.getElementById('globalYear');
      if (mSel && mSel.querySelector(`option[value="${m}"]`)) mSel.value = m;
      if (ySel && ySel.querySelector(`option[value="${y}"]`)) ySel.value = y;
    })();

    // Reveal admin link if user has admin role.
    // Lê profiles.role direto (RLS permite) em vez de chamar a edge function
    // admin que retornaria 403 e poluiria o console pra não-admins.
    setTimeout(async () => {
      if (typeof SupabaseSync === 'undefined') return;
      const role = await SupabaseSync.getUserRole?.();
      if (role === 'admin') {
        const el = document.getElementById('navAdmin');
        if (el) el.style.display = '';
      }
    }, 1500);

    // Auto: se mês atual não tem dados, usa mês anterior
    {
      const _nm = new Date().getMonth() + 1;
      const _ny = new Date().getFullYear();
      if (Store.sumReceitas(_nm, _ny) === 0 && Store.sumDespesas(_nm, _ny) === 0) {
        const pm = _nm > 1 ? _nm - 1 : 12;
        const py = _nm > 1 ? _ny : _ny - 1;
        const mSel = document.getElementById('globalMonth');
        const ySel = document.getElementById('globalYear');
        if (mSel) mSel.value = pm;
        if (ySel) ySel.value = py;
      }
    }

    // Init routing
    Router.init();

    // Init badges
    updateRecadosBadge();
    updateReembolsosBadge();
    _updateAnomaliasBadge(detectAnomalias(getMonth(), getYear()).length);

    // Init AI Coach
    initCoach();

    // Coach: rotina de recados (idempotente, persistida em data.recados)
    runCoachRoutine();
    updateRecadosBadge();

    // Show onboarding wizard on first access
    if (!Store.getOnboarding().completed) {
      // Fase 1: cria meta automática "Configurar meu Haile" — vira progresso visível
      // mesmo que o usuário pule o wizard. A meta tem 7 steps que vão sendo marcados
      // conforme o usuário responde (no wizard atual ou no Coach-led futuro).
      Store.createOnboardingGoal();
      setTimeout(() => showOnboarding(), 400);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ONBOARDING COACH-LED (7 steps alinhados com Store.ONBOARDING_STEPS)
  // Spec: docs/SPEC_AUTH_ONBOARDING.md §7
  // ══════════════════════════════════════════════════════════════

  // Detecta se este usuário foi convidado (skip steps familia/situacao)
  // Heurística: já existe family context herdado OU user_metadata.invite_token.
  function _onboardingIsInvited() {
    try {
      if (typeof SupabaseSync !== 'undefined' && SupabaseSync.getFamilyContext) {
        const fam = SupabaseSync.getFamilyContext();
        if (fam && fam.role && fam.role !== 'admin') return true;
      }
      const u = (typeof SupabaseSync !== 'undefined' && SupabaseSync.getUser) ? SupabaseSync.getUser() : null;
      if (u?.user_metadata?.invite_token) return true;
    } catch (e) { /* noop */ }
    return false;
  }

  // Tenta pegar nome do user_metadata do Supabase (vindo da waitlist ou cadastro)
  function _onboardingPrefillName() {
    try {
      const u = (typeof SupabaseSync !== 'undefined' && SupabaseSync.getUser) ? SupabaseSync.getUser() : null;
      const n = u?.user_metadata?.full_name || u?.user_metadata?.name;
      if (n && n.trim()) return n.trim();
    } catch (e) { /* noop */ }
    const p = Store.getProfile();
    return (p?.name && p.name !== 'Usuário') ? p.name : '';
  }

  function showOnboarding() {
    // ── Definições estáveis ──────────────────────────────────────
    const PERSONALITIES = [
      {
        key: 'mentor', iconName: 'heart-handshake', label: 'Mentor', short: 'Acolhedor e encorajador',
        desc: 'Celebra conquistas com genuinidade, sugere sem impor. Foco em construir confiança.',
        sample: 'Que bom ver que você economizou R$ 450 este mês! Que tal direcionar uma parte pra viagem da família? Vocês merecem esse descanso.',
      },
      {
        key: 'educador', iconName: 'graduation-cap', label: 'Educador', short: 'Didático e explicativo',
        desc: 'Ensina o porquê junto com o quê. Usa analogias e exemplos do dia-a-dia.',
        sample: 'Aporte de R$ 500/mês no CDB 100% CDI rende mais que poupança porque o CDI está em 14,40% a.a. Em 12 meses, a diferença gira em torno de R$ 240.',
      },
      {
        key: 'profissional', iconName: 'briefcase', label: 'Profissional', short: 'CFO direto e técnico',
        desc: 'Respeita seu tempo, foca em dados. Sem rodeios emocionais. Para quem prefere objetividade.',
        sample: 'Seu Poder de Escolha este mês é R$ 4.850. Considerando comprometimento de 65%, há espaço para aporte adicional de R$ 800 sem risco.',
      },
    ];

    const AVATAR_SEEDS = ['Aurora','Apolo','Bento','Cora','Dante','Eva','Flora','Gael','Helena','Ícaro','Lis','Theo'];

    // 7 steps na ordem do Store.ONBOARDING_STEPS
    const STEPS_ALL = [
      { key: 'apresentacao',  type: 'intro' },
      { key: 'personalidade', type: 'personality' },
      { key: 'nome',          type: 'name' },
      { key: 'familia',       type: 'single', skipIfInvited: true,
        title: 'Como é a sua família?',
        options: [
          { value: 'solo',   label: 'Só eu',                       icon: 'user-round' },
          { value: 'casal',  label: 'Eu e minha(meu) parceira(o)', icon: 'users' },
          { value: 'filhos', label: 'Família com filhos',          icon: 'baby' },
          { value: 'outro',  label: 'Outro arranjo',               icon: 'heart-handshake' },
        ],
      },
      { key: 'situacao',      type: 'single', skipIfInvited: true,
        title: 'Como você descreveria sua situação financeira hoje?',
        options: [
          { value: 'apertado',     label: 'Estou apertado',             icon: 'alert-circle', sub: 'Dívidas e contas no limite' },
          { value: 'organizando',  label: 'Estou me organizando',       icon: 'layout-list',   sub: 'Conhecendo onde meu dinheiro vai' },
          { value: 'no_controle',  label: 'Tenho controle',             icon: 'check-circle',  sub: 'Pago tudo em dia, sobra pouco' },
          { value: 'sobrando',     label: 'Sobra todo mês',             icon: 'trending-up',   sub: 'Quero fazer o dinheiro render' },
        ],
      },
      { key: 'objetivo',      type: 'single',
        title: 'Qual é a sua prioridade financeira agora?',
        options: [
          { value: 'dividas',  label: 'Sair do vermelho / quitar dívidas', icon: 'circle-x' },
          { value: 'reserva',  label: 'Montar reserva de emergência',       icon: 'shield' },
          { value: 'imovel',   label: 'Comprar imóvel ou veículo',          icon: 'home' },
          { value: 'investir', label: 'Investir e crescer patrimônio',      icon: 'trending-up' },
          { value: 'controle', label: 'Organizar e ter controle',           icon: 'layout-dashboard' },
        ],
      },
      { key: 'primeira_acao', type: 'first_action' },
    ];

    const ob = Store.getOnboarding();
    const isInvited = _onboardingIsInvited();
    const STEPS = STEPS_ALL.filter(s => !(s.skipIfInvited && isInvited));

    // Estado local — reusa respostas anteriores se pausou
    const answers = Object.assign({}, ob.answers || {});
    let currentStep = Math.min(Math.max(ob.pausedAtStep || 0, 0), STEPS.length - 1);
    const isResuming = currentStep > 0;

    // ── Overlay + card ───────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,16,32,0.78);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;animation:obFade .25s ease';

    const card = document.createElement('div');
    card.style.cssText = 'max-width:560px;width:100%;max-height:92vh;overflow-y:auto;background:var(--bg-card);border-radius:var(--radius-xl);padding:36px;box-shadow:0 24px 80px rgba(15,16,32,0.4);position:relative';

    // Keyframes injetados uma vez
    if (!document.getElementById('obStyles')) {
      const st = document.createElement('style');
      st.id = 'obStyles';
      st.textContent = `
        @keyframes obFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes obSlide { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        .ob-fade-in { animation: obSlide .3s ease both }
      `;
      document.head.appendChild(st);
    }

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // ── Helpers ──────────────────────────────────────────────────
    function coachBubble(text) {
      return `
        <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:24px">
          <div style="width:42px;height:42px;border-radius:50%;background:var(--haile-indigo-soft);border:1px solid var(--haile-indigo);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
            <img src="../assets/svg/haile-mark-indigo.svg" alt="Haile" style="width:24px;height:24px"/>
          </div>
          <div style="flex:1;background:var(--bg-elevated);border-radius:14px;padding:14px 16px;font-size:14px;line-height:1.6;color:var(--text-1)">
            ${text}
          </div>
        </div>`;
    }

    function progressBar() {
      const total = STEPS.length;
      const pct = Math.round(((currentStep + 1) / total) * 100);
      return `
        <div style="margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:11px;color:var(--haile-indigo);font-weight:700;letter-spacing:.1em;text-transform:uppercase">Passo ${currentStep + 1} de ${total}</span>
            ${canPauseHere() ? `<button id="obPause" type="button" style="background:none;border:0;color:var(--text-3);font-size:12px;cursor:pointer;padding:4px">Continuar depois</button>` : ''}
          </div>
          <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--haile-indigo);transition:width .3s;border-radius:2px"></div>
          </div>
        </div>`;
    }

    function canPauseHere() {
      // Steps 1-3 (apresentacao/personalidade/nome) são obrigatórios; pausa libera a partir do 4
      return currentStep >= 3;
    }

    function pause() {
      Store.pauseOnboarding(currentStep, answers);
      overlay.remove();
      // Re-renderiza dashboard para mostrar banner persistente
      if (typeof renderDashboard === 'function' && Router?.current === '#dashboard') {
        renderDashboard();
      } else {
        toast('Você pode continuar depois pelo banner no Dashboard', 'success');
      }
    }

    // ── Render ───────────────────────────────────────────────────
    function render() {
      const step = STEPS[currentStep];
      card.innerHTML = `<div class="ob-fade-in">${progressBar()}${renderStepBody(step)}</div>`;
      upgradeIcons(card);
      bindStepEvents(step);

      // Pause button
      card.querySelector('#obPause')?.addEventListener('click', () => {
        if (confirm('Continuar depois? Suas respostas até aqui ficam salvas.')) pause();
      });
    }

    function renderStepBody(step) {
      const name = (answers.nome && answers.nome.name) || _onboardingPrefillName();
      const firstName = name ? name.split(' ')[0] : '';

      switch (step.type) {
        case 'intro': {
          const greeting = isResuming
            ? `Que bom que você voltou${firstName ? ', ' + firstName : ''}! Vamos continuar de onde paramos?`
            : (isInvited
                ? `Olá${firstName ? ', ' + firstName : ''}! Sou o Haile, seu coach financeiro com IA. Você foi convidado para um grupo familiar — em alguns minutos te apresento como funciona.`
                : `Oi${firstName ? ', ' + firstName : ''}! Sou o Haile, seu coach financeiro com IA. Antes de começar, preciso te conhecer um pouco. São 7 perguntas rápidas — leva uns 3 minutos.`);
          return `
            ${coachBubble(greeting)}
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--text-2);line-height:1.55">
                <li style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--haile-indigo);font-weight:700">·</span>Suas respostas ficam só com você. Nada compartilhado.</li>
                <li style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--haile-indigo);font-weight:700">·</span>Você pode pausar e voltar quando quiser.</li>
                <li style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--haile-indigo);font-weight:700">·</span>Quanto mais eu sei, mais úteis ficam minhas orientações.</li>
              </ul>
              <div style="display:flex;justify-content:flex-end;margin-top:24px">
                <button id="obNext" class="btn-primary" style="min-width:140px">${isResuming ? 'Continuar' : 'Vamos lá'}</button>
              </div>
            </div>`;
        }

        case 'personality': {
          const selected = answers.personalidade;
          return `
            ${coachBubble('Eu falo de 3 jeitos diferentes. Qual combina mais com você? Você pode mudar depois nas configurações.')}
            <div style="display:flex;flex-direction:column;gap:10px;margin:8px 0 24px">
              ${PERSONALITIES.map(p => {
                const isSel = selected === p.key;
                return `<button class="ob-opt" data-val="${p.key}" type="button"
                  style="background:${isSel ? 'var(--haile-indigo-soft)' : 'var(--bg-elevated)'};
                         border:2px solid ${isSel ? 'var(--haile-indigo)' : 'var(--border)'};
                         border-radius:var(--radius-lg);padding:16px;text-align:left;cursor:pointer;
                         transition:all .15s;color:var(--text-1);width:100%">
                  <div style="display:flex;gap:12px;align-items:flex-start">
                    <div style="width:36px;height:36px;border-radius:50%;background:${isSel ? 'var(--haile-indigo)' : 'var(--bg-base)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                      ${icon(p.iconName, { size: 18, color: isSel ? '#fff' : 'var(--text-2)' })}
                    </div>
                    <div style="flex:1;min-width:0">
                      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:2px">
                        <div style="font-size:14px;font-weight:700;color:${isSel ? 'var(--haile-indigo-deep)' : 'var(--text-1)'}">${p.label}</div>
                        <div style="font-size:11px;color:var(--text-3)">${p.short}</div>
                      </div>
                      <div style="font-size:12px;color:var(--text-3);line-height:1.5;margin-bottom:8px">${p.desc}</div>
                      <div style="font-size:12px;color:var(--text-2);line-height:1.55;font-style:italic;padding:8px 10px;background:var(--bg-base);border-radius:8px;border-left:2px solid ${isSel ? 'var(--haile-indigo)' : 'var(--border)'}">"${p.sample}"</div>
                    </div>
                  </div>
                </button>`;
              }).join('')}
            </div>
            ${navButtons()}`;
        }

        case 'name': {
          const curName  = (answers.nome && answers.nome.name)   || _onboardingPrefillName();
          const curAvSeed = (answers.nome && answers.nome.avatarSeed) || curName || 'Aurora';
          return `
            ${coachBubble('Como posso te chamar? E escolhe um avatar pra te representar.')}
            <div class="field" style="margin-bottom:16px">
              <label style="font-size:12px;font-weight:700;color:var(--text-1);letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px;display:block">Como você quer ser chamado(a)</label>
              <input id="obName" type="text" value="${curName.replace(/"/g, '&quot;')}" placeholder="Seu primeiro nome"
                style="font:inherit;font-size:15px;border:1px solid var(--border);border-radius:12px;padding:12px 14px;background:var(--bg-base);color:var(--text-1);width:100%;outline:none">
            </div>
            <div style="margin-bottom:24px">
              <label style="font-size:12px;font-weight:700;color:var(--text-1);letter-spacing:.04em;text-transform:uppercase;margin-bottom:10px;display:block">Escolha seu avatar</label>
              <div id="obAvatarGrid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px">
                ${AVATAR_SEEDS.map(s => {
                  const isSel = s === curAvSeed;
                  const url = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(s)}&backgroundColor=ede9fe,ddd6fe,e0e7ff,c7d2fe&radius=50`;
                  return `<button type="button" class="ob-avatar" data-seed="${s}"
                    style="background:none;border:2px solid ${isSel ? 'var(--haile-indigo)' : 'transparent'};border-radius:50%;padding:2px;cursor:pointer;transition:border-color .15s;aspect-ratio:1">
                    <img src="${url}" alt="" style="width:100%;height:100%;border-radius:50%;display:block">
                  </button>`;
                }).join('')}
              </div>
            </div>
            ${navButtons()}`;
        }

        case 'single': {
          const selected = answers[step.key];
          return `
            ${coachBubble(step.title)}
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:8px 0 24px">
              ${step.options.map(o => {
                const isSel = selected === o.value;
                return `<button class="ob-opt" data-val="${o.value}" type="button"
                  style="background:${isSel ? 'var(--haile-indigo-soft)' : 'var(--bg-elevated)'};
                         border:2px solid ${isSel ? 'var(--haile-indigo)' : 'var(--border)'};
                         border-radius:var(--radius-lg);padding:14px;text-align:left;cursor:pointer;transition:all .15s;color:var(--text-1)">
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:32px;height:32px;border-radius:50%;background:${isSel ? 'var(--haile-indigo)' : 'var(--bg-base)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                      ${icon(o.icon, { size: 16, color: isSel ? '#fff' : 'var(--text-2)' })}
                    </div>
                    <div style="flex:1;min-width:0">
                      <div style="font-size:13px;font-weight:600;color:${isSel ? 'var(--haile-indigo-deep)' : 'var(--text-1)'}">${o.label}</div>
                      ${o.sub ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">${o.sub}</div>` : ''}
                    </div>
                  </div>
                </button>`;
              }).join('')}
            </div>
            ${navButtons()}`;
        }

        case 'first_action': {
          const objetivo = answers.objetivo;
          let suggestion = 'Que tal começarmos juntos? Você pode lançar sua primeira despesa, definir uma meta, ou só explorar o app.';
          if (objetivo === 'reserva')  suggestion = 'Como sua prioridade é montar reserva de emergência, sugiro começarmos criando essa meta agora.';
          if (objetivo === 'dividas')  suggestion = 'Como sua prioridade é quitar dívidas, vamos começar mapeando o que você deve. Cada conta vira um pequeno plano de ação.';
          if (objetivo === 'imovel')   suggestion = 'Como sua prioridade é comprar um imóvel ou veículo, vamos criar essa meta com prazo e valor. Eu acompanho o avanço com você.';
          if (objetivo === 'investir') suggestion = 'Como sua prioridade é fazer o dinheiro render, vamos começar olhando seus investimentos atuais. Você adiciona o que já tem e eu ajudo a planejar os próximos aportes.';
          if (objetivo === 'controle') suggestion = 'Como sua prioridade é ter controle, vamos começar pelas suas despesas fixas. Em alguns lançamentos eu já consigo te mostrar onde está indo seu dinheiro.';
          return `
            ${coachBubble(`Tudo pronto${(answers.nome?.name || _onboardingPrefillName()) ? ', ' + (answers.nome.name || _onboardingPrefillName()).split(' ')[0] : ''}! ${suggestion}`)}
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
              <button class="ob-action" data-action="meta" type="button"
                style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;text-align:left;cursor:pointer;color:var(--text-1);display:flex;align-items:center;gap:12px;width:100%">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--haile-indigo);display:flex;align-items:center;justify-content:center">${icon('target', { size: 16, color: '#fff' })}</div>
                <div style="flex:1"><div style="font-size:13px;font-weight:600">Criar minha primeira meta</div><div style="font-size:11px;color:var(--text-3)">Define um objetivo concreto e eu acompanho</div></div>
              </button>
              <button class="ob-action" data-action="lancamento" type="button"
                style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;text-align:left;cursor:pointer;color:var(--text-1);display:flex;align-items:center;gap:12px;width:100%">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--haile-indigo);display:flex;align-items:center;justify-content:center">${icon('plus-circle', { size: 16, color: '#fff' })}</div>
                <div style="flex:1"><div style="font-size:13px;font-weight:600">Lançar minha primeira despesa</div><div style="font-size:11px;color:var(--text-3)">Comece registrando o dia-a-dia</div></div>
              </button>
              <button class="ob-action" data-action="explorar" type="button"
                style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;text-align:left;cursor:pointer;color:var(--text-1);display:flex;align-items:center;gap:12px;width:100%">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--bg-base);border:1px solid var(--border);display:flex;align-items:center;justify-content:center">${icon('compass', { size: 16, color: 'var(--text-2)' })}</div>
                <div style="flex:1"><div style="font-size:13px;font-weight:600">Só explorar primeiro</div><div style="font-size:11px;color:var(--text-3)">Você decide quando começar</div></div>
              </button>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;gap:10px">
              <button id="obBack" class="btn-secondary" type="button" style="min-width:90px">Voltar</button>
              <button id="obFinish" class="btn-primary" type="button" style="min-width:140px" disabled>Concluir</button>
            </div>`;
        }
      }
      return '';
    }

    function navButtons() {
      const isFirst = currentStep === 0;
      return `
        <div style="display:flex;justify-content:${isFirst ? 'flex-end' : 'space-between'};align-items:center;margin-top:8px;gap:10px">
          ${isFirst ? '' : `<button id="obBack" class="btn-secondary" type="button" style="min-width:90px">Voltar</button>`}
          <button id="obNext" class="btn-primary" type="button" style="min-width:140px">Continuar</button>
        </div>`;
    }

    // ── Event binding por tipo de step ───────────────────────────
    function bindStepEvents(step) {
      // Voltar
      card.querySelector('#obBack')?.addEventListener('click', () => {
        if (currentStep > 0) { currentStep--; render(); }
      });

      if (step.type === 'intro') {
        card.querySelector('#obNext')?.addEventListener('click', () => goNext('apresentacao'));
        return;
      }

      if (step.type === 'personality') {
        card.querySelectorAll('.ob-opt').forEach(btn => {
          btn.addEventListener('click', () => {
            answers.personalidade = btn.dataset.val;
            render();
          });
        });
        card.querySelector('#obNext')?.addEventListener('click', () => {
          if (!answers.personalidade) return toast('Escolha um estilo para continuar', 'error');
          goNext('personalidade');
        });
        return;
      }

      if (step.type === 'name') {
        const input = card.querySelector('#obName');
        // Inicializa avatarSeed se ainda não tem
        if (!answers.nome) answers.nome = { name: '', avatarSeed: '' };
        if (!answers.nome.avatarSeed) {
          answers.nome.avatarSeed = (input?.value || _onboardingPrefillName() || 'Aurora');
        }
        input?.addEventListener('input', () => {
          answers.nome.name = input.value.trim();
        });
        card.querySelectorAll('.ob-avatar').forEach(btn => {
          btn.addEventListener('click', () => {
            answers.nome.avatarSeed = btn.dataset.seed;
            // Atualiza UI sem re-render completo
            card.querySelectorAll('.ob-avatar').forEach(b => {
              b.style.borderColor = b.dataset.seed === btn.dataset.seed ? 'var(--haile-indigo)' : 'transparent';
            });
          });
        });
        card.querySelector('#obNext')?.addEventListener('click', () => {
          const v = (input?.value || '').trim();
          if (!v) return toast('Diz seu nome pra eu te chamar', 'error');
          answers.nome.name = v;
          if (!answers.nome.avatarSeed) answers.nome.avatarSeed = v;
          goNext('nome');
        });
        return;
      }

      if (step.type === 'single') {
        card.querySelectorAll('.ob-opt').forEach(btn => {
          btn.addEventListener('click', () => {
            answers[step.key] = btn.dataset.val;
            render();
          });
        });
        card.querySelector('#obNext')?.addEventListener('click', () => {
          if (!answers[step.key]) return toast('Selecione uma opção', 'error');
          goNext(step.key);
        });
        return;
      }

      if (step.type === 'first_action') {
        card.querySelectorAll('.ob-action').forEach(btn => {
          btn.addEventListener('click', () => {
            answers.primeira_acao = btn.dataset.action;
            card.querySelectorAll('.ob-action').forEach(b => {
              const sel = b.dataset.action === btn.dataset.action;
              b.style.borderColor    = sel ? 'var(--haile-indigo)' : 'var(--border)';
              b.style.background     = sel ? 'var(--haile-indigo-soft)' : 'var(--bg-elevated)';
            });
            const fin = card.querySelector('#obFinish');
            if (fin) fin.disabled = false;
          });
        });
        card.querySelector('#obFinish')?.addEventListener('click', () => {
          if (!answers.primeira_acao) return toast('Escolha uma opção pra terminar', 'error');
          completeOnboardingFlow();
        });
        return;
      }
    }

    function goNext(stepKey) {
      try { Store.markOnboardingStep(stepKey); } catch (e) {}
      // Aplica side-effects parciais conforme avança
      applyPartialAnswers();
      currentStep++;
      render();
    }

    function applyPartialAnswers() {
      const data = Store.get();
      if (!data.settings) data.settings = {};

      // Personalidade
      if (answers.personalidade) {
        data.settings.coachPersonality = answers.personalidade;
      }
      // Nome + avatar
      if (answers.nome && answers.nome.name) {
        const seed = answers.nome.avatarSeed || answers.nome.name;
        Store.setProfile({ name: answers.nome.name });
        // Salva override de avatar pra essa pessoa
        if (!data.settings.pessoaAvatars) data.settings.pessoaAvatars = {};
        data.settings.pessoaAvatars[answers.nome.name] =
          `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ede9fe,ddd6fe,e0e7ff,c7d2fe&radius=50`;
      }
      Store.persist();
    }

    // ── Finalizador ──────────────────────────────────────────────
    function completeOnboardingFlow() {
      applyPartialAnswers();
      try { Store.markOnboardingStep('primeira_acao'); } catch (e) {}

      // Cria meta sugerida conforme objetivo
      if (answers.objetivo === 'reserva') {
        try { Store.addMeta({ label: 'Reserva de emergência', type: 'reserva', target: 0, atual: 0, active: true }); } catch (e) {}
      } else if (answers.objetivo === 'imovel') {
        try { Store.addMeta({ label: 'Comprar imóvel', type: 'objetivo', target: 0, atual: 0, active: true }); } catch (e) {}
      }

      Store.completeOnboarding(answers);
      overlay.remove();
      const first = (answers.nome?.name || _onboardingPrefillName() || '').split(' ')[0];
      toast(`Bem-vindo${first ? ', ' + first : ''}!`, 'success');

      // Roteamento conforme escolha de primeira ação
      const act = answers.primeira_acao;
      setTimeout(() => {
        if (act === 'meta')        Router.navigate('#metas');
        else if (act === 'lancamento') Router.navigate('#lancamentos');
        else                           renderDashboard?.();
      }, 300);
    }

    render();
  }

  // ══════════════════════════════════════════════════════════════
  // AI COACH
  // ══════════════════════════════════════════════════════════════
  function initCoach() {
    const panel    = document.getElementById('coachPanel');
    const sidebar  = document.getElementById('sidebar');
    const btnOpen  = document.getElementById('btnCoach');
    const btnClose = document.getElementById('coachCloseBtn');
    const btnClear = document.getElementById('coachClearBtn');
    const input    = document.getElementById('coachInput');
    const sendBtn  = document.getElementById('coachSendBtn');
    const msgs     = document.getElementById('coachMessages');
    const resizeH  = document.getElementById('coachResizeHandle');
    const statusEl = document.getElementById('coachStatus');
    if (!panel || !btnOpen) return;

    let history = []; // [{role, content}]
    let isLoading = false;
    let panelWidth = parseInt(localStorage.getItem('ff_coach_width') || '380', 10);
    let lastActivity = Date.now();
    const INACTIVITY_MS = 4 * 60 * 60 * 1000; // 4 horas

    const layout = document.getElementById('app');

    function resetConversation() {
      history = [];
      // Build context-aware suggestions
      const reservas = Store.get('reservas') || [];
      const metas = Store.get('metas') || [];
      const temInvestimentos = reservas.length > 0;
      const temMetas = metas.length > 0;
      let suggestions;
      if (temInvestimentos) {
        suggestions = [
          'Como está minha diversificação?',
          'Qual o rendimento estimado do meu portfólio?',
          temMetas ? 'Estou no caminho das minhas metas?' : 'Onde posso economizar?',
          'Como está minha saúde financeira?',
        ];
      } else {
        suggestions = [
          'Qual meu maior gasto esse mês?',
          'Estou dentro do orçamento?',
          'Onde posso economizar?',
          'Como está minha saúde financeira?',
        ];
      }
      msgs.innerHTML = `
      <div class="coach-welcome">
        <div class="coach-avatar-lg" style="overflow:hidden">
          <img src="../assets/svg/haile-mark-white.svg" alt="Haile" style="width:38px;height:auto;display:block">
        </div>
        <p>Olá! Sou seu coach financeiro. Tenho acesso ao seu histórico completo e posso responder perguntas como:</p>
        <div class="coach-suggestions" id="coachSuggestions">
          ${suggestions.map(s => `<button class="coach-suggestion">${s}</button>`).join('')}
        </div>
        <div class="coach-privacy-footer">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Seus dados ficam locais. As conversas são processadas com segurança e não treinam o modelo.
        </div>
      </div>`;
      bindSuggestions();
    }

    function openPanel() {
      // Limpa só se passou muito tempo sem interação
      if (history.length > 0 && (Date.now() - lastActivity) > INACTIVITY_MS) {
        resetConversation();
      }
      lastActivity = Date.now();
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      panel.style.width = panelWidth + 'px';
      layout.classList.add('coach-open');
      sidebar.classList.add('icon-only');
      layout.style.setProperty('--coach-panel-w', panelWidth + 'px');
      btnOpen.classList.add('active');
      input.focus();
    }

    // Minimiza (preserva histórico). Usado em clique fora.
    function minimizePanel() {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      layout.classList.remove('coach-open');
      sidebar.classList.remove('icon-only');
      btnOpen.classList.remove('active');
    }

    // Fecha de fato (limpa histórico). Usado no botão X.
    function closePanel() {
      minimizePanel();
      resetConversation();
    }

    btnOpen.addEventListener('click', () => {
      panel.classList.contains('open') ? minimizePanel() : openPanel();
    });
    btnClose.addEventListener('click', closePanel);

    btnClear.addEventListener('click', () => {
      resetConversation();
      lastActivity = Date.now();
    });

    // Width presets (380 compact / 440 regular / 520 wide)
    function updateWidthPresetActive() {
      document.querySelectorAll('[data-coach-width]').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.coachWidth, 10) === panelWidth);
      });
    }
    document.querySelectorAll('[data-coach-width]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const w = parseInt(b.dataset.coachWidth, 10);
        panelWidth = w;
        panel.style.width = w + 'px';
        layout.style.setProperty('--coach-panel-w', w + 'px');
        localStorage.setItem('ff_coach_width', w);
        updateWidthPresetActive();
      });
    });
    updateWidthPresetActive();

    // Click outside → minimiza (preserva conversa)
    document.addEventListener('mousedown', (e) => {
      if (!panel.classList.contains('open')) return;
      if (panel.contains(e.target)) return;
      if (btnOpen.contains(e.target)) return; // toggle já trata
      minimizePanel();
    });

    // ── Drag to resize ────────────────────────────────────────────
    let dragging = false, startX = 0, startW = 0;
    resizeH.addEventListener('mousedown', e => {
      dragging = true; startX = e.clientX; startW = panel.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const delta = startX - e.clientX;
      const newW = Math.min(640, Math.max(300, startW + delta));
      panel.style.width = newW + 'px';
      layout.style.setProperty('--coach-panel-w', newW + 'px');
      panelWidth = newW;
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('ff_coach_width', panelWidth);
    });

    // ── Build financial context ───────────────────────────────────
    function buildContext() {
      const month = getMonth(), year = getYear();
      const data  = Store.get();
      const rec   = Store.sumReceitas(month, year);
      const desp  = Store.sumDespesas(month, year);
      const saldo = rec - desp;
      const util  = rec > 0 ? ((desp / rec) * 100).toFixed(1) : '0';

      // ── Despesas detalhadas: por categoria → subcategoria → top descrições ──
      const despesasMes = Store.despesasByMonth(month, year);
      const catAgg = {}; // { catKey: { total, subs: { subName: { total, items: [{desc, amount, pessoa}] } } } }
      despesasMes.forEach(d => {
        const ck = d.category || 'outros';
        if (!catAgg[ck]) catAgg[ck] = { total: 0, subs: {} };
        catAgg[ck].total += d.amount;
        const sk = d.sub || '(sem subcat)';
        if (!catAgg[ck].subs[sk]) catAgg[ck].subs[sk] = { total: 0, items: [] };
        catAgg[ck].subs[sk].total += d.amount;
        catAgg[ck].subs[sk].items.push({ desc: d.desc, amount: d.amount, pessoa: d.person || d.responsavel || '—', date: d.date });
      });
      const catEntries = Object.entries(catAgg).sort((a,b) => b[1].total - a[1].total).slice(0, 8);
      const despesasDetalhadas = catEntries.length === 0 ? '  (sem despesas)' : catEntries.map(([ck, info]) => {
        const catLabel = Store.CATEGORIES[ck]?.label || ck;
        const subs = Object.entries(info.subs).sort((a,b) => b[1].total - a[1].total).slice(0, 5);
        const subStr = subs.map(([sk, sub]) => {
          const topItems = sub.items.sort((a,b) => b.amount - a.amount).slice(0, 3)
            .map(i => `      · ${i.desc} (${i.pessoa}): R$ ${i.amount.toFixed(2)}`).join('\n');
          return `    - ${sk}: R$ ${sub.total.toFixed(2)}\n${topItems}`;
        }).join('\n');
        return `  ▸ ${catLabel}: R$ ${info.total.toFixed(2)}\n${subStr}`;
      }).join('\n');

      // ── Receitas detalhadas: por pessoa → top descrições ──
      const recsMes = Store.receitasByMonth(month, year);
      const recByPerson = {};
      recsMes.forEach(r => {
        const p = r.person || r.responsavel || 'Sem responsável';
        if (!recByPerson[p]) recByPerson[p] = { total: 0, items: [] };
        recByPerson[p].total += r.amount;
        recByPerson[p].items.push({ desc: r.desc, amount: r.amount });
      });
      const receitasDetalhadas = Object.entries(recByPerson).length === 0 ? '  (sem receitas)' :
        Object.entries(recByPerson).sort((a,b) => b[1].total - a[1].total).map(([p, info]) => {
          const top = info.items.sort((a,b) => b.amount - a.amount).slice(0, 3)
            .map(i => `    · ${i.desc}: R$ ${i.amount.toFixed(2)}`).join('\n');
          return `  ▸ ${p}: R$ ${info.total.toFixed(2)}\n${top}`;
        }).join('\n');

      // ── Despesas por pessoa (quem gasta o quê) ──
      const despPorPessoa = {};
      despesasMes.forEach(d => {
        const p = d.person || d.responsavel || 'Sem responsável';
        if (!despPorPessoa[p]) despPorPessoa[p] = 0;
        despPorPessoa[p] += d.amount;
      });
      const despPessoaStr = Object.entries(despPorPessoa).sort((a,b) => b[1] - a[1])
        .map(([p,v]) => {
          const recP = recByPerson[p]?.total || 0;
          const saldoP = recP - v;
          return `  - ${p}: gastou R$ ${v.toFixed(2)}${recP ? ` / recebeu R$ ${recP.toFixed(2)} → saldo R$ ${saldoP.toFixed(2)}` : ''}`;
        }).join('\n') || '  (sem despesas atribuídas)';

      // ── Estrutura de categorias e subcategorias disponíveis ──
      const catSubMap = data.subcategorias || {};
      const estruturaCats = Object.entries(Store.CATEGORIES || {})
        .filter(([k]) => k !== 'receita')
        .map(([k, v]) => {
          const subs = (catSubMap[k] || []).slice(0, 8);
          const tipoId = Store.getCatTipo ? Store.getCatTipo(k) : 'opcional';
          const tipo = Store.getTipoById ? Store.getTipoById(tipoId) : null;
          const tipoLabel = tipo ? ` · tipo: ${tipo.label}` : '';
          return `  ▸ ${v.label} (${k})${tipoLabel}: ${subs.length ? subs.join(', ') : 'sem subcategorias'}`;
        }).join('\n');

      // ── Tipos customizáveis + Poder de Escolha ──
      const tipos = (typeof Store.getTipos === 'function') ? Store.getTipos() : [];
      const tiposStr = tipos.length === 0 ? '  (modelo legado)' :
        tipos.map(t => `  - ${t.icon||'•'} ${t.label} [${t.comportamento}]: ${t.desc || '—'}`).join('\n');
      const poder = (typeof Store.calcPoderDeEscolha === 'function') ? Store.calcPoderDeEscolha(month, year) : null;
      const poderStr = poder ?
        `Receitas R$ ${poder.receitas.toFixed(2)} − piso de sobrevivência R$ ${poder.pisoSobrevivencia.toFixed(2)} = **Poder de Escolha** R$ ${poder.poderDeEscolha.toFixed(2)} (${(poder.pct*100).toFixed(0)}% da receita).`
        : '';

      // ── Pessoas cadastradas ──
      const pessoas = data.pessoas || Store.PESSOAS || [];
      const pessoasStr = pessoas.length ? pessoas.join(', ') : 'nenhuma';

      const metas = data.metas || [];
      const metasAtivas = metas.filter(m => !m.concluida);
      const metasStr = metasAtivas.length === 0 ? '  (nenhuma meta ativa)' :
        metasAtivas.slice(0, 5).map(m => {
          const target = m.target ? `R$ ${m.target.toFixed(2)}` : '—';
          const atual  = m.atual  ? `R$ ${m.atual.toFixed(2)}`  : 'R$ 0,00';
          return `  - ${m.label} (${m.type || 'objetivo'}): alvo ${target}, atual ${atual}${m.deadline ? `, prazo ${m.deadline}` : ''}`;
        }).join('\n');

      const contratos = Store.getContratos().filter(c => c.active !== false);
      const contratosResumo = contratos.length === 0 ? '  (sem contratos ativos)' :
        contratos.slice(0, 8).map(c => `  - ${c.label}: ${c.kind === 'receita' ? '+' : '-'}R$ ${c.valorParcela.toFixed(2)}/${c.periodicidade === 'anual' ? 'ano' : 'mês'} (${c.category}/${c.sub || '—'})`).join('\n');

      const anomalias = detectAnomalias(month, year);
      const anomStr = anomalias.length
        ? anomalias.slice(0,3).map(a => `  - ${a.label}: +${(a.delta*100).toFixed(0)}% acima da média`).join('\n')
        : '  Nenhuma anomalia detectada';

      const settings = data.settings || {};
      const limiteGasto = settings.limiteGasto ? (settings.limiteGasto*100).toFixed(0)+'%' : '80%';
      const metaRecMensal = settings.metaReceita ? `R$ ${settings.metaReceita.toFixed(2)}` : 'não definida';
      const pessoa = currentPessoa();
      const userName = Store.getProfile()?.name || pessoa || 'usuário';

      // Patrimônio resumido
      const patTotal = Store.totalAtivos();

      // ── Histórico anual (totais mês a mês do ano corrente) ──
      const yrRec  = Store.yearlyMonthly(year, 'receita');
      const yrDesp = Store.yearlyMonthly(year, 'despesa');
      const histStr = yrRec.map((r, i) => {
        const d = yrDesp[i] || 0;
        if (r === 0 && d === 0) return null;
        return `  ${Utils.months[i]}: rec R$ ${r.toFixed(2)} / desp R$ ${d.toFixed(2)} / saldo R$ ${(r-d).toFixed(2)}`;
      }).filter(Boolean).join('\n') || '  (sem dados)';
      const totalRecAno  = yrRec.reduce((a,b)=>a+b, 0);
      const totalDespAno = yrDesp.reduce((a,b)=>a+b, 0);

      // Mês anterior comparativo
      const prevM = month > 1 ? month - 1 : 12;
      const prevY = month > 1 ? year      : year - 1;
      const prevRec = Store.sumReceitas(prevM, prevY);
      const prevDesp = Store.sumDespesas(prevM, prevY);
      const chgRec  = prevRec  > 0 ? (((rec  - prevRec)  / prevRec)  * 100).toFixed(1) : 'n/d';
      const chgDesp = prevDesp > 0 ? (((desp - prevDesp) / prevDesp) * 100).toFixed(1) : 'n/d';

      // ── Contas bancárias ──
      const contas = data.contas || [];
      const contasStr = contas.length === 0 ? '  (sem contas)' :
        contas.map(c => `  - ${c.banco} ${c.nome} (${c.tipo}): R$ ${(c.saldo||0).toFixed(2)}`).join('\n');
      const totalContas = contas.reduce((s,c) => s + (c.saldo||0), 0);

      // ── Cartões de crédito ──
      const cartoes = data.cartoes || [];
      const cartoesStr = cartoes.length === 0 ? '  (sem cartões)' :
        cartoes.map(cc => {
          const usado = (cc.parcelas || []).reduce((s,p) => s + (p.parcela||0), 0);
          const livre = (cc.limit||0) - usado;
          return `  - ${cc.banco} ${cc.name}: limite R$ ${(cc.limit||0).toFixed(2)} / usado R$ ${usado.toFixed(2)} / disponível R$ ${livre.toFixed(2)} (fecha dia ${cc.closingDay||'?'}, vence ${cc.dueDay||'?'})`;
        }).join('\n');

      // ── Investimentos detalhados ──
      const reservas = data.reservas || [];
      const reservasStr = reservas.length === 0 ? '  (sem investimentos)' :
        reservas.slice(0, 12).map(r => {
          const val = r.valorAtual || r.valorInvestido || 0;
          return `  - ${r.nome} (${r.tipo || '—'}): R$ ${val.toFixed(2)}${r.rendimento ? ` @ ${r.rendimento}% a.a.` : ''}${r.carencia ? ` 🔒 até ${r.carencia}` : ''}`;
        }).join('\n');
      const totalInv = reservas.reduce((s,r) => s + (r.valorAtual || r.valorInvestido || 0), 0);

      // ── Veículos ──
      const veiculos = (typeof Store.getVeiculos === 'function') ? Store.getVeiculos() : [];
      const veiculosStr = veiculos.length === 0 ? '  (sem veículos)' :
        veiculos.map(v => {
          const val = Store.veiculoValorEstimado(v);
          const custo = Store.veiculoCustoAnual(v);
          return `  - ${v.marca||''} ${v.modelo||''} (${v.ano||'?'}): valor R$ ${val.toFixed(2)} / custo anual R$ ${custo.toFixed(2)}`;
        }).join('\n');

      // ── Imóveis ──
      const imoveis = (typeof Store.getImoveis === 'function') ? Store.getImoveis() : [];
      const imoveisStr = imoveis.length === 0 ? '  (sem imóveis)' :
        imoveis.map(im => {
          const val = Store.imovelValorEstimado(im);
          const eq  = Store.imovelEquity(im);
          const flux = (im.aluguelMensal || 0) - (im.condominioMensal || 0) - (im.manutencaoMensal || 0) - (im.parcelaFinanciamento || 0) - ((im.iptuAnual || 0) / 12);
          const extra = [];
          if (im.financiado) extra.push(`saldo devedor R$ ${(im.saldoDevedor||0).toFixed(2)}, equity R$ ${eq.toFixed(2)}`);
          if (im.alugado) extra.push(`aluguel R$ ${im.aluguelMensal.toFixed(2)}/mês, fluxo líquido R$ ${flux.toFixed(2)}/mês`);
          return `  - ${im.apelido || im.endereco || 'imóvel'} (${im.tipo}): valor R$ ${val.toFixed(2)}${extra.length ? ' · ' + extra.join(' · ') : ''}`;
        }).join('\n');

      // ── Financiamentos ──
      const fins = (typeof Store.getFinanciamentos === 'function') ? Store.getFinanciamentos() : [];
      const finsStr = fins.length === 0 ? '  (sem financiamentos)' :
        fins.map(f => {
          const saldo = Store.financiamentoSaldoDevedor(f);
          const prox = Math.min((f.parcelasPagas||0)+1, f.prazo||0);
          const parc = prox > 0 ? Store.financiamentoParcelaNa(f, prox) : 0;
          return `  - ${f.label} (${f.sistema?.toUpperCase()}, ${f.type}): saldo devedor R$ ${saldo.toFixed(2)} / próx parcela R$ ${parc.toFixed(2)} (${f.parcelasPagas||0}/${f.prazo} pagas, taxa ${(f.taxaMensal||0).toFixed(2)}% a.m.)`;
        }).join('\n');
      const totalDevedorFin = (typeof Store.totalFinanciamentosDevedor === 'function') ? Store.totalFinanciamentosDevedor() : 0;

      // ── Passivos ──
      const passivos = (typeof Store.getPassivos === 'function') ? Store.getPassivos() : [];
      const passivosAtivos = passivos.filter(p => p.status !== 'quitado');
      const passivosStr = passivosAtivos.length === 0 ? '  (sem passivos)' :
        passivosAtivos.slice(0, 8).map(p => `  - ${p.descricao || p.tipo}: R$ ${(p.valorAcordado || p.valorOriginal || 0).toFixed(2)} (${p.status || 'pendente'})`).join('\n');
      const totalPass = (typeof Store.totalPassivos === 'function') ? Store.totalPassivos() : 0;

      // ── Reembolsos ──
      const reembPend = (typeof Store.getReembolsosPendentes === 'function') ? Store.getReembolsosPendentes() : [];
      const reembStr = reembPend.length === 0 ? '  (sem pendências)' :
        reembPend.slice(0, 6).map(d => {
          const r = d.reembolso || {};
          return `  - ${d.desc}: R$ ${(r.valor || d.amount).toFixed(2)} (de ${r.de||'?'} → ${r.para||'?'})`;
        }).join('\n');
      const totalReemb = reembPend.reduce((s,d) => s + ((d.reembolso?.valor) || d.amount || 0), 0);

      // ── Recebimentos futuros ──
      const recFut = (data.recebimentosFuturos || []).filter(f => f.status !== 'recebido');
      const recFutStr = recFut.length === 0 ? '  (sem previsões)' :
        recFut.slice(0, 6).map(f => `  - ${f.descricao}: R$ ${(f.valor||0).toFixed(2)} previsto ${Utils.monthsFull[(f.mes||1)-1]} ${f.ano}`).join('\n');
      const totalRecFut = recFut.reduce((s,f) => s + (f.valor||0), 0);

      return `Você é o **Haile** — coach financeiro pessoal da família, com inteligência artificial. Você acompanha o usuário como um conselheiro próximo, não como um chatbot. Tagline da marca: "Seu coach financeiro pessoal".

USUÁRIO LOGADO: ${userName}
PESSOAS DA FAMÍLIA: ${pessoasStr}
MÊS DE REFERÊNCIA: ${Utils.monthsFull[month-1]} ${year}

=== RESUMO DO MÊS ===
Receitas: R$ ${rec.toFixed(2)} (vs mês anterior: ${chgRec === 'n/d' ? 'n/d' : chgRec + '%'})
Despesas: R$ ${desp.toFixed(2)} (vs mês anterior: ${chgDesp === 'n/d' ? 'n/d' : chgDesp + '%'})
Saldo: R$ ${saldo.toFixed(2)} (${saldo >= 0 ? 'positivo' : 'NEGATIVO'})
Comprometimento da receita: ${util}% (limite configurado: ${limiteGasto})
Meta de receita mensal: ${metaRecMensal}
Patrimônio total estimado: R$ ${patTotal.toFixed(2)}

=== PODER DE ESCOLHA ===
${poderStr || '  (cálculo indisponível)'}

=== TIPOS CADASTRADOS (use para entender o que é cortável/essencial pro usuário) ===
${tiposStr}

=== RESUMO ANUAL (${year}) ===
Receita total no ano: R$ ${totalRecAno.toFixed(2)}
Despesa total no ano: R$ ${totalDespAno.toFixed(2)}
Saldo acumulado: R$ ${(totalRecAno - totalDespAno).toFixed(2)}

=== RECEITAS DETALHADAS (por pessoa, top 3 lançamentos) ===
${receitasDetalhadas}

=== DESPESAS DETALHADAS (categoria → subcategoria → top 3 lançamentos) ===
${despesasDetalhadas}

=== SALDO POR PESSOA ===
${despPessoaStr}

=== ESTRUTURA DE CATEGORIAS DISPONÍVEIS (use ao sugerir lançamentos) ===
${estruturaCats}

=== METAS ATIVAS ===
${metasStr}

=== CONTRATOS RECORRENTES (${contratos.length} ativos) ===
${contratosResumo}

=== HISTÓRICO MENSAL ${year} ===
${histStr}

=== CONTAS BANCÁRIAS (total: R$ ${totalContas.toFixed(2)}) ===
${contasStr}

=== CARTÕES DE CRÉDITO ===
${cartoesStr}

=== INVESTIMENTOS (total atual: R$ ${totalInv.toFixed(2)}) ===
${reservasStr}

=== ANÁLISE DO PORTFÓLIO ===
${(() => {
  if (!reservas.length) return '  (sem investimentos cadastrados)';
  const totalAtual = reservas.reduce((s,r) => s + (r.valorAtual || r.valorInvestido || 0), 0);
  const totalInvestido2 = reservas.reduce((s,r) => s + (r.valorInvestido || 0), 0);
  const ganhoTotal = totalAtual - totalInvestido2;
  const rendPctTotal = totalInvestido2 > 0 ? (ganhoTotal / totalInvestido2 * 100) : 0;
  // Distribuição por tipo
  const byTipo2 = {};
  reservas.forEach(r => { const t = r.tipo||'Outros'; byTipo2[t] = (byTipo2[t]||0) + (r.valorAtual||r.valorInvestido||0); });
  const distStr = Object.entries(byTipo2).sort((a,b)=>b[1]-a[1])
    .map(([t,v]) => `  · ${t}: R$ ${v.toFixed(2)} (${totalAtual>0?(v/totalAtual*100).toFixed(1):0}%)`).join('\n');
  // Taxa média ponderada
  const taxaMedia = totalAtual > 0
    ? reservas.reduce((s,r) => s + ((r.taxaAnual||r.rendimento||0) * (r.valorAtual||r.valorInvestido||0)), 0) / totalAtual
    : 0;
  // Estimativa de rendimento anual
  const rendEstAno2 = reservas.reduce((s,r) => s + ((r.taxaAnual||r.rendimento||0)/100) * (r.valorAtual||r.valorInvestido||0), 0);
  // Diversificação — score simples
  const nTipos = Object.keys(byTipo2).length;
  const divScore = nTipos >= 3 ? 'boa' : nTipos === 2 ? 'moderada' : 'baixa (concentrada)';
  // Ganho acumulado
  const lines = [
    `Ganho acumulado: R$ ${ganhoTotal.toFixed(2)} (${rendPctTotal.toFixed(1)}% sobre capital investido)`,
    `Taxa média ponderada estimada: ${taxaMedia.toFixed(1)}% a.a.`,
    `Rendimento estimado nos próximos 12 meses: R$ ${rendEstAno2.toFixed(2)}`,
    `Diversificação: ${divScore} (${nTipos} tipo${nTipos!==1?'s':''} de ativo)`,
    `Distribuição:\n${distStr}`,
  ];
  // Alertas de portfólio
  const alertas = [];
  if (nTipos === 1) alertas.push('⚠️ Portfólio concentrado em um único tipo de ativo — considere diversificar.');
  if (taxaMedia < 10 && taxaMedia > 0) alertas.push(`⚠️ Taxa média (${taxaMedia.toFixed(1)}% a.a.) abaixo da SELIC — verifique se os produtos estão competitivos.`);
  if (alertas.length) lines.push('Alertas:\n' + alertas.map(a=>'  '+a).join('\n'));
  return lines.join('\n');
})()}

=== VEÍCULOS ===
${veiculosStr}

=== IMÓVEIS ===
${imoveisStr}

=== FINANCIAMENTOS (saldo devedor total: R$ ${totalDevedorFin.toFixed(2)}) ===
${finsStr}

=== PASSIVOS / DÍVIDAS (total: R$ ${totalPass.toFixed(2)}) ===
${passivosStr}

=== REEMBOLSOS PENDENTES (total: R$ ${totalReemb.toFixed(2)}) ===
${reembStr}

=== RECEBIMENTOS FUTUROS PREVISTOS (total: R$ ${totalRecFut.toFixed(2)}) ===
${recFutStr}

=== ANOMALIAS DETECTADAS ===
${anomStr}

${(() => {
  const personality = (data.settings && data.settings.coachPersonality) || 'mentor';
  const personalities = {
    profissional: `PERSONALIDADE: Profissional (CFO pessoal)
Você é direto, técnico, sério. Como um CFO que respeita o tempo do usuário.
Tom: claro e objetivo, sem rodeios emocionais. Cita dados, taxas e percentuais
com naturalidade. Não usa expressões de afeto. Não celebra com exclamações.
Trata números como evidência, não como vitória.`,
    mentor: `PERSONALIDADE: Mentor (Conselho dos pais)
Você é acolhedor, paciente, encorajador. Como um pai/mãe sábio que conhece a
vida financeira do usuário desde sempre.
Tom: caloroso, valida sentimentos antes de aconselhar, celebra conquistas com
genuinidade. Usa "que bom", "isso é ótimo", "estou orgulhoso de você" quando
genuíno. Nunca patroniza, nunca infantiliza. Sugere com "que tal", "podemos
pensar em", em vez de imperativos.`,
    educador: `PERSONALIDADE: Educador (mestre paciente)
Você é didático, explicativo, paciente. Como um professor que ensina o "porquê"
junto com o "o quê".
Tom: explica conceitos sempre que oferece um conselho — não assume conhecimento
prévio. Usa analogias do dia-a-dia. Quando cita uma decisão financeira, explica
a regra ou matemática por trás. Convida o usuário a entender, não só a obedecer.`,
  };
  return personalities[personality] || personalities.mentor;
})()}

INSTRUÇÕES (tom de voz Haile):

ATRIBUTOS DA VOZ
- Conversacional: você é um coach experiente, não uma máquina. Fala como uma pessoa que conhece a vida financeira do usuário.
- Empoderador: inspira ação, nunca ansiedade. Celebra conquistas com valores concretos.
- Preciso: claro e direto ao ponto, sem rodeios.
- Brasileiro: contexto local autêntico (CDI, SELIC, IPVA, IPTU, R$, PIX), sem americanismos.

ACESSO A DADOS
- Você tem acesso COMPLETO aos dados acima: lançamentos detalhados, contas, cartões, investimentos, veículos, imóveis, financiamentos, passivos, reembolsos, histórico mensal e Poder de Escolha.
- Nunca diga "não tenho essa informação" se ela está acima.

OBJETIVIDADE
- Resposta padrão: 1 a 3 frases curtas. Só estenda se o usuário pedir detalhes.
- Não comece com "Ótima pergunta", "Entendi", "Vamos lá", "Olá!".
- Não ofereça menus A/B/C/D a menos que o usuário peça.
- Não liste suas capacidades — responda só o que foi perguntado.

EXEMPLOS DO TOM CERTO
FAÇA: "Percebi que você economizou R$ 450 este mês comparado ao anterior. Parabéns! Que tal direcionar R$ 200 disso para sua meta de viagem em família? Você estaria a 65% do objetivo."
NÃO FAÇA: "Suas despesas foram 15% menores que o mês anterior. Considere realocar o excedente para objetivos de longo prazo."

FAÇA: "Seu Poder de Escolha este mês é R$ 4.850. Você pode gastar isso sem comprometer suas metas."
NÃO FAÇA: "Nosso sistema calculou um saldo discricionário disponível de R$ 4.850,00 após dedução de obrigações fixas e comprometidas."

FAÇA: "Cuidado: o CDB do Itaú está rendendo só 95% CDI. Existem opções com 110% CDI no mercado — vale conversar com seu gerente."
NÃO FAÇA: "Considere otimizar sua estratégia de renda fixa para maximizar rendimentos."

PROIBIDO
- Jargão técnico ou financês ("alocação", "exposure", "realocar excedente")
- Tom infantilizado ("seus gastinhos", "vamos cuidar do seu dinheirinho")
- Tom pessimista ou alarmista ("você está em apuros", "atenção URGENTE")
- Clichês fintech ("seu dinheiro seguro", "plataforma de gestão")
- Promessas genéricas ("vamos fazer juntos sua vida financeira melhorar")
- Tom: CFO pessoal direto, não professor.

FORMATO DA RESPOSTA (importante):
- Texto corrido em parágrafos curtos. NÃO use cabeçalhos (#), listas com - ou *, tabelas, blocos de código.
- Para enumerar inline: "1) ... 2) ... 3) ..."
- VALORES MONETÁRIOS:
  • Sempre formate em real brasileiro com 2 casas decimais: R$ 1.234,56 (ponto para milhar, vírgula para decimal).
  • Sempre coloque o valor entre **asteriscos duplos** (negrito).
  • SEMPRE prefixe com sinal: +R$ 100,00 para entradas/saldos positivos e -R$ 100,00 para gastos/déficits.
  • Exemplos corretos: **+R$ 1.234,56**, **-R$ 380,00**, **+R$ 2.500,00**.
  • Se o número é neutro (ex.: "7 contratos"), NÃO use negrito nem R$.`;
    }

    // ── Render message ────────────────────────────────────────────
    function escapeHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function formatCoachContent(text) {
      let html = escapeHtml(text);
      // Bold **...**
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Signed currency BR: +R$ 1.234,56 / -R$ 380,00 (com ou sem espaço, dentro ou fora de <strong>)
      html = html.replace(/([+\-])\s?R\$\s*[\d.]+(?:,\d{2})?/g, m => {
        const cls = m.trim().startsWith('+') ? 'ff-pos' : 'ff-neg';
        return `<span class="${cls}">${m}</span>`;
      });
      html = html.replace(/\n/g, '<br>');
      return html;
    }
    // Avatar do Coach (SVG inline em vez de emoji ✦)
    const COACH_AVATAR_HTML = `<div class="coach-msg-avatar coach-msg-avatar--ai"><img src="../assets/svg/haile-mark-white.svg" alt="Haile" style="width:14px;height:auto;display:block"></div>`;

    function appendMsg(role, content) {
      const welcome = msgs.querySelector('.coach-welcome');
      if (welcome) welcome.remove();
      const div = document.createElement('div');
      div.className = `coach-msg ${role}`;
      const rendered = role === 'assistant' ? formatCoachContent(content) : escapeHtml(content).replace(/\n/g, '<br>');
      if (role === 'assistant') {
        div.innerHTML = `${COACH_AVATAR_HTML}<div class="coach-bubble">${rendered}</div>`;
      } else {
        const initial = currentPessoa()[0]?.toUpperCase() || 'U';
        div.innerHTML = `<div class="coach-msg-avatar">${initial}</div><div class="coach-bubble">${rendered}</div>`;
      }
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      return div;
    }

    function showTyping() {
      const div = document.createElement('div');
      div.className = 'coach-msg assistant';
      div.id = 'coachTypingIndicator';
      div.innerHTML = `${COACH_AVATAR_HTML}<div class="coach-bubble"><div class="coach-typing"><span></span><span></span><span></span></div></div>`;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function removeTyping() {
      document.getElementById('coachTypingIndicator')?.remove();
    }

    // ── Send message ──────────────────────────────────────────────
    const COACH_PROXY_URL = 'https://lpudgulhnfuwdttetwdn.supabase.co/functions/v1/claude-proxy';
    const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdWRndWxobmZ1d2R0dGV0d2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Nzg3MDUsImV4cCI6MjA5NDQ1NDcwNX0.cT0l012GjSeWV3mgA_-RIq4MEtrLvTUeGwd_cEuhH84';

    async function sendMessage(text) {
      if (!text.trim() || isLoading) return;

      lastActivity = Date.now();
      isLoading = true;
      sendBtn.disabled = true;
      statusEl.textContent = 'Pensando…';
      statusEl.style.color = 'var(--amber)';

      history.push({ role: 'user', content: text });
      appendMsg('user', text);
      input.value = '';
      input.style.height = 'auto';
      showTyping();

      try {
        let res;
        try {
          res = await fetch(COACH_PROXY_URL, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'authorization': `Bearer ${SUPABASE_ANON}`,
            },
            body: JSON.stringify({
              model: Store.get().settings?.claudeModel || 'claude-haiku-4-5-20251001',
              max_tokens: 1024,
              system: buildContext(),
              messages: history,
            }),
          });
        } catch (netErr) {
          throw new Error(`Sem conexão com o servidor. Verifique sua internet. (${netErr.message})`);
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = err.error?.message || err.error || `HTTP ${res.status}`;
          if (res.status === 401) throw new Error('Edge Function não autorizada. Verifique o deploy.');
          if (res.status === 402 || res.status === 529) throw new Error('Conta Anthropic sem créditos. Adicione em console.anthropic.com.');
          if (res.status === 429) throw new Error('Limite de requisições atingido. Aguarde um momento.');
          if (res.status === 500 && msg.includes('ANTHROPIC_API_KEY')) throw new Error('Chave Anthropic não configurada na Edge Function. Configure o secret ANTHROPIC_API_KEY no Supabase.');
          throw new Error(msg);
        }

        const data = await res.json();
        const reply = data.content?.[0]?.text || '(sem resposta)';
        history.push({ role: 'assistant', content: reply });
        removeTyping();
        appendMsg('assistant', reply);
        statusEl.textContent = 'Pronto para ajudar';
        statusEl.style.color = 'var(--accent)';
      } catch (e) {
        removeTyping();
        appendMsg('assistant', `❌ Erro ao conectar com o Claude: ${e.message}`);
        history.pop();
        statusEl.textContent = 'Erro na conexão';
        statusEl.style.color = 'var(--red)';
      } finally {
        isLoading = false;
        sendBtn.disabled = false;
      }
    }

    // ── Input handlers ────────────────────────────────────────────
    sendBtn.addEventListener('click', () => sendMessage(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    function bindSuggestions() {
      document.querySelectorAll('.coach-suggestion').forEach(btn => {
        btn.addEventListener('click', () => sendMessage(btn.textContent));
      });
    }
    bindSuggestions();

    // Expõe API mínima pra outros módulos abrirem o Coach com um prompt pronto
    window.FFCoach = {
      ask(text) {
        openPanel();
        // Pequeno delay pra garantir que o painel pintou antes de submeter
        setTimeout(() => sendMessage(text), 120);
      },
      open: openPanel,
    };
  }

  // Hides nav sections not accessible to 'member' role users
  function _applyMemberNav() {
    const HIDDEN_PAGES = ['receitas','metas','contratos','contas','cartoes','reserva','investimentos','simulacoes','comparativo','financiamentos'];
    HIDDEN_PAGES.forEach(page => {
      const el = document.querySelector(`[data-page="${page}"]`);
      if (el) el.style.display = 'none';
    });
    // Also hide the "Novo Lançamento" button from topbar (member can only log own expenses inline)
    const btnNova = document.getElementById('btnNovaEntrada');
    if (btnNova) btnNova.style.display = 'none';
    // Show member badge in sidebar footer
    const footer = document.querySelector('.sidebar-footer');
    if (footer) {
      const badge = document.createElement('span');
      badge.style.cssText = 'font-size:10px;background:var(--amber)20;color:var(--amber);border:1px solid var(--amber)40;border-radius:20px;padding:2px 8px;margin-right:6px';
      badge.textContent = 'Membro';
      footer.prepend(badge);
    }
  }

  return { init };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());

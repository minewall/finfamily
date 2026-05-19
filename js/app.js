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
    personInitial(name) { return name ? name[0] : '?'; },
    // Retorna URL de avatar pra pessoa. Prioridade:
    // 1) Avatar customizado salvo em settings.pessoaAvatars[name] (URL completa)
    // 2) DiceBear "lorelei" com seed determinístico pelo nome
    personAvatar(name) {
      if (!name) return null;
      const overrides = (Store?.get?.()?.settings?.pessoaAvatars) || {};
      if (overrides[name]) return overrides[name];
      const seed = encodeURIComponent(name);
      return `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}&backgroundColor=ede9fe,ddd6fe,e0e7ff,c7d2fe&radius=50`;
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
    open(title, bodyHTML, onSave) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = bodyHTML;
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.innerHTML = `<button class="btn-secondary" id="modalCancel">Cancelar</button><button class="btn-primary" id="modalSave">Salvar</button>`;
      document.getElementById('modal').appendChild(footer);
      document.getElementById('modalCancel').addEventListener('click', () => this.close());
      if (onSave) document.getElementById('modalSave').addEventListener('click', onSave);
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

    // Mensagem motivacional baseada no saldo
    const heroMood = (() => {
      if (saldo > 0 && util <= limitePct * 0.8)
        return { title: `Excelente, ${currentPessoa()}! 🎉`, sub: 'Você está no controle das suas finanças', tone: 'pos' };
      if (saldo > 0)
        return { title: `Bom trabalho, ${currentPessoa()}! 👏`, sub: 'Saldo positivo este mês — continue assim', tone: 'pos' };
      if (saldo === 0)
        return { title: `Olá, ${currentPessoa()}.`, sub: 'Equilíbrio total entre receitas e despesas', tone: 'neu' };
      if (util > limitePct)
        return { title: `Atenção, ${currentPessoa()}.`, sub: 'Você ultrapassou o limite de gastos do mês', tone: 'neg' };
      return { title: `Cuidado, ${currentPessoa()}.`, sub: 'Saldo negativo — é hora de revisar os gastos', tone: 'neg' };
    })();

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

    // ── Receitas por pessoa para donut ────────────────────────────
    const recsByPerson = {};
    Store.receitasByMonth(month, year).forEach(r => {
      recsByPerson[r.person] = (recsByPerson[r.person] || 0) + r.amount;
    });

    // Anomalias — badge only (card shown in Despesas)
    const anomalias = detectAnomalias(month, year);
    _updateAnomaliasBadge(anomalias.length);

    container.innerHTML = `

<!-- ═══ SEÇÃO 1: MÊS ATUAL ═══════════════════════════════════════ -->
<div class="dash-hero dash-hero--mood-${heroMood.tone}">
  <div class="dash-hero-date">${(() => {
    const t = new Date();
    return t.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  })()}</div>
  <div class="dash-hero-left">
    <div class="dash-hero-greeting">${heroMood.title}</div>
    <div class="dash-hero-sub-text">${heroMood.sub}</div>
    <div class="dash-hero-saldo ${saldo >= 0 ? 'pos' : 'neg'}">${saldo < 0 ? '-' : '+'}${Utils.currency(Math.abs(saldo))}</div>
    <div class="dash-hero-month">${monthLabel}</div>
    ${isMemberHero ? '' : `
    <button class="dash-hero-cta" id="btnNovaEntrada">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
      Novo Lançamento
    </button>`}
  </div>
  <div class="dash-hero-stats">
    <div class="dash-hero-stats-header">${Utils.monthsFull[prevM-1]} ${prevY} <span style="opacity:0.6">· mês anterior</span></div>
    <div class="dash-hero-stat">
      <div class="dash-hero-stat-label">Receitas</div>
      <div class="dash-hero-stat-value pos">+${Utils.currency(prevRec)}</div>
      ${prevRec > 0 ? `<div class="dash-hero-stat-delta ${receita >= prevRec ? 'up' : 'down'}">${receita >= prevRec ? '▲' : '▼'} ${Math.abs((receita - prevRec) / prevRec * 100).toFixed(1)}% este mês</div>` : ''}
    </div>
    <div class="dash-hero-stat">
      <div class="dash-hero-stat-label">Despesas</div>
      <div class="dash-hero-stat-value neg">-${Utils.currency(prevDesp)}</div>
      ${prevDesp > 0 ? `<div class="dash-hero-stat-delta ${despesa <= prevDesp ? 'up' : 'down'}">${despesa <= prevDesp ? '▼' : '▲'} ${Math.abs((despesa - prevDesp) / prevDesp * 100).toFixed(1)}% este mês</div>` : ''}
    </div>
  </div>
</div>

<div class="kpi-grid-dashboard mb-6" id="kpiGrid">

  <!-- Poder de Escolha — card principal, ocupa coluna esquerda inteira -->
  <div class="kpi-card kpi-poder-escolha kpi-poder-main ${poder.poderDeEscolha < 0 ? 'kpi-poder-negativo' : ''}" data-kpi-id="poder">
    <div class="kpi-poder-header">
      <div class="kpi-poder-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/></svg>
      </div>
      <div class="kpi-poder-meta">
        <div class="kpi-poder-tag">Disponível agora</div>
        <div class="kpi-poder-label">Poder de Escolha</div>
        <div class="kpi-poder-month">${monthLabel}</div>
      </div>
    </div>
    <div class="kpi-poder-value">${poder.poderDeEscolha<0?'-':''}${Utils.currency(Math.abs(poder.poderDeEscolha))}</div>
    <div class="kpi-poder-sub">${poder.poderDeEscolha>=0
      ? 'Você pode gastar sem comprometer suas contas e metas'
      : 'Atenção: você ultrapassou o piso de sobrevivência'}</div>
    <div class="kpi-poder-progress">
      <div class="kpi-poder-progress-fill" style="width:${Math.min(poder.pct*100,100)}%"></div>
    </div>
    <div class="kpi-poder-footer">
      <span>Receita: ${Utils.currency(receita)}</span>
      <span>Comprometido: ${Utils.currency(receita - poder.poderDeEscolha)}</span>
    </div>
  </div>

  <!-- Receitas -->
    <div class="kpi-card kpi-receitas" data-kpi-id="receitas" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
      <div class="kpi-icon" style="color:var(--green)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16 7 22 7 22 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="kpi-body">
        <div class="kpi-label">Receitas — ${Utils.monthsFull[month-1]}</div>
        <div class="kpi-value" style="color:var(--green)">+${Utils.currency(receita)}</div>
        <div class="kpi-change ${chgRec>=0?'up':'down'}"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="${chgRec>=0?'M5 1l4 6H1z':'M5 9L1 3h8z'}"/></svg> ${Math.abs(chgRec).toFixed(1)}% vs mês anterior</div>
      </div>
    </div>

    <!-- Saúde Financeira (D2) -->
    <div class="kpi-card kpi-saude" data-kpi-id="saude" style="--kpi-color:${healthColor};--kpi-bg:${healthBg}">
      <div class="kpi-icon" style="color:${healthColor}">${healthIcon}</div>
      <div class="kpi-body">
        <div class="kpi-label">Saúde Financeira</div>
        <div class="kpi-value" style="color:${healthColor}">${Utils.pct(healthPct)} usado</div>
        <div class="kpi-health-bar">
          <div class="kpi-health-bar-fill" style="width:${Math.min(healthPct*100,100)}%;background:${healthColor}"></div>
        </div>
        <div class="kpi-sub">${healthLabel} · limite ${Utils.pct(limitePct)}</div>
      </div>
    </div>

    <!-- Despesas -->
    <div class="kpi-card kpi-despesas" data-kpi-id="despesas" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim)">
      <div class="kpi-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 12V22H4V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 7H2v5h20V7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
      <div class="kpi-body">
        <div class="kpi-label">Despesas — ${Utils.monthsFull[month-1]}</div>
        <div class="kpi-value red">${Utils.currency(despesa)}</div>
        <div class="kpi-change ${chgDesp<=0?'up':'down'}"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="${chgDesp<=0?'M5 1l4 6H1z':'M5 9L1 3h8z'}"/></svg> ${Math.abs(chgDesp).toFixed(1)}% vs mês anterior</div>
      </div>
    </div>

    <!-- Maior Gasto (D3) -->
    ${(() => {
      const topPct = topDesp && despesa > 0 ? (topDesp.amount / despesa * 100).toFixed(0) : null;
      const catLabel = topDesp ? (Store.CATEGORIES[topDesp.category]?.label || topDesp.category) : null;
      const catColor = topDesp ? (Store.CATEGORIES[topDesp.category]?.color || 'var(--amber)') : 'var(--amber)';
      return `<div class="kpi-card kpi-maior-gasto" data-kpi-id="maior-gasto" style="--kpi-color:var(--amber);--kpi-bg:var(--amber-dim)">
      <div class="kpi-icon" style="color:${catColor}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>
      </div>
      <div class="kpi-body">
        <div class="kpi-label">Maior Gasto do Mês</div>
        <div class="kpi-value" style="color:var(--amber)">${topDesp ? Utils.currency(topDesp.amount) : '—'}</div>
        ${catLabel ? `<div class="kpi-sub-cat"><span class="kpi-cat-pill" style="background:${catColor}22;color:${catColor}">${catLabel}</span>${topPct ? `<span class="kpi-cat-pct">${topPct}% do total</span>` : ''}</div>` : `<div class="kpi-sub">Sem despesas</div>`}
        ${topDesp ? `<div class="kpi-sub" style="margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${topDesp.desc}</div>` : ''}
      </div>
    </div>`;
    })()}

</div>

<div class="chart-grid mb-6">
  <div class="card">
    <div class="card-header"><span class="card-title">Distribuição de Despesas</span><span class="badge badge-red">${Utils.monthsFull[month-1]}</span></div>
    <div class="chart-with-legend">
      <canvas id="chartDonut"></canvas>
      <div class="donut-legend" id="donutLegend"></div>
    </div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title">Receitas por Pessoa</span><span class="badge badge-green">${Utils.monthsFull[month-1]}</span></div>
    <div class="chart-with-legend">
      <canvas id="chartDonutRec"></canvas>
      <div class="donut-legend" id="donutLegendRec"></div>
    </div>
  </div>
</div>

<!-- ═══ SEÇÃO 2: VISÃO ANUAL ══════════════════════════════════════ -->
<div class="dash-section-divider">
  <span>Visão Anual — ${year}</span>
</div>

<div class="kpi-grid mb-6" style="grid-template-columns:repeat(3,1fr)">
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Receita Total ${year}</div>
      <div class="kpi-value green">${Utils.currency(totalRec)}</div>
      <div class="kpi-sub">Média: ${Utils.currency(mediaRec)}/mês</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 12V22H4V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 7H2v5h20V7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Despesa Total ${year}</div>
      <div class="kpi-value red">${Utils.currency(totalDesp)}</div>
      <div class="kpi-sub">Média: ${Utils.currency(mediaDesp)}/mês</div>
    </div>
  </div>
  <div class="kpi-card" style="--kpi-color:${totalSaldo>=0?'var(--accent)':'var(--red)'};--kpi-bg:${totalSaldo>=0?'var(--accent-dim)':'var(--red-dim)'}">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body">
      <div class="kpi-label">Saldo do Ano</div>
      <div class="kpi-value ${totalSaldo>=0?'accent':'red'}">${Utils.currency(Math.abs(totalSaldo))}</div>
      <div class="kpi-sub">${totalSaldo>=0?'Sobrou no ano':'Déficit no ano'}</div>
    </div>
  </div>
</div>

<div class="chart-grid mb-6">
  <div class="card">
    <div class="card-header"><span class="card-title">Receitas vs Despesas ${year}</span><span class="badge badge-accent">Anual</span></div>
    <div class="chart-wrap"><canvas id="chartAnual" class="chart-canvas"></canvas></div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title">Saldo Acumulado ${year}</span></div>
    <div class="chart-wrap"><canvas id="chartSaldo" class="chart-canvas"></canvas></div>
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

    // Render charts after DOM is ready
    requestAnimationFrame(() => {
      // Donut despesas por categoria
      const donutData = topCats.map(([cat, val], i) => ({
        label: Store.CATEGORIES[cat]?.label || cat,
        value: val,
        color: Store.CATEGORIES[cat]?.color || Charts.PALETTE[i],
      }));
      Charts.Donut(document.getElementById('chartDonut'), donutData, {
        size: 170, centerLabel: Charts.fmt(despesa, true), centerSub: 'total',
      });
      const totalD = donutData.reduce((a,d) => a+d.value, 0) || 1;
      document.getElementById('donutLegend').innerHTML = donutData.map(d => `
        <div class="donut-legend-item">
          <div class="donut-legend-dot" style="background:${d.color}"></div>
          <span class="donut-legend-label">${d.label}</span>
          <span class="donut-legend-pct">${((d.value/totalD)*100).toFixed(0)}%</span>
          <span class="donut-legend-val">${Charts.fmt(d.value, true)}</span>
        </div>`).join('');

      // Donut receitas por pessoa
      const recDonutData = Object.entries(recsByPerson).map(([p, v], i) => ({
        label: p, value: v, color: Utils.personColor(p),
      }));
      const totalR = recDonutData.reduce((a,d) => a+d.value, 0) || 1;
      if (recDonutData.length) {
        Charts.Donut(document.getElementById('chartDonutRec'), recDonutData, {
          size: 170, centerLabel: Charts.fmt(totalR, true), centerSub: 'total',
        });
        document.getElementById('donutLegendRec').innerHTML = recDonutData.map(d => `
          <div class="donut-legend-item">
            <div class="donut-legend-dot" style="background:${d.color}"></div>
            <span class="donut-legend-label">${d.label}</span>
            <span class="donut-legend-pct">${((d.value/totalR)*100).toFixed(0)}%</span>
            <span class="donut-legend-val">${Charts.fmt(d.value, true)}</span>
          </div>`).join('');
      }

      // Bar anual
      Charts.Bar(document.getElementById('chartAnual'), {
        labels: Utils.months,
        datasets: [
          { label: 'Receitas', values: yrReceitas, color: '#22C55E' },
          { label: 'Despesas', values: yrDespesas, color: '#EF4444' },
        ]
      }, { height: 165 });

      // Saldo acumulado line
      Charts.Line(document.getElementById('chartSaldo'), {
        labels: Utils.months,
        datasets: [{ label: 'Saldo', values: saldoAcc, color: '#7C6EF8' }],
      }, { height: 150 });

      // Previsão de caixa 30 dias
      const pcCanvas = document.getElementById('chartPrevisaoCaixa');
      if (pcCanvas) {
        const { days } = buildPrevisaoCaixa(saldo);
        const pcLabels = days.map((d, i) => i % 7 === 0 ? `${d.date.getDate()}/${d.date.getMonth()+1}` : '');
        const pcValues = days.map(d => d.balance);
        const minVal = Math.min(...pcValues);
        const lineColor = minVal < 0 ? '#EF4444' : '#22C55E';
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
          <div class="person-avatar" style="background:${Utils.personColor(p)}"><img src="${Utils.personAvatar(p)}" alt="${p}" loading="lazy" onerror="this.replaceWith(document.createTextNode('${Utils.personInitial(p)}'))"></div>
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
          <div class="person-avatar" style="background:${Utils.personColor(p)}"><img src="${Utils.personAvatar(p)}" alt="${p}" loading="lazy" onerror="this.replaceWith(document.createTextNode('${Utils.personInitial(p)}'))"></div>
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
<div class="section-header mb-3">
  <div>
    <div class="section-title">Lançamentos — ${periodLabel}</div>
    <div class="section-sub">${despesas.length + receitas.length} registros · ${despesas.length} despesas · ${receitas.length} receitas</div>
  </div>
  <div class="flex gap-2">
    <button class="btn-secondary ${activeTab==='desp'?'active':''}" id="btnTabDesp">Despesas</button>
    <button class="btn-secondary ${activeTab==='rec'?'active':''}" id="btnTabRec">Receitas</button>
    <button class="btn-secondary ${activeTab==='cal'?'active':''}" id="btnTabCal">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;margin-right:4px"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/></svg>
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
  <td style="white-space:nowrap;position:sticky;right:0;background:var(--bg-card)">
    ${c ? `<button class="btn-ghost" title="${paidState==='on'?'Pago ✓ (clique para desmarcar)':paidState==='auto'?'Considerado pago (data passou) — clique p/ marcar/desmarcar manualmente':'Marcar como pago'}" style="font-size:12px;color:${paidState==='on'?'var(--green)':paidState==='auto'?'var(--green-dim,#22C55E80)':'var(--text-4)'}" data-paid-desp="${d.id}">${paidState==='on'?'✓':paidState==='auto'?'◐':'○'}</button>` : ''}
    <button class="btn-icon-sm danger" data-del-desp="${d.id}" title="Excluir">${icon('trash-2', {size:14})}</button>
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
  <td><span class="person-chip"><span class="person-avatar" style="background:${Utils.personColor(r.person)}"><img src="${Utils.personAvatar(r.person)}" alt="${r.person}" loading="lazy" onerror="this.replaceWith(document.createTextNode('${Utils.personInitial(r.person)}'))"></span>${r.person}</span></td>
  <td class="muted">${({salario:'Salário',contrato:'Contrato',pensao:'Pensão',emprestimo:'Empréstimo',outros:'Outros'})[r.type]||r.type||''}</td>
  <td>${c ? `<span class="badge badge-accent" style="font-size:10px" title="Contrato: ${c.label}">📑 ${c.label}</span>` : '<span class="muted">—</span>'}</td>
  <td class="num positive">${Utils.currency(r.amount)}</td>
  <td style="white-space:nowrap">
    ${c ? `<button class="btn-ghost" title="${paidState==='on'?'Recebido ✓':paidState==='auto'?'Considerado recebido (data passou)':'Marcar como recebido'}" style="font-size:12px;color:${paidState==='on'?'var(--green)':paidState==='auto'?'var(--green-dim,#22C55E80)':'var(--text-4)'}" data-paid-rec="${r.id}">${paidState==='on'?'✓':paidState==='auto'?'◐':'○'}</button>` : ''}
    <button class="btn-icon-sm danger" data-del-rec="${r.id}" title="Excluir">${icon('trash-2', {size:14})}</button>
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

      const daysInMonth = new Date(year, month, 0).getDate();
      const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun
      const weeks = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

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

    container.innerHTML = `
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
          <td><span class="person-chip"><span class="person-avatar" style="background:${Utils.personColor(p)}"><img src="${Utils.personAvatar(p)}" alt="${p}" loading="lazy" onerror="this.replaceWith(document.createTextNode('${Utils.personInitial(p)}'))"></span>${p}</span></td>
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
      <thead><tr><th>Data</th><th>Descrição</th><th>Pessoa</th><th>Tipo</th><th class="num">Valor</th><th></th></tr></thead>
      <tbody>
        ${Store.get().receitas.filter(r=>r.year===year && r.month>=mStart && r.month<=mEnd).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>`<tr class="row-clickable" data-row-rec="${r.id}">
          <td class="muted" style="white-space:nowrap">${Utils.fmtDate(r.date)}</td>
          <td>${r.desc}</td>
          <td><span class="person-chip"><span class="person-avatar" style="background:${Utils.personColor(r.person)}"><img src="${Utils.personAvatar(r.person)}" alt="${r.person}" loading="lazy" onerror="this.replaceWith(document.createTextNode('${Utils.personInitial(r.person)}'))"></span>${r.person}</span></td>
          <td class="muted">${({salario:'Salário',contrato:'Contrato',pensao:'Pensão',emprestimo:'Empréstimo',outros:'Outros'})[r.type]||r.type||''}</td>
          <td class="num positive">${Utils.currency(r.amount)}</td>
          <td style="white-space:nowrap">
            <button class="btn-icon-sm danger" data-del-rec="${r.id}" title="Excluir">${icon('trash-2', {size:14})}</button>
          </td>
        </tr>`).join('')}
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

    container.innerHTML = `
<div class="section-header mb-3">
  <div>
    <div class="section-title">Despesas — ${periodLabel}</div>
    <div class="section-sub">${despesas.length} lançamentos · total: <strong>${Utils.currency(total)}</strong></div>
  </div>
</div>
${isMember ? `
<div class="card mb-4" style="border-color:var(--amber)30;background:var(--amber)08">
  <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--amber)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    Você está no modo Membro — veja apenas suas despesas e rateios.
  </div>
</div>` : ''}
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
<thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Sub-cat</th><th>Pagamento</th><th class="num">Valor</th><th></th></tr></thead>
<tbody>${filtered.sort((a,b)=>a.date.localeCompare(b.date)).map(d=>{const isFut=(d.year||0)*12+(d.month||0)>year*12+month;return`<tr class="row-clickable${isFut?' style="opacity:0.55"':'"'} data-row-desp="${d.id}">
  <td class="muted" style="white-space:nowrap">${Utils.fmtDate(d.date)}${isFut?' <span style="font-size:10px;color:var(--accent);font-weight:600">futuro</span>':''}</td>
  <td style="font-weight:500">${d.desc}${d.desconto?` <span class="badge badge-green" title="Economia: ${Utils.currency(d.economia||0)}">💰 desc.</span>`:''}</td>
  <td><span class="badge" style="background:${Store.CATEGORIES[d.category]?.color+'20'};color:${Store.CATEGORIES[d.category]?.color}">${Store.CATEGORIES[d.category]?.label||d.category}</span></td>
  <td class="muted">${d.sub||''}</td>
  <td><span class="badge ${d.pay==='Cartão'?'badge-accent':d.pay==='Dinheiro'?'badge-amber':'badge-blue'}">${d.pay||''}</span></td>
  <td class="num negative">${Utils.currency(d.amount)}</td>
  <td style="white-space:nowrap">
    <button class="btn-icon-sm danger" data-del-desp="${d.id}" title="Excluir">${icon('trash-2', {size:14})}</button>
  </td>
</tr>`}).join('')}</tbody>
<tfoot><tr><td colspan="5" class="fw-700">Total</td><td class="num negative fw-700">${Utils.currency(tot)}</td><td></td></tr></tfoot>
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
        <div style="display:flex;gap:8px">
          <button type="button" class="vis-btn active" data-vis="familiar" id="visBtnFamiliar"
            style="flex:1;padding:8px;border-radius:8px;border:2px solid var(--accent);background:var(--accent-dim);color:var(--accent);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s">
            👨‍👩‍👧 Familiar
          </button>
          <button type="button" class="vis-btn" data-vis="particular" id="visBtnParticular"
            style="flex:1;padding:8px;border-radius:8px;border:2px solid var(--border);background:transparent;color:var(--text-3);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s">
            🔒 Particular
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
      document.querySelectorAll('.vis-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const vis = btn.dataset.vis;
          document.getElementById('fDVis').value = vis;
          document.getElementById('visBtnFamiliar').style.cssText =
            vis === 'familiar'
              ? 'flex:1;padding:8px;border-radius:8px;border:2px solid var(--accent);background:var(--accent-dim);color:var(--accent);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s'
              : 'flex:1;padding:8px;border-radius:8px;border:2px solid var(--border);background:transparent;color:var(--text-3);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s';
          document.getElementById('visBtnParticular').style.cssText =
            vis === 'particular'
              ? 'flex:1;padding:8px;border-radius:8px;border:2px solid var(--amber);background:var(--amber-dim);color:var(--amber);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s'
              : 'flex:1;padding:8px;border-radius:8px;border:2px solid var(--border);background:transparent;color:var(--text-3);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s';
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

    container.innerHTML = `
<div class="section-header mb-6">
  <div><div class="section-title">Metas & Projetos</div><div class="section-sub">Limites, mínimos, reservas e objetivos — com performance automática</div></div>
  <button class="btn-primary" id="btnAddMeta">+ Nova Meta</button>
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
    <div class="card" data-meta-id="${m.id}" style="border-top:3px solid var(--${color})">
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
          <button class="btn-icon-sm" data-action="edit-meta" data-id="${m.id}" title="Editar">${icon('pencil', {size:14})}</button>
          <button class="btn-icon-sm danger" data-action="del-meta" data-id="${m.id}" title="Excluir">${icon('trash-2', {size:14})}</button>
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
<div class="section-label mb-3" style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)">Objetivos</div>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px">
  ${objetivos.map(m => {
    const perf = Store.getMetaPerformance(m.id, year, month);
    const pct = Math.min(perf.pct, 1);
    const color = pct >= 1 ? 'green' : pct > 0.5 ? 'accent' : 'amber';
    return `
    <div class="card" data-meta-id="${m.id}">
      <div class="card-header">
        <span style="font-size:11px;color:var(--text-4)">🎯 Objetivo</span>
        <div style="display:flex;gap:6px">
          <button class="btn-icon-sm" data-action="edit-meta" data-id="${m.id}" title="Editar">${icon('pencil', {size:14})}</button>
          <button class="btn-icon-sm danger" data-action="del-meta" data-id="${m.id}" title="Excluir">${icon('trash-2', {size:14})}</button>
        </div>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--text-1);margin-bottom:8px">${m.label}</div>
      <div style="margin:4px 0 4px">
        <span style="font-size:22px;font-weight:800;font-family:var(--mono);color:var(--text-1)">${Utils.currency(perf.current)}</span>
        <span style="font-size:13px;color:var(--text-3)"> / ${Utils.currency(perf.target)}</span>
      </div>
      <div class="progress-bar progress-lg" style="margin-bottom:8px">
        <div class="progress-fill ${color}" style="width:${Math.round(pct*100)}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-3)">
        <span>${(pct*100).toFixed(0)}% concluído</span>
        <span>${pct<1?'Faltam '+Utils.currency(perf.target-perf.current):'✓ Atingida'}</span>
      </div>
      ${m.deadline?`<div style="font-size:11px;color:var(--text-4);margin-top:8px">⏳ ${new Date(m.deadline+'T12:00:00').toLocaleDateString('pt-BR')}</div>`:''}
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

    container.querySelectorAll('[data-action="edit-meta"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = Store.get().metas.find(m => m.id === btn.dataset.id);
        if (m) openMetaModal(m, container);
      });
    });
    container.querySelectorAll('[data-action="del-meta"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Excluir esta meta?')) return;
        Store.deleteMeta(btn.dataset.id);
        renderMetas(container);
        toast('Meta excluída', 'success');
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
    });

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
    const rows = contratos.map(c => ({
      c, perf: Store.getContratoPerformance(c.id),
    })).map(({c, perf}) => ({ c, perf, status: calcStatus(c, perf) }));

    const filtered = rows.filter(({c, status}) =>
      (filterStatus === 'todos' || status === filterStatus) &&
      (!filterPessoa || c.responsavel === filterPessoa)
    );

    const pessoas = [...new Set(contratos.map(c => c.responsavel).filter(Boolean))];

    container.innerHTML = `
<div class="section-header mb-6">
  <div><div class="section-title">Contratos</div><div class="section-sub">Contratos recorrentes — parcelas alimentam Receitas/Despesas automaticamente</div></div>
  <button class="btn-primary" id="btnAddContrato">+ Novo Contrato</button>
</div>

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
<div class="card">
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
            return `<span title="${new Date(p.date+'T12:00:00').toLocaleDateString('pt-BR')} · ${Utils.currency(p.amount)}" style="flex:1;min-width:5px;height:7px;border-radius:2px;background:${color}"></span>`;
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
          return `<tr style="cursor:pointer" data-action="toggle-detail" data-id="${c.id}">
            <td><span class="badge" style="background:${isRec?'var(--green-dim)':'var(--red-dim)'};color:${isRec?'var(--green)':'var(--red)'}">${isRec?'Receita':'Despesa'}</span></td>
            <td>
              <div style="font-weight:600;color:var(--text-1)">${c.label}</div>
              <div style="font-size:11px;color:var(--text-4);display:inline-flex;align-items:center;gap:4px">${icon(cat.icon||'tag', { size: 12, color: cat.color })} ${cat.label}${c.sub?' / '+c.sub:''} · ${iniStr}→${fimStr}</div>
            </td>
            <td style="color:var(--text-2)">${c.responsavel||'—'}</td>
            <td class="num fw-700" style="font-family:var(--mono)">${Utils.currency(c.valorParcela)}</td>
            <td class="num fw-700" style="font-family:var(--mono);color:${isRec?'var(--green)':'var(--accent)'}">${Utils.currency(perf.valorCumprido)}</td>
            <td class="num" style="font-family:var(--mono);color:var(--text-3)">${Utils.currency(perf.valorTotal)}</td>
            <td>
              <div style="font-size:11px;color:var(--text-3);margin-bottom:3px">${perf.cumpridas}/${perf.totalParcelas} · ${pctW}%</div>
              <div style="display:flex;gap:2px;height:7px">${cells}</div>
            </td>
            <td><span class="badge" style="background:${STATUS_COLOR[status]}20;color:${STATUS_COLOR[status]}">${STATUS_LABEL[status]}</span></td>
            <td style="white-space:nowrap">
              <button class="btn-icon-sm" data-action="toggle-detail" data-id="${c.id}" title="Ver parcelas">${icon(isExpanded ? 'chevron-down' : 'chevron-right', {size:14})}</button>
              <button class="btn-icon-sm success" data-action="mark-past" data-id="${c.id}" title="Marcar passadas como pagas">${icon('check-check', {size:14})}</button>
              <button class="btn-icon-sm" data-action="edit-contrato" data-id="${c.id}" title="Editar">${icon('pencil', {size:14})}</button>
              <button class="btn-icon-sm danger" data-action="del-contrato" data-id="${c.id}" title="Excluir">${icon('trash-2', {size:14})}</button>
            </td>
          </tr>${detailRows}`;
        }).join('')
      }
      </tbody>
    </table>
  </div>
  <div style="display:flex;gap:12px;margin-top:10px;font-size:11px;color:var(--text-4);flex-wrap:wrap">
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:7px;border-radius:2px;background:var(--green);display:inline-block"></span>Pago</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:7px;border-radius:2px;background:var(--amber);display:inline-block"></span>Vencido (auto)</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:7px;border-radius:2px;background:var(--red);display:inline-block"></span>Atrasado</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:7px;border-radius:2px;background:var(--border);display:inline-block"></span>Futuro</span>
    <span style="margin-left:auto">✓ = marcar todas as parcelas passadas como pagas</span>
  </div>
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
          <option value="despesa" ${c.kind==='despesa'||!isEdit?'selected':''}>💸 Despesa</option>
          <option value="receita" ${c.kind==='receita'?'selected':''}>💰 Receita</option>
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
    Modal.open(isEdit ? 'Editar Contrato' : 'Novo Contrato', html, () => {
      const data = {
        label: document.getElementById('fCLabel').value.trim(),
        kind:  document.getElementById('fCKind').value,
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
        active: true,
      };
      if (!data.label || !data.valorParcela || !data.parcelas || !data.dataInicio) {
        return toast('Preencha descrição, início, valor da parcela e quantidade', 'error');
      }
      if (isEdit) {
        Store.updateContrato(contrato.id, data);
        toast('Contrato atualizado — lançamentos regerados', 'success');
      } else {
        Store.addContrato(data);
        toast('Contrato criado — lançamentos gerados', 'success');
      }
      Modal.close();
      renderContratos(container);
    });

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
  function renderContas(container, mode = 'all') {
    const cartoes = Store.get().cartoes;
    const contas  = Store.get().contas || [];
    const month = getMonth(), year = getYear();
    const showContas  = mode === 'all' || mode === 'contas';
    const showCartoes = mode === 'all' || mode === 'cartoes';
    const headerTitle = mode === 'cartoes' ? 'Cartões de Crédito' : mode === 'contas' ? 'Contas Bancárias' : 'Contas & Cartões';
    const headerSub   = mode === 'cartoes' ? 'Gerencie seus cartões de crédito e parcelamentos'
                       : mode === 'contas' ? 'Gerencie suas contas bancárias'
                       : 'Gerencie suas contas bancárias e cartões de crédito';

    container.innerHTML = `
<div class="section-header mb-6">
  <div><div class="section-title">${headerTitle}</div><div class="section-sub">${headerSub}</div></div>
  <div class="flex gap-2">
    ${showContas ? `<button class="btn-secondary" id="btnAddConta">+ Nova Conta</button>` : ''}
    ${showCartoes ? `<button class="btn-primary" id="btnAddCartao">+ Novo Cartão</button>` : ''}
  </div>
</div>

${showContas ? `
<div class="section-label mb-3" style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)">Contas Bancárias</div>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:32px">
  ${contas.length ? contas.map(ct => `
  <div class="card" style="border-top:3px solid ${ct.cor};position:relative">
    <button class="btn-icon-sm danger" style="position:absolute;top:8px;right:8px" data-del-conta="${ct.id}" title="Remover">${icon('trash-2', {size:14})}</button>
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

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:28px">
  ${cartoes.map(cc => {
    const totalParcelas = cc.parcelas.reduce((a,p)=>a+p.parcela,0);
    const usado = totalParcelas;
    const livre = cc.limit - usado;
    const pct = Math.min(100, Math.round(usado / cc.limit * 100));
    const usageClass = pct > 80 ? 'over' : pct > 60 ? 'warn' : '';
    const cardClass = cc.color === 'gold' ? 'card-gold' : cc.color === 'black' ? 'card-black' : cc.color === 'platinum' ? 'card-platinum' : '';
    return `
    <div class="cc-card ${cardClass}">
      <button class="btn-icon-sm danger" style="position:absolute;top:8px;right:8px" data-del-cartao="${cc.id}" title="Remover">${icon('trash-2', {size:14})}</button>
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
    container.querySelectorAll('[data-del-conta]').forEach(btn =>
      btn.addEventListener('click', () => {
        Store.deleteConta(btn.dataset.delConta);
        renderContas(container);
        toast('Conta removida', 'success');
      })
    );
    container.querySelectorAll('[data-del-cartao]').forEach(btn =>
      btn.addEventListener('click', () => {
        Store.deleteCartao(btn.dataset.delCartao);
        renderContas(container);
        toast('Cartão removido', 'success');
      })
    );

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

    document.getElementById('btnAddConta')?.addEventListener('click', () => {
      const COLORS = ['#7C6EF8','#22C55E','#3B82F6','#F59E0B','#EC4899','#14B8A6','#EF4444','#F97316'];
      let selectedColor = COLORS[0];
      const html = `<div class="form-grid">
        <div class="form-group form-full"><label class="form-label">Nome da conta</label><input class="form-input" id="fCtNome" placeholder="Ex: Conta Principal"/></div>
        <div class="form-group"><label class="form-label">Banco</label>
          <input class="form-input" id="fCtBanco" list="bankListC" placeholder="Itaú, Nubank…"/>
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
      Modal.open('Nova Conta Bancária', html, () => {
        const nome  = document.getElementById('fCtNome').value;
        const banco = document.getElementById('fCtBanco').value;
        const tipo  = document.getElementById('fCtTipo').value;
        const saldo = parseFloat(document.getElementById('fCtSaldo').value) || 0;
        if (!nome || !banco) return toast('Preencha nome e banco', 'error');
        Store.addConta({ nome, banco, tipo, saldo, cor: selectedColor });
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
<div class="section-header mb-6">
  <div>
    <div class="section-title">Reserva & Patrimônio</div>
    <div class="section-sub">Cotações: 1 USD = R$ ${usdBrl} · 1 EUR = R$ ${eurBrl}</div>
  </div>
  <div class="flex gap-2">
    <button class="btn-secondary" id="btnEditRates">${icon('pencil', {size:14})} Cotações</button>
    <button class="btn-primary"   id="btnAddInv">+ Novo Investimento</button>
  </div>
</div>

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
  <div class="card" style="border-top:3px solid ${tagColor}">
    <div class="card-header">
      <div>
        <div style="font-weight:700;font-size:14px;color:var(--text-1)">${r.nome}</div>
        <div style="font-size:11px;color:var(--text-4);margin-top:2px">${r.tipo||''}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn-icon-sm" data-action="edit-inv" data-id="${r.id}" title="Editar">${icon('pencil', {size:14})}</button>
        <button class="btn-icon-sm danger" data-action="del-inv" data-id="${r.id}" title="Excluir">${icon('trash-2', {size:14})}</button>
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
      <div class="asset-row">
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
        <div style="display:flex;gap:6px;align-items:center;margin-left:8px">
          <button class="btn-icon-sm" data-action="edit-ativo" data-id="${a.id}" title="Editar">${icon('pencil', {size:14})}</button>
          <button class="btn-icon-sm danger" data-action="del-ativo" data-id="${a.id}" title="Excluir">${icon('trash-2', {size:14})}</button>
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
  <div class="card" style="border-top:3px solid var(--teal);position:relative">
    <button class="btn-icon-sm danger" style="position:absolute;top:8px;right:8px" data-del-imovel="${im.id}" title="Remover">${icon('trash-2', {size:14})}</button>
    <button class="btn-icon-sm" style="position:absolute;top:8px;right:36px" data-edit-imovel="${im.id}" title="Editar">${icon('pencil', {size:14})}</button>
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
  <div class="card" style="border-top:3px solid var(--accent);position:relative">
    <button class="btn-icon-sm danger" style="position:absolute;top:8px;right:8px" data-del-veiculo="${v.id}" title="Remover">${icon('trash-2', {size:14})}</button>
    <button class="btn-icon-sm" style="position:absolute;top:8px;right:36px" data-edit-veiculo="${v.id}" title="Editar">${icon('pencil', {size:14})}</button>
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
            <button class="btn-icon-sm danger" data-action="del-passivo" data-id="${p.id}" title="Excluir">${icon('trash-2', {size:14})}</button>
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

    // Veículos + Imóveis: delegação para editar/remover/programar
    container.addEventListener('click', e => {
      const editV = e.target.closest('[data-edit-veiculo]');
      if (editV) { const v = Store.getVeiculos().find(x => x.id === editV.dataset.editVeiculo); if (v) openVeiculoModal(v, re); return; }
      const delV = e.target.closest('[data-del-veiculo]');
      if (delV) { if (!confirm('Remover este veículo?')) return; Store.deleteVeiculo(delV.dataset.delVeiculo); re(); toast('Veículo removido', 'success'); return; }
      const ipva = e.target.closest('[data-prog-ipva]');
      if (ipva) { const v = Store.getVeiculos().find(x => x.id === ipva.dataset.progIpva); if (v) _programarCustoVeiculo(v, 'ipva', re); return; }
      const seg = e.target.closest('[data-prog-seguro]');
      if (seg) { const v = Store.getVeiculos().find(x => x.id === seg.dataset.progSeguro); if (v) _programarCustoVeiculo(v, 'seguro', re); return; }

      const editI = e.target.closest('[data-edit-imovel]');
      if (editI) { const im = Store.getImoveis().find(x => x.id === editI.dataset.editImovel); if (im) openImovelModal(im, re); return; }
      const delI = e.target.closest('[data-del-imovel]');
      if (delI) { if (!confirm('Remover este imóvel?')) return; Store.deleteImovel(delI.dataset.delImovel); re(); toast('Imóvel removido', 'success'); return; }
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

    container.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;

      if (action === 'del-inv') {
        if (!confirm('Excluir este investimento?')) return;
        Store.deleteReserva(id); re(); toast('Removido!', 'success');
      }
      if (action === 'edit-inv') {
        const r = investimentos.find(r => r.id === id);
        if (r) openInvModal(r, re);
      }
      if (action === 'del-ativo') {
        if (!confirm('Excluir este ativo?')) return;
        Store.deleteAtivo(id); re(); toast('Ativo excluído!', 'success');
      }
      if (action === 'edit-ativo') {
        const a = Store.get().ativos.find(a => a.id === id);
        if (a) openAtivoModal(a, re);
      }
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
      if (action === 'del-passivo') {
        if (!confirm('Excluir este passivo?')) return;
        Store.deletePassivo(id); re(); toast('Passivo removido', 'success');
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
    });
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
    });
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
    });
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
    });
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
    });
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
        <div style="display:flex;gap:8px">
          <button type="button" class="vis-btn${(d.visibilidade||'familiar')==='familiar'?' active':''}" data-vis="familiar" id="eDVisBtnFamiliar"
            style="flex:1;padding:8px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-2);cursor:pointer;font-size:13px;transition:all .15s">
            👨‍👩‍👧 Familiar</button>
          <button type="button" class="vis-btn${(d.visibilidade||'familiar')==='particular'?' active':''}" data-vis="particular" id="eDVisBtnParticular"
            style="flex:1;padding:8px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-2);cursor:pointer;font-size:13px;transition:all .15s">
            🔒 Particular</button>
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
          document.querySelectorAll('#eDVisBtnFamiliar,#eDVisBtnParticular').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById('eDVis').value = btn.dataset.vis;
          const row = document.getElementById('eDReembolsoRow');
          if (row) row.style.display = btn.dataset.vis === 'particular' ? 'block' : 'none';
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
    });
  }

  // ── CARTÕES (rota separada — só seção de cartões) ──
  function renderCartoes(container) {
    renderContas(container, 'cartoes');
  }

  // ── INVESTIMENTOS (aba dedicada — comparador + curva patrimonial) ─
  async function renderInvestimentos(container) {
    const reservas = Store.get().reservas || [];
    const totalInvestido = reservas.reduce((s, r) => s + (r.valorInvestido || 0), 0);
    const totalAtual     = reservas.reduce((s, r) => s + (r.valorAtual || r.valorInvestido || 0), 0);
    const ganho          = totalAtual - totalInvestido;
    const rendPct        = totalInvestido > 0 ? (ganho / totalInvestido) * 100 : 0;

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

    container.innerHTML = `
<div class="section-header mb-6">
  <div>
    <div class="section-title">Investimentos</div>
    <div class="section-sub">Compare produtos de renda fixa e projete seu patrimônio</div>
  </div>
</div>

<!-- Resumo do portfólio atual -->
${reservas.length > 0 ? `
<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="2"/></svg></div>
    <div class="kpi-body"><div class="kpi-label">Total investido</div><div class="kpi-value accent">${Utils.currency(totalInvestido)}</div><div class="kpi-sub">${reservas.length} aplicações</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--teal);--kpi-bg:var(--teal-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body"><div class="kpi-label">Valor atual</div><div class="kpi-value" style="color:var(--teal)">${Utils.currency(totalAtual)}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:${ganho>=0?'var(--green)':'var(--red)'};--kpi-bg:${ganho>=0?'var(--green-dim)':'var(--red-dim)'}">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body"><div class="kpi-label">Ganho</div><div class="kpi-value" style="color:${ganho>=0?'var(--green)':'var(--red)'}">${ganho>=0?'+':''}${Utils.currency(ganho)}</div><div class="kpi-sub">${rendPct.toFixed(1)}% acumulado</div></div>
  </div>
</div>` : ''}

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
    <button class="btn-primary w-full" style="margin-top:16px" id="btnCompInv">Comparar</button>
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
    <button class="btn-primary w-full" style="margin-top:16px" id="btnRevInv">Calcular aporte por produto</button>
  </div>
  <div id="ivRevResult" class="card" style="display:none">
    <div class="card-header"><span class="card-title">Aporte mensal necessário</span></div>
    <div id="ivRevBody"></div>
  </div>
</div>`;

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
  }

  // ── FINANCIAMENTOS ─────────────────────────────────────────────
  function renderFinanciamentos(container) {
    const fins = Store.getFinanciamentos();
    const totalDevedor = Store.totalFinanciamentosDevedor();
    const TIPO_LABEL = { imovel: 'Imóvel', veiculo: 'Veículo', pessoal: 'Pessoal', estudantil: 'Estudantil', empresarial: 'Empresarial' };
    const TIPO_COLOR = { imovel: 'var(--teal)', veiculo: 'var(--accent)', pessoal: 'var(--amber)', estudantil: 'var(--green)', empresarial: 'var(--red)' };

    container.innerHTML = `
<div class="section-header mb-6">
  <div>
    <div class="section-title">Financiamentos</div>
    <div class="section-sub">Imóveis, veículos e outros — controle de saldo devedor, juros e antecipação</div>
  </div>
  <button class="btn-primary" id="btnAddFin">+ Novo Financiamento</button>
</div>

${fins.length > 0 ? `
<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 21h18M5 21V7l7-4 7 4v14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="kpi-body"><div class="kpi-label">Total a pagar (saldo devedor)</div><div class="kpi-value red">${Utils.currency(totalDevedor)}</div><div class="kpi-sub">${fins.length} financiamento${fins.length>1?'s':''} ativo${fins.length>1?'s':''}</div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="kpi-body"><div class="kpi-label">Próxima parcela total/mês</div><div class="kpi-value accent">${Utils.currency(fins.reduce((s,f)=>{
      const k = Math.min((f.parcelasPagas||0)+1, f.prazo||0);
      return s + (k > 0 ? Store.financiamentoParcelaNa(f, k) : 0);
    }, 0))}</div><div class="kpi-sub">soma das próximas parcelas</div></div>
  </div>
</div>` : ''}

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

    container.innerHTML = `
<div class="section-header mb-6">
  <div>
    <div class="section-title">Simulações</div>
    <div class="section-sub">Calcule cenários financeiros com base nos seus dados reais</div>
  </div>
</div>

<!-- HEADER DE TAXAS (BCB) -->
<div class="rates-strip card mb-6" id="ratesStrip">
  <div class="rates-loading" style="padding:14px;font-size:12px;color:var(--text-3)">Carregando taxas de referência…</div>
</div>

<!-- TABS -->
<div class="tabs mb-6" id="simTabs">
  <button class="tab active" data-sim="viagem">Viagem</button>
  <button class="tab" data-sim="reserva">Reserva Emergência</button>
  <button class="tab" data-sim="compra">Compra: à vista vs parcelado</button>
  <button class="tab" data-sim="juros">Juros Compostos</button>
  <button class="tab" data-sim="amortizacao">Amortização SAC</button>
  <button class="tab" data-sim="fire">FIRE / Independência</button>
  <button class="tab" data-sim="meta">Simulador de Meta</button>
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
    <button class="btn-primary w-full" style="margin-top:16px" id="btnCalcJuros">Calcular</button>
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
    <button class="btn-primary w-full" style="margin-top:16px" id="btnCalcAmort">Calcular</button>
  </div>
  <div id="aResult" class="card" style="display:none">
    <div class="card-header"><span class="card-title">Tabela SAC</span></div>
    <div id="aResultBody"></div>
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
        while (saldoD > 0.01 && mes < n) {
          mes++;
          const juros = saldoD * i;
          const amort = Math.min(amortBase + extra, saldoD);
          const parcela = juros + amort;
          saldoD = Math.max(0, saldoD - amort);
          totalJuros += juros;
          if (mes <= 6 || mes % 12 === 0 || saldoD < 1) {
            rows.push({ mes, parcela, amort, juros, saldo: saldoD });
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
      });
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
    <button class="btn-primary w-full" style="margin-top:16px" id="btnCalcFIRE">Calcular</button>
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
    <button class="btn-primary w-full" style="margin-top:16px" id="btnCalcMeta">Calcular</button>
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
    renderViagem();

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
    const count = Recados.unreadFor(currentPessoa());
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: RECADOS
  // ══════════════════════════════════════════════════════════════
  function renderRecados(container) {
    // ── Seed de dados do Coach se não existir ─────────────────────
    const data = Store.get();
    if (!data.recados || data.recados.length === 0) {
      data.recados = [
        { id: 'rc1', tipo: 'insight', titulo: 'Excelente progresso em Maio!', texto: 'Seu Poder de Escolha aumentou comparado ao mês anterior. Você está no caminho certo.', data: new Date().toISOString(), lido: false, pessoa: null },
        { id: 'rc2', tipo: 'alerta', titulo: 'Categoria Moradia acima do orçamento', texto: 'Seus gastos com Moradia estão acima do planejado este mês. Considere revisar suas despesas fixas.', data: new Date().toISOString(), lido: false, pessoa: null },
        { id: 'rc3', tipo: 'dica', titulo: 'Oportunidade de economia identificada', texto: 'Você tem múltiplas assinaturas de streaming. Avaliar o uso real pode gerar economia mensal.', data: new Date().toISOString(), lido: true, pessoa: null },
      ];
      Store.persist();
    }

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
      insight: { icon: '⚡', bgColor: 'var(--accent-dim)', iconColor: 'var(--haile-indigo)' },
      alerta:  { icon: '⚠️', bgColor: 'var(--amber-dim)',  iconColor: 'var(--amber)' },
      dica:    { icon: '💡', bgColor: 'var(--green-dim)',  iconColor: 'var(--green)' },
      meta:    { icon: '✅', bgColor: 'var(--green-dim)',  iconColor: 'var(--green)' },
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
        return `<div class="recado-card${r.lido ? '' : ' nao-lido'}" data-rc-id="${r.id}">
  <div class="recado-tipo-icon" style="background:${tc.bgColor}">${tc.icon}</div>
  <div class="recado-card-body">
    <div class="recado-card-head">
      <div class="recado-card-title">${r.titulo}</div>
      ${!r.lido ? '<div class="recado-unread-dot"></div>' : ''}
    </div>
    <div class="recado-card-meta">
      <span class="recado-tipo-badge ${r.tipo}">${r.tipo}</span>
      · ${fmtRelTime(r.data)}
    </div>
    <div class="recado-card-text">${r.texto}</div>
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
      // Bind card clicks
      container.querySelectorAll('[data-rc-id]').forEach(card => {
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
<div class="section-header mb-4">
  <div style="display:flex;align-items:center;gap:14px">
    <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--haile-indigo),var(--haile-teal));display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 4.6L18.4 9.4l-4.6 1.8L12 15.8l-1.8-4.6L5.6 9.4l4.6-1.8L12 3z" fill="#fff"/><path d="M19 14l.9 2.3L22.2 17l-2.3.9L19 20l-.9-2.1L15.8 17l2.3-.7L19 14z" fill="#fff"/></svg>
    </div>
    <div>
      <div class="section-title">Recados do Coach</div>
      <div class="section-sub">Insights e recomendações personalizadas da sua IA financeira</div>
    </div>
  </div>
</div>

<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
  <span id="rcNaoLidosCount" style="font-size:12px;font-weight:600;color:var(--haile-indigo);${naoLidosTotal > 0 ? '' : 'display:none'}">● ${naoLidosTotal} não lido${naoLidosTotal !== 1 ? 's' : ''}</span>
  <div class="lanc-type-toggle" style="margin-left:auto">
    <button class="lanc-type-btn active" id="rcBtnTodos">Todos</button>
    <button class="lanc-type-btn" id="rcBtnNaoLidos">Não lidos</button>
  </div>
  <span id="rcTotalCount" style="font-size:12px;color:var(--text-3)">${(Store.get().recados||[]).length} recados</span>
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
<div class="config-profile-card">
  <div class="config-profile-avatar">${profileInitial}</div>
  <div style="flex:1;min-width:0">
    <div class="config-profile-name">${profileName}</div>
    ${profileEmail ? `<div class="config-profile-email">${profileEmail}</div>` : ''}
  </div>
  <button class="btn-outline btn-sm" id="btnEditPerfil">Editar Perfil</button>
</div>
<div style="display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:start">
  <aside class="card" style="padding:8px">
    ${[
      ['categorias', 'folder-tree',   'Categorias'],
      ['tipos',      'tag',           'Tipos'],
      ['coach',      'sparkles',      'Haile Coach'],
      ['pessoas',    'users',         'Grupo Familiar'],
      ['cotacoes',   'arrow-left-right','Cotações'],
      ['aparencia',  'palette',       'Aparência'],
      ['backup',     'database',      'Backup & Dados'],
      ['perfil',     'user-round',    'Perfil'],
      ['senha',      'key-round',     'Trocar Senha'],
      ['sobre',      'info',          'Sobre'],
    ].map(([k, ic, l]) => `
      <button class="config-tab ${section===k?'active':''}" data-section="${k}"
        style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 12px;border:none;background:${section===k?'var(--bg-elevated)':'transparent'};color:${section===k?'var(--text-1)':'var(--text-2)'};border-radius:8px;cursor:pointer;font-size:13px;font-weight:${section===k?'600':'500'};margin-bottom:2px">
        ${icon(ic, { size: 16 })}
        <span>${l}</span>
      </button>
    `).join('')}
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
    else if (section === 'backup')     renderConfigBackup(content);
    else if (section === 'perfil')     renderConfigPerfil(content);
    else if (section === 'senha')      renderConfigSenha(content);
    else                                renderConfigSobre(content);
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
      essencial:    { label: 'Essencial',    desc: 'Não posso viver sem isso este mês — sai do Poder de Escolha' },
      obrigatorio:  { label: 'Obrigatório',  desc: 'Imposição externa (pensão, multa, IR) — sai do Poder de Escolha' },
      comprometido: { label: 'Comprometido', desc: 'Tem custo de cancelar — sai do Poder de Escolha' },
      opcional:     { label: 'Opcional',     desc: 'Posso cortar amanhã sem dor — entra no Poder de Escolha' },
      eventual:     { label: 'Eventual',     desc: 'Não é mensal, pontual — entra no Poder de Escolha' },
    };

    // Conta categorias por tipo (cats vem como [key, {label, color, icon}])
    const catsPorTipo = {};
    tipos.forEach(t => { catsPorTipo[t.id] = []; });
    cats.forEach(([key, info]) => {
      if (!info || key === 'receita') return;
      const tid = Store.getCatTipo(key);
      if (!catsPorTipo[tid]) catsPorTipo[tid] = [];
      catsPorTipo[tid].push({ key, label: info.label, color: info.color, icon: info.icon });
    });

    content.innerHTML = `
<div class="section-header mb-4">
  <div>
    <div class="section-title">Tipos</div>
    <div class="section-sub">Classifique suas categorias por comportamento. Define o que entra no <strong>Poder de Escolha</strong> mensal.</div>
  </div>
  <button class="btn-primary" id="btnAddTipo">+ Novo Tipo</button>
</div>

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px">
${tipos.map(t => {
  const info = COMPORT[t.comportamento] || COMPORT.opcional;
  const catsAqui = catsPorTipo[t.id] || [];
  return `
  <div class="card" style="border-top:3px solid ${t.color};position:relative">
    ${!t.builtin ? `<button class="btn-icon-sm danger" style="position:absolute;top:8px;right:8px" data-del-tipo="${t.id}" title="Remover">${icon('trash-2', {size:14})}</button>` : ''}
    <button class="btn-icon-sm" style="position:absolute;top:8px;right:${t.builtin?10:36}px" data-edit-tipo="${t.id}" title="Editar">${icon('pencil', {size:14})}</button>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="font-size:22px">${t.icon || '✦'}</span>
      <div>
        <div style="font-size:15px;font-weight:700;color:var(--text-1)">${t.label}${t.builtin?' <span style="font-size:10px;color:var(--text-4);font-weight:500">padrão</span>':''}</div>
        <div style="font-size:11px;color:${t.color};font-weight:600;text-transform:uppercase;letter-spacing:.06em">${info.label}</div>
      </div>
    </div>
    ${t.desc ? `<div style="font-size:12px;color:var(--text-3);margin-bottom:10px;line-height:1.45">${t.desc}</div>` : ''}
    <div style="font-size:11px;color:var(--text-4);margin-top:8px">${catsAqui.length} categoria${catsAqui.length===1?'':'s'}</div>
    ${catsAqui.length > 0 ? `<div style="font-size:12px;color:var(--text-2);line-height:1.6;margin-top:4px">${catsAqui.slice(0,6).map(c => `<span style="display:inline-block;background:${c.color}20;color:${c.color};padding:2px 8px;border-radius:10px;margin:2px 4px 2px 0;font-size:11px;font-weight:600">${c.label}</span>`).join('')}${catsAqui.length>6?` <span style="color:var(--text-4);font-size:11px">+${catsAqui.length-6}</span>`:''}</div>` : ''}
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
    const current = (data.settings && data.settings.coachPersonality) || 'profissional';
    const personalities = [
      { key: 'profissional', iconName: 'briefcase', label: 'Profissional', short: 'CFO pessoal',
        desc: 'Direto, técnico, sério. Respeita seu tempo, foca em dados. Sem rodeios emocionais.',
        sample: '"Seu Poder de Escolha este mês é R$ 4.850. Considerando seu comprometimento de 65%, há espaço para aporte adicional de R$ 800 sem risco."' },
      { key: 'mentor',       iconName: 'heart-handshake', label: 'Mentor', short: 'Conselho dos pais',
        desc: 'Acolhedor, paciente, encorajador. Celebra conquistas com genuinidade, sugere sem impor.',
        sample: '"Que bom ver que você economizou R$ 450 este mês! Que tal direcionar uma parte para a viagem da família? Vocês merecem esse descanso."' },
      { key: 'educador',     iconName: 'graduation-cap', label: 'Educador', short: 'Mestre paciente',
        desc: 'Didático, explicativo. Ensina o "porquê" junto com o "o quê". Usa analogias do dia-a-dia.',
        sample: '"Aporte de R$ 500/mês no CDB 100% CDI rende mais que poupança porque o CDI hoje está em 14,40% a.a. (poupança rende ~6,17%). Em 12 meses, a diferença gira em torno de R$ 240."' },
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
      <div class="person-avatar" style="background:${Utils.personColor(p)};width:36px;height:36px;font-size:14px"><img src="${Utils.personAvatar(p)}" alt="${p}" loading="lazy" onerror="this.replaceWith(document.createTextNode('${Utils.personInitial(p)}'))"></div>
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
      listEl.innerHTML = `
<div style="display:flex;flex-direction:column;gap:6px">
  ${members.map(m => {
    const accepted = !!m.accepted_at;
    const email = m.invited_email || '—';
    const role  = m.role;
    const sub   = [accepted ? 'Ativo' : 'Aguardando login', m.pessoa_name ? `→ ${m.pessoa_name}` : ''].filter(Boolean).join(' · ');
    return `
    <div class="card" style="display:flex;align-items:center;gap:12px;padding:10px 16px">
      <div class="person-avatar" style="background:${ROLE_COLORS[role]}20;color:${ROLE_COLORS[role]};width:34px;height:34px;font-size:12px;font-weight:700;border:1px solid ${ROLE_COLORS[role]}40">
        ${email.slice(0,2).toUpperCase()}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${email}</div>
        <div style="font-size:11px;color:var(--text-4)">${sub}</div>
      </div>
      <span class="badge" style="background:${ROLE_COLORS[role]}20;color:${ROLE_COLORS[role]}">${ROLE_LABELS[role]||role}</span>
      <button class="btn-icon-sm danger" data-member-id="${m.id}" title="Remover acesso">${icon('user-minus', {size:14})}</button>
    </div>`;
  }).join('')}
</div>`;
      listEl.querySelectorAll('[data-member-id]').forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Remover acesso deste membro?')) return;
        await SupabaseSync.removeMember(b.dataset.memberId);
        toast('Membro removido', 'success');
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
  <div class="section-sub">Exporte/importe seus dados. Os dados vivem em localStorage — faça backup periódico.</div></div>
</div>
<div class="card mb-4">
  <div class="card-header"><span class="card-title">Resumo</span></div>
  ${Object.entries(counts).map(([k,v]) => `<div class="stat-row"><span class="stat-row-label">${k}</span><span class="stat-row-value">${v}</span></div>`).join('')}
</div>
<div class="card">
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn-primary"   id="btnDoExport">⬇ Exportar JSON</button>
    <button class="btn-secondary" id="btnDoImport">⬆ Importar JSON</button>
    <button class="btn-secondary" id="btnDoReset" style="margin-left:auto;color:var(--red)">↺ Reset (seed)</button>
    <input type="file" id="fileDoImport" accept="application/json" style="display:none"/>
  </div>
</div>`;
    document.getElementById('btnDoExport').addEventListener('click', _doExportBackup);
    document.getElementById('btnDoImport').addEventListener('click', () => document.getElementById('fileDoImport').click());
    document.getElementById('fileDoImport').addEventListener('change', e => {
      _doImportBackup(e.target.files?.[0]);
      e.target.value = '';
    });
    document.getElementById('btnDoReset').addEventListener('click', () => {
      if (!confirm('Apagar TODOS os dados e voltar ao seed inicial?')) return;
      Store.resetData();
      toast('Dados resetados — recarregando…', 'success');
      setTimeout(() => location.reload(), 600);
    });
  }

  function renderConfigAparencia(content) {
    const tema = Store.get().settings.tema || 'dark';
    content.innerHTML = `
<div class="section-header mb-4">
  <div><div class="section-title">Aparência</div>
  <div class="section-sub">Tema visual da aplicação</div></div>
</div>
<div class="card">
  <div style="display:flex;gap:8px;align-items:center">
    <span style="flex:1;font-size:14px;color:var(--text-1)">Tema</span>
    <button class="btn-secondary ${tema==='light'?'active':''}" data-tema="light">☀ Claro</button>
    <button class="btn-secondary ${tema==='dark'?'active':''}" data-tema="dark">🌙 Escuro</button>
  </div>
</div>`;
    content.querySelectorAll('[data-tema]').forEach(b => b.addEventListener('click', () => {
      const next = b.dataset.tema;
      document.documentElement.dataset.theme = next;
      Store.updateSettings({ tema: next });
      renderConfigAparencia(content);
    }));
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

  function renderConfigPerfil(content) {
    const p = Store.getProfile();
    content.innerHTML = `
<div class="section-header mb-4"><div>
  <div class="section-title">Perfil</div>
  <div class="section-sub">Nome exibido no app e configurações regionais</div>
</div></div>
<div class="card" style="max-width:480px">
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
    <div id="avatarPreview" style="font-size:48px;line-height:1;cursor:pointer;padding:8px;border-radius:12px;border:2px solid var(--border);background:var(--bg-elevated)" title="Clique para trocar">${p.avatar || '👤'}</div>
    <div>
      <div style="font-size:13px;color:var(--text-2);margin-bottom:6px">Avatar (emoji)</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;max-width:300px" id="avatarPicker">
        ${AVATAR_OPTIONS.map(a => `<button data-av="${a}" style="font-size:22px;padding:4px 6px;border-radius:8px;border:2px solid ${a===p.avatar?'var(--accent)':'var(--border)'};background:var(--bg-elevated);cursor:pointer">${a}</button>`).join('')}
      </div>
    </div>
  </div>
  <div style="display:grid;gap:14px">
    <div>
      <label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Nome</label>
      <input id="pfName" class="form-input" value="${(p.name||'').replace(/"/g,'&quot;')}" placeholder="Seu nome" style="max-width:320px"/>
    </div>
    <div>
      <label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Fuso Horário</label>
      <select id="pfTz" class="month-select" style="max-width:320px">
        ${TIMEZONES.map(tz => `<option value="${tz}" ${tz===(p.timezone||'America/Sao_Paulo')?'selected':''}>${tz}</option>`).join('')}
      </select>
    </div>
  </div>
  <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
    <button class="btn-primary" id="btnSavePerfil">Salvar</button>
    <button class="btn-secondary" id="btnRefazerOnboarding">Refazer configuração inicial</button>
  </div>
  <div id="perfilMsg" style="display:none;margin-top:10px;font-size:13px;color:var(--green)">✓ Perfil salvo</div>
</div>`;

    let selectedAvatar = p.avatar || '👤';
    content.querySelectorAll('[data-av]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedAvatar = btn.dataset.av;
        content.querySelectorAll('[data-av]').forEach(b => b.style.borderColor = 'var(--border)');
        btn.style.borderColor = 'var(--accent)';
        document.getElementById('avatarPreview').textContent = selectedAvatar;
      });
    });

    document.getElementById('btnSavePerfil').addEventListener('click', () => {
      const name = document.getElementById('pfName').value.trim();
      if (!name) { toast('Nome obrigatório', 'error'); return; }
      Store.setProfile({ name, avatar: selectedAvatar, timezone: document.getElementById('pfTz').value });
      const msg = document.getElementById('perfilMsg');
      msg.style.display = 'block';
      setTimeout(() => { msg.style.display = 'none'; }, 2500);
    });

    document.getElementById('btnRefazerOnboarding').addEventListener('click', () => {
      Store.resetOnboarding();
      showOnboarding();
    });
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
      <div style="font-size:12px;color:var(--text-3)">v1.2.0 · Gestão financeira familiar</div>
    </div>
  </div>
  <div style="font-size:13px;color:var(--text-2);line-height:1.6">
    App roda 100% no navegador. Dados em <code>localStorage</code> — sem backend.
  </div>
</div>

<div class="card">
  <div class="card-header" style="margin-bottom:16px">
    <span class="card-title">🤖 AI Coach — Configuração</span>
  </div>

  <div style="margin-bottom:16px;padding:12px;background:var(--green-dim,rgba(34,197,94,.08));border-radius:8px;border:1px solid rgba(34,197,94,.2)">
    <div style="font-size:12px;font-weight:600;color:var(--green);margin-bottom:4px">✓ Coach via Supabase Edge Function</div>
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
        await SupabaseSync.acceptPendingInvite();
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
    Router.register('lancamentos',   renderLancamentos);
    Router.register('receitas',      renderReceitas);
    Router.register('despesas',      renderDespesas);
    Router.register('contas',        (c) => renderContas(c, 'contas'));
    Router.register('cartoes',       renderCartoes);
    Router.register('contratos',     renderContratos);
    Router.register('reserva',       renderReserva);
    Router.register('metas',         renderMetas);
    Router.register('investimentos', renderInvestimentos);
    Router.register('financiamentos', renderFinanciamentos);
    Router.register('simulacoes',    renderSimulacoes);
    Router.register('patrimonio',    renderPatrimonio);
    Router.register('comparativo',   renderComparativo);
    Router.register('recados',       renderRecados);
    Router.register('reembolsos',    renderReembolsos);
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

    // Logout button
    // Theme toggle (sidebar footer)
    (() => {
      const saved = localStorage.getItem('ff_theme');
      if (saved === 'light' || saved === 'dark') {
        document.documentElement.setAttribute('data-theme', saved);
      }
      const btn = document.getElementById('btnThemeToggle');
      btn?.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('ff_theme', next);
      });
    })();

    document.getElementById('btnLogout')?.addEventListener('click', async () => {
      if (!confirm('Sair da conta?')) return;
      if (typeof SupabaseSync !== 'undefined') await SupabaseSync.signOut();
      sessionStorage.removeItem('ff_auth');
      sessionStorage.removeItem('ff_user_email');
      window.location.replace('login.html');
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

    // Reveal admin link if user has admin role
    setTimeout(async () => {
      if (typeof SupabaseSync === 'undefined') return;
      try {
        const token = await SupabaseSync.getAccessToken();
        if (!token) return;
        await SupabaseSync.adminCall('stats');
        const el = document.getElementById('navAdmin');
        if (el) el.style.display = '';
      } catch { /* not admin */ }
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

    // Show onboarding wizard on first access
    if (!Store.getOnboarding().completed) {
      setTimeout(() => showOnboarding(), 400);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ONBOARDING WIZARD
  // ══════════════════════════════════════════════════════════════
  function showOnboarding() {
    const personalities = [
      { key: 'profissional', iconName: 'briefcase', label: 'Profissional', short: 'CFO pessoal',
        desc: 'Direto, técnico, sério. Respeita seu tempo, foca em dados. Sem rodeios emocionais.',
        sample: '"Seu Poder de Escolha este mês é R$ 4.850. Considerando seu comprometimento de 65%, há espaço para aporte adicional de R$ 800 sem risco."' },
      { key: 'mentor', iconName: 'heart-handshake', label: 'Mentor', short: 'Conselho dos pais',
        desc: 'Acolhedor, paciente, encorajador. Celebra conquistas com genuinidade, sugere sem impor.',
        sample: '"Que bom ver que você economizou R$ 450 este mês! Que tal direcionar uma parte para a viagem da família? Vocês merecem esse descanso."' },
      { key: 'educador', iconName: 'graduation-cap', label: 'Educador', short: 'Mestre paciente',
        desc: 'Didático, explicativo. Ensina o "porquê" junto com o "o quê". Usa analogias do dia-a-dia.',
        sample: '"Aporte de R$ 500/mês no CDB 100% CDI rende mais que poupança porque o CDI hoje está em 14,40% a.a. Em 12 meses, a diferença gira em torno de R$ 240."' },
    ];

    const STEPS = [
      {
        key: 'familia',
        title: 'Como é a sua família?',
        type: 'single',
        options: [
          { value: 'solo',     label: 'Só eu',                    icon: 'user-round' },
          { value: 'casal',    label: 'Eu e minha(meu) parceira(o)', icon: 'users' },
          { value: 'filhos',   label: 'Família com filhos',        icon: 'baby' },
          { value: 'outro',    label: 'Outro arranjo',             icon: 'heart-handshake' },
        ],
      },
      {
        key: 'patrimonio',
        title: 'O que você já tem?',
        type: 'multi',
        options: [
          { value: 'imovel',        label: 'Imóvel próprio',          icon: 'home' },
          { value: 'veiculo',       label: 'Veículo(s)',               icon: 'car' },
          { value: 'investimentos', label: 'Investimentos',            icon: 'trending-up' },
          { value: 'financiamento', label: 'Financiamento ativo',      icon: 'landmark' },
          { value: 'nenhum',        label: 'Nenhum dos anteriores',    icon: 'circle-off' },
        ],
      },
      {
        key: 'objetivo',
        title: 'Qual é a sua prioridade financeira hoje?',
        type: 'single',
        options: [
          { value: 'dividas',  label: 'Sair do vermelho / quitar dívidas', icon: 'circle-x' },
          { value: 'reserva',  label: 'Montar reserva de emergência',       icon: 'shield' },
          { value: 'imovel',   label: 'Comprar imóvel / veículo',           icon: 'home' },
          { value: 'investir', label: 'Investir e crescer patrimônio',      icon: 'trending-up' },
          { value: 'controle', label: 'Organizar e ter controle',           icon: 'layout-dashboard' },
        ],
      },
      {
        key: 'estilo',
        title: 'Como você prefere acompanhar seus gastos?',
        type: 'single',
        options: [
          { value: 'realtime', label: 'Lanço tudo em tempo real',        icon: 'zap' },
          { value: 'mensal',   label: 'Reviso no fim do mês',            icon: 'calendar' },
          { value: 'coach',    label: 'Quero que o Coach me lembre',      icon: 'bell' },
        ],
      },
      {
        key: 'coach',
        title: 'Como prefere que o Haile fale com você?',
        type: 'single',
        options: personalities.map(p => ({ value: p.key, label: p.label, icon: p.iconName, sub: p.short, desc: p.desc })),
      },
      {
        key: 'confirmacao',
        title: 'confirmacao',
        type: 'confirm',
      },
    ];

    let currentStep = 0;
    const answers = {};

    const overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg-base);display:flex;align-items:center;justify-content:center;padding:16px';

    const card = document.createElement('div');
    card.style.cssText = 'max-width:560px;width:100%;background:var(--bg-card);border-radius:var(--radius-xl);padding:40px;box-shadow:var(--shadow-lg);position:relative';

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function renderStep() {
      const step = STEPS[currentStep];
      const total = STEPS.length;
      const pct = Math.round(((currentStep + 1) / total) * 100);
      const profile = Store.getProfile();
      const name = (profile.name && profile.name !== 'Usuário') ? profile.name : '';

      let optionsHtml = '';
      if (step.type === 'single' || step.type === 'multi') {
        const selected = answers[step.key] || (step.type === 'multi' ? [] : null);
        optionsHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:24px 0">` +
          step.options.map(o => {
            const isSel = step.type === 'multi'
              ? selected.includes(o.value)
              : selected === o.value;
            return `<button class="ob-opt" data-val="${o.value}"
              style="background:${isSel ? 'var(--haile-indigo-soft)' : 'var(--bg-elevated)'};
                     border:2px solid ${isSel ? 'var(--haile-indigo)' : 'var(--border)'};
                     border-radius:var(--radius-lg);padding:14px 16px;text-align:left;cursor:pointer;
                     transition:border-color .15s,background .15s;color:var(--text-1);width:100%">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:${o.desc ? '8px' : '0'}">
                <div style="width:32px;height:32px;border-radius:50%;background:${isSel ? 'var(--haile-indigo)' : 'var(--bg-base)'};
                            display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s">
                  ${icon(o.icon, { size: 16, color: isSel ? '#fff' : 'var(--text-2)' })}
                </div>
                <div>
                  <div style="font-size:13px;font-weight:600;color:${isSel ? 'var(--haile-indigo-deep)' : 'var(--text-1)'}">${o.label}</div>
                  ${o.sub ? `<div style="font-size:11px;color:var(--text-3)">${o.sub}</div>` : ''}
                </div>
              </div>
              ${o.desc ? `<div style="font-size:11px;color:var(--text-3);line-height:1.5">${o.desc}</div>` : ''}
            </button>`;
          }).join('') + `</div>`;
      } else if (step.type === 'confirm') {
        const familiaOpt = STEPS[0].options.find(o => o.value === answers.familia);
        const objetivoOpt = STEPS[2].options.find(o => o.value === answers.objetivo);
        const coachOpt = personalities.find(p => p.key === answers.coach);
        optionsHtml = `
        <div style="margin:24px 0;display:flex;flex-direction:column;gap:10px">
          ${familiaOpt ? `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg-elevated);border-radius:var(--radius-md)">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--haile-indigo);display:flex;align-items:center;justify-content:center">${icon(familiaOpt.icon, { size: 16, color: '#fff' })}</div>
            <div><div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em">Família</div><div style="font-size:13px;font-weight:600;color:var(--text-1)">${familiaOpt.label}</div></div>
          </div>` : ''}
          ${objetivoOpt ? `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg-elevated);border-radius:var(--radius-md)">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--haile-indigo);display:flex;align-items:center;justify-content:center">${icon(objetivoOpt.icon, { size: 16, color: '#fff' })}</div>
            <div><div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em">Prioridade</div><div style="font-size:13px;font-weight:600;color:var(--text-1)">${objetivoOpt.label}</div></div>
          </div>` : ''}
          ${coachOpt ? `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg-elevated);border-radius:var(--radius-md)">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--haile-indigo);display:flex;align-items:center;justify-content:center">${icon(coachOpt.iconName, { size: 16, color: '#fff' })}</div>
            <div><div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em">Coach</div><div style="font-size:13px;font-weight:600;color:var(--text-1)">${coachOpt.label}</div></div>
          </div>` : ''}
        </div>`;
      }

      const isLast = currentStep === STEPS.length - 1;
      const isFirst = currentStep === 0;
      const titleHtml = step.type === 'confirm'
        ? `<h2 style="font-size:22px;font-weight:800;color:var(--text-1);margin:0 0 6px">Tudo pronto${name ? ', ' + name : ''}!</h2>
           <p style="font-size:14px;color:var(--text-2);margin:0">O Haile já está configurado para o seu perfil.</p>`
        : `<h2 style="font-size:20px;font-weight:700;color:var(--text-1);margin:0">${step.title}</h2>`;

      card.innerHTML = `
        <div style="margin-bottom:24px">
          <div style="font-size:11px;color:var(--haile-indigo);font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">
            haile — passo ${currentStep + 1} de ${total}
          </div>
          <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--haile-indigo);transition:width .3s;border-radius:2px"></div>
          </div>
        </div>
        ${titleHtml}
        ${optionsHtml}
        <div style="display:flex;justify-content:${isFirst ? 'flex-end' : 'space-between'};align-items:center;margin-top:8px;gap:10px">
          ${isFirst ? '' : `<button id="obBack" class="btn-secondary" style="min-width:90px">Voltar</button>`}
          <button id="obNext" class="btn-primary" style="min-width:120px">${isLast ? 'Começar' : 'Continuar'}</button>
        </div>`;

      upgradeIcons(card);

      card.querySelectorAll('.ob-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.dataset.val;
          const step = STEPS[currentStep];
          if (step.type === 'multi') {
            let arr = answers[step.key] || [];
            if (val === 'nenhum') {
              arr = arr.includes('nenhum') ? [] : ['nenhum'];
            } else {
              arr = arr.filter(v => v !== 'nenhum');
              if (arr.includes(val)) arr = arr.filter(v => v !== val);
              else arr = [...arr, val];
            }
            answers[step.key] = arr;
          } else {
            answers[step.key] = val;
          }
          renderStep();
        });
      });

      card.querySelector('#obNext')?.addEventListener('click', () => {
        const step = STEPS[currentStep];
        if (step.type !== 'confirm') {
          const sel = answers[step.key];
          if (!sel || (Array.isArray(sel) && sel.length === 0)) {
            toast('Selecione uma opção para continuar', 'error');
            return;
          }
        }
        if (isLast) {
          completeOnboardingFlow(answers);
        } else {
          currentStep++;
          renderStep();
        }
      });

      card.querySelector('#obBack')?.addEventListener('click', () => {
        if (currentStep > 0) { currentStep--; renderStep(); }
      });
    }

    function completeOnboardingFlow(answers) {
      const data = Store.get();
      if (!data.settings) data.settings = {};
      if (answers.coach) {
        data.settings.coachPersonality = answers.coach;
        Store.persist();
      }
      if (answers.objetivo === 'reserva') {
        Store.addMeta({ label: 'Reserva de emergência', type: 'reserva', target: 0, atual: 0, active: true });
      } else if (answers.objetivo === 'imovel') {
        Store.addMeta({ label: 'Comprar imóvel', type: 'objetivo', target: 0, atual: 0, active: true });
      }
      Store.completeOnboarding(answers);
      overlay.remove();
      toast('Bem-vindo ao Haile!', 'success');
    }

    renderStep();
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
      msgs.innerHTML = `
      <div class="coach-welcome">
        <div class="coach-avatar-lg" style="overflow:hidden">
          <img src="assets/svg/haile-mark-white.svg" alt="Haile" style="width:38px;height:auto;display:block">
        </div>
        <p>Olá! Sou seu coach financeiro. Tenho acesso ao seu histórico completo e posso responder perguntas como:</p>
        <div class="coach-suggestions" id="coachSuggestions">
          <button class="coach-suggestion">Qual meu maior gasto esse mês?</button>
          <button class="coach-suggestion">Estou dentro do orçamento?</button>
          <button class="coach-suggestion">Onde posso economizar?</button>
          <button class="coach-suggestion">Como está minha saúde financeira?</button>
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

=== INVESTIMENTOS (total: R$ ${totalInv.toFixed(2)}) ===
${reservasStr}

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
  const personality = (data.settings && data.settings.coachPersonality) || 'profissional';
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
  return personalities[personality] || personalities.profissional;
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
    function appendMsg(role, content) {
      const welcome = msgs.querySelector('.coach-welcome');
      if (welcome) welcome.remove();
      const initial = role === 'user' ? currentPessoa()[0]?.toUpperCase() || 'U' : '✦';
      const div = document.createElement('div');
      div.className = `coach-msg ${role}`;
      const rendered = role === 'assistant' ? formatCoachContent(content) : escapeHtml(content).replace(/\n/g, '<br>');
      div.innerHTML = `
        <div class="coach-msg-avatar">${initial}</div>
        <div class="coach-bubble">${rendered}</div>`;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      return div;
    }

    function showTyping() {
      const div = document.createElement('div');
      div.className = 'coach-msg assistant';
      div.id = 'coachTypingIndicator';
      div.innerHTML = `<div class="coach-msg-avatar">✦</div><div class="coach-bubble"><div class="coach-typing"><span></span><span></span><span></span></div></div>`;
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

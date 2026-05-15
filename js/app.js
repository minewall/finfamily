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
      document.getElementById('modalBody').appendChild(footer);
      document.getElementById('modalCancel').addEventListener('click', () => this.close());
      if (onSave) document.getElementById('modalSave').addEventListener('click', onSave);
      this.overlay.classList.add('open');
      this.overlay.setAttribute('aria-hidden', 'false');
    },
    close() {
      this.overlay.classList.remove('open');
      this.overlay.setAttribute('aria-hidden', 'true');
    },
  };

  // ── ROUTER ────────────────────────────────────────────────────
  const Router = {
    current: 'dashboard',
    pages: {},
    titles: {
      dashboard:   'Dashboard',
      lancamentos: 'Lançamentos',
      receitas:    'Receitas',
      despesas:    'Despesas',
      metas:       'Metas & Projetos',
      contratos:   'Contratos',
      contas:      'Contas & Cartões',
      reserva:     'Reserva & Investimentos',
      patrimonio:  'Patrimônio & Investimentos',
      comparativo: 'Comparativo Mensal',
      config:      'Configurações',
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
      const wrap = document.createElement('div');
      wrap.className = 'page-enter';
      container.appendChild(wrap);
      this.pages[page](wrap);
    },
    register(name, fn) { this.pages[name] = fn; },
  };

  // ── SHARED month/year state ───────────────────────────────────
  function getMonth() { return parseInt(document.getElementById('globalMonth').value, 10); }
  function getYear()  {
    const sel = document.getElementById('globalYear');
    return sel ? parseInt(sel.value, 10) : Store.get().settings.ano;
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
    return `<div class="flex gap-2 mb-3" data-period-toggle="${stateKey}">
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
    if (saldo > 0) alerts.push({ type:'success', title:'Saldo positivo este mês', text:`Sobram ${Utils.currency(saldo)} após todas as despesas.` });

    const yrReceitas = Store.yearlyMonthly(year, 'receita');
    const yrDespesas = Store.yearlyMonthly(year, 'despesa');

    container.innerHTML = `
<div class="kpi-grid">
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-header">
      <span class="kpi-label">Receitas</span>
      <span class="kpi-icon">${Utils.icon.arrow_up}</span>
    </div>
    <div class="kpi-value green">${Utils.currency(receita)}</div>
    <div class="kpi-change ${chgRec>=0?'up':'down'}">${chgRec>=0?'▲':'▼'} ${Math.abs(chgRec).toFixed(1)}% vs mês anterior</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim)">
    <div class="kpi-header">
      <span class="kpi-label">Despesas</span>
      <span class="kpi-icon">${Utils.icon.arrow_down}</span>
    </div>
    <div class="kpi-value red">${Utils.currency(despesa)}</div>
    <div class="kpi-change ${chgDesp<=0?'up':'down'}">${chgDesp<=0?'▼':'▲'} ${Math.abs(chgDesp).toFixed(1)}% vs mês anterior</div>
  </div>
  <div class="kpi-card" style="--kpi-color:${saldo>=0?'var(--accent)':'var(--red)'};--kpi-bg:${saldo>=0?'var(--accent-dim)':'var(--red-dim)'}">
    <div class="kpi-header">
      <span class="kpi-label">Saldo do Mês</span>
      <span class="kpi-icon">📊</span>
    </div>
    <div class="kpi-value ${saldo>=0?'accent':'red'}">${saldo<0?'-':''}${Utils.currency(saldo)}</div>
    <div class="card-sub">${Utils.pct(util)} da receita gasto</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--teal);--kpi-bg:var(--teal-dim)">
    <div class="kpi-header">
      <span class="kpi-label">Patrimônio</span>
      <span class="kpi-icon">💎</span>
    </div>
    <div class="kpi-value" style="color:var(--teal)">${Utils.currency(patrimonio)}</div>
    <div class="card-sub">Ativos totais convertidos em BRL</div>
  </div>
</div>

${alerts.map(a => `
<div class="alert-strip ${a.type}">
  <span class="alert-icon">${a.type==='danger'||a.type==='warning'?Utils.icon.warn:a.type==='success'?Utils.icon.check:Utils.icon.info}</span>
  <div class="alert-text"><div class="alert-title">${a.title}</div><div>${a.text}</div></div>
</div>`).join('')}

<div class="chart-grid mb-6">
  <div class="card">
    <div class="card-header">
      <span class="card-title">Receitas vs Despesas 2026</span>
      <span class="badge badge-accent">Anual</span>
    </div>
    <div class="chart-wrap">
      <canvas id="chartAnual" class="chart-canvas"></canvas>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title">Distribuição de Despesas</span>
      <span class="badge badge-blue">${Utils.monthsFull[month-1]}</span>
    </div>
    <div class="chart-with-legend">
      <canvas id="chartDonut"></canvas>
      <div class="donut-legend" id="donutLegend"></div>
    </div>
  </div>
</div>

<div class="chart-grid mb-6">
  <div class="card">
    <div class="card-header">
      <span class="card-title">Comprometimento da Receita</span>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:12px 0">
      <canvas id="chartGauge"></canvas>
      <div style="text-align:center">
        <div class="text-sm text-2">Limite seguro: <strong style="color:var(--green)">${Utils.pct(limitePct)}</strong></div>
        <div class="text-xs text-3 mt-4">Meta receita mín: <strong>${Utils.currency(metaReceitaMensal)}</strong></div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title">Top Categorias do Mês</span>
    </div>
    <canvas id="chartHBar" class="chart-canvas"></canvas>
  </div>
</div>

<div class="card mb-6">
  <div class="card-header">
    <span class="card-title">Evolução Mensal — Saldo Acumulado 2026</span>
  </div>
  <div class="chart-wrap">
    <canvas id="chartSaldo" class="chart-canvas"></canvas>
  </div>
</div>

<div class="chart-grid">
  <div class="card">
    <div class="card-header">
      <span class="card-title">Receitas por Pessoa</span>
      <span class="badge badge-green">${Utils.monthsFull[month-1]}</span>
    </div>
    ${renderPersonReceitas(month, year)}
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title">Despesas por Pessoa</span>
      <span class="badge badge-red">${Utils.monthsFull[month-1]}</span>
    </div>
    ${renderPersonDespesas(month, year)}
  </div>
</div>

<div class="card mb-6">
  <div class="card-header">
    <span class="card-title">Próximas Parcelas (30 dias)</span>
    <span class="badge badge-accent">contratos</span>
  </div>
  ${renderProximasParcelas()}
</div>

<div class="card mb-6">
  <div class="card-header">
    <span class="card-title">Últimos Lançamentos</span>
  </div>
  ${renderRecentTransactions(month, year)}
</div>
    `;

    // Render charts after DOM is ready
    requestAnimationFrame(() => {
      // Anual bar
      Charts.Bar(document.getElementById('chartAnual'), {
        labels: Utils.months,
        datasets: [
          { label: 'Receitas', values: yrReceitas, color: '#22C55E' },
          { label: 'Despesas', values: yrDespesas, color: '#EF4444' },
        ]
      }, { height: 165 });

      // Donut
      const donutData = topCats.map(([cat, val], i) => ({
        label: Store.CATEGORIES[cat]?.label || cat,
        value: val,
        color: Store.CATEGORIES[cat]?.color || Charts.PALETTE[i],
      }));
      Charts.Donut(document.getElementById('chartDonut'), donutData, {
        size: 190,
        centerLabel: Utils.currency(despesa).split('.')[0],
        centerSub: 'total',
      });
      const legend = document.getElementById('donutLegend');
      const totalD = donutData.reduce((a,d) => a+d.value, 0) || 1;
      legend.innerHTML = donutData.map(d => `
        <div class="donut-legend-item">
          <div class="donut-legend-dot" style="background:${d.color}"></div>
          <span class="donut-legend-label">${d.label}</span>
          <span class="donut-legend-pct">${((d.value/totalD)*100).toFixed(0)}%</span>
          <span class="donut-legend-val">${Charts.fmt(d.value, true)}</span>
        </div>
      `).join('');

      // Gauge
      Charts.Gauge(document.getElementById('chartGauge'), util, { label: 'da receita', size: 140 });

      // HBar
      Charts.HBar(document.getElementById('chartHBar'), topCats.map(([cat, val]) => ({
        label: Store.CATEGORIES[cat]?.label || cat,
        value: val,
        color: Store.CATEGORIES[cat]?.color,
      })), { barH: 24, padL: 140, padR: 90, gap: 7 });

      // Saldo acumulado line
      let acc = 0;
      const saldoAcc = yrReceitas.map((r, i) => { acc += r - yrDespesas[i]; return acc; });
      Charts.Line(document.getElementById('chartSaldo'), {
        labels: Utils.months,
        datasets: [{ label: 'Saldo', values: saldoAcc, color: '#7C6EF8' }],
      }, { height: 150 });
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
          <div class="person-avatar" style="background:${Utils.personColor(p)}">${Utils.personInitial(p)}</div>
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
    if (!rows.length) return '<div class="empty-state" style="padding:20px"><p style="font-size:12px;color:var(--text-4)">Sem parcelas previstas para os próximos 30 dias</p></div>';
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
          <div class="person-avatar" style="background:${Utils.personColor(p)}">${Utils.personInitial(p)}</div>
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

    let sortDir = 'asc'; // 'asc' | 'desc'

    container.innerHTML = `
<div class="section-header mb-4">
  <div><div class="section-title">Lançamentos — ${periodLabel}</div>
  <div class="section-sub">${despesas.length + receitas.length} registros · ${despesas.length} despesas · ${receitas.length} receitas</div></div>
  <div class="flex gap-2">
    <button class="btn-secondary active" id="btnTabDesp">Despesas</button>
    <button class="btn-secondary" id="btnTabRec">Receitas</button>
  </div>
</div>
${periodToggleHTML('ff_lanc_period', period)}
<div class="filter-bar" id="filterBar">
  <div class="search-box">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/></svg>
    <input type="text" id="searchInput" placeholder="Buscar por descrição…" />
  </div>
  <select class="form-select" id="filterCat" style="width:175px">
    <option value="">Todas as categorias</option>
    ${Object.entries(Store.CATEGORIES).filter(([k]) => k !== 'receita').map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
  </select>
  <select class="form-select" id="filterSub" style="width:170px">
    <option value="">Todas as sub-categorias</option>
  </select>
  <select class="form-select" id="filterPay" style="width:140px">
    <option value="">Todos os pagamentos</option>
    ${Store.PAYMENT_METHODS.map(m => `<option value="${m}">${m}</option>`).join('')}
  </select>
  <button class="btn-secondary" id="btnSort" title="Ordenar por data" style="white-space:nowrap;padding:6px 10px;font-size:12px">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px"><path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    Data ↑
  </button>
</div>
<div class="table-wrap" id="lancTable"></div>`;

    // ── helpers ────────────────────────────────────────────────────
    function sortRows(rows) {
      return [...rows].sort((a, b) =>
        sortDir === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
      );
    }

    function buildLancTable(rows, filter = {}) {
      let filtered = sortRows(rows);
      if (filter.search) filtered = filtered.filter(d => d.desc.toLowerCase().includes(filter.search.toLowerCase()));
      if (filter.cat)    filtered = filtered.filter(d => d.category === filter.cat);
      if (filter.sub)    filtered = filtered.filter(d => d.sub === filter.sub);
      if (filter.pay)    filtered = filtered.filter(d => d.pay === filter.pay);
      const total = filtered.reduce((a, d) => a + d.amount, 0);
      if (filtered.length === 0) return '<div style="text-align:center;padding:40px;color:var(--text-4);font-size:13px">Nenhum lançamento encontrado com os filtros aplicados.</div>';
      return `<table class="data-table">
<thead><tr>
  <th>Data</th><th>Descrição</th><th>Categoria</th><th>Sub-categoria</th><th>Pagamento</th><th>Contrato</th><th class="num">Valor</th><th></th>
</tr></thead>
<tbody>
${filtered.map(d => {
  const c = d.contratoId ? Store.getContratoById(d.contratoId) : null;
  const paidState = d.paid === true ? 'on' : d.paid === false ? 'off' : (new Date(d.date+'T23:59:59') <= new Date() ? 'auto' : '');
  return `<tr>
  <td class="muted" style="white-space:nowrap">${Utils.fmtDate(d.date)}</td>
  <td>${d.desc}${d.desconto ? ` <span class="badge badge-green" style="font-size:10px">desc -${Utils.currency(d.economia||0)}</span>` : ''}${d.split && d.split.length ? ` <span class="badge badge-accent" style="font-size:10px" title="${d.split.map(s=>s.person+': '+Utils.currency(s.valor)).join(' · ')}">👥 ${d.split.map(s=>s.person[0]).join('+')}</span>` : ''}</td>
  <td><span class="badge" style="background:${Store.CATEGORIES[d.category]?.color+'20'};color:${Store.CATEGORIES[d.category]?.color}">${Store.CATEGORIES[d.category]?.label || d.category}</span></td>
  <td class="muted">${d.sub || '—'}</td>
  <td><span class="badge ${d.pay==='Cartão'?'badge-accent':d.pay==='Dinheiro'?'badge-amber':'badge-blue'}">${d.pay||''}</span></td>
  <td>${c ? `<span class="badge badge-accent" style="font-size:10px" title="Contrato: ${c.label}">📑 ${c.label}</span>` : '<span class="muted">—</span>'}</td>
  <td class="num negative">${Utils.currency(d.amount)}</td>
  <td style="white-space:nowrap">
    ${c ? `<button class="btn-ghost" title="${paidState==='on'?'Pago ✓ (clique para desmarcar)':paidState==='auto'?'Considerado pago (data passou) — clique p/ marcar/desmarcar manualmente':'Marcar como pago'}" style="font-size:12px;color:${paidState==='on'?'var(--green)':paidState==='auto'?'var(--green-dim,#22C55E80)':'var(--text-4)'}" data-paid-desp="${d.id}">${paidState==='on'?'✓':paidState==='auto'?'◐':'○'}</button>` : ''}
    <button class="btn-ghost" style="font-size:11px;color:var(--text-3)" data-edit-desp="${d.id}">✏</button>
    <button class="btn-ghost" style="font-size:11px;color:var(--red)" data-del-desp="${d.id}">✕</button>
  </td>
</tr>`;}).join('')}
</tbody>
<tfoot><tr>
  <td colspan="6" class="fw-700">Total (${filtered.length} lançamentos)</td>
  <td class="num negative fw-700">${Utils.currency(total)}</td>
  <td></td>
</tr></tfoot>
</table>`;
    }

    function buildRecTable(rows, filter = {}) {
      let filtered = sortRows(rows);
      if (filter.search) filtered = filtered.filter(r => r.desc.toLowerCase().includes(filter.search.toLowerCase()));
      if (filter.cat)    filtered = filtered.filter(r => r.person === filter.cat);
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
  return `<tr>
  <td class="muted" style="white-space:nowrap">${Utils.fmtDate(r.date)}</td>
  <td>${r.desc}</td>
  <td><span class="person-chip"><span class="person-avatar" style="background:${Utils.personColor(r.person)}">${Utils.personInitial(r.person)}</span>${r.person}</span></td>
  <td class="muted">${r.type||''}</td>
  <td>${c ? `<span class="badge badge-accent" style="font-size:10px" title="Contrato: ${c.label}">📑 ${c.label}</span>` : '<span class="muted">—</span>'}</td>
  <td class="num positive">${Utils.currency(r.amount)}</td>
  <td style="white-space:nowrap">
    ${c ? `<button class="btn-ghost" title="${paidState==='on'?'Recebido ✓':paidState==='auto'?'Considerado recebido (data passou)':'Marcar como recebido'}" style="font-size:12px;color:${paidState==='on'?'var(--green)':paidState==='auto'?'var(--green-dim,#22C55E80)':'var(--text-4)'}" data-paid-rec="${r.id}">${paidState==='on'?'✓':paidState==='auto'?'◐':'○'}</button>` : ''}
    <button class="btn-ghost" style="font-size:11px;color:var(--text-3)" data-edit-rec="${r.id}">✏</button>
    <button class="btn-ghost" style="font-size:11px;color:var(--red)" data-del-rec="${r.id}">✕</button>
  </td>
</tr>`;}).join('')}
</tbody>
<tfoot><tr><td colspan="5" class="fw-700">Total (${filtered.length})</td><td class="num positive fw-700">${Utils.currency(total)}</td><td></td></tr></tfoot>
</table>`;
    }

    // ── tab state ─────────────────────────────────────────────────
    let activeTab = 'desp';

    function getFilters() {
      return {
        search: document.getElementById('searchInput')?.value || '',
        cat:    document.getElementById('filterCat')?.value  || '',
        sub:    document.getElementById('filterSub')?.value  || '',
        pay:    document.getElementById('filterPay')?.value  || '',
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
      container.querySelectorAll('[data-edit-desp]').forEach(btn => {
        btn.addEventListener('click', () => openEditDespesa(btn.dataset.editDesp, refilter));
      });
      container.querySelectorAll('[data-edit-rec]').forEach(btn => {
        btn.addEventListener('click', () => openEditReceita(btn.dataset.editRec, refilter));
      });
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
    document.getElementById('btnTabDesp').addEventListener('click', () => {
      activeTab = 'desp';
      document.getElementById('btnTabDesp').classList.add('active');
      document.getElementById('btnTabRec').classList.remove('active');
      // Restore desp category options
      document.getElementById('filterCat').innerHTML =
        `<option value="">Todas as categorias</option>` +
        Object.entries(Store.CATEGORIES).filter(([k]) => k !== 'receita')
          .map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('');
      updateSubFilter('');
      showDespFilters(true);
      refilter();
    });

    document.getElementById('btnTabRec').addEventListener('click', () => {
      activeTab = 'rec';
      document.getElementById('btnTabRec').classList.add('active');
      document.getElementById('btnTabDesp').classList.remove('active');
      document.getElementById('filterCat').innerHTML =
        `<option value="">Todas as pessoas</option>` +
        Store.PESSOAS.map(p => `<option value="${p}">${p}</option>`).join('');
      showDespFilters(false);
      refilter();
    });

    document.getElementById('searchInput').addEventListener('input', refilter);

    document.getElementById('filterCat').addEventListener('change', () => {
      if (activeTab === 'desp') updateSubFilter(document.getElementById('filterCat').value);
      refilter();
    });

    document.getElementById('filterSub').addEventListener('change', refilter);
    document.getElementById('filterPay').addEventListener('change', refilter);

    document.getElementById('btnSort').addEventListener('click', () => {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      updateSortBtn();
      refilter();
    });

    // ── initial render ────────────────────────────────────────────
    refilter(); // already calls attachDeleteHandlers() internally
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
    <div class="kpi-header"><span class="kpi-label">Total ${year}</span><span class="kpi-icon">💰</span></div>
    <div class="kpi-value green">${Utils.currency(totalAno)}</div>
    <div class="card-sub">Soma de todas as receitas</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--teal);--kpi-bg:var(--teal-dim)">
    <div class="kpi-header"><span class="kpi-label">Média Mensal</span><span class="kpi-icon">📈</span></div>
    <div class="kpi-value" style="color:var(--teal)">${Utils.currency(media)}</div>
    <div class="card-sub">Meta mínima: <strong>${Utils.currency((Store.getActiveMetaReceitaMensal() ?? Store.get().settings.metaReceita))}</strong></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-header"><span class="kpi-label">Meses OK</span><span class="kpi-icon">✅</span></div>
    <div class="kpi-value accent">${yrRec.filter(v => v >= (Store.getActiveMetaReceitaMensal() ?? Store.get().settings.metaReceita)).length}/12</div>
    <div class="card-sub">Atingiram a meta mínima</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--blue);--kpi-bg:var(--blue-dim)">
    <div class="kpi-header"><span class="kpi-label">Melhor Mês</span><span class="kpi-icon">🏆</span></div>
    <div class="kpi-value" style="color:var(--blue)">${Utils.currency(Math.max(...yrRec))}</div>
    <div class="card-sub">${Utils.months[yrRec.indexOf(Math.max(...yrRec))]}</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--${statusCol});--kpi-bg:var(--${statusCol}-dim, #14B8A618)">
    <div class="kpi-header"><span class="kpi-label">Valor Futuro</span><span class="kpi-icon">🔮</span></div>
    <div class="kpi-value" style="color:var(--${statusCol})">${Utils.currency(valorFuturo)}</div>
    <div class="card-sub">Projeção ${year}: <strong>${Utils.currency(projecaoAno)}</strong></div>
    <div class="progress-bar" style="margin-top:8px"><div class="progress-fill ${statusCol}" style="width:${Math.min(pctMeta,1)*100}%"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);margin-top:4px">
      <span>${(pctMeta*100).toFixed(0)}% da meta anual</span>
      <span>${Utils.currency(metaAnual)}</span>
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
          <td><span class="person-chip"><span class="person-avatar" style="background:${Utils.personColor(p)}">${Utils.personInitial(p)}</span>${p}</span></td>
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

<div class="card">
  <div class="card-header">
    <span class="card-title">Receitas — ${periodLabel}</span>
    <button class="btn-primary" id="btnAddRec">+ Nova Receita</button>
  </div>
  ${periodToggleHTML('ff_rec_period', period)}
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th>Data</th><th>Descrição</th><th>Pessoa</th><th>Tipo</th><th class="num">Valor</th><th></th></tr></thead>
      <tbody>
        ${Store.get().receitas.filter(r=>r.year===year && r.month>=mStart && r.month<=mEnd).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>`<tr>
          <td class="muted" style="white-space:nowrap">${Utils.fmtDate(r.date)}</td>
          <td>${r.desc}</td>
          <td><span class="person-chip"><span class="person-avatar" style="background:${Utils.personColor(r.person)}">${Utils.personInitial(r.person)}</span>${r.person}</span></td>
          <td class="muted">${r.type||''}</td>
          <td class="num positive">${Utils.currency(r.amount)}</td>
          <td style="white-space:nowrap">
            <button class="btn-ghost" style="font-size:11px;color:var(--text-3)" data-edit-rec="${r.id}">✏</button>
            <button class="btn-ghost" style="font-size:11px;color:var(--red)" data-del-rec="${r.id}">✕</button>
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
          <button class="btn-xs btn-green" data-realizar-rf="${rf.id}" title="Realizar (vira receita)">✓</button>
          <button class="btn-xs btn-red" data-del-rf="${rf.id}" title="Excluir">✕</button>
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
    container.querySelectorAll('[data-edit-rec]').forEach(btn => {
      btn.addEventListener('click', () => openEditReceita(btn.dataset.editRec, () => renderReceitas(container)));
    });

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

    container.innerHTML = `
<div class="section-header mb-4">
  <div><div class="section-title">Despesas — ${periodLabel}</div>
  <div class="section-sub">${despesas.length} lançamentos · total: <strong>${Utils.currency(total)}</strong></div></div>
  <button class="btn-primary" id="btnAddDesp">+ Nova Despesa</button>
</div>
${periodToggleHTML('ff_desp_period', period)}

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
  <div class="card-header"><span class="card-title">Por Pessoa — ${periodLabel}</span><span class="badge badge-accent">via rateio</span></div>
  ${(() => {
    const map = Store.despesasPorPessoaRange(mStart, mEnd, year);
    const totalP = Object.values(map).reduce((a,b)=>a+b,0);
    if (totalP === 0) return '<div style="padding:12px;color:var(--text-4);font-size:12px">Sem dados no período</div>';
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([p, v]) => {
      const pct = v/totalP;
      return `<div style="display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div class="person-avatar" style="background:${Utils.personColor(p)};width:32px;height:32px;font-size:13px">${Utils.personInitial(p)}</div>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:6px">${p}</div>
          <div class="progress-bar progress-lg"><div class="progress-fill" style="width:${Math.round(pct*100)}%;background:${Utils.personColor(p)}"></div></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:15px;font-weight:700;color:var(--text-1)">${Utils.currency(v)}</div>
          <div style="font-size:11px;color:var(--text-3)">${(pct*100).toFixed(1)}%</div>
        </div>
      </div>`;
    }).join('');
  })()}
</div>

<div class="card mb-6">
  <div class="card-header"><span class="card-title">Resumo por Categoria — ${Utils.monthsFull[month-1]}</span></div>
  <div>
    ${catSorted.map(([cat, val]) => {
      const pct = val / total;
      const catInfo = Store.CATEGORIES[cat] || {};
      return `<div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:13px;font-weight:600;color:var(--text-1)">${catInfo.label||cat}</span>
            <span class="badge" style="background:${catInfo.color+'20'};color:${catInfo.color}">${((pct)*100).toFixed(1)}%</span>
          </div>
          <div class="progress-bar progress-lg">
            <div class="progress-fill" style="width:${Math.round(pct*100)}%;background:${catInfo.color||'var(--accent)'}"></div>
          </div>
        </div>
        <div class="num" style="font-size:15px;font-weight:700;color:var(--text-1)">${Utils.currency(val)}</div>
      </div>`;
    }).join('')}
  </div>
</div>

<div class="card mb-6">
  <div class="card-header"><span class="card-title">Por Categoria — ${year}</span></div>
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

<div class="card">
  <div class="card-header">
    <span class="card-title">Detalhamento — ${Utils.monthsFull[month-1]}</span>
    <select class="form-select" id="despCatFilter" style="width:180px">
      <option value="">Todas as categorias</option>
      ${Object.entries(Store.CATEGORIES).filter(([k])=>k!=='receita').map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
    </select>
  </div>
  <div class="table-wrap" id="despTable">
    ${buildDespTable(despesas)}
  </div>
</div>`;

    function buildDespTable(rows, catFilter = '') {
      const filtered = catFilter ? rows.filter(d => d.category === catFilter) : rows;
      const tot = filtered.reduce((a,d) => a+d.amount, 0);
      return `<table class="data-table">
<thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Sub-cat</th><th>Pagamento</th><th class="num">Valor</th><th></th></tr></thead>
<tbody>${filtered.sort((a,b)=>a.date.localeCompare(b.date)).map(d=>`<tr>
  <td class="muted" style="white-space:nowrap">${Utils.fmtDate(d.date)}</td>
  <td style="font-weight:500">${d.desc}${d.desconto?` <span class="badge badge-green" title="Economia: ${Utils.currency(d.economia||0)}">💰 desc.</span>`:''}</td>
  <td><span class="badge" style="background:${Store.CATEGORIES[d.category]?.color+'20'};color:${Store.CATEGORIES[d.category]?.color}">${Store.CATEGORIES[d.category]?.label||d.category}</span></td>
  <td class="muted">${d.sub||''}</td>
  <td><span class="badge ${d.pay==='Cartão'?'badge-accent':d.pay==='Dinheiro'?'badge-amber':'badge-blue'}">${d.pay||''}</span></td>
  <td class="num negative">${Utils.currency(d.amount)}</td>
  <td style="white-space:nowrap">
    <button class="btn-ghost" style="font-size:11px;color:var(--text-3)" data-edit-desp="${d.id}">✏</button>
    <button class="btn-ghost" style="font-size:11px;color:var(--red)" data-del-desp="${d.id}">✕</button>
  </td>
</tr>`).join('')}</tbody>
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
          size: 190, centerLabel: Utils.currency(totalP).split('.')[0], centerSub: 'rateio',
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

    document.getElementById('despCatFilter').addEventListener('change', e => {
      document.getElementById('despTable').innerHTML = buildDespTable(despesas, e.target.value);
      attachDespDeleteHandlers();
    });

    function attachDespDeleteHandlers() {
      container.querySelectorAll('[data-del-desp]').forEach(btn => {
        btn.addEventListener('click', () => {
          Store.deleteDespesa(btn.dataset.delDesp);
          renderDespesas(container);
          toast('Despesa removida', 'success');
        });
      });
      container.querySelectorAll('[data-edit-desp]').forEach(btn => {
        btn.addEventListener('click', () => openEditDespesa(btn.dataset.editDesp, () => renderDespesas(container)));
      });
    }
    attachDespDeleteHandlers();

    document.getElementById('btnAddDesp')?.addEventListener('click', () => openAddDespesa(container));
    bindPeriodToggle(container, 'ff_desp_period', () => renderDespesas(container));
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
          <button type="button" class="btn-xs btn-red" data-action="remove">✕</button>
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
    const cats = Object.entries(Store.CATEGORIES).filter(([k])=>k!=='receita');
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
      const parcelado     = document.getElementById('fDParcelado').checked;
      const parcelas      = parseInt(document.getElementById('fDParcelas')?.value || '1');
      const temDesconto   = document.getElementById('fDDesconto')?.checked;
      const valorOriginal = temDesconto ? parseFloat(document.getElementById('fDValorOriginal')?.value || '0') : 0;
      const economia      = temDesconto && valorOriginal > amount ? valorOriginal - amount : 0;
      const split         = splitApi?.read() || null;
      if (!desc || !amount || !date) return toast('Preencha todos os campos', 'error');
      if (split) {
        const sum = split.reduce((s,r)=>s+r.valor,0);
        if (sum > amount + 0.01) return toast('Soma do rateio excede o valor', 'error');
      }
      const extraFields = temDesconto && economia > 0 ? { desconto: true, valorOriginal, economia } : {};
      if (split) extraFields.split = split;
      if (parcelado && parcelas > 1) {
        Store.addDespesaParcelada({ desc, amount: parseFloat((amount / parcelas).toFixed(2)), date, category: cat, sub, pay, parcelas });
        toast(`${parcelas} parcelas lançadas!`, 'success');
      } else {
        const d = new Date(date);
        Store.addDespesa({ desc, amount, date, category: cat, sub, pay, month: d.getMonth()+1, year: d.getFullYear(), ...extraFields });
        toast('Despesa adicionada!', 'success');
      }
      Modal.close();
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
      function updateEconomia() {
        const amt = parseFloat(document.getElementById('fDAmt')?.value) || 0;
        const orig = parseFloat(document.getElementById('fDValorOriginal')?.value) || 0;
        const el = document.getElementById('fDEconomia');
        if (el) el.textContent = orig > amt ? `💰 Economia: ${Utils.currency(orig - amt)}` : '';
      }
      document.getElementById('fDValorOriginal')?.addEventListener('input', updateEconomia);
      document.getElementById('fDAmt')?.addEventListener('input', () => { updateParcelaInfo(); updateEconomia(); });
      document.getElementById('fDParcelas')?.addEventListener('change', updateParcelaInfo);
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
          ${m.type==='reserva'?`<button class="btn-xs" data-action="snap-meta" data-id="${m.id}" title="Marcar snapshot">📸</button>`:''}
          <button class="btn-xs" data-action="edit-meta" data-id="${m.id}">✏</button>
          <button class="btn-xs btn-red" data-action="del-meta" data-id="${m.id}">✕</button>
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
          <button class="btn-xs" data-action="edit-meta" data-id="${m.id}">✏</button>
          <button class="btn-xs btn-red" data-action="del-meta" data-id="${m.id}">✕</button>
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
<div class="card">
  <div class="card-header"><span class="card-title">Performance por mês — ${year}</span></div>
  <div style="overflow-x:auto">
    <table class="table" style="width:100%;min-width:720px;font-size:12px">
      <thead><tr>
        <th style="text-align:left">Meta</th>
        ${Utils.months.map(m => `<th style="text-align:right">${m}</th>`).join('')}
        <th style="text-align:right">Total/Proj</th>
        <th style="text-align:right">Alvo</th>
      </tr></thead>
      <tbody>
      ${indicadores.filter(m => m.type !== 'reserva').map(m => {
        const perf = Store.getMetaPerformance(m.id, year, month);
        const isLimit = m.type === 'limite_desp';
        const valorRef = m.period === 'anual' ? perf.projecaoAnual : perf.target * 12;
        return `<tr>
          <td><strong>${m.label}</strong><div style="font-size:10px;color:var(--text-4)">${m.period==='anual'?'Anual':'Mensal'}</div></td>
          ${perf.byMonth.map((v, i) => {
            const cmp = m.period === 'mensal' ? perf.target : (perf.target / 12);
            const okv = isLimit ? v <= cmp : v >= cmp;
            const cls = v === 0 ? 'var(--text-4)' : (okv ? 'var(--green)' : 'var(--red)');
            return `<td style="text-align:right;font-family:var(--mono);color:${cls}">${v?Utils.currency(v).replace('R$ ',''):'—'}</td>`;
          }).join('')}
          <td style="text-align:right;font-family:var(--mono);font-weight:700">${Utils.currency(m.period==='anual'?perf.projecaoAnual:perf.byMonth.reduce((a,b)=>a+b,0))}</td>
          <td style="text-align:right;font-family:var(--mono);color:var(--text-3)">${Utils.currency(m.period==='anual'?perf.target:perf.target*12)}</td>
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
    const cats = Object.entries(Store.CATEGORIES);
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
          ${cats.filter(([k]) => k !== 'receita').map(([k,v]) => `<option value="${k}" ${m.category===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
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
  function renderContratos(container) {
    const contratos = Store.getContratos();
    const month = getMonth(), year = getYear();

    // KPIs agregados
    let totReceitaMes = 0, totDespesaMes = 0, totReceitaContrato = 0, totDespesaContrato = 0;
    contratos.filter(c => c.active !== false).forEach(c => {
      const perf = Store.getContratoPerformance(c.id);
      const mesAtual = (c.kind === 'receita' ? Store.get().receitas : Store.get().despesas)
        .filter(x => x.contratoId === c.id && x.month === month && x.year === year)
        .reduce((s, x) => s + x.amount, 0);
      if (c.kind === 'receita') { totReceitaMes += mesAtual; totReceitaContrato += perf.valorTotal; }
      else { totDespesaMes += mesAtual; totDespesaContrato += perf.valorTotal; }
    });

    const receitaMes = Store.sumReceitas(month, year);
    const despesaMes = Store.sumDespesas(month, year);
    const impactoRec = receitaMes > 0 ? totReceitaMes / receitaMes : 0;
    const impactoDesp = despesaMes > 0 ? totDespesaMes / despesaMes : 0;

    container.innerHTML = `
<div class="section-header mb-6">
  <div><div class="section-title">Contratos</div><div class="section-sub">Cadastre contratos recorrentes — parcelas alimentam Receitas/Despesas automaticamente</div></div>
  <button class="btn-primary" id="btnAddContrato">+ Novo Contrato</button>
</div>

<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-header"><span class="kpi-label">Receita p/ Contratos (mês)</span><span class="kpi-icon">📈</span></div>
    <div class="kpi-value" style="color:var(--green)">${Utils.currency(totReceitaMes)}</div>
    <div class="card-sub">${Utils.pct(impactoRec)} da receita do mês</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim)">
    <div class="kpi-header"><span class="kpi-label">Despesa p/ Contratos (mês)</span><span class="kpi-icon">📉</span></div>
    <div class="kpi-value" style="color:var(--red)">${Utils.currency(totDespesaMes)}</div>
    <div class="card-sub">${Utils.pct(impactoDesp)} da despesa do mês</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-header"><span class="kpi-label">Contratos ativos</span><span class="kpi-icon">📑</span></div>
    <div class="kpi-value">${contratos.filter(c=>c.active!==false).length}</div>
    <div class="card-sub">Total cadastrado: ${contratos.length}</div>
  </div>
</div>

${contratos.length === 0 ? `
  <div class="empty-state" style="padding:48px;text-align:center;border:1px dashed var(--border);border-radius:12px">
    <div style="font-size:14px;color:var(--text-3);margin-bottom:8px">Nenhum contrato cadastrado</div>
    <div style="font-size:12px;color:var(--text-4)">Clique em "Novo Contrato" para começar. Cada parcela vira um lançamento automático.</div>
  </div>
` : `
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">
  ${contratos.map(c => {
    const perf = Store.getContratoPerformance(c.id);
    const isRec = c.kind === 'receita';
    const cat = Store.CATEGORIES[c.category] || { label: c.category, icon: '📄', color: 'var(--accent)' };
    const colorBar = perf.pctValor >= 1 ? 'green' : isRec ? 'accent' : (perf.pctValor > 0.8 ? 'amber' : 'accent');
    const impactoMes = perf.impactoMensal;
    const base = isRec ? receitaMes : despesaMes;
    const impactoMesPct = base > 0 ? impactoMes / base : 0;
    return `
    <div class="card" data-contrato-id="${c.id}" style="border-top:3px solid var(--${isRec?'green':'red'})">
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">${cat.icon || '📄'}</span>
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text-1)">${c.label}</div>
            <div style="font-size:11px;color:var(--text-4)">${isRec?'Receita':'Despesa'} · ${cat.label}${c.sub?' / '+c.sub:''}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn-xs" data-action="edit-contrato" data-id="${c.id}" title="Editar">✏</button>
          <button class="btn-xs btn-red" data-action="del-contrato" data-id="${c.id}" title="Excluir">✕</button>
        </div>
      </div>

      <div style="display:flex;gap:12px;margin:8px 0 12px;font-size:11px;color:var(--text-3)">
        <span>👤 ${c.responsavel || '—'}</span>
        <span>📅 ${new Date(c.dataInicio+'T12:00:00').toLocaleDateString('pt-BR')} → ${c.dataFim?new Date(c.dataFim+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</span>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:6px">
        <div>
          <div style="font-size:11px;color:var(--text-3)">Cumprido</div>
          <div style="font-size:20px;font-weight:800;font-family:var(--mono);color:var(--${colorBar})">${Utils.currency(perf.valorCumprido)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--text-3)">Total</div>
          <div style="font-size:13px;color:var(--text-2);font-family:var(--mono)">${Utils.currency(perf.valorTotal)}</div>
        </div>
      </div>

      <div class="progress-bar progress-lg" style="margin-bottom:6px">
        <div class="progress-fill ${colorBar}" style="width:${Math.round(perf.pctValor*100)}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);margin-bottom:10px">
        <span>${(perf.pctValor*100).toFixed(0)}% do valor</span>
        <span>${perf.cumpridas}/${perf.totalParcelas} parcelas</span>
        <span>${(perf.pctTempo*100).toFixed(0)}% do tempo</span>
      </div>

      ${(() => {
        const linked = (isRec ? Store.get().receitas : Store.get().despesas)
          .filter(x => x.contratoId === c.id)
          .sort((a,b) => a.parcelaNum - b.parcelaNum);
        const today = new Date();
        const cells = linked.map(p => {
          let state, color, title;
          if (p.paid === true)       { state='paid'; color='var(--green)'; title='Pago'; }
          else if (p.paid === false) { state='due';  color='var(--red)';   title='Em aberto (marcado)'; }
          else if (new Date(p.date+'T23:59:59') <= today) { state='auto'; color='var(--amber)'; title='Vencida (considerada paga)'; }
          else                       { state='future'; color='var(--border)'; title='Futura'; }
          return `<span title="${title} · ${new Date(p.date+'T12:00:00').toLocaleDateString('pt-BR')} · ${Utils.currency(p.amount)}" style="flex:1;min-width:6px;height:8px;border-radius:2px;background:${color}"></span>`;
        }).join('');
        return `
        <div style="margin-bottom:10px">
          <div style="font-size:10px;color:var(--text-4);margin-bottom:4px">Evolução · cada bloco = 1 parcela</div>
          <div style="display:flex;gap:2px">${cells}</div>
        </div>`;
      })()}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;padding-top:10px;border-top:1px solid var(--border)">
        <div>
          <div style="color:var(--text-4)">Parcela mensal</div>
          <div style="font-weight:700;color:var(--text-1);font-family:var(--mono)">${Utils.currency(perf.impactoMensal)}</div>
        </div>
        <div>
          <div style="color:var(--text-4)">Restante</div>
          <div style="font-weight:700;color:var(--text-1);font-family:var(--mono)">${Utils.currency(perf.valorRestante)}</div>
        </div>
        <div>
          <div style="color:var(--text-4)">Parc. restantes</div>
          <div style="font-weight:700;color:var(--text-1)">${perf.parcelasRestantes}</div>
        </div>
        <div>
          <div style="color:var(--text-4)">Impacto no mês</div>
          <div style="font-weight:700;color:var(--${isRec?'green':'red'})">${Utils.pct(impactoMesPct)}</div>
        </div>
        ${c.entrada ? `<div style="grid-column:span 2"><div style="color:var(--text-4)">Entrada</div><div style="font-weight:700;color:var(--text-1);font-family:var(--mono)">${Utils.currency(c.entrada)}</div></div>` : ''}
        ${perf.proxima ? `<div style="grid-column:span 2"><div style="color:var(--text-4)">Próxima parcela</div><div style="font-weight:700;color:var(--text-1)">${new Date(perf.proxima.date+'T12:00:00').toLocaleDateString('pt-BR')} · ${Utils.currency(perf.proxima.amount)}</div></div>` : ''}
      </div>
    </div>`;
  }).join('')}
</div>`}`;

    document.getElementById('btnAddContrato')?.addEventListener('click', () => openContratoModal(null, container));
    container.querySelectorAll('[data-action="edit-contrato"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = Store.getContratos().find(x => x.id === btn.dataset.id);
        if (c) openContratoModal(c, container);
      });
    });
    container.querySelectorAll('[data-action="del-contrato"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Excluir contrato e todos os lançamentos vinculados?')) return;
        Store.deleteContrato(btn.dataset.id, true);
        renderContratos(container);
        toast('Contrato excluído', 'success');
      });
    });
  }

  function openContratoModal(contrato, container) {
    const isEdit = !!contrato;
    const c = contrato || {};
    const cats = Object.entries(Store.CATEGORIES);
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
          ${cats.map(([k,v]) => `<option value="${k}" ${c.category===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
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
  function renderContas(container) {
    const cartoes = Store.get().cartoes;
    const contas  = Store.get().contas || [];
    const month = getMonth(), year = getYear();

    container.innerHTML = `
<div class="section-header mb-6">
  <div><div class="section-title">Contas & Cartões</div><div class="section-sub">Gerencie suas contas bancárias e cartões de crédito</div></div>
  <div class="flex gap-2">
    <button class="btn-secondary" id="btnAddConta">+ Nova Conta</button>
    <button class="btn-primary"   id="btnAddCartao">+ Novo Cartão</button>
  </div>
</div>

<div class="section-label mb-3" style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)">Contas Bancárias</div>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:32px">
  ${contas.length ? contas.map(ct => `
  <div class="card" style="border-top:3px solid ${ct.cor};position:relative">
    <button class="btn-ghost" style="position:absolute;top:10px;right:10px;font-size:11px;color:var(--text-4)" data-del-conta="${ct.id}">✕</button>
    <div style="font-size:11px;font-weight:700;color:var(--text-3);letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px">${ct.banco}</div>
    <div style="font-size:15px;font-weight:700;color:var(--text-1);margin-bottom:2px">${ct.nome}</div>
    <div style="font-size:11px;color:var(--text-4);margin-bottom:12px">${ct.tipo}</div>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:2px">Saldo</div>
    <div style="font-size:22px;font-weight:800;font-family:var(--mono);color:${ct.cor}">${Utils.currency(ct.saldo)}</div>
  </div>`).join('') : '<div class="empty-state"><p>Nenhuma conta cadastrada</p></div>'}
</div>

<div class="section-label mb-3" style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)">Cartões de Crédito</div>

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:28px">
  ${cartoes.map(cc => {
    const totalParcelas = cc.parcelas.reduce((a,p)=>a+p.parcela,0);
    const usado = totalParcelas;
    const livre = cc.limit - usado;
    return `
    <div class="cc-card ${cc.color==='gold'?'card-gold':''}" style="position:relative">
      <button class="btn-ghost" style="position:absolute;top:10px;right:10px;font-size:11px;color:rgba(255,255,255,.4)" data-del-cartao="${cc.id}">✕</button>
      <div>
        <div class="cc-bank">${cc.banco}</div>
        <div style="font-size:18px;font-weight:800;color:var(--text-1);margin-top:4px">${cc.name}</div>
      </div>
      <div>
        <div class="cc-limit-label">Limite</div>
        <div class="cc-limit-value">${Utils.currency(cc.limit)}</div>
        <div class="progress-bar" style="margin:8px 0">
          <div class="progress-fill ${usado/cc.limit>0.8?'red':usado/cc.limit>0.6?'amber':''}" style="width:${Math.round(usado/cc.limit*100)}%;background:${cc.color==='gold'?'var(--amber)':'var(--accent)'}"></div>
        </div>
        <div class="cc-bottom">
          <div><div class="cc-meta-label">Comprometido</div><div class="cc-meta-value" style="color:var(--red)">${Utils.currency(usado)}</div></div>
          <div><div class="cc-meta-label">Disponível</div><div class="cc-meta-value" style="color:var(--green)">${Utils.currency(livre)}</div></div>
          <div><div class="cc-meta-label">Fecha dia</div><div class="cc-meta-value">${cc.closingDay}</div></div>
          <div><div class="cc-meta-label">Vence dia</div><div class="cc-meta-value">${cc.dueDay}</div></div>
        </div>
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
            <button class="btn-xs" data-action="edit-parcela" data-cc="${cc.id}" data-pid="${p.id}" title="Editar">✏</button>
            <button class="btn-xs btn-green" data-action="quitar-parcela" data-cc="${cc.id}" data-pid="${p.id}" title="Quitar">✓</button>
            <button class="btn-xs btn-red" data-action="del-parcela" data-cc="${cc.id}" data-pid="${p.id}" title="Excluir">✕</button>
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
</div>`;

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
    <button class="btn-secondary" id="btnEditRates">✏️ Cotações</button>
    <button class="btn-secondary" id="btnAddFuturo">+ Recebimento Futuro</button>
    <button class="btn-primary"   id="btnAddInv">+ Novo Investimento</button>
  </div>
</div>

<!-- KPIs -->
<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-header"><span class="kpi-label">Patrimônio Total</span><span class="kpi-icon">💎</span></div>
    <div class="kpi-value accent">${Utils.currency(total)}</div>
    <div class="card-sub">Reservas + Outros Ativos (BRL)</div>
  </div>
  <div class="kpi-card" style="--kpi-color:#14B8A6;--kpi-bg:#14B8A618">
    <div class="kpi-header"><span class="kpi-label">Total em Reservas</span><span class="kpi-icon">🏦</span></div>
    <div class="kpi-value" style="color:#14B8A6">${Utils.currency(totalInv)}</div>
    <div class="card-sub">${metaRes ? `Meta: ${Utils.currency(metaRes.target)} · <span style="color:${pctMeta>=100?'var(--green)':'var(--amber)'}">⬤ ${pctMeta}% atingido</span>` : `${investimentos.length} investimento${investimentos.length!==1?'s':''}`}</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-header"><span class="kpi-label">Rendimento Est./ano</span><span class="kpi-icon">📈</span></div>
    <div class="kpi-value green">${Utils.currency(rendimento)}</div>
    <div class="card-sub">Projeção anual líquida após IR</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--blue);--kpi-bg:var(--blue-dim)">
    <div class="kpi-header"><span class="kpi-label">Outros Ativos</span><span class="kpi-icon">📊</span></div>
    <div class="kpi-value" style="color:var(--blue)">${Utils.currency(totalAtiv)}</div>
    <div class="card-sub">${ativos.length} ativo${ativos.length!==1?'s':''} (Crypto, FIAT…)</div>
  </div>
  ${totalFutPend > 0 ? `
  <div class="kpi-card" style="--kpi-color:var(--amber);--kpi-bg:var(--amber-dim,#F59E0B18)">
    <div class="kpi-header"><span class="kpi-label">Recebimentos Futuros</span><span class="kpi-icon">📅</span></div>
    <div class="kpi-value" style="color:var(--amber)">${Utils.currency(totalFutPend)}</div>
    <div class="card-sub">${futuros.filter(f=>f.status!=='recebido').length} pendente${futuros.filter(f=>f.status!=='recebido').length!==1?'s':''}</div>
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
        <button class="btn-xs" data-action="edit-inv" data-id="${r.id}">✏</button>
        <button class="btn-xs btn-red" data-action="del-inv" data-id="${r.id}">✕</button>
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
          <div style="font-size:11px;color:var(--text-3);text-align:right">${a.qty * a.unitPrice} ${a.currency}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;margin-left:8px">
          <button class="btn-xs" data-action="edit-ativo" data-id="${a.id}">✏</button>
          <button class="btn-xs btn-red" data-action="del-ativo" data-id="${a.id}">×</button>
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

<!-- Recebimentos Futuros -->
<div class="section-header mb-4"><div class="section-title">Recebimentos Futuros Previstos</div></div>
${futuros.length === 0
  ? `<div class="card" style="text-align:center;padding:32px;color:var(--text-4)">Nenhum recebimento futuro cadastrado.</div>`
  : `<div class="card">
  ${futuros.map(f => {
    const mes = `${MESES_LABEL[(f.mes||1)-1]} ${f.ano||''}`;
    return `
  <div class="stat-row">
    <div>
      <div class="stat-row-label">${f.descricao}</div>
      <div style="font-size:11px;color:var(--text-4)">Previsto: ${mes}</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <span style="font-weight:700;font-size:14px;color:${f.status==='recebido'?'var(--green)':'var(--text-1)'}">${Utils.currency(f.valor)}</span>
      ${f.status!=='recebido'
        ? `<button class="btn-xs btn-green" data-action="rec-recebido" data-id="${f.id}">✓</button>`
        : `<span class="badge badge-green">Recebido</span>`}
      <button class="btn-xs btn-red" data-action="del-futuro" data-id="${f.id}">✕</button>
    </div>
  </div>`;
  }).join('')}
</div>`}`;

    // ── Charts ────────────────────────────────────────────────────
    requestAnimationFrame(() => {
      const donutData = Object.entries(byType).map(([type, val]) => ({
        label: type, value: val, color: TYPE_COLORS[type] || '#7C6EF8',
      }));
      if (donutData.length) {
        Charts.Donut(document.getElementById('chartPatDonut'), donutData, {
          size: 200, centerLabel: Charts.fmt(total/1e6,true)+'M', centerSub: 'BRL',
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
    document.getElementById('btnAddFuturo')?.addEventListener('click', () => openFuturoModal2(re));
    document.getElementById('btnAddAtivo')?.addEventListener('click', () => openAtivoModal(null, re));
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
    const year = getYear();
    const yrRec  = Store.yearlyMonthly(year, 'receita');
    const yrDesp = Store.yearlyMonthly(year, 'despesa');
    const yrSaldo = yrRec.map((r,i) => r - yrDesp[i]);

    const totalRec  = yrRec.reduce((a,b)=>a+b,0);
    const totalDesp = yrDesp.reduce((a,b)=>a+b,0);
    const totalSaldo = totalRec - totalDesp;
    const mediaRec  = totalRec  / 12;
    const mediaDesp = totalDesp / 12;

    if (totalRec === 0 && totalDesp === 0) {
      container.innerHTML = `
<div class="empty-state">
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 14l4-4 4 4 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  <p><strong>Sem dados para ${year}</strong><br/>Cadastre receitas e despesas para ver o comparativo anual.</p>
</div>`;
      return;
    }

    container.innerHTML = `
<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-header"><span class="kpi-label">Receita Total ${year}</span></div>
    <div class="kpi-value green">${Utils.currency(totalRec)}</div>
    <div class="card-sub">Média: ${Utils.currency(mediaRec)}/mês</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--red);--kpi-bg:var(--red-dim)">
    <div class="kpi-header"><span class="kpi-label">Despesa Total ${year}</span></div>
    <div class="kpi-value red">${Utils.currency(totalDesp)}</div>
    <div class="card-sub">Média: ${Utils.currency(mediaDesp)}/mês</div>
  </div>
  <div class="kpi-card" style="--kpi-color:${totalSaldo>=0?'var(--accent)':'var(--red)'};--kpi-bg:${totalSaldo>=0?'var(--accent-dim)':'var(--red-dim)'}">
    <div class="kpi-header"><span class="kpi-label">Saldo do Ano</span></div>
    <div class="kpi-value ${totalSaldo>=0?'accent':'red'}">${Utils.currency(Math.abs(totalSaldo))}</div>
    <div class="card-sub">${totalSaldo>=0?'Sobrou no ano':'Déficit no ano'}</div>
  </div>
</div>

<div class="card mb-6">
  <div class="card-header"><span class="card-title">Receitas vs Despesas por Mês</span></div>
  <div class="chart-wrap"><canvas id="chartCompAnual" class="chart-canvas"></canvas></div>
</div>

<div class="card mb-6">
  <div class="card-header"><span class="card-title">Saldo Mensal</span></div>
  <div class="chart-wrap"><canvas id="chartCompSaldo" class="chart-canvas"></canvas></div>
</div>

${(() => {
  // Projeção: média dos meses com dados → projeta próximos 3 meses
  const activeMths = yrRec.map((r,i) => ({ r, d: yrDesp[i] })).filter(m => m.r > 0 || m.d > 0);
  if (activeMths.length === 0) return '';
  const avgRec  = activeMths.reduce((a,m) => a + m.r, 0) / activeMths.length;
  const avgDesp = activeMths.reduce((a,m) => a + m.d, 0) / activeMths.length;
  const avgSaldo = avgRec - avgDesp;
  const lastActiveMth = yrRec.reduce((last, r, i) => (r > 0 || yrDesp[i] > 0) ? i : last, -1);
  const proj = Array.from({length: 3}, (_, k) => {
    const mIdx = (lastActiveMth + 1 + k) % 12;
    const yr   = year + Math.floor((lastActiveMth + 1 + k) / 12);
    return { label: Utils.months[mIdx] + (yr !== year ? ' '+yr : ''), rec: avgRec, desp: avgDesp, saldo: avgSaldo };
  });
  const saldoColor = avgSaldo >= 0 ? 'var(--green)' : 'var(--red)';
  return `
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
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-3)">Receita est.</span>
          <span style="color:var(--green);font-weight:600">${Utils.currency(p.rec)}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-3)">Despesa est.</span>
          <span style="color:var(--red);font-weight:600">${Utils.currency(p.desp)}</span>
        </div>
        <div style="height:1px;background:var(--border);margin:4px 0"></div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-2);font-weight:600">Saldo est.</span>
          <span style="color:${saldoColor};font-weight:700">${p.saldo >= 0 ? '' : '-'}${Utils.currency(Math.abs(p.saldo))}</span>
        </div>
      </div>
    </div>`).join('')}
  </div>
  <div style="font-size:11px;color:var(--text-4);padding-top:4px">⚠️ Projeção baseada na média histórica dos meses com dados. Valores estimados.</div>
</div>`;
})()}

<div class="card">
  <div class="card-header"><span class="card-title">Tabela Mensal ${year}</span></div>
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th>Mês</th><th class="num">Receitas</th><th class="num">Despesas</th><th class="num">Saldo</th><th class="num">% Gasto</th></tr></thead>
      <tbody>
        ${yrRec.map((rec,i)=>{
          const desp = yrDesp[i]; const saldo = rec-desp; const pct = rec>0?desp/rec:0;
          return `<tr>
            <td>${Utils.monthsFull[i]}</td>
            <td class="num positive">${rec>0?Utils.currency(rec):'—'}</td>
            <td class="num negative">${desp>0?Utils.currency(desp):'—'}</td>
            <td class="num ${saldo>=0?'positive':'negative'}">${rec>0||desp>0?(saldo<0?'-':'')+Utils.currency(Math.abs(saldo)):'—'}</td>
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
</div>`;

    requestAnimationFrame(() => {
      Charts.Bar(document.getElementById('chartCompAnual'), {
        labels: Utils.months,
        datasets: [
          { label:'Receitas', values:yrRec,  color:'#22C55E' },
          { label:'Despesas', values:yrDesp, color:'#EF4444' },
        ],
      }, { height: 170 });
      Charts.Line(document.getElementById('chartCompSaldo'), {
        labels: Utils.months,
        datasets: [{ label:'Saldo', values:yrSaldo, color:'#7C6EF8' }],
      }, { height: 150 });
    });
  }


  // ══════════════════════════════════════════════════════════════
  // GLOBAL: Add Lançamento (from topbar button)
  // ══════════════════════════════════════════════════════════════
  function openNovaEntrada() {
    const cats = Object.entries(Store.CATEGORIES).filter(([k])=>k!=='receita');
    const dSugs = Store.descSuggestions();
    const dSugMap = Object.fromEntries(dSugs.map(s => [s.desc, s]));
    const rSugs = Store.receitaSuggestions();
    const rSugMap = Object.fromEntries(rSugs.map(s => [s.desc, s]));
    const today = new Date().toISOString().slice(0,10);
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
        const parcelado=document.getElementById('nParcelado').checked;
        const parcelas=parseInt(document.getElementById('nParcelas')?.value||'1');
        const temDesc=document.getElementById('nDesconto')?.checked;
        const valorOrig=temDesc?parseFloat(document.getElementById('nValorOriginal')?.value||'0'):0;
        const economia=temDesc&&valorOrig>amount?valorOrig-amount:0;
        const extraD=temDesc&&economia>0?{desconto:true,valorOriginal:valorOrig,economia}:{};
        if (!desc||!amount||!date) return toast('Preencha todos os campos','error');
        if (parcelado && parcelas > 1) {
          Store.addDespesaParcelada({ desc, amount: parseFloat((amount/parcelas).toFixed(2)), date, category:cat, sub, pay, parcelas });
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
  // EDIT MODALS — Despesa & Receita
  // ══════════════════════════════════════════════════════════════
  function openEditDespesa(id, onSaved) {
    const d = Store.get().despesas.find(d => d.id === id);
    if (!d) return;
    const cats = Object.entries(Store.CATEGORIES).filter(([k]) => k !== 'receita');
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
      if (!desc || !amount || !date) return toast('Preencha todos os campos', 'error');
      if (split) {
        const sum = split.reduce((s,r)=>s+r.valor,0);
        if (sum > amount + 0.01) return toast('Soma do rateio excede o valor', 'error');
      }
      const dt = new Date(date);
      Store.updateDespesa(id, {
        desc, amount, date, category: cat, sub, pay,
        month: dt.getMonth() + 1, year: dt.getFullYear(),
        desconto: temDesc && economia > 0, valorOriginal: valorOrig, economia,
        split: split || null,
      });
      Modal.close();
      toast('Despesa atualizada!', 'success');
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

  // ── INIT ───────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════
  // PAGE: CONFIGURAÇÕES
  // ══════════════════════════════════════════════════════════════
  function renderConfig(container) {
    const section = localStorage.getItem('ff_config_section') || 'categorias';

    container.innerHTML = `
<div style="display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:start">
  <aside class="card" style="padding:8px">
    ${[
      ['categorias', '🗂', 'Categorias'],
      ['pessoas',    '👥', 'Grupo Familiar'],
      ['cotacoes',   '💱', 'Cotações'],
      ['aparencia',  '🎨', 'Aparência'],
      ['backup',     '💾', 'Backup & Dados'],
      ['perfil',     '👤', 'Perfil'],
      ['senha',      '🔑', 'Trocar Senha'],
      ['sobre',      'ℹ️',  'Sobre'],
    ].map(([k, ic, l]) => `
      <button class="config-tab ${section===k?'active':''}" data-section="${k}"
        style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 12px;border:none;background:${section===k?'var(--bg-elevated)':'transparent'};color:${section===k?'var(--text-1)':'var(--text-2)'};border-radius:8px;cursor:pointer;font-size:13px;font-weight:${section===k?'600':'500'};margin-bottom:2px">
        <span style="font-size:16px">${ic}</span>
        <span>${l}</span>
      </button>
    `).join('')}
  </aside>
  <main id="configContent"></main>
</div>`;

    container.querySelectorAll('[data-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        localStorage.setItem('ff_config_section', btn.dataset.section);
        renderConfig(container);
      });
    });

    const content = document.getElementById('configContent');
    if      (section === 'categorias') renderConfigCategorias(content);
    else if (section === 'pessoas')    renderConfigPessoas(content);
    else if (section === 'cotacoes')   renderConfigCotacoes(content);
    else if (section === 'aparencia')  renderConfigAparencia(content);
    else if (section === 'backup')     renderConfigBackup(content);
    else if (section === 'perfil')     renderConfigPerfil(content);
    else if (section === 'senha')      renderConfigSenha(content);
    else                                renderConfigSobre(content);
  }

  function renderConfigCategorias(content) {
    const cats = Object.entries(Store.CATEGORIES);
    content.innerHTML = `
<div class="section-header mb-4">
  <div><div class="section-title">Categorias & Subcategorias</div>
  <div class="section-sub">Adicione, renomeie ou exclua categorias e suas subcategorias</div></div>
  <button class="btn-primary" id="btnAddCat">+ Nova Categoria</button>
</div>

<div style="display:flex;flex-direction:column;gap:8px">
  ${cats.map(([key, info]) => {
    const usage = Store.getCategoriaUsage(key);
    const subs = Store.SUBCATEGORIES[key] || [];
    const isProtected = key === 'receita';
    return `
    <details class="card" style="padding:0">
      <summary style="display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;list-style:none">
        <span style="font-size:22px">${info.icon||'📁'}</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:var(--text-1)">${info.label}</div>
          <div style="font-size:11px;color:var(--text-4)">key: <code>${key}</code> · ${usage} lançamento(s) · ${subs.length} subcat.</div>
        </div>
        <span class="badge" style="background:${info.color}20;color:${info.color}">${info.color}</span>
        <button class="btn-xs" data-action="edit-cat" data-key="${key}" title="Editar">✏</button>
        ${isProtected ? '<span class="badge badge-amber" title="Reservada">🔒</span>'
          : `<button class="btn-xs btn-red" data-action="del-cat" data-key="${key}" ${usage>0?'disabled style="opacity:.4;cursor:not-allowed"':''} title="${usage>0?'Existem lançamentos':'Excluir'}">✕</button>`}
      </summary>
      <div style="padding:0 16px 14px 60px">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Subcategorias</div>
        ${subs.length === 0 ? '<div style="font-size:12px;color:var(--text-4);font-style:italic;padding:4px 0">Nenhuma subcategoria</div>'
          : subs.map(s => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px dashed var(--border)">
              <span style="flex:1;font-size:13px;color:var(--text-2)">${s}</span>
              <button class="btn-xs" data-action="ren-sub" data-cat="${key}" data-sub="${s.replace(/"/g,'&quot;')}" title="Renomear">✏</button>
              <button class="btn-xs btn-red" data-action="del-sub" data-cat="${key}" data-sub="${s.replace(/"/g,'&quot;')}" title="Excluir">✕</button>
            </div>`).join('')}
        <button class="btn-xs" style="margin-top:10px" data-action="add-sub" data-cat="${key}">+ Subcategoria</button>
      </div>
    </details>`;
  }).join('')}
</div>`;

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
  }

  function openCategoriaModal(key) {
    const isEdit = !!key;
    const c = isEdit ? Store.CATEGORIES[key] : { label:'', icon:'📁', color:'#7C6EF8' };
    const html = `<div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Nome</label><input class="form-input" id="fCatLabel" value="${c.label}" placeholder="Ex: Educação"/></div>
      <div class="form-group"><label class="form-label">Ícone (emoji)</label><input class="form-input" id="fCatIcon" value="${c.icon}" maxlength="4"/></div>
      <div class="form-group"><label class="form-label">Cor</label><input class="form-input" id="fCatColor" type="color" value="${c.color}"/></div>
    </div>`;
    Modal.open(isEdit?'Editar Categoria':'Nova Categoria', html, () => {
      const label = document.getElementById('fCatLabel').value.trim();
      const icon = document.getElementById('fCatIcon').value.trim();
      const color = document.getElementById('fCatColor').value;
      if (!label) return toast('Nome obrigatório', 'error');
      try {
        if (isEdit) Store.updateCategoria(key, { label, icon, color });
        else Store.addCategoria({ label, icon, color });
        Modal.close();
        renderConfigCategorias(document.getElementById('configContent'));
        toast(isEdit?'Categoria atualizada':'Categoria criada', 'success');
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  function renderConfigPessoas(content) {
    const pessoas = Store.PESSOAS;
    content.innerHTML = `
<div class="section-header mb-4">
  <div><div class="section-title">Grupo Familiar</div>
  <div class="section-sub">Pessoas usadas em Receitas (responsável) e Contratos</div></div>
  <button class="btn-primary" id="btnAddPessoa">+ Nova Pessoa</button>
</div>
<div style="display:flex;flex-direction:column;gap:8px">
  ${pessoas.map(p => {
    const usage = Store.get().receitas.filter(r => r.person === p).length;
    return `
    <div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 16px">
      <div class="person-avatar" style="background:${Utils.personColor(p)};width:36px;height:36px;font-size:14px">${Utils.personInitial(p)}</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700;color:var(--text-1)">${p}</div>
        <div style="font-size:11px;color:var(--text-4)">${usage} receita(s) vinculada(s)</div>
      </div>
      <button class="btn-xs" data-action="ren-pessoa" data-name="${p}">✏</button>
      <button class="btn-xs btn-red" data-action="del-pessoa" data-name="${p}" ${usage>0?'disabled style="opacity:.4;cursor:not-allowed"':''}>✕</button>
    </div>`;
  }).join('')}
</div>`;
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
    a.download = `finfamily-backup-${new Date().toISOString().slice(0,10)}.json`;
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
  <div style="margin-top:20px;display:flex;gap:10px">
    <button class="btn-primary" id="btnSavePerfil">Salvar</button>
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

  function renderConfigSobre(content) {
    content.innerHTML = `
<div class="section-header mb-4"><div><div class="section-title">Sobre</div></div></div>
<div class="card">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
    <div style="width:48px;height:48px;border-radius:12px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:20px">📊</div>
    <div>
      <div style="font-size:18px;font-weight:800">FinFamily</div>
      <div style="font-size:12px;color:var(--text-3)">v1.0.0 · Gestão financeira familiar</div>
    </div>
  </div>
  <div style="font-size:13px;color:var(--text-2);line-height:1.6">
    App roda 100% no navegador. Dados em <code>localStorage</code> — sem backend.<br/>
    <a href="https://github.com/minewall/finfamily" target="_blank" style="color:var(--accent)">github.com/minewall/finfamily</a>
  </div>
</div>`;
  }

  function init() {
    Store.init();
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
    Router.register('dashboard',  renderDashboard);
    Router.register('lancamentos',renderLancamentos);
    Router.register('receitas',   renderReceitas);
    Router.register('despesas',   renderDespesas);
    Router.register('metas',      renderMetas);
    Router.register('contratos',  renderContratos);
    Router.register('contas',     renderContas);
    Router.register('reserva',    renderReserva);
    Router.register('patrimonio', renderPatrimonio);
    Router.register('comparativo',renderComparativo);
    Router.register('config',     renderConfig);

    // Month / Year selectors
    document.getElementById('globalMonth').addEventListener('change', () => Router.navigate(Router.current));
    document.getElementById('globalYear')?.addEventListener('change', () => Router.navigate(Router.current));

    // New entry button
    document.getElementById('btnNovaEntrada').addEventListener('click', openNovaEntrada);

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

    // Init routing
    Router.init();
  }

  return { init };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());

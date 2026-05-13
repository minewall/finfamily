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
      contas:      'Contas & Cartões',
      reserva:     'Reserva & Investimentos',
      patrimonio:  'Patrimônio & Investimentos',
      comparativo: 'Comparativo Mensal',
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
  function getYear()  { return Store.get().settings.ano; }

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
    const limitePct = data.settings.limiteGasto;
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
    if (receita < data.settings.metaReceita) alerts.push({ type:'info', title:'Meta de receita não atingida', text:`Receita atual: ${Utils.currency(receita)} / Meta: ${Utils.currency(data.settings.metaReceita)}` });
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
        <div class="text-xs text-3 mt-4">Meta receita mín: <strong>${Utils.currency(data.settings.metaReceita)}</strong></div>
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
      <span class="card-title">Últimos Lançamentos</span>
    </div>
    ${renderRecentTransactions(month, year)}
  </div>
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
      }, { height: 200 });

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
      })), { barH: 32, padL: 140, padR: 90, gap: 10 });

      // Saldo acumulado line
      let acc = 0;
      const saldoAcc = yrReceitas.map((r, i) => { acc += r - yrDespesas[i]; return acc; });
      Charts.Line(document.getElementById('chartSaldo'), {
        labels: Utils.months,
        datasets: [{ label: 'Saldo', values: saldoAcc, color: '#7C6EF8' }],
      }, { height: 180 });
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
    const despesas = [...Store.despesasByMonth(month, year)].sort((a,b) => a.date.localeCompare(b.date));
    const receitas = [...Store.receitasByMonth(month, year)].sort((a,b) => a.date.localeCompare(b.date));

    container.innerHTML = `
<div class="section-header mb-4">
  <div><div class="section-title">Lançamentos — ${Utils.monthsFull[month-1]} ${year}</div>
  <div class="section-sub">${despesas.length + receitas.length} registros · ${despesas.length} despesas · ${receitas.length} receitas</div></div>
  <div class="flex gap-2">
    <button class="btn-secondary" id="btnTabDesp">Despesas</button>
    <button class="btn-secondary" id="btnTabRec">Receitas</button>
  </div>
</div>
<div class="filter-bar">
  <div class="search-box">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/></svg>
    <input type="text" id="searchInput" placeholder="Buscar por descrição…" />
  </div>
  <select class="form-select" id="filterCat" style="width:180px">
    <option value="">Todas as categorias</option>
    ${Object.entries(Store.CATEGORIES).filter(([k]) => k !== 'receita').map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
  </select>
  <select class="form-select" id="filterPay" style="width:140px">
    <option value="">Todos os pagamentos</option>
    ${Store.PAYMENT_METHODS.map(m => `<option value="${m}">${m}</option>`).join('')}
  </select>
</div>
<div class="table-wrap" id="lancTable">
  ${buildLancTable(despesas)}
</div>`;

    function buildLancTable(rows, filter = {}) {
      let filtered = rows;
      if (filter.search) filtered = filtered.filter(d => d.desc.toLowerCase().includes(filter.search.toLowerCase()));
      if (filter.cat)    filtered = filtered.filter(d => d.category === filter.cat);
      if (filter.pay)    filtered = filtered.filter(d => d.pay === filter.pay);
      const total = filtered.reduce((a,d) => a+d.amount, 0);
      return `<table class="data-table">
<thead><tr>
  <th>Data</th><th>Descrição</th><th>Categoria</th><th>Sub-categoria</th><th>Pagamento</th><th class="num">Valor</th><th></th>
</tr></thead>
<tbody>
${filtered.map(d => `<tr>
  <td class="muted" style="white-space:nowrap">${Utils.fmtDate(d.date)}</td>
  <td>${d.desc}</td>
  <td><span class="badge" style="background:${Store.CATEGORIES[d.category]?.color+'20'};color:${Store.CATEGORIES[d.category]?.color}">${Store.CATEGORIES[d.category]?.label || d.category}</span></td>
  <td class="muted">${d.sub||''}</td>
  <td><span class="badge ${d.pay==='Cartão'?'badge-accent':d.pay==='Dinheiro'?'badge-amber':'badge-blue'}">${d.pay||''}</span></td>
  <td class="num negative">${Utils.currency(d.amount)}</td>
  <td style="white-space:nowrap">
    <button class="btn-ghost" style="font-size:11px;color:var(--text-3)" data-edit-desp="${d.id}">✏</button>
    <button class="btn-ghost" style="font-size:11px;color:var(--red)" data-del-desp="${d.id}">✕</button>
  </td>
</tr>`).join('')}
</tbody>
<tfoot><tr><td colspan="5" class="fw-700">Total</td><td class="num negative fw-700">${Utils.currency(total)}</td><td></td></tr></tfoot>
</table>`;
    }

    function buildRecTable(rows, filter = {}) {
      let filtered = rows;
      if (filter.search) filtered = filtered.filter(r => r.desc.toLowerCase().includes(filter.search.toLowerCase()));
      if (filter.cat)    filtered = filtered.filter(r => r.person === filter.cat);
      const total = filtered.reduce((a,r) => a+r.amount, 0);
      return `<table class="data-table">
<thead><tr>
  <th>Data</th><th>Descrição</th><th>Pessoa</th><th>Tipo</th><th class="num">Valor</th><th></th>
</tr></thead>
<tbody>
${filtered.map(r => `<tr>
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
<tfoot><tr><td colspan="4" class="fw-700">Total</td><td class="num positive fw-700">${Utils.currency(total)}</td><td></td></tr></tfoot>
</table>`;
    }

    let activeTab = 'desp';
    function refilter() {
      const s = document.getElementById('searchInput')?.value || '';
      const c = document.getElementById('filterCat')?.value  || '';
      const p = document.getElementById('filterPay')?.value  || '';
      document.getElementById('lancTable').innerHTML = activeTab === 'desp'
        ? buildLancTable(despesas, { search: s, cat: c, pay: p })
        : buildRecTable(receitas, { search: s });
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
    }

    container.getElementById = id => container.querySelector('#' + id);
    document.getElementById('btnTabDesp').addEventListener('click', () => {
      activeTab = 'desp';
      refilter();
    });
    document.getElementById('btnTabRec').addEventListener('click', () => {
      activeTab = 'rec';
      document.getElementById('filterCat').innerHTML = `<option value="">Todas as pessoas</option>${Store.PESSOAS.map(p=>`<option value="${p}">${p}</option>`).join('')}`;
      refilter();
    });
    document.getElementById('searchInput').addEventListener('input', refilter);
    document.getElementById('filterCat').addEventListener('change', refilter);
    document.getElementById('filterPay').addEventListener('change', refilter);
    attachDeleteHandlers();
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE: RECEITAS
  // ══════════════════════════════════════════════════════════════
  function renderReceitas(container) {
    const year = getYear();
    const yrRec = Store.yearlyMonthly(year, 'receita');
    const totalAno = yrRec.reduce((a,b) => a+b, 0);
    const media = totalAno / 12;

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
    <div class="card-sub">Meta mínima: <strong>${Utils.currency(Store.get().settings.metaReceita)}</strong></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-header"><span class="kpi-label">Meses OK</span><span class="kpi-icon">✅</span></div>
    <div class="kpi-value accent">${yrRec.filter(v => v >= Store.get().settings.metaReceita).length}/12</div>
    <div class="card-sub">Atingiram a meta mínima</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--blue);--kpi-bg:var(--blue-dim)">
    <div class="kpi-header"><span class="kpi-label">Melhor Mês</span><span class="kpi-icon">🏆</span></div>
    <div class="kpi-value" style="color:var(--blue)">${Utils.currency(Math.max(...yrRec))}</div>
    <div class="card-sub">${Utils.months[yrRec.indexOf(Math.max(...yrRec))]}</div>
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
          ${vals.map(v => `<td class="num ${v>0?'positive':'muted'}">${v>0?Charts.fmt(v,true):'—'}</td>`).join('')}
          <td class="num positive fw-700">${Utils.currency(vals.reduce((a,b)=>a+b,0))}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr>
        <td class="fw-700">Total</td>
        ${yrRec.map(v => `<td class="num positive fw-700">${Charts.fmt(v,true)}</td>`).join('')}
        <td class="num positive fw-700">${Utils.currency(totalAno)}</td>
      </tr></tfoot>
    </table>
  </div>
</div>

<div class="card">
  <div class="card-header">
    <span class="card-title">Todos os Registros de Receita</span>
    <button class="btn-primary" id="btnAddRec">+ Nova Receita</button>
  </div>
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th>Data</th><th>Descrição</th><th>Pessoa</th><th>Tipo</th><th class="num">Valor</th><th></th></tr></thead>
      <tbody>
        ${Store.get().receitas.filter(r=>r.year===year).sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr>
          <td class="muted">${r.date.slice(5)}</td>
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
    const despesas = Store.despesasByMonth(month, year);
    const catMap = Store.despesasByCategory(month, year);
    const total = Object.values(catMap).reduce((a,b) => a+b, 0);

    const catSorted = Object.entries(catMap).sort((a,b) => b[1]-a[1]);

    const yrDesp = Store.yearlyMonthly(year, 'despesa');

    container.innerHTML = `
<div class="section-header mb-4">
  <div><div class="section-title">Despesas — ${Utils.monthsFull[month-1]} ${year}</div>
  <div class="section-sub">${despesas.length} lançamentos · total: <strong>${Utils.currency(total)}</strong></div></div>
  <button class="btn-primary" id="btnAddDesp">+ Nova Despesa</button>
</div>

<div class="chart-grid mb-6">
  <div class="card">
    <div class="card-header"><span class="card-title">Por Categoria</span></div>
    <div class="chart-wrap"><canvas id="chartDespCat" class="chart-canvas"></canvas></div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title">Distribuição</span></div>
    <div class="chart-with-legend">
      <canvas id="chartDespDonut"></canvas>
      <div class="donut-legend" id="despDonutLegend"></div>
    </div>
  </div>
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
      Charts.HBar(document.getElementById('chartDespCat'), catSorted.slice(0,6).map(([cat,val])=>({
        label: Store.CATEGORIES[cat]?.label||cat, value: val, color: Store.CATEGORIES[cat]?.color,
      })), { barH: 28, padL: 150, padR: 90, gap: 10 });

      const donutData = catSorted.slice(0,6).map(([cat,val]) => ({
        label: Store.CATEGORIES[cat]?.label||cat, value: val,
        color: Store.CATEGORIES[cat]?.color || '#7C6EF8',
      }));
      Charts.Donut(document.getElementById('chartDespDonut'), donutData, {
        size: 190, centerLabel: Utils.currency(total).split('.')[0], centerSub: 'total',
      });
      const legend = document.getElementById('despDonutLegend');
      const totalD = donutData.reduce((a,d)=>a+d.value,0)||1;
      legend.innerHTML = donutData.map(d=>`
        <div class="donut-legend-item">
          <div class="donut-legend-dot" style="background:${d.color}"></div>
          <span class="donut-legend-label">${d.label}</span>
          <span class="donut-legend-pct">${((d.value/totalD)*100).toFixed(0)}%</span>
          <span class="donut-legend-val">${Charts.fmt(d.value,true)}</span>
        </div>`).join('');

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
    </div>`;
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
      if (!desc || !amount || !date) return toast('Preencha todos os campos', 'error');
      const extraFields = temDesconto && economia > 0 ? { desconto: true, valorOriginal, economia } : {};
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
    const metas = Store.get().metas;
    const month = getMonth();
    const receita = Store.sumReceitas(month, year);
    const despesa = Store.sumDespesas(month, year);

    container.innerHTML = `
<div class="section-header mb-6">
  <div><div class="section-title">Metas & Projetos Futuros</div><div class="section-sub">Indicadores financeiros e planejamento de longo prazo</div></div>
  <button class="btn-primary" id="btnAddMeta">+ Nova Meta</button>
</div>

<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-header"><span class="kpi-label">Regra 70%</span><span class="kpi-icon">📏</span></div>
    <div class="kpi-value ${despesa/receita<=0.7?'green':'red'}">${Utils.pct(despesa/receita||0)}</div>
    <div class="card-sub">Máximo: <strong>70%</strong> da receita em despesas</div>
    <div class="progress-bar"><div class="progress-fill ${despesa/receita>0.9?'red':despesa/receita>0.7?'amber':'green'}" style="width:${Math.min(despesa/receita||0,1)*100}%"></div></div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--blue);--kpi-bg:var(--blue-dim)">
    <div class="kpi-header"><span class="kpi-label">Indicador de Riqueza</span><span class="kpi-icon">💡</span></div>
    <div class="kpi-value" style="color:var(--blue)">${Utils.currency(Math.max(0, receita - despesa))}</div>
    <div class="card-sub">Saldo livre para investir</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--amber);--kpi-bg:var(--amber-dim)">
    <div class="kpi-header"><span class="kpi-label">Meta Receita</span><span class="kpi-icon">🎯</span></div>
    <div class="kpi-value ${receita>=20000?'green':'amber'}">${Utils.currency(Store.get().settings.metaReceita)}</div>
    <div class="card-sub">Atual: <strong class="${receita>=20000?'green':'red'}">${Utils.currency(receita)}</strong></div>
  </div>
</div>

<div class="section-header mb-4">
  <div class="section-title">Objetivos & Metas</div>
</div>

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px">
  ${metas.filter(m => {
    const t = m.tipo || m.type;
    return t === 'objetivo' || t === 'projeto';
  }).map(m => {
    const cur = m.current || 0;
    const pct = Math.min(cur / m.target, 1);
    const remaining = m.target - cur;
    const color = pct >= 1 ? 'green' : pct > 0.5 ? 'accent' : 'amber';
    return `
    <div class="card" data-meta-id="${m.id}">
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:11px;color:var(--text-4)">🎯 Objetivo Único</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${pct>=1?'<span class="badge badge-green">Concluída!</span>':''}
          ${pct<1?`<button class="btn-xs btn-green" data-action="atingida" data-id="${m.id}" title="Marcar como atingida">✓</button>`:''}
          <button class="btn-xs" data-action="edit-meta" data-id="${m.id}" title="Editar">✏</button>
          <button class="btn-xs btn-red" data-action="del-meta" data-id="${m.id}" title="Excluir">✕</button>
        </div>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--text-1);margin-bottom:8px">${m.label}</div>
      <div style="margin:4px 0 4px">
        <span style="font-size:22px;font-weight:800;font-family:var(--mono);color:var(--text-1)">${Utils.currency(cur)}</span>
        <span style="font-size:13px;color:var(--text-3)"> / ${Utils.currency(m.target)}</span>
      </div>
      <div class="progress-bar progress-lg" style="margin-bottom:10px">
        <div class="progress-fill ${color}" style="width:${Math.round(pct*100)}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-3)">
        <span>${(pct*100).toFixed(0)}% concluído</span>
        <span>${pct<1?'Faltam '+Utils.currency(remaining):'Meta atingida!'}</span>
      </div>
      ${m.deadline?`<div style="font-size:11px;color:var(--text-4);margin-top:8px">⏳ Prazo: ${new Date(m.deadline).toLocaleDateString('pt-BR')}</div>`:''}
    </div>`;
  }).join('')}

  ${metas.filter(m => m.tipo === 'mensal').map(m => {
    const pct = receita > 0 ? despesa / receita : 0;
    const ok  = despesa <= m.target;
    const color = ok ? 'green' : 'red';
    return `
    <div class="card" data-meta-id="${m.id}">
      <div class="card-header">
        <span style="font-size:11px;color:var(--text-4)">📅 Meta Mensal</span>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn-xs" data-action="edit-meta" data-id="${m.id}">✏</button>
          <button class="btn-xs btn-red" data-action="del-meta" data-id="${m.id}">✕</button>
        </div>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--text-1);margin-bottom:8px">${m.label}</div>
      <div style="margin:4px 0">
        <span style="font-size:22px;font-weight:800;font-family:var(--mono);color:var(--${color})">${Utils.currency(despesa)}</span>
        <span style="font-size:13px;color:var(--text-3)"> / ${Utils.currency(m.target)}</span>
      </div>
      <div class="progress-bar progress-lg" style="margin-bottom:8px">
        <div class="progress-fill ${color}" style="width:${Math.min(despesa/m.target,1)*100}%"></div>
      </div>
      <span class="badge ${ok?'badge-green':'badge-red'}">${ok?'✓ Dentro do limite':'Limite ultrapassado'}</span>
    </div>`;
  }).join('')}

  ${metas.filter(m => m.tipo === 'anual').map(m => {
    const yrRec  = Store.yearlyMonthly(year, 'receita');
    const yrDesp = Store.yearlyMonthly(year, 'despesa');
    const totalAnual = yrDesp.reduce((a,b)=>a+b,0); // example: track total despesas vs annual target
    const cur = m.current || totalAnual;
    const pct = Math.min(cur / m.target, 1);
    const ok  = cur <= m.target;
    const color = ok ? 'accent' : 'red';
    return `
    <div class="card" data-meta-id="${m.id}">
      <div class="card-header">
        <span style="font-size:11px;color:var(--text-4)">📆 Meta Anual</span>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn-xs" data-action="edit-meta" data-id="${m.id}">✏</button>
          <button class="btn-xs btn-red" data-action="del-meta" data-id="${m.id}">✕</button>
        </div>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--text-1);margin-bottom:8px">${m.label}</div>
      <div style="margin:4px 0">
        <span style="font-size:22px;font-weight:800;font-family:var(--mono);color:var(--${color})">${Utils.currency(cur)}</span>
        <span style="font-size:13px;color:var(--text-3)"> / ${Utils.currency(m.target)}</span>
      </div>
      <div class="progress-bar progress-lg" style="margin-bottom:8px">
        <div class="progress-fill ${color}" style="width:${Math.round(pct*100)}%"></div>
      </div>
      <span class="badge ${ok?'badge-green':'badge-red'}">${(pct*100).toFixed(0)}% da meta anual</span>
    </div>`;
  }).join('')}
</div>

<div class="card">
  <div class="card-header"><span class="card-title">Indicadores Financeiros</span></div>
  ${metas.filter(m => !['objetivo','projeto','mensal','anual'].includes(m.tipo||m.type)).map(m => `
    <div class="stat-row">
      <div>
        <div class="stat-row-label">${m.label}</div>
        ${m.type==='gasto_max_pct'?`<div style="font-size:11px;color:var(--text-4)">Limite: ${Utils.pct(m.target)} da receita mensal</div>`:''}
        ${m.type==='reserva'?`<div style="font-size:11px;color:var(--text-4)">Atual: ${Utils.currency(m.current||0)}</div>`:''}
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${m.type==='receita_min'?`<span class="badge ${receita>=m.target?'badge-green':'badge-red'}">${receita>=m.target?'✓ Atingida':'Não atingida'}</span>`:''}
        ${m.type==='gasto_max_pct'?`<span class="badge ${despesa/receita<=m.target?'badge-green':'badge-red'}">${despesa/receita<=m.target?'✓ Ok':'Ultrapassado'}</span>`:''}
        ${m.type==='reserva'?`<span class="badge badge-amber">${Utils.pct((m.current||0)/m.target)}</span>`:''}
        <button class="btn-xs" data-action="edit-meta" data-id="${m.id}" title="Editar">✏</button>
        <button class="btn-xs btn-red" data-action="del-meta" data-id="${m.id}" title="Excluir">✕</button>
      </div>
    </div>
  `).join('')}
</div>`;

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
  }

  function openMetaModal(meta, container) {
    const isEdit = !!meta;
    const tipo   = meta?.tipo || meta?.type || 'objetivo';
    const html = `<div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Nome da Meta</label><input class="form-input" id="fMLabel" placeholder="Ex: Viagem Europa" value="${isEdit ? meta.label : ''}"/></div>
      <div class="form-group form-full">
        <label class="form-label">Tipo de Meta</label>
        <select class="form-select" id="fMTipo">
          <option value="objetivo" ${(isEdit&&(tipo==='objetivo'||tipo==='projeto'))||!isEdit?'selected':''}>🎯 Objetivo Único (com prazo)</option>
          <option value="mensal" ${isEdit&&tipo==='mensal'?'selected':''}>📅 Meta Mensal (limite por mês)</option>
          <option value="anual" ${isEdit&&tipo==='anual'?'selected':''}>📆 Meta Anual (acumulado no ano)</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label" id="fMTargetLabel">Valor Alvo (R$)</label><input class="form-input" id="fMTarget" type="number" step="100" value="${isEdit ? meta.target : ''}"/></div>
      <div class="form-group"><label class="form-label">Valor Atual / Realizado (R$)</label><input class="form-input" id="fMCurrent" type="number" step="100" value="${isEdit ? (meta.current||0) : '0'}"/></div>
      <div class="form-group" id="fMDeadlineGroup"><label class="form-label">Prazo</label><input class="form-input" id="fMDeadline" type="date" value="${isEdit && meta.deadline ? meta.deadline : ''}"/></div>
    </div>`;
    Modal.open(isEdit ? 'Editar Meta' : 'Nova Meta / Projeto', html, () => {
      const label    = document.getElementById('fMLabel').value.trim();
      const target   = parseFloat(document.getElementById('fMTarget').value);
      const current  = parseFloat(document.getElementById('fMCurrent').value) || 0;
      const deadline = document.getElementById('fMDeadline').value;
      const tipoSel  = document.getElementById('fMTipo').value;
      if (!label || !target) return toast('Preencha nome e valor', 'error');
      const data = { label, target, current, deadline, tipo: tipoSel, type: tipoSel === 'objetivo' ? 'projeto' : tipoSel, active: true };
      if (isEdit) {
        Store.updateMeta(meta.id, data);
        toast('Meta atualizada!', 'success');
      } else {
        Store.get().metas.push({ id: '_' + Date.now(), ...data });
        Store.persist();
        toast('Meta adicionada!', 'success');
      }
      Modal.close();
      renderMetas(container);
    });
    setTimeout(() => {
      function updateTipoUI() {
        const t = document.getElementById('fMTipo')?.value;
        const deadlineG = document.getElementById('fMDeadlineGroup');
        const targetLbl = document.getElementById('fMTargetLabel');
        if (deadlineG) deadlineG.style.display = t === 'objetivo' ? '' : 'none';
        if (targetLbl) {
          if (t === 'mensal')  targetLbl.textContent = 'Limite Mensal (R$)';
          else if (t === 'anual') targetLbl.textContent = 'Meta Anual (R$)';
          else targetLbl.textContent = 'Valor Alvo (R$)';
        }
      }
      document.getElementById('fMTipo')?.addEventListener('change', updateTipoUI);
      updateTipoUI();
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
  // PAGE: PATRIMÔNIO
  // ══════════════════════════════════════════════════════════════
  function renderPatrimonio(container) {
    const ativos   = Store.get().ativos;
    const reservas = Store.get().reserva || [];
    const { usdBrl = 5.85, eurBrl = 6.40 } = Store.get().settings;
    const total = Store.totalAtivos();

    function toBRL(a) {
      const val = a.qty * a.unitPrice;
      if (a.currency === 'USD') return val * usdBrl;
      if (a.currency === 'EUR') return val * eurBrl;
      return val;
    }

    // Build combined list: ativos + reservas (as virtual ativos)
    const reservaAsAtivo = reservas.map(r => ({
      _isReserva : true,
      id         : r.id,
      platform   : r.nome,
      type       : 'Reserva',
      currency   : 'BRL',
      qty        : 1,
      unitPrice  : r.valorAtual || r.valorInvestido || 0,
      updated    : '',
      _brl       : r.valorAtual || r.valorInvestido || 0,
    }));

    const byType = {};
    ativos.forEach(a => {
      byType[a.type] = (byType[a.type] || 0) + toBRL(a);
    });
    if (reservaAsAtivo.length) {
      byType['Reserva'] = reservaAsAtivo.reduce((s, r) => s + r._brl, 0);
    }

    const allItems = [...ativos, ...reservaAsAtivo];
    const sorted = allItems.sort((a, b) => {
      const bA = a._isReserva ? a._brl : toBRL(a);
      const bB = b._isReserva ? b._brl : toBRL(b);
      return bB - bA;
    });

    container.innerHTML = `
<div class="section-header mb-6">
  <div><div class="section-title">Patrimônio & Investimentos</div>
  <div class="section-sub">Cotações: 1 USD = R$ ${usdBrl} · 1 EUR = R$ ${eurBrl}</div></div>
  <button class="btn-secondary" id="btnEditRates">✏️ Atualizar Cotações</button>
</div>

<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-header"><span class="kpi-label">Patrimônio Total</span><span class="kpi-icon">💎</span></div>
    <div class="kpi-value accent">${Utils.currency(total)}</div>
    <div class="card-sub">Convertido para BRL</div>
  </div>
  ${Object.entries(byType).map(([type, val]) => `
  <div class="kpi-card">
    <div class="kpi-header"><span class="kpi-label">${type}</span></div>
    <div class="kpi-value" style="font-size:18px">${Utils.currency(val)}</div>
    <div class="card-sub">${((val/total)*100).toFixed(1)}% do total</div>
  </div>`).join('')}
</div>

<div class="chart-grid mb-6" style="grid-template-columns:1fr 1.6fr">
  <div class="card">
    <div class="card-header"><span class="card-title">Distribuição por Tipo</span></div>
    <div class="chart-with-legend" style="flex-direction:column;grid-template-columns:1fr;justify-items:center">
      <canvas id="chartPatDonut"></canvas>
      <div class="donut-legend" id="patLegend" style="width:100%;margin-top:8px"></div>
    </div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title">Top Ativos</span></div>
    <div class="chart-wrap"><canvas id="chartPatBar" class="chart-canvas"></canvas></div>
  </div>
</div>

<div class="card">
  <div class="card-header"><span class="card-title">Todos os Ativos</span></div>
  <div>
    ${sorted.map(a => {
      const brl = a._isReserva ? a._brl : toBRL(a);
      const pct = ((brl/total)*100).toFixed(1);
      const typeColors = { 'Crypto':'#F59E0B', 'Token':'#7C6EF8', 'FIAT BR':'#22C55E', 'FIAT EUR':'#3B82F6', 'Reserva':'#14B8A6' };
      const col = typeColors[a.type] || '#7C6EF8';
      const editAction = a._isReserva ? 'edit-reserva' : 'edit-ativo';
      const delAction  = a._isReserva ? 'del-reserva'  : 'del-ativo';
      const subLine    = a._isReserva ? 'Reserva / Investimento' : `${a.type} · Atualiz: ${a.updated}`;
      const qtyLine    = a._isReserva ? `Valor atual: ${Utils.currency(a._brl)}` : `${a.qty.toLocaleString('pt-BR')} @ ${a.unitPrice} ${a.currency}`;
      const valLine2   = a._isReserva ? '' : `<div style="font-size:11px;color:var(--text-3);text-align:right">${a.qty * a.unitPrice} ${a.currency}</div>`;
      return `
      <div class="asset-row">
        <div class="asset-logo" style="border-color:${col}20;color:${col}">${a.platform.slice(0,3).toUpperCase()}</div>
        <div>
          <div class="asset-name">${a.platform}</div>
          <div class="asset-type">${subLine}</div>
        </div>
        <div>
          <div class="asset-qty">${qtyLine}</div>
          <div class="asset-qty">${pct}% do portfólio</div>
        </div>
        <div>
          <div class="asset-value">${Utils.currency(brl)}</div>
          ${valLine2}
        </div>
        <div style="display:flex;gap:6px;align-items:center;margin-left:8px">
          <button class="btn-xs" data-action="${editAction}" data-id="${a.id}" title="Editar">✏</button>
          <button class="btn-xs btn-red" data-action="${delAction}" data-id="${a.id}" title="Excluir">×</button>
        </div>
      </div>`;
    }).join('')}
  </div>
</div>`;

    requestAnimationFrame(() => {
      const typeColors2 = { 'Crypto':'#F59E0B', 'Token':'#7C6EF8', 'FIAT BR':'#22C55E', 'FIAT EUR':'#3B82F6', 'Reserva':'#14B8A6' };
      const donutData = Object.entries(byType).map(([type,val]) => ({
        label: type, value: val, color: typeColors2[type] || '#7C6EF8',
      }));
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

      Charts.HBar(document.getElementById('chartPatBar'), sorted.slice(0,8).map(a=>({
        label: a.platform.length > 20 ? a.platform.slice(0,20)+'…' : a.platform,
        value: a._isReserva ? a._brl : toBRL(a),
        color: typeColors2[a.type] || '#7C6EF8',
      })), { barH: 28, padL: 150, padR: 90, gap: 8 });
    });

    document.getElementById('btnEditRates')?.addEventListener('click', () => {
      const html = `<div class="form-grid">
        <div class="form-group"><label class="form-label">USD → BRL</label><input class="form-input" id="fUSD" type="number" step="0.01" value="${usdBrl}"/></div>
        <div class="form-group"><label class="form-label">EUR → BRL</label><input class="form-input" id="fEUR" type="number" step="0.01" value="${eurBrl}"/></div>
      </div>`;
      Modal.open('Atualizar Cotações', html, () => {
        Store.updateSettings({ usdBrl: parseFloat(document.getElementById('fUSD').value), eurBrl: parseFloat(document.getElementById('fEUR').value) });
        Modal.close();
        renderPatrimonio(container);
        toast('Cotações atualizadas!', 'success');
      });
    });

    // ── Edit / Delete ativos ──────────────────────────────────────
    container.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id  = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === 'del-ativo') {
        if (!confirm('Excluir este ativo do portfólio?')) return;
        Store.deleteAtivo(id);
        renderPatrimonio(container);
        toast('Ativo excluído!', 'success');
      }

      if (action === 'edit-ativo') {
        const ativo = Store.get().ativos.find(a => a.id === id);
        if (!ativo) return;
        const TYPES = ['Crypto','Token','FIAT BR','FIAT EUR'];
        const CURRENCIES = ['BRL','USD','EUR'];
        const html = `
<div class="form-grid">
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">Nome / Plataforma</label>
    <input class="form-input" id="fAP" value="${ativo.platform}"/>
  </div>
  <div class="form-group">
    <label class="form-label">Tipo</label>
    <select class="form-select" id="fAT">
      ${TYPES.map(t=>`<option${t===ativo.type?' selected':''}>${t}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Moeda</label>
    <select class="form-select" id="fACur">
      ${CURRENCIES.map(c=>`<option${c===ativo.currency?' selected':''}>${c}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Quantidade</label>
    <input class="form-input" id="fAQ" type="number" step="any" value="${ativo.qty}"/>
  </div>
  <div class="form-group">
    <label class="form-label">Preço unitário</label>
    <input class="form-input" id="fAU" type="number" step="any" value="${ativo.unitPrice}"/>
  </div>
  <div class="form-group">
    <label class="form-label">Data atualização</label>
    <input class="form-input" id="fAD" type="date" value="${ativo.updated}"/>
  </div>
</div>`;
        Modal.open('Editar Ativo', html, () => {
          Store.updateAtivo(id, {
            platform : document.getElementById('fAP').value.trim(),
            type     : document.getElementById('fAT').value,
            currency : document.getElementById('fACur').value,
            qty      : parseFloat(document.getElementById('fAQ').value) || 0,
            unitPrice: parseFloat(document.getElementById('fAU').value) || 0,
            updated  : document.getElementById('fAD').value || ativo.updated,
          });
          Modal.close();
          renderPatrimonio(container);
          toast('Ativo atualizado!', 'success');
        });
      }

      if (action === 'del-reserva') {
        if (!confirm('Remover este investimento do patrimônio?')) return;
        Store.deleteReserva(id);
        renderPatrimonio(container);
        toast('Investimento removido!', 'success');
      }

      if (action === 'edit-reserva') {
        // Redirect user to Reserva page for full editing
        window.location.hash = '#reserva';
        toast('Edite o investimento na aba Reserva.', 'info');
      }
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
      }, { height: 240 });
      Charts.Line(document.getElementById('chartCompSaldo'), {
        labels: Utils.months,
        datasets: [{ label:'Saldo', values:yrSaldo, color:'#7C6EF8' }],
      }, { height: 180 });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // [SamBar removed — empresa encerrada]
  // ══════════════════════════════════════════════════════════════
  function _removedSambar(container) {
    const monthly = Store.sambarMonthlySummary();
    const months = Object.keys(monthly).sort();
    const totalRec  = Object.values(monthly).reduce((a,v) => a+v.receita, 0);
    const totalDesp = Object.values(monthly).reduce((a,v) => a+v.despesa, 0);
    const saldoTotal = totalRec - totalDesp;
    const receitas = Store.get().sambarReceitas;
    const despesas = Store.get().sambarDespesas;

    container.innerHTML = `
<div class="sambar-header mb-6">
  <div class="sambar-title">🍻 SamBar</div>
  <div style="font-size:14px;color:rgba(245,158,11,.7);margin-top:4px">Gestão do Negócio · Lisboa, Portugal · 2024</div>
  <div style="display:grid;grid-template-columns:repeat(3,auto);gap:24px;margin-top:20px">
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:rgba(245,158,11,.6)">Receita Total</div>
      <div style="font-size:22px;font-weight:800;color:#FCD34D;font-family:var(--mono)">${totalRec.toLocaleString('pt-PT',{minimumFractionDigits:2})} €</div>
    </div>
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:rgba(245,158,11,.6)">Despesa Total</div>
      <div style="font-size:22px;font-weight:800;color:var(--red);font-family:var(--mono)">${totalDesp.toLocaleString('pt-PT',{minimumFractionDigits:2})} €</div>
    </div>
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:rgba(245,158,11,.6)">Saldo Operacional</div>
      <div style="font-size:22px;font-weight:800;color:${saldoTotal>=0?'#22C55E':'var(--red)'};font-family:var(--mono)">${saldoTotal.toLocaleString('pt-PT',{minimumFractionDigits:2})} €</div>
    </div>
  </div>
</div>

<div class="chart-grid mb-6">
  <div class="card">
    <div class="card-header"><span class="card-title">Resultado Mensal</span><span class="badge badge-amber">€ EUR</span></div>
    <div class="chart-wrap"><canvas id="chartSamBar" class="chart-canvas"></canvas></div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title">Despesas por Categoria</span></div>
    <canvas id="chartSamDesp" class="chart-canvas"></canvas>
  </div>
</div>

<div class="chart-grid mb-6">
  <div class="card">
    <div class="card-header"><span class="card-title">Entradas Diárias — Caixa vs Multibanco</span></div>
    <div class="chart-wrap"><canvas id="chartSamEntradas" class="chart-canvas"></canvas></div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title">Resumo Financeiro</span></div>
    <div>
      <div class="stat-row"><span class="stat-row-label">Receita Bruta Caixa</span><span class="stat-row-value" style="color:var(--amber)">${receitas.reduce((a,r)=>a+r.cash,0).toFixed(2)} €</span></div>
      <div class="stat-row"><span class="stat-row-label">Receita Multibanco (TPA)</span><span class="stat-row-value" style="color:var(--amber)">${receitas.reduce((a,r)=>a+r.card,0).toFixed(2)} €</span></div>
      <div class="stat-row"><span class="stat-row-label">Infraestrutura</span><span class="stat-row-value red">${despesas.filter(d=>d.cat==='Infraestrutura').reduce((a,d)=>a+d.amount,0).toFixed(2)} €</span></div>
      <div class="stat-row"><span class="stat-row-label">Alimentos</span><span class="stat-row-value red">${despesas.filter(d=>d.cat==='Alimentos').reduce((a,d)=>a+d.amount,0).toFixed(2)} €</span></div>
      <div class="stat-row"><span class="stat-row-label">Bebidas</span><span class="stat-row-value red">${despesas.filter(d=>d.cat==='Bebidas').reduce((a,d)=>a+d.amount,0).toFixed(2)} €</span></div>
      <div class="stat-row"><span class="stat-row-label">Eventos</span><span class="stat-row-value red">${despesas.filter(d=>d.cat==='Eventos').reduce((a,d)=>a+d.amount,0).toFixed(2)} €</span></div>
      <div class="stat-row" style="border-top:2px solid var(--border-2);margin-top:8px;padding-top:8px">
        <span class="stat-row-label fw-700">Margem Operacional</span>
        <span class="stat-row-value ${saldoTotal>=0?'green':'red'} fw-700">${((saldoTotal/totalRec)*100).toFixed(1)}%</span>
      </div>
    </div>
  </div>
</div>

<div class="card">
  <div class="card-header"><span class="card-title">Lançamentos de Despesas</span></div>
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th class="num">Valor (€)</th></tr></thead>
      <tbody>${despesas.sort((a,b)=>b.date.localeCompare(a.date)).map(d=>`<tr>
        <td class="muted">${d.date.slice(5)}</td>
        <td><span class="badge badge-amber">${d.cat}</span></td>
        <td>${d.desc}</td>
        <td class="num negative">${d.amount.toFixed(2)} €</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>
</div>`;

    requestAnimationFrame(() => {
      const mLabels = months.map(m => {
        const [y,mo] = m.split('-');
        return Utils.months[parseInt(mo,10)-1]+'/'+y.slice(2);
      });
      Charts.Bar(document.getElementById('chartSamBar'), {
        labels: mLabels,
        datasets: [
          { label:'Receita', values: months.map(m=>monthly[m].receita), color:'#F59E0B' },
          { label:'Despesa', values: months.map(m=>monthly[m].despesa), color:'#EF4444' },
        ],
      }, { height: 200 });

      const catDesp = {};
      despesas.forEach(d => { catDesp[d.cat] = (catDesp[d.cat]||0)+d.amount; });
      const catColors2 = { 'Infraestrutura':'#3B82F6','Alimentos':'#22C55E','Bebidas':'#F59E0B','Eventos':'#EC4899','Outros':'#7C6EF8' };
      Charts.HBar(document.getElementById('chartSamDesp'), Object.entries(catDesp).map(([cat,val])=>({
        label: cat, value: val, color: catColors2[cat]||'#7C6EF8',
      })), { barH: 28, padL: 130, padR: 70, gap: 8, prefix: '€ ' });

      const entLabels = receitas.slice(0,12).map(r=>r.date.slice(5));
      Charts.Bar(document.getElementById('chartSamEntradas'), {
        labels: entLabels,
        datasets: [
          { label:'Caixa',      values: receitas.slice(0,12).map(r=>r.cash), color:'#F59E0B' },
          { label:'Multibanco', values: receitas.slice(0,12).map(r=>r.card), color:'#22C55E' },
        ],
      }, { height: 180 });
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
  // PAGE: RESERVA (Investimentos & Recebimentos Futuros)
  // ══════════════════════════════════════════════════════════════
  const RESERVA_TIPOS = ['Renda Fixa - CDB','Renda Fixa - LCI/LCA','Renda Fixa - Tesouro Selic','Renda Fixa - Poupança','Renda Variável - Ações/FII','Renda Variável - ETF','Reserva em Dinheiro','Outros'];
  const IMPOSTO_OPTS  = [{ label:'Isento (LCI/LCA/Poupança)', val:0 },{ label:'15% (acima de 720 dias)', val:0.15 },{ label:'17,5% (361–720 dias)', val:0.175 },{ label:'20% (até 360 dias)', val:0.20 }];
  const MESES_LABEL   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  function renderReserva(container) {
    const reservas  = Store.get().reservas  || [];
    const futuros   = Store.get().recebimentosFuturos || [];
    const totalInv  = reservas.reduce((s,r) => s + (r.valorAtual || r.valorInvestido || 0), 0);
    const totalFut  = futuros.filter(f=>f.status!=='recebido').reduce((s,f) => s + f.valor, 0);

    function yieldLiq(r) {
      if (!r.rendimento || r.tipo.includes('Dinheiro')) return 0;
      const bruto = (r.valorInvestido || 0) * (r.rendimento / 100);
      return bruto * (1 - (r.imposto || 0));
    }

    container.innerHTML = `
<div class="section-header mb-6">
  <div><div class="section-title">Reserva & Investimentos</div>
  <div class="section-sub">Controle de investimentos, reservas e entradas futuras previstas</div></div>
  <div class="flex gap-2">
    <button class="btn-secondary" id="btnAddFuturo">+ Recebimento Futuro</button>
    <button class="btn-primary"   id="btnAddReserva">+ Novo Investimento</button>
  </div>
</div>

<div class="kpi-grid mb-6">
  <div class="kpi-card" style="--kpi-color:var(--accent);--kpi-bg:var(--accent-dim)">
    <div class="kpi-header"><span class="kpi-label">Total Investido</span><span class="kpi-icon">🏦</span></div>
    <div class="kpi-value" style="color:var(--accent)">${Utils.currency(totalInv)}</div>
    <div class="card-sub">${reservas.length} ativo${reservas.length!==1?'s':''} cadastrado${reservas.length!==1?'s':''}</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--green);--kpi-bg:var(--green-dim)">
    <div class="kpi-header"><span class="kpi-label">Rendimento Líquido Est.</span><span class="kpi-icon">📈</span></div>
    <div class="kpi-value green">${Utils.currency(reservas.reduce((s,r)=>s+yieldLiq(r),0))}</div>
    <div class="card-sub">Projeção anual após IR</div>
  </div>
  <div class="kpi-card" style="--kpi-color:var(--blue);--kpi-bg:var(--blue-dim)">
    <div class="kpi-header"><span class="kpi-label">Recebimentos Futuros</span><span class="kpi-icon">📅</span></div>
    <div class="kpi-value" style="color:var(--blue)">${Utils.currency(totalFut)}</div>
    <div class="card-sub">${futuros.filter(f=>f.status!=='recebido').length} pendente${futuros.filter(f=>f.status!=='recebido').length!==1?'s':''}</div>
  </div>
</div>

<div class="section-header mb-4"><div class="section-title">Investimentos & Reservas</div></div>
${reservas.length === 0 ? `<div class="card" style="text-align:center;padding:40px;color:var(--text-4)">Nenhum investimento cadastrado</div>` : `
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:24px">
  ${reservas.map(r => {
    const liq = yieldLiq(r);
    const tagColor = r.tipo.includes('Dinheiro') ? 'var(--text-3)' : r.tipo.includes('Variável') ? 'var(--blue)' : 'var(--green)';
    return `
  <div class="card" style="border-top:3px solid ${tagColor}">
    <div class="card-header">
      <div>
        <div style="font-weight:700;font-size:14px;color:var(--text-1)">${r.nome}</div>
        <div style="font-size:11px;color:var(--text-4);margin-top:2px">${r.tipo}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn-xs" data-action="edit-res" data-id="${r.id}" title="Editar">✏</button>
        <button class="btn-xs btn-red" data-action="del-res" data-id="${r.id}" title="Excluir">✕</button>
      </div>
    </div>
    <div style="margin:12px 0 8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
      <div><div style="color:var(--text-4)">Investido</div><div style="font-weight:700;color:var(--text-1)">${Utils.currency(r.valorInvestido||0)}</div></div>
      <div><div style="color:var(--text-4)">Valor Atual</div><div style="font-weight:700;color:var(--green)">${Utils.currency(r.valorAtual||r.valorInvestido||0)}</div></div>
      ${r.rendimento ? `<div><div style="color:var(--text-4)">Rendimento</div><div style="font-weight:600;color:var(--accent)">${r.rendimento}% a.a.</div></div>` : ''}
      ${r.imposto ? `<div><div style="color:var(--text-4)">IR</div><div style="font-weight:600;color:var(--amber)">${(r.imposto*100).toFixed(1)}%</div></div>` : ''}
      ${liq ? `<div style="grid-column:1/-1"><div style="color:var(--text-4)">Rend. Líq. Est./ano</div><div style="font-weight:700;color:var(--green)">${Utils.currency(liq)}</div></div>` : ''}
    </div>
    ${r.carencia ? `<div style="font-size:11px;color:var(--text-4)">🔒 Carência: ${new Date(r.carencia+'T12:00:00').toLocaleDateString('pt-BR')}</div>` : ''}
  </div>`;
  }).join('')}
</div>`}

<div class="section-header mb-4" style="margin-top:8px"><div class="section-title">Recebimentos Futuros Previstos</div></div>
${futuros.length === 0 ? `<div class="card" style="text-align:center;padding:32px;color:var(--text-4)">Nenhum recebimento futuro cadastrado</div>` : `
<div class="card">
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
        ? `<button class="btn-xs btn-green" data-action="rec-recebido" data-id="${f.id}" title="Marcar como recebido">✓</button>`
        : `<span class="badge badge-green">Recebido</span>`}
      <button class="btn-xs btn-red" data-action="del-futuro" data-id="${f.id}" title="Excluir">✕</button>
    </div>
  </div>`;
  }).join('')}
</div>`}`;

    document.getElementById('btnAddReserva')?.addEventListener('click', () => openReservaModal(null, container));
    document.getElementById('btnAddFuturo')?.addEventListener('click', () => openFuturoModal(container));
    container.querySelectorAll('[data-action="edit-res"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = (Store.get().reservas||[]).find(r => r.id === btn.dataset.id);
        if (r) openReservaModal(r, container);
      });
    });
    container.querySelectorAll('[data-action="del-res"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Excluir este investimento?')) return;
        Store.deleteReserva(btn.dataset.id); renderReserva(container); toast('Removido!', 'success');
      });
    });
    container.querySelectorAll('[data-action="del-futuro"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Excluir?')) return;
        Store.deleteRecebimentoFuturo(btn.dataset.id); renderReserva(container);
      });
    });
    container.querySelectorAll('[data-action="rec-recebido"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = (Store.get().recebimentosFuturos||[]).find(f => f.id === btn.dataset.id);
        if (f) { f.status = 'recebido'; Store.persist(); renderReserva(container); toast('Marcado como recebido!', 'success'); }
      });
    });
  }

  function openReservaModal(res, container) {
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
      Modal.close(); renderReserva(container);
    });
  }

  function openFuturoModal(container) {
    const thisYear = new Date().getFullYear();
    const html = `<div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Descrição</label><input class="form-input" id="fFDesc" placeholder="Ex: Rescisão, Dividendos, Herança…"/></div>
      <div class="form-group"><label class="form-label">Valor Esperado (R$)</label><input class="form-input" id="fFValor" type="number" step="100" placeholder="0"/></div>
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
      toast('Recebimento futuro adicionado!', 'success');
      Modal.close(); renderReserva(container);
    });
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
    </div>`;

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
      if (!desc || !amount || !date) return toast('Preencha todos os campos', 'error');
      const dt = new Date(date);
      Store.updateDespesa(id, {
        desc, amount, date, category: cat, sub, pay,
        month: dt.getMonth() + 1, year: dt.getFullYear(),
        desconto: temDesc && economia > 0, valorOriginal: valorOrig, economia,
      });
      Modal.close();
      toast('Despesa atualizada!', 'success');
      if (onSaved) onSaved();
    });

    setTimeout(() => {
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
  function init() {
    Store.init();
    Modal.init();

    // Register pages
    Router.register('dashboard',  renderDashboard);
    Router.register('lancamentos',renderLancamentos);
    Router.register('receitas',   renderReceitas);
    Router.register('despesas',   renderDespesas);
    Router.register('metas',      renderMetas);
    Router.register('contas',     renderContas);
    Router.register('reserva',    renderReserva);
    Router.register('patrimonio', renderPatrimonio);
    Router.register('comparativo',renderComparativo);

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      const html = document.documentElement;
      const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
      html.dataset.theme = next;
      Store.updateSettings({ tema: next });
    });

    // Month selector
    document.getElementById('globalMonth').addEventListener('change', () => {
      Router.navigate(Router.current);
    });

    // New entry button
    document.getElementById('btnNovaEntrada').addEventListener('click', openNovaEntrada);

    // Sidebar toggle (mobile)
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Apply saved theme
    const { tema } = Store.get().settings;
    if (tema) document.documentElement.dataset.theme = tema;

    // Init routing
    Router.init();
  }

  return { init };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());

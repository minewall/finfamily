/* ═══════════════════════════════════════════════════════════════════
   SVG-CHARTS.JS — utilitários inline para o redesign (Sprint 0)
   Diferente de charts.js (que usa Canvas), estes retornam strings SVG
   prontas para concatenar em template literals nas funções de render.

   Vantagem: zero dependência de DOM/canvas — renderiza junto com o HTML.
   Uso típico:
     `<div class="kpi-card">${SvgCharts.gauge(75, { color: 'var(--accent)' })}</div>`
═══════════════════════════════════════════════════════════════════ */
'use strict';

const SvgCharts = (function () {

  /**
   * Gauge circular (Poder de Escolha hero)
   * @param {number} pct  — 0 a 100
   * @param {object} opts — { size?: 78, color?: '#6b5ef5', thickness?: 9,
   *                          bg?: 'rgba(255,255,255,0.08)', showLabel?: false,
   *                          labelTop?: string, labelBot?: string, labelColor?: string }
   */
  function gauge(pct, opts = {}) {
    const size  = opts.size      || 78;
    const color = opts.color     || 'var(--accent)';
    const thick = opts.thickness || 9;
    const bg    = opts.bg        || 'rgba(255,255,255,0.08)';

    const r = (size - thick - 2) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circ = 2 * Math.PI * r;
    const arc = Math.max(0, Math.min(100, pct)) / 100 * circ;

    const center = opts.showLabel
      ? `<text x="${cx}" y="${cy - 2}" text-anchor="middle" fill="${opts.labelColor || 'var(--text-1)'}" font-size="${Math.round(size * 0.22)}" font-weight="700" font-family="DM Sans">${opts.labelTop || Math.round(pct) + '%'}</text>
         ${opts.labelBot ? `<text x="${cx}" y="${cy + Math.round(size * 0.18)}" text-anchor="middle" fill="${opts.labelColor || 'var(--text-3)'}" font-size="${Math.round(size * 0.12)}" font-family="DM Sans">${opts.labelBot}</text>` : ''}`
      : '';

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${bg}" stroke-width="${thick}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${thick}"
              stroke-dasharray="${arc.toFixed(2)} ${(circ - arc).toFixed(2)}"
              stroke-linecap="round"
              transform="rotate(-90 ${cx} ${cy})"/>
      ${center}
    </svg>`;
  }

  /**
   * Donut chart segmentado
   * @param {Array<{v:number, c:string}>} segments — value + cor
   * @param {object} opts — { size?: 130, thickness?: 18, gap?: 2.4,
   *                          topText?: string, botText?: string, textColor?: string }
   */
  function donut(segments, opts = {}) {
    const size  = opts.size      || 130;
    const thick = opts.thickness || 18;
    const gap   = opts.gap       || 2.4;

    const cx = size / 2;
    const cy = size / 2;
    const r  = (size - thick) / 2;
    const total = segments.reduce((s, g) => s + (g.v || 0), 0);
    if (total <= 0) return '';

    const toXY = (a) => ({
      x: cx + r * Math.cos(((a - 90) * Math.PI) / 180),
      y: cy + r * Math.sin(((a - 90) * Math.PI) / 180),
    });

    let angle = 0;
    const paths = segments.map((seg) => {
      const pct = seg.v / total;
      const sweep = pct * 360 - gap;
      if (sweep <= 0) { angle += pct * 360; return ''; }
      const s = toXY(angle + gap / 2);
      const e = toXY(angle + gap / 2 + sweep);
      const d = `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
      angle += pct * 360;
      return `<path d="${d}" fill="none" stroke="${seg.c}" stroke-width="${thick}" stroke-linecap="round"/>`;
    }).join('');

    const tc = opts.textColor || 'var(--text-1)';
    const top = opts.topText ? `<text x="${cx}" y="${cy - 5}" text-anchor="middle" fill="${tc}" font-size="13" font-weight="700" font-family="DM Sans">${opts.topText}</text>` : '';
    const bot = opts.botText ? `<text x="${cx}" y="${cy + 13}" text-anchor="middle" fill="var(--text-3)" font-size="9.5" font-family="DM Sans">${opts.botText}</text>` : '';

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${thick}"/>
      ${paths}
      ${top}
      ${bot}
    </svg>`;
  }

  /**
   * LineChart com múltiplas séries + area fill
   * @param {Array<{data:number[], c:string}>} series — data points + cor por série
   * @param {string[]} labels — labels do eixo X (ex: meses)
   * @param {object} opts — { width?: 380, height?: 128 }
   */
  function lineChart(series, labels, opts = {}) {
    const W  = opts.width  || 380;
    const H  = opts.height || 128;
    const PL = 28, PR = 8, PT = 10, PB = 20;
    const cW = W - PL - PR;
    const cH = H - PT - PB;
    const max = Math.max(1, ...series.flatMap(s => s.data)) * 1.12;

    const gx = (i) => PL + (i / Math.max(1, labels.length - 1)) * cW;
    const gy = (v) => PT + cH - (v / max) * cH;
    const grids = [0, max * 0.35, max * 0.7];

    const gridHtml = grids.map((v) => `
      <line x1="${PL}" y1="${gy(v).toFixed(1)}" x2="${PL + cW}" y2="${gy(v).toFixed(1)}" stroke="rgba(255,255,255,0.055)" stroke-width="1"/>
      <text x="${PL - 4}" y="${(gy(v) + 4).toFixed(1)}" text-anchor="end" fill="var(--text-3)" font-size="8" font-family="DM Sans">${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v.toFixed(0)}</text>
    `).join('');

    const labelsHtml = labels.map((l, i) =>
      `<text x="${gx(i).toFixed(1)}" y="${H - 3}" text-anchor="middle" fill="var(--text-3)" font-size="8.5" font-family="DM Sans">${l}</text>`
    ).join('');

    const seriesHtml = series.map((s) => {
      if (!s.data.length) return '';
      const pts = s.data.map((v, i) => [gx(i), gy(v)]);
      const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');
      const area = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} L ${pts.slice(1).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')} L ${gx(s.data.length - 1).toFixed(1)},${gy(0).toFixed(1)} L ${gx(0).toFixed(1)},${gy(0).toFixed(1)} Z`;
      const last = pts[pts.length - 1];
      return `
        <path d="${area}" fill="${s.c}" opacity="0.07"/>
        <path d="M ${line}" fill="none" stroke="${s.c}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3" fill="${s.c}"/>
      `;
    }).join('');

    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;overflow:visible">
      ${gridHtml}
      ${labelsHtml}
      ${seriesHtml}
    </svg>`;
  }

  /**
   * Barra tricolor LLP (verde 0-33% / âmbar 33-66% / vermelho 66-100%+)
   * Marca a posição atual da Saúde Financeira com um indicador.
   * @param {number} pct — % comprometido da receita (0 a 100)
   * @param {object} opts — { height?: 7, showZones?: true, showMarker?: true }
   */
  function healthBar(pct, opts = {}) {
    const h = opts.height || 7;
    const p = Math.max(0, Math.min(120, pct));
    return `<div style="position:relative;width:100%">
      <div style="display:flex;height:${h}px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,0.08)">
        <div style="width:33.33%;background:var(--green)"></div>
        <div style="width:33.33%;background:var(--amber)"></div>
        <div style="width:33.34%;background:var(--red)"></div>
      </div>
      <div style="position:absolute;top:-3px;left:${Math.min(p, 99)}%;width:2px;height:${h + 6}px;background:var(--text-1);border-radius:1px;transform:translateX(-1px);box-shadow:0 0 0 1px rgba(0,0,0,0.4)"></div>
    </div>`;
  }

  /**
   * Mini sparkline horizontal (inline em listas/cards)
   * @param {number[]} values
   * @param {object} opts — { width?: 80, height?: 24, color?: 'var(--accent)' }
   */
  function sparkline(values, opts = {}) {
    const W = opts.width  || 80;
    const H = opts.height || 24;
    const color = opts.color || 'var(--accent)';
    if (!values || values.length < 2) return '';
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const step = W / (values.length - 1);
    const pts = values.map((v, i) => [i * step, H - ((v - min) / range) * H]);
    const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">
      <path d="M ${line}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  }

  return { gauge, donut, lineChart, healthBar, sparkline };
})();

/* ═══════════════════════════════════════════════════════════════════
   CHARTS.JS — Canvas-based chart library (no dependencies)
═══════════════════════════════════════════════════════════════════ */
'use strict';

const Charts = (function () {
  // Theme-aware colors
  function css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  const PALETTE = [
    '#7C6EF8','#22C55E','#3B82F6','#EC4899','#F59E0B',
    '#F97316','#14B8A6','#6366F1','#8B5CF6','#EF4444',
    '#0EA5E9','#D946EF','#84CC16','#FB923C',
  ];

  function dpr() { return Math.min(window.devicePixelRatio || 1, 2); }

  function setupCanvas(canvas) {
    const ratio = dpr();
    const rect  = canvas.getBoundingClientRect();
    const w = rect.width  || canvas.parentElement.offsetWidth  || 400;
    const h = rect.height || canvas.parentElement.offsetHeight || 220;
    canvas.width  = w * ratio;
    canvas.height = h * ratio;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    return { ctx, w, h };
  }

  function fmt(n, compact) {
    if (n === 0) return '0';
    if (compact) {
      if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1)+'M';
      if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(1)+'k';
    }
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ── BAR CHART ──────────────────────────────────────────────────
  function Bar(canvasEl, data, opts = {}) {
    /*
      data: { labels: string[], datasets: [{ label, values: number[], color? }] }
      opts: { height?, title?, yLabel?, stacked?, compact? }
    */
    canvasEl.height = opts.height || 175;
    const { ctx, w, h } = setupCanvas(canvasEl);

    const padL = 54, padR = 16, padT = 24, padB = 36;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const labels   = data.labels || [];
    const datasets = data.datasets || [];
    const n        = labels.length;

    const textColor  = css('--text-3');
    const gridColor  = css('--border');
    const textColor2 = css('--text-2');

    ctx.clearRect(0, 0, w, h);
    ctx.font = '11px Inter, sans-serif';

    // Determine max value
    let maxVal = 0;
    if (opts.stacked) {
      for (let i = 0; i < n; i++) {
        const sum = datasets.reduce((a, ds) => a + (ds.values[i] || 0), 0);
        maxVal = Math.max(maxVal, sum);
      }
    } else {
      datasets.forEach(ds => ds.values.forEach(v => { maxVal = Math.max(maxVal, v); }));
    }
    if (maxVal === 0) maxVal = 1;

    // Grid lines
    const gridCount = 4;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridCount; i++) {
      const y = padT + chartH - (chartH * i / gridCount);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();

      const label = fmt(maxVal * i / gridCount, true);
      ctx.fillStyle = textColor;
      ctx.textAlign = 'right';
      ctx.fillText(label, padL - 6, y + 4);
    }

    // Bars
    const groupW = chartW / n;
    const dsCount = datasets.length;
    const barPad  = groupW * 0.15;
    const barTotal = groupW - barPad * 2;
    const barW    = opts.stacked ? barTotal : barTotal / dsCount;

    datasets.forEach((ds, di) => {
      ctx.fillStyle = ds.color || PALETTE[di] || PALETTE[0];

      ds.values.forEach((val, i) => {
        const barH = (val / maxVal) * chartH;
        const x = padL + i * groupW + barPad + (opts.stacked ? 0 : di * barW);
        const y = padT + chartH - barH;

        const radius = Math.min(4, barW / 4, barH / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barW - radius, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
        ctx.lineTo(x + barW, y + barH);
        ctx.lineTo(x, y + barH);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.fill();
      });
    });

    // X labels
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    labels.forEach((lbl, i) => {
      const x = padL + i * groupW + groupW / 2;
      ctx.fillText(lbl, x, padT + chartH + 16);
    });

    return { destroy() {} };
  }

  // ── LINE / AREA CHART ──────────────────────────────────────────
  function Line(canvasEl, data, opts = {}) {
    canvasEl.height = opts.height || 160;
    const { ctx, w, h } = setupCanvas(canvasEl);

    const padL = 54, padR = 20, padT = 24, padB = 36;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const labels   = data.labels || [];
    const datasets = data.datasets || [];
    const n        = labels.length;

    const textColor = css('--text-3');
    const gridColor = css('--border');

    ctx.clearRect(0, 0, w, h);
    ctx.font = '11px Inter, sans-serif';

    let minVal = 0;
    let maxVal = 0;
    datasets.forEach(ds => ds.values.forEach(v => {
      minVal = Math.min(minVal, v);
      maxVal = Math.max(maxVal, v);
    }));
    if (maxVal === minVal) maxVal = minVal + 1;

    // Grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const val = minVal + (maxVal - minVal) * i / gridCount;
      const y   = padT + chartH - chartH * i / gridCount;
      ctx.beginPath();
      ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y);
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.textAlign = 'right';
      ctx.fillText(fmt(val, true), padL - 6, y + 4);
    }

    // Lines + Areas
    datasets.forEach((ds, di) => {
      const color = ds.color || PALETTE[di] || PALETTE[0];
      const pts = ds.values.map((v, i) => ({
        x: padL + i * (chartW / (n - 1 || 1)),
        y: padT + chartH - ((v - minVal) / (maxVal - minVal)) * chartH,
      }));

      if (opts.area !== false) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, padT + chartH);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, padT + chartH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
        grad.addColorStop(0,   color + '30');
        grad.addColorStop(1,   color + '00');
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Dots
      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    });

    // X labels
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    labels.forEach((lbl, i) => {
      const x = padL + i * (chartW / (n - 1 || 1));
      ctx.fillText(lbl, x, padT + chartH + 16);
    });

    return { destroy() {} };
  }

  // ── DONUT CHART ────────────────────────────────────────────────
  function Donut(canvasEl, data, opts = {}) {
    const size = opts.size || 180;
    canvasEl.width  = size;
    canvasEl.height = size;
    canvasEl.style.width  = size + 'px';
    canvasEl.style.height = size + 'px';
    const ratio = dpr();
    canvasEl.width  = size * ratio;
    canvasEl.height = size * ratio;
    const ctx = canvasEl.getContext('2d');
    ctx.scale(ratio, ratio);

    const cx = size / 2, cy = size / 2;
    const outerR = size * 0.46;
    const innerR = size * 0.30;

    const total  = data.reduce((a, d) => a + d.value, 0) || 1;
    const bgColor = css('--bg-elevated');

    ctx.clearRect(0, 0, size, size);

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // Segments
    let angle = -Math.PI / 2;
    data.forEach((item, i) => {
      const sweep = (item.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, angle, angle + sweep);
      ctx.closePath();
      ctx.fillStyle = item.color || PALETTE[i % PALETTE.length];
      ctx.fill();
      angle += sweep;
    });

    // Hole
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // Center label
    if (opts.centerLabel) {
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillStyle = css('--text-1');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(opts.centerLabel, cx, cy - 8);
    }
    if (opts.centerSub) {
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = css('--text-3');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(opts.centerSub, cx, cy + 10);
    }

    return { destroy() {} };
  }

  // ── MINI SPARKLINE ─────────────────────────────────────────────
  function Sparkline(canvasEl, values, color) {
    canvasEl.width  = 80;
    canvasEl.height = 32;
    canvasEl.style.width  = '80px';
    canvasEl.style.height = '32px';
    const ctx = canvasEl.getContext('2d');
    const w = 80, h = 32;
    const min = Math.min(...values);
    const max = Math.max(...values) || 1;
    const n = values.length;

    ctx.clearRect(0, 0, w, h);

    const pts = values.map((v, i) => ({
      x: (i / (n - 1)) * w,
      y: h - ((v - min) / (max - min || 1)) * (h - 4) - 2,
    }));

    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color || '#7C6EF8';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // ── HORIZONTAL BAR ─────────────────────────────────────────────
  function HBar(canvasEl, data, opts = {}) {
    /* data: [{ label, value, color? }] */
    const barH   = opts.barH  || 28;
    const padL   = opts.padL  || 130;
    const padR   = opts.padR  || 80;
    const gap    = opts.gap   || 8;
    const n      = data.length;
    const height = n * (barH + gap) + 20;

    canvasEl.style.height = height + 'px'; // pin CSS height before setupCanvas to avoid aspect-ratio scaling
    canvasEl.height = height;
    const { ctx, w, h } = setupCanvas(canvasEl);

    const maxVal = Math.max(...data.map(d => d.value)) || 1;
    const chartW = w - padL - padR;
    const textColor = css('--text-2');
    const textMuted = css('--text-3');

    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px Inter, sans-serif';

    data.forEach((item, i) => {
      const y   = i * (barH + gap) + 10;
      const bW  = (item.value / maxVal) * chartW;
      const col = item.color || PALETTE[i % PALETTE.length];

      // Background track
      ctx.fillStyle = css('--bg-elevated');
      ctx.beginPath();
      const rr = barH / 2;
      ctx.roundRect(padL, y, chartW, barH, rr);
      ctx.fill();

      // Fill
      if (bW > 0) {
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(padL, y, Math.max(bW, rr * 2), barH, rr);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Label
      ctx.fillStyle = textColor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, padL - 8, y + barH / 2);

      // Value
      ctx.fillStyle = textMuted;
      ctx.textAlign = 'left';
      ctx.fillText((opts.prefix || 'R$ ') + fmt(item.value, true), padL + chartW + 6, y + barH / 2);
    });

    return { destroy() {} };
  }

  // ── CASHFLOW GAUGE ─────────────────────────────────────────────
  function Gauge(canvasEl, pct, opts = {}) {
    const size = opts.size || 140;
    canvasEl.width  = size;
    canvasEl.height = size;
    canvasEl.style.width  = size + 'px';
    canvasEl.style.height = size + 'px';
    const ratio = dpr();
    canvasEl.width  = size * ratio;
    canvasEl.height = size * ratio;
    const ctx = canvasEl.getContext('2d');
    ctx.scale(ratio, ratio);

    const cx = size / 2, cy = size / 2;
    const r  = size * 0.42;
    const lineW = size * 0.08;
    const start  = Math.PI * 0.75;
    const range  = Math.PI * 1.5;
    const clampedPct = Math.min(Math.max(pct, 0), 1);

    ctx.clearRect(0, 0, size, size);

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + range);
    ctx.strokeStyle = css('--bg-elevated');
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Fill
    const color = pct > 0.9 ? '#EF4444' : pct > 0.7 ? '#F59E0B' : '#22C55E';
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + range * clampedPct);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Label
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillStyle = css('--text-1');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(pct * 100) + '%', cx, cy - 6);

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = css('--text-3');
    ctx.fillText(opts.label || 'utilizado', cx, cy + 12);
  }

  return { Bar, Line, Donut, Sparkline, HBar, Gauge, PALETTE, fmt };
})();

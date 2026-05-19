// Wordmark components for "Haile"
// Real type (Outfit 800 — rounded geometric, matches the reference DNA)
// for letterforms; an SVG overlay handles the custom swash motif.

const HAILE_FONT_FAMILY = '"Outfit", "Manrope", system-ui, sans-serif';
const HAILE_WEIGHT = 800;
const HAILE_TRACKING = '-0.045em';

function HaileBase({ fg = '#f4efe5', height = 88, decoration, style, lowercase = false }) {
  const fontSize = height;
  const label = lowercase ? 'haile' : 'Haile';
  return (
    <div style={{
      position: 'relative', display: 'inline-block',
      fontFamily: HAILE_FONT_FAMILY, fontWeight: HAILE_WEIGHT,
      fontSize, lineHeight: 1, color: fg,
      letterSpacing: HAILE_TRACKING,
      ...style,
    }}>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        {label}
        {decoration}
      </span>
    </div>
  );
}

// SVG overlay sized to the wordmark. The viewBox is normalized so the
// swash paths can be authored once and reused. Stroke uses em units so the
// swash scales proportionally with the font size.
const SwashOverlay = ({ d, color, strokeEm = 0.07, viewBox = '0 0 100 30',
  top = '-0.25em', height = '0.7em', side = '0.04em', arrowEnd }) => (
  <svg viewBox={viewBox} preserveAspectRatio="none"
    style={{
      position: 'absolute',
      left: `calc(-1 * ${side})`, right: `calc(-1 * ${side})`,
      top, height,
      width: `calc(100% + 2 * ${side})`,
      pointerEvents: 'none', overflow: 'visible',
    }}>
    <path d={d} stroke={color} strokeLinecap="round"
      strokeLinejoin="round" fill="none"
      style={{ strokeWidth: `${strokeEm}em` }}/>
    {arrowEnd && (
      <path d={arrowEnd} stroke={color} strokeLinecap="round"
        strokeLinejoin="round" fill="none"
        style={{ strokeWidth: `${strokeEm}em` }}/>
    )}
  </svg>
);

// 1. Faithful swash — a single flowing curve that traces over the
//    cap-height: rises gently above H, crests over 'ai', dips into the
//    i-l gap (where the i-dot lives), rises again, and lands on top of e.
const HaileWordmark = ({ fg = '#f4efe5', accent, swash = true, height = 88, style }) => (
  <HaileBase fg={fg} height={height} style={style} decoration={swash && (
    <SwashOverlay
      d="M 3 22 Q 22 -2 44 18 Q 60 28 76 14 Q 88 6 97 18"
      color={accent || fg}
      strokeEm={0.055}
      viewBox="0 0 100 30"
      top="-0.32em" height="0.5em" side="0.02em"
    />
  )}/>
);

// 2. Clean — no swash at all
const HaileClean = ({ fg = '#f4efe5', accent, height = 88, style }) => (
  <HaileBase fg={fg} height={height} style={style}/>
);

// 3. Subtle — a short flourish above the i/l gap only
const HaileSubtleSwash = ({ fg = '#f4efe5', accent, height = 88, style }) => (
  <HaileBase fg={fg} height={height} style={style} decoration={
    <SwashOverlay
      d="M 50 22 Q 66 -2 92 18"
      color={accent || fg}
      strokeEm={0.05}
      viewBox="0 0 100 30"
      top="-0.32em" height="0.5em" side="0.02em"
    />
  }/>
);

// 4. Growth — upward trajectory under-and-across the wordmark, ending in an arrow
const HaileGrowth = ({ fg = '#f4efe5', accent, height = 88, style }) => (
  <HaileBase fg={fg} height={height} style={style} decoration={
    <SwashOverlay
      d="M 2 28 Q 30 26 50 18 T 96 4"
      arrowEnd="M 92 1 L 99 4 L 97 11"
      color={accent || fg}
      strokeEm={0.055}
      viewBox="0 0 100 30"
      top="-0.42em" height="0.6em" side="0.04em"
    />
  }/>
);

// 5. Lowercase variant
const HaileLowercase = ({ fg = '#f4efe5', accent, height = 88, style }) => (
  <HaileBase fg={fg} height={height} style={style} lowercase decoration={
    <SwashOverlay
      d="M 3 22 Q 22 -2 44 18 Q 60 28 76 14 Q 88 6 97 18"
      color={accent || fg}
      strokeEm={0.055}
      viewBox="0 0 100 30"
      top="-0.32em" height="0.5em" side="0.02em"
    />
  }/>
);

// 6. Underline — bold flowing underline beneath the wordmark, no top swash
const HaileUnderline = ({ fg = '#f4efe5', accent, height = 88, style }) => (
  <HaileBase fg={fg} height={height} style={style} decoration={
    <svg viewBox="0 0 100 12" preserveAspectRatio="none"
      style={{ position: 'absolute', left: '-0.02em', right: '-0.02em',
        bottom: '-0.22em', width: 'calc(100% + 0.04em)', height: '0.22em',
        overflow: 'visible' }}>
      <path d="M 2 6 Q 50 -2 98 6" stroke={accent || fg}
        strokeLinecap="round" fill="none"
        style={{ strokeWidth: '0.5em' }}/>
    </svg>
  }/>
);

Object.assign(window, {
  HaileWordmark, HaileClean, HaileSubtleSwash,
  HaileGrowth, HaileLowercase, HaileUnderline,
});

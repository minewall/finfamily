// Symbol / monogram marks for Haile
// Standalone graphic devices that can sit alongside the wordmark or live
// alone as an app icon. Each is square so it fits any tile/container.

// Monogram H — three horizontal lines forming an H (family rows aligned)
const MarkRows = ({ fg = '#f4efe5', accent, size = 120, style }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} style={style} aria-label="Haile mark">
    <path d="M 22 22 L 22 98" stroke={fg} strokeWidth="14" strokeLinecap="round"/>
    <path d="M 98 22 L 98 98" stroke={fg} strokeWidth="14" strokeLinecap="round"/>
    <path d="M 22 44 L 98 44" stroke={accent || fg} strokeWidth="6" strokeLinecap="round" opacity="0.55"/>
    <path d="M 22 60 L 98 60" stroke={accent || fg} strokeWidth="6" strokeLinecap="round"/>
    <path d="M 22 76 L 98 76" stroke={accent || fg} strokeWidth="6" strokeLinecap="round" opacity="0.55"/>
  </svg>
);

// Monogram H — bridge (crossbar is a flowing curve)
const MarkBridge = ({ fg = '#f4efe5', accent, size = 120, style }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} style={style} aria-label="Haile mark">
    <path d="M 22 22 L 22 98" stroke={fg} strokeWidth="14" strokeLinecap="round"/>
    <path d="M 98 22 L 98 98" stroke={fg} strokeWidth="14" strokeLinecap="round"/>
    <path d="M 22 70 Q 60 30 98 60" stroke={accent || fg} strokeWidth="10" strokeLinecap="round" fill="none"/>
  </svg>
);

// Symbol — interlocking arcs (two people, shared center)
const MarkFamily = ({ fg = '#f4efe5', accent, size = 120, style }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} style={style} aria-label="Haile mark">
    <path d="M 30 90 Q 30 40 60 40 Q 90 40 90 90"
      stroke={fg} strokeWidth="14" strokeLinecap="round" fill="none"/>
    <circle cx="60" cy="40" r="8" fill={accent || fg}/>
    {/* Curve trail underneath — the swash from the wordmark */}
    <path d="M 16 100 Q 60 116 104 100"
      stroke={accent || fg} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.7"/>
  </svg>
);

// Symbol — curve through circle (flow through goal)
const MarkFlow = ({ fg = '#f4efe5', accent, size = 120, style }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} style={style} aria-label="Haile mark">
    <circle cx="60" cy="60" r="38" stroke={fg} strokeWidth="14" fill="none"/>
    <path d="M 14 78 Q 60 30 106 78"
      stroke={accent || fg} strokeWidth="8" strokeLinecap="round" fill="none"/>
  </svg>
);

// Symbol — single H glyph from the wordmark, isolated as mark
const MarkH = ({ fg = '#f4efe5', accent, size = 120, style }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} style={style} aria-label="Haile mark">
    <path d="M 26 22 L 26 98 M 26 60 L 94 60 M 94 22 L 94 98"
      stroke={fg} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Tiny swash echo */}
    <path d="M 26 22 Q 60 6 94 22" stroke={accent || fg} strokeWidth="6" strokeLinecap="round" fill="none"/>
  </svg>
);

// Symbol — knot (two interlocking shapes, infinity-ish, family bond)
const MarkKnot = ({ fg = '#f4efe5', accent, size = 120, style }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} style={style} aria-label="Haile mark">
    <path d="M 30 60 Q 30 30 50 30 Q 70 30 70 60 Q 70 90 90 90 Q 110 90 110 60 Q 110 30 90 30 Q 70 30 70 60 Q 70 90 50 90 Q 30 90 30 60 Z"
      stroke={fg} strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round"
      transform="translate(-10,0)"/>
  </svg>
);

Object.assign(window, { MarkRows, MarkBridge, MarkFamily, MarkFlow, MarkH, MarkKnot });

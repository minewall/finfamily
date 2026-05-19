// Haile Design Tokens — fonte única de verdade para o design system HTML
// Importado por todos os componentes via window.HaileTokens

const HaileTokens = {
  colors: {
    // Primary — Violeta Haile
    violet:       '#6366F1',
    violetLight:  '#9990FF',
    violetDark:   '#4F46E5',
    violetAlpha10:'rgba(99,102,241,0.10)',
    violetAlpha20:'rgba(99,102,241,0.20)',

    // Secondary — Teal AI
    teal:       '#06B6D4',
    tealLight:  '#22D3EE',
    tealDark:   '#0891B2',
    tealAlpha10:'rgba(6,182,212,0.10)',

    // Accent — Verde Prosperidade
    prosperity:      '#10B981',
    prosperityLight: '#34D399',
    prosperityDark:  '#059669',
    prosperityAlpha10:'rgba(16,185,129,0.10)',

    // Neutrals
    night:  '#0B1020',
    card:   '#121826',
    border: '#1E293B',
    slate:  '#334155',
    muted:  '#475569',
    mist:   '#94A3B8',
    cloud:  '#F8FAFC',
    white:  '#FFFFFF',

    // Alert
    alert:      '#C92764',
    alertAlpha: 'rgba(201,39,100,0.10)',

    // Warning
    warning:      '#F59E0B',
    warningAlpha: 'rgba(245,158,11,0.10)',
  },

  typography: {
    fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif',
    fontFamilyMono: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
    weights: { regular:400, medium:500, semibold:600, bold:700 },
    sizes: {
      xs:   12, sm:   14, base: 16, lg:   18,
      xl:   20, '2xl':24, '3xl':30, '4xl':36, '5xl':48,
    },
    lineHeights: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
  },

  spacing: {
    xs:   4,  sm:   8,  md:  12, lg:  16,
    xl:  24, '2xl':32, '3xl':48, '4xl':64,
  },

  radius: {
    sm:  8, md: 12, lg: 16, xl: 24, full: 9999,
  },

  shadows: {
    sm:  '0 1px 3px rgba(0,0,0,0.3)',
    md:  '0 4px 16px rgba(0,0,0,0.4)',
    lg:  '0 12px 40px rgba(0,0,0,0.5)',
    violet: '0 8px 32px rgba(99,102,241,0.35)',
  },

  animation: {
    fast:   '150ms',
    normal: '200ms',
    slow:   '300ms',
    ease: 'cubic-bezier(0.4,0,0.2,1)',
    easeOut: 'cubic-bezier(0,0,0.2,1)',
  },
};

window.HaileTokens = HaileTokens;

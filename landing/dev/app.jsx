// Main app: assembles the design canvas with all logo explorations.

const INK = '#1a1916';
const CREAM = '#f4efe5';
const PAPER = '#ebe5d7';
const MOSS = 'oklch(0.55 0.08 155)';
const CLAY = 'oklch(0.68 0.11 50)';
const SLATE = 'oklch(0.45 0.02 250)';

// ─── Artboard backgrounds ──────────────────────────────────────────────
const Plate = ({ bg, children, label, sublabel, padding = 32 }) => (
  <div style={{
    width: '100%', height: '100%',
    background: bg,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding, position: 'relative',
    fontFamily: 'Manrope, system-ui, sans-serif',
  }}>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      {children}
    </div>
    {(label || sublabel) && (
      <div style={{
        position: 'absolute', left: 18, bottom: 14,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 10, letterSpacing: 0.5,
        color: bg === INK ? 'rgba(244,239,229,0.45)' : 'rgba(26,25,22,0.45)',
        textTransform: 'uppercase',
      }}>
        {label}{sublabel && <span style={{ marginLeft: 8, opacity: 0.7 }}>· {sublabel}</span>}
      </div>
    )}
  </div>
);

// App-icon tile (rounded square, iOS-style)
const AppTile = ({ bg, children, radius = 56, size = 200 }) => (
  <div style={{
    width: size, height: size, background: bg, borderRadius: radius,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 18px 40px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.06)',
  }}>
    {children}
  </div>
);

// ─── Phone in-context preview ──────────────────────────────────────────
const PhoneContext = () => (
  <div style={{
    width: 200, height: 400, background: INK, borderRadius: 32,
    padding: 8, boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
    position: 'relative',
  }}>
    <div style={{
      width: '100%', height: '100%', background: CREAM, borderRadius: 26,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      padding: 22, position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: INK, marginBottom: 32 }}>
        <span>9:41</span>
        <span>●●●</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <HaileWordmark fg={INK} accent={MOSS} height={28}/>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(26,25,22,0.6)', marginBottom: 18,
        fontFamily: 'Manrope, sans-serif' }}>Olá, família Souza</div>

      <div style={{ background: INK, color: CREAM, borderRadius: 14, padding: 14, marginBottom: 10 }}>
        <div style={{ fontSize: 9, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Saldo conjunto</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>R$ 12.480</div>
        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 6 }}>+ R$ 320 este mês</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ background: 'rgba(26,25,22,0.06)', borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 9, color: 'rgba(26,25,22,0.6)' }}>Mercado</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>R$ 840</div>
        </div>
        <div style={{ background: 'rgba(26,25,22,0.06)', borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 9, color: 'rgba(26,25,22,0.6)' }}>Escola</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>R$ 1.240</div>
        </div>
      </div>

      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', justifyContent: 'space-around',
        borderTop: '1px solid rgba(26,25,22,0.08)', paddingTop: 12 }}>
        {['casa','metas','perfil'].map((t,i) => (
          <div key={t} style={{ fontSize: 9, color: i===0 ? INK : 'rgba(26,25,22,0.4)',
            fontWeight: i===0 ? 700 : 500 }}>{t}</div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Color swatches strip ──────────────────────────────────────────────
const PaletteCard = () => (
  <div style={{ width: '100%', height: '100%', background: CREAM, padding: 28,
    display: 'flex', flexDirection: 'column', gap: 14,
    fontFamily: 'Manrope, sans-serif' }}>
    <div style={{ fontSize: 11, color: 'rgba(26,25,22,0.5)', textTransform: 'uppercase',
      letterSpacing: 1, fontFamily: 'JetBrains Mono, monospace' }}>Paleta</div>
    {[
      { c: INK, label: 'Ink', hex: '#1a1916' },
      { c: CREAM, label: 'Cream', hex: '#f4efe5' },
      { c: MOSS, label: 'Moss', hex: 'oklch(.55 .08 155)' },
      { c: CLAY, label: 'Clay', hex: 'oklch(.68 .11 50)' },
    ].map((s) => (
      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 8, background: s.c,
          boxShadow: s.label === 'Cream' ? 'inset 0 0 0 1px rgba(26,25,22,0.08)' : 'none' }}/>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{s.label}</div>
          <div style={{ fontSize: 10, color: 'rgba(26,25,22,0.5)',
            fontFamily: 'JetBrains Mono, monospace' }}>{s.hex}</div>
        </div>
      </div>
    ))}
  </div>
);

// ─── Lockup helpers ────────────────────────────────────────────────────
const HorizontalLockup = ({ Mark, fg = CREAM, accent, scale = 1 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 18 * scale }}>
    <Mark fg={fg} accent={accent} size={68 * scale}/>
    <HaileClean fg={fg} accent={accent} height={48 * scale}/>
  </div>
);
const VerticalLockup = ({ Mark, fg = CREAM, accent, scale = 1 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * scale }}>
    <Mark fg={fg} accent={accent} size={92 * scale}/>
    <HaileClean fg={fg} accent={accent} height={42 * scale}/>
  </div>
);
const TaglineLockup = ({ fg = CREAM, accent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
    <HaileWordmark fg={fg} accent={accent} height={72}/>
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
      letterSpacing: 3, textTransform: 'uppercase',
      color: fg, opacity: 0.7,
    }}>gestão financeira familiar</div>
  </div>
);

// ─── Canvas ────────────────────────────────────────────────────────────
function App() {
  return (
    <DesignCanvas>
      <DCSection id="wordmarks" title="Wordmarks" subtitle="Variações tipográficas — base do sistema">
        <DCArtboard id="wm-reference" label="01 · Faithful + swash" width={460} height={300}>
          <Plate bg={INK} label="primary · dark">
            <HaileWordmark fg={CREAM} accent={CREAM} height={110}/>
          </Plate>
        </DCArtboard>

        <DCArtboard id="wm-light" label="02 · Faithful · light" width={460} height={300}>
          <Plate bg={CREAM} label="primary · light">
            <HaileWordmark fg={INK} accent={INK} height={110}/>
          </Plate>
        </DCArtboard>

        <DCArtboard id="wm-accent" label="03 · Swash em moss" width={460} height={300}>
          <Plate bg={INK} label="brand · accent">
            <HaileWordmark fg={CREAM} accent={MOSS} height={110}/>
          </Plate>
        </DCArtboard>

        <DCArtboard id="wm-clean" label="04 · Sem swash" width={460} height={300}>
          <Plate bg={INK} label="alt · clean">
            <HaileClean fg={CREAM} height={110}/>
          </Plate>
        </DCArtboard>

        <DCArtboard id="wm-subtle" label="05 · Swash sutil" width={460} height={300}>
          <Plate bg={INK} label="alt · subtle">
            <HaileSubtleSwash fg={CREAM} accent={CLAY} height={110}/>
          </Plate>
        </DCArtboard>

        <DCArtboard id="wm-lowercase" label="06 · Lowercase amigável" width={460} height={300}>
          <Plate bg={CREAM} label="alt · lowercase">
            <HaileLowercase fg={INK} accent={MOSS} height={90}/>
          </Plate>
        </DCArtboard>

        <DCArtboard id="wm-growth" label="07 · Growth · alta narrativa" width={500} height={300}>
          <Plate bg={INK} label="campaign · growth">
            <HaileGrowth fg={CREAM} accent={MOSS} height={120}/>
          </Plate>
        </DCArtboard>
      </DCSection>

      <DCSection id="marks" title="Marcas / monogramas" subtitle="Símbolos isolados para favicons, avatares, splash">
        <DCArtboard id="mk-h" label="A · H + swash" width={280} height={280}>
          <Plate bg={INK} padding={24}>
            <MarkH fg={CREAM} accent={CREAM} size={160}/>
          </Plate>
        </DCArtboard>

        <DCArtboard id="mk-bridge" label="B · Bridge" width={280} height={280}>
          <Plate bg={INK} padding={24}>
            <MarkBridge fg={CREAM} accent={MOSS} size={160}/>
          </Plate>
        </DCArtboard>

        <DCArtboard id="mk-rows" label="C · Rows (família)" width={280} height={280}>
          <Plate bg={INK} padding={24}>
            <MarkRows fg={CREAM} accent={CREAM} size={160}/>
          </Plate>
        </DCArtboard>

        <DCArtboard id="mk-family" label="D · Arco familiar" width={280} height={280}>
          <Plate bg={INK} padding={24}>
            <MarkFamily fg={CREAM} accent={CLAY} size={160}/>
          </Plate>
        </DCArtboard>

        <DCArtboard id="mk-flow" label="E · Fluxo" width={280} height={280}>
          <Plate bg={INK} padding={24}>
            <MarkFlow fg={CREAM} accent={MOSS} size={160}/>
          </Plate>
        </DCArtboard>
      </DCSection>

      <DCSection id="appicons" title="App icons" subtitle="Aplicação em tile iOS · raio 22%">
        <DCArtboard id="ai-dark-h" label="iOS · ink + H" width={260} height={260}>
          <Plate bg={PAPER} padding={28}>
            <AppTile bg={INK}><MarkH fg={CREAM} accent={CREAM} size={120}/></AppTile>
          </Plate>
        </DCArtboard>
        {AppIconBoard({ id: 'ai-cream-h', label: 'iOS · cream + H', tileBg: CREAM, fg: INK, accent: INK, Mark: MarkH })}
        {AppIconBoard({ id: 'ai-moss-h',  label: 'iOS · moss + H',  tileBg: MOSS,  fg: CREAM, accent: CREAM, Mark: MarkH })}
        {AppIconBoard({ id: 'ai-clay-h',  label: 'iOS · clay + H',  tileBg: CLAY,  fg: CREAM, accent: CREAM, Mark: MarkH })}
        {AppIconBoard({ id: 'ai-ink-bridge', label: 'iOS · ink + bridge', tileBg: INK, fg: CREAM, accent: MOSS, Mark: MarkBridge })}
        {AppIconBoard({ id: 'ai-cream-bridge', label: 'iOS · cream + bridge', tileBg: CREAM, fg: INK, accent: MOSS, Mark: MarkBridge })}
      </DCSection>

      <DCSection id="lockups" title="Lockups" subtitle="Combinação marca + wordmark">
        <DCArtboard id="lk-horiz" label="Horizontal · ink" width={520} height={260}>
          <Plate bg={INK}>
            <HorizontalLockup Mark={MarkH} fg={CREAM} accent={CREAM}/>
          </Plate>
        </DCArtboard>
        <DCArtboard id="lk-horiz-moss" label="Horizontal · moss accent" width={520} height={260}>
          <Plate bg={CREAM}>
            <HorizontalLockup Mark={MarkBridge} fg={INK} accent={MOSS}/>
          </Plate>
        </DCArtboard>
        <DCArtboard id="lk-vert" label="Vertical · centrado" width={360} height={360}>
          <Plate bg={INK}>
            <VerticalLockup Mark={MarkBridge} fg={CREAM} accent={MOSS}/>
          </Plate>
        </DCArtboard>
        <DCArtboard id="lk-tagline" label="Com tagline" width={500} height={300}>
          <Plate bg={INK}>
            <TaglineLockup fg={CREAM} accent={MOSS}/>
          </Plate>
        </DCArtboard>
      </DCSection>

      <DCSection id="context" title="Em contexto" subtitle="A logomarca aplicada">
        <DCArtboard id="ctx-app" label="App · home" width={260} height={460}>
          <Plate bg={PAPER} padding={20}><PhoneContext/></Plate>
        </DCArtboard>

        <DCArtboard id="ctx-splash" label="Splash · onboarding" width={260} height={460}>
          <div style={{ width: '100%', height: '100%', background: INK,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VerticalLockup Mark={MarkBridge} fg={CREAM} accent={MOSS} scale={0.85}/>
          </div>
        </DCArtboard>

        <DCArtboard id="ctx-card" label="Cartão · branding" width={420} height={260}>
          <div style={{ width: '100%', height: '100%', background: INK, padding: 28,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            fontFamily: 'Manrope, sans-serif' }}>
            <HaileWordmark fg={CREAM} accent={MOSS} height={56}/>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(244,239,229,0.5)',
                fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1,
                textTransform: 'uppercase', marginBottom: 6 }}>família · souza</div>
              <div style={{ fontSize: 18, color: CREAM, fontWeight: 600 }}>•••• 4821</div>
            </div>
          </div>
        </DCArtboard>

        <DCArtboard id="palette" label="Paleta" width={300} height={300}>
          <PaletteCard/>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

// Helper to keep app-icon artboards short
function AppIconBoard({ id, label, tileBg, fg, accent, Mark }) {
  return (
    <DCArtboard id={id} label={label} width={260} height={260}>
      <Plate bg={tileBg === INK || tileBg === MOSS || tileBg === CLAY ? PAPER : INK} padding={28}>
        <AppTile bg={tileBg}>
          <Mark fg={fg} accent={accent} size={120}/>
        </AppTile>
      </Plate>
    </DCArtboard>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);

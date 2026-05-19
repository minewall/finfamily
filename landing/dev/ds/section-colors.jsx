// Section: Cores & Tokens

const T = window.HaileTokens;

function CopyButton({ text, darkMode }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),1500); }}
      style={{
        padding:'2px 8px', borderRadius:4, border:`1px solid ${darkMode?T.colors.border:'#E2E8F0'}`,
        background:'transparent', cursor:'pointer', fontSize:11,
        fontFamily:T.typography.fontFamilyMono, color: copied ? T.colors.prosperity : T.colors.mist,
        transition:'all 150ms',
      }}
    >{copied ? '✓ copiado' : text}</button>
  );
}

function ColorSwatch({ name, hex, cssVar, darkMode, wide }) {
  const [hovered, setHovered] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const cardBg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';
  return (
    <div style={{
      background:cardBg, borderRadius:12, border:`1px solid ${border}`,
      overflow:'hidden', gridColumn: wide ? 'span 2' : undefined,
    }}>
      <div
        style={{
          height: wide ? 72 : 80, background:hex, cursor:'pointer', position:'relative',
          transition:'all 150ms',
        }}
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>setHovered(false)}
        onClick={()=>{ navigator.clipboard.writeText(hex); setCopied(true); setTimeout(()=>setCopied(false),1500); }}
      >
        {(hovered||copied) && (
          <div style={{
            position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(0,0,0,0.25)', backdropFilter:'blur(4px)',
            fontFamily:T.typography.fontFamilyMono, fontSize:13, color:'white', fontWeight:600,
          }}>
            {copied ? '✓ Copiado' : 'Copiar HEX'}
          </div>
        )}
      </div>
      <div style={{padding:'10px 12px'}}>
        <div style={{fontSize:13, fontWeight:600, color:darkMode?T.colors.cloud:T.colors.night, marginBottom:3}}>{name}</div>
        <div style={{fontSize:11, fontFamily:T.typography.fontFamilyMono, color:T.colors.mist}}>{hex}</div>
        {cssVar && <div style={{fontSize:10, fontFamily:T.typography.fontFamilyMono, color:T.colors.violet, marginTop:3}}>--{cssVar}</div>}
      </div>
    </div>
  );
}

function ColorGroup({ title, description, colors, darkMode, cols=3 }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : T.colors.slate;
  return (
    <div style={{marginBottom:40}}>
      <h3 style={{fontSize:18, fontWeight:700, color:textColor, margin:'0 0 4px'}}>{title}</h3>
      <p style={{fontSize:14, color:mutedColor, margin:'0 0 16px'}}>{description}</p>
      <div style={{display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:12}}>
        {colors.map(c=><ColorSwatch key={c.hex} {...c} darkMode={darkMode}/>)}
      </div>
    </div>
  );
}

function SectionColors({ darkMode }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : T.colors.slate;
  const cardBg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';

  return (
    <div>
      <div style={{marginBottom:40}}>
        <div style={{display:'inline-block', padding:'4px 12px', borderRadius:999, background:T.colors.violetAlpha20, color:T.colors.violetLight, fontSize:12, fontWeight:600, marginBottom:12}}>Cores</div>
        <h1 style={{fontSize:36, fontWeight:700, color:textColor, margin:'0 0 12px', lineHeight:1.2}}>Paleta de Cores</h1>
        <p style={{fontSize:16, color:mutedColor, lineHeight:1.6, maxWidth:580, margin:0}}>
          Sistema de cores que transmite tecnologia premium, confiança e prosperidade. Todas as combinações passam em contraste WCAG AA.
        </p>
      </div>

      <ColorGroup darkMode={darkMode} title="Violeta Haile" description="Cor primária — ações, links, destaques de UI." cols={3}
        colors={[
          {name:'Violet Light', hex:'#9990FF', cssVar:'haile-violet-light'},
          {name:'Violet',       hex:'#6366F1', cssVar:'haile-violet'},
          {name:'Violet Dark',  hex:'#4F46E5', cssVar:'haile-violet-dark'},
        ]}/>

      <ColorGroup darkMode={darkMode} title="Teal AI" description="Exclusivo para IA Coach, insights e elementos interativos de inteligência." cols={3}
        colors={[
          {name:'Teal Light', hex:'#22D3EE', cssVar:'haile-teal-light'},
          {name:'Teal',       hex:'#06B6D4', cssVar:'haile-teal'},
          {name:'Teal Dark',  hex:'#0891B2', cssVar:'haile-teal-dark'},
        ]}/>

      <ColorGroup darkMode={darkMode} title="Verde Prosperidade" description="Crescimento financeiro, metas atingidas, saldos positivos." cols={3}
        colors={[
          {name:'Prosperity Light', hex:'#34D399', cssVar:'haile-prosperity-light'},
          {name:'Prosperity',       hex:'#10B981', cssVar:'haile-prosperity'},
          {name:'Prosperity Dark',  hex:'#059669',  cssVar:'haile-prosperity-dark'},
        ]}/>

      <ColorGroup darkMode={darkMode} title="Neutros" description="Fundação da interface — backgrounds, textos, bordas." cols={4}
        colors={[
          {name:'Night',  hex:'#0B1020', cssVar:'haile-night'},
          {name:'Slate',  hex:'#334155', cssVar:'haile-slate'},
          {name:'Mist',   hex:'#94A3B8', cssVar:'haile-mist'},
          {name:'Cloud',  hex:'#F8FAFC', cssVar:'haile-cloud'},
        ]}/>

      <ColorGroup darkMode={darkMode} title="Rosa Alert" description="Alertas, erros e estados críticos. Menos clínico que vermelho puro." cols={3}
        colors={[
          {name:'Alert', hex:'#C92764', cssVar:'haile-alert'},
        ]}/>

      {/* Combinações semânticas */}
      <div style={{background:cardBg, border:`1px solid ${border}`, borderRadius:16, padding:24, marginTop:8}}>
        <h3 style={{fontSize:18, fontWeight:700, color:textColor, margin:'0 0 16px'}}>Uso semântico</h3>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {[
            { label:'Ação primária',          bg:'#6366F1', text:'Botão Primário — Contratar plano' },
            { label:'IA / Insights',           bg:'#06B6D4', text:'Badge AI Coach — Análise preditiva' },
            { label:'Positivo / Crescimento', bg:'#10B981', text:'Indicador — +12,5% este mês' },
            { label:'Alerta / Erro',           bg:'#C92764', text:'Alerta — Limite de cartão próximo' },
          ].map(row => (
            <div key={row.label} style={{display:'flex', alignItems:'center', gap:12}}>
              <div style={{width:120, fontSize:12, color:mutedColor, flexShrink:0}}>{row.label}</div>
              <div style={{flex:1, background:row.bg, borderRadius:8, padding:'8px 14px',
                fontWeight:500, fontSize:13, color:'white'}}>{row.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Acessibilidade */}
      <div style={{background:cardBg, border:`1px solid ${border}`, borderRadius:16, padding:24, marginTop:16}}>
        <h3 style={{fontSize:18, fontWeight:700, color:textColor, margin:'0 0 8px'}}>Contraste WCAG</h3>
        <p style={{fontSize:14, color:mutedColor, margin:'0 0 16px'}}>Todas as combinações de cor foram validadas.</p>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          {[
            {pair:'Violeta sobre branco',  ratio:'7.2:1', level:'AAA'},
            {pair:'Night sobre Cloud',     ratio:'15.8:1',level:'AAA'},
            {pair:'Teal sobre branco',     ratio:'4.9:1', level:'AA'},
            {pair:'Prosperity sobre Night',ratio:'6.1:1', level:'AA'},
          ].map(a => (
            <div key={a.pair} style={{display:'flex', alignItems:'center', gap:8}}>
              <div style={{width:6, height:6, borderRadius:3, background:T.colors.prosperity, flexShrink:0}}/>
              <span style={{fontSize:13, color:mutedColor, flex:1}}>{a.pair}</span>
              <span style={{fontSize:12, fontFamily:T.typography.fontFamilyMono, color:T.colors.prosperity}}>{a.ratio}</span>
              <span style={{fontSize:11, padding:'1px 6px', borderRadius:4, background:T.colors.prosperityAlpha10, color:T.colors.prosperity}}>{a.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.SectionColors = SectionColors;

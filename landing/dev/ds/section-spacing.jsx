// Section: Espaçamento, Raio, Sombras, Tokens

const T = window.HaileTokens;

function TokenRow({ name, value, visual, darkMode }) {
  const [copied, setCopied] = React.useState(false);
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';
  return (
    <div style={{background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'10px 16px',
      display:'flex', alignItems:'center', gap:16}}>
      {visual}
      <span style={{fontFamily:T.typography.fontFamilyMono, fontSize:13, color:T.colors.violet, flexShrink:0}}>--{name}</span>
      <span style={{flex:1, fontSize:13, color:mutedColor, fontFamily:T.typography.fontFamilyMono}}>{value}</span>
      <button onClick={()=>{navigator.clipboard.writeText(`var(--${name})`);setCopied(true);setTimeout(()=>setCopied(false),1400);}}
        style={{padding:'2px 8px', borderRadius:4, border:`1px solid ${border}`, background:'transparent',
          cursor:'pointer', fontSize:11, fontFamily:T.typography.fontFamilyMono,
          color:copied?T.colors.prosperity:mutedColor, transition:'color 150ms'}}>
        {copied?'✓':'copiar'}
      </button>
    </div>
  );
}

function SectionSpacing({ darkMode }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';
  const visualBg = darkMode ? T.colors.violetAlpha20 : '#EEF2FF';

  return (
    <div>
      <div style={{marginBottom:40}}>
        <div style={{display:'inline-block', padding:'4px 12px', borderRadius:999, background:T.colors.violetAlpha20, color:T.colors.violetLight, fontSize:12, fontWeight:600, marginBottom:12}}>Fundações</div>
        <h1 style={{fontSize:36, fontWeight:700, color:textColor, margin:'0 0 12px'}}>Espaçamento & Tokens</h1>
        <p style={{fontSize:16, color:mutedColor, lineHeight:1.6, maxWidth:580, margin:0}}>
          Tokens de espaçamento, raio, sombras e animação — a gramática visual da interface.
        </p>
      </div>

      {/* Spacing scale visual */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px'}}>Espaçamento</h2>
      <div style={{background:bg, border:`1px solid ${border}`, borderRadius:16, padding:24, marginBottom:32}}>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {Object.entries(T.spacing).map(([key, val]) => (
            <div key={key} style={{display:'flex', alignItems:'center', gap:16}}>
              <span style={{width:40, fontSize:12, fontFamily:T.typography.fontFamilyMono, color:T.colors.violet}}>{key}</span>
              <div style={{width:val*2, height:20, background:T.colors.violet, opacity:0.7, borderRadius:3, minWidth:4, flexShrink:0}}/>
              <span style={{fontSize:12, fontFamily:T.typography.fontFamilyMono, color:mutedColor}}>{val}px</span>
              <span style={{fontSize:11, color:mutedColor, opacity:0.6}}>--spacing-{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px'}}>Border Radius</h2>
      <div style={{display:'flex', gap:16, marginBottom:32, flexWrap:'wrap'}}>
        {Object.entries(T.radius).filter(([k])=>k!=='full').map(([key, val]) => (
          <div key={key} style={{textAlign:'center'}}>
            <div style={{
              width:80, height:80, background:darkMode ? T.colors.violetAlpha20 : '#EEF2FF',
              border:`2px solid ${T.colors.violet}`, borderRadius:val,
              margin:'0 auto 8px',
            }}/>
            <div style={{fontSize:12, fontFamily:T.typography.fontFamilyMono, color:T.colors.violet}}>{key}</div>
            <div style={{fontSize:11, color:mutedColor}}>{val}px</div>
          </div>
        ))}
        <div style={{textAlign:'center'}}>
          <div style={{
            width:80, height:80, background:darkMode ? T.colors.violetAlpha20 : '#EEF2FF',
            border:`2px solid ${T.colors.violet}`, borderRadius:9999,
            margin:'0 auto 8px',
          }}/>
          <div style={{fontSize:12, fontFamily:T.typography.fontFamilyMono, color:T.colors.violet}}>full</div>
          <div style={{fontSize:11, color:mutedColor}}>9999px</div>
        </div>
      </div>

      {/* Shadows */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px'}}>Sombras</h2>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:32}}>
        {Object.entries(T.shadows).map(([key, val]) => (
          <div key={key} style={{padding:24, background:bg, borderRadius:12, boxShadow:val, textAlign:'center'}}>
            <div style={{fontSize:13, fontWeight:600, color:textColor, marginBottom:4}}>shadow-{key}</div>
            <div style={{fontSize:11, fontFamily:T.typography.fontFamilyMono, color:mutedColor, wordBreak:'break-all'}}>{val}</div>
          </div>
        ))}
      </div>

      {/* Animation */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px'}}>Animação</h2>
      <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:32}}>
        {[
          {name:'duration-fast',   value:'150ms', use:'Hover, focus rings, micro-feedback'},
          {name:'duration-normal', value:'200ms', use:'Modais, dropdowns, transições padrão'},
          {name:'duration-slow',   value:'300ms', use:'Slides, onboarding, animações maiores'},
        ].map(row => (
          <div key={row.name} style={{background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'12px 16px',
            display:'flex', alignItems:'center', gap:16}}>
            <span style={{fontFamily:T.typography.fontFamilyMono, fontSize:13, color:T.colors.teal, width:180, flexShrink:0}}>--{row.name}</span>
            <span style={{fontFamily:T.typography.fontFamilyMono, fontSize:13, color:mutedColor, width:60}}>{row.value}</span>
            <span style={{fontSize:13, color:mutedColor}}>{row.use}</span>
          </div>
        ))}
      </div>

      {/* CSS vars reference */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px'}}>Referência CSS</h2>
      <div style={{background:darkMode?'#0D1117':'#1E293B', borderRadius:16, padding:24, overflow:'auto'}}>
        <pre style={{margin:0, fontFamily:T.typography.fontFamilyMono, fontSize:12, color:'#94A3B8', lineHeight:1.8}}>
{`:root {
  /* Cores */
  --haile-violet:        #6366F1;
  --haile-teal:          #06B6D4;
  --haile-prosperity:    #10B981;
  --haile-night:         #0B1020;
  --haile-cloud:         #F8FAFC;
  --haile-alert:         #C92764;

  /* Espaçamento */
  --spacing-xs:  4px;    --spacing-sm:  8px;
  --spacing-md:  12px;   --spacing-lg:  16px;
  --spacing-xl:  24px;   --spacing-2xl: 32px;

  /* Raio */
  --radius-sm:  8px;   --radius-md:  12px;
  --radius-lg:  16px;  --radius-xl:  24px;

  /* Tipografia */
  --font-family: 'DM Sans', system-ui, sans-serif;
  --font-size-base: 16px;
}`}
        </pre>
      </div>
    </div>
  );
}

window.SectionSpacing = SectionSpacing;

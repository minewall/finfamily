// Section: Componentes UI — Botões, Inputs, Cards, Badges

const T = window.HaileTokens;

function DSBtn({ variant='primary', size='md', disabled, children }) {
  const [hov, setHov] = React.useState(false);
  const bases = {
    primary:   { bg:T.colors.violet,      fg:'white', hoverBg:T.colors.violetDark,  border:'transparent' },
    secondary: { bg:T.colors.teal,        fg:'white', hoverBg:T.colors.tealDark,    border:'transparent' },
    ghost:     { bg:'transparent',        fg:T.colors.violet, hoverBg:T.colors.violetAlpha10, border:T.colors.violet },
    danger:    { bg:T.colors.alert,       fg:'white', hoverBg:'#a8204f',            border:'transparent' },
    muted:     { bg:'rgba(255,255,255,0.06)', fg:T.colors.mist, hoverBg:'rgba(255,255,255,0.1)', border:T.colors.border },
  };
  const sizes = {
    sm: { px:12, py:6, fs:13, radius:8 },
    md: { px:18, py:9, fs:14, radius:10 },
    lg: { px:24, py:12, fs:15, radius:12 },
  };
  const v = bases[variant]; const s = sizes[size];
  return (
    <button disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        padding:`${s.py}px ${s.px}px`, borderRadius:s.radius, fontSize:s.fs, fontWeight:500,
        fontFamily:T.typography.fontFamily, cursor:disabled?'not-allowed':'pointer',
        background: hov&&!disabled ? v.hoverBg : v.bg,
        color: disabled ? 'rgba(255,255,255,0.3)' : v.fg,
        border:`1px solid ${v.border}`, opacity:disabled?0.5:1,
        transition:'all 150ms', display:'inline-flex', alignItems:'center', gap:6,
        boxShadow: hov&&variant==='primary'&&!disabled ? T.shadows.violet : 'none',
      }}>{children}</button>
  );
}

function Codeblock({ code, darkMode }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div style={{position:'relative', marginTop:12}}>
      <pre style={{
        background:'#0D1117', borderRadius:10, padding:'14px 16px', overflow:'auto', margin:0,
        fontFamily:T.typography.fontFamilyMono, fontSize:12, color:'#94A3B8', lineHeight:1.7,
      }}>{code}</pre>
      <button onClick={()=>{navigator.clipboard.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),1400);}}
        style={{position:'absolute', top:8, right:8, padding:'3px 8px', borderRadius:4, border:`1px solid ${T.colors.border}`,
          background:'transparent', cursor:'pointer', fontSize:11, fontFamily:T.typography.fontFamilyMono,
          color:copied?T.colors.prosperity:T.colors.mist}}>
        {copied?'✓':'copiar'}
      </button>
    </div>
  );
}

function SubSection({ title, darkMode, children }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const border = darkMode ? T.colors.border : '#E2E8F0';
  return (
    <div style={{marginBottom:48}}>
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 20px', paddingBottom:12,
        borderBottom:`1px solid ${border}`}}>{title}</h2>
      {children}
    </div>
  );
}

function SectionComponents({ darkMode }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';
  const inputBg = darkMode ? '#0D1424' : '#F8FAFC';

  return (
    <div>
      <div style={{marginBottom:40}}>
        <div style={{display:'inline-block', padding:'4px 12px', borderRadius:999, background:T.colors.violetAlpha20, color:T.colors.violetLight, fontSize:12, fontWeight:600, marginBottom:12}}>Componentes</div>
        <h1 style={{fontSize:36, fontWeight:700, color:textColor, margin:'0 0 12px'}}>Componentes UI</h1>
        <p style={{fontSize:16, color:mutedColor, lineHeight:1.6, maxWidth:560, margin:0}}>
          Biblioteca de componentes base. Cada um com variantes, estados e snippet copiável.
        </p>
      </div>

      {/* BOTÕES */}
      <SubSection title="Botões" darkMode={darkMode}>
        <div style={{background:bg, border:`1px solid ${border}`, borderRadius:16, padding:24, marginBottom:12}}>
          <div style={{fontSize:13, color:mutedColor, marginBottom:14}}>Variantes</div>
          <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center'}}>
            <DSBtn variant="primary">Primário</DSBtn>
            <DSBtn variant="secondary">Secundário</DSBtn>
            <DSBtn variant="ghost">Outline</DSBtn>
            <DSBtn variant="danger">Perigo</DSBtn>
            <DSBtn variant="muted">Muted</DSBtn>
            <DSBtn variant="primary" disabled>Disabled</DSBtn>
          </div>
        </div>
        <div style={{background:bg, border:`1px solid ${border}`, borderRadius:16, padding:24, marginBottom:12}}>
          <div style={{fontSize:13, color:mutedColor, marginBottom:14}}>Tamanhos</div>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <DSBtn variant="primary" size="sm">Small</DSBtn>
            <DSBtn variant="primary" size="md">Medium</DSBtn>
            <DSBtn variant="primary" size="lg">Large</DSBtn>
          </div>
        </div>
        <Codeblock darkMode={darkMode} code={`.btn-primary {
  background: #6366F1;
  color: white;
  padding: 9px 18px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-primary:hover {
  background: #4F46E5;
  box-shadow: 0 8px 32px rgba(99,102,241,0.35);
}`}/>
      </SubSection>

      {/* INPUTS */}
      <SubSection title="Inputs" darkMode={darkMode}>
        <div style={{background:bg, border:`1px solid ${border}`, borderRadius:16, padding:24, marginBottom:12}}>
          <div style={{display:'flex', flexDirection:'column', gap:16, maxWidth:400}}>
            {[
              {label:'Campo normal', placeholder:'R$ 0,00', type:'text'},
              {label:'Com erro', placeholder:'email@exemplo.com', error:true},
            ].map(inp => (
              <div key={inp.label}>
                <label style={{display:'block', fontSize:13, fontWeight:500, color:textColor, marginBottom:6}}>{inp.label}</label>
                <input type={inp.type||'text'} placeholder={inp.placeholder}
                  style={{
                    width:'100%', padding:'10px 14px', borderRadius:10, fontSize:14,
                    fontFamily:T.typography.fontFamily,
                    background:inputBg, color:textColor,
                    border:`1px solid ${inp.error ? T.colors.alert : border}`,
                    outline:'none', boxSizing:'border-box',
                    boxShadow: inp.error ? `0 0 0 3px ${T.colors.alertAlpha}` : 'none',
                  }}/>
                {inp.error && <div style={{fontSize:12, color:T.colors.alert, marginTop:4}}>E-mail inválido</div>}
              </div>
            ))}
          </div>
        </div>
        <Codeblock darkMode={darkMode} code={`.input {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(30,41,59,1);
  background: #0D1424;
  color: #F8FAFC;
  font-size: 14px;
  transition: all 150ms;
}
.input:focus {
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
}`}/>
      </SubSection>

      {/* BADGES */}
      <SubSection title="Badges" darkMode={darkMode}>
        <div style={{background:bg, border:`1px solid ${border}`, borderRadius:16, padding:24, marginBottom:12}}>
          <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center'}}>
            {[
              {label:'Default',    bg:T.colors.violetAlpha10,       fg:T.colors.violetLight},
              {label:'AI Coach',   bg:T.colors.tealAlpha10,         fg:T.colors.teal},
              {label:'Positivo',   bg:T.colors.prosperityAlpha10,   fg:T.colors.prosperity},
              {label:'Alerta',     bg:T.colors.alertAlpha,          fg:T.colors.alert},
              {label:'Warning',    bg:T.colors.warningAlpha,        fg:T.colors.warning},
            ].map(b => (
              <span key={b.label} style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'4px 12px', borderRadius:999, fontSize:12, fontWeight:600,
                background:b.bg, color:b.fg,
              }}>{b.label}</span>
            ))}
          </div>
          <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginTop:16}}>
            {[
              {label:'✦  AI Coach',      bg:T.colors.tealAlpha10,       fg:T.colors.teal,       icon:true},
              {label:'↑ +12,5%',         bg:T.colors.prosperityAlpha10, fg:T.colors.prosperity},
              {label:'↓ -3,2%',          bg:T.colors.alertAlpha,        fg:T.colors.alert},
              {label:'Novo',             bg:T.colors.violetAlpha20,     fg:T.colors.violetLight},
            ].map(b => (
              <span key={b.label} style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:600,
                background:b.bg, color:b.fg,
              }}>{b.label}</span>
            ))}
          </div>
        </div>
      </SubSection>

      {/* CARDS */}
      <SubSection title="Cards" darkMode={darkMode}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:12}}>
          {/* Card padrão */}
          <div style={{background:bg, border:`1px solid ${border}`, borderRadius:16, padding:24,
            transition:'all 200ms', cursor:'default'}}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow=T.shadows.md; e.currentTarget.style.transform='translateY(-2px)';}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none';}}>
            <div style={{width:40, height:40, borderRadius:10, background:T.colors.violetAlpha20, marginBottom:16, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.colors.violet} strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </div>
            <div style={{fontSize:16, fontWeight:600, color:textColor, marginBottom:6}}>Card Padrão</div>
            <div style={{fontSize:13, color:mutedColor, lineHeight:1.6}}>Elemento base da interface. Hover eleva levemente.</div>
          </div>
          {/* Card gradient */}
          <div style={{background:'linear-gradient(135deg,#6366F1,#4F46E5)', borderRadius:16, padding:24, position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', top:-20, right:-20, width:120, height:120, background:'rgba(255,255,255,0.07)', borderRadius:'50%', filter:'blur(30px)'}}/>
            <div style={{position:'relative'}}>
              <div style={{fontSize:13, color:'rgba(255,255,255,0.65)', marginBottom:4}}>Patrimônio Total</div>
              <div style={{fontSize:30, fontWeight:700, color:'white', fontVariantNumeric:'tabular-nums', marginBottom:8}}>R$ 145.800</div>
              <span style={{fontSize:12, padding:'3px 10px', borderRadius:999, background:'rgba(16,185,129,0.25)', color:'#34D399', fontWeight:600}}>↑ +8,2%</span>
            </div>
          </div>
        </div>
      </SubSection>
    </div>
  );
}

window.SectionComponents = SectionComponents;

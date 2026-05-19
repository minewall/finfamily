// Section: Overview + Logo + Motion

const T = window.HaileTokens;

function SectionOverview({ darkMode }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';

  return (
    <div>
      {/* Hero */}
      <div style={{
        background:'linear-gradient(135deg, #0B1020 0%, #1a1040 100%)',
        borderRadius:24, padding:48, marginBottom:40, position:'relative', overflow:'hidden',
      }}>
        <div style={{position:'absolute',top:-40,right:-40,width:280,height:280,
          background:T.colors.violetAlpha10, borderRadius:'50%', filter:'blur(60px)'}}/>
        <div style={{position:'absolute',bottom:-40,left:-20,width:200,height:200,
          background:'rgba(6,182,212,0.08)', borderRadius:'50%', filter:'blur(50px)'}}/>
        <div style={{position:'relative'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 14px',borderRadius:999,
            background:T.colors.violetAlpha20,marginBottom:20}}>
            <span style={{width:6,height:6,borderRadius:3,background:T.colors.prosperity,display:'block'}}/>
            <span style={{fontSize:12,color:T.colors.violetLight,fontWeight:600}}>Design System v1.0 · Maio 2026</span>
          </div>
          <h1 style={{fontSize:42,fontWeight:700,color:T.colors.cloud,margin:'0 0 12px',lineHeight:1.15}}>
            Haile<br/>Design System
          </h1>
          <p style={{fontSize:16,color:T.colors.mist,lineHeight:1.65,maxWidth:480,margin:'0 0 28px'}}>
            O vocabulário visual da plataforma financeira familiar mais inteligente do Brasil.
            Baseado em DM Sans, violeta premium e princípios de acessibilidade WCAG AA.
          </p>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            {[
              {label:'DM Sans', sublabel:'Fonte principal'},
              {label:'shadcn/ui', sublabel:'Base de componentes'},
              {label:'Lucide', sublabel:'Iconografia'},
              {label:'WCAG AA', sublabel:'Acessibilidade'},
            ].map(pill => (
              <div key={pill.label} style={{padding:'8px 16px',borderRadius:10,
                background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}>
                <div style={{fontSize:13,fontWeight:600,color:T.colors.cloud}}>{pill.label}</div>
                <div style={{fontSize:11,color:T.colors.mist}}>{pill.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Princípios */}
      <h2 style={{fontSize:22,fontWeight:700,color:textColor,margin:'0 0 16px'}}>Princípios de design</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:40}}>
        {[
          {emoji:'✦',title:'Premium sem excesso',desc:'Visual refinado. Cada elemento tem propósito claro. Whitespace generoso.'},
          {emoji:'◎',title:'Dark mode first',desc:'Interface desenhada para o escuro — mais confortável para análise financeira noturna.'},
          {emoji:'→',title:'Números como protagonistas',desc:'Valores financeiros em destaque. Tabular-nums para alinhamento perfeito.'},
          {emoji:'⬡',title:'IA integrada com sutileza',desc:'Teal exclusivo para IA. A inteligência não grita — ela guia.'},
        ].map(p => (
          <div key={p.title} style={{background:bg, border:`1px solid ${border}`, borderRadius:14, padding:22}}>
            <div style={{fontSize:24, marginBottom:10}}>{p.emoji}</div>
            <div style={{fontSize:15, fontWeight:700, color:textColor, marginBottom:6}}>{p.title}</div>
            <div style={{fontSize:13, color:mutedColor, lineHeight:1.6}}>{p.desc}</div>
          </div>
        ))}
      </div>

      {/* Stack */}
      <h2 style={{fontSize:22,fontWeight:700,color:textColor,margin:'0 0 16px'}}>Stack tecnológica</h2>
      <div style={{background:bg,border:`1px solid ${border}`,borderRadius:16,overflow:'hidden',marginBottom:40}}>
        {[
          {camada:'Framework',  tech:'Next.js 14 (App Router)',     color:T.colors.cloud},
          {camada:'Styling',    tech:'Tailwind CSS v4',              color:T.colors.violet},
          {camada:'Componentes',tech:'shadcn/ui + Radix UI',         color:T.colors.teal},
          {camada:'Ícones',     tech:'Lucide Icons',                 color:T.colors.prosperity},
          {camada:'Motion',     tech:'Framer Motion',                color:T.colors.warning},
          {camada:'Charts',     tech:'Apache ECharts',               color:'#F97316'},
          {camada:'Fonte',      tech:'DM Sans (Google Fonts)',       color:T.colors.mist},
        ].map((row,i) => (
          <div key={row.camada} style={{
            display:'flex', alignItems:'center', gap:16, padding:'12px 20px',
            borderBottom: i<6 ? `1px solid ${border}` : 'none',
            background: i%2===1 ? (darkMode?'rgba(255,255,255,0.02)':'#FAFAFA') : 'transparent',
          }}>
            <span style={{width:120,fontSize:12,fontWeight:600,color:mutedColor,textTransform:'uppercase',letterSpacing:0.5,flexShrink:0}}>{row.camada}</span>
            <span style={{fontSize:14,fontWeight:500,color:row.color}}>{row.tech}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionLogo({ darkMode }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';

  // Logo plate — bg color + which wordmark SVG to show
  const LogoPlate = ({ plateBg, src, label, padding='28px 36px' }) => (
    <div style={{background:plateBg, borderRadius:14, padding, display:'flex',
      flexDirection:'column', gap:16, minHeight:120, justifyContent:'center'}}>
      <img src={src} alt="Haile" style={{height:36, objectFit:'contain', objectPosition:'left'}}/>
      <div style={{fontSize:10, fontFamily:T.typography.fontFamilyMono,
        color: plateBg === T.colors.cloud || plateBg === '#FFFFFF' || plateBg === '#EEF2FF'
          ? 'rgba(26,25,22,0.35)' : 'rgba(255,255,255,0.35)',
        letterSpacing:1, textTransform:'uppercase'}}>{label}</div>
    </div>
  );

  const MarkPlate = ({ plateBg, src, label }) => (
    <div style={{background:plateBg, borderRadius:14, padding:'24px',
      display:'flex', flexDirection:'column', alignItems:'center', gap:12}}>
      <img src={src} alt="Haile mark" style={{height:56, objectFit:'contain'}}/>
      <div style={{fontSize:10, fontFamily:T.typography.fontFamilyMono,
        color: plateBg === T.colors.cloud || plateBg === '#FFFFFF'
          ? 'rgba(26,25,22,0.35)' : 'rgba(255,255,255,0.35)',
        letterSpacing:1, textTransform:'uppercase'}}>{label}</div>
    </div>
  );

  return (
    <div>
      <div style={{marginBottom:40}}>
        <div style={{display:'inline-block',padding:'4px 12px',borderRadius:999,background:T.colors.violetAlpha20,color:T.colors.violetLight,fontSize:12,fontWeight:600,marginBottom:12}}>Marca</div>
        <h1 style={{fontSize:36,fontWeight:700,color:textColor,margin:'0 0 12px'}}>Logo & Marca</h1>
        <p style={{fontSize:16,color:mutedColor,lineHeight:1.6,maxWidth:560,margin:0}}>
          Wordmark e símbolo em versões aprovadas. Use sempre os arquivos originais — nunca recrie o lettering manualmente.
        </p>
      </div>

      {/* Wordmark — versões */}
      <h2 style={{fontSize:20,fontWeight:700,color:textColor,margin:'0 0 14px'}}>Wordmark — versões aprovadas</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:36}}>
        <LogoPlate plateBg={T.colors.night}   src="ds/haile-wordmark-white.svg"  label="Primária · Dark"/>
        <LogoPlate plateBg={T.colors.violet}  src="ds/haile-wordmark-white.svg"  label="Primária · Violeta"/>
        <LogoPlate plateBg={T.colors.cloud}   src="ds/haile-wordmark-indigo.svg" label="Primária · Light"/>
        <LogoPlate plateBg="#EEF2FF"           src="ds/haile-wordmark-indigo.svg" label="Sobre fundo claro"/>
      </div>

      {/* Símbolo/Mark */}
      <h2 style={{fontSize:20,fontWeight:700,color:textColor,margin:'0 0 14px'}}>Símbolo (mark isolado)</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:36}}>
        <MarkPlate plateBg={T.colors.night}  src="ds/haile-mark-white.svg"  label="Dark"/>
        <MarkPlate plateBg={T.colors.violet} src="ds/haile-mark-white.svg"  label="Violeta"/>
        <MarkPlate plateBg={T.colors.cloud}  src="ds/haile-mark-indigo.svg" label="Light"/>
        <MarkPlate plateBg="#EEF2FF"          src="ds/haile-mark-indigo.svg" label="Claro"/>
      </div>

      {/* Downloads */}
      <h2 style={{fontSize:20,fontWeight:700,color:textColor,margin:'0 0 14px'}}>Arquivos disponíveis</h2>
      <div style={{background:bg,border:`1px solid ${border}`,borderRadius:16,overflow:'hidden',marginBottom:36}}>
        {[
          {file:'haile-wordmark-white.svg',  use:'Wordmark branco — fundos escuros',  fmt:'SVG'},
          {file:'haile-wordmark-indigo.svg', use:'Wordmark violeta — fundos claros',   fmt:'SVG'},
          {file:'haile-mark-white.svg',      use:'Símbolo branco — favicon, avatar',   fmt:'SVG'},
          {file:'haile-mark-indigo.svg',     use:'Símbolo violeta — usos coloridos',   fmt:'SVG'},
        ].map((f,i) => (
          <div key={f.file} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 20px',
            borderBottom: i<3 ? `1px solid ${border}` : 'none',
            background: i%2===1 ? (darkMode?'rgba(255,255,255,0.02)':'#FAFAFA') : 'transparent'}}>
            <div style={{width:36,height:36,borderRadius:8,background:T.colors.violetAlpha10,
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.colors.violet} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:textColor,fontFamily:T.typography.fontFamilyMono}}>{f.file}</div>
              <div style={{fontSize:12,color:mutedColor}}>{f.use}</div>
            </div>
            <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:T.colors.violetAlpha10,
              color:T.colors.violetLight,fontFamily:T.typography.fontFamilyMono}}>{f.fmt}</span>
          </div>
        ))}
      </div>

      {/* Regras */}
      <div style={{background:bg,border:`1px solid ${border}`,borderRadius:16,padding:24}}>
        <h3 style={{fontSize:16,fontWeight:700,color:textColor,margin:'0 0 16px'}}>Regras de uso</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
              <span style={{color:T.colors.prosperity,fontSize:15}}>✓</span>
              <span style={{fontWeight:600,color:textColor}}>Faça</span>
            </div>
            {['Usar apenas os arquivos SVG originais','Manter proporções — nunca distorça','Espaço de proteção = altura da letra "h"','Versão monocromática em contextos mono'].map(t=>(
              <div key={t} style={{fontSize:13,color:mutedColor,marginBottom:5}}>· {t}</div>
            ))}
          </div>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
              <span style={{color:T.colors.alert,fontSize:15}}>✗</span>
              <span style={{fontWeight:600,color:textColor}}>Não faça</span>
            </div>
            {['Recriar ou redesenhar o lettering','Usar sobre fundos de baixo contraste','Aplicar efeitos (sombra, glow, contorno)','Recortar ou mascarar partes do logo'].map(t=>(
              <div key={t} style={{fontSize:13,color:mutedColor,marginBottom:5}}>· {t}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionMotion({ darkMode }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';
  const [active, setActive] = React.useState(null);

  const demos = [
    {id:'fadeIn', label:'Fade In', keyframes:`@keyframes fadeIn { from{opacity:0} to{opacity:1} }`, css:'animation: fadeIn 200ms ease-out'},
    {id:'slideUp',label:'Slide Up',keyframes:`@keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`, css:'animation: slideUp 200ms ease-out'},
    {id:'scaleIn',label:'Scale In',keyframes:`@keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }`, css:'animation: scaleIn 150ms ease-out'},
  ];

  return (
    <div>
      <div style={{marginBottom:40}}>
        <div style={{display:'inline-block',padding:'4px 12px',borderRadius:999,background:T.colors.violetAlpha20,color:T.colors.violetLight,fontSize:12,fontWeight:600,marginBottom:12}}>Motion</div>
        <h1 style={{fontSize:36,fontWeight:700,color:textColor,margin:'0 0 12px'}}>Animação & Motion</h1>
        <p style={{fontSize:16,color:mutedColor,lineHeight:1.6,maxWidth:540,margin:0}}>
          Animações discretas e funcionais. O movimento orienta o usuário — nunca distrai.
        </p>
      </div>

      <h2 style={{fontSize:20,fontWeight:700,color:textColor,margin:'0 0 14px'}}>Tokens de duração</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:40}}>
        {[
          {name:'Fast',   val:'150ms', use:'Hover, focus, micro-feedback imediato'},
          {name:'Normal', val:'200ms', use:'Modais, dropdowns, transições padrão'},
          {name:'Slow',   val:'300ms', use:'Slides de onboarding, animações de entrada'},
        ].map(d => (
          <div key={d.name} style={{background:bg,border:`1px solid ${border}`,borderRadius:14,padding:20,textAlign:'center'}}>
            <div style={{fontSize:32,fontWeight:700,color:T.colors.violet,fontVariantNumeric:'tabular-nums',marginBottom:6}}>{d.val}</div>
            <div style={{fontSize:14,fontWeight:600,color:textColor,marginBottom:6}}>{d.name}</div>
            <div style={{fontSize:12,color:mutedColor,lineHeight:1.5}}>{d.use}</div>
          </div>
        ))}
      </div>

      <h2 style={{fontSize:20,fontWeight:700,color:textColor,margin:'0 0 14px'}}>Animações</h2>
      <p style={{fontSize:14,color:mutedColor,margin:'0 0 16px'}}>Clique para pré-visualizar:</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:16}}>
        {demos.map(d => (
          <div key={d.id}>
            <button onClick={()=>{setActive(null);setTimeout(()=>setActive(d.id),50);}}
              style={{
                width:'100%',padding:'14px 0',background:T.colors.violetAlpha10,border:`1px solid ${T.colors.violetAlpha20}`,
                borderRadius:12,cursor:'pointer',color:T.colors.violet,fontFamily:T.typography.fontFamily,
                fontSize:14,fontWeight:600,transition:'all 150ms',
              }}
              onMouseEnter={e=>{e.currentTarget.style.background=T.colors.violetAlpha20;}}
              onMouseLeave={e=>{e.currentTarget.style.background=T.colors.violetAlpha10;}}>
              ▶ {d.label}
            </button>
            {active===d.id && (
              <style>{d.keyframes}</style>
            )}
          </div>
        ))}
      </div>
      {active && (
        <div style={{background:bg,border:`1px solid ${border}`,borderRadius:14,padding:32,
          display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
          <div key={active} style={{
            width:80,height:80,background:T.colors.violet,borderRadius:16,
            animation:`${active} ${active==='scaleIn'?'150ms':'200ms'} cubic-bezier(0,0,0.2,1) both`,
          }}/>
        </div>
      )}

      <div style={{background:'#0D1117',borderRadius:16,padding:24,marginTop:8}}>
        <pre style={{margin:0,fontFamily:T.typography.fontFamilyMono,fontSize:12,color:'#94A3B8',lineHeight:1.8}}>
{`/* Haile Motion Tokens */
--duration-fast:   150ms;
--duration-normal: 200ms;
--duration-slow:   300ms;
--easing-default:  cubic-bezier(0.4, 0, 0.2, 1);
--easing-out:      cubic-bezier(0, 0, 0.2, 1);

/* Usage */
transition: all var(--duration-normal) var(--easing-out);`}
        </pre>
      </div>
    </div>
  );
}

Object.assign(window, { SectionOverview, SectionLogo, SectionMotion });

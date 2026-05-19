// Section: Iconografia — Lucide icons + estratégia

const T = window.HaileTokens;

// Inline SVG paths para os ícones mais usados no app Haile
// Cada ícone: { name, label, group, path (stroke) }
const ICONS = [
  // Navegação
  { name:'LayoutDashboard', label:'Dashboard',     group:'nav',
    svg:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></> },
  { name:'Wallet',          label:'Carteira',       group:'nav',
    svg:<><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></> },
  { name:'TrendingUp',      label:'Patrimônio',     group:'nav',
    svg:<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></> },
  { name:'Users',           label:'Família',        group:'nav',
    svg:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
  { name:'Sparkles',        label:'AI Coach',       group:'nav',
    svg:<><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></> },
  { name:'FileText',        label:'Relatórios',     group:'nav',
    svg:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></> },
  { name:'Settings',        label:'Config.',        group:'nav',
    svg:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></> },

  // Financeiro
  { name:'DollarSign',      label:'Saldo',          group:'finance',
    svg:<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></> },
  { name:'CreditCard',      label:'Cartão',         group:'finance',
    svg:<><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></> },
  { name:'PiggyBank',       label:'Poupança',       group:'finance',
    svg:<><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2z"/><path d="M2 9v1a2 2 0 0 0 2 2h1"/><path d="M16 11h.01"/></> },
  { name:'Receipt',         label:'Transação',      group:'finance',
    svg:<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><path d="M16 8h-6"/><path d="M16 12h-6"/><path d="M16 16h-6"/></> },
  { name:'Target',          label:'Meta',           group:'finance',
    svg:<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></> },
  { name:'BarChart2',       label:'Gráfico',        group:'finance',
    svg:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></> },
  { name:'ArrowUpRight',    label:'Crescimento',    group:'finance',
    svg:<><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></> },

  // UI / Ações
  { name:'Bell',            label:'Notif.',         group:'ui',
    svg:<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></> },
  { name:'Search',          label:'Busca',          group:'ui',
    svg:<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></> },
  { name:'Plus',            label:'Adicionar',      group:'ui',
    svg:<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></> },
  { name:'ChevronRight',    label:'Avançar',        group:'ui',
    svg:<><polyline points="9 18 15 12 9 6"/></> },
  { name:'X',               label:'Fechar',         group:'ui',
    svg:<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> },
  { name:'Check',           label:'Confirmar',      group:'ui',
    svg:<><polyline points="20 6 9 17 4 12"/></> },
  { name:'AlertCircle',     label:'Alerta',         group:'ui',
    svg:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></> },
  { name:'Lock',            label:'Segurança',      group:'ui',
    svg:<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></> },
];

const GROUP_COLORS = {
  nav:     { label:'Navegação',  color: T.colors.violet },
  finance: { label:'Financeiro', color: T.colors.teal },
  ui:      { label:'UI / Ações', color: T.colors.prosperity },
};

function IconTile({ icon, color, darkMode }) {
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';
  const textColor = darkMode ? T.colors.mist : '#64748B';
  return (
    <div style={{background:bg, border:`1px solid ${border}`, borderRadius:10,
      padding:'16px 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:8,
      transition:'all 150ms', cursor:'default'}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=color; e.currentTarget.style.background=`${color}10`;}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=border; e.currentTarget.style.background=bg;}}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {icon.svg}
      </svg>
      <span style={{fontSize:10, fontFamily:T.typography.fontFamilyMono, color:textColor,
        textAlign:'center', lineHeight:1.2}}>{icon.label}</span>
    </div>
  );
}

function SectionIconography({ darkMode }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';

  const groups = ['nav','finance','ui'];

  return (
    <div>
      <div style={{marginBottom:40}}>
        <div style={{display:'inline-block',padding:'4px 12px',borderRadius:999,background:T.colors.violetAlpha20,color:T.colors.violetLight,fontSize:12,fontWeight:600,marginBottom:12}}>Iconografia</div>
        <h1 style={{fontSize:36,fontWeight:700,color:textColor,margin:'0 0 12px'}}>Iconografia</h1>
        <p style={{fontSize:16,color:mutedColor,lineHeight:1.6,maxWidth:580,margin:0}}>
          Biblioteca <strong style={{color:textColor}}>Lucide Icons</strong> — outline minimalista, consistente e perfeita para dark mode. Espessura de stroke padrão: 1.75px.
        </p>
      </div>

      {/* Library badge */}
      <div style={{background:bg,border:`1px solid ${border}`,borderRadius:14,padding:20,marginBottom:36,
        display:'flex',alignItems:'center',gap:16}}>
        <div style={{width:44,height:44,borderRadius:10,background:T.colors.violetAlpha10,
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.colors.violet} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:700,color:textColor}}>Lucide Icons</div>
          <div style={{fontSize:13,color:mutedColor}}>1500+ ícones open-source · Apache 2.0 · <span style={{fontFamily:T.typography.fontFamilyMono,color:T.colors.violet}}>lucide.dev</span></div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {['npm i lucide-react','stroke="1.75"'].map(tag=>(
            <span key={tag} style={{fontSize:11,fontFamily:T.typography.fontFamilyMono,padding:'3px 10px',
              borderRadius:4,background:darkMode?'rgba(255,255,255,0.06)':'#F1F5F9',color:mutedColor}}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Icon groups */}
      {groups.map(g => {
        const meta = GROUP_COLORS[g];
        const items = ICONS.filter(i=>i.group===g);
        return (
          <div key={g} style={{marginBottom:36}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <div style={{width:8,height:8,borderRadius:2,background:meta.color}}/>
              <h2 style={{fontSize:18,fontWeight:700,color:textColor,margin:0}}>{meta.label}</h2>
              <span style={{fontSize:12,color:mutedColor,fontFamily:T.typography.fontFamilyMono}}>{items.length} ícones</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
              {items.map(icon=><IconTile key={icon.name} icon={icon} color={meta.color} darkMode={darkMode}/>)}
            </div>
          </div>
        );
      })}

      {/* Tamanhos */}
      <h2 style={{fontSize:20,fontWeight:700,color:textColor,margin:'0 0 16px',paddingTop:8,
        borderTop:`1px solid ${border}`}}>Tamanhos</h2>
      <div style={{background:bg,border:`1px solid ${border}`,borderRadius:14,padding:24,marginBottom:36}}>
        <div style={{display:'flex',alignItems:'flex-end',gap:32,flexWrap:'wrap'}}>
          {[{size:16,label:'16px · Caption, inline'},{size:20,label:'20px · Body, nav'},{size:24,label:'24px · Headings'},{size:32,label:'32px · Hero, KPI'}].map(s=>(
            <div key={s.size} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
              <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none"
                stroke={T.colors.violet} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{fontSize:11,fontFamily:T.typography.fontFamilyMono,color:mutedColor,whiteSpace:'nowrap'}}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Semântica de cor */}
      <h2 style={{fontSize:20,fontWeight:700,color:textColor,margin:'0 0 16px'}}>Semântica de cor</h2>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {[
          {color:T.colors.violet,    label:'Violeta',    use:'Ações primárias, navegação ativa, destaques de UI'},
          {color:T.colors.teal,      label:'Teal',       use:'Exclusivo IA Coach — insights, sugestões, análise'},
          {color:T.colors.prosperity,label:'Verde',      use:'Crescimento, indicadores positivos, metas atingidas'},
          {color:T.colors.alert,     label:'Rosa Alert', use:'Erros, alertas críticos, limites ultrapassados'},
          {color:T.colors.mist,      label:'Mist',       use:'Ícones inativos, placeholders, estado desabilitado'},
        ].map(row=>(
          <div key={row.label} style={{display:'flex',alignItems:'center',gap:12,
            background:bg,border:`1px solid ${border}`,borderRadius:8,padding:'10px 16px'}}>
            <div style={{width:8,height:8,borderRadius:2,background:row.color,flexShrink:0}}/>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={row.color}
              strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/>
            </svg>
            <span style={{width:60,fontSize:13,fontWeight:600,color:row.color}}>{row.label}</span>
            <span style={{fontSize:13,color:mutedColor}}>{row.use}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.SectionIconography = SectionIconography;

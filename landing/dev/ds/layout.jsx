// Layout shell: sidebar + content area
// Exports: DSLayout, DSNavItem, useDSNav

const T = window.HaileTokens;

const NAV = [
  { id:'overview',    label:'Visão Geral',    icon:'Layers' },
  { id:'colors',      label:'Cores',          icon:'Palette' },
  { id:'typography',  label:'Tipografia',     icon:'Type' },
  { id:'spacing',     label:'Espaçamento',    icon:'Ruler' },
  { id:'components',  label:'Componentes',    icon:'Box',
    children:[
      { id:'comp-buttons', label:'Botões' },
      { id:'comp-inputs',  label:'Inputs' },
      { id:'comp-cards',   label:'Cards' },
      { id:'comp-badges',  label:'Badges' },
    ]
  },
  { id:'financial',   label:'Financeiros',    icon:'BarChart2',
    children:[
      { id:'fin-kpi',     label:'KPI Cards' },
      { id:'fin-goals',   label:'Metas (Rings)' },
      { id:'fin-ai',      label:'AI Coach' },
      { id:'fin-tx',      label:'Transações' },
    ]
  },
  { id:'logo',        label:'Logo & Marca',   icon:'Hexagon' },
  { id:'iconography', label:'Iconografia',    icon:'Grid' },
  { id:'voice',       label:'Voz & Tom',      icon:'MessageCircle' },
  { id:'motion',      label:'Motion',         icon:'Zap' },
];

function NavIcon({ name, size=16, color }) {
  const icons = {
    Layers:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    Palette:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
    Type:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
    Ruler:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/></svg>,
    Box:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    BarChart2:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    Hexagon:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    Grid:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    MessageCircle:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    Zap:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    ChevronDown:<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
    Moon:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    Sun:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  };
  return icons[name] || null;
}

function NavGroup({ item, activeId, onNav, expanded, onToggle }) {
  const isActive = activeId === item.id || (item.children||[]).some(c=>c.id===activeId);
  const childActive = (item.children||[]).find(c=>c.id===activeId);

  return (
    <div>
      <button
        onClick={() => item.children ? onToggle(item.id) : onNav(item.id)}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 14px',
          background: isActive && !item.children ? T.colors.violetAlpha20 : 'transparent',
          border:'none', borderRadius:8, cursor:'pointer',
          color: isActive ? T.colors.violetLight : T.colors.mist,
          fontFamily: T.typography.fontFamily, fontSize:14, fontWeight: isActive ? 600 : 400,
          transition:'all 150ms', textAlign:'left',
        }}
        onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.color=T.colors.cloud; }}
        onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background='transparent'; e.currentTarget.style.color=isActive?T.colors.violetLight:T.colors.mist; }}
      >
        <NavIcon name={item.icon} size={15} color={isActive ? T.colors.violet : undefined}/>
        <span style={{flex:1}}>{item.label}</span>
        {item.children && (
          <span style={{transform: expanded?'rotate(0)':'rotate(-90deg)', transition:'transform 200ms', display:'flex', alignItems:'center'}}>
            <NavIcon name="ChevronDown" size={12}/>
          </span>
        )}
      </button>
      {item.children && expanded && (
        <div style={{paddingLeft:28, marginTop:2, display:'flex', flexDirection:'column', gap:1}}>
          {item.children.map(child => (
            <button key={child.id} onClick={()=>onNav(child.id)}
              style={{
                width:'100%', padding:'6px 10px', background: activeId===child.id ? T.colors.violetAlpha20 : 'transparent',
                border:'none', borderRadius:6, cursor:'pointer', textAlign:'left',
                color: activeId===child.id ? T.colors.violetLight : T.colors.mist,
                fontFamily:T.typography.fontFamily, fontSize:13,
                fontWeight: activeId===child.id ? 600 : 400, transition:'all 150ms',
              }}
              onMouseEnter={e=>{ if(activeId!==child.id){ e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.color=T.colors.cloud; } }}
              onMouseLeave={e=>{ if(activeId!==child.id){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color=T.colors.mist; } }}
            >{child.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function DSLayout({ children, activeId, onNav, darkMode, onToggleDark }) {
  const [expandedGroups, setExpandedGroups] = React.useState({'components':true,'financial':true});
  const bg = darkMode ? T.colors.night : '#F1F5F9';
  const sidebarBg = darkMode ? T.colors.card : '#FFFFFF';
  const contentBg = darkMode ? '#0D1424' : '#F8FAFC';
  const borderColor = darkMode ? T.colors.border : '#E2E8F0';
  const textColor = darkMode ? T.colors.cloud : T.colors.slate;

  const toggleGroup = (id) => setExpandedGroups(prev => ({...prev, [id]: !prev[id]}));

  return (
    <div style={{display:'flex', height:'100vh', background:bg, fontFamily:T.typography.fontFamily, overflow:'hidden'}}>
      {/* Sidebar */}
      <div style={{
        width:240, flexShrink:0, background:sidebarBg,
        borderRight:`1px solid ${borderColor}`,
        display:'flex', flexDirection:'column', overflowY:'auto',
      }}>
        {/* Logo */}
        <div style={{padding:'18px 16px 14px', borderBottom:`1px solid ${borderColor}`}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{
              width:36, height:36, borderRadius:9, background:T.colors.violet,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              padding:6,
            }}>
              <img src="ds/haile-mark-white.svg" alt="Haile mark"
                style={{width:'100%', height:'100%', objectFit:'contain', display:'block'}}/>
            </div>
            <div>
              <img src="ds/haile-wordmark-white.svg" alt="Haile"
                style={{height:16, display:'block', filter: darkMode?'none':'invert(1) sepia(1) saturate(0) brightness(0.15)'}}/>
              <div style={{fontSize:10, color:T.colors.mist, marginTop:2, fontFamily:T.typography.fontFamilyMono}}>Design System v1.0</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1, padding:'12px 8px', display:'flex', flexDirection:'column', gap:2}}>
          {NAV.map(item => (
            <NavGroup key={item.id} item={item} activeId={activeId} onNav={onNav}
              expanded={!!expandedGroups[item.id]} onToggle={toggleGroup}/>
          ))}
        </nav>

        {/* Dark toggle */}
        <div style={{padding:'12px 16px', borderTop:`1px solid ${borderColor}`}}>
          <button onClick={onToggleDark} style={{
            display:'flex', alignItems:'center', gap:8, width:'100%', padding:'6px 8px',
            background:'transparent', border:'none', cursor:'pointer', borderRadius:6,
            color:T.colors.mist, fontFamily:T.typography.fontFamily, fontSize:13,
          }}>
            <NavIcon name={darkMode?'Sun':'Moon'} size={14}/>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1, overflowY:'auto', background:contentBg}}>
        <div style={{maxWidth:900, margin:'0 auto', padding:'48px 40px 80px'}}>
          {React.Children.map(children, child =>
            React.isValidElement(child) ? React.cloneElement(child, {darkMode}) : child
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DSLayout, NavIcon, HaileTokens:window.HaileTokens });

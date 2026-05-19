// Section: Componentes Financeiros

const T = window.HaileTokens;

function ProgressRing({ percent, color, size=120, strokeW=10 }) {
  const r = (size-strokeW*2)/2;
  const circ = 2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeW}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${percent/100*circ} ${circ}`} strokeLinecap="round"
        style={{transition:'stroke-dasharray 600ms cubic-bezier(0.4,0,0.2,1)'}}/>
    </svg>
  );
}

function SectionFinancial({ darkMode }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';
  const rowBg = darkMode ? 'rgba(255,255,255,0.03)' : '#F8FAFC';

  return (
    <div>
      <div style={{marginBottom:40}}>
        <div style={{display:'inline-block', padding:'4px 12px', borderRadius:999, background:T.colors.tealAlpha10, color:T.colors.teal, fontSize:12, fontWeight:600, marginBottom:12}}>Financeiros</div>
        <h1 style={{fontSize:36, fontWeight:700, color:textColor, margin:'0 0 12px'}}>Componentes Financeiros</h1>
        <p style={{fontSize:16, color:mutedColor, lineHeight:1.6, maxWidth:560, margin:0}}>
          Componentes exclusivos do domínio financeiro — KPIs, metas, coach IA, transações.
        </p>
      </div>

      {/* KPI Cards */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px', paddingBottom:12, borderBottom:`1px solid ${border}`}}>KPI Cards</h2>
      <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14, marginBottom:40}}>
        {[
          {label:'Saldo Total',     value:'R$ 45.320', change:'+12,5%', pos:true,  color:T.colors.prosperity},
          {label:'Receita Mensal',  value:'R$ 12.800', change:'+8,2%',  pos:true,  color:T.colors.violet},
          {label:'Gastos do Mês',   value:'R$ 8.450',  change:'-5,3%',  pos:true,  color:textColor},
          {label:'Meta Atingida',   value:'85%',       change:'+15%',   pos:true,  color:T.colors.teal},
        ].map(k => (
          <div key={k.label} style={{background:bg, border:`1px solid ${border}`, borderRadius:16, padding:20,
            transition:'box-shadow 200ms', cursor:'default'}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=T.shadows.md}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
            <div style={{fontSize:13, color:mutedColor, marginBottom:8}}>{k.label}</div>
            <div style={{fontSize:28, fontWeight:700, color:k.color, fontVariantNumeric:'tabular-nums', marginBottom:8}}>{k.value}</div>
            <span style={{fontSize:12, padding:'2px 8px', borderRadius:6, fontWeight:600,
              background: k.pos ? T.colors.prosperityAlpha10 : T.colors.alertAlpha,
              color: k.pos ? T.colors.prosperity : T.colors.alert}}>{k.change}</span>
          </div>
        ))}
      </div>

      {/* Progress Rings */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px', paddingBottom:12, borderBottom:`1px solid ${border}`}}>Metas — Progress Rings</h2>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:40}}>
        {[
          {goal:'Viagem em Família', curr:6500, total:10000, pct:65, color:T.colors.violet},
          {goal:'Fundo Emergência',  curr:8000, total:10000, pct:80, color:T.colors.prosperity},
          {goal:'Nova Casa',         curr:45000,total:100000,pct:45, color:T.colors.teal},
        ].map(g => (
          <div key={g.goal} style={{background:bg, border:`1px solid ${border}`, borderRadius:16, padding:24, textAlign:'center'}}>
            <div style={{position:'relative', display:'inline-block', marginBottom:12}}>
              <ProgressRing percent={g.pct} color={g.color} size={110} strokeW={9}/>
              <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                <span style={{fontSize:24, fontWeight:700, color:g.color, fontVariantNumeric:'tabular-nums'}}>{g.pct}%</span>
                <span style={{fontSize:10, color:mutedColor}}>concluído</span>
              </div>
            </div>
            <div style={{fontSize:14, fontWeight:600, color:textColor, marginBottom:4}}>{g.goal}</div>
            <div style={{fontSize:12, color:mutedColor}}>
              R$ {g.curr.toLocaleString('pt-BR')} / R$ {g.total.toLocaleString('pt-BR')}
            </div>
          </div>
        ))}
      </div>

      {/* AI Coach Card */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px', paddingBottom:12, borderBottom:`1px solid ${border}`}}>AI Coach — Insight Cards</h2>
      <div style={{display:'flex', flexDirection:'column', gap:12, marginBottom:40}}>
        {[
          {type:'success', icon:'✓', title:'Meta atingida! 🎉',
           msg:'Parabéns! Você economizou R$ 450 este mês e bateu sua meta de R$ 400.', color:T.colors.prosperity},
          {type:'ai', icon:'✦', title:'Insight do Haile Coach',
           msg:'Você pode economizar R$ 200/mês migrando para um plano mais econômico de celular.', color:T.colors.teal},
          {type:'warning', icon:'⚡', title:'Atenção ao orçamento',
           msg:'Gastos com alimentação estão 15% acima da média histórica este mês.', color:T.colors.warning},
          {type:'alert', icon:'!', title:'Limite próximo',
           msg:'Seu cartão Haile está com 82% do limite utilizado.', color:T.colors.alert},
        ].map(n => (
          <div key={n.title} style={{display:'flex', gap:14, padding:18, background:bg,
            border:`1px solid ${border}`, borderRadius:14,
            transition:'box-shadow 150ms', cursor:'default'}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=T.shadows.md}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
            <div style={{width:36, height:36, borderRadius:9, flexShrink:0,
              background:`${n.color}18`, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:16, color:n.color}}>
              {n.icon}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14, fontWeight:600, color:textColor, marginBottom:4}}>{n.title}</div>
              <div style={{fontSize:13, color:mutedColor, lineHeight:1.5}}>{n.msg}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction List */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px', paddingBottom:12, borderBottom:`1px solid ${border}`}}>Lista de Transações</h2>
      <div style={{background:bg, border:`1px solid ${border}`, borderRadius:16, overflow:'hidden', marginBottom:40}}>
        <div style={{padding:'14px 20px', borderBottom:`1px solid ${border}`,
          display:'flex', gap:12, fontSize:12, fontWeight:600, color:mutedColor, textTransform:'uppercase', letterSpacing:0.5}}>
          <span style={{flex:2}}>Descrição</span><span style={{flex:1}}>Categoria</span>
          <span style={{width:80,textAlign:'right'}}>Valor</span>
        </div>
        {[
          {desc:'Supermercado Pão de Açúcar', cat:'Alimentação', val:'-R$ 284,90', pos:false, date:'hoje'},
          {desc:'Salário — Empresa XYZ',       cat:'Receita',     val:'+R$ 8.500,00',pos:true,  date:'ontem'},
          {desc:'Netflix Família',              cat:'Assinaturas', val:'-R$ 55,90',  pos:false, date:'18/05'},
          {desc:'Rendimento CDB',               cat:'Investimento',val:'+R$ 142,30', pos:true,  date:'17/05'},
          {desc:'Posto de Gasolina',            cat:'Transporte',  val:'-R$ 198,00', pos:false, date:'16/05'},
        ].map((tx,i) => (
          <div key={tx.desc} style={{
            padding:'12px 20px', display:'flex', alignItems:'center', gap:12,
            background: i%2===0 ? 'transparent' : rowBg,
            borderBottom: i<4 ? `1px solid ${border}` : 'none',
          }}>
            <div style={{flex:2}}>
              <div style={{fontSize:14, color:textColor, fontWeight:500}}>{tx.desc}</div>
              <div style={{fontSize:11, color:mutedColor}}>{tx.date}</div>
            </div>
            <div style={{flex:1}}>
              <span style={{fontSize:12, padding:'2px 8px', borderRadius:999,
                background: tx.cat==='Receita'||tx.cat==='Investimento' ? T.colors.prosperityAlpha10 : 'rgba(255,255,255,0.05)',
                color: tx.cat==='Receita'||tx.cat==='Investimento' ? T.colors.prosperity : mutedColor}}>
                {tx.cat}
              </span>
            </div>
            <div style={{width:80, textAlign:'right', fontSize:14, fontWeight:600,
              fontVariantNumeric:'tabular-nums',
              color: tx.pos ? T.colors.prosperity : textColor}}>{tx.val}</div>
          </div>
        ))}
      </div>

      {/* Financial Health Score */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px', paddingBottom:12, borderBottom:`1px solid ${border}`}}>Financial Health Score</h2>
      <div style={{background:'linear-gradient(135deg,#4F46E5,#6366F1)', borderRadius:20, padding:32, color:'white', position:'relative', overflow:'hidden', marginBottom:16}}>
        <div style={{position:'absolute',top:-30,right:-30,width:180,height:180,background:'rgba(255,255,255,0.05)',borderRadius:'50%',filter:'blur(40px)'}}/>
        <div style={{position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20}}>
          <div>
            <div style={{fontSize:13, opacity:0.7, marginBottom:6}}>Saúde Financeira Familiar</div>
            <div style={{fontSize:48, fontWeight:700, fontVariantNumeric:'tabular-nums', lineHeight:1}}>84</div>
            <div style={{fontSize:14, opacity:0.8, marginTop:6}}>Muito Bom · Acima de 80% das famílias</div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:10, minWidth:200}}>
            {[
              {label:'Liquidez',     pct:90, color:'#34D399'},
              {label:'Poupança',     pct:72, color:'#9990FF'},
              {label:'Endividamento',pct:45, color:'#F59E0B'},
            ].map(m => (
              <div key={m.label}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:12, opacity:0.8, marginBottom:4}}>
                  <span>{m.label}</span><span>{m.pct}%</span>
                </div>
                <div style={{height:4, borderRadius:2, background:'rgba(255,255,255,0.15)'}}>
                  <div style={{height:'100%', width:`${m.pct}%`, borderRadius:2, background:m.color, transition:'width 600ms'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.SectionFinancial = SectionFinancial;

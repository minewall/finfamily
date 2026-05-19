// Section: Tipografia

const T = window.HaileTokens;

function TypeRow({ label, size, weight, sample, darkMode }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';
  return (
    <div style={{background:bg, border:`1px solid ${border}`, borderRadius:10, padding:'14px 20px',
      display:'flex', alignItems:'baseline', gap:16}}>
      <div style={{width:160, flexShrink:0}}>
        <span style={{fontSize:11, fontFamily:T.typography.fontFamilyMono, color:mutedColor}}>{label}</span>
        <span style={{fontSize:11, fontFamily:T.typography.fontFamilyMono, color:T.colors.violet, marginLeft:6}}>{size}px</span>
      </div>
      <span style={{fontSize:size, fontWeight:weight, color:textColor, lineHeight:1.25}}>{sample}</span>
    </div>
  );
}

function SectionTypography({ darkMode }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';

  return (
    <div>
      <div style={{marginBottom:40}}>
        <div style={{display:'inline-block', padding:'4px 12px', borderRadius:999, background:T.colors.violetAlpha20, color:T.colors.violetLight, fontSize:12, fontWeight:600, marginBottom:12}}>Tipografia</div>
        <h1 style={{fontSize:36, fontWeight:700, color:textColor, margin:'0 0 12px'}}>Tipografia</h1>
        <p style={{fontSize:16, color:mutedColor, lineHeight:1.6, maxWidth:580, margin:0}}>
          Sistema tipográfico em DM Sans — geométrica moderna, legível em qualquer tamanho, com números tabulares perfeitos para valores monetários.
        </p>
      </div>

      {/* Família */}
      <div style={{background:'linear-gradient(135deg,#4F46E5,#6366F1)', borderRadius:20, padding:40, marginBottom:32, color:'white'}}>
        <div style={{fontSize:13, opacity:0.7, marginBottom:8, fontFamily:T.typography.fontFamilyMono}}>font-family</div>
        <div style={{fontSize:40, fontWeight:700, marginBottom:8, fontFamily:T.typography.fontFamily}}>DM Sans</div>
        <div style={{fontSize:18, opacity:0.8, marginBottom:16}}>Geométrica · Moderna · Humanista</div>
        <div style={{fontSize:28, fontWeight:500, fontFamily:T.typography.fontFamily, letterSpacing:'-0.01em'}}>
          Aa Bb Cc 0123 R$ 12.345,67
        </div>
      </div>

      {/* Pesos */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px'}}>Pesos</h2>
      <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:40}}>
        {[
          {w:400, name:'Regular', use:'Corpo de texto, descrições, labels secundários'},
          {w:500, name:'Medium',  use:'Valores monetários, botões, subtítulos'},
          {w:600, name:'Semibold',use:'Headings H3–H4, elementos de destaque'},
          {w:700, name:'Bold',    use:'Headings H1–H2, chamadas principais'},
        ].map(row => (
          <div key={row.w} style={{background:bg, border:`1px solid ${border}`, borderRadius:10,
            padding:'12px 20px', display:'flex', alignItems:'center', gap:16}}>
            <div style={{width:90, flexShrink:0}}>
              <span style={{fontSize:11, fontFamily:T.typography.fontFamilyMono, color:mutedColor}}>{row.w}</span>
              <span style={{marginLeft:6, fontSize:11, color:T.colors.violet}}>{row.name}</span>
            </div>
            <span style={{flex:1, fontSize:20, fontWeight:row.w, color:textColor}}>{row.use}</span>
          </div>
        ))}
      </div>

      {/* Escala */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px'}}>Escala tipográfica</h2>
      <div style={{display:'flex', flexDirection:'column', gap:6, marginBottom:40}}>
        <TypeRow darkMode={darkMode} label="Display" size={48} weight={700} sample="Gerencie suas finanças"/>
        <TypeRow darkMode={darkMode} label="H1" size={36} weight={700} sample="Bem-vindo ao Haile"/>
        <TypeRow darkMode={darkMode} label="H2" size={30} weight={600} sample="Seu Coach Financeiro"/>
        <TypeRow darkMode={darkMode} label="H3" size={24} weight={600} sample="Poder de Escolha"/>
        <TypeRow darkMode={darkMode} label="H4" size={20} weight={600} sample="Saúde Financeira Familiar"/>
        <TypeRow darkMode={darkMode} label="Body lg" size={18} weight={400} sample="Controle total das finanças com inteligência artificial"/>
        <TypeRow darkMode={darkMode} label="Body" size={16} weight={400} sample="O Haile Coach analisa seus gastos e sugere melhorias"/>
        <TypeRow darkMode={darkMode} label="Body sm" size={14} weight={400} sample="Suas informações estão protegidas com criptografia"/>
        <TypeRow darkMode={darkMode} label="Caption" size={12} weight={400} sample="Última atualização há 5 minutos · maio 2026"/>
      </div>

      {/* Valores monetários */}
      <h2 style={{fontSize:22, fontWeight:700, color:textColor, margin:'0 0 16px'}}>Valores monetários</h2>
      <div style={{background:bg, border:`1px solid ${border}`, borderRadius:16, padding:24, marginBottom:16}}>
        <p style={{fontSize:14, color:mutedColor, margin:'0 0 16px'}}>
          Use sempre <strong style={{color:textColor}}>fontVariantNumeric: 'tabular-nums'</strong> e peso <strong style={{color:textColor}}>500 ou superior</strong> em valores financeiros.
        </p>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {[
            {label:'Saldo disponível',  value:'R$ 8.450,32',   color:T.colors.prosperity},
            {label:'Meta do mês',       value:'R$ 12.000,00',  color:T.colors.violet},
            {label:'Gasto total',       value:'R$ 3.549,68',   color:textColor},
            {label:'Patrimônio total',  value:'R$ 145.800,00', color:T.colors.teal},
          ].map(row => (
            <div key={row.label} style={{display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 16px', background:darkMode?'rgba(255,255,255,0.03)':'#F8FAFC', borderRadius:8}}>
              <span style={{fontSize:14, color:mutedColor}}>{row.label}</span>
              <span style={{fontSize:28, fontWeight:600, color:row.color, fontVariantNumeric:'tabular-nums'}}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Guidelines */}
      <div style={{background:bg, border:`1px solid ${border}`, borderRadius:16, padding:24}}>
        <h3 style={{fontSize:17, fontWeight:700, color:textColor, margin:'0 0 16px'}}>Regras</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
          <div>
            <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:10}}>
              <span style={{color:T.colors.prosperity, fontSize:16}}>✓</span>
              <span style={{fontWeight:600, color:textColor}}>Faça</span>
            </div>
            {['tabular-nums em valores monetários','Medium+ em números importantes','line-height 1.5 para legibilidade','Bold apenas em headings principais'].map(t=>(
              <div key={t} style={{fontSize:13, color:mutedColor, marginBottom:6, paddingLeft:4}}>· {t}</div>
            ))}
          </div>
          <div>
            <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:10}}>
              <span style={{color:T.colors.alert, fontSize:16}}>✗</span>
              <span style={{fontWeight:600, color:textColor}}>Não faça</span>
            </div>
            {['Regular em valores monetários','Mais de 3 tamanhos por tela','line-height menor que 1.4','Misturar fontes diferentes'].map(t=>(
              <div key={t} style={{fontSize:13, color:mutedColor, marginBottom:6, paddingLeft:4}}>· {t}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.SectionTypography = SectionTypography;

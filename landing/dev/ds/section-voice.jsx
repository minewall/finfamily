// Section: Voz & Tom — copy guidelines para o app Haile

const T = window.HaileTokens;

function VoiceCard({ title, desc, darkMode }) {
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  return (
    <div style={{background:bg,border:`1px solid ${border}`,borderRadius:12,padding:20}}>
      <div style={{fontSize:14,fontWeight:700,color:textColor,marginBottom:6}}>{title}</div>
      <div style={{fontSize:13,color:mutedColor,lineHeight:1.6}}>{desc}</div>
    </div>
  );
}

function CopyExample({ bad, good, darkMode }) {
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
      <div style={{background:darkMode?'rgba(201,39,100,0.06)':'#FFF5F8',
        border:`1px solid ${T.colors.alertAlpha}`,borderRadius:10,padding:16}}>
        <div style={{fontSize:10,fontWeight:700,color:T.colors.alert,
          textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>✗ Evite</div>
        <div style={{fontSize:14,color:textColor,lineHeight:1.5}}>{bad}</div>
      </div>
      <div style={{background:darkMode?'rgba(16,185,129,0.06)':'#F0FDF9',
        border:`1px solid ${T.colors.prosperityAlpha10}`,borderRadius:10,padding:16}}>
        <div style={{fontSize:10,fontWeight:700,color:T.colors.prosperity,
          textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>✓ Use</div>
        <div style={{fontSize:14,color:textColor,lineHeight:1.5}}>{good}</div>
      </div>
    </div>
  );
}

function SectionVoice({ darkMode }) {
  const textColor = darkMode ? T.colors.cloud : T.colors.night;
  const mutedColor = darkMode ? T.colors.mist : '#64748B';
  const bg = darkMode ? T.colors.card : '#FFFFFF';
  const border = darkMode ? T.colors.border : '#E2E8F0';

  return (
    <div>
      <div style={{marginBottom:40}}>
        <div style={{display:'inline-block',padding:'4px 12px',borderRadius:999,
          background:T.colors.tealAlpha10,color:T.colors.teal,fontSize:12,fontWeight:600,marginBottom:12}}>Voz & Tom</div>
        <h1 style={{fontSize:36,fontWeight:700,color:textColor,margin:'0 0 12px'}}>Voz & Tom de Escrita</h1>
        <p style={{fontSize:16,color:mutedColor,lineHeight:1.6,maxWidth:580,margin:0}}>
          A Haile fala como um <strong style={{color:textColor}}>coach financeiro de confiança</strong> — inteligente, direto e humano. Nunca frio, nunca condescendente.
        </p>
      </div>

      {/* Pilares de voz */}
      <h2 style={{fontSize:20,fontWeight:700,color:textColor,margin:'0 0 14px'}}>Pilares de voz</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:40}}>
        <VoiceCard darkMode={darkMode} title="Inteligente, não arrogante"
          desc="Demonstra expertise sem usar jargão desnecessário. Explica termos complexos quando necessário, de forma natural."/>
        <VoiceCard darkMode={darkMode} title="Humano, não robótico"
          desc="Usa linguagem natural e calorosa. Reconhece emoções (preocupação, celebração) sem ser exagerado ou artificial."/>
        <VoiceCard darkMode={darkMode} title="Direto, não seco"
          desc="Vai ao ponto. Sem rodeios nem burocracia. Mas sem ser frio — sempre com contexto e utilidade."/>
        <VoiceCard darkMode={darkMode} title="Motivador, não pressivo"
          desc="Celebra conquistas. Aborda problemas como oportunidades. Nunca cria ansiedade desnecessária em torno do dinheiro."/>
      </div>

      {/* Exemplos práticos */}
      <h2 style={{fontSize:20,fontWeight:700,color:textColor,margin:'0 0 8px'}}>Exemplos práticos</h2>
      <p style={{fontSize:13,color:mutedColor,margin:'0 0 16px'}}>Como a Haile escreve em diferentes contextos:</p>

      <h3 style={{fontSize:15,fontWeight:600,color:textColor,margin:'0 0 10px'}}>Saudações e boas-vindas</h3>
      <CopyExample darkMode={darkMode}
        bad="Bem-vindo ao sistema FinFamily. Seu cadastro foi concluído com sucesso."
        good="Olá, Maria! Sua conta está pronta. Vamos começar a organizar as finanças da família Souza?"/>

      <h3 style={{fontSize:15,fontWeight:600,color:textColor,margin:'16px 0 10px'}}>Alertas e avisos</h3>
      <CopyExample darkMode={darkMode}
        bad="ERRO: Limite de cartão excedido em 82%. Ação necessária."
        good="Seu cartão está em 82% do limite. Que tal revisar os gastos dessa semana?"/>

      <h3 style={{fontSize:15,fontWeight:600,color:textColor,margin:'16px 0 10px'}}>Conquistas e metas</h3>
      <CopyExample darkMode={darkMode}
        bad="Meta de poupança atingida. Novo valor registrado: R$ 10.000,00."
        good="🎉 Você chegou lá! Fundo de emergência completo — R$ 10.000 guardados. Isso dá tranquilidade pra família toda."/>

      <h3 style={{fontSize:15,fontWeight:600,color:textColor,margin:'16px 0 10px'}}>Insights do AI Coach</h3>
      <CopyExample darkMode={darkMode}
        bad="Análise preditiva indica possibilidade de economia de R$ 200/mês em categoria Alimentação."
        good="Percebi que seus gastos com delivery cresceram 40% este mês. Se cozinar em casa 2x por semana, você pode economizar ~R$ 200."/>

      <h3 style={{fontSize:15,fontWeight:600,color:textColor,margin:'16px 0 10px'}}>Estados vazios</h3>
      <CopyExample darkMode={darkMode}
        bad="Nenhuma transação encontrada para o período selecionado."
        good="Ainda sem transações este mês. Quando você registrar a primeira, aparece aqui."/>

      {/* Vocabulário */}
      <h2 style={{fontSize:20,fontWeight:700,color:textColor,margin:'24px 0 14px'}}>Vocabulário da Haile</h2>
      <div style={{background:bg,border:`1px solid ${border}`,borderRadius:16,overflow:'hidden',marginBottom:32}}>
        <div style={{padding:'10px 20px',borderBottom:`1px solid ${border}`,
          display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <span style={{fontSize:11,fontWeight:700,color:mutedColor,textTransform:'uppercase',letterSpacing:0.5}}>Use</span>
          <span style={{fontSize:11,fontWeight:700,color:mutedColor,textTransform:'uppercase',letterSpacing:0.5}}>Evite</span>
        </div>
        {[
          ['Poder de escolha / Saldo disponível',    'Dinheiro sobrando'],
          ['Coach financeiro / Haile Coach',          'Bot / Robô / IA'],
          ['Família Souza',                           'Usuário / Cliente'],
          ['Registrar gasto',                         'Lançar despesa / Input'],
          ['Meta de R$ 10.000',                       'Objetivo: BRL 10000.00'],
          ['Está indo bem (85 pts)',                  'Score: 85/100'],
          ['Veja a análise completa',                 'Clique aqui para mais informações'],
          ['Algo deu errado — tente novamente',       'Erro 500: Internal Server Error'],
        ].map(([use, avoid], i) => (
          <div key={i} style={{
            display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, padding:'10px 20px',
            borderBottom: i < 7 ? `1px solid ${border}` : 'none',
            background: i%2===1 ? (darkMode?'rgba(255,255,255,0.02)':'#FAFAFA') : 'transparent',
          }}>
            <span style={{fontSize:13,color:T.colors.prosperity,fontWeight:500}}>✓ {use}</span>
            <span style={{fontSize:13,color:mutedColor}}>✗ {avoid}</span>
          </div>
        ))}
      </div>

      {/* Tom por contexto */}
      <h2 style={{fontSize:20,fontWeight:700,color:textColor,margin:'0 0 14px'}}>Tom por contexto</h2>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {[
          {ctx:'Onboarding',         tom:'Caloroso, encorajador',   note:'Apresente possibilidades, nunca obrigações'},
          {ctx:'Dashboard',          tom:'Informativo, confiante',  note:'Dados claros, contexto sempre presente'},
          {ctx:'Alertas',            tom:'Direto, útil',            note:'Informe + sugira ação, sem alarmismo'},
          {ctx:'AI Coach',           tom:'Consultor amigo',         note:'Personalizado, contextual, nunca genérico'},
          {ctx:'Celebrações',        tom:'Genuinamente feliz',      note:'Comemore de verdade — sem exagero corporativo'},
          {ctx:'Erros',              tom:'Calmo, resolutivo',       note:'Reconheça, explique brevemente, ofereça saída'},
        ].map(row=>(
          <div key={row.ctx} style={{display:'flex',alignItems:'center',gap:14,
            background:bg,border:`1px solid ${border}`,borderRadius:8,padding:'10px 16px'}}>
            <span style={{width:100,fontSize:13,fontWeight:600,color:textColor,flexShrink:0}}>{row.ctx}</span>
            <span style={{width:160,fontSize:13,color:T.colors.teal,flexShrink:0}}>{row.tom}</span>
            <span style={{fontSize:13,color:mutedColor}}>{row.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.SectionVoice = SectionVoice;

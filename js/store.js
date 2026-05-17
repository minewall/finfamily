/* ═══════════════════════════════════════════════════════════════════
   STORE.JS — Data layer with localStorage persistence
   Seeded with real data from "Gestão Financeira Familiar 2.0"
═══════════════════════════════════════════════════════════════════ */
'use strict';

const Store = (function () {
  const KEY = 'finfamily_v1';

  // ── CATEGORIES ─────────────────────────────────────────────────
  const CATEGORIES = {
    moradia:     { label: 'Moradia',             color: '#7C6EF8', icon: '🏠' },
    alimentacao: { label: 'Alimentação',          color: '#22C55E', icon: '🛒' },
    transporte:  { label: 'Transporte',           color: '#3B82F6', icon: '🚗' },
    saude:       { label: 'Saúde',               color: '#EC4899', icon: '❤️' },
    pessoal:     { label: 'Pessoal',             color: '#F59E0B', icon: '👤' },
    dogs:        { label: 'Dogs',                color: '#F97316', icon: '🐕' },
    lazer:       { label: 'Lazer',               color: '#14B8A6', icon: '🎉' },
    financeiro:  { label: 'Desp. Financeiras',   color: '#6366F1', icon: '🏦' },
    cartoes:     { label: 'Cartões & Wallets',   color: '#8B5CF6', icon: '💳' },
    manuela:     { label: 'Manuela Individual',  color: '#F472B6', icon: '👧' },
    educacao:    { label: 'Educação',            color: '#06B6D4', icon: '📚' },
    beneficios:  { label: 'Benefícios',          color: '#A78BFA', icon: '🎁' },
    assessorias: { label: 'Assessorias',         color: '#F59E0B', icon: '⚖️' },
    receita:     { label: 'Receita',             color: '#22C55E', icon: '💰' },
  };

  const SUBCATEGORIES = {
    moradia: ['Aluguel','Energia Elétrica','Água e Saneamento','TV / Internet / Telefone','Reparos e Manutenção','Netflix','HBO','Spotify','Amazon Prime','Apple','iFood','Móveis e itens casa','Outras despesas'],
    alimentacao: ['Supermercado','Feira / Sacolão','Padaria','Açougue','Nespresso','Sorveteria','Água','Lanche na Faculdade'],
    transporte: ['Aluguel Carro','Combustível','Manutenção','Estacionamento','Multas','Uber','Seguro','IPVA','Documentos'],
    saude: ['Convênio Médico','Medicamentos','Higiene Pessoal','Dentista','Emergências'],
    pessoal: ['Academia / Esportes','Salão de Beleza','Presentes','Vestuário','Terapia','Cigarro','Cerveja','Assinaturas','Celular','Telegrama','Mesada'],
    dogs: ['Ração','Banho e Tosa','Veterinário','Assessórios / Brinquedos'],
    lazer: ['Restaurantes e Passeios','Diversão Local','Famílias e Amigos','Viagens'],
    financeiro: ['Taxas Bancárias','Saques','Seguro de Vida','Imposto de Renda','Loteria','Correios','Cartório','Contador','Impostos Empresa'],
    cartoes: ['Itaú Click','Itaú Uniclass','Wise','Santander','Shopee','Mercado Livre','Torra Torra'],
    manuela:    ['Escola Manuela','Livros e Materiais','Mesada','Uniforme','Passeios'],
    educacao:   ['Mensalidade Escolar','Material Escolar','Uniforme','Passeios Escolares','Livros','Cursos','Material','Faculdade','Material Universitário','Cursos e Especializações'],
    beneficios: ['Mesada','Vale Refeição','Vale Transporte','Plano de Saúde','Outros'],
    assessorias: ['Honorários Advocatícios','Consultoria','Contador Pessoal','Melissa Advogada','OAB','Outros'],
  };

  const PAYMENT_METHODS = ['Cartão','Débito','Dinheiro','Pix'];

  // ── CANÔNICO: DESPESAS 2026 Jan-Abr ──────────────────────────────
  // Fonte: planilha oficial. Aluguel de Moradia NÃO está aqui — vem do Contrato.
  // Aplicado via _cleanupDespesas2026Q1.
  const MORADIA_2026_Q1 = [
    // ── JAN ──
    { date:'2026-01-08', desc:'Outras despesas moradia', amount:25.90,  sub:'Outras despesas',         pay:'Cartão',   month:1 },
    { date:'2026-01-08', desc:'Outras despesas moradia', amount:48.00,  sub:'Outras despesas',         pay:'Dinheiro', month:1 },
    { date:'2026-01-10', desc:'Energia Elétrica',        amount:212.43, sub:'Energia Elétrica',        pay:'Dinheiro', month:1 },
    { date:'2026-01-10', desc:'Água e Saneamento',       amount:273.76, sub:'Água e Saneamento',       pay:'Dinheiro', month:1 },
    { date:'2026-01-08', desc:'TV / Internet',           amount:295.33, sub:'TV / Internet / Telefone',pay:'Dinheiro', month:1 },
    { date:'2026-01-12', desc:'Móveis e itens casa',     amount:503.61, sub:'Móveis e itens casa',     pay:'Cartão',   month:1 },
    { date:'2026-01-12', desc:'Móveis e itens casa',     amount:511.84, sub:'Móveis e itens casa',     pay:'Dinheiro', month:1 },
    { date:'2026-01-15', desc:'HBO',                     amount:18.90,  sub:'HBO',                     pay:'Cartão',   month:1 },
    { date:'2026-01-15', desc:'Spotify',                 amount:40.90,  sub:'Spotify',                 pay:'Cartão',   month:1 },
    { date:'2026-01-15', desc:'Amazon Prime',            amount:13.90,  sub:'Amazon Prime',            pay:'Cartão',   month:1 },
    { date:'2026-01-15', desc:'Apple',                   amount:19.90,  sub:'Apple',                   pay:'Cartão',   month:1 },
    { date:'2026-01-15', desc:'iFood',                   amount:5.95,   sub:'iFood',                   pay:'Cartão',   month:1 },
    // ── FEV ── (só Aluguel via contrato + subscriptions/Outras/Móveis cartão)
    { date:'2026-02-15', desc:'Outras despesas moradia', amount:120.00, sub:'Outras despesas',         pay:'Cartão',   month:2 },
    { date:'2026-02-12', desc:'Móveis e itens casa',     amount:76.23,  sub:'Móveis e itens casa',     pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'HBO',                     amount:18.90,  sub:'HBO',                     pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'Spotify',                 amount:40.90,  sub:'Spotify',                 pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'Amazon Prime',            amount:13.90,  sub:'Amazon Prime',            pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'Apple',                   amount:69.03,  sub:'Apple',                   pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'iFood',                   amount:5.95,   sub:'iFood',                   pay:'Cartão',   month:2 },
    // ── MAR ──
    { date:'2026-03-10', desc:'Energia Elétrica',        amount:253.41, sub:'Energia Elétrica',        pay:'Dinheiro', month:3 },
    { date:'2026-03-10', desc:'Água e Saneamento',       amount:311.72, sub:'Água e Saneamento',       pay:'Dinheiro', month:3 },
    { date:'2026-03-08', desc:'TV / Internet',           amount:309.00, sub:'TV / Internet / Telefone',pay:'Cartão',   month:3 },
    { date:'2026-03-15', desc:'Móveis e itens casa',     amount:76.14,  sub:'Móveis e itens casa',     pay:'Cartão',   month:3 },
    { date:'2026-03-15', desc:'Móveis e itens casa',     amount:102.96, sub:'Móveis e itens casa',     pay:'Dinheiro', month:3 },
    { date:'2026-03-15', desc:'Spotify',                 amount:40.90,  sub:'Spotify',                 pay:'Cartão',   month:3 },
    { date:'2026-03-15', desc:'Amazon Prime',            amount:13.90,  sub:'Amazon Prime',            pay:'Cartão',   month:3 },
    { date:'2026-03-15', desc:'Apple',                   amount:92.70,  sub:'Apple',                   pay:'Cartão',   month:3 },
    { date:'2026-03-15', desc:'iFood',                   amount:5.95,   sub:'iFood',                   pay:'Cartão',   month:3 },
    // ── ABR ──
    { date:'2026-04-10', desc:'Energia Elétrica',        amount:509.70, sub:'Energia Elétrica',        pay:'Dinheiro', month:4 },
    { date:'2026-04-10', desc:'Água e Saneamento',       amount:373.94, sub:'Água e Saneamento',       pay:'Dinheiro', month:4 },
    { date:'2026-04-08', desc:'TV / Internet',           amount:600.85, sub:'TV / Internet / Telefone',pay:'Dinheiro', month:4 },
    { date:'2026-04-12', desc:'Reparos e Manutenção',    amount:115.00, sub:'Reparos e Manutenção',    pay:'Dinheiro', month:4 },
    { date:'2026-04-15', desc:'Outras despesas moradia', amount:129.11, sub:'Outras despesas',         pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'Outras despesas moradia', amount:49.00,  sub:'Outras despesas',         pay:'Dinheiro', month:4 },
    { date:'2026-04-12', desc:'Móveis e itens casa',     amount:148.13, sub:'Móveis e itens casa',     pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'Móveis e itens casa',     amount:540.73, sub:'Móveis e itens casa',     pay:'Dinheiro', month:4 },
    { date:'2026-04-15', desc:'Spotify',                 amount:40.90,  sub:'Spotify',                 pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'Amazon Prime',            amount:13.90,  sub:'Amazon Prime',            pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'Apple',                   amount:88.70,  sub:'Apple',                   pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'iFood',                   amount:11.90,  sub:'iFood',                   pay:'Cartão',   month:4 },
  ];

  // ── CANÔNICO: outras categorias 2026 Q1 ──────────────────────────
  const DESPESAS_2026_Q1_OUTRAS = [
    // ── ALIMENTAÇÃO ──
    { date:'2026-01-10', desc:'Supermercado',    amount:1856.92, category:'alimentacao', sub:'Supermercado',    pay:'Cartão',   month:1 },
    { date:'2026-01-10', desc:'Supermercado',    amount:1783.47, category:'alimentacao', sub:'Supermercado',    pay:'Dinheiro', month:1 },
    { date:'2026-01-20', desc:'Padaria',         amount:30.93,   category:'alimentacao', sub:'Padaria',         pay:'Cartão',   month:1 },
    { date:'2026-01-20', desc:'Padaria',         amount:45.29,   category:'alimentacao', sub:'Padaria',         pay:'Dinheiro', month:1 },
    { date:'2026-01-22', desc:'Sorveteria',      amount:91.67,   category:'alimentacao', sub:'Sorveteria',      pay:'Dinheiro', month:1 },
    { date:'2026-01-18', desc:'Água',            amount:36.00,   category:'alimentacao', sub:'Água',            pay:'Dinheiro', month:1 },
    { date:'2026-02-10', desc:'Supermercado',    amount:1623.41, category:'alimentacao', sub:'Supermercado',    pay:'Cartão',   month:2 },
    { date:'2026-02-10', desc:'Supermercado',    amount:164.10,  category:'alimentacao', sub:'Supermercado',    pay:'Dinheiro', month:2 },
    { date:'2026-02-12', desc:'Feira / Sacolão', amount:393.91,  category:'alimentacao', sub:'Feira / Sacolão', pay:'Dinheiro', month:2 },
    { date:'2026-02-20', desc:'Padaria',         amount:58.42,   category:'alimentacao', sub:'Padaria',         pay:'Cartão',   month:2 },
    { date:'2026-02-20', desc:'Padaria',         amount:5.69,    category:'alimentacao', sub:'Padaria',         pay:'Dinheiro', month:2 },
    { date:'2026-02-20', desc:'Açougue',         amount:121.43,  category:'alimentacao', sub:'Açougue',         pay:'Dinheiro', month:2 },
    { date:'2026-02-22', desc:'Sorveteria',      amount:155.31,  category:'alimentacao', sub:'Sorveteria',      pay:'Cartão',   month:2 },
    { date:'2026-02-18', desc:'Água',            amount:18.00,   category:'alimentacao', sub:'Água',            pay:'Cartão',   month:2 },
    { date:'2026-02-18', desc:'Água',            amount:18.00,   category:'alimentacao', sub:'Água',            pay:'Dinheiro', month:2 },
    { date:'2026-03-10', desc:'Supermercado',    amount:2349.54, category:'alimentacao', sub:'Supermercado',    pay:'Cartão',   month:3 },
    { date:'2026-03-10', desc:'Supermercado',    amount:163.65,  category:'alimentacao', sub:'Supermercado',    pay:'Dinheiro', month:3 },
    { date:'2026-03-12', desc:'Feira / Sacolão', amount:235.01,  category:'alimentacao', sub:'Feira / Sacolão', pay:'Cartão',   month:3 },
    { date:'2026-03-12', desc:'Feira / Sacolão', amount:312.66,  category:'alimentacao', sub:'Feira / Sacolão', pay:'Dinheiro', month:3 },
    { date:'2026-03-20', desc:'Padaria',         amount:93.91,   category:'alimentacao', sub:'Padaria',         pay:'Cartão',   month:3 },
    { date:'2026-03-20', desc:'Padaria',         amount:22.22,   category:'alimentacao', sub:'Padaria',         pay:'Dinheiro', month:3 },
    { date:'2026-03-20', desc:'Açougue',         amount:210.36,  category:'alimentacao', sub:'Açougue',         pay:'Dinheiro', month:3 },
    { date:'2026-03-18', desc:'Água',            amount:36.00,   category:'alimentacao', sub:'Água',            pay:'Cartão',   month:3 },
    { date:'2026-03-18', desc:'Água',            amount:18.00,   category:'alimentacao', sub:'Água',            pay:'Dinheiro', month:3 },
    { date:'2026-04-10', desc:'Supermercado',    amount:284.43,  category:'alimentacao', sub:'Supermercado',    pay:'Cartão',   month:4 },
    { date:'2026-04-10', desc:'Supermercado',    amount:1569.20, category:'alimentacao', sub:'Supermercado',    pay:'Dinheiro', month:4 },
    { date:'2026-04-12', desc:'Feira / Sacolão', amount:818.26,  category:'alimentacao', sub:'Feira / Sacolão', pay:'Dinheiro', month:4 },
    { date:'2026-04-20', desc:'Padaria',         amount:31.88,   category:'alimentacao', sub:'Padaria',         pay:'Dinheiro', month:4 },
    { date:'2026-04-20', desc:'Açougue',         amount:98.89,   category:'alimentacao', sub:'Açougue',         pay:'Dinheiro', month:4 },
    { date:'2026-04-22', desc:'Sorveteria',      amount:49.45,   category:'alimentacao', sub:'Sorveteria',      pay:'Cartão',   month:4 },
    { date:'2026-04-22', desc:'Sorveteria',      amount:57.20,   category:'alimentacao', sub:'Sorveteria',      pay:'Dinheiro', month:4 },
    { date:'2026-04-18', desc:'Água',            amount:36.00,   category:'alimentacao', sub:'Água',            pay:'Dinheiro', month:4 },

    // ── TRANSPORTE ──
    { date:'2026-01-05', desc:'Aluguel Carro',   amount:2439.58, category:'transporte', sub:'Aluguel Carro',   pay:'Cartão',   month:1 },
    { date:'2026-01-15', desc:'Combustível',     amount:194.05,  category:'transporte', sub:'Combustível',     pay:'Cartão',   month:1 },
    { date:'2026-01-15', desc:'Combustível',     amount:245.81,  category:'transporte', sub:'Combustível',     pay:'Dinheiro', month:1 },
    { date:'2026-01-15', desc:'Manutenção',      amount:1.00,    category:'transporte', sub:'Manutenção',      pay:'Dinheiro', month:1 },
    { date:'2026-01-20', desc:'Estacionamento',  amount:21.00,   category:'transporte', sub:'Estacionamento',  pay:'Dinheiro', month:1 },
    { date:'2026-02-05', desc:'Aluguel Carro',   amount:2555.95, category:'transporte', sub:'Aluguel Carro',   pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'Combustível',     amount:316.94,  category:'transporte', sub:'Combustível',     pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'Combustível',     amount:318.46,  category:'transporte', sub:'Combustível',     pay:'Dinheiro', month:2 },
    { date:'2026-02-20', desc:'Estacionamento',  amount:12.95,   category:'transporte', sub:'Estacionamento',  pay:'Dinheiro', month:2 },
    { date:'2026-02-20', desc:'Multas',          amount:68.32,   category:'transporte', sub:'Multas',          pay:'Cartão',   month:2 },
    { date:'2026-03-05', desc:'Aluguel Carro',   amount:2368.80, category:'transporte', sub:'Aluguel Carro',   pay:'Cartão',   month:3 },
    { date:'2026-03-15', desc:'Combustível',     amount:420.05,  category:'transporte', sub:'Combustível',     pay:'Cartão',   month:3 },
    { date:'2026-03-15', desc:'Combustível',     amount:445.39,  category:'transporte', sub:'Combustível',     pay:'Dinheiro', month:3 },
    { date:'2026-03-20', desc:'Estacionamento',  amount:20.00,   category:'transporte', sub:'Estacionamento',  pay:'Dinheiro', month:3 },
    { date:'2026-04-05', desc:'Aluguel Carro',   amount:2281.44, category:'transporte', sub:'Aluguel Carro',   pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'Combustível',     amount:287.71,  category:'transporte', sub:'Combustível',     pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'Combustível',     amount:363.63,  category:'transporte', sub:'Combustível',     pay:'Dinheiro', month:4 },
    { date:'2026-04-15', desc:'Manutenção',      amount:1.00,    category:'transporte', sub:'Manutenção',      pay:'Dinheiro', month:4 },
    { date:'2026-04-20', desc:'Estacionamento',  amount:40.00,   category:'transporte', sub:'Estacionamento',  pay:'Cartão',   month:4 },

    // ── SAÚDE ──
    { date:'2026-01-25', desc:'Medicamentos',    amount:50.38,   category:'saude', sub:'Medicamentos',    pay:'Dinheiro', month:1 },
    { date:'2026-01-10', desc:'Dentista',        amount:481.00,  category:'saude', sub:'Dentista',        pay:'Dinheiro', month:1 },
    { date:'2026-02-25', desc:'Medicamentos',    amount:21.59,   category:'saude', sub:'Medicamentos',    pay:'Cartão',   month:2 },
    { date:'2026-02-25', desc:'Medicamentos',    amount:25.58,   category:'saude', sub:'Medicamentos',    pay:'Dinheiro', month:2 },
    { date:'2026-02-26', desc:'Higiene Pessoal', amount:68.32,   category:'saude', sub:'Higiene Pessoal', pay:'Cartão',   month:2 },
    { date:'2026-03-25', desc:'Medicamentos',    amount:104.80,  category:'saude', sub:'Medicamentos',    pay:'Cartão',   month:3 },
    { date:'2026-03-26', desc:'Higiene Pessoal', amount:68.30,   category:'saude', sub:'Higiene Pessoal', pay:'Cartão',   month:3 },
    { date:'2026-04-25', desc:'Medicamentos',    amount:158.37,  category:'saude', sub:'Medicamentos',    pay:'Cartão',   month:4 },
    { date:'2026-04-25', desc:'Medicamentos',    amount:34.54,   category:'saude', sub:'Medicamentos',    pay:'Dinheiro', month:4 },
    { date:'2026-04-26', desc:'Higiene Pessoal', amount:152.28,  category:'saude', sub:'Higiene Pessoal', pay:'Cartão',   month:4 },

    // ── PESSOAL ──
    { date:'2026-01-28', desc:'Presentes',       amount:244.97,  category:'pessoal', sub:'Presentes', pay:'Cartão',   month:1 },
    { date:'2026-01-28', desc:'Presentes',       amount:189.97,  category:'pessoal', sub:'Presentes', pay:'Dinheiro', month:1 },
    { date:'2026-01-20', desc:'Vestuário',       amount:1078.57, category:'pessoal', sub:'Vestuário', pay:'Cartão',   month:1 },
    { date:'2026-01-15', desc:'Cigarro',         amount:164.49,  category:'pessoal', sub:'Cigarro',   pay:'Cartão',   month:1 },
    { date:'2026-01-15', desc:'Cigarro',         amount:588.00,  category:'pessoal', sub:'Cigarro',   pay:'Dinheiro', month:1 },
    { date:'2026-01-15', desc:'Cerveja',         amount:306.08,  category:'pessoal', sub:'Cerveja',   pay:'Cartão',   month:1 },
    { date:'2026-01-15', desc:'Cerveja',         amount:322.87,  category:'pessoal', sub:'Cerveja',   pay:'Dinheiro', month:1 },
    { date:'2026-02-15', desc:'Presentes',       amount:125.00,  category:'pessoal', sub:'Presentes', pay:'Cartão',   month:2 },
    { date:'2026-02-20', desc:'Vestuário',       amount:858.68,  category:'pessoal', sub:'Vestuário', pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'Cigarro',         amount:726.27,  category:'pessoal', sub:'Cigarro',   pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'Cigarro',         amount:393.50,  category:'pessoal', sub:'Cigarro',   pay:'Dinheiro', month:2 },
    { date:'2026-02-15', desc:'Cerveja',         amount:464.79,  category:'pessoal', sub:'Cerveja',   pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'Cerveja',         amount:110.08,  category:'pessoal', sub:'Cerveja',   pay:'Dinheiro', month:2 },
    { date:'2026-03-15', desc:'Presentes',       amount:125.00,  category:'pessoal', sub:'Presentes', pay:'Cartão',   month:3 },
    { date:'2026-03-20', desc:'Vestuário',       amount:251.19,  category:'pessoal', sub:'Vestuário', pay:'Cartão',   month:3 },
    { date:'2026-03-15', desc:'Cigarro',         amount:308.98,  category:'pessoal', sub:'Cigarro',   pay:'Cartão',   month:3 },
    { date:'2026-03-15', desc:'Cigarro',         amount:630.95,  category:'pessoal', sub:'Cigarro',   pay:'Dinheiro', month:3 },
    { date:'2026-03-15', desc:'Cerveja',         amount:109.57,  category:'pessoal', sub:'Cerveja',   pay:'Cartão',   month:3 },
    { date:'2026-03-15', desc:'Cerveja',         amount:264.60,  category:'pessoal', sub:'Cerveja',   pay:'Dinheiro', month:3 },
    { date:'2026-04-15', desc:'Salão de Beleza', amount:385.00,  category:'pessoal', sub:'Salão de Beleza', pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'Presentes',       amount:268.40,  category:'pessoal', sub:'Presentes', pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'Presentes',       amount:133.85,  category:'pessoal', sub:'Presentes', pay:'Dinheiro', month:4 },
    { date:'2026-04-20', desc:'Vestuário',       amount:550.80,  category:'pessoal', sub:'Vestuário', pay:'Cartão',   month:4 },
    { date:'2026-04-20', desc:'Vestuário',       amount:2000.00, category:'pessoal', sub:'Vestuário', pay:'Dinheiro', month:4 },
    { date:'2026-04-15', desc:'Cigarro',         amount:634.25,  category:'pessoal', sub:'Cigarro',   pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'Cigarro',         amount:783.00,  category:'pessoal', sub:'Cigarro',   pay:'Dinheiro', month:4 },
    { date:'2026-04-15', desc:'Cerveja',         amount:223.94,  category:'pessoal', sub:'Cerveja',   pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'Cerveja',         amount:131.48,  category:'pessoal', sub:'Cerveja',   pay:'Dinheiro', month:4 },

    // ── DOGS ──
    { date:'2026-01-22', desc:'Banho e Tosa',    amount:205.00,  category:'dogs', sub:'Banho e Tosa',             pay:'Cartão',   month:1 },
    { date:'2026-01-18', desc:'Assessórios',     amount:84.89,   category:'dogs', sub:'Assessórios / Brinquedos', pay:'Dinheiro', month:1 },
    { date:'2026-02-22', desc:'Ração',           amount:116.95,  category:'dogs', sub:'Ração',                    pay:'Cartão',   month:2 },
    { date:'2026-02-22', desc:'Banho e Tosa',    amount:205.00,  category:'dogs', sub:'Banho e Tosa',             pay:'Cartão',   month:2 },
    { date:'2026-02-18', desc:'Assessórios',     amount:67.90,   category:'dogs', sub:'Assessórios / Brinquedos', pay:'Cartão',   month:2 },
    { date:'2026-03-22', desc:'Ração',           amount:116.95,  category:'dogs', sub:'Ração',                    pay:'Cartão',   month:3 },
    { date:'2026-03-22', desc:'Banho e Tosa',    amount:184.50,  category:'dogs', sub:'Banho e Tosa',             pay:'Cartão',   month:3 },
    { date:'2026-03-20', desc:'Veterinário',     amount:365.00,  category:'dogs', sub:'Veterinário',              pay:'Cartão',   month:3 },
    { date:'2026-03-18', desc:'Assessórios',     amount:56.80,   category:'dogs', sub:'Assessórios / Brinquedos', pay:'Cartão',   month:3 },
    { date:'2026-04-22', desc:'Banho e Tosa',    amount:184.50,  category:'dogs', sub:'Banho e Tosa',             pay:'Cartão',   month:4 },
    { date:'2026-04-20', desc:'Veterinário',     amount:365.00,  category:'dogs', sub:'Veterinário',              pay:'Cartão',   month:4 },
    { date:'2026-04-18', desc:'Assessórios',     amount:146.79,  category:'dogs', sub:'Assessórios / Brinquedos', pay:'Cartão',   month:4 },

    // ── LAZER ──
    { date:'2026-01-25', desc:'Restaurantes e Passeios', amount:607.31,  category:'lazer', sub:'Restaurantes e Passeios', pay:'Cartão',   month:1 },
    { date:'2026-01-25', desc:'Restaurantes e Passeios', amount:467.69,  category:'lazer', sub:'Restaurantes e Passeios', pay:'Dinheiro', month:1 },
    { date:'2026-01-20', desc:'Diversão Local',          amount:28.00,   category:'lazer', sub:'Diversão Local',          pay:'Cartão',   month:1 },
    { date:'2026-01-20', desc:'Diversão Local',          amount:20.00,   category:'lazer', sub:'Diversão Local',          pay:'Dinheiro', month:1 },
    { date:'2026-01-15', desc:'Famílias e Amigos',       amount:121.15,  category:'lazer', sub:'Famílias e Amigos',       pay:'Dinheiro', month:1 },
    { date:'2026-01-10', desc:'Viagens',                 amount:566.09,  category:'lazer', sub:'Viagens',                 pay:'Cartão',   month:1 },
    { date:'2026-02-25', desc:'Restaurantes e Passeios', amount:604.01,  category:'lazer', sub:'Restaurantes e Passeios', pay:'Cartão',   month:2 },
    { date:'2026-02-25', desc:'Restaurantes e Passeios', amount:336.75,  category:'lazer', sub:'Restaurantes e Passeios', pay:'Dinheiro', month:2 },
    { date:'2026-02-20', desc:'Diversão Local',          amount:98.40,   category:'lazer', sub:'Diversão Local',          pay:'Cartão',   month:2 },
    { date:'2026-02-18', desc:'Famílias e Amigos',       amount:37.98,   category:'lazer', sub:'Famílias e Amigos',       pay:'Cartão',   month:2 },
    { date:'2026-03-25', desc:'Restaurantes e Passeios', amount:540.67,  category:'lazer', sub:'Restaurantes e Passeios', pay:'Cartão',   month:3 },
    { date:'2026-03-25', desc:'Restaurantes e Passeios', amount:173.77,  category:'lazer', sub:'Restaurantes e Passeios', pay:'Dinheiro', month:3 },
    { date:'2026-03-20', desc:'Diversão Local',          amount:68.40,   category:'lazer', sub:'Diversão Local',          pay:'Cartão',   month:3 },
    { date:'2026-03-18', desc:'Famílias e Amigos',       amount:72.84,   category:'lazer', sub:'Famílias e Amigos',       pay:'Cartão',   month:3 },
    { date:'2026-04-25', desc:'Restaurantes e Passeios', amount:1115.23, category:'lazer', sub:'Restaurantes e Passeios', pay:'Cartão',   month:4 },
    { date:'2026-04-25', desc:'Restaurantes e Passeios', amount:1414.21, category:'lazer', sub:'Restaurantes e Passeios', pay:'Dinheiro', month:4 },
    { date:'2026-04-20', desc:'Diversão Local',          amount:7.50,    category:'lazer', sub:'Diversão Local',          pay:'Cartão',   month:4 },
    { date:'2026-04-20', desc:'Diversão Local',          amount:11.90,   category:'lazer', sub:'Diversão Local',          pay:'Dinheiro', month:4 },
    { date:'2026-04-18', desc:'Famílias e Amigos',       amount:70.80,   category:'lazer', sub:'Famílias e Amigos',       pay:'Dinheiro', month:4 },
    { date:'2026-04-10', desc:'Viagens',                 amount:18.00,   category:'lazer', sub:'Viagens',                 pay:'Cartão',   month:4 },

    // ── FINANCEIRO ──
    { date:'2026-01-28', desc:'Taxas Bancárias',  amount:2000.95, category:'financeiro', sub:'Taxas Bancárias',  pay:'Dinheiro', month:1 },
    { date:'2026-01-28', desc:'Loteria',          amount:124.00,  category:'financeiro', sub:'Loteria',          pay:'Dinheiro', month:1 },
    { date:'2026-01-28', desc:'Contador',         amount:684.00,  category:'financeiro', sub:'Contador',         pay:'Dinheiro', month:1 },
    { date:'2026-01-28', desc:'Impostos Empresa', amount:1366.98, category:'financeiro', sub:'Impostos Empresa', pay:'Dinheiro', month:1 },
    { date:'2026-02-28', desc:'Taxas Bancárias',  amount:79.50,   category:'financeiro', sub:'Taxas Bancárias',  pay:'Dinheiro', month:2 },
    { date:'2026-02-28', desc:'Saques',           amount:72.78,   category:'financeiro', sub:'Saques',           pay:'Dinheiro', month:2 },
    { date:'2026-02-28', desc:'Cartório',         amount:12.99,   category:'financeiro', sub:'Cartório',         pay:'Dinheiro', month:2 },
    { date:'2026-03-28', desc:'Taxas Bancárias',  amount:198.84,  category:'financeiro', sub:'Taxas Bancárias',  pay:'Cartão',   month:3 },
    { date:'2026-03-28', desc:'Taxas Bancárias',  amount:159.75,  category:'financeiro', sub:'Taxas Bancárias',  pay:'Dinheiro', month:3 },
    { date:'2026-03-28', desc:'Contador',         amount:260.52,  category:'financeiro', sub:'Contador',         pay:'Dinheiro', month:3 },
    { date:'2026-03-28', desc:'Impostos Empresa', amount:17.36,   category:'financeiro', sub:'Impostos Empresa', pay:'Cartão',   month:3 },
    { date:'2026-04-28', desc:'Taxas Bancárias',  amount:141.00,  category:'financeiro', sub:'Taxas Bancárias',  pay:'Dinheiro', month:4 },
    { date:'2026-04-28', desc:'Saques (estorno)', amount:-43.32,  category:'financeiro', sub:'Saques',           pay:'Cartão',   month:4 },
    { date:'2026-04-28', desc:'Saques',           amount:26.50,   category:'financeiro', sub:'Saques',           pay:'Dinheiro', month:4 },
    { date:'2026-04-28', desc:'Contador',         amount:1626.82, category:'financeiro', sub:'Contador',         pay:'Dinheiro', month:4 },
    { date:'2026-04-28', desc:'Impostos Empresa', amount:2540.15, category:'financeiro', sub:'Impostos Empresa', pay:'Dinheiro', month:4 },

    // ── CARTÕES & WALLETS ──
    { date:'2026-01-31', desc:'Itaú Click',    amount:4567.01,  category:'cartoes', sub:'Itaú Click',    pay:'Dinheiro', month:1 },
    { date:'2026-01-31', desc:'Itaú Uniclass', amount:3576.51,  category:'cartoes', sub:'Itaú Uniclass', pay:'Dinheiro', month:1 },
    { date:'2026-01-31', desc:'Shopee',        amount:63.91,    category:'cartoes', sub:'Shopee',        pay:'Cartão',   month:1 },
    { date:'2026-01-31', desc:'Shopee',        amount:155.42,   category:'cartoes', sub:'Shopee',        pay:'Dinheiro', month:1 },
    { date:'2026-01-31', desc:'Mercado Livre', amount:213.74,   category:'cartoes', sub:'Mercado Livre', pay:'Cartão',   month:1 },
    { date:'2026-01-31', desc:'Mercado Livre', amount:204.81,   category:'cartoes', sub:'Mercado Livre', pay:'Dinheiro', month:1 },
    { date:'2026-02-28', desc:'Itaú Click (estorno)', amount:-1229.57, category:'cartoes', sub:'Itaú Click', pay:'Cartão',   month:2 },
    { date:'2026-02-28', desc:'Shopee',        amount:63.91,    category:'cartoes', sub:'Shopee',        pay:'Cartão',   month:2 },
    { date:'2026-02-28', desc:'Shopee',        amount:125.18,   category:'cartoes', sub:'Shopee',        pay:'Dinheiro', month:2 },
    { date:'2026-03-28', desc:'Itaú Click',    amount:1229.57,  category:'cartoes', sub:'Itaú Click',    pay:'Cartão',   month:3 },
    { date:'2026-03-28', desc:'Shopee',        amount:63.90,    category:'cartoes', sub:'Shopee',        pay:'Cartão',   month:3 },
    { date:'2026-03-28', desc:'Shopee',        amount:77.33,    category:'cartoes', sub:'Shopee',        pay:'Dinheiro', month:3 },
    { date:'2026-03-28', desc:'Torra Torra',   amount:172.01,   category:'cartoes', sub:'Torra Torra',   pay:'Dinheiro', month:3 },
    { date:'2026-04-28', desc:'Shopee',        amount:237.52,   category:'cartoes', sub:'Shopee',        pay:'Dinheiro', month:4 },
    { date:'2026-04-28', desc:'Mercado Livre', amount:669.27,   category:'cartoes', sub:'Mercado Livre', pay:'Dinheiro', month:4 },

    // ── ROBERTO INDIVIDUAL ──
    { date:'2026-01-31', desc:'Melissa Advogada', amount:1500.00, category:'assessorias', sub:'Melissa Advogada', pay:'Dinheiro', month:1 },
    { date:'2026-01-31', desc:'Assinaturas',      amount:73.58,   category:'pessoal',     sub:'Assinaturas',      pay:'Cartão',   month:1 },
    { date:'2026-01-31', desc:'Celular',          amount:179.90,  category:'pessoal',     sub:'Celular',          pay:'Cartão',   month:1 },
    { date:'2026-02-28', desc:'Assinaturas',      amount:42.51,   category:'pessoal',     sub:'Assinaturas',      pay:'Cartão',   month:2 },
    { date:'2026-02-28', desc:'Celular',          amount:179.90,  category:'pessoal',     sub:'Celular',          pay:'Cartão',   month:2 },
    { date:'2026-03-28', desc:'Assinaturas',      amount:94.99,   category:'pessoal',     sub:'Assinaturas',      pay:'Cartão',   month:3 },
    { date:'2026-03-28', desc:'Celular',          amount:179.90,  category:'pessoal',     sub:'Celular',          pay:'Cartão',   month:3 },
    { date:'2026-04-28', desc:'Assinaturas',      amount:133.75,  category:'pessoal',     sub:'Assinaturas',      pay:'Cartão',   month:4 },
    { date:'2026-04-28', desc:'Melissa Advogada', amount:3900.00, category:'assessorias', sub:'Melissa Advogada', pay:'Dinheiro', month:4 },

    // ── MARIANA INDIVIDUAL (migrado → educacao/pessoal/alimentacao) ──
    { date:'2026-01-28', desc:'Faculdade UNIP',     amount:748.14,  category:'educacao',    sub:'Faculdade UNIP',     pay:'Dinheiro', month:1 },
    { date:'2026-02-28', desc:'Faculdade UNIP',     amount:748.14,  category:'educacao',    sub:'Faculdade UNIP',     pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'Lanche',             amount:34.00,   category:'alimentacao', sub:'Lanche na Faculdade',pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'Lanche',             amount:8.50,    category:'alimentacao', sub:'Lanche na Faculdade',pay:'Dinheiro', month:2 },
    { date:'2026-03-15', desc:'Livros e Materiais', amount:138.88,  category:'educacao',    sub:'Livros e Materiais', pay:'Cartão',   month:3 },
    { date:'2026-03-15', desc:'Livros e Materiais', amount:28.50,   category:'educacao',    sub:'Livros e Materiais', pay:'Dinheiro', month:3 },
    { date:'2026-03-15', desc:'Mesada',             amount:30.00,   category:'pessoal',     sub:'Mesada',             pay:'Dinheiro', month:3 },
    { date:'2026-03-15', desc:'Lanche',             amount:49.00,   category:'alimentacao', sub:'Lanche na Faculdade',pay:'Cartão',   month:3 },
    { date:'2026-03-15', desc:'Lanche',             amount:23.50,   category:'alimentacao', sub:'Lanche na Faculdade',pay:'Dinheiro', month:3 },
    { date:'2026-04-28', desc:'Faculdade UNIP',     amount:1835.83, category:'educacao',    sub:'Faculdade UNIP',     pay:'Dinheiro', month:4 },
    { date:'2026-04-28', desc:'Livros e Materiais', amount:71.98,   category:'educacao',    sub:'Livros e Materiais', pay:'Cartão',   month:4 },
    { date:'2026-04-28', desc:'Livros e Materiais', amount:11.70,   category:'educacao',    sub:'Livros e Materiais', pay:'Dinheiro', month:4 },
    { date:'2026-04-15', desc:'Mesada',             amount:49.80,   category:'pessoal',     sub:'Mesada',             pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'Lanche',             amount:47.50,   category:'alimentacao', sub:'Lanche na Faculdade',pay:'Cartão',   month:4 },
    { date:'2026-04-15', desc:'Lanche',             amount:37.50,   category:'alimentacao', sub:'Lanche na Faculdade',pay:'Dinheiro', month:4 },
    { date:'2026-04-28', desc:'OAB',                amount:320.00,  category:'assessorias', sub:'OAB',                pay:'Dinheiro', month:4 },

    // ── MANUELA INDIVIDUAL ──
    { date:'2026-02-15', desc:'Livros e Materiais', amount:72.50,   category:'manuela', sub:'Livros e Materiais', pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'Uniforme',           amount:130.50,  category:'manuela', sub:'Uniforme',           pay:'Cartão',   month:2 },
    { date:'2026-02-15', desc:'Passeios',           amount:16.49,   category:'manuela', sub:'Passeios',           pay:'Cartão',   month:2 },
    { date:'2026-03-15', desc:'Uniforme',           amount:130.50,  category:'manuela', sub:'Uniforme',           pay:'Cartão',   month:3 },
    { date:'2026-04-15', desc:'Passeios',           amount:39.96,   category:'manuela', sub:'Passeios',           pay:'Cartão',   month:4 },
    { date:'2026-04-28', desc:'Escola Manuela',     amount:3780.00, category:'manuela', sub:'Escola Manuela',     pay:'Dinheiro', month:4 },
    { date:'2026-04-28', desc:'Mesada',             amount:500.00,  category:'manuela', sub:'Mesada',             pay:'Dinheiro', month:4 },
  ];

  const PESSOAS = ['Roberto','Mariana','Manuela','Família'];

  const BANKS = ['Itaú','Bradesco','Santander','Nubank','Inter','C6 Bank','Caixa','Banco do Brasil','BTG Pactual','XP','Wise','PicPay','Mercado Pago'];
  const ACCOUNT_TYPES = ['Corrente','Poupança','Digital','Salário','Investimento'];

  // ── SEED DATA (from spreadsheet) ───────────────────────────────
  function buildSeed() {
    const receitas = [
      // ROBERTO
      { id: 'r1',  date: '2026-01-05', desc: 'Mastercard – Contrato',  amount: 30000,  category: 'receita', person: 'Roberto', type: 'salario',    month: 1, year: 2026 },
      { id: 'r3',  date: '2026-03-05', desc: 'Bridge – Contrato I',    amount: 6120,   category: 'receita', person: 'Roberto', type: 'contrato',   month: 3, year: 2026 },
      { id: 'r4',  date: '2026-03-10', desc: 'Empréstimo',             amount: 5000,   category: 'receita', person: 'Roberto', type: 'emprestimo', month: 3, year: 2026 },
      { id: 'r5',  date: '2026-04-05', desc: 'Bridge – Contrato I',    amount: 25704,  category: 'receita', person: 'Roberto', type: 'contrato',   month: 4, year: 2026 },
      // MARIANA
      { id: 'r8',  date: '2026-01-10', desc: 'Parcelas Filipe',        amount: 1250,   category: 'receita', person: 'Mariana', type: 'outros',     month: 1, year: 2026 },
      { id: 'r9',  date: '2026-02-10', desc: 'Parcelas Filipe',        amount: 1250,   category: 'receita', person: 'Mariana', type: 'outros',     month: 2, year: 2026 },
      { id: 'r10', date: '2026-03-10', desc: 'Parcelas Filipe',        amount: 1250,   category: 'receita', person: 'Mariana', type: 'outros',     month: 3, year: 2026 },
      { id: 'r11', date: '2026-03-15', desc: 'Empréstimo',             amount: 550,    category: 'receita', person: 'Mariana', type: 'emprestimo', month: 3, year: 2026 },
      { id: 'r12', date: '2026-04-10', desc: 'Parcelas Filipe',        amount: 1250,   category: 'receita', person: 'Mariana', type: 'outros',     month: 4, year: 2026 },
      // MANUELA
      { id: 'r13', date: '2026-01-05', desc: 'Pensão Mensal',          amount: 3517.64,category: 'receita', person: 'Manuela', type: 'pensao',     month: 1, year: 2026 },
      { id: 'r14', date: '2026-02-05', desc: 'Pensão Mensal',          amount: 3510.54,category: 'receita', person: 'Manuela', type: 'pensao',     month: 2, year: 2026 },
      { id: 'r15', date: '2026-03-05', desc: 'Pensão Mensal',          amount: 3510.54,category: 'receita', person: 'Manuela', type: 'pensao',     month: 3, year: 2026 },
      { id: 'r16', date: '2026-04-01', desc: 'Pensão – PLR',           amount: 12125.43,category:'receita', person: 'Manuela', type: 'pensao',     month: 4, year: 2026 },
    ];

    // Despesas Jan-Abr 2026: inseridas pela migração _cleanupDespesas2026Q1
    // (canônico da planilha oficial). Aluguel: vem do Contrato cadastrado.
    const despesas = [];

    const metas = [
      { id: 'm1', label: 'Receita Mínima Mensal', target: 20000, type: 'receita_min', active: true },
      { id: 'm2', label: 'Limite de Gastos (70%)', target: 0.70, type: 'gasto_max_pct', active: true },
      { id: 'm3', label: 'Reserva de Emergência', target: 50000, current: 12200, type: 'reserva', active: true },
      { id: 'm4', label: 'Casa Própria', target: 180000, current: 0, type: 'projeto', deadline: '2030-12-31', active: true },
      { id: 'm5', label: 'Carro da Mayza', target: 15000, current: 0, type: 'projeto', deadline: '2027-06-30', active: true },
      { id: 'm6', label: 'Viagem Disney', target: 25000, current: 3000, type: 'projeto', deadline: '2028-01-01', active: true },
      { id: 'm7', label: 'Pós-Mestrado CIO FGV', target: 50000, current: 0, type: 'projeto', deadline: '2027-01-01', active: true },
      { id: 'm8', label: 'Viagem Maresias I', target: 2200, current: 500, type: 'projeto', deadline: '2026-07-01', active: true },
      { id: 'm9', label: 'Spa Cabreuva', target: 4000, current: 0, type: 'projeto', deadline: '2026-12-31', active: true },
    ];

    const cartoes = [
      {
        id: 'cc1', name: 'Itaú Click', banco: 'Itaú', limit: 15000, closingDay: 25, dueDay: 3,
        color: 'accent',
        parcelas: [
          { id: 'p1', desc: 'TV Samsung 65"', total: 3600, qtd: 12, parcela: 300, inicio: '2026-01' },
          { id: 'p2', desc: 'Notebook Dell',  total: 6000, qtd: 10, parcela: 600, inicio: '2026-02' },
          { id: 'p3', desc: 'Sofá 3 lugares', total: 2400, qtd: 8,  parcela: 300, inicio: '2026-03' },
        ]
      },
      {
        id: 'cc2', name: 'Itaú Uniclass', banco: 'Itaú', limit: 25000, closingDay: 20, dueDay: 1,
        color: 'gold',
        parcelas: [
          { id: 'p4', desc: 'Viagem Dezembro 2025', total: 4800, qtd: 6, parcela: 800, inicio: '2026-01' },
          { id: 'p5', desc: 'Curso Online',          total: 1800, qtd: 3, parcela: 600, inicio: '2026-03' },
        ]
      },
    ];

    const ativos = [
      { id: 'a1', platform: 'Stake USDT',           type: 'Crypto',  qty: 6023,       unitPrice: 1,     currency: 'USD', updated: '2023-11-20' },
      { id: 'a2', platform: 'Stake BTC',             type: 'Crypto',  qty: 0.11,       unitPrice: 92000, currency: 'USD', updated: '2023-11-20' },
      { id: 'a3', platform: 'Stake XRP',             type: 'Crypto',  qty: 4081,       unitPrice: 2.50,  currency: 'USD', updated: '2023-11-20' },
      { id: 'a4', platform: 'Stake ETH',             type: 'Crypto',  qty: 1.51,       unitPrice: 3200,  currency: 'USD', updated: '2023-11-20' },
      { id: 'a5', platform: 'Stake TRX',             type: 'Crypto',  qty: 1128,       unitPrice: 0.27,  currency: 'USD', updated: '2023-11-20' },
      { id: 'a6', platform: 'Stake LTC',             type: 'Crypto',  qty: 5.22,       unitPrice: 100,   currency: 'USD', updated: '2023-11-20' },
      { id: 'a7', platform: 'Stake SHIB',            type: 'Crypto',  qty: 44444901,   unitPrice: 0.000016, currency: 'USD', updated: '2023-11-20' },
      { id: 'a8', platform: 'LiQi Tokens',           type: 'Token',   qty: 13411,      unitPrice: 0.889, currency: 'BRL', updated: '2023-11-12' },
      { id: 'a9', platform: 'Empréstimo Fernando Prc I', type: 'FIAT BR', qty: 10000,  unitPrice: 1,     currency: 'BRL', updated: '2023-11-05' },
      { id: 'a10',platform: 'Kava DeFi',             type: 'Crypto',  qty: 1220,       unitPrice: 1.20,  currency: 'USD', updated: '2023-11-20' },
      { id: 'a11',platform: 'Reserva Millennium',    type: 'FIAT EUR',qty: 12200,      unitPrice: 1,     currency: 'EUR', updated: '2023-11-05' },
      { id: 'a12',platform: 'LIQI-Tokens (Saque 2027)', type: 'FIAT BR', qty: 127090, unitPrice: 1,     currency: 'BRL', updated: '2023-11-20' },
    ];

    const contas = [
      { id: 'ct1', nome: 'Itaú Corrente', banco: 'Itaú',   tipo: 'Corrente', saldo: 8500,  cor: '#F59E0B' },
      { id: 'ct2', nome: 'Nubank',        banco: 'Nubank',  tipo: 'Digital',  saldo: 2300,  cor: '#7C6EF8' },
    ];

    const settings = {
      ano: 2026, moeda: 'BRL', mesAtual: 4,
      metaReceita: 20000, limiteGasto: 0.70,
      usdBrl: 5.85, eurBrl: 6.40,
      tema: 'dark',
    };

    const contratos = [];

    return { receitas, despesas, metas, cartoes, contas, ativos, settings, contratos };
  }

  // ── PERSISTENCE ────────────────────────────────────────────────
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  }

  function save(data) {
    data._syncedAt = Date.now(); // timestamp para resolução de conflito
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { console.warn('Store: cannot save', e); }
    // Hybrid sync: push to Supabase in background
    if (typeof SupabaseSync !== 'undefined' && SupabaseSync.isConnected()) {
      SupabaseSync.schedulePush(data);
    }
  }

  // Pull cloud data and merge into local store (called after login)
  async function syncFromCloud() {
    if (typeof SupabaseSync === 'undefined') return false;
    const cloudData = await SupabaseSync.pullFromCloud();
    if (!cloudData) return false;
    // Cloud wins — replace local with cloud data
    _data = cloudData;
    save(_data);
    _syncEditableConfig();
    return true;
  }

  let _data = null;

  function _migrateMetas() {
    if (!_data.metas) { _data.metas = []; return; }
    const seen = new Set();
    _data.metas = _data.metas.filter(m => {
      const k = (m.label || '') + '|' + (m.type || m.tipo || '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    _data.metas.forEach(m => {
      const t = m.type || m.tipo;
      // Mapear schema antigo → novo
      if (t === 'projeto' || t === 'objetivo') {
        m.type = 'objetivo'; m.period = m.period || 'unico';
      } else if (t === 'reserva') {
        m.type = 'reserva'; m.period = m.period || 'mensal';
      } else if (t === 'gasto_max_pct') {
        // converter: target em pct vira limite mensal baseado em metaReceita
        m.type = 'limite_desp'; m.period = 'mensal';
        if (m.target < 1) m.target = Math.round((_data.settings?.metaReceita || 20000) * m.target);
      } else if (t === 'receita_min') {
        m.type = 'min_receita'; m.period = m.period || 'mensal';
      } else if (t === 'mensal') {
        m.type = 'limite_desp'; m.period = 'mensal';
      } else if (t === 'anual') {
        m.type = 'limite_desp'; m.period = 'anual';
      }
      delete m.tipo;
      if (m.active === undefined) m.active = true;
    });
  }

  function _cleanupDespesas2026Q1() {
    if (_data.__cleanup_despesas2026q1) return;
    // Remove TODAS as despesas Jan-Abr 2026 que NÃO sejam de contrato
    // (lançamentos com contratoId — ex. Aluguel — são preservados)
    _data.despesas = _data.despesas.filter(d => {
      if (d.year === 2026 && d.month >= 1 && d.month <= 4 && !d.contratoId) {
        return false;
      }
      return true;
    });
    // Insere o canônico da planilha — Moradia + outras categorias
    MORADIA_2026_Q1.forEach(e => {
      _data.despesas.push({ ...e, id: newId(), category: 'moradia', year: 2026 });
    });
    DESPESAS_2026_Q1_OUTRAS.forEach(e => {
      _data.despesas.push({ ...e, id: newId(), year: 2026 });
    });
    _data.__cleanup_despesas2026q1 = true;
  }

  function _syncEditableConfig() {
    if (_data.categorias) {
      Object.keys(CATEGORIES).forEach(k => delete CATEGORIES[k]);
      Object.assign(CATEGORIES, _data.categorias);
    }
    if (_data.subcategorias) {
      Object.keys(SUBCATEGORIES).forEach(k => delete SUBCATEGORIES[k]);
      Object.assign(SUBCATEGORIES, _data.subcategorias);
    }
    if (_data.pessoas) {
      PESSOAS.length = 0;
      _data.pessoas.forEach(p => PESSOAS.push(p));
    }
  }

  function _loadEditableConfig() {
    if (!_data.categorias)    _data.categorias    = JSON.parse(JSON.stringify(CATEGORIES));
    if (!_data.subcategorias) _data.subcategorias = JSON.parse(JSON.stringify(SUBCATEGORIES));
    if (!_data.pessoas)       _data.pessoas       = [...PESSOAS];
    _syncEditableConfig();
  }

  function _cleanupBadSeed() {
    // Limpeza única (v1.0.1): remove entradas r2/r6/r7 do seed inicial
    // — Mastercard Roberto fev/mai/jun que não existiam na planilha.
    if (!_data.__cleanup_v101) {
      if (Array.isArray(_data.receitas)) {
        _data.receitas = _data.receitas.filter(r => !['r2','r6','r7'].includes(r.id));
      }
      _data.__cleanup_v101 = true;
    }
  }

  // Migração única: move lançamentos da categoria 'manuela' para
  // educacao/lazer/beneficios com split 100% Manuela.
  function _migrateManuelaCat() {
    if (_data.__migrated_manuela_cat) return;

    // mapa: sub-categoria original → { category, sub }
    const MAP = {
      'Escola Manuela':     { category: 'educacao',   sub: 'Mensalidade Escolar'  },
      'Livros e Materiais': { category: 'educacao',   sub: 'Material Escolar'     },
      'Uniforme':           { category: 'educacao',   sub: 'Uniforme'             },
      'Passeios':           { category: 'educacao',   sub: 'Passeios Escolares'   },
      'Mesada':             { category: 'beneficios', sub: 'Mesada'               },
    };

    if (Array.isArray(_data.despesas)) {
      _data.despesas = _data.despesas.map(d => {
        if (d.category !== 'manuela') return d;
        const dest = MAP[d.sub] || MAP[d.desc] || { category: 'educacao', sub: d.sub };
        const valor = Number(d.amount) || 0;
        return {
          ...d,
          category: dest.category,
          sub:      dest.sub,
          split:    [{ person: 'Manuela', valor }],
        };
      });
    }

    // Garante que educacao/beneficios/assessorias existem em _data.categorias
    if (_data.categorias) {
      if (!_data.categorias.educacao)    _data.categorias.educacao    = CATEGORIES.educacao;
      if (!_data.categorias.beneficios)  _data.categorias.beneficios  = CATEGORIES.beneficios;
      if (!_data.categorias.assessorias) _data.categorias.assessorias = CATEGORIES.assessorias;
    }
    if (_data.subcategorias) {
      if (!_data.subcategorias.educacao)    _data.subcategorias.educacao    = [...SUBCATEGORIES.educacao];
      if (!_data.subcategorias.beneficios)  _data.subcategorias.beneficios  = [...SUBCATEGORIES.beneficios];
      if (!_data.subcategorias.assessorias) _data.subcategorias.assessorias = [...SUBCATEGORIES.assessorias];
      if (Array.isArray(_data.subcategorias.educacao) && !_data.subcategorias.educacao.includes('Passeios Escolares')) {
        _data.subcategorias.educacao.push('Passeios Escolares');
      }
      if (Array.isArray(_data.subcategorias.lazer)) {
        _data.subcategorias.lazer = _data.subcategorias.lazer.filter(s => s !== 'Passeios Individuais');
      }
      // garante novas subs de alimentacao e educacao
      ['Lanche na Faculdade'].forEach(s => {
        if (!_data.subcategorias.alimentacao?.includes(s)) _data.subcategorias.alimentacao?.push(s);
      });
      ['Faculdade','Material Universitário','Cursos e Especializações'].forEach(s => {
        if (!_data.subcategorias.educacao?.includes(s)) _data.subcategorias.educacao?.push(s);
      });
    }

    _data.__migrated_manuela_cat = true;
  }

  // Migração única: remove categorias 'roberto' e 'mariana' remapeando lançamentos.
  function _migrateRobertoMarianaCat() {
    if (_data.__migrated_roberto_mariana) return;

    const SUB_MAP = {
      'roberto/Melissa Advogada': { category: 'assessorias', sub: 'Melissa Advogada' },
      'roberto/Assinaturas':      { category: 'pessoal',     sub: 'Assinaturas' },
      'roberto/Celular':          { category: 'pessoal',     sub: 'Celular' },
      'roberto/Telegrama':        { category: 'pessoal',     sub: 'Telegrama' },
      'mariana/Faculdade UNIP':     { category: 'educacao',    sub: 'Faculdade UNIP' },
      'mariana/Livros e Materiais': { category: 'educacao',    sub: 'Livros e Materiais' },
      'mariana/Mesada':             { category: 'pessoal',     sub: 'Mesada' },
      'mariana/Lanche':             { category: 'alimentacao', sub: 'Lanche na Faculdade' },
      'mariana/OAB':                { category: 'assessorias', sub: 'OAB' },
    };

    const remap = d => {
      if (d.category !== 'roberto' && d.category !== 'mariana') return d;
      const key = `${d.category}/${d.sub}`;
      const dest = SUB_MAP[key] || { category: 'pessoal', sub: d.sub };
      return { ...d, category: dest.category, sub: dest.sub };
    };

    if (Array.isArray(_data.despesas)) _data.despesas = _data.despesas.map(remap);
    if (Array.isArray(_data.receitas)) _data.receitas = _data.receitas.map(remap);

    // Remove das categorias/subcategorias editáveis
    if (_data.categorias)    { delete _data.categorias.roberto;    delete _data.categorias.mariana;    }
    if (_data.subcategorias) { delete _data.subcategorias.roberto; delete _data.subcategorias.mariana; }

    // Garante novas subcats nas categorias de destino
    if (_data.subcategorias) {
      const ensure = (cat, subs) => subs.forEach(s => {
        if (_data.subcategorias[cat] && !_data.subcategorias[cat].includes(s))
          _data.subcategorias[cat].push(s);
      });
      ensure('pessoal',     ['Assinaturas','Celular','Telegrama','Mesada']);
      ensure('assessorias', ['Melissa Advogada','OAB']);
      ensure('educacao',    ['Faculdade UNIP','Livros e Materiais']);
    }

    _data.__migrated_roberto_mariana = true;
  }

  // Corrige lançamentos que foram migrados para lazer/Passeios Individuais →
  // educacao/Passeios Escolares (ajuste pós-validação)
  function _fixPasseiosEscolares() {
    if (_data.__fix_passeios_escolares) return;
    if (Array.isArray(_data.despesas)) {
      _data.despesas = _data.despesas.map(d => {
        if (d.sub === 'Passeios Individuais') {
          return { ...d, category: 'educacao', sub: 'Passeios Escolares' };
        }
        return d;
      });
    }
    _data.__fix_passeios_escolares = true;
  }

  // Varre TODOS os lançamentos com category='manuela' que ainda restarem
  // (cobre casos de backup importado com flag já setada mas dados não migrados)
  function _sweepRobertoCat() {
    const MAP = {
      'Melissa Advogada': { category: 'assessorias', sub: 'Honorários Advocatícios' },
      'Assinaturas':      { category: 'pessoal',     sub: 'Assinaturas'             },
      'Celular':          { category: 'moradia',     sub: 'TV / Internet / Telefone'},
      'Telegrama':        { category: 'pessoal',     sub: 'Assinaturas'             },
    };
    if (!Array.isArray(_data.despesas)) return;
    _data.despesas = _data.despesas.map(d => {
      if (d.category !== 'roberto') return d;
      const dest = MAP[d.sub] || MAP[d.desc] || { category: 'pessoal', sub: d.sub };
      const valor = Number(d.amount) || 0;
      const split = (d.split && d.split.length) ? d.split : [{ person: 'Roberto', valor }];
      return { ...d, category: dest.category, sub: dest.sub, split };
    });
  }

  function _sweepMarianaCat() {
    const MAP = {
      'Faculdade UNIP':     { category: 'educacao',    sub: 'Faculdade',              desc: 'Faculdade UNIP' },
      'Livros e Materiais': { category: 'educacao',    sub: 'Material Universitário'                         },
      'Mesada':             { category: 'beneficios',  sub: 'Mesada'                                         },
      'Lanche':             { category: 'alimentacao', sub: 'Lanche na Faculdade',    desc: 'Lanche na Faculdade' },
      'OAB':                { category: 'educacao',    sub: 'Cursos e Especializações'                       },
    };
    if (!Array.isArray(_data.despesas)) return;
    _data.despesas = _data.despesas.map(d => {
      if (d.category !== 'mariana') return d;
      const dest = MAP[d.sub] || MAP[d.desc] || { category: 'educacao', sub: d.sub };
      const valor = Number(d.amount) || 0;
      const split = (d.split && d.split.length) ? d.split : [{ person: 'Mariana', valor }];
      return { ...d, category: dest.category, sub: dest.sub, desc: dest.desc || d.desc, split };
    });
  }

  function _sweepManuelaCat() {
    const MAP = {
      'Escola Manuela':     { category: 'educacao',   sub: 'Mensalidade Escolar' },
      'Livros e Materiais': { category: 'educacao',   sub: 'Material Escolar'    },
      'Uniforme':           { category: 'educacao',   sub: 'Uniforme'            },
      'Passeios':           { category: 'educacao',   sub: 'Passeios Escolares'  },
      'Passeios Individuais':{ category: 'educacao',  sub: 'Passeios Escolares'  },
      'Mesada':             { category: 'beneficios', sub: 'Mesada'              },
    };
    if (!Array.isArray(_data.despesas)) return;
    _data.despesas = _data.despesas.map(d => {
      if (d.category !== 'manuela') return d;
      const dest = MAP[d.sub] || MAP[d.desc] || { category: 'educacao', sub: d.sub };
      const valor = Number(d.amount) || 0;
      const split = (d.split && d.split.length) ? d.split : [{ person: 'Manuela', valor }];
      return { ...d, category: dest.category, sub: dest.sub, split };
    });
  }

  function init() {
    _data = load();
    if (!_data) {
      _data = buildSeed();
      save(_data);
    }
    // Init Supabase connection (non-blocking)
    if (typeof SupabaseSync !== 'undefined') SupabaseSync.init();
    _cleanupBadSeed();
    _cleanupDespesas2026Q1();
    _loadEditableConfig();
    _migrateMetas();
    _migrateManuelaCat();
    _migrateRobertoMarianaCat();
    _fixPasseiosEscolares();
    _sweepManuelaCat();
    _sweepRobertoCat();
    _sweepMarianaCat();
    _syncEditableConfig();
    save(_data);
    return _data;
  }

  function get() { return _data; }

  function persist() { save(_data); }

  // ── HELPERS ────────────────────────────────────────────────────
  function newId() { return '_' + Math.random().toString(36).slice(2); }

  function addReceita(entry) {
    entry.id = entry.id || newId();
    _data.receitas.push(entry);
    persist();
    return entry;
  }

  function addDespesa(entry) {
    entry.id = entry.id || newId();
    if (entry.split) entry.split = _normalizeSplit(entry.split, entry.amount);
    _data.despesas.push(entry);
    persist();
    return entry;
  }

  function deleteReceita(id) {
    _data.receitas = _data.receitas.filter(r => r.id !== id);
    persist();
  }

  function updateReceita(id, patch) {
    const r = _data.receitas.find(r => r.id === id);
    if (r) { Object.assign(r, patch); persist(); }
  }

  function deleteDespesa(id) {
    _data.despesas = _data.despesas.filter(d => d.id !== id);
    persist();
  }

  function updateDespesa(id, patch) {
    const d = _data.despesas.find(d => d.id === id);
    if (!d) return;
    Object.assign(d, patch);
    const finalAmt = patch.amount != null ? patch.amount : d.amount;
    if (d.split) d.split = _normalizeSplit(d.split, finalAmt);
    persist();
  }

  function updateSettings(patch) {
    Object.assign(_data.settings, patch);
    persist();
  }

  function addDespesaParcelada({ desc, amount, date, category, sub, pay, parcelas, ...extra }) {
    const grpId = newId();
    const base = new Date(date + 'T12:00:00');
    const entries = [];
    for (let i = 0; i < parcelas; i++) {
      const dt = new Date(base);
      dt.setMonth(dt.getMonth() + i);
      entries.push({
        id: newId(),
        desc: `${desc} (${i + 1}/${parcelas})`,
        amount,
        date: dt.toISOString().slice(0, 10),
        category, sub, pay,
        month: dt.getMonth() + 1,
        year: dt.getFullYear(),
        parcela: { grupo: grpId, num: i + 1, total: parcelas },
        ...extra,
      });
    }
    _data.despesas.push(...entries);
    persist();
    return entries;
  }

  function getReembolsosPendentes() {
    return _data.despesas.filter(d => d.reembolso && d.reembolso.status === 'pendente');
  }

  function marcarReembolsoPago(despesaId) {
    const d = _data.despesas.find(x => x.id === despesaId);
    if (d && d.reembolso) {
      d.reembolso.status = 'pago';
      d.reembolso.paidAt = new Date().toISOString().slice(0, 10);
      persist();
    }
  }

  function addConta(entry) {
    entry.id = entry.id || newId();
    if (!_data.contas) _data.contas = [];
    _data.contas.push(entry);
    persist();
    return entry;
  }

  function deleteConta(id) {
    _data.contas = (_data.contas || []).filter(c => c.id !== id);
    persist();
  }

  function updateConta(id, patch) {
    const ct = (_data.contas || []).find(c => c.id === id);
    if (ct) { Object.assign(ct, patch); persist(); }
  }

  function addCartao(entry) {
    entry.id = entry.id || newId();
    entry.parcelas = entry.parcelas || [];
    _data.cartoes.push(entry);
    persist();
    return entry;
  }

  function deleteCartao(id) {
    _data.cartoes = _data.cartoes.filter(c => c.id !== id);
    persist();
  }

  function updateMeta(id, patch) {
    const m = _data.metas.find(m => m.id === id);
    if (m) { Object.assign(m, patch); persist(); }
  }

  function deleteMeta(id) {
    _data.metas = _data.metas.filter(m => m.id !== id);
    persist();
  }

  function addReserva(entry) {
    entry.id = entry.id || newId();
    if (!_data.reservas) _data.reservas = [];
    _data.reservas.push(entry);
    persist();
    return entry;
  }

  function updateReserva(id, patch) {
    const r = (_data.reservas || []).find(r => r.id === id);
    if (r) { Object.assign(r, patch); persist(); }
  }

  function deleteReserva(id) {
    _data.reservas = (_data.reservas || []).filter(r => r.id !== id);
    persist();
  }

  function addRecebimentoFuturo(entry) {
    entry.id = entry.id || newId();
    if (!_data.recebimentosFuturos) _data.recebimentosFuturos = [];
    _data.recebimentosFuturos.push(entry);
    persist();
    return entry;
  }

  function deleteRecebimentoFuturo(id) {
    _data.recebimentosFuturos = (_data.recebimentosFuturos || []).filter(r => r.id !== id);
    persist();
  }

  function getRecebimentosFuturos() {
    return _data.recebimentosFuturos || [];
  }

  function realizarRecebimentoFuturo(id) {
    const rf = (_data.recebimentosFuturos || []).find(r => r.id === id);
    if (!rf) return null;
    const date = rf.data || `${rf.ano}-${String(rf.mes).padStart(2,'0')}-05`;
    const d = new Date(date + 'T12:00:00');
    const receita = addReceita({
      desc: rf.descricao || rf.desc || 'Recebimento',
      amount: rf.valor || rf.amount || 0,
      date,
      category: 'receita',
      person: rf.responsavel || rf.person || 'Roberto',
      type: rf.type || 'outros',
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    });
    deleteRecebimentoFuturo(id);
    return receita;
  }

  function descSuggestions() {
    const seen = new Map();
    [..._data.despesas].reverse().forEach(d => {
      const key = d.desc.replace(/\s*\(\d+\/\d+\)$/, '');
      if (!seen.has(key)) seen.set(key, { desc: key, category: d.category, sub: d.sub || '' });
    });
    return Array.from(seen.values());
  }

  function receitaSuggestions() {
    const seen = new Map();
    [..._data.receitas].reverse().forEach(r => {
      if (!seen.has(r.desc)) seen.set(r.desc, { desc: r.desc, person: r.person, type: r.type || '' });
    });
    return Array.from(seen.values());
  }

  // ── AGGREGATIONS ───────────────────────────────────────────────
  function receitasByMonth(month, year) {
    return _data.receitas.filter(r => r.month === month && r.year === year);
  }

  function despesasByMonth(month, year) {
    return _data.despesas.filter(d => d.month === month && d.year === year);
  }

  function sumReceitas(month, year) {
    return receitasByMonth(month, year).reduce((acc, r) => acc + r.amount, 0);
  }

  function sumDespesas(month, year) {
    return despesasByMonth(month, year).reduce((acc, d) => acc + d.amount, 0);
  }

  function despesasByCategory(month, year) {
    const rows = despesasByMonth(month, year);
    const map = {};
    rows.forEach(d => {
      map[d.category] = (map[d.category] || 0) + d.amount;
    });
    return map;
  }

  function yearlyMonthly(year, type) {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    return months.map(m => {
      const arr = type === 'receita'
        ? receitasByMonth(m, year)
        : despesasByMonth(m, year);
      return arr.reduce((a, r) => a + r.amount, 0);
    });
  }

  function deleteAtivo(id) {
    _data.ativos = _data.ativos.filter(a => a.id !== id);
    persist();
  }

  function updateAtivo(id, patch) {
    const a = _data.ativos.find(a => a.id === id);
    if (a) { Object.assign(a, patch); persist(); }
  }

  // ── PASSIVOS ───────────────────────────────────────────────────
  function getPassivos() { return _data.passivos || []; }

  function addPassivo(p) {
    if (!_data.passivos) _data.passivos = [];
    _data.passivos.push({ ...p, id: '_p' + Date.now() });
    persist();
  }

  function updatePassivo(id, patch) {
    const p = (_data.passivos || []).find(p => p.id === id);
    if (p) { Object.assign(p, patch); persist(); }
  }

  function deletePassivo(id) {
    _data.passivos = (_data.passivos || []).filter(p => p.id !== id);
    persist();
  }

  function totalPassivos() {
    return (_data.passivos || [])
      .filter(p => p.status !== 'quitado')
      .reduce((s, p) => s + (p.valorAcordado || p.valorProposta || p.valorOriginal || 0), 0);
  }

  function cleanDespesasByCategory(cats) {
    // Case-insensitive match; also strips any entry whose category has no label in CATEGORIES
    const lower = cats.map(c => c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
    const before = _data.despesas.length;
    _data.despesas = _data.despesas.filter(d => {
      const norm = (d.category || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      return !lower.includes(norm);
    });
    if (_data.despesas.length !== before) { persist(); }
    return before - _data.despesas.length;
  }

  function totalAtivos() {
    const { usdBrl = 5.85, eurBrl = 6.40 } = _data.settings;
    const fromAtivos = _data.ativos.reduce((sum, a) => {
      const val = a.qty * a.unitPrice;
      if (a.currency === 'USD') return sum + val * usdBrl;
      if (a.currency === 'EUR') return sum + val * eurBrl;
      return sum + val;
    }, 0);
    const fromReserva = (_data.reservas || []).reduce((sum, r) => {
      return sum + (r.valorAtual || r.valorInvestido || 0);
    }, 0);
    const fromVeiculos = (_data.veiculos || []).reduce((sum, v) => sum + veiculoValorEstimado(v), 0);
    const fromImoveis  = (_data.imoveis  || []).reduce((sum, im) => sum + imovelValorEstimado(im), 0);
    return fromAtivos + fromReserva + fromVeiculos + fromImoveis;
  }

  // ── VEÍCULOS ────────────────────────────────────────────────────
  function _ensureVeiculos() {
    if (!_data.veiculos) { _data.veiculos = []; }
  }
  function getVeiculos() { _ensureVeiculos(); return _data.veiculos; }
  function addVeiculo(v) {
    _ensureVeiculos();
    const novo = { id: 'v' + Date.now(), createdAt: new Date().toISOString(), ...v };
    _data.veiculos.push(novo);
    persist();
    return novo;
  }
  function updateVeiculo(id, patch) {
    _ensureVeiculos();
    const v = _data.veiculos.find(x => x.id === id);
    if (!v) return null;
    Object.assign(v, patch);
    persist();
    return v;
  }
  function deleteVeiculo(id) {
    _ensureVeiculos();
    _data.veiculos = _data.veiculos.filter(x => x.id !== id);
    persist();
  }
  // Recalcula valor atual aplicando depreciação linear sobre o tempo decorrido
  function veiculoValorEstimado(v) {
    if (!v.valorCompra || !v.dataCompra) return v.valorAtual || 0;
    if (v.valorAtual) return v.valorAtual; // valor manual prevalece
    const meses = Math.max(0, (Date.now() - new Date(v.dataCompra).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    const taxa = (v.depreciacaoAnualPct || 10) / 100;
    const fator = Math.pow(1 - taxa, meses / 12);
    return Math.max(0, v.valorCompra * fator);
  }
  function veiculoCustoAnual(v) {
    return (v.ipvaAnual || 0) + (v.seguroAnual || 0) + ((v.manutencaoMensal || 0) * 12);
  }
  function totalVeiculos() {
    return (_data.veiculos || []).reduce((s, v) => s + veiculoValorEstimado(v), 0);
  }

  // ── IMÓVEIS ─────────────────────────────────────────────────────
  function _ensureImoveis() {
    if (!_data.imoveis) { _data.imoveis = []; }
  }
  function getImoveis() { _ensureImoveis(); return _data.imoveis; }
  function addImovel(im) {
    _ensureImoveis();
    const novo = { id: 'im' + Date.now(), createdAt: new Date().toISOString(), ...im };
    _data.imoveis.push(novo);
    persist();
    return novo;
  }
  function updateImovel(id, patch) {
    _ensureImoveis();
    const im = _data.imoveis.find(x => x.id === id);
    if (!im) return null;
    Object.assign(im, patch);
    persist();
    return im;
  }
  function deleteImovel(id) {
    _ensureImoveis();
    _data.imoveis = _data.imoveis.filter(x => x.id !== id);
    persist();
  }
  // Aplica valorização anual sobre o tempo decorrido se valorAtual não foi setado manualmente
  function imovelValorEstimado(im) {
    if (!im.valorCompra || !im.dataCompra) return im.valorAtual || 0;
    if (im.valorAtual) return im.valorAtual;
    const meses = Math.max(0, (Date.now() - new Date(im.dataCompra).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    const taxa = (im.valorizacaoAnualPct || 0) / 100; // default 0% (conservador)
    return im.valorCompra * Math.pow(1 + taxa, meses / 12);
  }
  function imovelEquity(im) {
    return imovelValorEstimado(im) - (im.saldoDevedor || 0);
  }
  function imovelCustoAnual(im) {
    return (im.iptuAnual || 0)
      + ((im.condominioMensal || 0) * 12)
      + ((im.manutencaoMensal || 0) * 12)
      + ((im.parcelaFinanciamento || 0) * 12);
  }
  function imovelReceitaAnual(im) {
    return (im.aluguelMensal || 0) * 12;
  }
  function imovelRentabilidadeAluguel(im) {
    const val = imovelValorEstimado(im);
    if (!val || !im.aluguelMensal) return 0;
    return (im.aluguelMensal * 12) / val;
  }
  function totalImoveis() {
    return (_data.imoveis || []).reduce((s, im) => s + imovelValorEstimado(im), 0);
  }

  // ── CONTRATOS ──────────────────────────────────────────────────
  function _ensureContratos() {
    if (!_data.contratos) { _data.contratos = []; persist(); }
  }

  function _removeLancamentosByContrato(contratoId) {
    _data.receitas = _data.receitas.filter(r => r.contratoId !== contratoId);
    _data.despesas = _data.despesas.filter(d => d.contratoId !== contratoId);
  }

  function _generateContratoLancamentos(c) {
    // Apaga lançamentos vinculados existentes (mantém marcação `paid` se presente)
    const paidMap = {};
    [..._data.receitas, ..._data.despesas]
      .filter(x => x.contratoId === c.id)
      .forEach(x => { if (x.paid) paidMap[x.parcelaNum] = true; });

    _removeLancamentosByContrato(c.id);

    const base = new Date(c.dataInicio + 'T12:00:00');
    const stepMeses = c.periodicidade === 'anual' ? 12 : 1;
    const entries = [];
    for (let i = 0; i < c.parcelas; i++) {
      const dt = new Date(base);
      dt.setMonth(dt.getMonth() + i * stepMeses);
      // Aplica diaVencimento se informado
      if (c.diaVencimento) {
        const lastDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
        dt.setDate(Math.min(c.diaVencimento, lastDay));
      }
      const dateStr = dt.toISOString().slice(0, 10);
      const entry = {
        id: newId(),
        desc: `${c.label} (${i + 1}/${c.parcelas})`,
        amount: c.valorParcela,
        date: dateStr,
        category: c.category,
        month: dt.getMonth() + 1,
        year: dt.getFullYear(),
        contratoId: c.id,
        parcelaNum: i + 1,
        paid: !!paidMap[i + 1],
      };
      if (c.kind === 'receita') {
        entry.person = c.responsavel || 'Roberto';
        entry.type = 'contrato';
        _data.receitas.push(entry);
      } else {
        entry.sub = c.sub || '';
        entry.pay = c.pay || 'Dinheiro';
        _data.despesas.push(entry);
      }
      entries.push(entry);
    }
    return entries;
  }

  function addContrato(c) {
    _ensureContratos();
    c.id = c.id || newId();
    c.createdAt = c.createdAt || new Date().toISOString();
    c.active = c.active !== false;
    _data.contratos.push(c);
    _generateContratoLancamentos(c);
    persist();
    return c;
  }

  function updateContrato(id, patch) {
    _ensureContratos();
    const c = _data.contratos.find(x => x.id === id);
    if (!c) return;
    Object.assign(c, patch);
    _generateContratoLancamentos(c);
    persist();
    return c;
  }

  function deleteContrato(id, alsoLancamentos = true) {
    _ensureContratos();
    _data.contratos = _data.contratos.filter(c => c.id !== id);
    if (alsoLancamentos) _removeLancamentosByContrato(id);
    persist();
  }

  function getContratos() {
    _ensureContratos();
    return _data.contratos;
  }

  function getContratoById(id) {
    _ensureContratos();
    return _data.contratos.find(c => c.id === id) || null;
  }

  function getContratoPerformance(id, refDate = null) {
    _ensureContratos();
    const c = _data.contratos.find(x => x.id === id);
    if (!c) return null;
    const today = refDate ? new Date(refDate) : new Date();
    const linked = (c.kind === 'receita' ? _data.receitas : _data.despesas)
      .filter(x => x.contratoId === id)
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalParcelas = c.parcelas;
    const valorTotal = (c.entrada || 0) + c.valorParcela * c.parcelas;

    const cumpridas = linked.filter(x => {
      if (x.paid === true) return true;
      if (x.paid === false) return false;
      return new Date(x.date + 'T23:59:59') <= today;
    }).length;
    const valorCumprido = (c.entrada || 0) + cumpridas * c.valorParcela;
    const parcelasRestantes = totalParcelas - cumpridas;
    const valorRestante = valorTotal - valorCumprido;

    const pctValor = valorTotal > 0 ? valorCumprido / valorTotal : 0;
    const pctParcelas = totalParcelas > 0 ? cumpridas / totalParcelas : 0;

    // Tempo: dataInicio -> dataFim (ou última parcela)
    const ini = new Date(c.dataInicio + 'T12:00:00');
    const fimStr = c.dataFim || (linked[linked.length - 1]?.date);
    const fim = fimStr ? new Date(fimStr + 'T12:00:00') : ini;
    const totalMs = Math.max(1, fim - ini);
    const elapsedMs = Math.max(0, Math.min(today - ini, totalMs));
    const pctTempo = elapsedMs / totalMs;

    const proxima = linked.find(x => new Date(x.date + 'T23:59:59') > today);

    return {
      contrato: c, totalParcelas, cumpridas, parcelasRestantes,
      valorTotal, valorCumprido, valorRestante,
      pctValor, pctParcelas, pctTempo,
      impactoMensal: c.valorParcela,
      proxima,
    };
  }

  // ── METAS PERFORMANCE ──────────────────────────────────────────
  function _sumDespesasYear(year, category = null) {
    return _data.despesas
      .filter(d => d.year === year && (!category || d.category === category))
      .reduce((s, d) => s + d.amount, 0);
  }
  function _sumReceitasYear(year) {
    return _data.receitas.filter(r => r.year === year).reduce((s, r) => s + r.amount, 0);
  }
  function _sumDespesasMonth(month, year, category = null) {
    return _data.despesas
      .filter(d => d.month === month && d.year === year && (!category || d.category === category))
      .reduce((s, d) => s + d.amount, 0);
  }
  function _sumReceitasMonth(month, year) {
    return _data.receitas.filter(r => r.month === month && r.year === year).reduce((s, r) => s + r.amount, 0);
  }

  function getMetaPerformance(metaId, year, month = null) {
    const m = _data.metas.find(x => x.id === metaId);
    if (!m) return null;
    const refMonth = month || _data.settings?.mesAtual || (new Date().getMonth() + 1);

    // Série mensal (1..12) para tabela
    const byMonth = Array.from({ length: 12 }, (_, i) => {
      const mm = i + 1;
      if (m.type === 'limite_desp') return _sumDespesasMonth(mm, year, m.category);
      if (m.type === 'min_receita') return _sumReceitasMonth(mm, year);
      if (m.type === 'reserva')     return null; // reserva é snapshot, não acumula por mês
      return null;
    });

    let current = 0, target = m.target || 0, status = 'neutral', delta = null;
    let mediaMensal = 0, projecaoAnual = 0;

    if (m.type === 'limite_desp') {
      if (m.period === 'anual') {
        current = byMonth.reduce((a, b) => a + b, 0);
        mediaMensal = current / Math.max(1, refMonth);
        projecaoAnual = mediaMensal * 12;
        const pct = target > 0 ? projecaoAnual / target : 0;
        if (current === 0) status = 'neutral';
        else status = pct < 0.8 ? 'ok' : pct < 1 ? 'warn' : 'over';
      } else {
        current = byMonth[refMonth - 1] || 0;
        const pct = target > 0 ? current / target : 0;
        if (current === 0) status = 'neutral';
        else status = pct < 0.8 ? 'ok' : pct < 1 ? 'warn' : 'over';
      }
    } else if (m.type === 'min_receita') {
      if (m.period === 'anual') {
        current = byMonth.reduce((a, b) => a + b, 0);
        mediaMensal = current / Math.max(1, refMonth);
        projecaoAnual = mediaMensal * 12;
        const pct = target > 0 ? projecaoAnual / target : 0;
        if (current === 0) status = 'neutral';
        else status = pct >= 1 ? 'ok' : pct >= 0.8 ? 'warn' : 'over';
      } else {
        current = byMonth[refMonth - 1] || 0;
        const pct = target > 0 ? current / target : 0;
        if (current === 0) status = 'neutral';
        else status = pct >= 1 ? 'ok' : pct >= 0.8 ? 'warn' : 'over';
      }
    } else if (m.type === 'reserva') {
      current = totalAtivos();
      const prev = m.lastSnapshot || current;
      delta = current - prev;
      const pct = target > 0 ? current / target : 0;
      if (delta < 0) status = 'over';
      else if (pct >= 1) status = 'ok';
      else status = 'neutral';
    } else if (m.type === 'objetivo') {
      current = m.current || 0;
      const pct = target > 0 ? current / target : 0;
      status = pct >= 1 ? 'ok' : 'neutral';
    }

    const pct = target > 0 ? Math.min(current / target, 9.99) : 0;
    return { meta: m, current, target, pct, status, delta, byMonth, mediaMensal, projecaoAnual };
  }

  function getActiveMetaReceitaMensal() {
    const m = (_data.metas || []).find(x => x.active !== false && x.type === 'min_receita' && x.period === 'mensal' && !x.category);
    return m ? m.target : null;
  }

  function getActiveLimiteDespMensal() {
    const m = (_data.metas || []).find(x => x.active !== false && x.type === 'limite_desp' && x.period === 'mensal' && !x.category);
    return m ? m.target : null;
  }

  function snapshotReserva(metaId) {
    const m = _data.metas.find(x => x.id === metaId);
    if (!m || m.type !== 'reserva') return;
    const value = totalAtivos();
    m.lastSnapshot = value;
    if (!Array.isArray(m.history)) m.history = [];
    m.history.push({ at: new Date().toISOString(), value });
    // Mantém até 24 pontos (2 anos mensais)
    if (m.history.length > 24) m.history = m.history.slice(-24);
    persist();
  }

  // ── CONFIG: CATEGORIAS / SUBCATEGORIAS / PESSOAS ─────────────────
  function _slugKey(label) {
    const base = (label || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      .slice(0, 20);
    return base || ('cat_' + Math.random().toString(36).slice(2, 5));
  }

  function getCategoriaUsage(key) {
    return _data.despesas.filter(d => d.category === key).length
         + _data.receitas.filter(r => r.category === key).length;
  }

  function addCategoria({ label, icon, color }) {
    if (!label) throw new Error('Nome obrigatório');
    let key = _slugKey(label);
    while (_data.categorias[key]) key = key + '_' + Math.random().toString(36).slice(2, 4);
    _data.categorias[key] = { label, icon: icon || '📁', color: color || '#7C6EF8' };
    _data.subcategorias[key] = [];
    _syncEditableConfig(); persist();
    return key;
  }

  function updateCategoria(key, patch) {
    if (!_data.categorias[key]) return;
    Object.assign(_data.categorias[key], patch);
    _syncEditableConfig(); persist();
  }

  function deleteCategoria(key) {
    if (key === 'receita') throw new Error('Categoria reservada');
    const usage = getCategoriaUsage(key);
    if (usage > 0) throw new Error(`${usage} lançamento(s) ainda usam esta categoria`);
    delete _data.categorias[key];
    delete _data.subcategorias[key];
    _syncEditableConfig(); persist();
  }

  function addSubcategoria(catKey, name) {
    name = (name || '').trim();
    if (!name) throw new Error('Nome obrigatório');
    if (!_data.subcategorias[catKey]) _data.subcategorias[catKey] = [];
    if (_data.subcategorias[catKey].includes(name)) throw new Error('Subcategoria já existe');
    _data.subcategorias[catKey].push(name);
    _syncEditableConfig(); persist();
  }

  function renameSubcategoria(catKey, oldName, newName) {
    newName = (newName || '').trim();
    if (!newName) throw new Error('Nome obrigatório');
    const arr = _data.subcategorias[catKey] || [];
    const idx = arr.indexOf(oldName);
    if (idx < 0) return;
    arr[idx] = newName;
    _data.despesas.forEach(d => { if (d.category === catKey && d.sub === oldName) d.sub = newName; });
    _syncEditableConfig(); persist();
  }

  function deleteSubcategoria(catKey, name) {
    const usage = _data.despesas.filter(d => d.category === catKey && d.sub === name).length;
    if (usage > 0) throw new Error(`${usage} lançamento(s) usam esta subcategoria`);
    const arr = _data.subcategorias[catKey] || [];
    const i = arr.indexOf(name);
    if (i >= 0) arr.splice(i, 1);
    _syncEditableConfig(); persist();
  }

  // ── RATEIO (split de despesas) ───────────────────────────────────
  // Cada despesa pode ter d.split = [{person, share, valor}], opcional.
  // share é fração de 0..1; valor é montante absoluto. Manter consistente.

  function _normalizeSplit(split, amount) {
    if (!Array.isArray(split) || split.length === 0) return null;
    const clean = split
      .filter(s => s.person && (s.valor > 0 || s.share > 0))
      .map(s => {
        const valor = s.valor != null ? Number(s.valor) : Number(s.share) * Number(amount);
        const share = amount > 0 ? valor / amount : 0;
        return { person: s.person, valor: Math.round(valor * 100) / 100, share };
      });
    return clean.length ? clean : null;
  }

  function computeContribuicoesByPerson(despesa) {
    // Retorna { 'Roberto': 600, 'Mariana': 400, 'Família': 0 }
    // Se split existe e cobre tudo, retorna split direto.
    // Se split existe mas soma < amount, o resto vira "Família".
    // Se não houver split, retorna { 'Família': amount }
    const total = Number(despesa.amount) || 0;
    if (!despesa.split || !despesa.split.length) return { 'Família': total };
    const map = {};
    let sumValor = 0;
    despesa.split.forEach(s => {
      map[s.person] = (map[s.person] || 0) + Number(s.valor || 0);
      sumValor += Number(s.valor || 0);
    });
    const resto = Math.max(0, total - sumValor);
    if (resto > 0.01) map['Família'] = (map['Família'] || 0) + resto;
    return map;
  }

  function despesasPorPessoa(month, year) {
    // Soma das contribuições por pessoa em determinado mês/ano
    const acc = {};
    _data.despesas
      .filter(d => d.year === year && d.month === month)
      .forEach(d => {
        const map = computeContribuicoesByPerson(d);
        Object.entries(map).forEach(([p, v]) => { acc[p] = (acc[p] || 0) + v; });
      });
    return acc;
  }

  function despesasPorPessoaRange(mStart, mEnd, year) {
    const acc = {};
    _data.despesas
      .filter(d => d.year === year && d.month >= mStart && d.month <= mEnd)
      .forEach(d => {
        const map = computeContribuicoesByPerson(d);
        Object.entries(map).forEach(([p, v]) => { acc[p] = (acc[p] || 0) + v; });
      });
    return acc;
  }

  function addPessoa(name) {
    name = (name || '').trim();
    if (!name) throw new Error('Nome obrigatório');
    if (_data.pessoas.includes(name)) throw new Error('Pessoa já cadastrada');
    _data.pessoas.push(name);
    _syncEditableConfig(); persist();
  }

  function renamePessoa(oldName, newName) {
    newName = (newName || '').trim();
    if (!newName) throw new Error('Nome obrigatório');
    const idx = _data.pessoas.indexOf(oldName);
    if (idx < 0) return;
    _data.pessoas[idx] = newName;
    _data.receitas.forEach(r => { if (r.person === oldName) r.person = newName; });
    _syncEditableConfig(); persist();
  }

  function deletePessoa(name) {
    const usage = _data.receitas.filter(r => r.person === name).length;
    if (usage > 0) throw new Error(`${usage} receita(s) ainda referenciam esta pessoa`);
    const i = _data.pessoas.indexOf(name);
    if (i >= 0) _data.pessoas.splice(i, 1);
    _syncEditableConfig(); persist();
  }

  // ── PERFIL & SENHA ────────────────────────────────────────────
  function getProfile() {
    return _data.profile || { name: 'Usuário', avatar: '👤', timezone: 'America/Sao_Paulo' };
  }

  function setProfile(fields) {
    _data.profile = { ...getProfile(), ...fields };
    persist();
  }

  function getCredHash() {
    return _data.credHash || null;
  }

  function setCredHash(hash) {
    _data.credHash = hash;
    persist();
  }

  function exportData() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: _data,
    };
  }

  function importData(payload, { replace = true } = {}) {
    if (!payload || typeof payload !== 'object') throw new Error('Payload inválido');
    const incoming = payload.data || payload;
    if (!incoming.despesas || !incoming.receitas) throw new Error('Estrutura não reconhecida (faltam despesas/receitas)');
    if (replace) {
      _data = incoming;
    } else {
      // merge (não usado por padrão)
      Object.keys(incoming).forEach(k => {
        if (Array.isArray(incoming[k]) && Array.isArray(_data[k])) {
          const ids = new Set(_data[k].map(x => x.id));
          incoming[k].forEach(x => { if (!ids.has(x.id)) _data[k].push(x); });
        } else if (typeof incoming[k] === 'object') {
          _data[k] = { ..._data[k], ...incoming[k] };
        }
      });
    }
    _migrateMetas();
    _sweepManuelaCat();
    _sweepRobertoCat();
    _sweepMarianaCat();
    _loadEditableConfig();
    _syncEditableConfig();
    persist();
    return _data;
  }

  function resetData() {
    _data = buildSeed();
    _migrateMetas();
    persist();
    return _data;
  }

  function getProximasParcelas(daysAhead = 30) {
    _ensureContratos();
    const today = new Date(); today.setHours(0,0,0,0);
    const limit = new Date(today); limit.setDate(limit.getDate() + daysAhead);
    const all = [
      ..._data.despesas.filter(d => d.contratoId).map(d => ({...d, kind:'despesa'})),
      ..._data.receitas.filter(r => r.contratoId).map(r => ({...r, kind:'receita'})),
    ];
    return all
      .filter(p => p.paid !== true)
      .filter(p => {
        const d = new Date(p.date + 'T12:00:00');
        return d >= today && d <= limit;
      })
      .sort((a,b) => a.date.localeCompare(b.date));
  }

  function regenAllContratos() {
    _ensureContratos();
    _data.contratos.forEach(c => _generateContratoLancamentos(c));
    persist();
  }

  // ── CATEGORY ORDER ─────────────────────────────────────────────
  function getCategoryOrder() {
    const saved = (_data.settings && _data.settings.categoryOrder) || [];
    const allKeys = Object.keys(CATEGORIES);
    // merge: saved order first, then any new keys not yet in saved order
    const ordered = saved.filter(k => allKeys.includes(k));
    allKeys.forEach(k => { if (!ordered.includes(k)) ordered.push(k); });
    return ordered;
  }

  function setCategoryOrder(order) {
    if (!_data.settings) _data.settings = {};
    _data.settings.categoryOrder = order;
    persist();
  }

  function categoriesOrdered() {
    return getCategoryOrder().map(k => [k, CATEGORIES[k]]).filter(([,v]) => v);
  }

  function markAllPastParcelas(contratoId) {
    const c = _data.contratos.find(x => x.id === contratoId);
    if (!c) return;
    const today = new Date().toISOString().slice(0, 10);
    const arr = c.kind === 'receita' ? _data.receitas : _data.despesas;
    arr.filter(x => x.contratoId === contratoId && x.date <= today)
       .forEach(x => { x.paid = true; });
    persist();
  }

  // ── SUBCAT TIPOS ───────────────────────────────────────────────
  // Tipos: fixa_essencial | fixa_comprometida | variavel_comprometida | variavel_opcional | pontual
  const _DEFAULT_SUBTYPES = {
    'moradia.Aluguel':                    'fixa_essencial',
    'moradia.Energia Elétrica':           'fixa_essencial',
    'moradia.Água e Saneamento':          'fixa_essencial',
    'moradia.TV / Internet / Telefone':   'fixa_comprometida',
    'moradia.Reparos e Manutenção':       'variavel_opcional',
    'moradia.Netflix':                    'fixa_comprometida',
    'moradia.HBO':                        'fixa_comprometida',
    'moradia.Spotify':                    'fixa_comprometida',
    'moradia.Amazon Prime':               'fixa_comprometida',
    'moradia.Apple':                      'fixa_comprometida',
    'moradia.iFood':                      'variavel_opcional',
    'moradia.Móveis e itens casa':        'variavel_opcional',
    'moradia.Outras despesas':            'variavel_opcional',
    'alimentacao.Supermercado':           'fixa_essencial',
    'alimentacao.Feira / Sacolão':        'fixa_essencial',
    'alimentacao.Padaria':                'variavel_opcional',
    'alimentacao.Açougue':                'variavel_opcional',
    'alimentacao.Nespresso':              'variavel_opcional',
    'alimentacao.Sorveteria':             'variavel_opcional',
    'alimentacao.Água':                   'fixa_essencial',
    'alimentacao.Lanche na Faculdade':    'variavel_opcional',
    'transporte.Aluguel Carro':           'variavel_opcional',
    'transporte.Combustível':             'fixa_comprometida',
    'transporte.Manutenção':              'variavel_comprometida',
    'transporte.Estacionamento':          'variavel_opcional',
    'transporte.Multas':                  'variavel_opcional',
    'transporte.Uber':                    'variavel_opcional',
    'transporte.Seguro':                  'fixa_comprometida',
    'transporte.IPVA':                    'pontual',
    'transporte.Documentos':              'pontual',
    'saude.Convênio Médico':              'fixa_comprometida',
    'saude.Medicamentos':                 'variavel_comprometida',
    'saude.Higiene Pessoal':              'fixa_essencial',
    'saude.Dentista':                     'variavel_comprometida',
    'saude.Emergências':                  'variavel_comprometida',
    'pessoal.Academia / Esportes':        'fixa_comprometida',
    'pessoal.Salão de Beleza':            'variavel_opcional',
    'pessoal.Presentes':                  'variavel_opcional',
    'pessoal.Vestuário':                  'variavel_opcional',
    'pessoal.Terapia':                    'fixa_comprometida',
    'pessoal.Cigarro':                    'variavel_opcional',
    'pessoal.Cerveja':                    'variavel_opcional',
    'dogs.Ração':                         'fixa_essencial',
    'dogs.Banho e Tosa':                  'fixa_comprometida',
    'dogs.Veterinário':                   'variavel_comprometida',
    'dogs.Assessórios / Brinquedos':      'variavel_opcional',
    'lazer.Restaurantes e Passeios':      'variavel_opcional',
    'lazer.Diversão Local':               'variavel_opcional',
    'lazer.Famílias e Amigos':            'variavel_opcional',
    'lazer.Viagens':                      'pontual',
    'financeiro.Taxas Bancárias':         'fixa_comprometida',
    'financeiro.Saques':                  'variavel_opcional',
    'financeiro.Seguro de Vida':          'fixa_comprometida',
    'financeiro.Imposto de Renda':        'pontual',
    'financeiro.Loteria':                 'variavel_opcional',
    'financeiro.Correios':                'variavel_opcional',
    'financeiro.Cartório':                'pontual',
    'financeiro.Contador':                'fixa_comprometida',
    'financeiro.Impostos Empresa':        'fixa_comprometida',
    'educacao.Mensalidade Escolar':       'fixa_comprometida',
    'educacao.Material Escolar':          'variavel_comprometida',
    'educacao.Uniforme':                  'pontual',
    'educacao.Passeios Escolares':        'variavel_opcional',
    'educacao.Livros':                    'variavel_comprometida',
    'educacao.Cursos':                    'fixa_comprometida',
    'educacao.Material':                  'variavel_comprometida',
    'educacao.Faculdade':                 'fixa_comprometida',
    'educacao.Material Universitário':    'variavel_comprometida',
    'educacao.Cursos e Especializações':  'fixa_comprometida',
    'assessorias.Honorários Advocatícios':'fixa_comprometida',
    'assessorias.Consultoria':            'fixa_comprometida',
    'assessorias.Contador Pessoal':       'fixa_comprometida',
    'assessorias.Outros':                 'variavel_opcional',
  };

  function getSubcatTipo(cat, sub) {
    const userMap = (_data.settings && _data.settings.subcatTipo) || {};
    const key = `${cat}.${sub}`;
    return userMap[key] || _DEFAULT_SUBTYPES[key] || 'variavel_opcional';
  }

  function setSubcatTipo(cat, sub, tipo) {
    if (!_data.settings) _data.settings = {};
    if (!_data.settings.subcatTipo) _data.settings.subcatTipo = {};
    _data.settings.subcatTipo[`${cat}.${sub}`] = tipo;
    persist();
  }

  function sumDespesasByTipo(month, year) {
    const totals = { fixa_essencial: 0, fixa_comprometida: 0, variavel_comprometida: 0, variavel_opcional: 0, pontual: 0 };
    _data.despesas
      .filter(d => d.month === month && d.year === year && d.category !== 'cartoes' && d.category !== 'receita')
      .forEach(d => {
        const tipo = getSubcatTipo(d.category, d.sub || '');
        if (totals[tipo] !== undefined) totals[tipo] += d.amount;
        else totals.variavel_opcional += d.amount;
      });
    return totals;
  }

  // Restricts in-memory data to what a 'member' role user should see.
  // Keeps only despesas where pessoa appears as responsavel or in split.
  // Receitas, contratos, contas, passivos, ativos: hidden (replaced with empty arrays).
  function applyMemberFilter(pessoaName) {
    if (!pessoaName || !_data) return;
    _data.despesas = (_data.despesas || []).filter(d => {
      if (d.responsavel === pessoaName) return true;
      if (Array.isArray(d.split) && d.split.some(s => s.person === pessoaName)) return true;
      return false;
    });
    _data.receitas   = [];
    _data.contratos  = [];
    _data.passivos   = [];
    _data.ativos     = [];
    _data.contas     = [];
  }

  return {
    init, get, persist,
    CATEGORIES, SUBCATEGORIES, PAYMENT_METHODS, PESSOAS, BANKS, ACCOUNT_TYPES,
    addReceita, addDespesa, deleteReceita, updateReceita, deleteDespesa, updateDespesa,
    addDespesaParcelada, getReembolsosPendentes, marcarReembolsoPago,
    addConta, deleteConta, updateConta,
    addCartao, deleteCartao,
    updateMeta, deleteMeta,
    addReserva, updateReserva, deleteReserva,
    addRecebimentoFuturo, deleteRecebimentoFuturo, getRecebimentosFuturos, realizarRecebimentoFuturo,
    deleteAtivo, updateAtivo,
    getVeiculos, addVeiculo, updateVeiculo, deleteVeiculo, veiculoValorEstimado, veiculoCustoAnual, totalVeiculos,
    getImoveis, addImovel, updateImovel, deleteImovel, imovelValorEstimado, imovelEquity, imovelCustoAnual, imovelReceitaAnual, imovelRentabilidadeAluguel, totalImoveis,
    updateSettings,
    receitasByMonth, despesasByMonth,
    sumReceitas, sumDespesas,
    despesasByCategory, yearlyMonthly,
    totalAtivos,
    cleanDespesasByCategory,
    descSuggestions, receitaSuggestions,
    categoriesOrdered, getCategoryOrder, setCategoryOrder,
    addContrato, updateContrato, deleteContrato, getContratos, getContratoById, getContratoPerformance, regenAllContratos, markAllPastParcelas,
    getSubcatTipo, setSubcatTipo, sumDespesasByTipo,
    getMetaPerformance, snapshotReserva, getActiveMetaReceitaMensal, getActiveLimiteDespMensal,
    exportData, importData, resetData,
    getProximasParcelas,
    getPassivos, addPassivo, updatePassivo, deletePassivo, totalPassivos,
    addCategoria, updateCategoria, deleteCategoria, getCategoriaUsage,
    addSubcategoria, renameSubcategoria, deleteSubcategoria,
    addPessoa, renamePessoa, deletePessoa,
    computeContribuicoesByPerson, despesasPorPessoa, despesasPorPessoaRange,
    getProfile, setProfile, getCredHash, setCredHash,
    applyMemberFilter,
    syncFromCloud,
  };
})();

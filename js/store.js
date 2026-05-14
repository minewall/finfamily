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
    roberto:     { label: 'Roberto Individual',  color: '#0EA5E9', icon: '👨' },
    mariana:     { label: 'Mariana Individual',  color: '#D946EF', icon: '👩' },
    receita:     { label: 'Receita',             color: '#22C55E', icon: '💰' },
  };

  const SUBCATEGORIES = {
    moradia: ['Aluguel','Energia Elétrica','Água e Saneamento','TV / Internet / Telefone','Reparos e Manutenção','Netflix','HBO','Spotify','Amazon Prime','Apple','iFood','Móveis e itens casa','Outras despesas'],
    alimentacao: ['Supermercado','Feira / Sacolão','Padaria','Açougue','Nespresso','Sorveteria','Água'],
    transporte: ['Aluguel Carro','Combustível','Manutenção','Estacionamento','Multas','Uber','Seguro','IPVA','Documentos'],
    saude: ['Convênio Médico','Medicamentos','Higiene Pessoal','Dentista','Emergências'],
    pessoal: ['Academia / Esportes','Salão de Beleza','Presentes','Vestuário','Terapia','Cigarro','Cerveja'],
    dogs: ['Ração','Banho e Tosa','Veterinário','Assessórios'],
    lazer: ['Restaurantes e Passeios','Diversão','Famílias e Amigos','Viagens'],
    financeiro: ['Taxas Bancárias','Saques','Seguro de Vida','Imposto de Renda','Loteria','Correios','Cartório','Contador','Impostos Empresa'],
    cartoes: ['Itaú Click','Itaú Uniclass','Wise','Santander','Shopee','Mercado Livre','Torra Torra'],
    roberto: ['Melissa Advogada','Assinaturas','Celular','Telegrama'],
    mariana: ['Faculdade UNIP','Livros e Materiais','Mesada','Lanche','OAB'],
  };

  const PAYMENT_METHODS = ['Cartão','Débito','Dinheiro','Pix'];

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

    // Despesas — seeded from real spreadsheet values (Despesas 2026)
    const despesas = [
      // ── JANEIRO ─────────────────────────────────────
      { id:'d1',  date:'2026-01-05', desc:'Aluguel',               amount:3500,    category:'moradia',     sub:'Aluguel',               pay:'Dinheiro',month:1,year:2026 },
      { id:'d2',  date:'2026-01-12', desc:'Móveis e itens casa',   amount:503.61,  category:'moradia',     sub:'Móveis e itens casa',    pay:'Cartão', month:1,year:2026 },
      { id:'d3',  date:'2026-01-12', desc:'Móveis e itens casa',   amount:511.84,  category:'moradia',     sub:'Móveis e itens casa',    pay:'Dinheiro',month:1,year:2026 },
      { id:'d4',  date:'2026-01-08', desc:'Outras despesas moradia',amount:25.90,  category:'moradia',     sub:'Outras despesas',        pay:'Cartão', month:1,year:2026 },
      { id:'d5',  date:'2026-01-08', desc:'Outras despesas moradia',amount:48.00,  category:'moradia',     sub:'Outras despesas',        pay:'Dinheiro',month:1,year:2026 },
      { id:'d6',  date:'2026-01-15', desc:'HBO',                   amount:18.90,  category:'moradia',     sub:'HBO',                    pay:'Cartão', month:1,year:2026 },
      { id:'d7',  date:'2026-01-15', desc:'Spotify',               amount:40.90,  category:'moradia',     sub:'Spotify',                pay:'Cartão', month:1,year:2026 },
      { id:'d8',  date:'2026-01-15', desc:'Amazon Prime',          amount:13.90,  category:'moradia',     sub:'Amazon Prime',           pay:'Cartão', month:1,year:2026 },
      { id:'d9',  date:'2026-01-15', desc:'Apple',                 amount:19.90,  category:'moradia',     sub:'Apple',                  pay:'Cartão', month:1,year:2026 },
      { id:'d10', date:'2026-01-15', desc:'iFood',                 amount:5.95,   category:'moradia',     sub:'iFood',                  pay:'Cartão', month:1,year:2026 },
      { id:'d11', date:'2026-01-10', desc:'Supermercado',          amount:1856.92,category:'alimentacao',  sub:'Supermercado',           pay:'Cartão', month:1,year:2026 },
      { id:'d12', date:'2026-01-10', desc:'Supermercado',          amount:1783.47,category:'alimentacao',  sub:'Supermercado',           pay:'Dinheiro',month:1,year:2026 },
      { id:'d13', date:'2026-01-20', desc:'Padaria',               amount:30.93,  category:'alimentacao',  sub:'Padaria',                pay:'Cartão', month:1,year:2026 },
      { id:'d14', date:'2026-01-20', desc:'Padaria',               amount:45.29,  category:'alimentacao',  sub:'Padaria',                pay:'Dinheiro',month:1,year:2026 },
      { id:'d15', date:'2026-01-22', desc:'Sorveteria',            amount:91.67,  category:'alimentacao',  sub:'Sorveteria',             pay:'Dinheiro',month:1,year:2026 },
      { id:'d16', date:'2026-01-18', desc:'Água',                  amount:36.00,  category:'alimentacao',  sub:'Água',                   pay:'Dinheiro',month:1,year:2026 },
      { id:'d17', date:'2026-01-05', desc:'Aluguel Carro',         amount:2439.58,category:'transporte',   sub:'Aluguel Carro',          pay:'Cartão', month:1,year:2026 },
      { id:'d18', date:'2026-01-15', desc:'Combustível',           amount:194.05, category:'transporte',   sub:'Combustível',            pay:'Cartão', month:1,year:2026 },
      { id:'d19', date:'2026-01-15', desc:'Combustível',           amount:245.81, category:'transporte',   sub:'Combustível',            pay:'Dinheiro',month:1,year:2026 },
      { id:'d20', date:'2026-01-25', desc:'Medicamentos',          amount:50.38,  category:'saude',        sub:'Medicamentos',           pay:'Dinheiro',month:1,year:2026 },
      { id:'d21', date:'2026-01-28', desc:'Presentes',             amount:244.97, category:'pessoal',      sub:'Presentes',              pay:'Cartão', month:1,year:2026 },
      { id:'d22', date:'2026-01-28', desc:'Presentes',             amount:189.97, category:'pessoal',      sub:'Presentes',              pay:'Dinheiro',month:1,year:2026 },
      { id:'d23', date:'2026-01-20', desc:'Vestuário',             amount:1078.57,category:'pessoal',      sub:'Vestuário',              pay:'Cartão', month:1,year:2026 },
      { id:'d24', date:'2026-01-15', desc:'Cigarro',               amount:164.49, category:'pessoal',      sub:'Cigarro',                pay:'Cartão', month:1,year:2026 },
      { id:'d25', date:'2026-01-15', desc:'Cigarro',               amount:588.00, category:'pessoal',      sub:'Cigarro',                pay:'Dinheiro',month:1,year:2026 },
      { id:'d26', date:'2026-01-15', desc:'Cerveja',               amount:306.08, category:'pessoal',      sub:'Cerveja',                pay:'Cartão', month:1,year:2026 },
      { id:'d27', date:'2026-01-15', desc:'Cerveja',               amount:322.87, category:'pessoal',      sub:'Cerveja',                pay:'Dinheiro',month:1,year:2026 },
      { id:'d28', date:'2026-01-22', desc:'Banho e Tosa',          amount:205.00, category:'dogs',         sub:'Banho e Tosa',           pay:'Cartão', month:1,year:2026 },
      { id:'d29', date:'2026-01-25', desc:'Restaurantes',          amount:607.31, category:'lazer',        sub:'Restaurantes e Passeios',pay:'Cartão', month:1,year:2026 },
      { id:'d30', date:'2026-01-25', desc:'Restaurantes',          amount:467.69, category:'lazer',        sub:'Restaurantes e Passeios',pay:'Dinheiro',month:1,year:2026 },
      { id:'d31', date:'2026-01-20', desc:'Diversão',              amount:28.00,  category:'lazer',        sub:'Diversão',               pay:'Cartão', month:1,year:2026 },
      { id:'d32', date:'2026-01-20', desc:'Diversão',              amount:20.00,  category:'lazer',        sub:'Diversão',               pay:'Dinheiro',month:1,year:2026 },
      { id:'d33', date:'2026-01-10', desc:'Viagens',               amount:566.09, category:'lazer',        sub:'Viagens',                pay:'Cartão', month:1,year:2026 },
      { id:'d34', date:'2026-01-31', desc:'Shopee',                amount:63.91,  category:'cartoes',      sub:'Shopee',                 pay:'Cartão', month:1,year:2026 },
      { id:'d35', date:'2026-01-31', desc:'Mercado Livre',         amount:213.74, category:'cartoes',      sub:'Mercado Livre',          pay:'Cartão', month:1,year:2026 },
      { id:'d36', date:'2026-01-31', desc:'Melissa Advogada',      amount:0,      category:'roberto',      sub:'Melissa Advogada',       pay:'Dinheiro',month:1,year:2026 },
      { id:'d37', date:'2026-01-31', desc:'Assinaturas',           amount:73.58,  category:'roberto',      sub:'Assinaturas',            pay:'Cartão', month:1,year:2026 },
      { id:'d38', date:'2026-01-31', desc:'Celular',               amount:179.90, category:'roberto',      sub:'Celular',                pay:'Cartão', month:1,year:2026 },

      // ── FEVEREIRO ─────────────────────────────────────
      { id:'d50', date:'2026-02-05', desc:'Aluguel',               amount:3500,    category:'moradia',     sub:'Aluguel',               pay:'Dinheiro',month:2,year:2026 },
      { id:'d51', date:'2026-02-10', desc:'Energia Elétrica',      amount:212.43, category:'moradia',     sub:'Energia Elétrica',      pay:'Dinheiro',month:2,year:2026 },
      { id:'d52', date:'2026-02-10', desc:'Água',                  amount:273.76, category:'moradia',     sub:'Água e Saneamento',     pay:'Dinheiro',month:2,year:2026 },
      { id:'d53', date:'2026-02-08', desc:'TV / Internet',         amount:295.33, category:'moradia',     sub:'TV / Internet / Telefone',pay:'Dinheiro',month:2,year:2026 },
      { id:'d54', date:'2026-02-12', desc:'Móveis e itens casa',   amount:76.23,  category:'moradia',     sub:'Móveis e itens casa',    pay:'Cartão', month:2,year:2026 },
      { id:'d55', date:'2026-02-10', desc:'Supermercado',          amount:1623.41,category:'alimentacao',  sub:'Supermercado',           pay:'Cartão', month:2,year:2026 },
      { id:'d56', date:'2026-02-10', desc:'Supermercado',          amount:164.10, category:'alimentacao',  sub:'Supermercado',           pay:'Dinheiro',month:2,year:2026 },
      { id:'d57', date:'2026-02-20', desc:'Padaria',               amount:58.42,  category:'alimentacao',  sub:'Padaria',                pay:'Cartão', month:2,year:2026 },
      { id:'d58', date:'2026-02-22', desc:'Sorveteria',            amount:155.31, category:'alimentacao',  sub:'Sorveteria',             pay:'Cartão', month:2,year:2026 },
      { id:'d59', date:'2026-02-18', desc:'Água',                  amount:18.00,  category:'alimentacao',  sub:'Água',                   pay:'Dinheiro',month:2,year:2026 },
      { id:'d60', date:'2026-02-05', desc:'Aluguel Carro',         amount:2555.95,category:'transporte',   sub:'Aluguel Carro',          pay:'Cartão', month:2,year:2026 },
      { id:'d61', date:'2026-02-15', desc:'Combustível',           amount:316.94, category:'transporte',   sub:'Combustível',            pay:'Cartão', month:2,year:2026 },
      { id:'d62', date:'2026-02-15', desc:'Combustível',           amount:318.46, category:'transporte',   sub:'Combustível',            pay:'Dinheiro',month:2,year:2026 },
      { id:'d63', date:'2026-02-20', desc:'Multas',                amount:68.32,  category:'transporte',   sub:'Multas',                 pay:'Dinheiro',month:2,year:2026 },
      { id:'d64', date:'2026-02-25', desc:'Medicamentos',          amount:21.59,  category:'saude',        sub:'Medicamentos',           pay:'Cartão', month:2,year:2026 },
      { id:'d65', date:'2026-02-26', desc:'Higiene Pessoal',       amount:68.32,  category:'saude',        sub:'Higiene Pessoal',        pay:'Cartão', month:2,year:2026 },
      { id:'d66', date:'2026-02-15', desc:'Presentes',             amount:125.00, category:'pessoal',      sub:'Presentes',              pay:'Cartão', month:2,year:2026 },
      { id:'d67', date:'2026-02-20', desc:'Vestuário',             amount:858.68, category:'pessoal',      sub:'Vestuário',              pay:'Cartão', month:2,year:2026 },
      { id:'d68', date:'2026-02-15', desc:'Cigarro',               amount:726.27, category:'pessoal',      sub:'Cigarro',                pay:'Cartão', month:2,year:2026 },
      { id:'d69', date:'2026-02-15', desc:'Cigarro',               amount:393.50, category:'pessoal',      sub:'Cigarro',                pay:'Dinheiro',month:2,year:2026 },
      { id:'d70', date:'2026-02-15', desc:'Cerveja',               amount:464.79, category:'pessoal',      sub:'Cerveja',                pay:'Cartão', month:2,year:2026 },
      { id:'d71', date:'2026-02-15', desc:'Cerveja',               amount:110.08, category:'pessoal',      sub:'Cerveja',                pay:'Dinheiro',month:2,year:2026 },
      { id:'d72', date:'2026-02-22', desc:'Ração',                 amount:116.95, category:'dogs',         sub:'Ração',                  pay:'Cartão', month:2,year:2026 },
      { id:'d73', date:'2026-02-22', desc:'Banho e Tosa',          amount:205.00, category:'dogs',         sub:'Banho e Tosa',           pay:'Cartão', month:2,year:2026 },
      { id:'d74', date:'2026-02-25', desc:'Restaurantes',          amount:604.01, category:'lazer',        sub:'Restaurantes e Passeios',pay:'Cartão', month:2,year:2026 },
      { id:'d75', date:'2026-02-25', desc:'Restaurantes',          amount:336.75, category:'lazer',        sub:'Restaurantes e Passeios',pay:'Dinheiro',month:2,year:2026 },
      { id:'d76', date:'2026-02-20', desc:'Diversão',              amount:98.40,  category:'lazer',        sub:'Diversão',               pay:'Cartão', month:2,year:2026 },
      { id:'d77', date:'2026-02-18', desc:'Famílias e Amigos',     amount:37.98,  category:'lazer',        sub:'Famílias e Amigos',      pay:'Dinheiro',month:2,year:2026 },
      { id:'d78', date:'2026-02-28', desc:'Shopee',                amount:63.91,  category:'cartoes',      sub:'Shopee',                 pay:'Cartão', month:2,year:2026 },
      { id:'d79', date:'2026-02-28', desc:'Mercado Livre',         amount:204.81, category:'cartoes',      sub:'Mercado Livre',          pay:'Cartão', month:2,year:2026 },
      { id:'d80', date:'2026-02-28', desc:'Faculdade UNIP',        amount:748.14, category:'mariana',      sub:'Faculdade UNIP',         pay:'Dinheiro',month:2,year:2026 },
      { id:'d81', date:'2026-02-28', desc:'Assinaturas',           amount:42.51,  category:'roberto',      sub:'Assinaturas',            pay:'Cartão', month:2,year:2026 },
      { id:'d82', date:'2026-02-28', desc:'Celular',               amount:179.90, category:'roberto',      sub:'Celular',                pay:'Cartão', month:2,year:2026 },

      // ── MARÇO ─────────────────────────────────────────
      { id:'d100',date:'2026-03-05', desc:'Aluguel',               amount:3500,    category:'moradia',     sub:'Aluguel',               pay:'Dinheiro',month:3,year:2026 },
      { id:'d101',date:'2026-03-10', desc:'Energia Elétrica',      amount:253.41, category:'moradia',     sub:'Energia Elétrica',      pay:'Dinheiro',month:3,year:2026 },
      { id:'d102',date:'2026-03-10', desc:'Água',                  amount:311.72, category:'moradia',     sub:'Água e Saneamento',     pay:'Dinheiro',month:3,year:2026 },
      { id:'d103',date:'2026-03-08', desc:'TV / Internet',         amount:309.00, category:'moradia',     sub:'TV / Internet / Telefone',pay:'Cartão',month:3,year:2026 },
      { id:'d104',date:'2026-03-12', desc:'HBO',                   amount:18.90,  category:'moradia',     sub:'HBO',                    pay:'Cartão', month:3,year:2026 },
      { id:'d105',date:'2026-03-12', desc:'Spotify',               amount:40.90,  category:'moradia',     sub:'Spotify',                pay:'Cartão', month:3,year:2026 },
      { id:'d106',date:'2026-03-12', desc:'Amazon Prime',          amount:13.90,  category:'moradia',     sub:'Amazon Prime',           pay:'Cartão', month:3,year:2026 },
      { id:'d107',date:'2026-03-12', desc:'Apple',                 amount:69.03,  category:'moradia',     sub:'Apple',                  pay:'Cartão', month:3,year:2026 },
      { id:'d108',date:'2026-03-12', desc:'iFood',                 amount:5.95,   category:'moradia',     sub:'iFood',                  pay:'Cartão', month:3,year:2026 },
      { id:'d109',date:'2026-03-15', desc:'Móveis e itens casa',   amount:76.14,  category:'moradia',     sub:'Móveis e itens casa',    pay:'Cartão', month:3,year:2026 },
      { id:'d110',date:'2026-03-15', desc:'Outras despesas',       amount:120.00, category:'moradia',     sub:'Outras despesas',        pay:'Cartão', month:3,year:2026 },
      { id:'d111',date:'2026-03-10', desc:'Supermercado',          amount:2349.54,category:'alimentacao',  sub:'Supermercado',           pay:'Cartão', month:3,year:2026 },
      { id:'d112',date:'2026-03-10', desc:'Supermercado',          amount:163.65, category:'alimentacao',  sub:'Supermercado',           pay:'Dinheiro',month:3,year:2026 },
      { id:'d113',date:'2026-03-12', desc:'Feira / Sacolão',       amount:235.01, category:'alimentacao',  sub:'Feira / Sacolão',        pay:'Cartão', month:3,year:2026 },
      { id:'d114',date:'2026-03-12', desc:'Feira / Sacolão',       amount:312.66, category:'alimentacao',  sub:'Feira / Sacolão',        pay:'Dinheiro',month:3,year:2026 },
      { id:'d115',date:'2026-03-20', desc:'Padaria',               amount:93.91,  category:'alimentacao',  sub:'Padaria',                pay:'Cartão', month:3,year:2026 },
      { id:'d116',date:'2026-03-20', desc:'Padaria',               amount:22.22,  category:'alimentacao',  sub:'Padaria',                pay:'Dinheiro',month:3,year:2026 },
      { id:'d117',date:'2026-03-20', desc:'Açougue',               amount:210.36, category:'alimentacao',  sub:'Açougue',                pay:'Dinheiro',month:3,year:2026 },
      { id:'d118',date:'2026-03-18', desc:'Água',                  amount:36.00,  category:'alimentacao',  sub:'Água',                   pay:'Dinheiro',month:3,year:2026 },
      { id:'d119',date:'2026-03-05', desc:'Aluguel Carro',         amount:2368.80,category:'transporte',   sub:'Aluguel Carro',          pay:'Cartão', month:3,year:2026 },
      { id:'d120',date:'2026-03-15', desc:'Combustível',           amount:420.05, category:'transporte',   sub:'Combustível',            pay:'Cartão', month:3,year:2026 },
      { id:'d121',date:'2026-03-15', desc:'Combustível',           amount:445.39, category:'transporte',   sub:'Combustível',            pay:'Dinheiro',month:3,year:2026 },
      { id:'d122',date:'2026-03-20', desc:'Estacionamento',        amount:20.00,  category:'transporte',   sub:'Estacionamento',         pay:'Dinheiro',month:3,year:2026 },
      { id:'d123',date:'2026-03-25', desc:'Medicamentos',          amount:104.80, category:'saude',        sub:'Medicamentos',           pay:'Cartão', month:3,year:2026 },
      { id:'d124',date:'2026-03-26', desc:'Higiene Pessoal',       amount:68.30,  category:'saude',        sub:'Higiene Pessoal',        pay:'Cartão', month:3,year:2026 },
      { id:'d125',date:'2026-03-15', desc:'Presentes',             amount:125.00, category:'pessoal',      sub:'Presentes',              pay:'Cartão', month:3,year:2026 },
      { id:'d126',date:'2026-03-20', desc:'Vestuário',             amount:251.19, category:'pessoal',      sub:'Vestuário',              pay:'Cartão', month:3,year:2026 },
      { id:'d127',date:'2026-03-15', desc:'Cigarro',               amount:308.98, category:'pessoal',      sub:'Cigarro',                pay:'Cartão', month:3,year:2026 },
      { id:'d128',date:'2026-03-15', desc:'Cigarro',               amount:630.95, category:'pessoal',      sub:'Cigarro',                pay:'Dinheiro',month:3,year:2026 },
      { id:'d129',date:'2026-03-15', desc:'Cerveja',               amount:109.57, category:'pessoal',      sub:'Cerveja',                pay:'Cartão', month:3,year:2026 },
      { id:'d130',date:'2026-03-15', desc:'Cerveja',               amount:264.60, category:'pessoal',      sub:'Cerveja',                pay:'Dinheiro',month:3,year:2026 },
      { id:'d131',date:'2026-03-22', desc:'Ração',                 amount:116.95, category:'dogs',         sub:'Ração',                  pay:'Cartão', month:3,year:2026 },
      { id:'d132',date:'2026-03-22', desc:'Banho e Tosa',          amount:184.50, category:'dogs',         sub:'Banho e Tosa',           pay:'Cartão', month:3,year:2026 },
      { id:'d133',date:'2026-03-20', desc:'Veterinário',           amount:365.00, category:'dogs',         sub:'Veterinário',            pay:'Dinheiro',month:3,year:2026 },
      { id:'d134',date:'2026-03-18', desc:'Assessórios dogs',      amount:56.80,  category:'dogs',         sub:'Assessórios',            pay:'Cartão', month:3,year:2026 },
      { id:'d135',date:'2026-03-25', desc:'Restaurantes',          amount:540.67, category:'lazer',        sub:'Restaurantes e Passeios',pay:'Cartão', month:3,year:2026 },
      { id:'d136',date:'2026-03-25', desc:'Restaurantes',          amount:173.77, category:'lazer',        sub:'Restaurantes e Passeios',pay:'Dinheiro',month:3,year:2026 },
      { id:'d137',date:'2026-03-20', desc:'Diversão',              amount:68.40,  category:'lazer',        sub:'Diversão',               pay:'Cartão', month:3,year:2026 },
      { id:'d138',date:'2026-03-18', desc:'Famílias e Amigos',     amount:72.84,  category:'lazer',        sub:'Famílias e Amigos',      pay:'Dinheiro',month:3,year:2026 },
      { id:'d139',date:'2026-03-28', desc:'Shopee',                amount:63.90,  category:'cartoes',      sub:'Shopee',                 pay:'Cartão', month:3,year:2026 },
      { id:'d140',date:'2026-03-28', desc:'Taxas Bancárias',       amount:198.84, category:'financeiro',   sub:'Taxas Bancárias',        pay:'Cartão', month:3,year:2026 },
      { id:'d141',date:'2026-03-28', desc:'Assinaturas',           amount:94.99,  category:'roberto',      sub:'Assinaturas',            pay:'Cartão', month:3,year:2026 },
      { id:'d142',date:'2026-03-28', desc:'Celular',               amount:179.90, category:'roberto',      sub:'Celular',                pay:'Cartão', month:3,year:2026 },
      { id:'d143',date:'2026-03-28', desc:'Faculdade UNIP',        amount:748.14, category:'mariana',      sub:'Faculdade UNIP',         pay:'Dinheiro',month:3,year:2026 },
      { id:'d144',date:'2026-03-15', desc:'Lanche',                amount:34.00,  category:'mariana',      sub:'Lanche',                 pay:'Dinheiro',month:3,year:2026 },

      // ── ABRIL ─────────────────────────────────────────
      { id:'d200',date:'2026-04-05', desc:'Aluguel',               amount:3500,    category:'moradia',     sub:'Aluguel',               pay:'Dinheiro',month:4,year:2026 },
      { id:'d201',date:'2026-04-10', desc:'Energia Elétrica',      amount:509.70, category:'moradia',     sub:'Energia Elétrica',      pay:'Dinheiro',month:4,year:2026 },
      { id:'d202',date:'2026-04-10', desc:'Água',                  amount:373.94, category:'moradia',     sub:'Água e Saneamento',     pay:'Dinheiro',month:4,year:2026 },
      { id:'d203',date:'2026-04-08', desc:'TV / Internet',         amount:600.85, category:'moradia',     sub:'TV / Internet / Telefone',pay:'Dinheiro',month:4,year:2026 },
      { id:'d204',date:'2026-04-12', desc:'Móveis e itens casa',   amount:148.13, category:'moradia',     sub:'Móveis e itens casa',    pay:'Cartão', month:4,year:2026 },
      { id:'d205',date:'2026-04-12', desc:'Spotify',               amount:40.90,  category:'moradia',     sub:'Spotify',                pay:'Cartão', month:4,year:2026 },
      { id:'d206',date:'2026-04-12', desc:'Amazon Prime',          amount:13.90,  category:'moradia',     sub:'Amazon Prime',           pay:'Cartão', month:4,year:2026 },
      { id:'d207',date:'2026-04-12', desc:'Apple',                 amount:92.70,  category:'moradia',     sub:'Apple',                  pay:'Cartão', month:4,year:2026 },
      { id:'d208',date:'2026-04-12', desc:'iFood',                 amount:11.90,  category:'moradia',     sub:'iFood',                  pay:'Cartão', month:4,year:2026 },
      { id:'d209',date:'2026-04-12', desc:'Reparos e Manutenção',  amount:115.00, category:'moradia',     sub:'Reparos e Manutenção',   pay:'Dinheiro',month:4,year:2026 },
      { id:'d210',date:'2026-04-15', desc:'Outras despesas',       amount:129.11, category:'moradia',     sub:'Outras despesas',        pay:'Cartão', month:4,year:2026 },
      { id:'d211',date:'2026-04-15', desc:'Outras despesas',       amount:49.00,  category:'moradia',     sub:'Outras despesas',        pay:'Dinheiro',month:4,year:2026 },
      { id:'d212',date:'2026-04-10', desc:'Supermercado',          amount:284.43, category:'alimentacao',  sub:'Supermercado',           pay:'Cartão', month:4,year:2026 },
      { id:'d213',date:'2026-04-10', desc:'Supermercado',          amount:1569.20,category:'alimentacao',  sub:'Supermercado',           pay:'Dinheiro',month:4,year:2026 },
      { id:'d214',date:'2026-04-12', desc:'Feira / Sacolão',       amount:818.26, category:'alimentacao',  sub:'Feira / Sacolão',        pay:'Dinheiro',month:4,year:2026 },
      { id:'d215',date:'2026-04-20', desc:'Padaria',               amount:31.88,  category:'alimentacao',  sub:'Padaria',                pay:'Cartão', month:4,year:2026 },
      { id:'d216',date:'2026-04-20', desc:'Açougue',               amount:98.89,  category:'alimentacao',  sub:'Açougue',                pay:'Dinheiro',month:4,year:2026 },
      { id:'d217',date:'2026-04-22', desc:'Sorveteria',            amount:57.20,  category:'alimentacao',  sub:'Sorveteria',             pay:'Dinheiro',month:4,year:2026 },
      { id:'d218',date:'2026-04-18', desc:'Água',                  amount:36.00,  category:'alimentacao',  sub:'Água',                   pay:'Dinheiro',month:4,year:2026 },
      { id:'d219',date:'2026-04-05', desc:'Aluguel Carro',         amount:2281.44,category:'transporte',   sub:'Aluguel Carro',          pay:'Cartão', month:4,year:2026 },
      { id:'d220',date:'2026-04-15', desc:'Combustível',           amount:287.71, category:'transporte',   sub:'Combustível',            pay:'Cartão', month:4,year:2026 },
      { id:'d221',date:'2026-04-15', desc:'Combustível',           amount:363.63, category:'transporte',   sub:'Combustível',            pay:'Dinheiro',month:4,year:2026 },
      { id:'d222',date:'2026-04-20', desc:'Estacionamento',        amount:40.00,  category:'transporte',   sub:'Estacionamento',         pay:'Dinheiro',month:4,year:2026 },
      { id:'d223',date:'2026-04-25', desc:'Medicamentos',          amount:158.37, category:'saude',        sub:'Medicamentos',           pay:'Dinheiro',month:4,year:2026 },
      { id:'d224',date:'2026-04-26', desc:'Higiene Pessoal',       amount:152.28, category:'saude',        sub:'Higiene Pessoal',        pay:'Cartão', month:4,year:2026 },
      { id:'d225',date:'2026-04-10', desc:'Dentista',              amount:481.00, category:'saude',        sub:'Dentista',               pay:'Dinheiro',month:4,year:2026 },
      { id:'d226',date:'2026-04-15', desc:'Salão de Beleza',       amount:385.00, category:'pessoal',      sub:'Salão de Beleza',        pay:'Dinheiro',month:4,year:2026 },
      { id:'d227',date:'2026-04-15', desc:'Presentes',             amount:268.40, category:'pessoal',      sub:'Presentes',              pay:'Cartão', month:4,year:2026 },
      { id:'d228',date:'2026-04-15', desc:'Presentes',             amount:133.85, category:'pessoal',      sub:'Presentes',              pay:'Dinheiro',month:4,year:2026 },
      { id:'d229',date:'2026-04-20', desc:'Vestuário',             amount:550.80, category:'pessoal',      sub:'Vestuário',              pay:'Cartão', month:4,year:2026 },
      { id:'d230',date:'2026-04-15', desc:'Cigarro',               amount:634.25, category:'pessoal',      sub:'Cigarro',                pay:'Cartão', month:4,year:2026 },
      { id:'d231',date:'2026-04-15', desc:'Cigarro',               amount:783.00, category:'pessoal',      sub:'Cigarro',                pay:'Dinheiro',month:4,year:2026 },
      { id:'d232',date:'2026-04-15', desc:'Cerveja',               amount:223.94, category:'pessoal',      sub:'Cerveja',                pay:'Cartão', month:4,year:2026 },
      { id:'d233',date:'2026-04-15', desc:'Cerveja',               amount:131.48, category:'pessoal',      sub:'Cerveja',                pay:'Dinheiro',month:4,year:2026 },
      { id:'d234',date:'2026-04-22', desc:'Banho e Tosa',          amount:184.50, category:'dogs',         sub:'Banho e Tosa',           pay:'Cartão', month:4,year:2026 },
      { id:'d235',date:'2026-04-20', desc:'Veterinário',           amount:365.00, category:'dogs',         sub:'Veterinário',            pay:'Dinheiro',month:4,year:2026 },
      { id:'d236',date:'2026-04-18', desc:'Assessórios dogs',      amount:146.79, category:'dogs',         sub:'Assessórios',            pay:'Cartão', month:4,year:2026 },
      { id:'d237',date:'2026-04-25', desc:'Restaurantes',          amount:1115.23,category:'lazer',        sub:'Restaurantes e Passeios',pay:'Cartão', month:4,year:2026 },
      { id:'d238',date:'2026-04-25', desc:'Restaurantes',          amount:1414.21,category:'lazer',        sub:'Restaurantes e Passeios',pay:'Dinheiro',month:4,year:2026 },
      { id:'d239',date:'2026-04-20', desc:'Diversão',              amount:7.50,   category:'lazer',        sub:'Diversão',               pay:'Cartão', month:4,year:2026 },
      { id:'d240',date:'2026-04-20', desc:'Diversão',              amount:11.90,  category:'lazer',        sub:'Diversão',               pay:'Dinheiro',month:4,year:2026 },
      { id:'d241',date:'2026-04-18', desc:'Famílias e Amigos',     amount:70.80,  category:'lazer',        sub:'Famílias e Amigos',      pay:'Dinheiro',month:4,year:2026 },
      { id:'d242',date:'2026-04-10', desc:'Viagens',               amount:18.00,  category:'lazer',        sub:'Viagens',                pay:'Cartão', month:4,year:2026 },
      { id:'d243',date:'2026-04-28', desc:'Shopee',                amount:237.52, category:'cartoes',      sub:'Shopee',                 pay:'Cartão', month:4,year:2026 },
      { id:'d244',date:'2026-04-28', desc:'Mercado Livre',         amount:669.27, category:'cartoes',      sub:'Mercado Livre',          pay:'Cartão', month:4,year:2026 },
      { id:'d245',date:'2026-04-28', desc:'Taxas Bancárias',       amount:141.00, category:'financeiro',   sub:'Taxas Bancárias',        pay:'Dinheiro',month:4,year:2026 },
      { id:'d246',date:'2026-04-28', desc:'Saques',                amount:26.50,  category:'financeiro',   sub:'Saques',                 pay:'Dinheiro',month:4,year:2026 },
      { id:'d247',date:'2026-04-28', desc:'Contador',              amount:1626.82,category:'financeiro',   sub:'Contador',               pay:'Dinheiro',month:4,year:2026 },
      { id:'d248',date:'2026-04-28', desc:'Impostos Empresa',      amount:2540.15,category:'financeiro',   sub:'Impostos Empresa',       pay:'Dinheiro',month:4,year:2026 },
      { id:'d249',date:'2026-04-28', desc:'Melissa Advogada',      amount:3900.00,category:'roberto',      sub:'Melissa Advogada',       pay:'Dinheiro',month:4,year:2026 },
      { id:'d250',date:'2026-04-28', desc:'Assinaturas',           amount:133.75, category:'roberto',      sub:'Assinaturas',            pay:'Cartão', month:4,year:2026 },
      { id:'d251',date:'2026-04-28', desc:'Faculdade UNIP',        amount:1835.83,category:'mariana',      sub:'Faculdade UNIP',         pay:'Dinheiro',month:4,year:2026 },
      { id:'d252',date:'2026-04-28', desc:'OAB',                   amount:320.00, category:'mariana',      sub:'OAB',                    pay:'Dinheiro',month:4,year:2026 },
      { id:'d253',date:'2026-04-28', desc:'Livros e Materiais',    amount:71.98,  category:'mariana',      sub:'Livros e Materiais',     pay:'Cartão', month:4,year:2026 },
      { id:'d254',date:'2026-04-15', desc:'Mesada',                amount:49.80,  category:'mariana',      sub:'Mesada',                 pay:'Dinheiro',month:4,year:2026 },
      { id:'d255',date:'2026-04-15', desc:'Lanche',                amount:47.50,  category:'mariana',      sub:'Lanche',                 pay:'Dinheiro',month:4,year:2026 },
      { id:'d256',date:'2026-04-15', desc:'Móveis e itens casa',   amount:540.73, category:'moradia',      sub:'Móveis e itens casa',    pay:'Dinheiro',month:4,year:2026 },
    ];

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
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { console.warn('Store: cannot save', e); }
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

  function init() {
    _data = load();
    if (!_data) {
      _data = buildSeed();
      save(_data);
    }
    _cleanupBadSeed();
    _migrateMetas();
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
    if (d) { Object.assign(d, patch); persist(); }
  }

  function updateSettings(patch) {
    Object.assign(_data.settings, patch);
    persist();
  }

  function addDespesaParcelada({ desc, amount, date, category, sub, pay, parcelas }) {
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
      });
    }
    _data.despesas.push(...entries);
    persist();
    return entries;
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
    return fromAtivos + fromReserva;
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
    const entries = [];
    for (let i = 0; i < c.parcelas; i++) {
      const dt = new Date(base);
      dt.setMonth(dt.getMonth() + i);
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

  return {
    init, get, persist,
    CATEGORIES, SUBCATEGORIES, PAYMENT_METHODS, PESSOAS, BANKS, ACCOUNT_TYPES,
    addReceita, addDespesa, deleteReceita, updateReceita, deleteDespesa, updateDespesa,
    addDespesaParcelada,
    addConta, deleteConta, updateConta,
    addCartao, deleteCartao,
    updateMeta, deleteMeta,
    addReserva, updateReserva, deleteReserva,
    addRecebimentoFuturo, deleteRecebimentoFuturo, getRecebimentosFuturos, realizarRecebimentoFuturo,
    deleteAtivo, updateAtivo,
    updateSettings,
    receitasByMonth, despesasByMonth,
    sumReceitas, sumDespesas,
    despesasByCategory, yearlyMonthly,
    totalAtivos,
    cleanDespesasByCategory,
    descSuggestions, receitaSuggestions,
    addContrato, updateContrato, deleteContrato, getContratos, getContratoById, getContratoPerformance, regenAllContratos,
    getMetaPerformance, snapshotReserva, getActiveMetaReceitaMensal, getActiveLimiteDespMensal,
    exportData, importData, resetData,
    getProximasParcelas,
  };
})();

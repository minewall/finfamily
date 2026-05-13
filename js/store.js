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
      { id: 'r2',  date: '2026-02-05', desc: 'Mastercard – Contrato',  amount: 30000,  category: 'receita', person: 'Roberto', type: 'salario',    month: 2, year: 2026 },
      { id: 'r3',  date: '2026-03-05', desc: 'Bridge – Contrato I',    amount: 6120,   category: 'receita', person: 'Roberto', type: 'contrato',   month: 3, year: 2026 },
      { id: 'r4',  date: '2026-03-10', desc: 'Empréstimo',             amount: 5000,   category: 'receita', person: 'Roberto', type: 'emprestimo', month: 3, year: 2026 },
      { id: 'r5',  date: '2026-04-05', desc: 'Bridge – Contrato I',    amount: 25704,  category: 'receita', person: 'Roberto', type: 'contrato',   month: 4, year: 2026 },
      { id: 'r6',  date: '2026-05-05', desc: 'Mastercard – Contrato',  amount: 30000,  category: 'receita', person: 'Roberto', type: 'salario',    month: 5, year: 2026 },
      { id: 'r7',  date: '2026-06-05', desc: 'Mastercard – Contrato',  amount: 30000,  category: 'receita', person: 'Roberto', type: 'salario',    month: 6, year: 2026 },
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

    const sambarReceitas = [
      { id: 's1', date: '2024-03-01', cash: 56.40,  card: 18.80  },
      { id: 's2', date: '2024-03-02', cash: 163.50, card: 15.00  },
      { id: 's3', date: '2024-03-05', cash: 42.50,  card: 0      },
      { id: 's4', date: '2024-03-06', cash: 96.30,  card: 25.10  },
      { id: 's5', date: '2024-03-07', cash: 67.10,  card: 8.60   },
      { id: 's6', date: '2024-03-08', cash: 108.35, card: 113.50 },
      { id: 's7', date: '2024-03-09', cash: 185.90, card: 0      },
      { id: 's8', date: '2024-03-12', cash: 57.60,  card: 60.70  },
      { id: 's9', date: '2024-03-13', cash: 36.10,  card: 0      },
      { id: 's10',date: '2024-03-16', cash: 44.20,  card: 41.90  },
      { id: 's11',date: '2024-03-19', cash: 86.82,  card: 16.20  },
      { id: 's12',date: '2024-03-22', cash: 56.30,  card: 49.00  },
      { id: 's13',date: '2024-03-23', cash: 109.36, card: 235.53 },
      { id: 's14',date: '2024-03-26', cash: 10.80,  card: 10.00  },
      { id: 's15',date: '2024-03-30', cash: 97.70,  card: 178.80 },
      { id: 's16',date: '2024-04-01', cash: 30.80,  card: 72.40  },
      { id: 's17',date: '2024-04-05', cash: 88.70,  card: 41.20  },
      { id: 's18',date: '2024-04-06', cash: 92.40,  card: 132.90 },
      { id: 's19',date: '2024-04-08', cash: 0,      card: 162.50 },
      { id: 's20',date: '2024-04-16', cash: 19.40,  card: 0      },
      { id: 's21',date: '2024-04-20', cash: 124.90, card: 284.20 },
      { id: 's22',date: '2024-05-01', cash: 16.40,  card: 17.40  },
      { id: 's23',date: '2024-05-04', cash: 60.30,  card: 123.20 },
      { id: 's24',date: '2024-05-10', cash: 95.00,  card: 42.60  },
      { id: 's25',date: '2024-06-05', cash: 120.00, card: 98.50  },
      { id: 's26',date: '2024-06-12', cash: 88.50,  card: 156.30 },
    ];

    const sambarDespesas = [
      { id: 'sd1', date: '2024-02-01', cat: 'Infraestrutura', desc: 'Internet',          amount: 46.07 },
      { id: 'sd2', date: '2024-03-01', cat: 'Infraestrutura', desc: 'Aluguel',            amount: 550.00 },
      { id: 'sd3', date: '2024-03-01', cat: 'Infraestrutura', desc: 'Sistema Vendus',     amount: 24.59 },
      { id: 'sd4', date: '2024-03-01', cat: 'Infraestrutura', desc: 'Reparos',            amount: 116.30 },
      { id: 'sd5', date: '2024-03-01', cat: 'Alimentos',      desc: 'Bem Brasil',         amount: 66.42 },
      { id: 'sd6', date: '2024-03-01', cat: 'Alimentos',      desc: 'Mercadona',          amount: 259.76 },
      { id: 'sd7', date: '2024-03-01', cat: 'Bebidas',        desc: 'DCN Beers',          amount: 191.76 },
      { id: 'sd8', date: '2024-03-01', cat: 'Bebidas',        desc: 'Super Bock',         amount: 509.54 },
      { id: 'sd9', date: '2024-04-01', cat: 'Infraestrutura', desc: 'Aluguel',            amount: 550.00 },
      { id: 'sd10',date: '2024-04-01', cat: 'Alimentos',      desc: 'Bem Brasil',         amount: 103.32 },
      { id: 'sd11',date: '2024-04-01', cat: 'Alimentos',      desc: 'Mercadona',          amount: 181.19 },
      { id: 'sd12',date: '2024-04-01', cat: 'Bebidas',        desc: 'Super Bock',         amount: 252.78 },
      { id: 'sd13',date: '2024-05-01', cat: 'Infraestrutura', desc: 'Aluguel',            amount: 550.00 },
      { id: 'sd14',date: '2024-05-01', cat: 'Alimentos',      desc: 'Bem Brasil',         amount: 125.46 },
      { id: 'sd15',date: '2024-05-01', cat: 'Alimentos',      desc: 'Mercadona',          amount: 347.86 },
      { id: 'sd16',date: '2024-05-01', cat: 'Alimentos',      desc: 'Makro',              amount: 150.65 },
      { id: 'sd17',date: '2024-05-01', cat: 'Bebidas',        desc: 'Super Bock',         amount: 736.98 },
      { id: 'sd18',date: '2024-05-01', cat: 'Eventos',        desc: 'Colaboradora',       amount: 146.00 },
      { id: 'sd19',date: '2024-05-01', cat: 'Eventos',        desc: 'Cantores',           amount: 100.00 },
      { id: 'sd20',date: '2024-06-01', cat: 'Infraestrutura', desc: 'Aluguel',            amount: 550.00 },
      { id: 'sd21',date: '2024-06-01', cat: 'Alimentos',      desc: 'Bem Brasil',         amount: 81.18 },
      { id: 'sd22',date: '2024-06-01', cat: 'Alimentos',      desc: 'Mercadona',          amount: 170.89 },
      { id: 'sd23',date: '2024-06-01', cat: 'Bebidas',        desc: 'Super Bock',         amount: 482.26 },
      { id: 'sd24',date: '2024-06-01', cat: 'Eventos',        desc: 'Colaboradora',       amount: 146.00 },
      { id: 'sd25',date: '2024-06-01', cat: 'Eventos',        desc: 'Cantores',           amount: 100.00 },
    ];

    const settings = {
      ano: 2026, moeda: 'BRL', mesAtual: 4,
      metaReceita: 20000, limiteGasto: 0.70,
      usdBrl: 5.85, eurBrl: 6.40,
      tema: 'dark',
    };

    return { receitas, despesas, metas, cartoes, contas, ativos, settings };
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

  function init() {
    _data = load();
    if (!_data) {
      _data = buildSeed();
      save(_data);
    }
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
    const before = _data.despesas.length;
    _data.despesas = _data.despesas.filter(d => !cats.includes(d.category));
    if (_data.despesas.length !== before) persist();
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
    const fromReserva = (_data.reserva || []).reduce((sum, r) => {
      return sum + (r.valorAtual || r.valorInvestido || 0);
    }, 0);
    return fromAtivos + fromReserva;
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
    addRecebimentoFuturo, deleteRecebimentoFuturo,
    deleteAtivo, updateAtivo,
    updateSettings,
    receitasByMonth, despesasByMonth,
    sumReceitas, sumDespesas,
    despesasByCategory, yearlyMonthly,
    totalAtivos,
    cleanDespesasByCategory,
    descSuggestions, receitaSuggestions,
  };
})();

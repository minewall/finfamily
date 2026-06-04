// Catálogo de ferramentas que o Haile pode invocar via tool use.
// Schemas no formato Anthropic Tool Use (JSON Schema). Os handlers vivem
// no /web (precisam do useData/Store) — esta camada é só o catálogo +
// tipos compartilhados pra type-safety dos handlers.

export const COACH_TOOLS = [
  {
    name: 'addDespesa',
    description: 'Cria uma nova despesa para o usuário. Use quando o usuário pedir explicitamente para registrar/lançar/criar uma despesa, com valor e descrição claros.',
    input_schema: {
      type: 'object',
      properties: {
        descricao: { type: 'string', description: 'Descrição curta da despesa (ex: Supermercado, Combustível)' },
        valor:     { type: 'number', description: 'Valor em reais, positivo' },
        data:      { type: 'string', description: 'Data no formato YYYY-MM-DD' },
        pessoa:    { type: 'string', description: 'Nome da pessoa responsável (deve estar na lista de PESSOAS do contexto)' },
        categoria: { type: 'string', description: 'Categoria canônica (moradia, alimentacao, transporte, saude, educacao, pets, servicos_profissionais, financeiro, assinaturas, lazer, pessoal, apoio_financeiro)' },
        sub:       { type: 'string', description: 'Sub-categoria (opcional)' },
      },
      required: ['descricao', 'valor', 'data', 'categoria'],
    },
  },
  {
    name: 'updateDespesa',
    description: 'Atualiza campos de uma despesa existente. Use o id que aparece no contexto. Só passa os campos que vai mudar.',
    input_schema: {
      type: 'object',
      properties: {
        id:        { type: 'string', description: 'ID da despesa' },
        descricao: { type: 'string' },
        valor:     { type: 'number' },
        data:      { type: 'string', description: 'YYYY-MM-DD' },
        categoria: { type: 'string' },
        sub:       { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteDespesa',
    description: 'Remove uma despesa permanentemente. Use só quando o usuário confirmar a intenção de excluir.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID da despesa a remover' },
      },
      required: ['id'],
    },
  },
  {
    name: 'addReceita',
    description: 'Cria uma nova receita (entrada de dinheiro). Use quando o usuário pedir para registrar/lançar/criar receita.',
    input_schema: {
      type: 'object',
      properties: {
        descricao: { type: 'string', description: 'Descrição da receita (ex: Salário, Freelance Cliente X)' },
        valor:     { type: 'number', description: 'Valor em reais, positivo' },
        data:      { type: 'string', description: 'Data no formato YYYY-MM-DD' },
        pessoa:    { type: 'string', description: 'Quem recebeu (PESSOAS do contexto)' },
        tipo:      { type: 'string', enum: ['salario','contrato','pensao','emprestimo','outros'], description: 'Tipo de receita' },
      },
      required: ['descricao', 'valor', 'data'],
    },
  },
  {
    name: 'bulkAddDespesas',
    description: 'Cria várias despesas de uma vez. Use SEMPRE ao importar extrato bancário ou fatura — não chame addDespesa em loop. Mostre um resumo antes (quantas por categoria) e peça confirmação.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              descricao: { type: 'string' },
              valor:     { type: 'number', description: 'Valor positivo em reais' },
              data:      { type: 'string', description: 'YYYY-MM-DD' },
              pessoa:    { type: 'string' },
              categoria: { type: 'string' },
              sub:       { type: 'string' },
            },
            required: ['descricao', 'valor', 'data', 'categoria'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'bulkAddReceitas',
    description: 'Cria várias receitas de uma vez. Use ao importar extrato (entradas).',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              descricao: { type: 'string' },
              valor:     { type: 'number' },
              data:      { type: 'string', description: 'YYYY-MM-DD' },
              pessoa:    { type: 'string' },
              tipo:      { type: 'string', enum: ['salario','contrato','pensao','emprestimo','outros'] },
            },
            required: ['descricao', 'valor', 'data'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'queryDespesas',
    description: 'Busca despesas com filtros (mês/ano/categoria/pessoa/texto). Útil pra responder perguntas como "quanto gastei com X" sem inventar números.',
    input_schema: {
      type: 'object',
      properties: {
        month:     { type: 'number', description: 'Mês (1-12). Opcional.' },
        year:      { type: 'number', description: 'Ano (YYYY). Opcional.' },
        categoria: { type: 'string', description: 'Categoria canônica. Opcional.' },
        pessoa:    { type: 'string', description: 'Nome da pessoa. Opcional.' },
        texto:     { type: 'string', description: 'Busca livre na descrição. Opcional.' },
      },
    },
  },
  {
    name: 'addMeta',
    description: 'Cria uma nova meta financeira para o usuário (reserva, sonho, projeto, etc).',
    input_schema: {
      type: 'object',
      properties: {
        label:     { type: 'string', description: 'Nome da meta. Ex: "Casa própria", "Viagem Europa"' },
        target:    { type: 'number', description: 'Valor-alvo em BRL' },
        prazo:     { type: 'string', description: 'Data limite YYYY-MM-DD (opcional)' },
        tipo:      { type: 'string', enum: ['reserva', 'sonho', 'projeto', 'min_receita', 'limite_desp'], description: 'Tipo da meta. Default: sonho.' },
        categoria: { type: 'string', description: 'ID da categoria (opcional, pra metas vinculadas a tipo de despesa)' },
      },
      required: ['label', 'target'],
    },
  },
  {
    name: 'queryReceitas',
    description: 'Consulta receitas do usuário com filtros opcionais. Use pra responder "quanto recebi", "qual foi minha renda no mês" sem inventar números.',
    input_schema: {
      type: 'object',
      properties: {
        year:      { type: 'number', description: 'Ano (YYYY). Opcional.' },
        month:     { type: 'number', minimum: 1, maximum: 12, description: 'Mês (1-12). Opcional.' },
        pessoa:    { type: 'string', description: 'Nome da pessoa. Opcional.' },
        categoria: { type: 'string', description: 'Categoria. Opcional.' },
        texto:     { type: 'string', description: 'Busca textual na descrição. Opcional.' },
      },
    },
  },
  {
    name: 'updateReceita',
    description: 'Atualiza campos de uma receita existente. Use o id que aparece no contexto. Só passa os campos que vai mudar.',
    input_schema: {
      type: 'object',
      properties: {
        id:        { type: 'string', description: 'ID da receita' },
        descricao: { type: 'string' },
        valor:     { type: 'number' },
        data:      { type: 'string', description: 'YYYY-MM-DD' },
        categoria: { type: 'string' },
        sub:       { type: 'string' },
        pessoa:    { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteReceita',
    description: 'Remove uma receita permanentemente. Use só quando o usuário confirmar a intenção de excluir.',
    input_schema: {
      type: 'object',
      properties: {
        id:        { type: 'string', description: 'ID da receita a remover' },
        desc_hint: { type: 'string', description: 'Descrição pra confirmar com o user que é a certa' },
      },
      required: ['id'],
    },
  },
  {
    name: 'getCotacoes',
    description: 'Retorna as cotações atuais de USD, EUR, USDT e BTC em BRL. Refresca automaticamente se estiverem desatualizadas.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
] as const

export type CoachToolName = (typeof COACH_TOOLS)[number]['name']

// Conjunto de tools que NÃO exigem confirmação (read-only — não mutam dados).
export const SKIP_CONFIRM: ReadonlySet<CoachToolName> = new Set([
  'queryDespesas',
  'queryReceitas',
  'getCotacoes',
])

// Labels legíveis pra o card de confirmação.
export const TOOL_LABELS: Record<CoachToolName, { titulo: string; verbo: string }> = {
  addDespesa:      { titulo: 'Nova despesa',         verbo: 'Criar despesa' },
  updateDespesa:   { titulo: 'Editar despesa',       verbo: 'Atualizar despesa' },
  deleteDespesa:   { titulo: 'Excluir despesa',      verbo: 'Excluir despesa' },
  addReceita:      { titulo: 'Nova receita',         verbo: 'Criar receita' },
  bulkAddDespesas: { titulo: 'Importar despesas',    verbo: 'Importar' },
  bulkAddReceitas: { titulo: 'Importar receitas',    verbo: 'Importar' },
  queryDespesas:   { titulo: 'Consulta',             verbo: 'Consultar' },
  addMeta:         { titulo: 'Nova meta',            verbo: 'Criar meta' },
  queryReceitas:   { titulo: 'Consulta de receitas', verbo: 'Consultar' },
  updateReceita:   { titulo: 'Editar receita',       verbo: 'Atualizar receita' },
  deleteReceita:   { titulo: 'Excluir receita',      verbo: 'Excluir receita' },
  getCotacoes:     { titulo: 'Cotações',             verbo: 'Consultar' },
}

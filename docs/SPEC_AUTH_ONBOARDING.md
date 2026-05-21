# Especificação — Auth, Onboarding e Convites (Haile)

> Documento de referência para implementação técnica.
> Última atualização: 2026-05-20
> Status: **aprovado — em implementação**

---

## Índice

0. [Waitlist — Fase Pré-Lançamento](#0-waitlist--fase-pré-lançamento)
1. [Premissas e decisões de produto](#1-premissas-e-decisões-de-produto)
2. [Fluxo de Cadastro](#2-fluxo-de-cadastro)
3. [Fluxo de Login](#3-fluxo-de-login)
4. [Recuperação de Senha](#4-recuperação-de-senha)
5. [Confirmação de E-mail](#5-confirmação-de-e-mail)
6. [Fluxo de Convite Familiar](#6-fluxo-de-convite-familiar)
7. [Onboarding Coach-led](#7-onboarding-coach-led)
8. [Estados e Transições (resumo)](#8-estados-e-transições-resumo)
9. [Edge Cases](#9-edge-cases)
10. [Variáveis Supabase relevantes](#10-variáveis-supabase-relevantes)

---

## 0. Waitlist — Fase Pré-Lançamento

> Esta seção cobre a estratégia de coleta de interesse antes do lançamento oficial.
> Quando o produto for lançado, os leads da waitlist recebem convite personalizado
> e entram no fluxo de cadastro (seção 2A) com dados pré-preenchidos.

### 0A. Formulário de waitlist

**Onde:** página inicial (`index.html`) — CTA "Quero ser avisado" e página `precos.html`.

**Campos coletados:**
- Nome completo *(obrigatório)*
- E-mail *(obrigatório)*
- Perfil de interesse *(opcional — select)*: "Pessoa física", "Casal", "Família com filhos", "Outro"

**Comportamento:**
```
[Usuário preenche o formulário]
        │
        ▼
[Validação básica: e-mail válido, nome não vazio]
        │
        ├─ E-mail já cadastrado na waitlist
        │       └─ Mensagem: "Você já está na lista! Avisaremos quando estiver pronto."
        │
        └─ SUCESSO
                │
                ▼
        [Supabase: insere em tabela `waitlist`]
        [Resend: envia e-mail de confirmação de interesse]
                │
                ▼
        [Tela de confirmação inline]
        "Você está na lista. Avisaremos assim que o Haile estiver disponível."
```

**Tabela Supabase:**
```sql
waitlist (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text unique not null,
  profile      text,          -- 'individual', 'casal', 'familia', 'outro'
  source       text,          -- 'home', 'precos', 'contato', 'indicacao'
  invited_at   timestamptz,   -- preenchido quando o convite de lançamento é enviado
  signup_at    timestamptz,   -- preenchido quando o usuário cria a conta de fato
  created_at   timestamptz default now()
)
```

**E-mail de confirmação de interesse (Resend):**
- Template: `waitlist-confirmacao`
- Assunto: "Você está na lista do Haile"
- Conteúdo: confirma o recebimento, define expectativa, não promete data
- Variáveis: `{{ nome }}`

---

### 0B. Convite de lançamento (quando o produto abrir)

```
[Admin dispara campanha de lançamento]
        │  (via painel admin ou script Supabase)
        ▼
[Para cada registro da waitlist com invited_at IS NULL]
        │
        ▼
[Gera token de convite de lançamento]
  { email, name, token, expires_at: +30 dias, source: 'waitlist' }
        │
        ▼
[Resend: envia e-mail de convite de lançamento]
  Template: `waitlist-lancamento`
  Assunto: "O Haile está pronto — sua vez chegou"
  Link: https://haile.com.br/login.html?invite_token={token}&source=waitlist
        │
        ▼
[Atualiza waitlist: invited_at = now()]
```

**E-mail de lançamento deve:**
- Usar o nome coletado no formulário de waitlist (personalização real)
- Deixar claro que o acesso é exclusivo para quem estava na lista
- Link com validade de 30 dias (vs. 7 dias do convite familiar)
- Não exigir senha antes de clicar — só depois, no cadastro

---

### 0C. Cadastro vindo da waitlist

```
[Usuário clica no link do e-mail de lançamento]
        │  ?invite_token=XXX&source=waitlist
        ▼
[login.html — detecta source=waitlist]
        │
        ▼
[Formulário de cadastro com dados pré-preenchidos]
  Nome: {nome da waitlist} (editável)
  E-mail: {email da waitlist} (readonly)
  Senha: campo vazio (precisa definir)
  [Entrar com Google] (opção disponível)
        │
        ▼
[Supabase: signUp() com metadata: { source: 'waitlist', waitlist_id }]
        │
        └─ SUCESSO → confirmação de e-mail → onboarding (7A)
           [Atualiza waitlist: signup_at = now()]
```

**Vantagens do pré-preenchimento:**
- Onboarding já começa com `answers.nome` populado — step 3 (nome) pode ser pulado ou pré-confirmado
- Coach pode cumprimentar pelo nome desde a primeira mensagem
- Dados de `profile` da waitlist informam o step 4 (familia) com sugestão inicial

---

### 0D. Métricas da waitlist

| Métrica | Como medir |
|---|---|
| Total de inscritos | `COUNT(*) FROM waitlist` |
| Taxa de conversão (lista → conta) | `signup_at IS NOT NULL / total` |
| Tempo médio lista → cadastro | `AVG(signup_at - invited_at)` |
| Origem dos leads | `GROUP BY source` |

---

## 1. Premissas e decisões de produto

| Decisão | Valor |
|---|---|
| Cadastro | Aberto + via convite (convite pré-associa ao grupo familiar) |
| Confirmação de e-mail | Obrigatória antes de acessar o app |
| Métodos de auth | E-mail + senha · Google OAuth (Apple no roadmap) |
| E-mail duplicado | Tela intermediária pergunta ao usuário |
| Onboarding | Coach-led, 7 steps, pausável e retomável |
| Acesso em fase beta | Sem restrição de código (waitlist é só marketing) |

---

## 2. Fluxo de Cadastro

### 2A. Cadastro direto (sem convite)

```
[landing / contato.html]
        │
        ▼
[login.html — aba "Criar conta"]
        │
        ├─ Campos: Nome completo · E-mail · Senha (min 8 chars)
        ├─ CTA Google OAuth → fluxo 2C
        │
        ▼
[Supabase: signUp()]
        │
        ├─ ERRO: e-mail já existe
        │       └─ Mensagem: "Este e-mail já tem uma conta. Faça login."
        │          + link para login
        │
        └─ SUCESSO
                │
                ▼
        [E-mail de confirmação enviado] → fluxo 5
        [Tela: "Confirme seu e-mail"]
        "Enviamos um link para {email}. Clique nele para ativar sua conta."
        [Reenviar link] [Trocar e-mail]
```

### 2B. Cadastro via convite

```
[E-mail de convite recebido]
        │  contém: ?invite_token=XXX&group_id=YYY&inviter_name=ZZZ
        ▼
[login.html?invite_token=XXX]
        │
        ├─ Token válido e não expirado?
        │       │
        │       ├─ SIM → mostra formulário com e-mail pré-preenchido (readonly)
        │       │         "Você foi convidado por {inviter_name} para o grupo familiar."
        │       │         Campos: Nome completo · Senha
        │       │         CTA Google → fluxo 2C (preserva token)
        │       │
        │       └─ NÃO (expirado/inválido) → mensagem de erro
        │                 "Este convite expirou ou já foi usado."
        │                 [Pedir novo convite]
        │
        ▼
[Supabase: signUp() com metadata: { invite_token, group_id }]
        │
        ├─ E-mail já existe → fluxo 2D (e-mail duplicado)
        │
        └─ SUCESSO
                │
                ▼
        [E-mail de confirmação enviado] → fluxo 5
        (após confirmação: associa ao grupo automaticamente)
```

### 2C. Cadastro / Login via Google OAuth

```
[Botão "Entrar com Google"]
        │
        ▼
[Supabase: signInWithOAuth('google')]
        │
        ▼
[Google consent screen]
        │
        ├─ Usuário cancela → volta para login.html
        │
        └─ Autoriza
                │
                ├─ Conta nova → onboarding (pula confirmação de e-mail)
                │   ├─ Se havia invite_token na sessão → fluxo 2D ou associa grupo
                │
                └─ Conta existente → vai direto ao app
```

### 2D. E-mail duplicado (conta + convite no mesmo e-mail)

```
[Tentativa de cadastro com e-mail que já tem conta Haile]
[E convite pendente detectado para este e-mail]
        │
        ▼
[Tela intermediária]
"Encontramos uma conta Haile para este e-mail.
 {inviter_name} também te convidou para o grupo familiar."

Opções:
  [A] "Fazer login e entrar no grupo" → login.html (mantém context do convite)
  [B] "Só fazer login, sem entrar no grupo" → login normal
  [C] "Cancelar"
```

---

## 3. Fluxo de Login

```
[login.html — aba "Entrar"]
        │
        ├─ Campos: E-mail · Senha
        ├─ [Esqueci minha senha] → fluxo 4
        ├─ [Entrar com Google] → fluxo 2C
        │
        ▼
[Supabase: signInWithPassword()]
        │
        ├─ ERRO: credenciais inválidas
        │       └─ "E-mail ou senha incorretos."
        │          (após 5 tentativas: "Muitas tentativas. Aguarde 15 minutos.")
        │
        ├─ ERRO: e-mail não confirmado
        │       └─ "Confirme seu e-mail antes de entrar."
        │          [Reenviar e-mail de confirmação]
        │
        └─ SUCESSO
                │
                ├─ Onboarding incompleto? → retoma onboarding (fluxo 7B)
                ├─ Convite pendente? → tela intermediária fluxo 2D
                └─ Normal → redireciona para /app/app.html
```

---

## 4. Recuperação de Senha

```
[login.html → "Esqueci minha senha"]
        │
        ▼
[Modal / tela: "Recuperar acesso"]
  Campo: E-mail
  [Enviar link de redefinição]
        │
        ▼
[Supabase: resetPasswordForEmail()]
        │
        ├─ E-mail não encontrado
        │       └─ Mesma mensagem de sucesso (segurança — não revela se e-mail existe)
        │
        └─ SUCESSO
                │
                ▼
        [Tela: "Link enviado"]
        "Se este e-mail estiver cadastrado, você receberá
         as instruções em instantes. Verifique também o spam."

        [E-mail de redefinição]
                │ link com token (validade: 1h)
                ▼
        [login.html?type=recovery&token=XXX]
                │
                ▼
        [Modal: "Nova senha"]
          Campo: Nova senha (min 8 chars)
          Campo: Confirmar senha
          [Salvar]
                │
                ├─ Token expirado → "Link expirado. Solicite um novo."
                └─ SUCESSO → login automático → app
```

---

## 5. Confirmação de E-mail

```
[E-mail de confirmação enviado após signUp()]
        │
        ▼
[Tela de espera em login.html]
"Confirme seu e-mail para continuar.
 Enviamos para {email}."
  [Reenviar e-mail]  [Usar outro e-mail]
        │
        │ Usuário clica no link do e-mail
        ▼
[Supabase processa o token]
        │
        ├─ Token expirado (validade: 24h)
        │       └─ Redireciona para login.html com mensagem:
        │          "Link expirado. Faça login para reenviar a confirmação."
        │
        └─ SUCESSO
                │
                ├─ Havia invite_token? → associa ao grupo → onboarding (fluxo 7A)
                └─ Cadastro normal → onboarding (fluxo 7A)
```

**Reenvio de confirmação:**
- Botão disponível na tela de espera e no app (banner) para usuários não confirmados
- Rate limit: máximo 3 reenvios por hora (Supabase padrão)
- Mensagem após reenvio: "Novo link enviado. Verifique também o spam."

---

## 6. Fluxo de Convite Familiar

### 6A. Envio do convite (pelo membro do grupo)

```
[App → Família → Convidar membro]
        │
        ▼
[Modal de convite]
  Campo: E-mail do convidado
  Campo: Nome (opcional, para personalizar o e-mail)
  Seleção: Papel no grupo (ex: Cônjuge, Filho, Outro)
  [Enviar convite]
        │
        ▼
[Verificação: e-mail já é membro deste grupo?]
  └─ SIM → "Este e-mail já faz parte do seu grupo."

[Verificação: convite pendente para este e-mail neste grupo?]
  └─ SIM → "Já existe um convite pendente para este e-mail."
            [Reenviar convite]

[Supabase: insere registro em group_invites]
  { group_id, inviter_id, email, role, token, expires_at (+7 dias), status: 'pending' }
        │
        └─ [E-mail de convite enviado via Resend]
           Assunto: "{inviter_name} te convidou para o Haile"
           Link: https://haile.com.br/login.html?invite_token={token}
           [Aceitar convite]
```

### 6B. Recepção do convite

```
[Usuário clica no link do e-mail]
        │
        ▼
[login.html?invite_token=TOKEN]
        │
        ├─ Token expirado (> 7 dias)
        │       └─ "Este convite expirou. Peça ao administrador do grupo um novo convite."
        │
        ├─ Token já usado
        │       └─ "Este convite já foi aceito. Faça login para acessar o grupo."
        │
        └─ Token válido
                │
                ├─ Usuário tem conta? → login (após login: associa ao grupo)
                └─ Usuário sem conta → cadastro (fluxo 2B)
```

### 6C. Cancelamento de convite

- Administrador do grupo pode cancelar convites pendentes
- Ao cancelar: token é invalidado no banco
- Se o usuário clicar no link após cancelamento: mensagem de token inválido

---

## 7. Onboarding Coach-led

### 7A. Primeira vez (conta nova)

```
[Conta confirmada / OAuth sem conta prévia]
        │
        ▼
[Store.createOnboardingGoal()]
  Cria meta "Configurar meu Haile" (system: true, 7 steps)
        │
        ▼
[App carrega → onboarding.completed === false]
        │
        ▼
[Modal de onboarding — tela cheia, não pode fechar]
  Step 1/7 — apresentacao
  Step 2/7 — personalidade  ← escolha de tom do Coach
  Step 3/7 — nome           ← nome e avatar
  Step 4/7 — familia        ← estrutura familiar
  Step 5/7 — situacao       ← situação financeira atual
  Step 6/7 — objetivo       ← meta principal
  Step 7/7 — primeira_acao  ← primeiro lançamento ou meta juntos
        │
        ▼
[Store.completeOnboarding()]
  onboarding.completed = true
  _markAllOnboardingStepsCompleted()
  Meta "Configurar meu Haile" → 100% concluída
        │
        ▼
[App — Dashboard com primeiro Recado do Coach celebrativo]
```

### 7B. Retomada (onboarding pausado)

```
[Login de usuário com onboarding.completed === false]
        │
        ▼
[Verifica onboarding.pausedAtStep]
        │
        ├─ pausedAtStep === 0 → começa do início
        │
        └─ pausedAtStep > 0
                │
                ▼
        [Coach: "Que bom que você voltou! Vamos continuar de onde paramos?"]
        [Continuar]  [Fazer depois]
                │
                ├─ "Fazer depois" → entra no app com banner persistente
                │   "Complete sua configuração para aproveitar o Haile ao máximo."
                │   [Continuar agora]
                │
                └─ "Continuar" → abre modal no step pausado
```

### 7C. Pausa durante o onboarding

- O usuário **não pode fechar** o modal na primeira execução (steps 1-3 obrigatórios)
- A partir do step 4, aparece link discreto: "Continuar depois"
- Ao pausar: `Store.pauseOnboarding(stepIndex, partialAnswers)`
- Banner persiste no app até conclusão
- Coach envia Recado de lembrete após 24h sem concluir (`lastReminderAt`)

### 7D. Usuário convidado (já tem grupo)

```
[Cadastro via convite concluído]
        │
        ▼
[Onboarding adaptado]
  Step 1 — apresentacao: menciona o grupo de {inviter_name}
  Step 2 — personalidade
  Step 3 — nome/avatar
  ─── pula steps 4 (familia) e 5 (situacao) ──
  (grupo já existe, dados financeiros compartilhados)
  Step 4' — primeira_acao: Coach apresenta o grupo e sugere primeiro lançamento
```

---

## 8. Estados e Transições (resumo)

```
[sem conta]
    │ signUp()
    ▼
[conta_pendente]  ← aguarda confirmação de e-mail
    │ confirmação OK
    ▼
[conta_ativa_sem_onboarding]
    │ completeOnboarding()
    ▼
[conta_ativa]
    │ (normal use)
    ▼
[conta_ativa]

Estados especiais:
  conta_pendente + invite_token → após confirmação: vai para conta_ativa_sem_onboarding (adaptado)
  conta_ativa + invite_token → tela intermediária fluxo 2D
```

---

## 9. Edge Cases

| Situação | Comportamento |
|---|---|
| Usuário fecha o browser no meio do cadastro | Sessão perdida; e-mail de confirmação ainda válido por 24h |
| Link de confirmação acessado em outro dispositivo | Funciona normalmente; sessão aberta no novo dispositivo |
| Google OAuth com e-mail que já tem conta senha | Supabase vincula automaticamente (mesmo e-mail = mesma conta) |
| Convite para e-mail de conta Google OAuth | Token válido; ao fazer OAuth, associa ao grupo |
| Convite expirado (> 7 dias) | Informa e orienta a pedir novo convite |
| Membro tenta convidar a si mesmo | Validação no front: "Você não pode se convidar." |
| Membro remove outro membro com onboarding pendente | Convite invalidado; próximo login: grupo não aparece |
| Usuário troca e-mail após cadastro (futuro) | Re-confirmação necessária; convites pendentes no e-mail antigo: inválidos |
| Senha esquecida + conta Google OAuth | Tela: "Esta conta usa login com Google. Acesse pelo botão Google." |
| Múltiplos convites para o mesmo e-mail (grupos diferentes) | Cada token é independente; usuário decide por qual grupo entrar |

---

## 10. Variáveis Supabase relevantes

```sql
-- Tabela de convites familiares
group_invites (
  id           uuid primary key,
  group_id     uuid references groups(id),
  inviter_id   uuid references auth.users(id),
  email        text not null,
  role         text,                    -- 'conjuge', 'filho', 'outro'
  token        text unique not null,
  status       text default 'pending',  -- 'pending', 'accepted', 'cancelled'
  expires_at   timestamptz,             -- now() + 7 days
  created_at   timestamptz default now()
)

-- Metadata do usuário (auth.users.raw_user_meta_data)
{
  "full_name": "...",
  "invite_token": "...",   -- presente se veio de convite
  "group_id": "..."        -- grupo a associar após confirmação
}
```

**E-mails transacionais (Resend):**

| Trigger | Template | Variáveis |
|---|---|---|
| signUp() | `confirmacao-email` | `{{ nome }}`, `{{ link }}` |
| resetPasswordForEmail() | `recuperacao-senha` | `{{ link }}` |
| Convite familiar | `convite-familiar` | `{{ inviter_name }}`, `{{ link }}`, `{{ expires_days }}` |
| Lembrete onboarding (24h) | `lembrete-onboarding` | `{{ nome }}`, `{{ step }}` |
| Inscrição na waitlist | `waitlist-confirmacao` | `{{ nome }}` |
| Convite de lançamento | `waitlist-lancamento` | `{{ nome }}`, `{{ link }}`, `{{ expires_days }}` |

---

*Para implementação técnica: ver `app/js/store.js` (onboarding) e `app/js/supabase-client.js` (auth).*

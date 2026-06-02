# Asaas Sandbox — Setup operacional

Documento de setup do gateway de pagamento Asaas (ambiente **sandbox**) do Haile.

Stack: 2 edge functions (`asaas-create-checkout`, `asaas-webhook`) + tabelas
`subscriptions` (já existente, estendida), `invoices`, `payment_events`.

## 1. Secrets no Supabase

Dashboard → Project Settings → Edge Functions → Secrets. Adicionar:

| Secret | Valor | Notas |
|---|---|---|
| `ASAAS_BASE_URL` | `https://sandbox.asaas.com/api/v3` | Em produção: `https://api.asaas.com/v3` |
| `ASAAS_API_KEY` | API key do sandbox Asaas | Painel Asaas sandbox → Integrações → Chaves de API |
| `ASAAS_WEBHOOK_TOKEN` | UUID v4 gerado por você (ex: `uuidgen`) | É o token estático que o Asaas vai enviar no header `asaas-access-token` |

Não comitar valores reais — `.env.example` em cada função documenta os nomes.

## 2. Webhook no painel Asaas

Painel Asaas sandbox → Configurações → Integrações → **Webhooks** → Adicionar:

- **URL**: `https://lpudgulhnfuwdttetwdn.supabase.co/functions/v1/asaas-webhook`
- **Email para notificações de falha**: oi@haile.com.br (ou similar)
- **Versão da API**: v3
- **Token de autenticação**: cole o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
- **Tipo de envio**: SEQUENCIAL (recomendado p/ idempotência)
- **Habilitado**: SIM

### Eventos a habilitar

Mínimo necessário para o fluxo atual:

- `PAYMENT_CREATED`
- `PAYMENT_UPDATED`
- `PAYMENT_CONFIRMED`
- `PAYMENT_RECEIVED`
- `PAYMENT_OVERDUE`
- `PAYMENT_REFUNDED`
- `PAYMENT_DELETED`
- `PAYMENT_CHARGEBACK_REQUESTED`
- `SUBSCRIPTION_INACTIVATED`
- `SUBSCRIPTION_DELETED`

Eventos extras (não tratados, mas registrados em `payment_events` p/ debug):
qualquer outro `PAYMENT_*` ou `SUBSCRIPTION_*`.

## 3. Fluxo end-to-end no sandbox

### A. Criar assinatura

```bash
curl -X POST \
  "https://lpudgulhnfuwdttetwdn.supabase.co/functions/v1/asaas-create-checkout" \
  -H "Authorization: Bearer <JWT_DO_USER>" \
  -H "Content-Type: application/json" \
  -d '{"planId": "base_monthly"}'
```

Retorno esperado:
```json
{
  "alreadyExists": false,
  "asaasSubscriptionId": "sub_xxx",
  "asaasCustomerId": "cus_xxx",
  "checkoutUrl": "https://sandbox.asaas.com/i/...",
  "bankSlipUrl": null,
  "firstPaymentId": "pay_xxx",
  "status": "pending"
}
```

### B. Pagar no checkout (sandbox)

Abrir `checkoutUrl` no navegador → tela hospedada do Asaas. Métodos sandbox:
- **PIX**: simulável via painel Asaas → Cobranças → "Simular recebimento"
- **Cartão de crédito**: usar cartão de teste documentado pelo Asaas
- **Boleto**: simulável via painel Asaas

### C. Verificar webhook

Após pagamento simulado, Asaas dispara `PAYMENT_CONFIRMED` → webhook do Haile:

1. Insere row em `payment_events` com `processed_at != null`.
2. Faz upsert em `invoices` com `status='paid'`.
3. Atualiza `subscriptions.status='active'`, calcula `current_period_*`.

Conferir via SQL:
```sql
select id, event, processed_at, process_error
from payment_events
order by created_at desc limit 5;

select asaas_payment_id, status, billing_type, amount_cents, paid_at
from invoices
order by created_at desc limit 5;

select user_id, status, asaas_subscription_id, current_period_end
from subscriptions
where user_id = '<user-id>';
```

### D. Testar idempotência

Reenviar o mesmo webhook (botão "Reenviar" no painel Asaas) → response deve
ser `{ received: true, duplicate: true }` e nenhuma row duplicada em `invoices`.

## 4. Estados de `subscriptions`

| Status     | Origem                          |
|------------|----------------------------------|
| `trial`    | default na criação (21d)         |
| `active`   | webhook `PAYMENT_CONFIRMED/RECEIVED` |
| `past_due` | webhook `PAYMENT_OVERDUE`        |
| `cancelled`| webhook `SUBSCRIPTION_*`         |
| `expired`  | (cron futuro — trial expirou sem pagamento) |

## 5. Pendências

- [ ] Frontend `/app/assinatura` consumindo `asaas-create-checkout`.
- [ ] Cron de transição `trial → expired` quando passou `trial_end_at` sem pagamento.
- [ ] Cron de lembrete (14/18/20 dias de trial) — `app_settings.trial_reminder_days`.
- [ ] Trocar `ASAAS_BASE_URL` + `ASAAS_API_KEY` quando subir pra produção.
- [ ] Cadastrar webhook em produção com nova URL/token.

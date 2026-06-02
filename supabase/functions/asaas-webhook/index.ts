// asaas-webhook
// Endpoint público para receber webhooks do Asaas. Auth por token estático
// no header `asaas-access-token` (configurado no painel Asaas).
//
// Idempotência:
//  - payload.id do Asaas vai em payment_events.asaas_event_id (UNIQUE).
//  - Se já está gravado → 200 OK sem reprocessar.
//  - Erro de processamento NÃO retorna 5xx: registra process_error e
//    devolve 200 pra Asaas parar de bombardear retries (debug via tabela).
//
// Mapeamento user_id: payload.payment.subscription (asaas) corresponde a
// subscriptions.asaas_subscription_id. payload.payment.externalReference
// é subscriptions.id (mandado por nós no create-checkout). Fallback dos
// dois caminhos pra ser robusto contra eventos antigos.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface AsaasPaymentPayload {
  id: string;
  customer?: string;
  subscription?: string;
  externalReference?: string;
  value?: number;
  netValue?: number;
  billingType?: string;
  status?: string;
  dueDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  description?: string;
}

interface AsaasSubscriptionPayload {
  id: string;
  externalReference?: string;
  customer?: string;
  status?: string;
  nextDueDate?: string;
  cycle?: string;
}

interface AsaasWebhookBody {
  id?: string;
  event?: string;
  dateCreated?: string;
  payment?: AsaasPaymentPayload;
  subscription?: AsaasSubscriptionPayload;
  pix?: { encodedImage?: string; payload?: string };
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  status: string;
  asaas_subscription_id: string | null;
  billing_cycle: string | null;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Resolve subscription local a partir do payload do Asaas.
// Prioridade: externalReference (= subscriptions.id) → asaas_subscription_id.
async function resolveLocalSubscription(
  admin: SupabaseClient,
  payment?: AsaasPaymentPayload,
  subscription?: AsaasSubscriptionPayload,
): Promise<SubscriptionRow | null> {
  const externalRef = payment?.externalReference || subscription?.externalReference;
  const asaasSubId  = payment?.subscription || subscription?.id;

  if (externalRef) {
    const { data } = await admin
      .from('subscriptions')
      .select('id, user_id, status, asaas_subscription_id, billing_cycle')
      .eq('id', externalRef)
      .maybeSingle<SubscriptionRow>();
    if (data) return data;
  }
  if (asaasSubId) {
    const { data } = await admin
      .from('subscriptions')
      .select('id, user_id, status, asaas_subscription_id, billing_cycle')
      .eq('asaas_subscription_id', asaasSubId)
      .maybeSingle<SubscriptionRow>();
    if (data) return data;
  }
  return null;
}

function mapPaymentStatusToInvoice(asaasStatus: string | undefined, event: string): string {
  // Asaas usa: PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, REFUND_REQUESTED,
  //            CHARGEBACK_REQUESTED, CHARGEBACK_DISPUTE, AWAITING_CHARGEBACK_REVERSAL,
  //            DUNNING_REQUESTED, DUNNING_RECEIVED, AWAITING_RISK_ANALYSIS, DELETED
  const ev = event.toUpperCase();
  if (ev.includes('CONFIRMED') || ev.includes('RECEIVED')) return 'paid';
  if (ev.includes('OVERDUE')) return 'overdue';
  if (ev.includes('REFUND')) return 'refunded';
  if (ev.includes('DELETED') || ev === 'PAYMENT_DELETED') return 'canceled';
  if (ev.includes('FAIL') || ev.includes('CHARGEBACK')) return 'failed';
  if (ev.includes('CREATED') || ev.includes('UPDATED') || ev.includes('AWAITING')) return 'pending';

  switch ((asaasStatus || '').toUpperCase()) {
    case 'RECEIVED':
    case 'CONFIRMED': return 'paid';
    case 'OVERDUE':   return 'overdue';
    case 'REFUNDED':  return 'refunded';
    case 'DELETED':   return 'canceled';
    default:          return 'pending';
  }
}

async function upsertInvoice(
  admin: SupabaseClient,
  sub: SubscriptionRow | null,
  userId: string | null,
  payment: AsaasPaymentPayload,
  event: string,
  pix: { encodedImage?: string; payload?: string } | undefined,
): Promise<void> {
  if (!payment?.id || !userId) return;
  const status = mapPaymentStatusToInvoice(payment.status, event);
  const amountCents = Math.round(((payment.value ?? 0) * 100));
  const netCents = payment.netValue != null ? Math.round(payment.netValue * 100) : null;
  const paidAt = (status === 'paid')
    ? (payment.clientPaymentDate || payment.paymentDate || new Date().toISOString())
    : null;

  const row: Record<string, unknown> = {
    user_id: userId,
    subscription_id: sub?.id ?? null,
    asaas_payment_id: payment.id,
    asaas_subscription_id: payment.subscription ?? sub?.asaas_subscription_id ?? null,
    amount_cents: amountCents,
    net_amount_cents: netCents,
    status,
    billing_type: payment.billingType ?? null,
    due_date: payment.dueDate ?? null,
    paid_at: paidAt,
    invoice_url: payment.invoiceUrl ?? null,
    bank_slip_url: payment.bankSlipUrl ?? null,
    pix_qr_code: pix?.encodedImage ?? null,
    pix_payload: pix?.payload ?? null,
    description: payment.description ?? null,
  };

  // upsert via onConflict no UNIQUE asaas_payment_id
  const { error } = await admin
    .from('invoices')
    .upsert(row, { onConflict: 'asaas_payment_id' });
  if (error) throw new Error(`upsert invoice: ${error.message}`);
}

// Avança state machine de subscriptions a partir do evento.
async function advanceSubscription(
  admin: SupabaseClient,
  sub: SubscriptionRow,
  event: string,
  payment?: AsaasPaymentPayload,
  asaasSub?: AsaasSubscriptionPayload,
): Promise<void> {
  const ev = event.toUpperCase();
  const patch: Record<string, unknown> = {};

  if (ev === 'PAYMENT_CONFIRMED' || ev === 'PAYMENT_RECEIVED') {
    patch.status = 'active';
    // Define janela do período a partir do pagamento.
    const paid = payment?.clientPaymentDate || payment?.paymentDate;
    if (paid) {
      patch.current_period_start = new Date(paid).toISOString();
      const end = new Date(paid);
      if (sub.billing_cycle === 'annual') end.setUTCFullYear(end.getUTCFullYear() + 1);
      else end.setUTCMonth(end.getUTCMonth() + 1);
      patch.current_period_end = end.toISOString();
    }
    if (payment?.dueDate) patch.next_due_date = payment.dueDate;
  } else if (ev === 'PAYMENT_OVERDUE') {
    patch.status = 'past_due';
  } else if (ev === 'SUBSCRIPTION_INACTIVATED' || ev === 'SUBSCRIPTION_DELETED') {
    patch.status = 'cancelled';
    patch.cancelled_at = new Date().toISOString();
  }

  if (asaasSub?.nextDueDate) patch.next_due_date = asaasSub.nextDueDate;

  if (Object.keys(patch).length === 0) return;
  const { error } = await admin
    .from('subscriptions')
    .update(patch)
    .eq('id', sub.id);
  if (error) throw new Error(`update subscription: ${error.message}`);
}

serve(async (req) => {
  // Asaas chama POST. Bloqueia o resto, mas devolve 200 em GET pra ping/health no painel.
  if (req.method === 'GET') return json(200, { ok: true, service: 'asaas-webhook' });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_KEY  = Deno.env.get('SERVICE_ROLE_KEY');
  const TOKEN        = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
  if (!SUPABASE_URL || !SERVICE_KEY || !TOKEN) {
    console.error('[asaas-webhook] config: env ausente');
    return json(500, { error: 'config' });
  }

  // ── Auth: token estático no header ──
  const incoming = req.headers.get('asaas-access-token') || '';
  if (incoming !== TOKEN) {
    console.warn('[asaas-webhook] token inválido');
    return json(401, { error: 'unauthorized' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let body: AsaasWebhookBody;
  try { body = await req.json(); }
  catch { return json(400, { error: 'invalid_json' }); }

  const event = (body?.event || '').toUpperCase();
  if (!event) return json(400, { error: 'event_missing' });

  // ── Idempotência: persiste event row ANTES de processar ──
  // asaas_event_id = body.id (estável por entrega). Se duplicado, retorna 200.
  const asaasEventId = body?.id || null;
  let eventRowId: string | null = null;

  if (asaasEventId) {
    const { data: existing } = await admin
      .from('payment_events')
      .select('id, processed_at')
      .eq('asaas_event_id', asaasEventId)
      .maybeSingle<{ id: string; processed_at: string | null }>();
    if (existing?.processed_at) {
      return json(200, { received: true, duplicate: true });
    }
    if (existing) {
      eventRowId = existing.id;
    }
  }

  const sub = await resolveLocalSubscription(admin, body.payment, body.subscription);
  const userId = sub?.user_id ?? null;

  if (!eventRowId) {
    const { data: inserted, error: insErr } = await admin
      .from('payment_events')
      .insert({
        asaas_event_id: asaasEventId,
        event,
        user_id: userId,
        asaas_payment_id: body.payment?.id ?? null,
        asaas_subscription_id: body.payment?.subscription ?? body.subscription?.id ?? null,
        payload: body,
      })
      .select('id')
      .single<{ id: string }>();
    if (insErr) {
      // 23505 = unique violation → outra entrega ganhou a corrida; trata como dup.
      const code = (insErr as { code?: string }).code;
      if (code === '23505') {
        return json(200, { received: true, duplicate: true });
      }
      console.error('[asaas-webhook] insert event:', insErr);
      return json(200, { received: true, persisted: false });
    }
    eventRowId = inserted.id;
  }

  // ── Processamento ──
  try {
    if (body.payment && userId) {
      await upsertInvoice(admin, sub, userId, body.payment, event, body.pix);
    }
    if (sub) {
      await advanceSubscription(admin, sub, event, body.payment, body.subscription);
    }

    await admin
      .from('payment_events')
      .update({ processed_at: new Date().toISOString(), process_error: null })
      .eq('id', eventRowId);

    return json(200, { received: true, processed: true });
  } catch (e) {
    const msg = (e as Error).message || 'erro';
    console.error('[asaas-webhook] processing error:', msg);
    await admin
      .from('payment_events')
      .update({ process_error: msg })
      .eq('id', eventRowId);
    // 200 propositalmente: Asaas não reenviará; debug via tabela.
    return json(200, { received: true, processed: false, error: msg });
  }
});

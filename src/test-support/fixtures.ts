/**
 * Fixtures shared by this package's tests and — via the published `dist` — by
 * payzeno-api's and payzeno-console's test suites.
 *
 * `everyEventType()` is the important one. It returns one structurally valid
 * envelope per member of `EVENT_TYPES`, which is what lets `events.test.ts`
 * assert EXHAUSTIVENESS rather than spot-check five types and hope. A consumer
 * test that loops this catches a new event type on the day it lands, which is
 * the only day it is cheap to handle.
 */

import type { CurrencyCode, Money } from '../index';
import { EVENT_TYPES, EVENT_SCHEMA_VERSIONS } from '../events';
import type { EventEnvelope, EventType, PayzenoEvent } from '../events';

const MERCHANT_ID = 'mch_01HQ8Z3K9X4M2N7P6R5T1V0W8Y';
const CHARGE_ID = 'ch_01HQ8Z3K9X4M2N7P6R5T1V0W91';
const PAYMENT_INTENT_ID = 'pi_01HQ8Z3K9X4M2N7P6R5T1V0W92';
const BANK_ACCOUNT_ID = 'ba_01HQ8Z3K9X4M2N7P6R5T1V0W98';
const DISPUTE_ID = 'dp_01HQ8Z3K9X4M2N7P6R5T1V0W9A';

const OCCURRED_AT = '2026-04-29T02:14:07.412Z';
const VALUE_DATE = '2026-04-29';

function sourceFor(type: EventType): EventEnvelope<string, unknown>['source'] {
  if (type === 'invoice.issued') {
    return 'payzeno-billing-legacy';
  }
  if (
    type.startsWith('settlement.') ||
    type.startsWith('payout.') ||
    type.startsWith('ledger.')
  ) {
    return 'payzeno-ledger';
  }
  return 'payzeno-api';
}

/**
 * One valid envelope per member of `EVENT_TYPES`, in `EVENT_TYPES` order.
 *
 * The payloads are minimal-but-real: every required field is present with a
 * plausible value, because a consumer test that deserialises these is testing
 * its own parser, not ours.
 */
function buildEvent(type: EventType): PayzenoEvent {
  switch (type) {
    case 'payment.authorized':
      return sampleEnvelope(type, {
        charge_id: CHARGE_ID,
        payment_intent_id: PAYMENT_INTENT_ID,
        merchant_id: MERCHANT_ID,
        amount_minor: 4999,
        currency: 'USD' as CurrencyCode,
        capture_method: 'automatic' as const,
        capture_at_settlement: false,
        card_brand: 'visa' as const,
        card_last_four: '4242',
        authorization_code: 'A31X7Q',
        network_transaction_id: 'ntx_9931',
        reserve_bps: 0,
        processor_reference: 'wf-8837211',
        acquirer: 'worldflow' as const,
        risk_score: 12,
        authorized_at: OCCURRED_AT,
      });

    case 'payment.captured':
      return sampleEnvelope(type, {
        charge_id: CHARGE_ID,
        payment_intent_id: PAYMENT_INTENT_ID,
        merchant_id: MERCHANT_ID,
        captured_amount_minor: 4999,
        authorized_amount_minor: 4999,
        currency: 'USD' as CurrencyCode,
        captured_at: OCCURRED_AT,
      });

    case 'payment.failed':
      return sampleEnvelope(type, {
        charge_id: null,
        payment_intent_id: PAYMENT_INTENT_ID,
        merchant_id: MERCHANT_ID,
        amount_minor: 4999,
        currency: 'USD' as CurrencyCode,
        failure_code: 'do_not_honor' as const,
        failure_message: 'issuer declined',
        retryable: false,
        failed_at: OCCURRED_AT,
      });

    case 'payment.canceled':
      return sampleEnvelope(type, {
        payment_intent_id: PAYMENT_INTENT_ID,
        charge_id: CHARGE_ID,
        merchant_id: MERCHANT_ID,
        released_amount_minor: 4999,
        currency: 'USD' as CurrencyCode,
        cancellation_reason: 'abandoned',
        canceled_at: OCCURRED_AT,
      });

    case 'refund.created':
      return sampleEnvelope(type, {
        refund_id: REFUND_ID,
        charge_id: CHARGE_ID,
        merchant_id: MERCHANT_ID,
        amount_minor: 1000,
        currency: 'USD' as CurrencyCode,
        reason: 'requested_by_customer',
        nets_against_settlement: true,
        created_at: OCCURRED_AT,
      });

    case 'refund.succeeded':
      return sampleEnvelope(type, {
        refund_id: REFUND_ID,
        charge_id: CHARGE_ID,
        merchant_id: MERCHANT_ID,
        amount_minor: 1000,
        currency: 'USD' as CurrencyCode,
        succeeded_at: OCCURRED_AT,
      });

    case 'refund.failed':
      return sampleEnvelope(type, {
        refund_id: REFUND_ID,
        charge_id: CHARGE_ID,
        merchant_id: MERCHANT_ID,
        amount_minor: 1000,
        currency: 'USD' as CurrencyCode,
        failure_reason: 'acquirer rejected',
        failed_at: OCCURRED_AT,
      });

    case 'dispute.opened':
      return sampleEnvelope(type, {
        dispute_id: DISPUTE_ID,
        charge_id: CHARGE_ID,
        merchant_id: MERCHANT_ID,
        amount_minor: 4999,
        fee_minor: 1500,
        currency: 'USD' as CurrencyCode,
        reason: 'fraudulent' as const,
        network_reason_code: '10.4',
        evidence_due_by: OCCURRED_AT,
        opened_at: OCCURRED_AT,
      });

    case 'dispute.evidence_submitted':
      return sampleEnvelope(type, {
        dispute_id: DISPUTE_ID,
        merchant_id: MERCHANT_ID,
        submitted_at: OCCURRED_AT,
        evidence_field_count: 4,
      });

    case 'dispute.closed':
      return sampleEnvelope(type, {
        dispute_id: DISPUTE_ID,
        charge_id: CHARGE_ID,
        merchant_id: MERCHANT_ID,
        amount_minor: 4999,
        currency: 'USD' as CurrencyCode,
        outcome: 'won' as const,
        reversal_transaction_id: TRANSACTION_ID,
        closed_at: OCCURRED_AT,
      });

    case 'settlement.batch_closed':
      return sampleEnvelope(type, {
        batch_id: BATCH_ID,
        acquirer: 'worldflow' as const,
        currency: 'USD' as CurrencyCode,
        processing_date: VALUE_DATE,
        item_count: 1204,
        expected_total_minor: 90_112_400,
        closed_at: OCCURRED_AT,
      });

    case 'settlement.item_settled':
      return sampleEnvelope(type, {
        item_id: ITEM_ID,
        batch_id: BATCH_ID,
        charge_id: CHARGE_ID,
        merchant_id: MERCHANT_ID,
        gross_minor: 4999,
        fee_minor: 145,
        net_minor: 4854,
        currency: 'USD' as CurrencyCode,
        transaction_id: TRANSACTION_ID,
        attempt_count: 1,
        settled_at: OCCURRED_AT,
      });

    case 'settlement.completed':
      return sampleEnvelope(type, {
        batch_id: BATCH_ID,
        run_id: RUN_ID,
        acquirer: 'worldflow' as const,
        currency: 'USD' as CurrencyCode,
        processing_date: VALUE_DATE,
        items_total: 1204,
        items_settled: 1200,
        items_failed: 4,
        posted_total_minor: 90_112_400,
        fee_total_minor: 2_614_260,
        net_total_minor: 87_498_140,
        settled_charge_ids: [CHARGE_ID],
        chunk_index: 0,
        chunk_count: 1,
        completed_at: OCCURRED_AT,
      });

    case 'settlement.reconciliation_failed':
      return sampleEnvelope(type, {
        batch_id: BATCH_ID,
        run_id: RUN_ID,
        items_failed: 4,
        items_orphaned: 2,
        error_summary: 'acquirer file truncated at line 1198',
        failed_at: OCCURRED_AT,
      });

    case 'settlement.duplicate_detected':
      return sampleEnvelope(type, {
        batch_id: BATCH_ID,
        item_id: ITEM_ID,
        charge_id: CHARGE_ID,
        merchant_id: MERCHANT_ID,
        idempotency_key: `settle:${BATCH_ID}:${ITEM_ID}`,
        existing_transaction_id: TRANSACTION_ID,
        detected_by: 'retry_scheduler' as const,
        amount_minor: 4999,
        currency: 'USD' as CurrencyCode,
        detected_at: OCCURRED_AT,
      });

    case 'settlement.variance_detected':
      return sampleEnvelope(type, {
        batch_id: BATCH_ID,
        item_id: ITEM_ID,
        charge_id: CHARGE_ID,
        merchant_id: MERCHANT_ID,
        line_type: 'sale',
        expected_gross_minor: 4999,
        actual_gross_minor: 4899,
        variance_minor: -100,
        tolerance_minor: 50,
        currency: 'USD' as CurrencyCode,
        detected_at: OCCURRED_AT,
      });

    case 'settlement.funded':
      return sampleEnvelope(type, {
        batch_id: BATCH_ID,
        funding_event_id: 'fe_01HQ8Z3K9X4M2N7P6R5T1V0W9B',
        acquirer: 'worldflow' as const,
        currency: 'USD' as CurrencyCode,
        expected_total_minor: 90_112_400,
        funded_amount_minor: 90_112_400,
        variance_minor: 0,
        bank_reference: 'WF-CR-4471',
        value_date: VALUE_DATE,
        transaction_id: TRANSACTION_ID,
        funded_at: OCCURRED_AT,
      });

    case 'payout.scheduled':
      return sampleEnvelope(type, {
        payout_id: PAYOUT_ID,
        merchant_id: MERCHANT_ID,
        bank_account_id: BANK_ACCOUNT_ID,
        amount_minor: 87_498_140,
        currency: 'USD' as CurrencyCode,
        method: 'standard_ach' as const,
        available_on: VALUE_DATE,
        scheduled_at: OCCURRED_AT,
      });

    case 'payout.paid':
      return sampleEnvelope(type, {
        payout_id: PAYOUT_ID,
        merchant_id: MERCHANT_ID,
        amount_minor: 87_498_140,
        currency: 'USD' as CurrencyCode,
        ledger_transaction_id: TRANSACTION_ID,
        paid_at: OCCURRED_AT,
      });

    case 'payout.failed':
      return sampleEnvelope(type, {
        payout_id: PAYOUT_ID,
        merchant_id: MERCHANT_ID,
        bank_account_id: BANK_ACCOUNT_ID,
        amount_minor: 87_498_140,
        currency: 'USD' as CurrencyCode,
        failure_code: 'account_closed' as const,
        failure_message: 'R02 account closed',
        reversal_transaction_id: TRANSACTION_ID,
        requires_merchant_action: true,
        retry_scheduled_for: null,
        failed_at: OCCURRED_AT,
      });

    case 'payout.returned':
      return sampleEnvelope(type, {
        payout_id: PAYOUT_ID,
        merchant_id: MERCHANT_ID,
        amount_minor: 87_498_140,
        currency: 'USD' as CurrencyCode,
        return_code: 'R01',
        reversal_transaction_id: TRANSACTION_ID,
        returned_at: OCCURRED_AT,
      });

    case 'ledger.transaction_posted':
      return sampleEnvelope(type, {
        transaction_id: TRANSACTION_ID,
        idempotency_key: `capture:${CHARGE_ID}:`,
        purpose: 'capture',
        merchant_id: MERCHANT_ID,
        currency: 'USD' as CurrencyCode,
        reference_type: 'charge',
        reference_id: CHARGE_ID,
        total_minor: 4999,
        entry_count: 4,
        posted_at: OCCURRED_AT,
      });

    case 'ledger.imbalance_detected':
      return sampleEnvelope(type, {
        check: 'trial_balance' as const,
        merchant_id: null,
        currency: 'USD' as CurrencyCode,
        expected_minor: 0,
        actual_minor: 1,
        delta_minor: 1,
        sample_transaction_ids: [TRANSACTION_ID],
        detected_at: OCCURRED_AT,
      });

    case 'merchant.created':
      return sampleEnvelope(type, {
        merchant_id: MERCHANT_ID,
        legal_name: 'Northwind Trading Ltd',
        display_name: 'Northwind',
        country: 'US',
        default_currency: 'USD' as CurrencyCode,
        mcc: '5734',
        status: 'active' as const,
        risk_tier: 'standard',
        payout_schedule: 'daily',
        pricing_model: 'blended',
        reserve_bps: 0,
        reserve_hold_days: 0,
        payout_delay_days: 2,
        settlement_tolerance_minor: 50,
        capture_at_settlement: false,
        platform_fee_bps: 290,
        platform_fee_fixed_minor: 30,
        created_at: OCCURRED_AT,
      });

    case 'merchant.updated':
      return sampleEnvelope(type, {
        merchant_id: MERCHANT_ID,
        display_name: 'Northwind',
        status: 'active' as const,
        risk_tier: 'standard',
        payout_schedule: 'daily',
        pricing_model: 'blended',
        reserve_bps: 0,
        reserve_hold_days: 0,
        payout_delay_days: 2,
        settlement_tolerance_minor: 50,
        capture_at_settlement: true,
        platform_fee_bps: 290,
        platform_fee_fixed_minor: 30,
        statement_descriptor: 'NORTHWIND',
        changed_by: 'usr_01HQ8Z3K9X4M2N7P6R5T1V0W9C',
        changed_at: OCCURRED_AT,
      });

    case 'merchant.status_changed':
      return sampleEnvelope(type, {
        merchant_id: MERCHANT_ID,
        previous_status: 'active' as const,
        status: 'restricted' as const,
        reason: 'elevated chargeback ratio',
        changed_by: 'staff_01HQ8Z3K9X4M2N7P6R5T1V0W9D',
        changed_at: OCCURRED_AT,
      });

    case 'merchant.bank_account_verified':
      return sampleEnvelope(type, {
        merchant_id: MERCHANT_ID,
        bank_account_id: BANK_ACCOUNT_ID,
        country: 'US',
        currency: 'USD' as CurrencyCode,
        scheme: 'aba',
        account_number_token: 'bat_01HQ8Z3K9X4M2N7P6R5T1V0W9E',
        routing_last_four: '0021',
        iban_last_four: null,
        bic: null,
        sort_code_last_four: null,
        status: 'validated',
        is_default: true,
        verified_at: OCCURRED_AT,
      });

    case 'invoice.issued':
      return sampleEnvelope(type, {
        invoice_public_id: 'inv_01HQ8Z3K9X4M2N7P6R5T1V0W9F',
        merchant_id: MERCHANT_ID,
        subscription_public_id: 'sub_01HQ8Z3K9X4M2N7P6R5T1V0W9G',
        number: 'PZ-2026-004417',
        status: 'open',
        currency: 'USD' as CurrencyCode,
        subtotal_minor: 12_000,
        tax_minor: 0,
        total_minor: 12_000,
        period_start: VALUE_DATE,
        period_end: '2026-05-29',
        due_at: OCCURRED_AT,
        migrated_to_ledger: false,
        issued_at: OCCURRED_AT,
      });

    default: {
      // Exhaustive: adding a member to EVENT_TYPES without a fixture is a
      // compile error here, which is the whole point of this file.
      const exhaustive: never = type;
      throw new Error(`no fixture for event type: ${String(exhaustive)}`);
    }
  }
}

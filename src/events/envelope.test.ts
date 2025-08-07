import { describe, expect, it } from 'vitest';

import { EVENT_TYPES } from './envelope';
import { everyEventType, sampleEnvelope } from '../test-support/fixtures';

const REQUIRED_FIELDS = [
  'id',
  'type',
  'version',
  'occurred_at',
  'source',
  'correlation_id',
  'causation_id',
  'merchant_id',
  'livemode',
  'payload',
];

describe('EventEnvelope', () => {
  it('requires exactly the ten envelope fields', () => {
    const envelope = sampleEnvelope('payment.captured', { charge_id: 'ch_1' });
    expect(Object.keys(envelope).sort()).toEqual([...REQUIRED_FIELDS].sort());
  });

  it.each(everyEventType())('$type carries every required field', (event) => {
    for (const field of REQUIRED_FIELDS) {
      expect(
        Object.prototype.hasOwnProperty.call(event, field),
        `${event.type} is missing ${field}`,
      ).toBe(true);
    }
  });

  const PUBLISHERS = ['payzeno-api', 'payzeno-ledger', 'payzeno-billing-legacy'];

  it('attributes the ledger events to payzeno-ledger', () => {
    for (const event of everyEventType()) {
      if (event.type.startsWith('settlement.') || event.type.startsWith('ledger.')) {
        expect(event.source).toBe('payzeno-ledger');
      }
    }
  });
});

describe('causation_id', () => {
  it('is null rather than absent when there is no cause', () => {
    for (const event of everyEventType()) {
      expect(event.causation_id).toBeNull();
    }
  });
});

describe('EVENT_TYPES', () => {
});

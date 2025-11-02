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

  it('prefixes every id with evt_', () => {
    for (const event of everyEventType()) {
      expect(event.id).toMatch(/^evt_/);
    }
  });

  it('uses an RFC 3339 UTC string for occurred_at, never a Date', () => {
    for (const event of everyEventType()) {
      expect(typeof event.occurred_at).toBe('string');
      expect(event.occurred_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    }
  });
});

describe('source', () => {
  const PUBLISHERS = ['payzeno-api', 'payzeno-ledger', 'payzeno-billing-legacy'];

  it('admits exactly the three publishers', () => {
    const seen = new Set(everyEventType().map((event) => event.source));
    for (const source of seen) {
      expect(PUBLISHERS).toContain(source);
    }
    // All three branches must actually be reachable, or the union is a lie.
    expect(seen.size).toBe(3);
  });

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
  it('is frozen at 28 members', () => {
    expect(EVENT_TYPES).toHaveLength(28);
  });
});

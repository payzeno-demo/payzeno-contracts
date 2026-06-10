import { describe, expect, it } from 'vitest';

import { PUBLIC_EVENT_TYPES } from './index';
import {
  EVENT_SCHEMA_VERSIONS,
  EVENT_TOPICS,
  EVENT_TYPES,
  isEventOfType,
  topicForEventType,
} from './events';
import type { EventType, TopicName } from './events';
import { everyEventType } from './test-support/fixtures';

describe('EVENT_TYPES', () => {
  it('has 28 members and no duplicates', () => {
    expect(EVENT_TYPES).toHaveLength(28);
    expect(new Set(EVENT_TYPES).size).toBe(28);
  });

  it('names every member `<context>.<fact_in_past_tense>`', () => {
    for (const type of EVENT_TYPES) {
      expect(type).toMatch(/^[a-z]+\.[a-z_]+$/);
    }
  });
});

describe('EVENT_TOPICS', () => {
  it('covers every EVENT_TYPES member exactly once', () => {
    const seen = new Map<string, number>();
    for (const topic of Object.keys(EVENT_TOPICS) as TopicName[]) {
      for (const type of EVENT_TOPICS[topic]) {
        seen.set(type, (seen.get(type) ?? 0) + 1);
      }
    }

    for (const type of EVENT_TYPES) {
      expect(seen.get(type), `${type} is on no topic`).toBe(1);
    }
    expect(seen.size).toBe(EVENT_TYPES.length);
  });

  it('routes settlement.duplicate_detected onto the ledger topic', () => {
    expect(topicForEventType('settlement.duplicate_detected')).toBe('payzeno-ledger-events');
  });

  it('resolves a topic for every type', () => {
    for (const type of EVENT_TYPES) {
      expect(topicForEventType(type)).toBeDefined();
    }
  });
});

describe('EVENT_SCHEMA_VERSIONS', () => {
  it('has a key per EVENT_TYPES member and nothing else', () => {
    const keys = Object.keys(EVENT_SCHEMA_VERSIONS).sort();
    expect(keys).toEqual([...EVENT_TYPES].sort());
  });

  it('is a positive integer everywhere', () => {
    for (const type of EVENT_TYPES) {
      const version = EVENT_SCHEMA_VERSIONS[type];
      expect(Number.isInteger(version)).toBe(true);
      expect(version).toBeGreaterThanOrEqual(1);
    }
  });

  // PAY-2052. Chunking settled_charge_ids was breaking for a v1-only consumer,
  // so it bumped. Nothing else has ever needed to.
  it('has settlement.completed at 2 and everything else at 1', () => {
    expect(EVENT_SCHEMA_VERSIONS['settlement.completed']).toBe(2);
    const bumped = EVENT_TYPES.filter((type) => EVENT_SCHEMA_VERSIONS[type] !== 1);
    expect(bumped).toEqual(['settlement.completed']);
  });
});

describe('PUBLIC_EVENT_TYPES', () => {
  it('is a strict subset of EVENT_TYPES', () => {
    const all = new Set<string>(EVENT_TYPES);
    for (const type of PUBLIC_EVENT_TYPES) {
      expect(all.has(type), `${type} is not an EventType`).toBe(true);
    }
    expect(PUBLIC_EVENT_TYPES.length).toBeLessThan(EVENT_TYPES.length);
  });

  it('never exposes an internal event to a merchant', () => {
    const publicTypes = new Set<string>(PUBLIC_EVENT_TYPES);
    for (const internal of [
      'settlement.batch_closed',
      'settlement.duplicate_detected',
      'settlement.variance_detected',
      'settlement.funded',
      'settlement.reconciliation_failed',
      'ledger.transaction_posted',
      'ledger.imbalance_detected',
      'merchant.created',
      'merchant.updated',
      'merchant.status_changed',

/**
 * The infrastructure correspondence.
 *
 * These strings are the SNS topic and SQS queue names in
 * payzeno-infrastructure's `envs/*_/sns.tf` and `sqs.tf`. Nothing checks that
 * across repos, so this test is the closest thing to a guard rail: it pins the
 * literals so a rename here is at least a visible, deliberate diff rather than
 * a silently undelivered event.
 */

import { describe, expect, it } from 'vitest';

import { DLQ_TOPIC_NAME, EVENT_TOPICS, QUEUE_NAMES, topicForEventType } from './topics';
import type { TopicName } from './topics';
import { EVENT_TYPES } from './envelope';

describe('EVENT_TOPICS', () => {
  it('has exactly the four frozen topic names', () => {
    expect(Object.keys(EVENT_TOPICS).sort()).toEqual([
      'payzeno-billing-events',
      'payzeno-ledger-events',
      'payzeno-merchant-events',
      'payzeno-payments-events',
    ]);
  });

  it('names every topic payzeno-<context>-events', () => {
    for (const topic of Object.keys(EVENT_TOPICS)) {
      expect(topic).toMatch(/^payzeno-[a-z]+-events$/);
    }
  });

  it('partitions EVENT_TYPES — total and disjoint', () => {
    const routed = (Object.keys(EVENT_TOPICS) as TopicName[]).flatMap(
      (topic) => EVENT_TOPICS[topic] as readonly string[],
    );
    expect(routed).toHaveLength(EVENT_TYPES.length);
    expect(new Set(routed).size).toBe(EVENT_TYPES.length);
    expect([...routed].sort()).toEqual([...EVENT_TYPES].sort());
  });

  it('gives payzeno-billing-legacy exactly one publish surface', () => {
    expect([...EVENT_TOPICS['payzeno-billing-events']]).toEqual(['invoice.issued']);
  });

  it('carries the INC additions on the ledger topic', () => {
    const ledger = EVENT_TOPICS['payzeno-ledger-events'] as readonly string[];
    expect(ledger).toContain('settlement.duplicate_detected');
    expect(ledger).toContain('settlement.variance_detected');
    expect(ledger).toContain('settlement.funded');
  });
});

describe('QUEUE_NAMES', () => {
  it('is keyed by the consumer class that drains it', () => {
    expect(QUEUE_NAMES.NotificationRelayConsumer).toBe('payzeno-console-notifications');
    expect(QUEUE_NAMES.WebhookFanoutConsumer).toBe('payzeno-api-webhooks');
    expect(QUEUE_NAMES.MerchantEventListener).toBe('payzeno-billing-merchants');
  });

  it('has no duplicate queue name', () => {
    const values = Object.values(QUEUE_NAMES);
    expect(new Set(values).size).toBe(values.length);
  });

  it('resolves every event type', () => {
    for (const type of EVENT_TYPES) {
      expect(topicForEventType(type), `${type} has no topic`).toBeDefined();
    }
  });

  it('puts invoice.issued on the billing topic', () => {
    expect(topicForEventType('invoice.issued')).toBe('payzeno-billing-events');
  });
});

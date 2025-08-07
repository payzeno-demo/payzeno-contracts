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

});

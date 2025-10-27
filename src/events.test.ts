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

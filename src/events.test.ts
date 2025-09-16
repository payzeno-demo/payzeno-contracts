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

import { describe, expect, it } from 'vitest';

import { NotFoundError } from './errors';
import { assertNever, isApiError, isEventOfType } from './guards';
import { everyEventType } from './test-support/fixtures';
import type { PayzenoEvent } from './events';

describe('isApiError', () => {
  it('accepts a real envelope', () => {
    expect(isApiError(new NotFoundError('nope').toApiError('req_1'))).toBe(true);
  });

  it('rejects a proxy error page that happens to have an `error` key', () => {
    expect(isApiError({ error: 'gateway timeout' })).toBe(false);
    expect(isApiError({ error: { message: 'gateway timeout' } })).toBe(false);
  });

  it('rejects an unknown code — a shape-only check would pass this', () => {
    expect(
      isApiError({ error: { code: 'kaboom', message: 'x', request_id: 'req_1' } }),
    ).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError('not_found')).toBe(false);
    expect(isApiError(404)).toBe(false);
  });
});

describe('isEventOfType', () => {
  const events = everyEventType();

  it('is false for every other type', () => {
    const duplicate = events.find((e) => e.type === 'settlement.duplicate_detected');
    expect(duplicate).toBeDefined();
    expect(isEventOfType(duplicate as PayzenoEvent, 'settlement.completed')).toBe(false);
    expect(isEventOfType(duplicate as PayzenoEvent, 'settlement.duplicate_detected')).toBe(true);
  });
});

describe('assertNever', () => {
});

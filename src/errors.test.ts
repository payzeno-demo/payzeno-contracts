import { describe, expect, it } from 'vitest';

import {
  ConflictError,
  CurrencyMismatchError,
  NotFoundError,
  PayzenoError,
  ValidationError,
} from './errors';
import { isApiError } from './guards';

const REQUEST_ID = 'req_01HQ8Z3K9X4M2N7P6R5T1V0W8Y';

describe('the four concrete subclasses', () => {
  const cases: Array<[new (m: string) => PayzenoError, string, number]> = [
    [ValidationError, 'validation_failed', 422],
    [CurrencyMismatchError, 'currency_mismatch', 400],
    [NotFoundError, 'not_found', 404],
    [ConflictError, 'conflict', 409],
  ];

  it.each(cases)('%p carries its frozen code/status pair', (Ctor, code, status) => {
    const error = new Ctor('boom');
    expect(error.code).toBe(code);
    expect(error.httpStatus).toBe(status);
  });

  it.each(cases)('%p is an Error and a PayzenoError', (Ctor) => {
    const error = new Ctor('boom');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PayzenoError);
  });

  it('sets name to the subclass name, not "Error"', () => {
    expect(new NotFoundError('nope').name).toBe('NotFoundError');
    expect(new ConflictError('nope').name).toBe('ConflictError');
  });
});

describe('toApiError', () => {
  it('produces the exact envelope both other repos parse', () => {
    const error = new ValidationError('invalid body', {}, [
      { path: 'payment_method.exp_month', code: 'out_of_range', message: 'must be 1-12' },
    ]);
    const envelope = new ConflictError('x', { ratio: Number.NaN }).toApiError(REQUEST_ID);
    expect(envelope.error.details).toBeUndefined();
  });
});

describe('serialisation', () => {
  it('survives JSON.stringify of the envelope, not of the error', () => {
    const json = JSON.stringify(error.toApiError(REQUEST_ID));
  });
});

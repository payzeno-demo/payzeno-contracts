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
const DISPUTE_ID = 'dp_01HQ8Z3K9X4M2N7P6R5T1V0W9A';


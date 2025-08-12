/**
 * SNS topic → event type routing, and the SQS queue vocabulary.
 *
 * NOTE: these strings must match payzeno-infrastructure envs/*&#47;sns.tf and sqs.tf
 * exactly. There is no test that checks it across repos. Rename at your peril.
 *
 * The mapping is total and disjoint: every member of `EVENT_TYPES` appears on
 * exactly one topic. `src/events.test.ts` asserts both halves of that, because a
 * type on no topic is an event nobody can subscribe to and a type on two topics
 * is a duplicate delivery every consumer must then dedupe by hand.
 */

import type { EventType } from './envelope';

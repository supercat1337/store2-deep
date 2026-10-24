/**
 * Deep reactivity for `@supercat1337/store2` — mutable nested state with
 * granular, per-property updates.
 *
 * @packageDocumentation
 */

export { deepReactive } from './deepReactive.js';
export { toRaw, isDeepReactive, markRaw } from './raw.js';

export type { DeepReactive, DeepReactiveOptions } from './types.js';
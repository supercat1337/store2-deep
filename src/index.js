// @ts-check

/**
 * @file Public API entry point.
 */

export { deepReactive } from './deepReactive.js';
export { toRaw, isDeepReactive, markRaw } from './raw.js';

// Re-export types for TypeScript users (via JSDoc)
/**
 * @typedef {import('./types.d.ts').DeepReactiveOptions} DeepReactiveOptions
 */

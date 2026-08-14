/**
 * Type definitions for @supercat1337/store2-deep
 */

/**
 * Deep reactive proxy type. It behaves like the original object but all nested
 * objects and arrays are also wrapped in proxies.
 */
export type DeepReactive<T> = T extends object ? DeepReactiveProxy<T> : T;

type DeepReactiveProxy<T> = {
    [K in keyof T]: T[K] extends object ? DeepReactive<T[K]> : T[K];
} & {
    /** Internal: returns the raw (unproxied) object. */
    __v_raw: T;
};

/**
 * Options for deepReactive.
 */
export interface DeepReactiveOptions {
    /**
     * Callback invoked when a property changes.
     * @param path - The path to the changed property as an array of strings.
     * @param oldValue - The previous value.
     * @param newValue - The new value.
     * @param target - The raw object that contains the property.
     */
    onChange?: (path: string[], oldValue: any, newValue: any, target: object) => void;
}

/* From deepReactive.d.ts */
/**
 * Internal: creates a deep proxy for the given target, with caching.
 * @param {object|any[]} target - The target object or array.
 * @param {string[]} [path] - The path to the target (for debugging).
 * @param {DeepReactiveOptions} [options] - Options for the reactive proxy.
 * @returns {object} The deep reactive proxy.
 */
export function createDeepProxy(target: object | any[], path?: string[], options?: DeepReactiveOptions): object;
/**
 * Public API: creates a deeply reactive proxy for a plain object or array.
 * @template T
 * @param {T} target - The plain object or array to wrap.
 * @param {DeepReactiveOptions} [options] - Optional configuration.
 * @returns {T} The deep reactive proxy.
 * @throws {Error} If the target is not a plain object or array.
 */
export function deepReactive<T>(target: T, options?: DeepReactiveOptions): T;

/* From raw.d.ts */
/**
 * Checks if a value is a deep reactive proxy.
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is a deep reactive proxy.
 */
export function isDeepReactive(value: any): boolean;
/**
 * Returns the raw (unproxied) object from a deep reactive proxy.
 * Recursively unwraps nested proxies and handles circular references.
 * Safe for readonly properties, getters, and non-configurable descriptors.
 * @param {any} proxy - The deep reactive proxy.
 * @param {WeakSet<object>} [seen] - Internal set for circular reference detection.
 * @returns {any} The raw object.
 */
export function toRaw(proxy: any, seen?: WeakSet<object>): any;
/**
 * Marks an object as raw – it will not be proxied by deepReactive.
 * Useful for external library instances, DOM elements, etc.
 * @param {object} target - The object to mark as raw.
 * @returns {object} The same object with a hidden `__v_skip` property.
 */
export function markRaw(target: object): object;

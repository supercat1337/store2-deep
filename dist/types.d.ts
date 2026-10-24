/**
 * Deep reactivity for `@supercat1337/store2` — mutable nested state with
 * granular, per-property updates.
 *
 * @packageDocumentation
 */

/**
 * Deep reactive proxy type. Behaves like the original object, but all nested
 * objects and arrays are wrapped in proxies.
 *
 * @public
 */
export declare type DeepReactive<T> = T extends object ? {
    [K in keyof T]: T[K] extends object ? DeepReactive<T[K]> : T[K];
} & {
    /**
     * Raw (unproxied) object behind this proxy. Equivalent to
     * calling {@link toRaw} on the proxy.
     */
    __v_raw: T;
} : T;

/**
 * Creates a deeply reactive proxy for a plain object or array.
 *
 * Every property of the returned proxy is backed by its own `Atom` from
 * `@supercat1337/store2`, so only the exact paths read inside an `autorun`
 * or `computed` trigger recomputation when they change. Nested plain objects
 * and arrays are wrapped lazily on first access.
 *
 * @public
 * @template T
 * @param {T} target - The plain object or array to wrap.
 * @param {import('./types.js').DeepReactiveOptions} [options] - Optional configuration.
 * @returns {import('./types.js').DeepReactive<T>} The deep reactive proxy.
 * @throws {Error} If the target is not a plain object or array.
 */
export declare function deepReactive<T>(target: T, options?: DeepReactiveOptions): DeepReactive<T>;

/**
 * Options for `deepReactive`.
 *
 * @public
 */
export declare interface DeepReactiveOptions {
    /**
     * Callback invoked on every mutation.
     *
     * @param path - Path to the changed property, as an array of strings
     *   (e.g. `['user', 'name']`, or `['items', '0']` for array indices).
     * @param oldValue - Previous value (`undefined` for new properties).
     * @param newValue - New value (`undefined` on deletion).
     * @param target - Raw object that contains the property.
     */
    onChange?: (path: string[], oldValue: any, newValue: any, target: object) => void;
}

/**
 * Checks if a value is a deep reactive proxy.
 *
 * @public
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is a deep reactive proxy.
 */
export declare function isDeepReactive(value: any): boolean;

/**
 * Marks an object as raw – it will not be proxied by `deepReactive`.
 * Useful for external library instances, DOM elements, etc.
 *
 * @public
 * @param {object} target - The object to mark as raw.
 * @returns {object} The same object with a hidden `__v_skip` property.
 */
export declare function markRaw(target: object): object;

/**
 * Returns the raw (unproxied) object from a deep reactive proxy.
 *
 * Recursively unwraps nested proxies and handles circular references.
 * Safe for readonly properties, getters, and non-configurable descriptors.
 * Non-reactive values are returned as-is.
 *
 * @public
 * @param {any} proxy - The deep reactive proxy.
 * @returns {any} The raw object.
 */
export declare function toRaw(proxy: any): any;

export { }

/**
 * Type definitions for @supercat1337/store2-deep
 */

import type { Atom, Computed } from '@supercat1337/store2';

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
 * Creates a deeply reactive proxy for a plain object or array.
 * @param target - The plain object or array to wrap.
 * @returns A deeply reactive proxy.
 */
export declare function deepReactive<T extends object>(target: T): DeepReactive<T>;

/**
 * Checks if a value is a deep reactive proxy.
 * @param value - The value to check.
 * @returns True if the value is a deep reactive proxy.
 */
export declare function isDeepReactive(value: unknown): value is DeepReactive<any>;

/**
 * Returns the raw (unproxied) object from a deep reactive proxy.
 * If the proxy contains circular references, it handles them safely.
 * @param proxy - The deep reactive proxy.
 * @returns The raw object.
 */
export declare function toRaw<T>(proxy: DeepReactive<T>): T;

/**
 * Marks an object as "raw" so that it will not be proxied by `deepReactive`.
 * @param target - The object to mark.
 * @returns The same object with a hidden `__v_skip` property.
 */
export declare function markRaw<T extends object>(target: T): T;

/**
 * Internal symbol used to track iteration/structure changes.
 */
export declare const ITERATE_KEY: unique symbol;

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

/**
 * Creates a deeply reactive proxy for a plain object or array.
 * @param target - The plain object or array to wrap.
 * @param options - Optional configuration.
 * @returns A deeply reactive proxy.
 */
export declare function deepReactive<T extends object>(
    target: T,
    options?: DeepReactiveOptions
): DeepReactive<T>;

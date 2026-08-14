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

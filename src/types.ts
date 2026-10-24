// @ts-check

/**
 * Deep reactive proxy type. Behaves like the original object, but all nested
 * objects and arrays are wrapped in proxies.
 *
 * @public
 */
export type DeepReactive<T> = T extends object ? DeepReactiveProxy<T> : T;

type DeepReactiveProxy<T> = {
    [K in keyof T]: T[K] extends object ? DeepReactive<T[K]> : T[K];
} & {
    /** Raw (unproxied) object behind this proxy. @internal */
    __v_raw: T;
};

/**
 * Options for `deepReactive`.
 *
 * @public
 */
export interface DeepReactiveOptions {
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

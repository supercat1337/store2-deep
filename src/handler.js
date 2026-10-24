// @ts-check

/**
 * @file Proxy handler for deep reactive objects.
 * Intercepts get, set, deleteProperty, ownKeys, and has operations.
 * Each property is backed by an Atom from the core `store2` library.
 * Arrays and their mutating methods are specially handled to update all affected indices.
 */

import { batch } from '@supercat1337/store2';
import { getAtom, getIterateAtom, notifyIterate } from './atomRegistry.js';
import { createDeepProxy } from './deepReactive.js';
import { isDeepReactive } from './raw.js';
import { isMarkedRaw, shouldProxy } from './utils.js';

/** Array methods that mutate the array in place. */
const mutatingMethods = [
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse',
    'fill',
    'copyWithin',
];

/** Methods that change the order of elements without changing length. */
const orderChangingMethods = ['sort', 'reverse'];

/**
 * Cache for storing created proxy instances by target object.
 * Prevents re-creating proxies on getter access and avoids side-effect mutations inside `get`.
 * @type {WeakMap<object, object>}
 */
const proxyCache = new WeakMap();

/**
 * @typedef {object} RawObjectWithVRaw
 * @property {object} __v_raw - Raw object reference.
 */

/**
 * Creates a Proxy handler for a deep reactive object.
 * @param {string[]} [path] - The path to the current object (for debugging and onChange).
 * @param {import('./types.js').DeepReactiveOptions} [options] - Options including onChange callback.
 * @returns {ProxyHandler<object>}
 */
export function createHandler(path = [], options = {}) {
    const { onChange } = options;

    return {
        /**
         * Intercepts property access.
         * Pure operation: tracks dependency and returns value/proxy without mutating state.
         * @param {object} target - The raw target object.
         * @param {string|symbol} prop - The property key.
         * @param {object} receiver - The proxy or object that received the call.
         * @returns {any} The property value (or a proxy for nested objects/arrays).
         */
        get(target, prop, receiver) {
            // Internal key to access raw object.
            if (prop === '__v_raw') {return target;}

            // Intercept array mutating methods.
            if (
                Array.isArray(target) &&
                typeof prop === 'string' &&
                mutatingMethods.includes(prop)
            ) {
                /**
                 * @param {...any} args - Arguments for the mutating method.
                 * @returns {any} Result of the original method.
                 */
                return function (...args) {
                    const oldLength = target.length;
                    const oldValues = target.slice();
                    const isOrderChange = orderChangingMethods.includes(prop);

                    // @ts-ignore
                    const result = Reflect.apply(target[prop], target, args);
                    const newLength = target.length;

                    batch(() => {
                        // 1. Update atoms for all existing indices (0 to newLength-1)
                        for (let i = 0; i < newLength; i++) {
                            const newValue = target[i];
                            const oldValue = i < oldValues.length ? oldValues[i] : undefined;

                            if (isOrderChange || oldValue !== newValue) {
                                const atomRef = getAtom(target, String(i), true);
                                if (atomRef) {
                                    atomRef.value = newValue;
                                }
                                if (onChange) {
                                    onChange([...path, String(i)], oldValue, newValue, target);
                                }
                            }
                        }

                        // 2. If length decreased, destroy atoms for removed indices
                        //    We intentionally do NOT destroy their atoms: store2's
                        //    destroy() tears down the whole engine graph, so any
                        //    Computed that tracked this index during a previous run
                        //    would be destroyed along with the atom. Setting .value
                        //    to undefined keeps the atom alive, notifies dependents,
                        //    and lets them re-collect their dependency set without
                        //    the removed index.
                        if (newLength < oldLength) {
                            for (let i = newLength; i < oldLength; i++) {
                                const atomRef = getAtom(target, String(i), false);
                                if (atomRef) {
                                    atomRef.value = undefined;
                                }
                                if (onChange) {
                                    onChange([...path, String(i)], oldValues[i], undefined, target);
                                }
                            }
                        }

                        // 3. Update length atom
                        const lengthAtom = getAtom(target, 'length', true);
                        if (lengthAtom) {
                            lengthAtom.value = newLength;
                            if (onChange && oldLength !== newLength) {
                                onChange([...path, 'length'], oldLength, newLength, target);
                            }
                        }

                        // 4. Notify iteration listeners
                        notifyIterate(target);
                    });

                    return result;
                };
            }

            // Track dependency via getter (PURE READ OPERATION)
            if (typeof prop !== 'symbol') {
                const atomRef = getAtom(target, prop, true);
                if (atomRef) {
                    atomRef.value; // Access getter for dependency tracking
                }
            }

            const value = Reflect.get(target, prop, receiver);

            // If value is already a deep reactive proxy, return as-is
            if (isDeepReactive(value)) {
                return value;
            }

            // Return cached or new proxy WITHOUT setting atom value inside get
            if (shouldProxy(value) && !isMarkedRaw(value)) {
                let proxy = proxyCache.get(value);
                if (!proxy) {
                    proxy = createDeepProxy(value, [...path, String(prop)], options);
                    proxyCache.set(value, proxy);
                }
                return proxy;
            }

            return value;
        },

        /**
         * Intercepts property assignment.
         * Wraps object values into proxies and batches atom updates to prevent intermediate side-effects.
         * @param {object} target - The raw target object.
         * @param {string|symbol} prop - The property key.
         * @param {any} newValue - The new value to set.
         * @param {object} receiver - The proxy or object that received the call.
         * @returns {boolean} True if assignment succeeded.
         */
        set(target, prop, newValue, receiver) {
            if (typeof prop === 'symbol') {
                return Reflect.set(target, prop, newValue, receiver);
            }

            const oldValue = /** @type {Record<string, any>} */ (target)[prop];
            const hadKey = Object.prototype.hasOwnProperty.call(target, prop);

            // Wrap new value into proxy if it's an object/array
            if (shouldProxy(newValue) && !isDeepReactive(newValue) && !isMarkedRaw(newValue)) {
                let proxy = proxyCache.get(newValue);
                if (!proxy) {
                    proxy = createDeepProxy(newValue, [...path, String(prop)], options);
                    proxyCache.set(newValue, proxy);
                }
                newValue = proxy;
            }

            const result = Reflect.set(target, prop, newValue, receiver);

            if (result && (!hadKey || !Object.is(oldValue, newValue))) {
                // Wrap Atom updates and iterate notifications into a single batch transaction
                batch(() => {
                    const atomRef = getAtom(target, prop, true);
                    if (atomRef) {
                        atomRef.value = newValue;
                    }

                    if (!hadKey) {
                        notifyIterate(target);
                    }
                });

                if (onChange) {
                    onChange([...path, String(prop)], oldValue, newValue, target);
                }
            }

            return result;
        },

        /**
         * Intercepts property deletion.
         * @param {object} target - The raw target object.
         * @param {string|symbol} prop - The property key.
         * @returns {boolean} True if deletion succeeded.
         */
        deleteProperty(target, prop) {
            if (typeof prop === 'symbol') {
                return Reflect.deleteProperty(target, prop);
            }

            const rawTarget =
                /** @type {object & { __v_raw?: object }} */ (target).__v_raw || target;
            const hadKey = prop in rawTarget;
            const oldValue = /** @type {Record<string, any>} */ (rawTarget)[prop];
            const result = Reflect.deleteProperty(rawTarget, prop);

            if (hadKey && result) {
                batch(() => {
                    const atomRef = getAtom(rawTarget, prop, false);
                    if (atomRef) {
                        atomRef.value = undefined; // Notify 'in' and 'has' listeners that value became undefined
                    }
                    notifyIterate(rawTarget);
                });

                if (onChange) {
                    onChange([...path, String(prop)], oldValue, undefined, rawTarget);
                }
            }
            return result;
        },

        /**
         * Intercepts iteration (Object.keys, for...in, etc.) to track structure changes.
         * @param {object} target - The raw target object.
         * @returns {string[]} Array of property keys (strings only, symbols filtered out).
         */
        ownKeys(target) {
            const iterateAtom = getIterateAtom(target, true);
            if (iterateAtom) {
                iterateAtom.value;
            }
            const keys = Reflect.ownKeys(target);
            // Filter out symbols to ensure we return only string keys
            return keys.filter(key => typeof key === 'string') /** @type {string[]} */;
        },

        /**
         * Intercepts the `prop in obj` operator.
         * @param {object} target - The raw target object.
         * @param {string|symbol} prop - The property key.
         * @returns {boolean} True if property exists.
         */
        has(target, prop) {
            if (typeof prop === 'symbol') {
                return Reflect.has(target, prop);
            }
            const rawTarget =
                /** @type {object & { __v_raw?: object }} */ (target).__v_raw || target;
            const atomRef = getAtom(rawTarget, prop, true);
            if (atomRef) {
                atomRef.value; // Track dependency
            }
            return Reflect.has(rawTarget, prop);
        },
    };
}

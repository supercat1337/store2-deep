// @ts-check

/**
 * @file Proxy handler for deep reactive objects.
 * Intercepts get, set, deleteProperty, ownKeys, and has operations.
 * Each property is backed by an Atom from the core `store2` library.
 * Arrays and their mutating methods are specially handled to update all affected indices.
 */

import { getAtom, getIterateAtom, notifyIterate, objectAtoms } from './atomRegistry.js';
import { shouldProxy, isMarkedRaw } from './utils.js';
import { createDeepProxy } from './deepReactive.js';
import { batch } from '@supercat1337/store2';

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
 * Creates a Proxy handler for a deep reactive object.
 * @param {string[]} [path] - The path to the current object (for debugging and onChange).
 * @param {import('./types.d.ts').DeepReactiveOptions} [options] - Options including onChange callback.
 * @returns {ProxyHandler<object>}
 */
export function createHandler(path = [], options = {}) {
    const { onChange } = options;

    return {
        /**
         * Intercepts property access.
         * - Creates an Atom for the property and tracks dependency.
         * - If the value is an object/array, returns a deep proxy.
         * - Special handling for array mutating methods.
         */
        get(target, prop, receiver) {
            // Internal key to access raw object.
            if (prop === '__v_raw') return target;

            // Intercept array mutating methods.
            if (
                Array.isArray(target) &&
                typeof prop === 'string' &&
                mutatingMethods.includes(prop)
            ) {
                return function (...args) {
                    // Save pre-mutation state.
                    const oldLength = target.length;
                    const oldValues = target.slice(); // shallow copy
                    const isOrderChange = orderChangingMethods.includes(prop);

                    // Perform the mutation on the raw array.
                    const result = Reflect.apply(target[prop], target, args);
                    const newLength = target.length;

                    // Batch all atom updates to avoid multiple notifications.
                    batch(() => {
                        // 1. Update atoms for all existing indices (0 to newLength-1)
                        for (let i = 0; i < newLength; i++) {
                            const newValue = target[i];
                            const oldValue = i < oldValues.length ? oldValues[i] : undefined;

                            // For sort/reverse, force update even if values are equal.
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

                        // 2. If length decreased, destroy atoms for removed indices and notify.
                        if (newLength < oldLength) {
                            for (let i = newLength; i < oldLength; i++) {
                                const atomRef = getAtom(target, String(i), false);
                                if (atomRef) {
                                    atomRef.destroy();
                                    const map = objectAtoms.get(target);
                                    if (map) map.delete(String(i));
                                }
                                // Always call onChange for removed indices, even if atom didn't exist.
                                if (onChange) {
                                    onChange([...path, String(i)], oldValues[i], undefined, target);
                                }
                            }
                        }

                        // 3. Update the length atom.
                        const lengthAtom = getAtom(target, 'length', true);
                        if (lengthAtom) {
                            lengthAtom.value = newLength;
                            if (onChange && oldLength !== newLength) {
                                onChange([...path, 'length'], oldLength, newLength, target);
                            }
                        }

                        // 4. Notify iteration (structure changed).
                        notifyIterate(target);
                    });

                    return result;
                };
            }

            // For all other properties (including array indices and length), create Atom and track.
            if (typeof prop !== 'symbol') {
                const atomRef = getAtom(target, prop, true);
                if (atomRef) {
                    atomRef.value; // Triggers dependency tracking via Engine.
                }
            }

            const value = Reflect.get(target, prop, receiver);

            // If the value is an object that should be proxied, return its proxy.
            if (shouldProxy(value) && !isMarkedRaw(value)) {
                return createDeepProxy(value, [...path, String(prop)], options);
            }

            return value;
        },

        /**
         * Intercepts property assignment.
         * Updates the raw object, the property's Atom, and notifies onChange.
         */
        set(target, prop, newValue, receiver) {
            // Ignore symbols for reactivity (except internal ones, but they are not set).
            if (typeof prop === 'symbol') {
                return Reflect.set(target, prop, newValue, receiver);
            }

            const oldValue = Reflect.get(target, prop, receiver);
            if (oldValue === newValue) {
                return true; // No change.
            }

            const isNewKey = !(prop in target);
            const result = Reflect.set(target, prop, newValue, receiver);

            // Update the property's Atom.
            const atomRef = getAtom(target, prop, true);
            if (atomRef) {
                atomRef.value = newValue;
            }

            // Call onChange callback if provided.
            if (onChange) {
                onChange([...path, String(prop)], oldValue, newValue, target);
            }

            // If a new key was added (and it's not 'length'), notify structure change.
            if (isNewKey && prop !== 'length') {
                notifyIterate(target);
            }

            return result;
        },

        /**
         * Intercepts property deletion.
         * Destroys the property's Atom and notifies onChange.
         */
        deleteProperty(target, prop) {
            // Ignore symbols for deletion.
            if (typeof prop === 'symbol') {
                return Reflect.deleteProperty(target, prop);
            }

            const hadKey = prop in target;
            const oldValue = target[prop];
            const result = Reflect.deleteProperty(target, prop);
            if (hadKey && result) {
                // Destroy the Atom if it exists.
                const map = objectAtoms.get(target);
                if (map) {
                    const atomRef = map.get(prop);
                    if (atomRef) {
                        atomRef.destroy();
                        map.delete(prop);
                    }
                }
                // Call onChange with newValue = undefined.
                if (onChange) {
                    onChange([...path, String(prop)], oldValue, undefined, target);
                }
                notifyIterate(target);
            }
            return result;
        },

        /**
         * Intercepts iteration (Object.keys, for...in).
         * Tracks the iterate atom to detect structure changes (keys added/removed).
         *
         * Note: This trap is also called for `Object.getOwnPropertySymbols` and
         * `Object.assign`, but tracking the iterate atom in those cases is harmless:
         * - If the current effect doesn't use iteration, it won't be subscribed.
         * - If it does, it's exactly what we want (structure changes should trigger).
         * This is consistent with Vue 3's reactivity system.
         */
        ownKeys(target) {
            const iterateAtom = getIterateAtom(target, true);
            if (iterateAtom) {
                iterateAtom.value; // Track dependency.
            }
            return Reflect.ownKeys(target);
        },

        /**
         * Intercepts the `prop in obj` operator.
         * Tracks the property's Atom.
         */
        has(target, prop) {
            if (typeof prop === 'symbol') {
                return Reflect.has(target, prop);
            }
            const atomRef = getAtom(target, prop, true);
            if (atomRef) {
                atomRef.value; // Track dependency.
            }
            return Reflect.has(target, prop);
        },
    };
}

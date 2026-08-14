import { atom, batch } from '@supercat1337/store2';

// @ts-check


/**
 * Cache: raw object -> its reactive proxy.
 * @type {WeakMap<object, object>}
 */
const rawToProxy = new WeakMap();

/**
 * Cache: reactive proxy -> its raw object.
 * @type {WeakMap<object, object>}
 */
const proxyToRaw = new WeakMap();

/**
 * Cache: raw object -> Map(property key -> Atom).
 * Each property of a reactive object has its own Atom.
 * @type {WeakMap<object, Map<string|symbol, import('@supercat1337/store2').Atom<any>>>}
 */
const objectAtoms = new WeakMap();

/**
 * Special symbol used to track changes in the set of keys (iteration).
 */
const ITERATE_KEY = Symbol('iterate');

/**
 * Gets an atom for a property of a raw object. Optionally creates it.
 * @param {object} target - The raw object.
 * @param {string|symbol} prop - The property key.
 * @param {boolean} [create=false] - Whether to create the atom if it doesn't exist.
 * @returns {import('@supercat1337/store2').Atom<any> | null}
 */
function getAtom(target, prop, create = false) {
    const map = objectAtoms.get(target);
    if (!map) {
        if (!create) {return null;}
        const newMap = new Map();
        objectAtoms.set(target, newMap);
        return createAtomForProp(target, prop, newMap);
    }
    let atomRef = map.get(prop);
    if (!atomRef && create) {
        atomRef = createAtomForProp(target, prop, map);
    }
    return atomRef || null;
}

/**
 * Internal: creates a new Atom for a property and stores it in the map.
 * @param {object} target - The raw object.
 * @param {string|symbol} prop - The property key.
 * @param {Map<string|symbol, import('@supercat1337/store2').Atom<any>>} map - The atom map.
 * @returns {import('@supercat1337/store2').Atom<any>}
 */
function createAtomForProp(target, prop, map) {
    // @ts-ignore
    const value = target[prop];
    const newAtom = atom(value);
    map.set(prop, newAtom);
    return newAtom;
}

/**
 * Gets the iterate atom for a target (tracks addition/removal of keys).
 * @param {object} target - The raw object.
 * @param {boolean} [create=false] - Whether to create the atom if it doesn't exist.
 * @returns {import('@supercat1337/store2').Atom<any> | null}
 */
function getIterateAtom(target, create = false) {
    return getAtom(target, ITERATE_KEY, create);
}

/**
 * Notifies that the structure of an object has changed (keys added/removed).
 * @param {object} target - The raw object.
 */
function notifyIterate(target) {
    const atomRef = getIterateAtom(target, false);
    if (atomRef) {
        // Trigger the iterate atom by assigning a new value.
        atomRef.value = Symbol('iterated');
    }
}

// @ts-check

/**
 * @file Utility functions for type checking and proxying decisions.
 */

/**
 * Checks if a value is a plain object (not an array, not a class instance, etc.)
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is a plain object.
 */
function isPlainObject(value) {
    if (value === null || typeof value !== 'object') {return false;}
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/**
 * Checks if a value is an array.
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is an array.
 */
function isArray(value) {
    return Array.isArray(value);
}

/**
 * Determines whether a value should be wrapped in a proxy.
 * Only plain objects and arrays are proxied, unless marked raw.
 * @param {any} value - The value to evaluate.
 * @returns {boolean} True if the value should be proxied.
 */
function shouldProxy(value) {
    if (value === null || typeof value !== 'object') {return false;}
    if (isMarkedRaw(value)) {return false;}
    return isPlainObject(value) || isArray(value);
}

/**
 * Checks if a value has been marked as raw (should not be proxied).
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is marked raw.
 */
function isMarkedRaw(value) {
    return value && value.__v_skip === true;
}

// @ts-check


/**
 * Checks if a value is a deep reactive proxy.
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is a deep reactive proxy.
 */
function isDeepReactive(value) {
    return value !== null && typeof value === 'object' && proxyToRaw.has(value);
}

/**
 * Returns the raw (unproxied) object from a deep reactive proxy.
 * Recursively unwraps nested proxies and handles circular references.
 * Safe for readonly properties, getters, and non-configurable descriptors.
 * @param {any} proxy - The deep reactive proxy.
 * @param {WeakSet<object>} [seen] - Internal set for circular reference detection.
 * @returns {any} The raw object.
 */
function toRaw(proxy, seen = new WeakSet()) {
    if (!isDeepReactive(proxy)) {
        return proxy;
    }
    const raw = proxyToRaw.get(proxy) || proxy;

    // Protect against circular references.
    if (seen.has(raw)) {
        return raw;
    }
    seen.add(raw);

    // Only process plain objects and arrays.
    if (isPlainObject(raw) || isArray(raw)) {
        for (const key of Reflect.ownKeys(raw)) {
            const desc = Object.getOwnPropertyDescriptor(raw, key);
            // Only modify if the property is writable (not a getter without setter).
            if (desc && (desc.writable || desc.set)) {
                const value = raw[key];
                if (isDeepReactive(value)) {
                    try {
                        raw[key] = toRaw(value, seen);
                    } catch (e) {
                        console.error(e);
                        // If assignment fails (e.g., readonly property), skip silently.
                    }
                }
            }
        }
    }
    return raw;
}

/**
 * Marks an object as raw – it will not be proxied by deepReactive.
 * Useful for external library instances, DOM elements, etc.
 * @param {object} target - The object to mark as raw.
 * @returns {object} The same object with a hidden `__v_skip` property.
 */
function markRaw(target) {
    if (target !== null && typeof target === 'object') {
        Object.defineProperty(target, '__v_skip', {
            value: true,
            enumerable: false,
            configurable: true,
        });
    }
    return target;
}

// @ts-check


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
 * @param {import('./types.d.ts').DeepReactiveOptions} [options] - Options including onChange callback.
 * @returns {ProxyHandler<object>}
 */
function createHandler(path = [], options = {}) {
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
            if (prop === '__v_raw') return target;

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
                        if (newLength < oldLength) {
                            for (let i = newLength; i < oldLength; i++) {
                                const atomRef = getAtom(target, String(i), false);
                                if (atomRef) {
                                    atomRef.destroy();
                                    const map = objectAtoms.get(target);
                                    if (map) map.delete(String(i));
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

// @ts-check


/**
 * Internal: creates a deep proxy for the given target, with caching.
 * @param {object|any[]} target - The target object or array.
 * @param {string[]} [path] - The path to the target (for debugging).
 * @param {import('./types.d.ts').DeepReactiveOptions} [options] - Options for the reactive proxy.
 * @returns {object} The deep reactive proxy.
 */
function createDeepProxy(target, path = [], options = {}) {
    if (proxyToRaw.has(target)) {
        return target;
    }
    if (rawToProxy.has(target)) {
        // @ts-ignore
        return rawToProxy.get(target);
    }

    if (isMarkedRaw(target)) {
        return target;
    }

    const handler = createHandler(path, options);
    const proxy = new Proxy(target, handler);

    rawToProxy.set(target, proxy);
    proxyToRaw.set(proxy, target);

    return proxy;
}

/**
 * Public API: creates a deeply reactive proxy for a plain object or array.
 * @template T
 * @param {T} target - The plain object or array to wrap.
 * @param {import('./types.d.ts').DeepReactiveOptions} [options] - Optional configuration.
 * @returns {T} The deep reactive proxy.
 * @throws {Error} If the target is not a plain object or array.
 */
function deepReactive(target, options = {}) {
    if (target === null || typeof target !== 'object') {
        throw new Error('deepReactive: target must be an object or array');
    }
    if (!isPlainObject(target) && !isArray(target)) {
        throw new Error('deepReactive: target must be a plain object or array');
    }
    // @ts-ignore
    return createDeepProxy(target, [], options);
}

export { deepReactive, isDeepReactive, markRaw, toRaw };

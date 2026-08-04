// @ts-check

/**
 * @file Utilities for working with raw (unproxied) objects.
 */

import { proxyToRaw } from './atomRegistry.js';
import { isPlainObject, isArray } from './utils.js';

/**
 * Checks if a value is a deep reactive proxy.
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is a deep reactive proxy.
 */
export function isDeepReactive(value) {
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
export function toRaw(proxy, seen = new WeakSet()) {
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
                    } catch (_) {
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
export function markRaw(target) {
    if (target !== null && typeof target === 'object') {
        Object.defineProperty(target, '__v_skip', {
            value: true,
            enumerable: false,
            configurable: true,
        });
    }
    return target;
}

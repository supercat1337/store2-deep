// @ts-check

/**
 * @file Main entry point for creating deep reactive proxies.
 */

import { rawToProxy, proxyToRaw } from './atomRegistry.js';
import { isPlainObject, isArray, isMarkedRaw } from './utils.js';
import { createHandler } from './handler.js';

/**
 * Internal: creates a deep proxy for the given target, with caching.
 * @param {object|any[]} target - The target object or array.
 * @param {string[]} [path] - The path to the target (for debugging).
 * @param {import('./types.d.ts').DeepReactiveOptions} [options] - Options for the reactive proxy.
 * @returns {object} The deep reactive proxy.
 */
export function createDeepProxy(target, path = [], options = {}) {
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
export function deepReactive(target, options = {}) {
    if (target === null || typeof target !== 'object') {
        throw new Error('deepReactive: target must be an object or array');
    }
    if (!isPlainObject(target) && !isArray(target)) {
        throw new Error('deepReactive: target must be a plain object or array');
    }
    // @ts-ignore
    return createDeepProxy(target, [], options);
}

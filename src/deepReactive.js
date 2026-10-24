// @ts-check

/**
 * @file Main entry point for creating deep reactive proxies.
 */

import { rawToProxy, proxyToRaw } from './atomRegistry.js';
import { isPlainObject, isArray, isMarkedRaw } from './utils.js';
import { createHandler } from './handler.js';

/**
 * Internal: creates a deep proxy for the given target, with caching.
 * Returns the cached proxy if one already exists, or the raw object
 * itself if it was marked via {@link markRaw}.
 *
 * @internal
 * @param {object|any[]} target - The target object or array.
 * @param {string[]} [path] - The path to the target (for debugging).
 * @param {import('./types.js').DeepReactiveOptions} [options] - Options for the reactive proxy.
 * @returns {object} The deep reactive proxy.
 */
export function createDeepProxy(target, path = [], options = {}) {
    if (proxyToRaw.has(target)) {
        return target;
    }
    if (rawToProxy.has(target)) {
        // @ts-ignore — WeakMap#get returns `object | undefined`, but we know
        // the key was set via `rawToProxy.set(target, proxy)` above.
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
export function deepReactive(target, options = {}) {
    if (target === null || typeof target !== 'object') {
        throw new Error('deepReactive: target must be an object or array');
    }
    if (!isPlainObject(target) && !isArray(target)) {
        throw new Error('deepReactive: target must be a plain object or array');
    }
    // @ts-ignore — target is validated above; `createDeepProxy` is typed as
    // returning `object` because it is also called internally on non-generic
    // inputs. Narrowing to `DeepReactive<T>` is safe: the runtime guards
    // ensure T is an object or array here.
    return createDeepProxy(target, [], options);
}

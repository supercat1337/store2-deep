// src/atomRegistry.js
import { atom } from "@supercat1337/store2";
var rawToProxy = /* @__PURE__ */ new WeakMap();
var proxyToRaw = /* @__PURE__ */ new WeakMap();
var objectAtoms = /* @__PURE__ */ new WeakMap();
var ITERATE_KEY = Symbol("iterate");
function getAtom(target, prop, create = false) {
  const map = objectAtoms.get(target);
  if (!map) {
    if (!create) {
      return null;
    }
    const newMap = /* @__PURE__ */ new Map();
    objectAtoms.set(target, newMap);
    return createAtomForProp(target, prop, newMap);
  }
  let atomRef = map.get(prop);
  if (!atomRef && create) {
    atomRef = createAtomForProp(target, prop, map);
  }
  return atomRef || null;
}
function createAtomForProp(target, prop, map) {
  const value = target[prop];
  const newAtom = atom(value);
  map.set(prop, newAtom);
  return newAtom;
}
function getIterateAtom(target, create = false) {
  return getAtom(target, ITERATE_KEY, create);
}
function notifyIterate(target) {
  const atomRef = getIterateAtom(target, false);
  if (atomRef) {
    atomRef.value = Symbol("iterated");
  }
}

// src/utils.js
function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function isArray(value) {
  return Array.isArray(value);
}
function shouldProxy(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  if (isMarkedRaw(value)) {
    return false;
  }
  return isPlainObject(value) || isArray(value);
}
function isMarkedRaw(value) {
  return value && value.__v_skip === true;
}

// src/handler.js
import { batch } from "@supercat1337/store2";

// src/raw.js
function isDeepReactive(value) {
  return value !== null && typeof value === "object" && proxyToRaw.has(value);
}
function toRaw(proxy) {
  return toRawInternal(proxy, /* @__PURE__ */ new WeakSet());
}
function toRawInternal(proxy, seen) {
  if (!isDeepReactive(proxy)) {
    return proxy;
  }
  const raw = proxyToRaw.get(proxy) || proxy;
  if (seen.has(raw)) {
    return raw;
  }
  seen.add(raw);
  if (isPlainObject(raw) || isArray(raw)) {
    for (const key of Reflect.ownKeys(raw)) {
      const desc = Object.getOwnPropertyDescriptor(raw, key);
      if (desc && (desc.writable || desc.set)) {
        const value = raw[key];
        if (isDeepReactive(value)) {
          try {
            raw[key] = toRawInternal(value, seen);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  }
  return raw;
}
function markRaw(target) {
  if (target !== null && typeof target === "object") {
    Object.defineProperty(target, "__v_skip", {
      value: true,
      enumerable: false,
      configurable: true
    });
  }
  return target;
}

// src/handler.js
var mutatingMethods = [
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin"
];
var orderChangingMethods = ["sort", "reverse"];
var proxyCache = /* @__PURE__ */ new WeakMap();
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
      if (prop === "__v_raw") {
        return target;
      }
      if (Array.isArray(target) && typeof prop === "string" && mutatingMethods.includes(prop)) {
        return function(...args) {
          const oldLength = target.length;
          const oldValues = target.slice();
          const isOrderChange = orderChangingMethods.includes(prop);
          const result = Reflect.apply(target[prop], target, args);
          const newLength = target.length;
          batch(() => {
            for (let i = 0; i < newLength; i++) {
              const newValue = target[i];
              const oldValue = i < oldValues.length ? oldValues[i] : void 0;
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
            if (newLength < oldLength) {
              for (let i = newLength; i < oldLength; i++) {
                const atomRef = getAtom(target, String(i), false);
                if (atomRef) {
                  atomRef.value = void 0;
                }
                if (onChange) {
                  onChange([...path, String(i)], oldValues[i], void 0, target);
                }
              }
            }
            const lengthAtom = getAtom(target, "length", true);
            if (lengthAtom) {
              lengthAtom.value = newLength;
              if (onChange && oldLength !== newLength) {
                onChange([...path, "length"], oldLength, newLength, target);
              }
            }
            notifyIterate(target);
          });
          return result;
        };
      }
      if (typeof prop !== "symbol") {
        const atomRef = getAtom(target, prop, true);
        if (atomRef) {
          atomRef.value;
        }
      }
      const value = Reflect.get(target, prop, receiver);
      if (isDeepReactive(value)) {
        return value;
      }
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
      if (typeof prop === "symbol") {
        return Reflect.set(target, prop, newValue, receiver);
      }
      const oldValue = (
        /** @type {Record<string, any>} */
        target[prop]
      );
      const hadKey = Object.prototype.hasOwnProperty.call(target, prop);
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
      if (typeof prop === "symbol") {
        return Reflect.deleteProperty(target, prop);
      }
      const rawTarget = (
        /** @type {object & { __v_raw?: object }} */
        target.__v_raw || target
      );
      const hadKey = prop in rawTarget;
      const oldValue = (
        /** @type {Record<string, any>} */
        rawTarget[prop]
      );
      const result = Reflect.deleteProperty(rawTarget, prop);
      if (hadKey && result) {
        batch(() => {
          const atomRef = getAtom(rawTarget, prop, false);
          if (atomRef) {
            atomRef.value = void 0;
          }
          notifyIterate(rawTarget);
        });
        if (onChange) {
          onChange([...path, String(prop)], oldValue, void 0, rawTarget);
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
      return keys.filter((key) => typeof key === "string");
    },
    /**
     * Intercepts the `prop in obj` operator.
     * @param {object} target - The raw target object.
     * @param {string|symbol} prop - The property key.
     * @returns {boolean} True if property exists.
     */
    has(target, prop) {
      if (typeof prop === "symbol") {
        return Reflect.has(target, prop);
      }
      const rawTarget = (
        /** @type {object & { __v_raw?: object }} */
        target.__v_raw || target
      );
      const atomRef = getAtom(rawTarget, prop, true);
      if (atomRef) {
        atomRef.value;
      }
      return Reflect.has(rawTarget, prop);
    }
  };
}

// src/deepReactive.js
function createDeepProxy(target, path = [], options = {}) {
  if (proxyToRaw.has(target)) {
    return target;
  }
  if (rawToProxy.has(target)) {
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
function deepReactive(target, options = {}) {
  if (target === null || typeof target !== "object") {
    throw new Error("deepReactive: target must be an object or array");
  }
  if (!isPlainObject(target) && !isArray(target)) {
    throw new Error("deepReactive: target must be a plain object or array");
  }
  return createDeepProxy(target, [], options);
}
export {
  deepReactive,
  isDeepReactive,
  markRaw,
  toRaw
};

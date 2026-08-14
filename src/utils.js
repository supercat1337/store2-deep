// @ts-check

/**
 * @file Utility functions for type checking and proxying decisions.
 */

/**
 * Checks if a value is a plain object (not an array, not a class instance, etc.)
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is a plain object.
 */
export function isPlainObject(value) {
    if (value === null || typeof value !== 'object') {return false;}
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/**
 * Checks if a value is an array.
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is an array.
 */
export function isArray(value) {
    return Array.isArray(value);
}

/**
 * Determines whether a value should be wrapped in a proxy.
 * Only plain objects and arrays are proxied, unless marked raw.
 * @param {any} value - The value to evaluate.
 * @returns {boolean} True if the value should be proxied.
 */
export function shouldProxy(value) {
    if (value === null || typeof value !== 'object') {return false;}
    if (isMarkedRaw(value)) {return false;}
    return isPlainObject(value) || isArray(value);
}

/**
 * Checks if a value has been marked as raw (should not be proxied).
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is marked raw.
 */
export function isMarkedRaw(value) {
    return value && value.__v_skip === true;
}

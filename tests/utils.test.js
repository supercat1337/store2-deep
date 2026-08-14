import test from 'ava';
import { isPlainObject, isArray, shouldProxy, isMarkedRaw } from '../src/utils.js';
import { markRaw } from '../src/raw.js';

test.serial('isPlainObject correctly identifies plain objects', t => {
    // Plain objects and Object.create(null) should return true
    t.true(isPlainObject({}));
    t.true(isPlainObject({ a: 1 }));
    t.true(isPlainObject(Object.create(null)));

    // Non-plain objects and primitives should return false
    t.false(isPlainObject(null));
    t.false(isPlainObject(undefined));
    t.false(isPlainObject(123));
    t.false(isPlainObject('string'));
    t.false(isPlainObject([]));
    t.false(isPlainObject(new Date()));
    t.false(isPlainObject(new Map()));

    class CustomClass {}
    t.false(isPlainObject(new CustomClass()));
});

test.serial('isArray correctly identifies arrays', t => {
    t.true(isArray([]));
    t.true(isArray([1, 2, 3]));
    t.false(isArray({}));
    t.false(isArray(null));
    t.false(isArray('array'));
});

test.serial('isMarkedRaw checks for __v_skip flag', t => {
    const normalObj = { a: 1 };
    t.false(isMarkedRaw(normalObj));

    const markedObj = markRaw({ b: 2 });
    t.true(isMarkedRaw(markedObj));

    // Handle primitive values safely
    t.falsy(isMarkedRaw(null));
    t.falsy(isMarkedRaw(undefined));
    t.falsy(isMarkedRaw(42));
});

test.serial('shouldProxy determines if a value should be converted to a proxy', t => {
    t.true(shouldProxy({}));
    t.true(shouldProxy([]));

    // Objects marked as raw should not be proxied
    const marked = markRaw({});
    t.false(shouldProxy(marked));

    // Primitives and complex instances should not be proxied
    t.false(shouldProxy(null));
    t.false(shouldProxy(42));
    t.false(shouldProxy('test'));
    t.false(shouldProxy(new Date()));
});

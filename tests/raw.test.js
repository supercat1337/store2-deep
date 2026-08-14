// @ts-check

import test from 'ava';
import { deepReactive } from '../src/deepReactive.js';
import { isDeepReactive, markRaw, toRaw } from '../src/raw.js';

test.serial('isDeepReactive correctly checks if an object is a proxy', t => {
    const raw = { name: 'Alice' };
    const proxy = deepReactive(raw);

    t.false(isDeepReactive(raw));
    t.true(isDeepReactive(proxy));
    t.false(isDeepReactive(null));
    t.false(isDeepReactive(123));
});

test.serial('markRaw prevents object from becoming reactive', t => {
    const rawObj = { key: 'value' };
    markRaw(rawObj);

    const state = deepReactive({ data: rawObj });

    // The nested object should remain raw
    t.false(isDeepReactive(state.data));
    t.is(state.data, rawObj);
});

test.serial('toRaw recursively unwraps deep reactive proxies', t => {
    const original = {
        user: {
            name: 'Bob',
            tags: ['admin', 'dev'],
        },
    };

    const state = deepReactive(original);
    t.true(isDeepReactive(state));
    t.true(isDeepReactive(state.user));

    const unwrapped = toRaw(state);
    t.false(isDeepReactive(unwrapped));
    t.false(isDeepReactive(unwrapped.user));
    t.deepEqual(unwrapped, original);
});

test.serial('toRaw safely handles circular references', t => {
    const circularObj = { name: 'Circular' };
    circularObj.self = circularObj;

    const proxy = deepReactive(circularObj);
    const unwrapped = toRaw(proxy);

    t.false(isDeepReactive(unwrapped));
    t.is(unwrapped.self, unwrapped);
});

test.serial('toRaw safely skips non-writable properties without throwing', t => {
    const rawObj = {};
    Object.defineProperty(rawObj, 'readOnlyProp', {
        value: deepReactive({ internal: 1 }),
        writable: false,
        configurable: true,
        enumerable: true,
    });

    const proxy = deepReactive(rawObj);

    t.notThrows(() => {
        toRaw(proxy);
    });
});

test.serial('toRaw returns non-reactive values and primitives as-is', t => {
    const plainObj = { a: 1 };
    const num = 42;
    const str = 'test';

    t.is(toRaw(plainObj), plainObj);
    t.is(toRaw(num), num);
    t.is(toRaw(str), str);
    t.is(toRaw(null), null);
});

// Закрывает строки 35-36 (циклические ссылки в seen)
test.serial('toRaw handles nested circular references correctly via seen map', t => {
    const parent = { name: 'parent' };
    const child = { name: 'child', parent: parent };
    parent.child = child;

    const state = deepReactive(parent);
    const rawResult = toRaw(state);

    t.false(isDeepReactive(rawResult));
    t.is(rawResult.child.parent, rawResult);
});

// Закрывает строки 47-52 (catch при ошибке присвоения в readonly/getter-only свойства)
test.serial('toRaw silently ignores errors when setting readonly nested reactive property', t => {
    const nested = deepReactive({ inner: 10 });
    const target = {};

    // Создаем свойство только с геттером (без сеттера), которое выбросит TypeError при попытке присвоения
    Object.defineProperty(target, 'readOnlyProp', {
        get() {
            return nested;
        },
        enumerable: true,
        configurable: true,
    });

    const state = deepReactive(target);

    // Дожно отработать без выбрасывания ошибки благодаря блоку try...catch
    t.notThrows(() => {
        toRaw(state);
    });
});

test.serial('toRaw hits seen map on direct circular proxy reference (lines 35-36)', t => {
    const parent = {};
    const state = deepReactive(parent);
    // Ссылаемся на сам прокси-объект внутри него же
    state.self = state;

    const rawResult = toRaw(state);

    t.false(isDeepReactive(rawResult));
    t.is(rawResult.self, rawResult);
});

test.serial('toRaw triggers catch block on non-writable property containing reactive value (lines 47-52)', t => {
    const childState = deepReactive({ count: 1 });
    const rawObj = {};

    // Объявляем non-writable свойство, значением которого является реактивный прокси
    Object.defineProperty(rawObj, 'readOnlyReactive', {
        value: childState,
        writable: false, // Ошибка при попытке перезаписи в strict mode / toRaw
        enumerable: true,
        configurable: true,
    });

    const state = deepReactive(rawObj);

    // toRaw попытается сделать raw[key] = unwrappedValue, выбросит TypeError,
    // который успешно перехватится блоком catch (строки 47-52)
    t.notThrows(() => {
        toRaw(state);
    });
});

test.serial('toRaw catches throwing setter during property assignment (lines 50-51)', t => {
    const childState = deepReactive({ a: 1 });

    // Создаем целевой объект с сеттером, который бросает ошибку
    const target = {};
    Object.defineProperty(target, 'failingProp', {
        get() {
            return childState;
        },
        set() {
            throw new Error('Assignment forbidden');
        },
        enumerable: true,
        configurable: true,
    });

    const state = deepReactive(target);

    // toRaw видит childState (isDeepReactive === true),
    // пытается записать результат в target.failingProp,
    // вызов сеттера выбрасывает ошибку, и она перехватывается в catch (строки 50-51)
    t.notThrows(() => {
        toRaw(state);
    });
});

test.serial('toRaw handles null and undefined branches (lines 31, 40)', t => {
    t.is(toRaw(null), null);
    t.is(toRaw(undefined), undefined);
});

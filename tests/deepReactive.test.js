// @ts-check

import test from 'ava';
import { deepReactive } from '../src/deepReactive.js';
import { isDeepReactive, markRaw } from '../src/raw.js';

test.serial('deepReactive validates input targets', t => {
    // Primitive values and null should throw an error
    t.throws(() => deepReactive(null), { message: /target must be an object or array/ });
    t.throws(() => deepReactive(123), { message: /target must be an object or array/ });
    t.throws(() => deepReactive('string'), { message: /target must be an object or array/ });

    // Non-plain objects like Date or Map should throw an error
    t.throws(() => deepReactive(new Date()), { message: /target must be a plain object or array/ });
    t.throws(() => deepReactive(new Map()), { message: /target must be a plain object or array/ });
});

test.serial('deepReactive caches proxies to avoid duplicate wrapping', t => {
    const raw = { count: 0 };
    const proxy1 = deepReactive(raw);
    const proxy2 = deepReactive(raw);

    // Wrapping raw target twice returns the same proxy
    t.is(proxy1, proxy2);

    // Wrapping an existing proxy returns itself
    const proxy3 = deepReactive(proxy1);
    t.is(proxy1, proxy3);
});

test.serial('deepReactive supports nested object wrapping lazily', t => {
    const state = deepReactive({
        profile: {
            name: 'John',
        },
    });

    t.true(isDeepReactive(state));
    t.true(isDeepReactive(state.profile));
    t.is(state.profile.name, 'John');
});

test.serial('deepReactive leaves non-plain objects and primitives intact inside target', t => {
    const date = new Date();
    const map = new Map();

    const state = deepReactive({
        num: 42,
        str: 'hello',
        date: date,
        map: map,
    });

    // Nested non-plain objects and primitives are returned as-is
    t.is(state.num, 42);
    t.is(state.str, 'hello');
    t.is(state.date, date);
    t.is(state.map, map);
});

test.serial('deepReactive returns original target if it is marked as raw', t => {
    const rawObj = markRaw({ name: 'Unreactive' });

    const result = deepReactive(rawObj);

    // Should return the exact same object without creating a proxy
    t.is(result, rawObj);
    t.false(isDeepReactive(result));
});

test.serial('deepReactive passes through non-plain objects and marked raw objects on property access', t => {
    class CustomClass {}
    const instance = new CustomClass();
    const rawObject = markRaw({ a: 1 });

    // Создаем реактивный объект, у которого внутри находятся не-plain объект и markRaw
    const state = deepReactive({
        custom: instance,
        raw: rawObject,
    });

    // При обращении к 'custom' срабатывает ловушка get -> deepReactive(instance)
    // Попадает в строки 26-27 и возвращает instance без создания proxy
    t.is(state.custom, instance);
    t.false(isDeepReactive(state.custom));

    // При обращении к 'raw' срабатывает ловушка get -> deepReactive(rawObject)
    // Попадает в строки 29-30 (isMarkedRaw) и возвращает rawObject без создания proxy
    t.is(state.raw, rawObject);
    t.false(isDeepReactive(state.raw));
});

test.serial('deepReactive execution path for nested internal objects (lines 26-27)', (t) => {
    // Создаем plain-объект, но переопределяем Symbol.toStringTag или prototype,
    // чтобы он прошел верхнюю проверку/Proxy, но споткнулся на внутренней
    const obj = {
        nested: Object.create(null) // plain-объект без прототипа
    };
    
    // Также можно проверить случай с объектом, содержащим поле с сырыми данными
    const state = deepReactive(obj);
    t.is(typeof state.nested, 'object');
});
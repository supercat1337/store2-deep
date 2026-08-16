// @ts-check

import { autorun, computed, reaction } from '@supercat1337/store2';
import { bindToProperty } from '@supercat1337/store2-dom';
import test from 'ava';
import { JSDOM } from 'jsdom';
import { deepReactive } from '../src/deepReactive.js';
import { isDeepReactive, markRaw, toRaw } from '../src/raw.js';

// Setup virtual DOM for all tests
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// ------------------------------------------------------------------
// 1. Quick Start example (from README)
// ------------------------------------------------------------------
test.serial('Quick Start: bindToProperty + computed + DOM events', t => {
    const state = deepReactive({ name: 'World' });
    const nameComputed = computed(() => state.name);
    const input = document.createElement('input');
    document.body.appendChild(input);

    const unsubscribe = bindToProperty(input, nameComputed, 'value');

    t.is(input.value, 'World');

    // User types
    input.value = 'Bob';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    // But we haven't added the event listener to update state yet!
    // In Quick Start example, they add:
    // input.addEventListener('input', () => { state.name = input.value; });
    // We'll add it now to test both directions.

    const handler = () => {
        state.name = input.value;
    };
    input.addEventListener('input', handler);

    input.value = 'Alice';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    t.is(state.name, 'Alice');
    t.is(input.value, 'Alice');

    // Direct state change
    state.name = 'Charlie';
    t.is(input.value, 'Charlie');

    input.removeEventListener('input', handler);
    unsubscribe();
    input.remove();
    t.teardown(() => {
        input.removeEventListener('input', handler);
        unsubscribe();
        input.remove();
    });
});

// ------------------------------------------------------------------
// 2. Change Tracking with onChange (from README)
// ------------------------------------------------------------------
test.serial('onChange tracks mutations with path, oldValue, newValue', t => {
    const changes = [];
    const onChange = (path, oldValue, newValue) => {
        changes.push({ path: path.join('.'), oldValue, newValue });
    };

    const state = deepReactive({ user: { name: 'Alex', age: 25 } }, { onChange });

    state.user.name = 'Alexander';
    t.is(changes.length, 1);
    t.deepEqual(changes[0], { path: 'user.name', oldValue: 'Alex', newValue: 'Alexander' });

    state.user.age = 26;
    t.is(changes.length, 2);
    t.deepEqual(changes[1], { path: 'user.age', oldValue: 25, newValue: 26 });

    delete state.user.age;
    t.is(changes.length, 3);
    t.deepEqual(changes[2], { path: 'user.age', oldValue: 26, newValue: undefined });

    // Adding new property
    state.user.tags = ['admin'];
    t.is(changes.length, 4);
    t.deepEqual(changes[3], { path: 'user.tags', oldValue: undefined, newValue: ['admin'] });
});

// ------------------------------------------------------------------
// 3. Dynamic structures and onChange (from AI_DOCS section 4.4)
// ------------------------------------------------------------------
test.serial('onChange tracks dynamic structure changes', t => {
    const changes = [];
    const onChange = (path, oldValue, newValue) => {
        changes.push({ path: path.join('.'), oldValue, newValue });
    };

    const state = deepReactive({ profile: null }, { onChange });

    // Assign nested object
    state.profile = { address: { city: 'Berlin' } };
    t.is(changes.length, 1);
    t.deepEqual(changes[0], {
        path: 'profile',
        oldValue: null,
        newValue: { address: { city: 'Berlin' } },
    });

    // Mutate nested property
    state.profile.address.city = 'Paris';
    t.is(changes.length, 2);
    t.deepEqual(changes[1], {
        path: 'profile.address.city',
        oldValue: 'Berlin',
        newValue: 'Paris',
    });

    // Delete nested property
    delete state.profile.address.city;
    t.is(changes.length, 3);
    t.deepEqual(changes[2], {
        path: 'profile.address.city',
        oldValue: 'Paris',
        newValue: undefined,
    });
});

// ------------------------------------------------------------------
// 4. Recommended two‑way binding with deepReactive (from README/AI_DOCS)
// ------------------------------------------------------------------
test.serial('Recommended pattern: computed + bindToProperty + events', t => {
    const state = deepReactive({ user: { name: 'Alice' } });
    const nameComputed = computed(() => state.user.name);
    const input = document.createElement('input');
    document.body.appendChild(input);

    const unsubscribe = bindToProperty(input, nameComputed, 'value');

    t.is(input.value, 'Alice');

    // Write back
    const handler = () => {
        state.user.name = input.value;
    };
    input.addEventListener('input', handler);

    input.value = 'Bob';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    t.is(state.user.name, 'Bob');
    t.is(input.value, 'Bob');

    // Direct state change
    state.user.name = 'Charlie';
    t.is(input.value, 'Charlie');

    input.removeEventListener('input', handler);
    unsubscribe();
    input.remove();
    t.teardown(() => {
        input.removeEventListener('input', handler);
        unsubscribe();
        input.remove();
    });
});

// ------------------------------------------------------------------
// 6. (Optional) Using reaction for custom formatting (from AI_DOCS)
// ------------------------------------------------------------------
test.serial('Using reaction for custom DOM updates (instead of bindToProperty)', t => {
    const state = deepReactive({ user: { name: 'Alex' } });
    const input = document.createElement('input');
    document.body.appendChild(input);

    let stopReaction;

    stopReaction = reaction(
        () => state.user.name,
        () => {
            input.value = state.user.name.toUpperCase();
        }
    );

    // reaction не выполняется сразу, поэтому значение не установлено
    t.is(input.value, '');

    // После изменения данных эффект срабатывает
    state.user.name = 'alex';
    t.is(input.value, 'ALEX');

    state.user.name = 'Bob';
    t.is(input.value, 'BOB');

    stopReaction();
    input.remove();
    t.teardown(() => {
        stopReaction();
        input.remove();
    });
});

// ------------------------------------------------------------------
// 7. Example: toRaw and isDeepReactive (from API docs)
// ------------------------------------------------------------------
test.serial('toRaw returns raw object, isDeepReactive identifies proxies', t => {
    const original = { a: 1, b: { c: 2 } };
    const state = deepReactive(original);

    t.true(isDeepReactive(state));
    t.false(isDeepReactive(original));

    const raw = toRaw(state);
    t.deepEqual(raw, original);
    t.not(raw, state); // raw is not the proxy
    t.is(raw.b.c, 2);

    // Nested proxies are unwrapped
    t.false(isDeepReactive(raw.b));
});

// ------------------------------------------------------------------
// 8. markRaw prevents proxying (from API docs)
// ------------------------------------------------------------------
test.serial('markRaw prevents object from being proxied', t => {
    const rawObj = { value: 42 };
    markRaw(rawObj);
    const state = deepReactive({ data: rawObj });

    t.false(isDeepReactive(state.data));
    t.is(state.data.value, 42);
});

// ------------------------------------------------------------------
// 9. Dynamic structures and autorun (real behaviour)
// ------------------------------------------------------------------
test.serial('autorun tracks dynamically added nested properties after they become available', t => {
    const state = deepReactive({ profile: null });
    let city = 'unknown';
    let runCount = 0;

    const stop = autorun(() => {
        runCount++;
        city = state.profile?.address?.city ?? 'none';
    });

    t.is(runCount, 1);
    t.is(city, 'none');

    // Присваиваем объект – это вызывает перезапуск autorun
    state.profile = { address: { city: 'Berlin' } };
    t.is(runCount, 2);
    t.is(city, 'Berlin');

    // Теперь city отслеживается, поэтому изменение вызовет ещё один перезапуск
    state.profile.address.city = 'Paris';
    t.is(runCount, 3);
    t.is(city, 'Paris');

    stop();
});

// ------------------------------------------------------------------
// 10. Using onChange for dynamic structures instead (solution)
// ------------------------------------------------------------------
test.serial('onChange works for dynamic structures', t => {
    const state = deepReactive(
        { profile: null },
        {
            onChange(path, oldValue, newValue) {
                if (path.join('.') === 'profile.address.city') {
                    // react to the change
                }
            },
        }
    );

    // Just verify that onChange is called without errors
    let called = false;
    const state2 = deepReactive(
        { profile: null },
        {
            onChange: () => {
                called = true;
            },
        }
    );

    state2.profile = { address: { city: 'Berlin' } };
    t.true(called);

    // Further nested mutation also triggers onChange
    called = false;
    state2.profile.address.city = 'Paris';
    t.true(called);
});

// @ts-check

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { deepReactive, toRaw, isDeepReactive, markRaw } from '../src/index.js';
import {
    atom,
    computed,
    autorun,
    reaction,
    when,
    waitUntil,
    batch,
    Store,
    ReactiveList,
    makeAutoObservable,
} from '@supercat1337/store2';

describe('Integration with store2 core API', () => {
    describe('autorun', () => {
        it('should track deep property changes', () => {
            const state = deepReactive({
                user: { name: 'Alex', age: 25 },
            });
            let calls = 0;
            let lastValue = '';

            const stop = autorun(() => {
                calls++;
                lastValue = state.user.name;
            });

            assert.strictEqual(calls, 1);
            assert.strictEqual(lastValue, 'Alex');

            state.user.name = 'Bob';
            assert.strictEqual(calls, 2);
            assert.strictEqual(lastValue, 'Bob');

            state.user.age = 30;
            assert.strictEqual(calls, 2);

            stop();
            state.user.name = 'Charlie';
            assert.strictEqual(calls, 2);
        });

        it('should track nested array changes', () => {
            const state = deepReactive({
                items: [1, 2, 3],
            });
            let calls = 0;
            let lastLength = 0;

            const stop = autorun(() => {
                calls++;
                lastLength = state.items.length;
            });

            assert.strictEqual(calls, 1);
            assert.strictEqual(lastLength, 3);

            state.items.push(4);
            assert.strictEqual(calls, 2);
            assert.strictEqual(lastLength, 4);

            state.items[0] = 99;
            assert.strictEqual(calls, 2);

            stop();
        });

        it('should track changes in object keys via ownKeys', () => {
            const state = deepReactive({ a: 1, b: 2 });
            /** @type {string[]} */
            let keys = [];

            const stop = autorun(() => {
                keys = Object.keys(state);
            });

            assert.deepStrictEqual(keys, ['a', 'b']);

            state.c = 3;
            assert.deepStrictEqual(keys, ['a', 'b', 'c']);

            delete state.a;
            assert.deepStrictEqual(keys, ['b', 'c']);

            stop();
        });
    });

    describe('computed', () => {
        it('should recompute when deep dependencies change', () => {
            const state = deepReactive({
                price: 10,
                quantity: 2,
            });

            const total = computed(() => state.price * state.quantity);
            assert.strictEqual(total.value, 20);

            state.price = 15;
            assert.strictEqual(total.value, 30);

            state.quantity = 3;
            assert.strictEqual(total.value, 45);
        });

        it('should work with nested computed values', () => {
            const state = deepReactive({
                user: {
                    firstName: 'Alex',
                    lastName: 'Smith',
                },
            });

            const fullName = computed(() => `${state.user.firstName} ${state.user.lastName}`);
            assert.strictEqual(fullName.value, 'Alex Smith');

            state.user.firstName = 'Alexander';
            assert.strictEqual(fullName.value, 'Alexander Smith');
        });

        it('should not recompute if dependency unchanged', () => {
            const state = deepReactive({ value: 10 });
            let computeCalls = 0;

            const double = computed(() => {
                computeCalls++;
                return state.value * 2;
            });

            assert.strictEqual(double.value, 20);
            assert.strictEqual(computeCalls, 1);

            state.other = 5;
            assert.strictEqual(double.value, 20);
            assert.strictEqual(computeCalls, 1);

            state.value = 10;
            assert.strictEqual(double.value, 20);
            assert.strictEqual(computeCalls, 1);

            state.value = 11;
            assert.strictEqual(double.value, 22);
            assert.strictEqual(computeCalls, 2);
        });
    });

    describe('reaction', () => {
        it('should trigger effect when tracked deep property changes', () => {
            const state = deepReactive({
                user: { name: 'Alex', age: 25 },
            });
            let effectCalls = 0;
            let lastName = '';

            const stop = reaction(
                () => state.user.name,
                updates => {
                    effectCalls++;
                    const record = updates?.get('');
                    if (record) {
                        lastName = record.value;
                    }
                }
            );

            assert.strictEqual(effectCalls, 0);

            state.user.name = 'Bob';
            assert.strictEqual(effectCalls, 1);
            assert.strictEqual(lastName, 'Bob');

            state.user.age = 26;
            assert.strictEqual(effectCalls, 1);

            stop();
        });

        it('should work with arrays', () => {
            const state = deepReactive({ items: ['a', 'b'] });
            let calls = 0;

            const stop = reaction(
                () => state.items.length,
                () => calls++
            );

            assert.strictEqual(calls, 0);

            state.items.push('c');
            assert.strictEqual(calls, 1);

            state.items[0] = 'x';
            assert.strictEqual(calls, 1);

            stop();
        });
    });

    describe('when / waitUntil', () => {
        it('should resolve when deep property becomes true', async () => {
            const state = deepReactive({ ready: false });

            let resolved = false;
            const stop = when(
                () => state.ready === true,
                () => {
                    resolved = true;
                }
            );

            assert.strictEqual(resolved, false);
            state.ready = true;
            assert.strictEqual(resolved, true);
            stop();
        });

        it('should work with waitUntil promise', async () => {
            /** @type {{data:null|{value:number}}} */
            const state = deepReactive({ data: null });

            const promise = waitUntil(() => state.data !== null);
            let resolved = false;

            setTimeout(() => {
                state.data = { value: 42 };
            }, 10);

            await promise;
            assert.strictEqual(state.data?.value, 42);
        });
    });

    describe('batch', () => {
        it('should batch multiple deep mutations into one notification', () => {
            const state = deepReactive({ a: 1, b: 2, c: 3 });
            let autorunCalls = 0;

            const stop = autorun(() => {
                autorunCalls++;
                state.a + state.b + state.c;
            });

            assert.strictEqual(autorunCalls, 1);

            state.a = 10;
            assert.strictEqual(autorunCalls, 2);
            state.b = 20;
            assert.strictEqual(autorunCalls, 3);
            state.c = 30;
            assert.strictEqual(autorunCalls, 4);

            batch(() => {
                state.a = 100;
                state.b = 200;
                state.c = 300;
            });
            assert.strictEqual(autorunCalls, 5);

            batch(() => {
                state.a = 1000;
                batch(() => {
                    state.b = 2000;
                    state.c = 3000;
                });
            });
            assert.strictEqual(autorunCalls, 6);

            stop();
        });

        it('should batch array mutations', () => {
            const state = deepReactive({ items: [1, 2, 3] });
            let calls = 0;

            const stop = autorun(() => {
                calls++;
                state.items.length;
            });

            assert.strictEqual(calls, 1);

            batch(() => {
                state.items.push(4);
                state.items.push(5);
                state.items.shift();
            });
            assert.strictEqual(calls, 2);

            stop();
        });
    });

    describe('toRaw and markRaw', () => {
        it('should unwrap deepReactive objects correctly', () => {
            const state = deepReactive({
                user: { name: 'Alex', profile: { age: 25 } },
                items: [1, 2, 3],
            });

            const raw = toRaw(state);
            assert.ok(!isDeepReactive(raw));
            assert.strictEqual(raw.user.name, 'Alex');
            assert.strictEqual(raw.user.profile.age, 25);
            assert.deepStrictEqual(raw.items, [1, 2, 3]);
            assert.ok(!isDeepReactive(raw.user));
            assert.ok(!isDeepReactive(raw.items));
        });

        it('should handle circular references in toRaw', () => {
            const obj = { a: 1 };
            obj.self = obj;
            const state = deepReactive(obj);
            const raw = toRaw(state);
            assert.strictEqual(raw.self, raw);
        });

        it('should respect markRaw', () => {
            const rawObj = { value: 42 };
            markRaw(rawObj);
            const state = deepReactive({ data: rawObj });
            assert.ok(!isDeepReactive(state.data));
            assert.strictEqual(state.data.value, 42);
        });
    });

    describe('makeAutoObservable compatibility', () => {
        it('should work with classes that use makeAutoObservable', () => {
            class User {
                name = 'Alex';
                age = 25;
                profile = { city: 'NYC' };
                constructor() {
                    makeAutoObservable(this);
                }
            }

            const user = new User();
            const state = deepReactive({ user });
            assert.ok(!isDeepReactive(state.user));

            let calls = 0;
            const stop = autorun(() => {
                calls++;
                state.user.name;
            });
            assert.strictEqual(calls, 1);
            state.user.name = 'Bob';
            assert.strictEqual(calls, 2);
            stop();
        });
    });

    describe('destroy lifecycle', () => {
        it('should clean up subscriptions when autorun stopped', () => {
            const state = deepReactive({ a: 1, b: { c: 2 } });
            let calls = 0;
            const stop = autorun(() => {
                calls++;
                state.a + state.b.c;
            });

            assert.strictEqual(calls, 1);
            stop();
            state.a = 10;
            assert.strictEqual(calls, 1);
        });
    });
});

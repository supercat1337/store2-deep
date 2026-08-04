// @ts-check

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { deepReactive, toRaw, isDeepReactive, markRaw } from '../src/index.js';
import { atom, computed, autorun, batch } from '@supercat1337/store2';

describe('deepReactive', () => {
    it('should create a reactive proxy for plain objects', () => {
        const state = deepReactive({ name: 'Alex', age: 25 });
        assert.ok(isDeepReactive(state));
        assert.strictEqual(state.name, 'Alex');
        assert.strictEqual(state.age, 25);
    });

    it('should create a reactive proxy for arrays', () => {
        const arr = deepReactive([1, 2, 3]);
        assert.ok(isDeepReactive(arr));
        assert.deepStrictEqual(arr, [1, 2, 3]);
    });

    it('should track nested property changes in autorun', () => {
        const state = deepReactive({ user: { name: 'Alex' } });
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

    it('should track array mutations in autorun', () => {
        const state = deepReactive({ tags: ['a', 'b'] });
        let calls = 0;
        const stop = autorun(() => {
            calls++;
            state.tags.length;
        });
        assert.strictEqual(calls, 1);
        state.tags.push('c');
        assert.strictEqual(calls, 2);
        stop();
    });

    it('should batch updates', () => {
        const state = deepReactive({ a: 1, b: 2 });
        let calls = 0;
        const stop = autorun(() => {
            calls++;
            state.a + state.b;
        });
        assert.strictEqual(calls, 1);
        batch(() => {
            state.a = 10;
            state.b = 20;
        });
        assert.strictEqual(calls, 2);
        stop();
    });

    it('should handle deleteProperty and iteration tracking', () => {
        const state = deepReactive({ a: 1, b: 2 });
        let keys = [];
        const stop = autorun(() => {
            keys = Object.keys(state);
        });
        assert.deepStrictEqual(keys, ['a', 'b']);
        delete state.b;
        assert.deepStrictEqual(keys, ['a']);
        stop();
    });

    it('should handle toRaw correctly', () => {
        const state = deepReactive({ user: { name: 'Alex' } });
        const raw = toRaw(state);
        assert.ok(!isDeepReactive(raw));
        assert.strictEqual(raw.user.name, 'Alex');
        assert.ok(!isDeepReactive(raw.user));
    });

    it('should respect markRaw', () => {
        const obj = { deep: { value: 1 } };
        markRaw(obj);
        const state = deepReactive({ data: obj });
        assert.ok(!isDeepReactive(state.data));
        assert.strictEqual(state.data.deep.value, 1);
    });

    it('should handle cyclic references', () => {
        const obj = {};
        obj.self = obj;
        const state = deepReactive(obj);
        assert.strictEqual(state.self, state);
    });
});

it('should update specific index atoms after array mutation', () => {
    const state = deepReactive({ items: ['a', 'b', 'c'] });
    let firstItem = '';
    const stop = autorun(() => {
        firstItem = state.items[0];
    });
    assert.strictEqual(firstItem, 'a');
    state.items.shift();
    assert.strictEqual(firstItem, 'b');
    stop();
});

it('should call onChange callback when property changes', () => {
    const changes = [];
    const state = deepReactive(
        { user: { name: 'Alex', age: 25 } },
        {
            onChange: (path, oldValue, newValue) => {
                changes.push({ path, oldValue, newValue });
            },
        }
    );

    state.user.name = 'Alexander';
    state.user.age = 26;
    state.user.city = 'New York';
    delete state.user.age;

    assert.strictEqual(changes.length, 4);
    assert.deepStrictEqual(changes[0].path, ['user', 'name']);
    assert.strictEqual(changes[0].oldValue, 'Alex');
    assert.strictEqual(changes[0].newValue, 'Alexander');

    assert.deepStrictEqual(changes[1].path, ['user', 'age']);
    assert.strictEqual(changes[1].oldValue, 25);
    assert.strictEqual(changes[1].newValue, 26);

    assert.deepStrictEqual(changes[2].path, ['user', 'city']);
    assert.strictEqual(changes[2].oldValue, undefined);
    assert.strictEqual(changes[2].newValue, 'New York');

    assert.deepStrictEqual(changes[3].path, ['user', 'age']);
    assert.strictEqual(changes[3].oldValue, 26);
    assert.strictEqual(changes[3].newValue, undefined);
});

it('should call onChange for array mutations', () => {
    const changes = [];
    const state = deepReactive(
        { items: ['a', 'b', 'c'] },
        {
            onChange: (path, oldValue, newValue) => {
                changes.push({ path, oldValue, newValue });
            },
        }
    );

    state.items.push('d');
    // Ожидаем изменения:
    // - индекс 3: undefined → 'd'
    // - length: 3 → 4

    assert.ok(changes.length >= 2);
    // Проверим последнее изменение — length
    const lengthChange = changes.find(c => c.path[c.path.length - 1] === 'length');
    assert.ok(lengthChange);
    assert.strictEqual(lengthChange.oldValue, 3);
    assert.strictEqual(lengthChange.newValue, 4);

    // Проверим индекс 3
    const idxChange = changes.find(c => c.path[c.path.length - 1] === '3');
    assert.ok(idxChange);
    assert.strictEqual(idxChange.oldValue, undefined);
    assert.strictEqual(idxChange.newValue, 'd');

    // Очистим и проверим shift
    changes.length = 0;
    state.items.shift(); // удаляем 'a', теперь элементы: ['b','c','d']

    // Ожидаем изменения:
    // - индекс 0: 'a' → 'b'
    // - индекс 1: 'b' → 'c'
    // - индекс 2: 'c' → 'd'
    // - length: 4 → 3

    assert.ok(changes.length >= 4);
    // Проверим length
    const lengthChange2 = changes.find(c => c.path[c.path.length - 1] === 'length');
    assert.ok(lengthChange2);
    assert.strictEqual(lengthChange2.oldValue, 4);
    assert.strictEqual(lengthChange2.newValue, 3);
});

it('should handle complex nested structures with arrays of objects', () => {
    const initial = {
        users: [
            { id: 1, name: 'Alice', profile: { age: 30, city: 'NYC' } },
            { id: 2, name: 'Bob', profile: { age: 25, city: 'LA' } },
        ],
        settings: {
            theme: 'dark',
            notifications: {
                email: true,
                push: false,
            },
        },
    };

    /** @type {{ path: string, oldVal:any, newVal:any }[]} */
    const changes = [];
    const state = deepReactive(initial, {
        onChange: (path, oldVal, newVal) => {
            changes.push({ path: path.join('.'), oldVal, newVal });
        },
    });

    // 1. Изменение глубокого свойства
    state.users[0].profile.age = 31;
    state.settings.notifications.email = false;

    // 2. Добавление нового пользователя
    state.users.push({ id: 3, name: 'Charlie', profile: { age: 28, city: 'SF' } });

    // 3. Удаление пользователя (splice)
    state.users.splice(1, 1); // удаляем Bob (индекс 1)

    // Проверка изменения длины
    const lengthAfterSplice = changes.find(
        c => c.path === 'users.length' && c.oldVal === 3 && c.newVal === 2
    );
    assert.ok(lengthAfterSplice, 'length change after splice not tracked');

    // Проверка сдвига: индекс 1 теперь Charlie (был Bob)
    const bobReplaced = changes.find(
        c =>
            c.path === 'users.1' &&
            c.oldVal &&
            c.oldVal.name === 'Bob' &&
            c.newVal &&
            c.newVal.name === 'Charlie'
    );
    assert.ok(bobReplaced, 'Bob replaced by Charlie not tracked');

    // Проверка удаления последнего индекса (индекс 2 был Charlie, стал undefined)
    const charlieRemoved = changes.find(
        c =>
            c.path === 'users.2' &&
            c.oldVal &&
            c.oldVal.name === 'Charlie' &&
            c.newVal === undefined
    );
    assert.ok(charlieRemoved, 'Charlie removal (index 2) not tracked');

    // 4. Сортировка пользователей по id
    state.users.sort((a, b) => a.id - b.id);

    // 5. Изменение всего массива (замена)
    state.users = [{ id: 10, name: 'Dave', profile: { age: 35, city: 'Chicago' } }];

    // 6. Проверка toRaw
    const raw = toRaw(state);
    assert.deepStrictEqual(raw, {
        users: [{ id: 10, name: 'Dave', profile: { age: 35, city: 'Chicago' } }],
        settings: {
            theme: 'dark',
            notifications: {
                email: false,
                push: false,
            },
        },
    });

    // 7. Проверка onChange вызовов (минимум 5 изменений)
    assert.ok(changes.length >= 5, 'onChange not called enough times');

    // Проверка конкретных изменений
    const ageChange = changes.find(c => c.path === 'users.0.profile.age');
    assert.ok(ageChange, 'age change not tracked');
    assert.strictEqual(ageChange.oldVal, 30);
    assert.strictEqual(ageChange.newVal, 31);

    const emailChange = changes.find(c => c.path === 'settings.notifications.email');
    assert.ok(emailChange);
    assert.strictEqual(emailChange.oldVal, true);
    assert.strictEqual(emailChange.newVal, false);

    // Проверка изменения длины при push
    const lengthPush = changes.find(
        c => c.path === 'users.length' && c.oldVal === 2 && c.newVal === 3
    );
    assert.ok(lengthPush, 'length change on push not tracked');

    // Проверка удаления через splice
    const spliceRemove = changes.find(
        c =>
            c.path === 'users.2' &&
            c.oldVal &&
            c.oldVal.name === 'Charlie' &&
            c.newVal === undefined
    );
    assert.ok(spliceRemove, 'removal of user (last index) not tracked');

    // Проверка сортировки (должны быть изменения индексов)
    const sortChanges = changes.filter(
        c => c.path.startsWith('users.') && c.path !== 'users.length'
    );
    assert.ok(sortChanges.length > 0, 'sort changes not tracked');

    // Проверка замены всего массива
    const replace = changes.find(
        c =>
            c.path === 'users' &&
            c.oldVal &&
            c.oldVal.length === 2 &&
            c.newVal &&
            c.newVal.length === 1
    );
    assert.ok(replace, 'full array replacement not tracked');
});

it('should handle readonly properties in toRaw', () => {
    const obj = Object.create(null);
    Object.defineProperty(obj, 'readonly', {
        value: 42,
        writable: false,
        configurable: true,
    });
    obj.mutable = { value: 1 };

    const state = deepReactive(obj);
    const raw = toRaw(state);
    assert.strictEqual(raw.readonly, 42);
    assert.strictEqual(raw.mutable.value, 1);
    // toRaw should not throw for readonly
});

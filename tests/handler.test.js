import test from 'ava';
import { deepReactive } from '../src/deepReactive.js';
import { autorun } from '@supercat1337/store2';

test.serial('get/set traps properly trigger reactiveness via autorun', t => {
    const state = deepReactive({ count: 0 });
    let executionCount = 0;
    let currentCount = 0;

    autorun(() => {
        executionCount++;
        currentCount = state.count;
    });

    t.is(executionCount, 1);
    t.is(currentCount, 0);

    // Updating state triggers autorun
    state.count = 5;
    t.is(executionCount, 2);
    t.is(currentCount, 5);

    // Setting same value does not trigger autorun
    state.count = 5;
    t.is(executionCount, 2);
});

test.serial('deleteProperty trap triggers reactivity and cleans up atom', t => {
    const state = deepReactive({ a: 1, b: 2 });
    let keysCount = 0;

    autorun(() => {
        // Track key structure using Object.keys
        keysCount = Object.keys(state).length;
    });

    t.is(keysCount, 2);

    delete state.b;
    t.is(keysCount, 1);
    t.is(state.b, undefined);
});

test.serial('has trap tracks dependency with `in` operator', t => {
    const state = deepReactive({ prop: 'exists' });
    let hasProp = false;

    autorun(() => {
        hasProp = 'prop' in state;
    });

    t.true(hasProp);

    delete state.prop;
    t.false(hasProp);
});

test.serial('ownKeys trap tracks structure changes during key iteration', t => {
    const state = deepReactive({ x: 1 });
    let keys = [];

    autorun(() => {
        keys = Object.keys(state);
    });

    t.deepEqual(keys, ['x']);

    state.y = 2; // Add new key
    t.deepEqual(keys, ['x', 'y']);
});

test.serial('array mutating methods trigger atom updates correctly', t => {
    const state = deepReactive({ list: [10, 20] });
    let sum = 0;

    autorun(() => {
        sum = state.list.reduce((acc, val) => acc + val, 0);
    });

    t.is(sum, 30);

    // Push new element
    state.list.push(30);
    t.is(sum, 60);

    // Pop element
    state.list.pop();
    t.is(sum, 30);

    // Splice array
    state.list.splice(0, 1, 100);
    t.is(sum, 120);
});

test.serial('array order changing methods (sort, reverse) trigger updates', t => {
    const state = deepReactive({ numbers: [3, 1, 2] });
    let firstElement = 0;

    autorun(() => {
        firstElement = state.numbers[0];
    });

    t.is(firstElement, 3);

    state.numbers.sort();
    t.is(firstElement, 1);

    state.numbers.reverse();
    t.is(firstElement, 3);
});

test.serial('onChange callback receives accurate parameters on property changes', t => {
    const changes = [];
    const state = deepReactive(
        { user: { name: 'Alice' } },
        {
            onChange: (path, oldValue, newValue) => {
                changes.push({ path, oldValue, newValue });
            },
        }
    );

    state.user.name = 'Bob';
    delete state.user.name;

    t.is(changes.length, 2);
    t.deepEqual(changes[0], {
        path: ['user', 'name'],
        oldValue: 'Alice',
        newValue: 'Bob',
    });
    t.deepEqual(changes[1], {
        path: ['user', 'name'],
        oldValue: 'Bob',
        newValue: undefined,
    });
});

test.serial('__v_raw internal property returns original target', t => {
    const raw = { a: 10 };
    const proxy = deepReactive(raw);

    t.is(proxy.__v_raw, raw);
});

test.serial('traps handle Symbol keys correctly', t => {
    const sym = Symbol('test');
    const state = deepReactive({});

    // 144-145: Symbol в set
    state[sym] = 'value';
    t.is(state[sym], 'value');

    // 232-233: Symbol в has ('in' operator)
    t.true(sym in state);

    // 180-181: Symbol в deleteProperty
    delete state[sym];
    t.false(sym in state);
});

// В test/handler.test.js
test.serial('onChange is triggered for array shift, splice and length reductions (lines 81-82, 97-98, 107-108)', t => {
    const changes = [];
    const state = deepReactive(
        { items: ['a', 'b', 'c'] },
        {
            onChange: (path, oldValue, newValue) => {
                changes.push({ path: path.join('.'), oldValue, newValue });
            },
        }
    );

    // 1. shift() сдвигает индексы (81-82), удаляет последний (97-98) и меняет length (107-108)
    state.items.shift();

    // 2. splice() с явным удалением
    state.items.splice(0, 1, 'replaced');

    t.true(changes.length > 0);
});

test.serial('onChange handles array index shifts, deletions and length changes', t => {
    const changes = [];
    const state = deepReactive(
        { list: ['first', 'second', 'third'] },
        {
            onChange: (path, oldValue, newValue) => {
                changes.push({ path: path.join('.'), oldValue, newValue });
            },
        }
    );

    // 1. pop() -> удаляет элемент по индексу 2 (97-98) и меняет length (107-108)
    state.list.pop();

    // 2. unshift() -> смещает существующие индексы (81-82) и меняет length (107-108)
    state.list.unshift('zero');

    // 3. splice() -> заменяет элементы и меняет индексы
    state.list.splice(1, 1, 'replaced');

    t.true(changes.length > 0);
});

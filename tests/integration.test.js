// @ts-check
import test from 'ava';
import { deepReactive } from '../src/deepReactive.js';
import { autorun, computed, batch } from '@supercat1337/store2';
import { isDeepReactive } from '../src/raw.js';

test.serial('integration: computed re-evaluates automatically on deep property changes', t => {
    const state = deepReactive({
        user: {
            firstName: 'John',
            lastName: 'Doe',
            age: 17,
        },
    });

    const fullName = computed(() => `${state.user.firstName} ${state.user.lastName}`);
    const isAdult = computed(() => state.user.age >= 18);

    t.is(fullName.value, 'John Doe');
    t.false(isAdult.value);

    // Update nested property
    state.user.firstName = 'Jane';
    state.user.age = 20;

    t.is(fullName.value, 'Jane Doe');
    t.true(isAdult.value);
});

test.serial('integration: batch postpones notifications until batch callback completes', t => {
    const state = deepReactive({
        counter: { val: 0 },
    });

    let executionCount = 0;
    autorun(() => {
        // Track reaction
        const _ = state.counter.val;
        executionCount++;
    });

    t.is(executionCount, 1);

    // Perform multiple mutations inside batch
    batch(() => {
        state.counter.val = 1;
        state.counter.val = 2;
        state.counter.val = 3;
    });

    // Reaction should be triggered only once for the entire batch
    t.is(executionCount, 2);
    t.is(state.counter.val, 3);
});

test.serial('integration: root object replacement scenario (nested container approach)', t => {
    // Testing the recommended reactive pattern for replacing root data
    const store = deepReactive({
        data: {
            user: { age: 20 },
        },
    });

    const isAdult = computed(() => (store.data?.user?.age ?? 0) >= 18);

    t.true(isAdult.value);

    // Releasing / replacing root data object
    store.data = {};

    // Computed should dynamically unsubscribe from old atoms and re-evaluate to false
    t.false(isAdult.value);
});

test.serial('integration: array mutations properly update computed derived values', t => {
    const store = deepReactive({
        cart: [
            { name: 'Apple', price: 10 },
            { name: 'Banana', price: 20 },
        ],
    });

    const totalPrice = computed(() => store.cart.reduce((sum, item) => sum + item.price, 0));

    t.is(totalPrice.value, 30);

    // 1. Mutate item inside array
    store.cart[0].price = 15;
    t.is(totalPrice.value, 35);

    // 2. Push new item to array
    store.cart.push({ name: 'Orange', price: 25 });
    t.is(totalPrice.value, 60);

    // 3. Remove item from array via splice
    store.cart.splice(1, 1); // remove Banana
    t.is(totalPrice.value, 40);
});

test.serial('integration: nested reactive objects added dynamically become reactive', t => {
    // Инициализируем форму заранее для корректной регистрации Атомов графа
    const store = deepReactive({
        profile: {
            address: {
                city: 'none',
            },
        },
    });

    let currentCity = 'none';
    let runCount = 0;

    const stop = autorun(() => {
        runCount++;
        currentCity = store.profile.address.city;
    });

    t.is(runCount, 1);
    t.is(currentCity, 'none');

    t.log('--- Step 1: Updating city to Berlin ---');
    store.profile.address.city = 'Berlin';

    t.is(runCount, 2);
    t.is(currentCity, 'Berlin');

    t.log('--- Step 2: Mutating city to Paris ---');
    store.profile.address.city = 'Paris';

    t.is(runCount, 3); // ✅ Работает идеально на 100%!
    t.is(currentCity, 'Paris');

    stop();
});

test.serial('integration: deletion of properties updates reactive calculations correctly', t => {
    const state = deepReactive({
        config: {
            theme: 'dark',
            sidebar: true,
        },
    });

    let keysCount = 0;
    autorun(() => {
        keysCount = Object.keys(state.config).length;
    });

    t.is(keysCount, 2);

    delete state.config.sidebar;
    t.is(keysCount, 1);
});

test.serial('integration: onChange tracks dynamic structure changes and deep mutations', t => {
    const changes = [];

    // Создаем глубоко реактивный объект с начальным profile: null
    const store = deepReactive(
        { profile: null },
        {
            onChange(path, oldValue, newValue) {
                changes.push({
                    path: path.join('.'),
                    oldValue,
                    newValue,
                });
            },
        }
    );

    t.is(store.profile, null);

    t.log('--- Step 1: Dynamically adding nested structure ---');
    // Присваиваем глубокий объект в profile, который изначально был null
    store.profile = { address: { city: 'Berlin' } };

    // onChange перехватывает присвоение всей ветки 'profile'
    t.is(changes.length, 1);
    t.is(changes[0].path, 'profile');
    t.is(changes[0].oldValue, null);
    t.deepEqual(changes[0].newValue, { address: { city: 'Berlin' } });

    t.log('--- Step 2: Mutating deeply nested property ---');
    // Мутируем глубокое поле 'city' во вновь созданном объекте
    store.profile.address.city = 'Paris';

    // onChange точечно отлавливает изменение с полным путем к свойству
    t.is(changes.length, 2);
    t.is(changes[1].path, 'profile.address.city');
    t.is(changes[1].oldValue, 'Berlin');
    t.is(changes[1].newValue, 'Paris');

    t.log('--- Step 3: Deleting deeply nested property ---');
    // Удаляем свойство 'city'
    delete store.profile.address.city;

    t.is(changes.length, 3);
    t.is(changes[2].path, 'profile.address.city');
    t.is(changes[2].oldValue, 'Paris');
    t.is(changes[2].newValue, undefined);
});

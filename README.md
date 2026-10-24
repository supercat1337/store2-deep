# @supercat1337/store2-deep

Deep reactivity for `@supercat1337/store2` — mutable nested state with granular, per-property updates.

[![npm version](https://badge.fury.io/js/%40supercat1337%2Fstore2-deep.svg)](https://www.npmjs.com/package/@supercat1337/store2-deep)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@supercat1337/store2-deep)](https://bundlephobia.com/package/@supercat1337/store2-deep)

Mutate deeply nested objects and arrays directly — no immutable boilerplate. Every property is backed by its own `Atom` from `store2`, so only the exact fields read inside `autorun` or `computed` trigger recomputation. Works with `batch()`, `Store`, `ReactiveList`, and the rest of the `store2` ecosystem.

---

## Installation

```bash
npm install @supercat1337/store2-deep @supercat1337/store2
```

---

## Quick start

```js
import { deepReactive } from '@supercat1337/store2-deep';
import { autorun } from '@supercat1337/store2';

const state = deepReactive({ user: { name: 'Alex', age: 25 } });

autorun(() => {
    console.log(`User name: ${state.user.name}`);
});

state.user.name = 'Alexander'; // Logs: "User name: Alexander"
```

---

## API

### `deepReactive(target, options?)`

Wraps a plain object or array into a deeply reactive proxy.

```js
const state = deepReactive({ nested: { value: 42 } });
```

### `toRaw(proxy)`

Returns the raw (unproxied) object. Handles circular references safely and skips read-only properties.

```js
const raw = toRaw(state);
```

### `isDeepReactive(value)`

Returns `true` if `value` is a deep reactive proxy.

```js
if (isDeepReactive(state)) {
    /* ... */
}
```

### `markRaw(target)`

Marks an object so `deepReactive` will never proxy it — useful for DOM nodes and external library instances.

```js
const obj = { value: 42 };
markRaw(obj);
const state = deepReactive({ data: obj });
// state.data is the raw object, not a proxy
```

---

## Options

### `onChange(path, oldValue, newValue, target)`

Optional callback invoked on every mutation.

```js
const state = deepReactive(
    { user: { name: 'Alex', age: 25 } },
    {
        onChange: (path, oldValue, newValue) => {
            console.log(`${path.join('.')} changed from ${oldValue} to ${newValue}`);
        },
    }
);

state.user.name = 'Alexander';
// Logs: user.name changed from Alex to Alexander

delete state.user.age;
// Logs: user.age changed from 25 to undefined
```

`path` is an array of strings — `['user', 'name']` for objects, `['items', '0']` for array indices. Useful for logging, persistence, time-travel debugging, and external integrations.

---

## Integration with `store2`

All `store2` primitives work directly on deep reactive objects.

```js
import { autorun, computed, reaction, batch } from '@supercat1337/store2';

autorun(() => console.log(state.user.name));

const fullName = computed(() => `${state.user.firstName} ${state.user.lastName}`);

reaction(
    () => state.user.name,
    name => console.log('Name changed to', name)
);

batch(() => {
    state.user.name = 'Bob';
    state.user.age = 30;
});
```

### Dynamic structures

By default, dependencies are **re-collected on every run**. If a property was not read during the first run (because its parent was `null`), it will be tracked as soon as it becomes available. Set `{ recomputeDependencies: false }` to freeze the dependency set.

To track **addition or deletion of keys**, iterate over the object (`Object.keys`, `for...in`, etc.) — this subscribes to the per-object `ITERATE` atom. Alternatively, use a `computed` that iterates keys, or pre-initialise the shape with `null`/`undefined`.

### DOM binding with `store2-dom`

Two-way bindings (`bindToInput`, `bindToCheckbox`, `bindToSelect`) require a mutable `Atom` and **do not work** with `deepReactive` proxies or `computed`. The recommended pattern:

```js
import { bindToProperty } from '@supercat1337/store2-dom';
import { computed } from '@supercat1337/store2';

const nameComputed = computed(() => state.user.name);
bindToProperty(input, nameComputed, 'value');

input.addEventListener('input', () => {
    state.user.name = input.value;
});
```

---

## Examples

Runnable demos live in [`demo/`](https://github.com/supercat1337/store2-deep/tree/main/demo) in this repository. Open `demo/index.html` through any static file server (ES modules require `http://`, not `file://`).

> The demos are planned to be moved into a dedicated examples package. In the meantime, see also [`store2-examples`](https://github.com/supercat1337/store2-examples).

---

## Documentation

- [`AGENTS.md`](https://github.com/supercat1337/store2-deep/blob/main/AGENTS.md) — detailed API guide, dynamic structure handling, common pitfalls.
- [`ARCHITECTURE.md`](https://github.com/supercat1337/store2-deep/blob/main/ARCHITECTURE.md) — proxy traps, atom registry, array handling, batching.
- [`etc/store2-deep.api.md`](https://github.com/supercat1337/store2-deep/blob/main/etc/store2-deep.api.md) — machine-generated public API snapshot.

---

## Related

- [`@supercat1337/store2`](https://www.npmjs.com/package/@supercat1337/store2) — core reactive state management.
- [`@supercat1337/store2-dom`](https://www.npmjs.com/package/@supercat1337/store2-dom) — DOM bindings.
- [`@supercat1337/store2-devtools`](https://www.npmjs.com/package/@supercat1337/store2-devtools) — DevTools plugin.

---

## License

MIT © 2025–2026 Albert Bazaleev

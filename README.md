# @supercat1337/store2-deep

**Deep reactivity for `@supercat1337/store2`** — mutable nested state with granular updates.

[![npm version](https://badge.fury.io/js/%40supercat1337%2Fstore2-deep.svg)](https://www.npmjs.com/package/@supercat1337/store2-deep)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@supercat1337/store2-deep)](https://bundlephobia.com/package/@supercat1337/store2-deep)

---

## Why store2-deep?

- **Mutable nested state** – update deeply nested objects directly, no immutable boilerplate.
- **Granular reactivity** – only the exact properties used in `autorun`/`computed` trigger updates.
- **Seamless integration** – works with `batch()`, `Store`, `ReactiveList`, and all other `store2` APIs.
- **Lightweight** – built on `Proxy` and `WeakMap`, no heavy dependencies.
- **Full TypeScript support** – includes type definitions.
- **Change tracking** – optional `onChange` callback with path, old and new values.

---

## Installation

```bash
npm install @supercat1337/store2-deep @supercat1337/store2
```

---

## Quick Start

```js
import { deepReactive } from '@supercat1337/store2-deep';
import { autorun, batch } from '@supercat1337/store2';

const state = deepReactive({
    user: {
        name: 'Alex',
        tags: ['admin', 'dev'],
    },
    settings: {
        theme: 'dark',
    },
});

autorun(() => {
    console.log(state.user.name, state.settings.theme);
});
// Logs: "Alex dark"

// Direct mutations — no immutable updates needed!
state.user.name = 'Alexander'; // triggers autorun
state.user.tags.push('lead'); // triggers autorun
state.settings.theme = 'light'; // triggers autorun

// Batch multiple changes
batch(() => {
    state.user.name = 'Sasha';
    state.settings.theme = 'light';
}); // single autorun execution
```

---

## API

### `deepReactive<T>(target: T, options?: DeepReactiveOptions): T`

Wraps a plain object or array into a deeply reactive proxy.

```js
const state = deepReactive({ nested: { value: 42 } });
```

**Options:**

| Option     | Type                                                                     | Description                         |
| ---------- | ------------------------------------------------------------------------ | ----------------------------------- |
| `onChange` | `(path: string[], oldValue: any, newValue: any, target: object) => void` | Callback invoked on every mutation. |

### `toRaw(proxy): any`

Returns the raw (unproxied) object. Handles circular references safely.

```js
const raw = toRaw(state);
```

### `isDeepReactive(value): boolean`

Checks if a value is a deep reactive proxy.

```js
if (isDeepReactive(state)) {
    /* ... */
}
```

### `markRaw(target): target`

Marks an object as raw – it will not be proxied even if used inside a deep reactive object.

```js
const obj = { value: 42 };
markRaw(obj);
const state = deepReactive({ data: obj });
// state.data is the raw object, not a proxy
```

---

## Advanced: Change Tracking with `onChange`

You can pass an `onChange` callback to `deepReactive` to track every mutation:

```js
const state = deepReactive(
    { user: { name: 'Alex', age: 25 } },
    {
        onChange: (path, oldValue, newValue, target) => {
            console.log(`${path.join('.')} changed from ${oldValue} to ${newValue}`);
        },
    }
);

state.user.name = 'Alexander';
// Logs: user.name changed from Alex to Alexander

state.user.age = 26;
// Logs: user.age changed from 25 to 26

delete state.user.age;
// Logs: user.age changed from 26 to undefined

// Adding a new property
state.user.tags = ['admin'];
// Logs: user.tags changed from undefined to ['admin']
```

The `onChange` callback receives:

- `path` – The path to the changed property as an array of strings (e.g., `['user', 'name']` or `['items', '0']` for array indices).
- `oldValue` – The previous value (or `undefined` if the property is new).
- `newValue` – The new value (or `undefined` if deleted).
- `target` – The raw object that contains the property.

This is useful for:

- Debugging and logging
- Persistence (saving changes to localStorage, server, etc.)
- Time-travel debugging
- Integration with external systems

---

## Integration with store2 APIs

All `store2` primitives work seamlessly with deep-reactive objects.

### `autorun`

```js
autorun(() => {
    console.log(state.user.name);
});
```

### `computed`

```js
const fullName = computed(() => `${state.user.firstName} ${state.user.lastName}`);
```

### `reaction`

```js
reaction(
    () => state.user.name,
    name => console.log('Name changed to', name)
);
```

### `batch`

```js
batch(() => {
    state.user.name = 'Bob';
    state.user.age = 30;
});
```

### `when` / `waitUntil`

```js
when(
    () => state.ready === true,
    () => console.log('Ready!')
);

await waitUntil(() => state.data !== null);
```

---

## TypeScript

The package ships with its own type definitions. Import types if needed:

```typescript
import type { DeepReactive, DeepReactiveOptions } from '@supercat1337/store2-deep';

const state: DeepReactive<{ user: { name: string } }> = deepReactive({ user: { name: 'Alex' } });
```

---

## How It Works

- Each property of the reactive object has its own **`Atom`** from `store2`.
- Reads track dependencies via `Engine` (same as `atom.value`).
- Writes update the corresponding atom and notify dependents.
- Arrays and their mutating methods (`push`, `pop`, `splice`, etc.) are intercepted for batch updates.
- Structure changes (`delete`, new keys) are tracked via a special `ITERATE` atom.

For a deep dive into the internals, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).
For LLM prompts, guidelines, and detailed pitfall prevention, see [`AI_DOCS.md`](./AI_DOCS.md).

---

## License

MIT © 2025–2026 Albert Bazaleev

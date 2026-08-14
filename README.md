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
import { autorun } from '@supercat1337/store2';

const state = deepReactive({ user: { name: 'Alex', age: 25 } });

// Reactive effect automatically tracks state.user.name
autorun(() => {
    console.log(`User name: ${state.user.name}`);
});

state.user.name = 'Alexander'; // Logs: "User name: Alexander"
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

### Important: Dynamic Structures and Dependency Collection

`autorun`, `computed` and `reaction` collect dependencies **only once** – during the first execution of the tracked function. If you access properties that do not exist at that moment (e.g., `state.profile?.address?.city` when `profile` is `null`), they **will not** be tracked. Later assignments to those properties will not trigger updates.

**Recommendations:**

- **Stable shape** – initialise all levels even with `null`/`undefined` to ensure all atoms exist from the start.
- **Dynamic shape** – use the `onChange` callback to react to mutations when the structure is unknown or changes at runtime.

For more details, see the [full documentation on dynamic structures](https://www.google.com/search?q=./AI_DOCS.md%2344-dynamic-structures-static-dependency-collection-and-iterate-atom).

---

### Integration with store2-dom

You can easily connect `deepReactive` state to the DOM using `@supercat1337/store2-dom`. The recommended pattern is:

1. Create `computed` getters for each property you want to display.
2. Use `bindToProperty` or `bindToText` to update the DOM when the computed value changes.
3. For user input, listen to DOM events and mutate the proxy directly – no need to create `Atom` instances manually.

**Example – two‑way binding with an input:**

```js
import { deepReactive } from '@supercat1337/store2-deep';
import { bindToProperty } from '@supercat1337/store2-dom';
import { computed } from '@supercat1337/store2';

const state = deepReactive({
    user: { name: 'Alice', age: 30 },
});

// Computed getter – reads from the proxy
const nameComputed = computed(() => state.user.name);

// Bind to input.value – updates DOM when state changes
const input = document.getElementById('name');
bindToProperty(input, nameComputed, 'value');

// Write back to the proxy on user input
input.addEventListener('input', () => {
    state.user.name = input.value;
});
```

> **⚠️ Important:** Two‑way bindings like `bindToInput`, `bindToCheckbox`, `bindToSelect`, etc. are designed for **`Atom` instances with a setter**. They **cannot** be used directly with `computed` or with deep reactive proxies.
> For `deepReactive`, always follow the pattern shown above: `computed` + `bindToProperty` (or `bindToText`) + manual DOM events. This is the recommended and most reliable way.

---

### Array Interoperability

Methods that read all elements (such as `.map()`, `.filter()`, `.indexOf()`, or `.forEach()`) automatically subscribe to all index atoms and the array `length`. Mutating methods (`.push()`, `.splice()`, `.sort()`, etc.) execute inside an automatic `batch()`.

### Lifecycle & Memory Management

Dispose of effects and bindings when components unmount:

```js
const stop = autorun(() => console.log(state.value));
stop(); // Unsubscribe effect

const unsub = bindToProperty(el, myComputed, 'value');
unsub(); // Unsubscribe DOM binding
```

Nested reactive objects are held via `WeakMap` references and will be garbage‑collected automatically when deleted or reassigned to `null`.

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
    > - **Structure & Key Changes**: Iterating over object keys (e.g., `Object.keys(proxy)`, `for...in`) subscribes to a special per‑object `ITERATE` atom, triggering updates when keys are added or deleted.
    > - **Granular Property Atoms**: Property reads lazily allocate an `Atom` for that specific key. Direct access to non‑existent dynamic keys requires initialising key placeholders or using `computed` iteration.

For a deep dive into the internals, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).
For LLM prompts, guidelines, and detailed pitfall prevention, see [`AI_DOCS.md`](./AI_DOCS.md).

---

## License

MIT © 2025–2026 Albert Bazaleev

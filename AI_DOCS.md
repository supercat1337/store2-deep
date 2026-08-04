# AI Documentation: @supercat1337/store2-deep

**Deep reactivity extension for `@supercat1337/store2`**  
Granular, mutable nested state with per‑property atoms and full integration with `store2` core.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Installation](#2-installation)
3. [API Reference](#3-api-reference)
    - [3.1. `deepReactive(target, options?)`](#31-deepreactivetarget-options)
    - [3.2. `toRaw(proxy)`](#32-torawproxy)
    - [3.3. `isDeepReactive(value)`](#33-isdeepreactivevalue)
    - [3.4. `markRaw(target)`](#34-markrawtarget)
    - [3.5. `DeepReactiveOptions`](#35-deepreactiveoptions)
4. [Integration with store2 APIs](#4-integration-with-store2-apis)
    - [4.1. `autorun`, `computed`, `reaction`](#41-autorun-computed-reaction)
    - [4.2. `batch`](#42-batch)
    - [4.3. `when` / `waitUntil`](#43-when--waituntil)
5. [Internal Mechanics](#5-internal-mechanics)
    - [5.1. Per‑Property Atoms](#51-perproperty-atoms)
    - [5.2. Lazy Atom Creation](#52-lazy-atom-creation)
    - [5.3. Array Handling](#53-array-handling)
    - [5.4. `onChange` Callback](#54-onchange-callback)
    - [5.5. `toRaw` and Read‑Only Properties](#55-toraw-and-readonly-properties)
6. [Common Pitfalls for AI-Generated Code](#6-common-pitfalls-for-ai-generated-code)
7. [TypeScript Support](#7-typescript-support)
8. [License](#8-license)

---

## 1. Overview

`@supercat1337/store2-deep` enables **deep reactivity** for plain objects and arrays. Every property of a deep‑reactive object is backed by its own `Atom` from `store2`, allowing **granular updates** – only the exact properties used in an `autorun`/`computed` will trigger recomputation.

The package works seamlessly with all `store2` APIs: `autorun`, `computed`, `reaction`, `batch`, `when`, `waitUntil`, `Store`, and `ReactiveList`. It also provides `onChange` callbacks for change tracking, and utilities like `toRaw`, `markRaw`, and `isDeepReactive`.

---

## 2. Installation

```bash
npm install @supercat1337/store2-deep @supercat1337/store2
```

---

## 3. API Reference

### 3.1. `deepReactive(target, options?)`

Creates a deeply reactive proxy for a plain object or array.

- **Parameters**:
    - `target` (`object | any[]`) – a plain object or array.
    - `options` (optional `DeepReactiveOptions`) – configuration.
- **Returns** – a deeply reactive proxy that behaves like the original object.

```js
import { deepReactive } from '@supercat1337/store2-deep';

const state = deepReactive({
    user: { name: 'Alex', age: 25 },
});
```

### 3.2. `toRaw(proxy)`

Returns the original raw (unproxied) object. Recursively unwraps nested proxies and handles circular references. Safe for read‑only properties.

- **Parameters**: `proxy` – a deep reactive proxy.
- **Returns** – the raw object.

```js
const raw = toRaw(state); // raw === original plain object
```

### 3.3. `isDeepReactive(value)`

Checks if a value is a deep reactive proxy.

- **Parameters**: `value` – any value.
- **Returns** – `true` if the value is a deep reactive proxy.

### 3.4. `markRaw(target)`

Marks an object so that `deepReactive` will never proxy it. Useful for external library instances, DOM elements, etc.

- **Parameters**: `target` – an object.
- **Returns** – the same object with a hidden `__v_skip` property.

```js
const rawObj = { value: 42 };
markRaw(rawObj);
const state = deepReactive({ data: rawObj });
// state.data is the raw object, not a proxy
```

### 3.5. `DeepReactiveOptions`

An optional configuration object for `deepReactive`:

```ts
interface DeepReactiveOptions {
    /**
     * Callback invoked on every mutation.
     * @param path – array of strings (e.g., ['user', 'name'] or ['items', '0'] for array indices)
     * @param oldValue – previous value
     * @param newValue – new value (undefined on delete)
     * @param target – the raw object containing the property
     */
    onChange?: (path: string[], oldValue: any, newValue: any, target: object) => void;
}
```

---

## 4. Integration with store2 APIs

### 4.1. `autorun`, `computed`, `reaction`

All `store2` reactivity primitives work with deep‑reactive proxies exactly like with regular `Atom`s.

```js
import { autorun, computed, reaction } from '@supercat1337/store2';

const state = deepReactive({ a: 1, b: 2 });

// autorun – runs when any accessed property changes
autorun(() => {
    console.log(state.a + state.b);
});

// computed – caches result and updates only when dependencies change
const sum = computed(() => state.a + state.b);

// reaction – runs effect only when the tracked data changes
reaction(
    () => state.a,
    newA => console.log('a changed to', newA)
);
```

### 4.2. `batch`

Batch multiple mutations to notify subscribers only once.

```js
import { batch } from '@supercat1337/store2';

batch(() => {
    state.a = 10;
    state.b = 20;
});
// Only one notification
```

### 4.3. `when` / `waitUntil`

Asynchronous helpers work with deep properties.

```js
import { when, waitUntil } from '@supercat1337/store2';

when(
    () => state.ready === true,
    () => console.log('Ready!')
);

await waitUntil(() => state.data !== null);
```

---

## 5. Internal Mechanics

### 5.1. Per‑Property Atoms

Each property of a deep‑reactive object is backed by its own `Atom` from `store2`. This enables granular dependency tracking – only the atoms actually read inside an effect will trigger updates.

- **Read**: `state.user.name` → accesses the atom for `['user', 'name']` and calls `.value`, which registers a dependency in the current `Engine`.
- **Write**: `state.user.name = 'Bob'` → updates the atom’s `.value`, notifying all dependents.

### 5.2. Lazy Atom Creation

Atoms are created **lazily** – only when a property is first accessed. This avoids upfront allocation for properties that are never used reactively.

### 5.3. Array Handling

Arrays are fully supported with special handling for mutating methods (`push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`):

- **Pre‑mutation state** – saves `oldLength` and a shallow copy of values.
- **Batched updates** – all atom updates (indices and length) are wrapped in a single `batch()` call.
- **Order‑changing methods** – `sort` and `reverse` force updates for all indices, even if values are equal, to correctly propagate order changes.
- **Removed indices** – when length decreases, atoms for removed indices are destroyed and `onChange` is called with `newValue = undefined`.

### 5.4. `onChange` Callback

The `onChange` callback is invoked on:

- Property assignment (`set` trap) – with the full path, old and new values.
- Property deletion (`deleteProperty` trap) – with `newValue = undefined`.
- Array mutations – for each affected index and for the `length` property.

### 5.5. `toRaw` and Read‑Only Properties

`toRaw` unwraps nested proxies recursively. It checks property descriptors to avoid modifying read‑only properties (getters without setters) and gracefully skips them.

---

## 6. Common Pitfalls for AI-Generated Code

1. **Mutating raw objects** – always mutate the **proxy**, not the raw object. Use the proxy returned by `deepReactive`.

2. **Destructuring** – avoid destructuring reactive properties inside `autorun`/`computed`:

    ```js
    // ❌
    const { name } = state.user;
    autorun(() => console.log(name)); // name is a static value, no reactivity
    // ✅
    autorun(() => console.log(state.user.name));
    ```

3. **Using `toRaw` in reactive contexts** – `toRaw` returns the raw object, which is **not reactive**. Use it only for serialisation or debugging.

4. **Forgetting to `batch`** – for multiple mutations, always use `batch()` to avoid intermediate notifications.

5. **Mutating arrays via index assignment** – `state.items[0] = 10` is fine; it triggers reactivity for that index. But for bulk changes, prefer methods like `push`, `splice`, etc., which are optimised and batched.

6. **Using `markRaw` on objects that should be reactive** – `markRaw` prevents proxying. Only use it for objects that should remain non‑reactive (e.g., DOM elements, external library instances).

7. **Expecting `onChange` to fire for every nested property** – `onChange` fires only for **direct mutations** on the proxy. If you mutate a nested object through a reference (e.g., `state.user = newUser`), it fires for the `user` property, but not for individual fields inside `newUser` unless they were previously read in an effect.

8. **Not cleaning up `autorun`/`reaction`** – always store the returned `stop` function and call it when the component/effect is destroyed to prevent memory leaks.

---

## 7. TypeScript Support

The package ships with its own type definitions (`src/types.d.ts`). You can import them:

```ts
import type { DeepReactive, DeepReactiveOptions } from '@supercat1337/store2-deep';

const state: DeepReactive<{ user: { name: string } }> = deepReactive({ user: { name: 'Alex' } });
```

All utility functions are fully typed.

---

## 8. License

MIT © 2025–2026 Albert Bazaleev

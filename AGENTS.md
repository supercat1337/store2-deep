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
    - [4.4. Dynamic Structures, Static Dependency Collection, and `ITERATE` Atom](#44-dynamic-structures-static-dependency-collection-and-iterate-atom)
    - [4.5. DOM Binding with store2-dom (Best Practices)](#45-dom-binding-with-store2-dom-best-practices)
5. [Internal Mechanics](#5-internal-mechanics)
    - [5.1. Per‑Property Atoms](#51-perproperty-atoms)
    - [5.2. Lazy Atom Creation](#52-lazy-atom-creation)
    - [5.3. Array Handling](#53-array-handling)
        - [5.3.1. Working with Arrays & Methods](#531-working-with-arrays--methods)
    - [5.4. `onChange` Callback](#54-onchange-callback)
    - [5.5. `toRaw` and Read‑Only Properties](#55-toraw-and-readonly-properties)
    - [5.6. Lifecycle & Cleanup](#56-lifecycle--cleanup)
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

### 4.4. Dynamic Structures, Static Dependency Collection, and `ITERATE` Atom

> By default, `autorun`, `computed` and `reaction` **re‑collect dependencies on every run** (the `recomputeDependencies` option is `true`).  
> This means that if a property was not accessed during the first run (e.g., because a parent was `null`), it will be tracked as soon as it becomes available and is read in a subsequent run.  
> If you need static dependency collection (like in MobX), set `{ recomputeDependencies: false }` – then dependencies are fixed at the first run and never updated.
>
> To track **addition or deletion of keys**, use iteration (`Object.keys`, `for...in`, etc.). This registers a dependency on the special `ITERATE` atom and causes the effect to re‑run when the set of keys changes.

#### How Key Set Changes are Tracked (`ITERATE` Atom)

Changes to the set of keys (adding or deleting properties) are tracked when you **iterate** over an object (e.g., using `Object.keys()`, `Object.values()`, `Object.entries()`, or `for...in`). Internally, this registers a dependency on a special per‑object `ITERATE` atom.

```js
const state = deepReactive({ users: { alex: { age: 25 } } });

// ✅ TRACKED via ITERATE atom:
autorun(() => {
    console.log('User list:', Object.keys(state.users));
});

state.users.bob = { age: 30 }; // ✅ Triggers autorun (logs: ['alex', 'bob'])
delete state.users.alex; // ✅ Triggers autorun (logs: ['bob'])
```

#### Direct Access to Non‑existent Properties

If you directly access a nested property that does not exist during the first run (e.g., using optional chaining `?.`), the engine cannot attach an Atom to that missing property.

```js
const state = deepReactive({ profile: null });

autorun(() => {
    console.log(state.profile?.address?.city);
});

state.profile = { address: { city: 'Berlin' } }; // ✅ Triggers autorun (profile changed)
// Now `address` and `city` are read in the subsequent run and become tracked.
state.profile.address.city = 'Paris'; // ✅ Now triggers autorun because city is now tracked
```

> **Note:** If you never read a nested property (e.g., you only read `state.profile` without accessing `address` or `city`), then changes to `address.city` will not trigger the effect because those properties were never tracked. To track dynamic keys, use iteration or pre‑initialise the shape.

#### Recommended Patterns for Dynamic Shapes

**1. Preferred: Declarative iteration via `computed**`

Wrap dynamic objects into a `computed` that iterates over keys or values:

```js
const state = deepReactive({ items: {} });

const itemKeys = computed(() => Object.keys(state.items));

autorun(() => {
    console.log('Current keys:', itemKeys.value);
});

state.items.a = 1; // ✅ triggers autorun because `itemKeys` recomputes
```

**2. Pre‑initialise the shape**

If the structure is known, initialise nested keys with `null` or `undefined` so their atoms are allocated eagerly:

```js
const state = deepReactive({
    profile: { address: { city: null } },
});
// Now `state.profile.address.city` is tracked from the start
```

**3. Use `onChange` for imperative side‑effects**

Use `onChange` for logging, persistence, or external synchronization, rather than as a replacement for UI reactivity:

```js
const state = deepReactive(
    { profile: null },
    {
        onChange(path, oldValue, newValue) {
            console.log(`Mutation at ${path.join('.')}:`, newValue);
        },
    }
);
```

### 4.5. DOM Binding with store2-dom (Best Practices)

`deepReactive` proxies use `Proxy` traps rather than direct `Atom` setters. Therefore, **two‑way bindings like `bindToInput`, `bindToCheckbox`, or `bindToSelect` do NOT work directly with `deepReactive` properties or `computed` getters**.

If you attempt to pass a `computed` or a deep property to `bindToInput`, you will encounter errors because the binding cannot update the reactive item.

**The Recommended Pattern:**

1. Create a `computed` getter for reading state.
2. Bind state to DOM via `bindToProperty` or `bindToText`.
3. Handle DOM events manually to write updates back to the proxy.

```js
import { deepReactive } from '@supercat1337/store2-deep';
import { bindToProperty } from '@supercat1337/store2-dom';
import { computed } from '@supercat1337/store2';

const state = deepReactive({ user: { name: 'Alex' } });
const nameComputed = computed(() => state.user.name);
const input = document.getElementById('name');

// State → DOM
bindToProperty(input, nameComputed, 'value');

// DOM → State
input.addEventListener('input', () => {
    state.user.name = input.value;
});
```

**Why this pattern is safe and recommended:**

- `bindToInput` expects an `Atom` with a setter. `computed` is read‑only, so `bindToInput` cannot update it.
- It keeps the data flow explicit and unidirectional (state → DOM via computed, DOM → State via events).
- It avoids accidental infinite update loops and works reliably with `autoDisconnect` and `AbortSignal`.

> **⚠️ Important:** Do **not** attempt to synchronise an `Atom` with a deep reactive property using `reaction` or `autorun` in both directions – this is error‑prone and may cause update loops.

---

## 5. Internal Mechanics

### 5.1. Per‑Property Atoms

Each property of a deep‑reactive object is backed by its own `Atom` from `store2`. This enables granular dependency tracking – only the atoms actually read inside an effect will trigger updates.

- **Read**: `state.user.name` → accesses the atom for `['user', 'name']` and calls `.value`, which registers a dependency in the current `Engine`.
- **Write**: `state.user.name = 'Bob'` → updates the atom’s `.value`, notifying all dependents.

### 5.2. Lazy Atom Creation

Atoms are created **lazily** – only when a property is first accessed. This avoids upfront allocation for properties that are never used reactively.

### 5.3. Array Handling & Methods

Arrays are fully supported with special handling for mutating methods (`push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`) and reading methods:

- **Index Access (`state.items[0]`)** – Subscribes the current effect specifically to index `0`.
- **Length Access (`state.items.length`)** – Subscribes specifically to array length changes.
- **Iteration Methods (`map`, `filter`, `forEach`, `reduce`, `find`, `includes`, `indexOf`)** – Since these methods read every element and the `length` property, calling them inside `autorun` or `computed` automatically subscribes the effect to **all index atoms** and the **length atom**.
- **Mutating Methods**:
- Executed inside an internal `batch()` so subscribers are notified once per method call.
- `sort` and `reverse` invalidate all index atoms to ensure subscriber recalculation regardless of value equality.
- Decreasing array length disposes removed index atoms and triggers `onChange` with `newValue = undefined`.

### 5.4. `onChange` Callback

The `onChange` callback is invoked on:

- Property assignment (`set` trap) – with the full path, old and new values.
- Property deletion (`deleteProperty` trap) – with `newValue = undefined`.
- Array mutations – for each affected index and for the `length` property.

### 5.5. `toRaw` and Read‑Only Properties

`toRaw` unwraps nested proxies recursively. It checks property descriptors to avoid modifying read‑only properties (getters without setters) and gracefully skips them.

### 5.6. Lifecycle & Cleanup

To prevent memory leaks, always clean up reactive subscriptions when components or modules unmount.

```js
import { autorun, reaction, computed } from '@supercat1337/store2';
import { bindToProperty } from '@supercat1337/store2-dom';

// 1. autorun / reaction return a disposer function
const stopAutorun = autorun(() => console.log(state.user.name));
const stopReaction = reaction(
    () => state.user.name,
    name => console.log(name)
);

// Unmount / Cleanup:
stopAutorun();
stopReaction();

// 2. store2-dom bindings return an unsubscribe function
const unsub = bindToProperty(inputElement, nameComputed, 'value');
unsub(); // Removes DOM listener and unsubscribes from computed

// 3. Garbage Collection for deepReactive
// Memory for inner atoms is managed via WeakMap.
// Deleting properties (`delete state.user`) or assigning `null` allows unreferenced
// nested proxies and their associated atoms to be garbage-collected automatically.
```

---

## 6. Common Pitfalls for AI-Generated Code

1. **Mutating raw objects** – always mutate the **proxy**, not the raw object. Use the proxy returned by `deepReactive`.

2. **Destructuring Proxy Properties** – destructuring extracts the raw underlying value at execution time, severing the Proxy getter hook:

    ```js
    // ❌ Destructuring breaks reactivity
    const { name } = state.user;
    autorun(() => console.log(name)); // name is static

    // ✅ Always access properties through the reactive proxy
    autorun(() => console.log(state.user.name));
    ```

3. **Using `toRaw` in reactive contexts** – `toRaw` returns the raw object, which is **not reactive**. Use it only for serialisation or debugging.

4. **Forgetting to `batch`** – for multiple mutations, always use `batch()` to avoid intermediate notifications.

5. **Mutating arrays via index assignment** – `state.items[0] = 10` is fine; it triggers reactivity for that index. But for bulk changes, prefer methods like `push`, `splice`, etc., which are optimised and batched.

6. **Using `markRaw` on objects that should be reactive** – `markRaw` prevents proxying. Only use it for objects that should remain non‑reactive (e.g., DOM elements, external library instances).

7. **Expecting `onChange` to fire for every nested property** – `onChange` fires only for **direct mutations** on the proxy. If you mutate a nested object through a reference (e.g., `state.user = newUser`), it fires for the `user` property, but not for individual fields inside `newUser` unless they were previously read in an effect.

8. **Not cleaning up `autorun`/`reaction`** – always store the returned `stop` function and call it when the component/effect is destroyed to prevent memory leaks.

9. **Using `bindToInput` with `computed` from `deepReactive`** –
   ❌ `bindToInput(input, computed(() => state.user.name))` – throws an error because `computed` has no setter.
   ✅ Use `bindToProperty(input, computed, 'value')` and handle input events manually.

10. **Directly reading from `user` inside `reaction` without a getter** –
    ❌ `reaction(() => user, ...)` – tracks the whole object, causing unnecessary updates.
    ✅ `reaction(() => user.profile.name, ...)` – tracks only the specific property.

11. **Assuming `autorun`/`computed` will never pick up dynamically added properties** – by default, dependencies are re‑collected on every run. If a property was not accessed during the first run (e.g., because a parent was `null`), it will be tracked as soon as it becomes available and is read in a subsequent run. However, if you set `{ recomputeDependencies: false }`, dependencies are fixed at the first run and dynamic properties will not be tracked. Use `onChange` for fully dynamic structures, or pre‑initialise the shape.

12. **Using two‑way DOM bindings (`bindToInput`, `bindToCheckbox`, etc.) with `computed` or `deepReactive`** – these bindings expect a mutable `Atom` with a setter. Passing a `computed` or a deep property will throw an error or fail silently. Always use `bindToProperty` (or `bindToText`) and manual event listeners for `deepReactive`.

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

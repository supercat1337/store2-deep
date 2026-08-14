// @ts-check

import { autorun, computed } from '@supercat1337/store2';
import { deepReactive } from '@supercat1337/store2-deep';
import { bindToText, getElementById } from '@supercat1337/store2-dom';

/**
 * Deep reactive state with dynamic keys.
 */
const state = deepReactive({
    items: {
        apple: 'fruit',
        carrot: 'vegetable',
    },
});

/**
 * Computed array of keys – this subscribes to key changes via ITERATE atom.
 */
const keysComputed = computed(() => Object.keys(state.items));

/** Computed JSON representation. */
const jsonComputed = computed(() => JSON.stringify(state.items, null, 2));

// DOM elements
const keyInput = getElementById('key-input', HTMLInputElement);
const valueInput = getElementById('value-input', HTMLInputElement);
const addBtn = getElementById('add-btn', HTMLButtonElement);
const deleteBtn = getElementById('delete-btn', HTMLButtonElement);
const selectEl = getElementById('key-select', HTMLSelectElement);
const previewEl = getElementById('state-preview', HTMLElement);

// Bind JSON preview
bindToText(previewEl, jsonComputed);

// Rebuild select options when keys change
autorun(() => {
    const currentValue = selectEl.value;
    const keys = keysComputed.value;
    selectEl.innerHTML = keys.map(k => `<option value="${k}">${k}</option>`).join('');
    if (keys.includes(currentValue)) {
        selectEl.value = currentValue;
    }
});

// Add / update
addBtn.addEventListener('click', () => {
    const key = keyInput.value.trim();
    const val = valueInput.value.trim();
    if (!key) return;
    state.items[key] = val;
    keyInput.value = '';
    valueInput.value = '';
    selectEl.value = key;
});

// Delete
deleteBtn.addEventListener('click', () => {
    const key = selectEl.value;
    if (!key || !(key in state.items)) return;
    delete state.items[key];
    if (selectEl.options.length > 0) {
        selectEl.selectedIndex = 0;
    }
});

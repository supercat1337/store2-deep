// @ts-check

import { deepReactive } from '@supercat1337/store2-deep';
import { computed } from '@supercat1337/store2';
import { bindToText, getElementById } from '@supercat1337/store2-dom';

/**
 * Reactive state with deep nesting.
 */
const state = deepReactive({
    counter: {
        value: 0,
    },
});

/**
 * Computed getter for the counter value.
 */
const counterComputed = computed(() => state.counter.value);

/** Computed JSON representation of the whole state. */
const jsonComputed = computed(() => JSON.stringify(state, null, 2));

// DOM elements
const displayEl = getElementById('counter-display', HTMLElement);
const jsonEl = getElementById('json-preview', HTMLElement);
const incBtn = getElementById('inc-btn', HTMLButtonElement);
const decBtn = getElementById('dec-btn', HTMLButtonElement);
const resetBtn = getElementById('reset-btn', HTMLButtonElement);

// Bindings (state → DOM)
bindToText(displayEl, counterComputed);
bindToText(jsonEl, jsonComputed);

// Event handlers (DOM → state)
incBtn.addEventListener('click', () => {
    state.counter.value += 1;
});

decBtn.addEventListener('click', () => {
    state.counter.value -= 1;
});

resetBtn.addEventListener('click', () => {
    state.counter.value = 0;
});

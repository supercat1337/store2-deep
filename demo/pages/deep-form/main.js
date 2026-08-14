// @ts-check

import { deepReactive } from '@supercat1337/store2-deep';
import { computed } from '@supercat1337/store2';
import { bindToProperty, bindToText, getElementById } from '@supercat1337/store2-dom';

/**
 * Deep reactive state with nested user profile.
 */
const state = deepReactive({
    user: {
        firstName: 'Ivan',
        lastName: 'Petrov',
        address: {
            city: 'Moscow',
        },
        age: 30,
    },
});

// Computed getters for each field
const firstNameComputed = computed(() => state.user.firstName);
const lastNameComputed = computed(() => state.user.lastName);
const cityComputed = computed(() => state.user.address.city);
const ageComputed = computed(() => state.user.age);
const fullInfoComputed = computed(() => JSON.stringify(state, null, 2));

// DOM elements
const firstNameInput = getElementById('firstName', HTMLInputElement);
const lastNameInput = getElementById('lastName', HTMLInputElement);
const cityInput = getElementById('city', HTMLInputElement);
const ageInput = getElementById('age', HTMLInputElement);
const previewEl = getElementById('preview', HTMLElement);

// Bindings: state → DOM
bindToProperty(firstNameInput, firstNameComputed, 'value');
bindToProperty(lastNameInput, lastNameComputed, 'value');
bindToProperty(cityInput, cityComputed, 'value');
bindToProperty(ageInput, ageComputed, 'value');
bindToText(previewEl, fullInfoComputed);

// Write‑back: DOM → state
firstNameInput.addEventListener('input', () => {
    state.user.firstName = firstNameInput.value;
});
lastNameInput.addEventListener('input', () => {
    state.user.lastName = lastNameInput.value;
});
cityInput.addEventListener('input', () => {
    state.user.address.city = cityInput.value;
});
ageInput.addEventListener('input', () => {
    state.user.age = Number(ageInput.value);
});

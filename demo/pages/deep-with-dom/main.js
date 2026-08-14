// @ts-check

import { deepReactive } from '@supercat1337/store2-deep';
import { computed } from '@supercat1337/store2';
import {
    bindToProperty,
    bindToText,
    bindToCssClass,
    getElementById,
} from '@supercat1337/store2-dom';

/**
 * Deep reactive state.
 */
const state = deepReactive({
    user: {
        name: 'Alice',
        email: 'alice@example.com',
        role: 'user',
        active: true,
    },
});

// Computed getters
const nameComputed = computed(() => state.user.name);
const emailComputed = computed(() => state.user.email);
const roleComputed = computed(() => state.user.role);
const activeComputed = computed(() => state.user.active);
const jsonComputed = computed(() => JSON.stringify(state, null, 2));

// DOM elements
const nameInput = getElementById('name-input', HTMLInputElement);
const emailInput = getElementById('email-input', HTMLInputElement);
const roleSelect = getElementById('role-select', HTMLSelectElement);
const activeCheckbox = getElementById('active-checkbox', HTMLInputElement);
const previewEl = getElementById('profile-preview', HTMLElement);

// State → DOM
bindToProperty(nameInput, nameComputed, 'value');
bindToProperty(emailInput, emailComputed, 'value');
bindToProperty(roleSelect, roleComputed, 'value');
bindToProperty(activeCheckbox, activeComputed, 'checked');
bindToText(previewEl, jsonComputed);

// Class toggling for preview (just for demonstration)
bindToCssClass(previewEl, activeComputed, 'active-user');

// DOM → State
nameInput.addEventListener('input', () => {
    state.user.name = nameInput.value;
});
emailInput.addEventListener('input', () => {
    state.user.email = emailInput.value;
});
roleSelect.addEventListener('change', () => {
    state.user.role = roleSelect.value;
});
activeCheckbox.addEventListener('change', () => {
    state.user.active = activeCheckbox.checked;
});

// @ts-check

import { deepReactive } from '@supercat1337/store2-deep';
import { batch } from '@supercat1337/store2';
import { getElementById } from '@supercat1337/store2-dom';

/** @type {string[]} */
const logMessages = [];

/**
 * Format a value for logging.
 * @param {any} val - The value to format.
 * @returns {string} Formatted string.
 */
function formatValue(val) {
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    if (typeof val === 'object') {
        try {
            return JSON.stringify(val, null, 2);
        } catch {
            return String(val);
        }
    }
    return String(val);
}

/**
 * Append a message to the log and update the DOM.
 * @param {string} msg
 */
function log(msg) {
    logMessages.push(msg);
    const output = getElementById('log-output', HTMLElement);
    output.textContent = logMessages.join('\n');
}

/**
 * Deep reactive state with onChange callback.
 */
const state = deepReactive(
    {
        user: {
            name: 'Alex',
            age: 25,
        },
    },
    {
        onChange(path, oldValue, newValue) {
            const pathStr = path.join('.');
            const oldStr = formatValue(oldValue);
            const newStr = formatValue(newValue);
            log(`[onChange] ${pathStr}: ${oldStr} → ${newStr}`);
        },
    }
);

// DOM buttons
const changeNameBtn = getElementById('change-name', HTMLButtonElement);
const changeAgeBtn = getElementById('change-age', HTMLButtonElement);
const addAddressBtn = getElementById('add-address', HTMLButtonElement);
const deleteAddressBtn = getElementById('delete-address', HTMLButtonElement);

changeNameBtn.addEventListener('click', () => {
    state.user.name = state.user.name === 'Alex' ? 'Alexander' : 'Alex';
});

changeAgeBtn.addEventListener('click', () => {
    state.user.age += 1;
});

addAddressBtn.addEventListener('click', () => {
    batch(() => {
        state.user = { ...state.user, address: { city: 'Moscow' } };
    });
});

deleteAddressBtn.addEventListener('click', () => {
    if ('address' in state.user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        delete state.user.address;
    }
});

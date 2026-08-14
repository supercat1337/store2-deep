// @ts-check

import { deepReactive } from '@supercat1337/store2-deep';
import { collection, computed } from '@supercat1337/store2';
import {
    bindToList,
    bindToText,
    getDiffs,
    getElement,
    getElementById,
    ListItemHelper,
    ListItemUpdateContext,
} from '@supercat1337/store2-dom';

/**
 * @typedef {Object} Todo
 * @property {number} id
 * @property {string} text
 * @property {boolean} done
 */

// Reactive state – filter is a simple property
const state = deepReactive({
    filter: 'all',
});

// Reactive collection for todos
const todos = collection([
    { id: 1, text: 'Learn store2-deep', done: true },
    { id: 2, text: 'Build todo app', done: false },
    { id: 3, text: 'Write documentation', done: false },
]);

/**
 * Computed filtered list.
 */
const filteredTodos = computed(() => {
    const all = todos.value;
    const f = state.filter;
    if (f === 'all') return [...all];
    if (f === 'active') return all.filter(t => !t.done);
    if (f === 'completed') return all.filter(t => t.done);
    return [...all];
});

/**
 * Computed statistics.
 */
const stats = computed(() => {
    const all = todos.value;
    const total = all.length;
    const done = all.filter(t => t.done).length;
    const active = total - done;
    return `Total: ${total} | Active: ${active} | Done: ${done}`;
});

// DOM elements
const todoListEl = getElementById('todo-list', HTMLUListElement);
const statsEl = getElementById('todo-stats', HTMLSpanElement);
const newTodoInput = getElementById('new-todo-input', HTMLInputElement);
const addBtn = getElementById('add-todo-btn', HTMLButtonElement);
const clearBtn = getElementById('clear-completed-btn', HTMLButtonElement);
const filterBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (
    document.querySelectorAll('.filters button')
);

// Bind stats
bindToText(statsEl, stats);

// Filter buttons
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filter = /** @type {string} */ (btn.dataset.filter);
    });
});

// Add todo
addBtn.addEventListener('click', () => {
    const text = newTodoInput.value.trim();
    if (!text) return;
    const newId = todos.value.length > 0 ? Math.max(...todos.value.map(t => t.id)) + 1 : 1;
    todos.value.push({ id: newId, text, done: false });
    newTodoInput.value = '';
});
newTodoInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addBtn.click();
});

// Clear completed
clearBtn.addEventListener('click', () => {
    todos.value = todos.value.filter(t => !t.done);
});

// ─── Event Delegation ────────────────────────────────────────

// Delegated click handler for item deletion
todoListEl.addEventListener('click', e => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (!target.classList.contains('todo-delete')) return;

    const li = target.closest('li');
    if (!li) return;

    const id = Number(li.dataset.id);
    const index = todos.value.findIndex(t => t.id === id);
    if (index !== -1) {
        todos.value.splice(index, 1);
    }
});

// Delegated change handler for checkbox toggling
todoListEl.addEventListener('change', e => {
    const target = /** @type {HTMLInputElement} */ (e.target);
    if (!target.classList.contains('todo-checkbox')) return;

    const li = target.closest('li');
    if (!li) return;

    const id = Number(li.dataset.id);
    const item = todos.value.find(t => t.id === id);
    if (item) {
        item.done = target.checked;
        li.classList.toggle('done', target.checked);
    }
});

// ─── bindToList ───────────────────────────────────────────────

/**
 * Creates a new <li> element for a todo item from the template.
 * Event listeners are managed via delegation on the parent <ul> container.
 * @param {ListItemHelper} helper
 * @returns {HTMLElement}
 */
function createTodoItem(helper) {
    const template = helper.getTemplate();
    if (!template) throw new Error('No template for todo list');
    return template;
}

/**
 * Updates a todo <li> element when data changes.
 * @param {ListItemHelper} helper
 * @param {ListItemUpdateContext<Todo>} details
 */
function updateTodoItem(helper, details) {
    // 1. Защитная проверка: если данных нет, ничего не обновляем
    if (!details || !details.value) return;

    const li = details.itemElement;

    // Attach dataset ID to enable event delegation matching
    li.dataset.id = String(details.value.id);

    // Use getElement with type and root for type-safe element access
    const checkbox = getElement('.todo-checkbox', HTMLInputElement, li);
    const textSpan = getElement('.todo-text', HTMLSpanElement, li);
    const idSpan = getElement('.todo-id', HTMLSpanElement, li);

    const diffs = getDiffs(details.value, details.oldValue || {});
    if (diffs.text) {
        textSpan.textContent = details.value.text;
    }
    if (diffs.done) {
        checkbox.checked = details.value.done;
        li.classList.toggle('done', details.value.done);
    }
    if (diffs.id) {
        idSpan.textContent = String(details.value.id);
    }
}

// Bind the list
bindToList(todoListEl, filteredTodos, updateTodoItem, createTodoItem, {
    debounceTime: 0,
    autoDisconnect: true,
});

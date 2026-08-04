// @ts-check

/**
 * @file WeakMap caches for proxies and atoms.
 */

import { atom } from '@supercat1337/store2';

/**
 * Cache: raw object -> its reactive proxy.
 * @type {WeakMap<object, object>}
 */
export const rawToProxy = new WeakMap();

/**
 * Cache: reactive proxy -> its raw object.
 * @type {WeakMap<object, object>}
 */
export const proxyToRaw = new WeakMap();

/**
 * Cache: raw object -> Map(property key -> Atom).
 * Each property of a reactive object has its own Atom.
 * @type {WeakMap<object, Map<string|symbol, import('@supercat1337/store2').Atom<any>>>}
 */
export const objectAtoms = new WeakMap();

/**
 * Special symbol used to track changes in the set of keys (iteration).
 */
export const ITERATE_KEY = Symbol('iterate');

/**
 * Gets or creates the atom map for a raw object.
 * @param {object} target - The raw object.
 * @returns {Map<string|symbol, import('@supercat1337/store2').Atom<any>>}
 */
export function getAtomsMap(target) {
    let map = objectAtoms.get(target);
    if (!map) {
        map = new Map();
        objectAtoms.set(target, map);
    }
    return map;
}

/**
 * Gets an atom for a property of a raw object. Optionally creates it.
 * @param {object} target - The raw object.
 * @param {string|symbol} prop - The property key.
 * @param {boolean} [create=false] - Whether to create the atom if it doesn't exist.
 * @returns {import('@supercat1337/store2').Atom<any> | null}
 */
export function getAtom(target, prop, create = false) {
    const map = objectAtoms.get(target);
    if (!map) {
        if (!create) return null;
        const newMap = new Map();
        objectAtoms.set(target, newMap);
        return createAtomForProp(target, prop, newMap);
    }
    let atomRef = map.get(prop);
    if (!atomRef && create) {
        atomRef = createAtomForProp(target, prop, map);
    }
    return atomRef || null;
}

/**
 * Internal: creates a new Atom for a property and stores it in the map.
 * @param {object} target - The raw object.
 * @param {string|symbol} prop - The property key.
 * @param {Map<string|symbol, import('@supercat1337/store2').Atom<any>>} map - The atom map.
 * @returns {import('@supercat1337/store2').Atom<any>}
 */
function createAtomForProp(target, prop, map) {
    const value = target[prop];
    const newAtom = atom(value);
    map.set(prop, newAtom);
    return newAtom;
}

/**
 * Gets the iterate atom for a target (tracks addition/removal of keys).
 * @param {object} target - The raw object.
 * @param {boolean} [create=false] - Whether to create the atom if it doesn't exist.
 * @returns {import('@supercat1337/store2').Atom<any> | null}
 */
export function getIterateAtom(target, create = false) {
    return getAtom(target, ITERATE_KEY, create);
}

/**
 * Notifies that the structure of an object has changed (keys added/removed).
 * @param {object} target - The raw object.
 */
export function notifyIterate(target) {
    const atomRef = getIterateAtom(target, false);
    if (atomRef) {
        // Trigger the iterate atom by assigning a new value.
        atomRef.value = Symbol('iterated');
    }
}

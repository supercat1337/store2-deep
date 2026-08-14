import test from 'ava';
import {
    getAtomsMap,
    getAtom,
    getIterateAtom,
    notifyIterate,
    objectAtoms,
    ITERATE_KEY,
} from '../src/atomRegistry.js';

test.serial('getAtomsMap creates and caches an atom map for a target', t => {
    const target = { a: 1 };
    const map1 = getAtomsMap(target);
    const map2 = getAtomsMap(target);

    t.true(map1 instanceof Map);
    t.is(map1, map2);
});

test.serial('getAtom retrieves or lazily creates an atom for a property', t => {
    const target = { x: 10 };

    // Do not create atom if create flag is false
    t.is(getAtom(target, 'x', false), null);

    // Create atom when create flag is true
    const atomRef = getAtom(target, 'x', true);
    t.not(atomRef, null);
    t.is(atomRef.value, 10);

    // Re-retrieving should return the same atom instance
    const sameAtom = getAtom(target, 'x', false);
    t.is(sameAtom, atomRef);
});

test.serial('getIterateAtom creates and retrieves atom for iteration tracking', t => {
    const target = { a: 1 };

    t.is(getIterateAtom(target, false), null);

    const iterateAtom = getIterateAtom(target, true);
    t.not(iterateAtom, null);

    const map = objectAtoms.get(target);
    t.is(map.get(ITERATE_KEY), iterateAtom);
});

test.serial('notifyIterate updates iterate atom value if it exists', t => {
    const target = { a: 1 };
    const iterateAtom = getIterateAtom(target, true);
    const initialVal = iterateAtom.value;

    notifyIterate(target);

    // Value should change to trigger dependent effects
    t.not(iterateAtom.value, initialVal);
    t.is(typeof iterateAtom.value, 'symbol');
});

// The safety choke-point (spec 03 §4 S9 / [O1]).
//
// The sensitive-register fence used to live in three places — the generator's
// pool builder, the collision matrix, and the fill gate — which meant a new V2
// mode (party, personas, Real-or-Generated) could route around it just by drawing
// its words a slightly different way. That is exactly the failure the fence exists
// to prevent: the indigenous register is deliberately seeds-only, because random
// collision can't guarantee the satire punches at the consultant rather than the
// tradition (spec 01 §5a).
//
// So: ONE gate, here. Every mode inherits it because every mode draws through the
// generator's pools, and safety.test.ts asserts the invariant end-to-end.

import type { Family, Register } from './types';

/** Families fenced out of random collision — seeds only (spec 01 §5a, 02 §4.5). */
export const SENSITIVE_FAMILIES: ReadonlySet<Family> = new Set<Family>(['indigenous']);

/** May this family appear in a generated (non-seed) question? */
export function isFamilyDrawable(family: Family): boolean {
  return !SENSITIVE_FAMILIES.has(family);
}

/** May this register enter the random draw pool at all? */
export function isRegisterDrawable(register: Register): boolean {
  return !register.sensitive && isFamilyDrawable(register.family);
}

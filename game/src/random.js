// A small seeded random source, so the same seed always builds the same islands,
// rings and clouds. One world, one source: every draw comes from here, in the
// order the world is built, so a replay with the same seed is the same flight.

/** Mulberry32: a tiny, fast seeded generator with a full 32-bit period. */
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value = (value + Math.imul(value ^ (value >>> 7), value | 61)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  return {
    /** A float in [0, 1). */
    next,
    /** A float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** An integer in [min, max] (both ends included). */
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    /** One element of an array, picked uniformly. */
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
  };
}

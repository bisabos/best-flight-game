// The world: one archipelago, three legs of route, and the rules that make a
// flight a mission. The world is a strip of sea 15,600 pixels long with islands
// in it, a runway at the start of every leg, rings to fly through, storm clouds
// that shove the plane, and birds for life. The plane flies left to right; the
// camera follows it, so the world only ever moves under the plane.
//
// A leg works like this: take off from the runway, fly through its six rings,
// then land gently on the next runway. A gentle touchdown refuels the plane,
// patches it and starts the next leg. Three legs make a sortie; finishing the
// third completes the mission. A hard knock, the sea, or a mountain ends it.

import { LANDING, LEG_TIME, PLANE, RING, SEA_Y, TIME_BONUS, WORLD } from './config.js';
import { altitudeFeet, createPlane, knockPlane, servicePlane, stepPlane } from './plane.js';
import { createRandom } from './random.js';

export const EVENT_RING = 1;
export const EVENT_LAND = 2;
export const EVENT_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_COMPLETE = 16;

/** A leg is either collecting rings or coming in to land. */
export const MISSION_RINGS = 'rings';
export const MISSION_LAND = 'land';

function makeIsland(rng, x0, x1, peak, runway) {
  const palms = [];
  const count = Math.floor((x1 - x0) / 90);
  for (let i = 0; i < count; i += 1) {
    palms.push({ x: x0 + 30 + rng.range(0, x1 - x0 - 60), lean: rng.range(-0.25, 0.25), size: rng.range(0.8, 1.3) });
  }
  return { x0, x1, peak, runway, palms };
}

function makeRing(rng, x, minY, maxY) {
  return { x, y: rng.range(minY, maxY), r: RING.radius, taken: false };
}

export function createWorld(rng) {
  const islands = [];
  const runways = [];
  const rings = [];
  const clouds = [];
  const birds = [];
  const legStarts = [];
  const legLength = WORLD.legLength;

  // One runway island at the start of every leg, and the finish line after the last.
  for (let leg = 0; leg <= LANDING.legs; leg += 1) {
    const x = leg * legLength;
    legStarts.push(x);
    const runway = { x0: x + 40, x1: x + 420, y: SEA_Y - 46 };
    runways.push(runway);
    islands.push(makeIsland(rng, x - 60, x + 520, 46, runway));
  }

  // The islands between the runways: green hills, some with a rocky peak.
  for (let leg = 0; leg < LANDING.legs; leg += 1) {
    const base = leg * legLength;
    for (let i = 0; i < WORLD.islandsPerLeg; i += 1) {
      const x0 = base + 800 + i * 950 + rng.range(-140, 140);
      const width = rng.range(420, 720);
      islands.push(makeIsland(rng, x0, x0 + width, rng.range(70, 190), null));
    }
    // Six rings per leg, strung between the islands at flying heights.
    for (let i = 0; i < RING.perLeg; i += 1) {
      rings.push(makeRing(rng, base + 900 + i * 680 + rng.range(-80, 80), 170, 470));
    }
    // Storm clouds hang over the route; white clouds drift higher up.
    for (let i = 0; i < WORLD.stormsPerLeg; i += 1) {
      clouds.push({ x: base + rng.range(1200, legLength - 600), y: rng.range(150, 380), w: rng.range(180, 300), storm: true, seed: rng.range(0, 10) });
    }
    for (let i = 0; i < 4; i += 1) {
      clouds.push({ x: base + rng.range(300, legLength - 300), y: rng.range(70, 220), w: rng.range(120, 220), storm: false, seed: rng.range(0, 10) });
    }
  }

  for (let i = 0; i < WORLD.birds; i += 1) {
    birds.push({ x: rng.range(0, legLength * LANDING.legs), y: rng.range(120, 320), speed: rng.range(24, 46), phase: rng.range(0, 6.28) });
  }

  const state = {
    plane: createPlane(),
    /** World x of the plane's nose, in pixels. */
    distance: runways[0].x0 + 80,
    /** World x the camera's left edge shows. */
    cameraX: 0,
    leg: 1,
    mission: MISSION_RINGS,
    ringsTaken: 0,
    score: 0,
    timeLeft: LEG_TIME,
    /** Seconds the world has run, for clouds and birds. */
    time: 0,
    /** True once the sortie is complete or the plane is a wreck. */
    over: false,
    /** True when the mission ended in a landing, not a crash. */
    completed: false,
    islands,
    runways,
    rings,
    clouds,
    birds,
    legStarts,
  };
  // Parked on the first runway, ready for takeoff.
  state.plane.y = runways[0].y - 8;
  state.plane.onGround = true;
  return state;
}

/** The ground height at world x: the sea, or an island's smooth hill. */
export function groundAt(state, x) {
  for (let i = 0; i < state.islands.length; i += 1) {
    const island = state.islands[i];
    if (x < island.x0 || x > island.x1) continue;
    if (island.runway && x >= island.runway.x0 && x <= island.runway.x1) return island.runway.y;
    const t = (x - island.x0) / (island.x1 - island.x0);
    const hill = Math.sin(t * Math.PI);
    return SEA_Y - island.peak * hill * hill;
  }
  return SEA_Y;
}

/** True while the plane is over a runway strip (not just over its island). */
export function runwayAt(state, x) {
  for (let i = 0; i < state.runways.length; i += 1) {
    const runway = state.runways[i];
    if (x >= runway.x0 && x <= runway.x1) return runway;
  }
  return null;
}

/** Turbulence at the plane's spot: a storm cloud shoves it up and down. */
function turbulenceAt(state) {
  const plane = state.plane;
  const x = state.distance;
  for (let i = 0; i < state.clouds.length; i += 1) {
    const cloud = state.clouds[i];
    if (!cloud.storm) continue;
    if (x > cloud.x - cloud.w / 2 && x < cloud.x + cloud.w / 2 && plane.y > cloud.y - 60 && plane.y < cloud.y + 90) {
      return Math.sin(state.time * 3.1 + cloud.seed) * 130;
    }
  }
  return 0;
}

export function createWorldApi(seed) {
  let rng = createRandom(seed);
  const state = createWorld(rng);

  // A reset rebuilds the very same world: the seed is re-sown, so a replay
  // with the same seed is the same flight, every time.
  function reset() {
    rng = createRandom(seed);
    const fresh = createWorld(rng);
    for (const key of Object.keys(fresh)) state[key] = fresh[key];
  }

  /**
   * One fixed step. `pitchInput` and `throttleInput` are -1, 0 or 1; `demo`
   * keeps the plane parked while the sky moves (the title screen). Returns a
   * bitmask of EVENT_* values.
   */
  function step(dt, pitchInput, throttleInput, demo) {
    let events = 0;
    state.time += dt;
    for (let i = 0; i < state.birds.length; i += 1) {
      const bird = state.birds[i];
      bird.x += bird.speed * dt;
      if (bird.x > state.distance + 1600) bird.x = state.distance - 200;
    }
    if (demo) {
      state.plane.onGround = true;
      return events;
    }
    if (state.over) return events;

    const plane = state.plane;
    const flown = stepPlane(plane, dt, pitchInput, throttleInput, turbulenceAt(state));
    state.distance += flown;
    state.cameraX = Math.max(0, state.distance - PLANE.screenX);
    state.timeLeft -= dt;

    const ground = groundAt(state, state.distance);
    const runway = runwayAt(state, state.distance);

    // Flying through a ring: only the next one counts, and only in the air.
    // A ring flown past without collecting is missed, not chased forever:
    // the plane cannot turn back, so the leg moves on to the runway.
    if (state.mission === MISSION_RINGS) {
      const legRings = state.rings.filter(
        (ring) => ring.x >= (state.leg - 1) * WORLD.legLength && ring.x < state.leg * WORLD.legLength,
      );
      for (let i = 0; i < legRings.length; i += 1) {
        const ring = legRings[i];
        if (!ring.taken && !ring.missed && ring.x < state.distance - 120) ring.missed = true;
      }
      const next = legRings.find((ring) => !ring.taken && !ring.missed);
      if (next) {
        const dx = state.distance - next.x;
        const dy = plane.y - next.y;
        if (dx * dx + dy * dy < next.r * next.r) {
          next.taken = true;
          state.ringsTaken += 1;
          state.score += RING.points;
          events |= EVENT_RING;
        }
      }
      const done = legRings.filter((ring) => ring.taken || ring.missed).length;
      if (done >= RING.perLeg) state.mission = MISSION_LAND;
    }

    // Touching down: gentle on the strip is a landing, anything else is a knock.
    if (plane.y + 14 >= ground) {
      const sink = Math.sin(plane.pitch) * plane.speed * 1.7 + 18;
      if (runway && Math.abs(plane.pitch) < LANDING.maxPitch && sink < LANDING.maxSink && plane.speed < 150) {
        plane.y = runway.y - 8;
        if (!plane.onGround) {
          plane.onGround = true;
          servicePlane(plane);
          state.score += LANDING.points;
          state.timeLeft = LEG_TIME;
          events |= EVENT_LAND;
          if (state.leg >= LANDING.legs) {
            state.score += Math.round(state.timeLeft * TIME_BONUS);
            state.over = true;
            state.completed = true;
            events |= EVENT_COMPLETE;
          } else {
            state.leg += 1;
            state.mission = MISSION_RINGS;
            state.ringsTaken = 0;
          }
        }
      } else if (!plane.onGround) {
        plane.y = ground - 14;
        if (knockPlane(plane, 1)) events |= EVENT_HIT;
        if (plane.damage >= 100) {
          state.over = true;
          events |= EVENT_OVER;
        }
      }
    } else {
      plane.onGround = false;
    }

    // Out of fuel in the air: the plane glides down, and the ground decides.
    if (plane.fuel <= 0) plane.throttle = 0;
    if (state.timeLeft <= 0 && !state.over) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  return { state, reset, step, groundAt: (x) => groundAt(state, x), runwayAt: (x) => runwayAt(state, x) };
}

/** The next ring the pilot should aim for, or null between legs. */
export function nextRing(state) {
  return (
    state.rings.find(
      (ring) =>
        !ring.taken &&
        !ring.missed &&
        ring.x >= (state.leg - 1) * WORLD.legLength &&
        ring.x < state.leg * WORLD.legLength,
    ) || null
  );
}

/** The runway the pilot is heading for when the mission says land. */
export function nextRunway(state) {
  return state.runways[state.leg] || null;
}

/** Altitude in feet, for the HUD. */
export function altitudeOf(state) {
  return altitudeFeet(state.plane);
}

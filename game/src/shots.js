// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed time, steered by a simple
// autopilot (aim at the next ring, mind the hills, come in low and slow for
// the runway), so the frame is what a real flight looks like and the same seed
// always gives the same frame.

import { DT } from './config.js';
import { nextRing, nextRunway } from './world.js';
import { SCREEN_COMPLETE, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_LIMIT_SECONDS = 60;
const END_LIMIT_SECONDS = 400;
const SAMPLE = DT;

/** Steer the plane toward the next ring, or the runway when it is time to land. */
function autopilot(world) {
  const state = world.state;
  const plane = state.plane;
  let targetX;
  let targetY;
  let landing = false;
  if (state.mission === 'land') {
    const runway = nextRunway(state);
    if (runway) {
      targetX = (runway.x0 + runway.x1) / 2;
      targetY = runway.y - 8;
      landing = true;
    }
  }
  if (targetX === undefined) {
    const ring = nextRing(state);
    if (ring) {
      targetX = ring.x;
      targetY = ring.y;
    } else {
      targetX = state.distance + 400;
      targetY = plane.y;
    }
  }

  // Pitch: toward the target's height. The ground ahead is checked first:
  // too close to a hill, climb whatever the target says.
  let pitch = 0;
  const dy = targetY - plane.y;
  if (dy < -30) pitch = -1;
  else if (dy > 30) pitch = 1;
  const groundAhead = world.groundAt(state.distance + 320);
  if (plane.y > groundAhead - 130) pitch = -1;
  if (landing && targetX - state.distance < 500) {
    // Final approach: shallow and slow, so the touchdown is gentle.
    if (dy < -12) pitch = -1;
    else if (dy > 12) pitch = 1;
    else pitch = 0;
  }

  // Throttle: hold a cruise band, slower on final approach.
  let throttle = 0;
  const cruise = landing && targetX - state.distance < 700 ? 105 : 140;
  if (plane.speed < cruise - 12) throttle = 1;
  else if (plane.speed > cruise + 18) throttle = -1;
  return { pitch, throttle };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / SAMPLE; i += 1) world.step(SAMPLE, 0, 0, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Fly until the plane is airborne and closing on a ring, so the frame
    // shows the flight, not the runway: the ring sits a little ahead of the
    // plane, the terrain below, the instruments lit.
    for (let i = 0; i < PLAY_LIMIT_SECONDS / SAMPLE; i += 1) {
      const control = autopilot(world);
      world.step(SAMPLE, control.pitch, control.throttle, false);
      if (state.over) break;
      const ring = nextRing(state);
      if (ring && !state.plane.onGround) {
        const ahead = ring.x - state.distance;
        if (ahead > 120 && ahead < 420) break;
      }
    }
    if (state.over) {
      return { screen: state.completed ? SCREEN_COMPLETE : SCREEN_OVER, best: state.score };
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }
  const limit = END_LIMIT_SECONDS;
  for (let i = 0; i < limit / SAMPLE; i += 1) {
    const control = autopilot(world);
    world.step(SAMPLE, control.pitch, control.throttle, false);
    if (state.over) break;
  }
  if (state.over) {
    return { screen: state.completed ? SCREEN_COMPLETE : SCREEN_OVER, best: state.score };
  }
  return { screen: SCREEN_PLAY, best: state.score };
}

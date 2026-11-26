// The plane itself: throttle, pitch, lift and stall, fuel and damage. The plane
// never moves across the screen on its own; it holds a fixed screen x and the
// world scrolls under it, so this file only owns the plane's speed, height and
// attitude. Heights are world pixels (y grows downward), speeds are knots.

import { PLANE, SEA_Y } from './config.js';

/** Knots to pixels per second, and back: 1 knot is about 1.7 pixels a second. */
export const KNOTS_TO_PX = 1.7;
/** Feet per world pixel, for the altimeter. */
export const FEET_PER_PX = 3;

export function createPlane() {
  return {
    /** Height in world pixels (y grows downward; smaller is higher). */
    y: SEA_Y - 260,
    /** Forward speed in knots. */
    speed: 0,
    /** Nose angle in radians: negative climbs, positive dives. */
    pitch: 0,
    /** Throttle 0..1. */
    throttle: 0,
    /** Fuel 0..PLANE.fuelMax. */
    fuel: PLANE.fuelMax,
    /** Damage 0..100; at 100 the plane is a wreck. */
    damage: 0,
    /** Seconds of grace left after a knock. */
    grace: 0,
    /** True while the wheels are on a runway. */
    onGround: false,
    /** True while the plane is stalled (too slow to hold its height). */
    stalled: false,
  };
}

/**
 * One fixed step of flight. `pitchInput` is -1 (climb), 0 or 1 (dive) and
 * `throttleInput` is -1 (less), 0 or 1 (more); `turbulence` is an extra push
 * in pixels per second squared from a storm cloud. Returns the horizontal
 * distance flown this step, in pixels.
 */
export function stepPlane(plane, dt, pitchInput, throttleInput, turbulence) {
  plane.throttle = Math.max(
    0,
    Math.min(1, plane.throttle + throttleInput * PLANE.throttleRate * dt),
  );

  // The engine pulls toward its target speed; drag pulls back harder the
  // faster the plane goes, so speed settles instead of running away.
  const targetSpeed = plane.throttle * PLANE.maxSpeed;
  const drag = 0.35 + (plane.speed / PLANE.maxSpeed) * 0.9;
  plane.speed += (targetSpeed - plane.speed) * Math.min(1, drag * dt);
  if (plane.speed < 0) plane.speed = 0;

  // The nose follows the stick, but a stalled wing will not climb: the nose
  // drops on its own until speed comes back.
  plane.stalled = plane.speed < PLANE.stallSpeed && !plane.onGround;
  const wantedPitch = pitchInput * PLANE.maxPitch;
  plane.pitch += (wantedPitch - plane.pitch) * Math.min(1, PLANE.pitchRate * dt);
  if (plane.stalled) plane.pitch += 0.35 * dt;

  // Climb rate follows the nose and the speed; a stall turns climb into sink.
  const vertical = -Math.sin(plane.pitch) * plane.speed * KNOTS_TO_PX;
  const lift = plane.stalled ? 0.25 : 1;
  plane.y -= vertical * lift * dt;
  plane.y += (plane.stalled ? 150 : 18) * dt;
  plane.y += turbulence * dt;

  // Fuel burns with the throttle; idling sips it.
  plane.fuel = Math.max(
    0,
    plane.fuel - PLANE.fuelBurn * (0.1 + plane.throttle * 0.9) * dt,
  );
  if (plane.grace > 0) plane.grace -= dt;

  // The sky has a ceiling and the sea is a floor: both are soft, the sea is not.
  if (plane.y < 60) plane.y = 60;
  return plane.speed * KNOTS_TO_PX * dt;
}

/** A knock: damage, a shove upward and a short grace period. Returns true if it counted. */
export function knockPlane(plane, strength) {
  if (plane.grace > 0 || plane.onGround) return false;
  plane.damage = Math.min(100, plane.damage + PLANE.hitDamage * strength);
  plane.y -= 26;
  plane.speed *= 0.55;
  plane.grace = PLANE.graceTime;
  return true;
}

/** Fill the tank and patch the airframe, as a runway stop does. */
export function servicePlane(plane) {
  plane.fuel = PLANE.fuelMax;
  plane.damage = 0;
  plane.onGround = true;
  plane.speed = 0;
  plane.throttle = 0;
  plane.pitch = 0;
}

/** Height above the sea in feet, for the altimeter. */
export function altitudeFeet(plane) {
  return Math.max(0, Math.round((SEA_Y - plane.y) * FEET_PER_PX));
}

/** Heading in degrees: east is 090, and the nose tips it up or down. */
export function headingDegrees(plane) {
  const tilt = (-plane.pitch * 180) / Math.PI;
  return Math.round(90 + tilt);
}

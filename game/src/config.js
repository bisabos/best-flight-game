// Island Hopper: every tuning number and colour in one place. The playfield is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size. Altitudes are in feet, speeds in knots, and
// the world is measured in pixels (1 pixel is about 3 feet of sky).

export const VIEW = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const DT = 1 / 60;

/** Sea level in world pixels (y grows downward). The plane flies above it. */
export const SEA_Y = 620;

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'island-hopper.best';

export const PLANE = {
  /** Cruise speed the throttle aims for at 100% (knots). */
  maxSpeed: 210,
  /** Below this speed the wing stops lifting and the nose drops (knots). */
  stallSpeed: 62,
  /** How fast the nose follows the pitch command (radians per second). */
  pitchRate: 1.5,
  /** Steepest climb or dive the pilot can hold (radians). */
  maxPitch: 0.55,
  /** Throttle change per second while a key is held (0..1). */
  throttleRate: 0.55,
  /** Fuel burnt per second at full throttle; idle burns a tenth of it. */
  fuelBurn: 0.55,
  /** Fuel tank, in seconds of full-throttle flight. */
  fuelMax: 100,
  /** Damage taken from one hard knock (0..100). */
  hitDamage: 34,
  /** Seconds of mercy after a knock, so one crash cannot eat every life at once. */
  graceTime: 1.6,
  /** Screen x where the plane sits while the world scrolls past. */
  screenX: 330,
};

export const RING = {
  /** Rings on one leg of the route. */
  perLeg: 6,
  /** Ring radius in pixels. */
  radius: 46,
  /** Points for flying through a ring. */
  points: 50,
};

export const LANDING = {
  /** Points for a gentle touchdown on the runway. */
  points: 150,
  /** The fastest safe sink rate on touchdown (pixels per second). */
  maxSink: 130,
  /** The steepest safe pitch on touchdown (radians). */
  maxPitch: 0.22,
  /** Legs in a full sortie: after the last one the mission is complete. */
  legs: 3,
};

export const WORLD = {
  /** How long one leg of the route is (pixels of world). */
  legLength: 5200,
  /** Islands per leg, runway island included. */
  islandsPerLeg: 5,
  /** Storm clouds per leg; they shove the plane around inside them. */
  stormsPerLeg: 2,
  /** Birds that cross the sky, for life, never for points. */
  birds: 7,
};

/** Points for finishing a leg with time to spare, per second left on the clock. */
export const TIME_BONUS = 4;
/** Seconds on the clock for one leg; running out ends the leg in a ditch, not a crash. */
export const LEG_TIME = 150;

export const PALETTE = {
  skyTop: '#7ec8f2',
  skyMid: '#a8dcf7',
  skyLow: '#fde9c8',
  sun: '#ffd94d',
  sunGlow: 'rgba(255, 217, 77, 0.35)',
  sea: '#1e7fa8',
  seaDeep: '#14608a',
  seaFoam: '#bfe8f2',
  sand: '#f2d492',
  grass: '#5da24a',
  grassDark: '#3e7a34',
  rock: '#8a7f72',
  rockDark: '#6b6156',
  palmTrunk: '#7a5a3a',
  palmLeaf: '#2f8f4e',
  runway: '#3c3f46',
  runwayLine: '#f5f0dc',
  planeBody: '#e8542f',
  planeWing: '#f5f0dc',
  planeGlass: '#bfe8f2',
  planeStripe: '#ffd94d',
  ring: '#ffd94d',
  ringGlow: 'rgba(255, 217, 77, 0.45)',
  storm: '#77808f',
  stormDark: '#5c6575',
  cloud: '#ffffff',
  panel: 'rgba(12, 24, 38, 0.72)',
  panelEdge: 'rgba(190, 232, 242, 0.35)',
  text: '#f4f8fb',
  muted: '#b9d4e2',
  good: '#7ee2a0',
  warn: '#ffb347',
  bad: '#ff6b5e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

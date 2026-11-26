// Input: keyboard and mouse, read as directions and one-shot actions. The game
// reads the held keys every frame (pitch and throttle are analogue) and takes
// the actions (confirm, pause, mute) once, so a held key never double-fires.
//
// Keyboard: Up/W climbs, Down/S dives, Right/D more throttle, Left/A less,
// Space or Enter confirms (start, restart), P or Escape pauses, M mutes.
// Mouse: moving the pointer steers the nose toward it; holding the button
// pushes the throttle open; a click confirms, like Space.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const CONFIRM_KEYS = new Set(['Space', 'Enter']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const MUTE_KEYS = new Set(['KeyM']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseY = null;
  let mouseDown = false;

  function press(event) {
    if (CONFIRM_KEYS.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE_KEYS.has(event.code)) actions |= ACTION_PAUSE;
    else if (MUTE_KEYS.has(event.code)) actions |= ACTION_MUTE;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    press(event);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseY = ((event.clientY - rect.top) / rect.height) * 720;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    actions |= ACTION_CONFIRM;
    event.preventDefault();
  });
  window.addEventListener('pointerup', () => {
    mouseDown = false;
  });
  canvas.addEventListener('pointerleave', () => {
    mouseY = null;
  });

  function held(...codes) {
    return codes.some((code) => keys.has(code));
  }

  return {
    /** -1 to climb, 1 to dive, 0 to hold; the mouse steers when it is over the game. */
    pitch(planeScreenY) {
      if (mouseY !== null) {
        if (mouseY < planeScreenY - 60) return -1;
        if (mouseY > planeScreenY + 60) return 1;
        return 0;
      }
      if (held('ArrowUp', 'KeyW')) return -1;
      if (held('ArrowDown', 'KeyS')) return 1;
      return 0;
    },
    /** -1 for less throttle, 1 for more; holding the mouse opens it up. */
    throttle() {
      if (mouseDown) return 1;
      if (held('ArrowRight', 'KeyD')) return 1;
      if (held('ArrowLeft', 'KeyA')) return -1;
      return 0;
    },
    /** The actions since the last call, then cleared. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

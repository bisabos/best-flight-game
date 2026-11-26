// The painter: sky, sea, islands, runway, rings, the plane and the instruments.
// Everything is drawn with canvas paths, so the game ships no image files and
// every screenshot is a real render of this code. The logical field is 1280x720
// and the canvas scales it to the window, letterboxed.

import { PALETTE, PLANE, SEA_Y, VIEW, FONT, LANDING, RING } from './config.js';
import { altitudeFeet, headingDegrees } from './plane.js';
import { groundAt, nextRing } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_COMPLETE = 'complete';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    const ox = (canvas.width - VIEW.width * scale) / 2;
    const oy = (canvas.height - VIEW.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.fillStyle = '#0b1520';
    ctx.fillRect(-ox / scale, -oy / scale, canvas.width / scale, canvas.height / scale);
  }

  function drawSky(state) {
    const sky = ctx.createLinearGradient(0, 0, 0, SEA_Y);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, PALETTE.skyMid);
    sky.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW.width, SEA_Y + 2);
    // The sun, low and warm, with a soft glow around it.
    ctx.save();
    ctx.fillStyle = PALETTE.sunGlow;
    ctx.beginPath();
    ctx.arc(1080, 110, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(1080, 110, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawClouds(state) {
    for (let i = 0; i < state.clouds.length; i += 1) {
      const cloud = state.clouds[i];
      const drift = ((cloud.x - state.cameraX + state.time * 6) % 2400 + 2400) % 2400 - 400;
      const x = drift;
      const y = cloud.y;
      if (x + cloud.w < -50 || x - cloud.w > VIEW.width + 50) continue;
      ctx.fillStyle = cloud.storm ? PALETTE.storm : PALETTE.cloud;
      ctx.globalAlpha = cloud.storm ? 0.92 : 0.95;
      ctx.beginPath();
      ctx.ellipse(x, y, cloud.w / 2, cloud.w / 5, 0, 0, Math.PI * 2);
      ctx.ellipse(x - cloud.w / 4, y + 8, cloud.w / 3, cloud.w / 6, 0, 0, Math.PI * 2);
      ctx.ellipse(x + cloud.w / 4, y + 6, cloud.w / 3.2, cloud.w / 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (cloud.storm) {
        ctx.fillStyle = PALETTE.stormDark;
        ctx.beginPath();
        ctx.ellipse(x, y + cloud.w / 7, cloud.w / 2.4, cloud.w / 9, 0, 0, Math.PI * 2);
        ctx.fill();
        // Rain under a storm cloud, slanted by the wind.
        ctx.strokeStyle = 'rgba(190, 220, 240, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let r = 0; r < 8; r += 1) {
          const rx = x - cloud.w / 2 + r * (cloud.w / 7);
          ctx.moveTo(rx, y + 26);
          ctx.lineTo(rx - 8, y + 52);
        }
        ctx.stroke();
      }
    }
  }

  function drawSea(state) {
    const sea = ctx.createLinearGradient(0, SEA_Y, 0, VIEW.height);
    sea.addColorStop(0, PALETTE.sea);
    sea.addColorStop(1, PALETTE.seaDeep);
    ctx.fillStyle = sea;
    ctx.fillRect(0, SEA_Y, VIEW.width, VIEW.height - SEA_Y);
    ctx.strokeStyle = PALETTE.seaFoam;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    for (let row = 0; row < 3; row += 1) {
      ctx.beginPath();
      for (let x = 0; x <= VIEW.width; x += 16) {
        const y = SEA_Y + 18 + row * 26 + Math.sin(x * 0.02 + state.time * 1.4 + row * 2) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawIsland(state, island) {
    const x0 = island.x0 - state.cameraX;
    const x1 = island.x1 - state.cameraX;
    if (x1 < -40 || x0 > VIEW.width + 40) return;
    const top = island.runway ? island.runway.y : SEA_Y - island.peak;
    // The hill itself, grass on top and rock where it is steep and high.
    ctx.beginPath();
    ctx.moveTo(x0, SEA_Y + 100);
    for (let x = x0; x <= x1; x += 8) {
      ctx.lineTo(x, groundAt(state, x + state.cameraX));
    }
    ctx.lineTo(x1, SEA_Y + 100);
    ctx.closePath();
    ctx.fillStyle = island.peak > 130 ? PALETTE.rock : PALETTE.grass;
    ctx.fill();
    // Grass cap over the rock, and a sand rim where the hill meets the sea.
    ctx.beginPath();
    ctx.moveTo(x0, SEA_Y + 100);
    for (let x = x0; x <= x1; x += 8) {
      ctx.lineTo(x, groundAt(state, x + state.cameraX));
    }
    ctx.lineTo(x1, SEA_Y + 100);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(x0, top - 4, x1 - x0, 26);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x0, SEA_Y - 10, x1 - x0, 14);
    ctx.restore();
    // Palm trees on the flat of the hill.
    for (let i = 0; i < island.palms.length; i += 1) {
      const palm = island.palms[i];
      const px = palm.x - state.cameraX;
      if (px < -20 || px > VIEW.width + 20) continue;
      const py = groundAt(state, palm.x);
      const s = palm.size;
      ctx.strokeStyle = PALETTE.palmTrunk;
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + palm.lean * 30, py - 18 * s, px + palm.lean * 44, py - 30 * s);
      ctx.stroke();
      ctx.fillStyle = PALETTE.palmLeaf;
      for (let leaf = 0; leaf < 5; leaf += 1) {
        const angle = -0.4 - leaf * 0.55 + palm.lean;
        ctx.beginPath();
        ctx.ellipse(px + palm.lean * 44 + Math.cos(angle) * 14 * s, py - 30 * s + Math.sin(angle) * 8 * s, 16 * s, 4 * s, angle, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The runway: a dark strip with a centre line, end bars and its number.
    if (island.runway) {
      const r = island.runway;
      const rx0 = r.x0 - state.cameraX;
      const rx1 = r.x1 - state.cameraX;
      ctx.fillStyle = PALETTE.runway;
      ctx.fillRect(rx0, r.y, rx1 - rx0, 10);
      ctx.fillStyle = PALETTE.runwayLine;
      for (let x = rx0 + 24; x < rx1 - 12; x += 44) ctx.fillRect(x, r.y + 4, 22, 3);
      ctx.font = `bold 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('09', rx0 + 22, r.y + 9);
      // A windsock at the runway's end, leaning with the wind.
      const wx = rx1 - 14;
      ctx.strokeStyle = '#8a94a6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wx, r.y);
      ctx.lineTo(wx, r.y - 26);
      ctx.stroke();
      ctx.fillStyle = '#ff8c42';
      ctx.beginPath();
      ctx.moveTo(wx, r.y - 26);
      ctx.lineTo(wx + 20, r.y - 21);
      ctx.lineTo(wx, r.y - 16);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawRings(state) {
    for (let i = 0; i < state.rings.length; i += 1) {
      const ring = state.rings[i];
      const x = ring.x - state.cameraX;
      if (x < -80 || x > VIEW.width + 80) continue;
      ctx.save();
      if (ring.missed) {
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = PALETTE.muted;
      } else if (ring.taken) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = PALETTE.good;
      } else {
        ctx.shadowColor = PALETTE.ringGlow;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = PALETTE.ring;
      }
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = ring.taken ? PALETTE.good : PALETTE.text;
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i % RING.perLeg + 1), x, ring.y);
      ctx.restore();
    }
    // An edge arrow toward the next ring, so the pilot never hunts blind.
    const next = nextRing(state);
    if (next && state.mission === 'rings') {
      const x = next.x - state.cameraX;
      if (x > VIEW.width - 40 || x < 40) {
        const ax = x > VIEW.width - 40 ? VIEW.width - 46 : 46;
        const ay = Math.max(60, Math.min(VIEW.height - 120, next.y));
        ctx.fillStyle = PALETTE.ring;
        ctx.beginPath();
        if (x > VIEW.width - 40) {
          ctx.moveTo(ax + 14, ay);
          ctx.lineTo(ax - 8, ay - 12);
          ctx.lineTo(ax - 8, ay + 12);
        } else {
          ctx.moveTo(ax - 14, ay);
          ctx.lineTo(ax + 8, ay - 12);
          ctx.lineTo(ax + 8, ay + 12);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawBirds(state) {
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    for (let i = 0; i < state.birds.length; i += 1) {
      const bird = state.birds[i];
      const x = bird.x - state.cameraX;
      if (x < -20 || x > VIEW.width + 20) continue;
      const flap = Math.sin(state.time * 6 + bird.phase) * 5;
      ctx.beginPath();
      ctx.moveTo(x - 9, bird.y - flap);
      ctx.quadraticCurveTo(x, bird.y + 3, x + 9, bird.y - flap);
      ctx.stroke();
    }
  }

  function drawPlane(state) {
    const plane = state.plane;
    const x = PLANE.screenX;
    const y = plane.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(plane.pitch);
    // Propeller: a spinning disc with two blades, ahead of the nose.
    const propAngle = state.time * 42;
    ctx.fillStyle = 'rgba(40, 48, 60, 0.25)';
    ctx.beginPath();
    ctx.ellipse(34, 0, 4, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2c3440';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(34 + Math.cos(propAngle) * 24, Math.sin(propAngle) * 24);
    ctx.lineTo(34 - Math.cos(propAngle) * 24, -Math.sin(propAngle) * 24);
    ctx.stroke();
    ctx.fillStyle = '#2c3440';
    ctx.beginPath();
    ctx.arc(34, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    // Tail wing and fin.
    ctx.fillStyle = PALETTE.planeWing;
    ctx.beginPath();
    ctx.moveTo(-34, -2);
    ctx.lineTo(-48, -14);
    ctx.lineTo(-40, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.planeBody;
    ctx.beginPath();
    ctx.moveTo(-40, -16);
    ctx.lineTo(-30, -2);
    ctx.lineTo(-40, 2);
    ctx.closePath();
    ctx.fill();
    // Fuselage.
    ctx.fillStyle = PALETTE.planeBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    // Yellow cheatline along the body.
    ctx.fillStyle = PALETTE.planeStripe;
    ctx.fillRect(-34, 3, 62, 3);
    // Canopy glass.
    ctx.fillStyle = PALETTE.planeGlass;
    ctx.beginPath();
    ctx.ellipse(12, -7, 13, 7, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Main wing, bright against the sky.
    ctx.fillStyle = PALETTE.planeWing;
    ctx.beginPath();
    ctx.ellipse(-2, 2, 26, 7, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Wheels, out while parked or low and slow.
    if (plane.onGround || plane.speed < 90) {
      ctx.fillStyle = '#22262e';
      ctx.beginPath();
      ctx.arc(-14, 14, 5, 0, Math.PI * 2);
      ctx.arc(16, 14, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Navigation lights, lit.
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.arc(-38, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7ee2a0';
    ctx.beginPath();
    ctx.arc(30, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function dial(cx, cy, r, label, valueText, fraction, good) {
    ctx.save();
    ctx.fillStyle = '#0e1a28';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = good ? PALETTE.good : PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = PALETTE.text;
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 10; i += 1) {
      const a = -Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
      ctx.lineTo(cx + Math.cos(a) * (r - 9), cy + Math.sin(a) * (r - 9));
      ctx.stroke();
    }
    const needle = -Math.PI * 0.75 + fraction * Math.PI * 1.5;
    ctx.strokeStyle = PALETTE.ring;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needle) * (r - 10), cy + Math.sin(needle) * (r - 10));
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy + r + 13);
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillText(valueText, cx, cy + 4);
    ctx.restore();
  }

  function drawInstruments(state) {
    const plane = state.plane;
    const y = VIEW.height - 96;
    panel(16, y - 14, 330, 96);
    // Artificial horizon: sky and earth halves, rolled by the pitch.
    const hx = 56;
    const hy = y + 34;
    ctx.save();
    ctx.beginPath();
    ctx.arc(hx, hy, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = PALETTE.skyMid;
    ctx.fillRect(hx - 34, hy - 34, 68, 34 + plane.pitch * 40);
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(hx - 34, hy + plane.pitch * 40, 68, 68);
    ctx.strokeStyle = PALETTE.text;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx - 34, hy + plane.pitch * 40);
    ctx.lineTo(hx + 34, hy + plane.pitch * 40);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.ring;
    ctx.beginPath();
    ctx.moveTo(hx - 12, hy);
    ctx.lineTo(hx + 12, hy);
    ctx.lineTo(hx, hy + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('ATTITUDE', hx, hy + 48);
    dial(150, hy, 30, 'ALTITUDE', `${altitudeFeet(plane)}`, Math.min(1, altitudeFeet(plane) / 2000), false);
    dial(226, hy, 30, 'AIRSPEED', `${Math.round(plane.speed)}`, Math.min(1, plane.speed / PLANE.maxSpeed), plane.speed < 90);
    // Fuel and damage bars, right of the dials.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('FUEL', 272, y + 8);
    ctx.fillText('DMG', 272, y + 44);
    ctx.fillStyle = '#0e1a28';
    ctx.fillRect(272, y + 14, 58, 10);
    ctx.fillRect(272, y + 50, 58, 10);
    const fuelFraction = plane.fuel / PLANE.fuelMax;
    ctx.fillStyle = fuelFraction < 0.2 ? PALETTE.bad : PALETTE.good;
    ctx.fillRect(272, y + 14, 58 * fuelFraction, 10);
    ctx.fillStyle = plane.damage > 60 ? PALETTE.bad : PALETTE.warn;
    ctx.fillRect(272, y + 50, 58 * (plane.damage / 100), 10);
  }

  function drawHud(state, best) {
    const plane = state.plane;
    // Top strip: the flight numbers, the mission and the score.
    panel(16, 12, 420, 56);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('ALTITUDE', 30, 30);
    ctx.fillText('AIRSPEED', 140, 30);
    ctx.fillText('HEADING', 250, 30);
    ctx.fillText('THROTTLE', 350, 30);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`${altitudeFeet(plane)} ft`, 30, 54);
    ctx.fillText(`${Math.round(plane.speed)} kt`, 140, 54);
    ctx.fillText(`${String(headingDegrees(plane)).padStart(3, '0')}°`, 250, 54);
    ctx.fillText(`${Math.round(plane.throttle * 100)}%`, 350, 54);
    panel(VIEW.width - 296, 12, 280, 56);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillText('SCORE', VIEW.width - 282, 30);
    ctx.fillText('BEST', VIEW.width - 182, 30);
    ctx.fillText('LEG TIME', VIEW.width - 92, 30);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(String(state.score), VIEW.width - 282, 54);
    ctx.fillText(String(Math.max(best, state.score)), VIEW.width - 182, 54);
    ctx.fillStyle = state.timeLeft < 30 ? PALETTE.bad : PALETTE.text;
    ctx.fillText(`${Math.max(0, Math.ceil(state.timeLeft))}s`, VIEW.width - 92, 54);
    // Compass strip, centred on the heading.
    const heading = headingDegrees(plane);
    const cx = VIEW.width / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - 130, 12, 260, 26);
    ctx.clip();
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(cx - 130, 12, 260, 26);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'center';
    for (let d = -60; d <= 60; d += 15) {
      const h = ((heading + d) % 360 + 360) % 360;
      const x = cx + d * 2;
      const label = h === 0 ? 'N' : h === 90 ? 'E' : h === 180 ? 'S' : h === 270 ? 'W' : String(h).padStart(3, '0');
      ctx.fillText(label, x, 30);
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x, 20);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = PALETTE.ring;
    ctx.beginPath();
    ctx.moveTo(cx, 12);
    ctx.lineTo(cx - 5, 5);
    ctx.lineTo(cx + 5, 5);
    ctx.closePath();
    ctx.fill();
    // Mission banner under the compass.
    const missionText = state.mission === 'rings'
      ? `LEG ${state.leg} OF ${LANDING.legs} · FLY THROUGH THE RINGS  ${state.ringsTaken}/${RING.perLeg}`
      : `LEG ${state.leg} OF ${LANDING.legs} · LAND ON THE RUNWAY`;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(missionText, cx, 58);
    // Warnings, flashing when they matter.
    const blink = Math.floor(state.time * 3) % 2 === 0;
    ctx.font = `bold 18px ${FONT}`;
    if (plane.stalled && blink) {
      ctx.fillStyle = PALETTE.warn;
      ctx.fillText('⚠ STALL — ADD THROTTLE', cx, 92);
    } else if (plane.fuel < 20 && blink) {
      ctx.fillStyle = PALETTE.bad;
      ctx.fillText('⚠ LOW FUEL — LAND TO REFUEL', cx, 92);
    }
    drawInstruments(state);
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(8, 18, 30, 0.45)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 72px ${FONT}`;
    ctx.fillText('ISLAND HOPPER', VIEW.width / 2, 200);
    ctx.fillStyle = PALETTE.ring;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText('S K Y   C O U R I E R', VIEW.width / 2, 238);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `19px ${FONT}`;
    ctx.fillText('Three legs over the archipelago. Six rings a leg, then a gentle', VIEW.width / 2, 292);
    ctx.fillText('touchdown on the runway to refuel. Mind the fuel, mind the hills.', VIEW.width / 2, 320);
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('↑ ↓  PITCH      ← →  THROTTLE      MOUSE  STEER      SPACE  FLY      P  PAUSE      M  MUTE', VIEW.width / 2, 380);
    if (best > 0) {
      ctx.fillStyle = PALETTE.ring;
      ctx.font = `bold 18px ${FONT}`;
      ctx.fillText(`BEST SCORE  ${best}`, VIEW.width / 2, 424);
    }
    if (state.time % 1.2 < 0.6) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 24px ${FONT}`;
      ctx.fillText('PRESS SPACE OR CLICK TO FLY', VIEW.width / 2, 486);
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(8, 18, 30, 0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 48px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW.width / 2, 330);
    ctx.font = `19px ${FONT}`;
    ctx.fillText('Press P or Space to keep flying', VIEW.width / 2, 372);
  }

  function drawEnd(state, best) {
    const complete = state.completed;
    ctx.fillStyle = complete ? 'rgba(10, 30, 18, 0.62)' : 'rgba(30, 10, 10, 0.62)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = complete ? PALETTE.good : PALETTE.bad;
    ctx.font = `bold 56px ${FONT}`;
    ctx.fillText(complete ? 'MISSION COMPLETE' : state.timeLeft <= 0 ? 'OUT OF TIME' : 'CRASHED', VIEW.width / 2, 300);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `20px ${FONT}`;
    ctx.fillText(
      complete
        ? 'Three legs flown, three landings made. The islands are yours.'
        : state.timeLeft <= 0
          ? 'The clock ran out over the sea. The courier flies again.'
          : 'The airframe gave up over the islands. The courier flies again.',
      VIEW.width / 2,
      344,
    );
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(`SCORE  ${state.score}     BEST  ${Math.max(best, state.score)}`, VIEW.width / 2, 402);
    if (state.time % 1.2 < 0.6) {
      ctx.font = `bold 22px ${FONT}`;
      ctx.fillText('PRESS SPACE OR CLICK TO FLY AGAIN', VIEW.width / 2, 462);
    }
  }

  function draw(state, screen, best) {
    fit();
    drawSky(state);
    drawClouds(state);
    drawSea(state);
    for (let i = 0; i < state.islands.length; i += 1) drawIsland(state, state.islands[i]);
    drawRings(state);
    drawBirds(state);
    drawPlane(state);
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
    } else {
      drawHud(state, best);
      if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER || screen === SCREEN_COMPLETE) drawEnd(state, best);
    }
  }

  return { draw };
}

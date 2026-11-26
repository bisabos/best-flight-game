// Sound, made not fetched: every sound is a WebAudio oscillator or a burst of
// filtered noise, so the game ships no audio files and loads nothing. The engine
// is a sawtooth through a low-pass filter whose pitch follows the throttle, the
// wind is looped noise whose loudness follows the speed, and the events are
// short notes and thuds. Nothing starts until the player first presses a key
// or clicks, as browsers require, and M mutes it all.

export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let windSource = null;
  let windGain = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 70;
      engineFilter = context.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter).connect(engineGain).connect(context.destination);
      engineOsc.start();

      const length = context.sampleRate * 2;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      windSource = context.createBufferSource();
      windSource.buffer = buffer;
      windSource.loop = true;
      const windFilter = context.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 700;
      windGain = context.createGain();
      windGain.gain.value = 0;
      windSource.connect(windFilter).connect(windGain).connect(context.destination);
      windSource.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(frequency, duration, type, volume) {
    if (!context || muted) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    osc.connect(gain).connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + duration);
  }

  function thud() {
    if (!context || muted) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(38, context.currentTime + 0.25);
    gain.gain.setValueAtTime(0.5, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
    osc.connect(gain).connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.3);
  }

  return {
    /** Start the audio graph; call from a key press or a click. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
    },
    /** The engine and wind follow the plane: throttle 0..1, speed in knots. */
    update(throttle, speed, flying) {
      if (!context || muted) return;
      const target = flying ? 0.05 + throttle * 0.075 : 0;
      engineGain.gain.setTargetAtTime(target, context.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(62 + throttle * 95, context.currentTime, 0.1);
      engineFilter.frequency.setTargetAtTime(380 + throttle * 700, context.currentTime, 0.1);
      windGain.gain.setTargetAtTime(flying ? Math.min(0.09, speed * 0.00045) : 0, context.currentTime, 0.15);
    },
    /** Two bright notes: a ring collected. */
    ring() {
      blip(880, 0.14, 'sine', 0.22);
      setTimeout(() => blip(1318, 0.2, 'sine', 0.2), 90);
    },
    /** A low thud: wheels on the runway. */
    land() {
      thud();
    },
    /** A dull knock: the airframe hit something hard. */
    hit() {
      thud();
      blip(140, 0.25, 'square', 0.12);
    },
    /** A falling note: the mission is over, one way or the other. */
    end(good) {
      if (good) {
        [523, 659, 784, 1046].forEach((note, i) => setTimeout(() => blip(note, 0.22, 'sine', 0.2), i * 110));
      } else {
        [392, 311, 233].forEach((note, i) => setTimeout(() => blip(note, 0.3, 'triangle', 0.2), i * 140));
      }
    },
    toggleMute() {
      muted = !muted;
      if (context) {
        engineGain.gain.value = 0;
        windGain.gain.value = 0;
      }
      return muted;
    },
  };
}

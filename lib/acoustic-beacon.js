"use client";

/**
 * Acoustic Rescue Beacon Synthesizer (Web Audio API)
 *
 * Generates loud, high-penetration acoustic distress signals and Morse SOS
 * entirely in-browser using Web Audio oscillators - zero network/audio downloads needed.
 */

let audioCtx = null;
let currentOscillator = null;
let currentModulator = null;
let gainNode = null;
let intervalId = null;
let isPlaying = false;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Start High-Decibel SAR Siren (Alternating European / Disaster Relief dual-tone warble)
 * Frequency oscillates between 650Hz and 1250Hz for maximum ear sensitivity & acoustic range.
 */
export function startSiren(mode = "siren") {
  stopSiren();

  const ctx = getAudioContext();
  if (!ctx) return false;

  isPlaying = true;

  try {
    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.95, ctx.currentTime);
    gainNode.connect(ctx.destination);

    if (mode === "morse") {
      // Morse SOS: · · ·   - - -   · · ·
      playMorseSOS(ctx, gainNode);
    } else if (mode === "whistle") {
      // 3.2 kHz high-pitch rescue whistle (pierces through storm wind & flood roar)
      playWhistle(ctx, gainNode);
    } else {
      // Dual-frequency warbling emergency siren
      playWarbleSiren(ctx, gainNode);
    }

    return true;
  } catch (err) {
    console.warn("Acoustic beacon error:", err);
    return false;
  }
}

function playWarbleSiren(ctx, masterGain) {
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  osc.type = "sawtooth"; // Rich harmonics for outdoor audibility
  osc.frequency.setValueAtTime(850, ctx.currentTime);

  // LFO frequency modulation (2.5 Hz warble speed)
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(2.5, ctx.currentTime);

  lfoGain.gain.setValueAtTime(350, ctx.currentTime); // Pitch sweep ±350Hz (500Hz -> 1200Hz)

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  osc.connect(masterGain);

  osc.start();
  lfo.start();

  currentOscillator = osc;
  currentModulator = lfo;
}

function playWhistle(ctx, masterGain) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(3100, ctx.currentTime); // 3.1 kHz rescue whistle frequency

  // Pulsing amplitude (0.8s on, 0.2s off)
  let on = true;
  intervalId = setInterval(() => {
    if (!isPlaying || !gainNode) return;
    try {
      if (on) {
        gainNode.gain.setValueAtTime(0.9, ctx.currentTime);
      } else {
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
      }
      on = !on;
    } catch {}
  }, 400);

  osc.connect(masterGain);
  osc.start();
  currentOscillator = osc;
}

function playMorseSOS(ctx, masterGain) {
  // Morse SOS pattern: ... --- ... (Dot: 120ms, Dash: 360ms, Element gap: 120ms, Letter gap: 360ms, Word gap: 1000ms)
  const dot = 120;
  const dash = 360;
  const elementGap = 120;
  const letterGap = 360;

  const sequence = [
    // S: . . .
    { dur: dot, sound: true }, { dur: elementGap, sound: false },
    { dur: dot, sound: true }, { dur: elementGap, sound: false },
    { dur: dot, sound: true }, { dur: letterGap, sound: false },
    // O: - - -
    { dur: dash, sound: true }, { dur: elementGap, sound: false },
    { dur: dash, sound: true }, { dur: elementGap, sound: false },
    { dur: dash, sound: true }, { dur: letterGap, sound: false },
    // S: . . .
    { dur: dot, sound: true }, { dur: elementGap, sound: false },
    { dur: dot, sound: true }, { dur: elementGap, sound: false },
    { dur: dot, sound: true }, { dur: 1200, sound: false }, // Repeat gap
  ];

  let step = 0;
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.connect(masterGain);
  osc.start();
  currentOscillator = osc;

  function runStep() {
    if (!isPlaying) return;
    const current = sequence[step];
    try {
      if (current.sound) {
        masterGain.gain.setValueAtTime(0.9, ctx.currentTime);
      } else {
        masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      }
    } catch {}

    step = (step + 1) % sequence.length;
    intervalId = setTimeout(runStep, current.dur);
  }

  runStep();
}

/**
 * Stop Acoustic Rescue Beacon immediately
 */
export function stopSiren() {
  isPlaying = false;

  if (intervalId) {
    clearInterval(intervalId);
    clearTimeout(intervalId);
    intervalId = null;
  }

  if (currentOscillator) {
    try {
      currentOscillator.stop();
      currentOscillator.disconnect();
    } catch {}
    currentOscillator = null;
  }

  if (currentModulator) {
    try {
      currentModulator.stop();
      currentModulator.disconnect();
    } catch {}
    currentModulator = null;
  }

  if (gainNode) {
    try {
      gainNode.disconnect();
    } catch {}
    gainNode = null;
  }
}

export function isSirenActive() {
  return isPlaying;
}

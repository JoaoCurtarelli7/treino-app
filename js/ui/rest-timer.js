import { formatClock } from '../core/format.js';
import { toast } from './dom.js';

const $rest = document.getElementById('rest');
const $left = $rest.querySelector('[data-left]');
const $bar = $rest.querySelector('[data-bar]');
const timer = { endsAt: 0, duration: 0, intervalId: null };
let audioContext = null;

// iOS only allows audio after a user gesture, so the context is created on the ✓ tap.
function unlockAudio() {
  if (audioContext) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (AudioContextClass) audioContext = new AudioContextClass();
}

function beep() {
  if (!audioContext) return;
  [0, 0.25].forEach(offset => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, audioContext.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + offset + 0.2);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(audioContext.currentTime + offset);
    oscillator.stop(audioContext.currentTime + offset + 0.2);
  });
  navigator.vibrate?.([200, 100, 200]);
}

function tick() {
  const millisecondsLeft = timer.endsAt - Date.now();
  if (millisecondsLeft <= 0) {
    stopRest();
    beep();
    toast('Descanso acabou — próxima série!');
    return;
  }
  $left.textContent = formatClock(Math.ceil(millisecondsLeft / 1000));
  $bar.style.transform = `scaleX(${Math.max(0, millisecondsLeft / timer.duration)})`;
}

export function startRest(seconds) {
  unlockAudio();
  timer.duration = seconds * 1000;
  timer.endsAt = Date.now() + timer.duration;
  $rest.hidden = false;
  timer.intervalId ||= setInterval(tick, 250);
  tick();
}

export function adjustRest(seconds) {
  timer.endsAt += seconds * 1000;
  timer.duration = Math.max(timer.duration, timer.endsAt - Date.now());
  tick();
}

export function stopRest() {
  clearInterval(timer.intervalId);
  timer.intervalId = null;
  $rest.hidden = true;
}

export const restActions = {
  'rest-add': ({ seconds }) => adjustRest(Number(seconds)),
  'rest-skip': () => stopRest(),
};

// Keeps the screen on while a workout is open (Safari 16.4+); silently does nothing elsewhere.
let sentinel = null;
let wanted = false;

async function acquire() {
  if (!wanted || sentinel || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => { sentinel = null; }, { once: true });
  } catch {
    sentinel = null;
  }
}

export function syncWakeLock(shouldKeepAwake) {
  wanted = shouldKeepAwake;
  if (wanted) acquire();
  else sentinel?.release().catch(() => {});
}

document.addEventListener('visibilitychange', acquire);

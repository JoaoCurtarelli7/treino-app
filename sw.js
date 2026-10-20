// App shell: network-first so every deploy shows up immediately, cache as offline fallback.
// Photos: cache-first in a separate cache that app updates never wipe.
const SHELL_CACHE = 'treino-shell-v5';
const IMAGE_CACHE = 'treino-images-v1';
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/app.css",
  "./catalog.json",
  "./icon.png",
  "./js/config/exercises.js",
  "./js/config/templates.js",
  "./js/core/catalog.js",
  "./js/core/exercises.js",
  "./js/core/format.js",
  "./js/core/history.js",
  "./js/core/image-cache.js",
  "./js/core/photos.js",
  "./js/core/profiles.js",
  "./js/core/progression.js",
  "./js/core/store.js",
  "./js/core/workouts.js",
  "./js/main.js",
  "./js/ui/chart.js",
  "./js/ui/dom.js",
  "./js/ui/fragments.js",
  "./js/ui/media.js",
  "./js/ui/plan-fields.js",
  "./js/ui/rest-timer.js",
  "./js/ui/state.js",
  "./js/ui/wake-lock.js",
  "./js/views/body-weight.js",
  "./js/views/exercise-picker.js",
  "./js/views/history.js",
  "./js/views/photo-sheet.js",
  "./js/views/plan-editor.js",
  "./js/views/profiles.js",
  "./js/views/progress.js",
  "./js/views/session.js",
  "./js/views/settings.js",
  "./js/views/train.js",
  "./js/views/workouts.js"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  const keep = new Set([SHELL_CACHE, IMAGE_CACHE]);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => !keep.has(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const isImage = url.pathname.includes('/img/') || url.hostname === 'raw.githubusercontent.com';

  if (isImage) event.respondWith(cacheFirst(request, IMAGE_CACHE));
  else if (url.origin === self.location.origin) event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const fallback = request.mode === 'navigate' ? './index.html' : request;
    return (await cache.match(fallback, { ignoreSearch: true })) || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

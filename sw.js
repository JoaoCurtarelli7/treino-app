// Offline cache: app shell + plan photos precached; catalog photos cached on first view.
const CACHE_VERSION = 'treino-v2';
const APP_SHELL = [
  "./",
  "./index.html",
  "./catalog.json",
  "./img/Barbell_Bench_Press_-_Medium_Grip_0.jpg",
  "./img/Barbell_Bench_Press_-_Medium_Grip_1.jpg",
  "./img/Barbell_Curl_0.jpg",
  "./img/Barbell_Curl_1.jpg",
  "./img/Barbell_Deadlift_0.jpg",
  "./img/Barbell_Deadlift_1.jpg",
  "./img/Barbell_Full_Squat_0.jpg",
  "./img/Barbell_Full_Squat_1.jpg",
  "./img/Bent_Over_Barbell_Row_0.jpg",
  "./img/Bent_Over_Barbell_Row_1.jpg",
  "./img/Cable_Crossover_0.jpg",
  "./img/Cable_Crossover_1.jpg",
  "./img/Dips_-_Chest_Version_0.jpg",
  "./img/Dips_-_Chest_Version_1.jpg",
  "./img/Dumbbell_Shoulder_Press_0.jpg",
  "./img/Dumbbell_Shoulder_Press_1.jpg",
  "./img/Hammer_Curls_0.jpg",
  "./img/Hammer_Curls_1.jpg",
  "./img/Incline_Dumbbell_Press_0.jpg",
  "./img/Incline_Dumbbell_Press_1.jpg",
  "./img/Leg_Press_0.jpg",
  "./img/Leg_Press_1.jpg",
  "./img/Lying_Leg_Curls_0.jpg",
  "./img/Lying_Leg_Curls_1.jpg",
  "./img/One-Arm_Dumbbell_Row_0.jpg",
  "./img/One-Arm_Dumbbell_Row_1.jpg",
  "./img/Plank_0.jpg",
  "./img/Plank_1.jpg",
  "./img/Pullups_0.jpg",
  "./img/Pullups_1.jpg",
  "./img/Romanian_Deadlift_0.jpg",
  "./img/Romanian_Deadlift_1.jpg",
  "./img/Seated_Triceps_Press_0.jpg",
  "./img/Seated_Triceps_Press_1.jpg",
  "./img/Side_Lateral_Raise_0.jpg",
  "./img/Side_Lateral_Raise_1.jpg",
  "./img/Standing_Calf_Raises_0.jpg",
  "./img/Standing_Calf_Raises_1.jpg",
  "./img/Stiff-Legged_Dumbbell_Deadlift_0.jpg",
  "./img/Stiff-Legged_Dumbbell_Deadlift_1.jpg",
  "./img/Straight-Arm_Pulldown_0.jpg",
  "./img/Straight-Arm_Pulldown_1.jpg",
  "./img/Triceps_Pushdown_-_Rope_Attachment_0.jpg",
  "./img/Triceps_Pushdown_-_Rope_Attachment_1.jpg"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else if (url.origin === self.location.origin || url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(cacheFirst(request));
  }
});

// Page: always try the network so a new deploy shows up; fall back to cache when offline.
async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('./index.html', response.clone());
    return response;
  } catch {
    return (await cache.match('./index.html')) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

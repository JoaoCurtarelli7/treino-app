// Shared with sw.js: photos live in their own cache so app updates never wipe them.
export const IMAGE_CACHE = 'treino-images-v1';
const CONCURRENCY = 4;

export const catalogImagePaths = catalog => catalog.flatMap(entry => [0, 1].map(frame => `img/${entry.id}_${frame}.jpg`));

async function cachedSet(cache) {
  return new Set((await cache.keys()).map(request => new URL(request.url).pathname));
}

export async function imageCacheStatus(catalog) {
  if (!('caches' in window)) return null;
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cachedSet(cache);
  const paths = catalogImagePaths(catalog);
  return { cached: paths.filter(path => cached.has(new URL(path, location.href).pathname)).length, total: paths.length };
}

// Downloads every catalog photo once, in the background, so the gym's bad signal never matters.
export async function warmImageCache(catalog, onProgress = () => {}) {
  if (!('caches' in window) || navigator.connection?.saveData) return;
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cachedSet(cache);
  const paths = catalogImagePaths(catalog);
  const missing = paths.filter(path => !cached.has(new URL(path, location.href).pathname));
  let done = paths.length - missing.length;

  const worker = async () => {
    while (missing.length) {
      const path = missing.shift();
      try {
        await cache.add(path);
        done += 1;
        onProgress({ cached: done, total: paths.length });
      } catch {
        // Offline or flaky network: the next app launch picks up where this stopped.
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

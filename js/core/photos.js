// User photos live in IndexedDB (localStorage is too small for images).
const DATABASE_NAME = 'treino-photos';
const STORE_NAME = 'photos';
const MAX_PHOTO_SIZE = 720;

const objectUrls = new Map();
let databasePromise = null;

function openDatabase() {
  databasePromise ||= new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DATABASE_NAME, 1);
    openRequest.onupgradeneeded = () => openRequest.result.createObjectStore(STORE_NAME);
    openRequest.onsuccess = () => resolve(openRequest.result);
    openRequest.onerror = () => reject(openRequest.error);
  });
  return databasePromise;
}

async function runRequest(mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = operation(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function cacheUrl(exerciseId, blob) {
  if (objectUrls.has(exerciseId)) URL.revokeObjectURL(objectUrls.get(exerciseId));
  objectUrls.set(exerciseId, URL.createObjectURL(blob));
}

export async function loadPhotos() {
  try {
    const [keys, blobs] = await Promise.all([
      runRequest('readonly', store => store.getAllKeys()),
      runRequest('readonly', store => store.getAll()),
    ]);
    keys.forEach((key, index) => cacheUrl(key, blobs[index]));
  } catch {
    // IndexedDB unavailable (e.g. private mode): the app keeps working with catalog photos only.
  }
}

export const photoUrl = exerciseId => objectUrls.get(exerciseId) || null;
export const hasPhoto = exerciseId => objectUrls.has(exerciseId);

export async function savePhoto(exerciseId, blob) {
  await runRequest('readwrite', store => store.put(blob, exerciseId));
  cacheUrl(exerciseId, blob);
}

export async function deletePhoto(exerciseId) {
  await runRequest('readwrite', store => store.delete(exerciseId));
  if (objectUrls.has(exerciseId)) URL.revokeObjectURL(objectUrls.get(exerciseId));
  objectUrls.delete(exerciseId);
}

// Drawing through an <img> lets Safari apply the EXIF orientation of camera photos.
export async function resizeImage(file) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Imagem inválida'));
      element.src = sourceUrl;
    });
    const scale = Math.min(1, MAX_PHOTO_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

const blobToDataUrl = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export async function exportPhotos() {
  try {
    const [keys, blobs] = await Promise.all([
      runRequest('readonly', store => store.getAllKeys()),
      runRequest('readonly', store => store.getAll()),
    ]);
    const entries = await Promise.all(keys.map(async (key, index) => [key, await blobToDataUrl(blobs[index])]));
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export async function importPhotos(photosByExercise = {}) {
  for (const [exerciseId, dataUrl] of Object.entries(photosByExercise)) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) continue;
    const blob = await (await fetch(dataUrl)).blob();
    await savePhoto(exerciseId, blob);
  }
}

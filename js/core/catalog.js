import { EXERCISES } from '../config/exercises.js';
import { store, persist } from './store.js';
import { normalizeText } from './format.js';

let catalogPromise = null;
let catalogCache = null;

export function loadCatalog() {
  catalogPromise ||= fetch('catalog.json')
    .then(response => {
      if (!response.ok) throw new Error(response.statusText);
      return response.json();
    })
    .then(catalog => {
      catalogCache = catalog;
      translateSavedCatalogExercises(catalog);
      return catalog;
    })
    .catch(error => {
      catalogPromise = null;
      throw error;
    });
  return catalogPromise;
}

export const getLoadedCatalog = () => catalogCache;

// Re-applies name upgrades after the active profile (and therefore store.data) changes.
export function syncSavedCatalogNames() {
  if (catalogCache) translateSavedCatalogExercises(catalogCache);
}

export const catalogExerciseId = imageId => `db:${imageId}`;

// Exercises saved before the catalog was translated still carry the English name: upgrade them.
function translateSavedCatalogExercises(catalog) {
  const byId = new Map(catalog.map(entry => [catalogExerciseId(entry.id), entry]));
  let changed = false;
  for (const [exerciseId, exercise] of Object.entries(store.data.customExercises)) {
    const entry = byId.get(exerciseId);
    if (entry && exercise.name === entry.en) {
      exercise.name = entry.name;
      changed = true;
    }
  }
  if (changed) persist();
}

const builtInImageIds = new Set(Object.values(EXERCISES).map(exercise => exercise.imageId));

function matchesQuery(fields, queryTokens) {
  const haystack = normalizeText(fields.filter(Boolean).join(' '));
  return queryTokens.every(token => haystack.includes(token));
}

/**
 * Unified search over plan exercises, the user's own exercises and the catalog.
 * Catalog entries already covered by a built-in or saved exercise are hidden so history never splits in two.
 */
export function searchExercises({ query = '', group = 'all', excludeIds = new Set(), includeCustom = true } = {}) {
  const queryTokens = normalizeText(query).split(/\s+/).filter(Boolean);
  const { customExercises } = store.data;

  const builtIns = Object.entries(EXERCISES).map(([id, exercise]) => ({ id, ...exercise, source: 'builtin' }));
  const customs = includeCustom
    ? Object.entries(customExercises).map(([id, exercise]) => ({ id, ...exercise, source: 'custom' }))
    : [];
  const catalog = (catalogCache || [])
    .filter(entry => !builtInImageIds.has(entry.id) && !(includeCustom && customExercises[catalogExerciseId(entry.id)]))
    .map(entry => ({ id: catalogExerciseId(entry.id), name: entry.name, en: entry.en, group: entry.group,
      equipment: entry.equipment, imageId: entry.id, source: 'catalog' }));

  return [...builtIns, ...customs, ...catalog].filter(exercise =>
    !excludeIds.has(exercise.id)
    && (group === 'all' || exercise.group === group)
    && matchesQuery([exercise.name, exercise.en, exercise.equipment], queryTokens));
}

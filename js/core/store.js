import { TEMPLATES } from '../config/templates.js';
import { activeProfile } from './profiles.js';

const DATA_VERSION = 3;

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isValidSession = session =>
  isPlainObject(session) && typeof session.id === 'string' && typeof session.date === 'string' && Array.isArray(session.exercises);
const isValidBodyWeight = entry =>
  isPlainObject(entry) && typeof entry.date === 'string' && Number.isFinite(entry.weight);
const isValidCardio = entry =>
  isPlainObject(entry) && typeof entry.id === 'string' && typeof entry.date === 'string' && Number.isFinite(entry.minutes);
const isValidWorkout = workout =>
  isPlainObject(workout) && typeof workout.id === 'string' && typeof workout.name === 'string' && Array.isArray(workout.items);

export function createEmptyData() {
  return {
    version: DATA_VERSION,
    workouts: [],
    sessions: [],
    draft: null,
    customExercises: {},
    imageOverrides: {},
    notes: {},
    bodyWeights: [],
    cardio: [],
    pendingWorkout: null,
  };
}

/**
 * Up to v2 workouts were fixed programs (programId + customPlans overrides).
 * Someone who already trained keeps exactly what they had, with the same ids so history still lines up;
 * an untouched profile starts empty and builds its own.
 */
function migrateWorkouts(value) {
  if (Array.isArray(value?.workouts)) return value.workouts.filter(isValidWorkout);

  const customPlans = isPlainObject(value?.customPlans) ? value.customPlans : {};
  const sessions = Array.isArray(value?.sessions) ? value.sessions : [];
  if (!sessions.length && !Object.keys(customPlans).length && !value?.draft) return [];

  const program = TEMPLATES.find(template => template.id === value?.programId) || TEMPLATES[0];
  const usedIds = new Set([...sessions.map(session => session.workoutId), value?.draft?.workoutId].filter(Boolean));
  const otherUsed = TEMPLATES
    .flatMap(template => template.workouts)
    .filter(workout => usedIds.has(workout.id) && !program.workouts.includes(workout));

  return [...program.workouts, ...otherUsed].map(workout => ({
    id: workout.id,
    name: workout.name,
    items: (Array.isArray(customPlans[workout.id]) ? customPlans[workout.id] : workout.items).map(item => ({ ...item })),
  }));
}

// Accepts any previous version (or a backup file) and fills in whatever is missing.
export function normalizeData(value) {
  const base = createEmptyData();
  const objectOr = key => (isPlainObject(value?.[key]) ? value[key] : base[key]);
  const workouts = migrateWorkouts(value);
  return {
    ...base,
    workouts,
    sessions: Array.isArray(value?.sessions) ? value.sessions.filter(isValidSession) : [],
    draft: value?.draft && workouts.some(workout => workout.id === value.draft.workoutId) ? value.draft : null,
    customExercises: objectOr('customExercises'),
    imageOverrides: objectOr('imageOverrides'),
    notes: objectOr('notes'),
    bodyWeights: Array.isArray(value?.bodyWeights) ? value.bodyWeights.filter(isValidBodyWeight) : [],
    cardio: Array.isArray(value?.cardio) ? value.cardio.filter(isValidCardio) : [],
    pendingWorkout: isPlainObject(value?.pendingWorkout)
      && workouts.some(workout => workout.id === value.pendingWorkout.workoutId)
      && Array.isArray(value.pendingWorkout.exerciseIds)
      ? value.pendingWorkout : null,
  };
}

const storageKey = () => activeProfile()?.storageKey ?? null;

function readStoredData() {
  const key = storageKey();
  if (!key) return createEmptyData();
  try {
    const raw = localStorage.getItem(key);
    return raw ? normalizeData(JSON.parse(raw)) : createEmptyData();
  } catch {
    return createEmptyData();
  }
}

export const store = { data: readStoredData() };

// Called after switching profiles so every view reads the new person's data.
export function reloadStore() {
  store.data = readStoredData();
}

let persistErrorListener = () => {};
export const onPersistError = listener => { persistErrorListener = listener; };

export function persist() {
  const key = storageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(store.data));
  } catch {
    persistErrorListener();
  }
}

export function replaceData(nextData) {
  store.data = nextData;
  persist();
}

import { PROGRAMS, WORKOUTS } from '../config/programs.js';
import { activeProfile } from './profiles.js';

const DATA_VERSION = 2;

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isValidSession = session =>
  isPlainObject(session) && typeof session.id === 'string' && typeof session.date === 'string' && Array.isArray(session.exercises);
const isValidBodyWeight = entry =>
  isPlainObject(entry) && typeof entry.date === 'string' && Number.isFinite(entry.weight);

export function createEmptyData() {
  return {
    version: DATA_VERSION,
    programId: PROGRAMS[0].id,
    sessions: [],
    draft: null,
    customExercises: {},
    customPlans: {},
    imageOverrides: {},
    notes: {},
    bodyWeights: [],
  };
}

// Accepts any previous version (or a backup file) and fills in whatever is missing.
export function normalizeData(value) {
  const base = createEmptyData();
  const objectOr = key => (isPlainObject(value?.[key]) ? value[key] : base[key]);
  return {
    ...base,
    programId: PROGRAMS.some(program => program.id === value?.programId) ? value.programId : base.programId,
    sessions: Array.isArray(value?.sessions) ? value.sessions.filter(isValidSession) : [],
    draft: value?.draft && WORKOUTS[value.draft.workoutId] ? value.draft : null,
    customExercises: objectOr('customExercises'),
    customPlans: Object.fromEntries(
      Object.entries(objectOr('customPlans')).filter(([workoutId, items]) => WORKOUTS[workoutId] && Array.isArray(items))
    ),
    imageOverrides: objectOr('imageOverrides'),
    notes: objectOr('notes'),
    bodyWeights: Array.isArray(value?.bodyWeights) ? value.bodyWeights.filter(isValidBodyWeight) : [],
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

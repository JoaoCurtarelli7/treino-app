import { PROGRAMS, WORKOUTS } from '../config/programs.js';

const STORAGE_KEY = 'treino-log:v1';
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

function readStoredData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : createEmptyData();
  } catch {
    return createEmptyData();
  }
}

export const store = { data: readStoredData() };

let persistErrorListener = () => {};
export const onPersistError = listener => { persistErrorListener = listener; };

export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store.data));
  } catch {
    persistErrorListener();
  }
}

export function replaceData(nextData) {
  store.data = nextData;
  persist();
}

import { TEMPLATES, TEMPLATE_WORKOUTS } from '../config/templates.js';
import { store } from './store.js';
import { createId } from './format.js';

// Each person owns an ordered list of workouts; the letter (A, B, C…) comes from the position.
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const getWorkouts = () => store.data.workouts;
export const getWorkout = workoutId => store.data.workouts.find(workout => workout.id === workoutId) || null;

export function workoutTag(workoutId) {
  const index = store.data.workouts.findIndex(workout => workout.id === workoutId);
  if (index < 0) return '';
  return LETTERS[index] ?? String(index + 1);
}

export const getWorkoutItems = workoutId => getWorkout(workoutId)?.items ?? [];
export const isInWorkout = (workoutId, exerciseId) => getWorkoutItems(workoutId).some(item => item.exerciseId === exerciseId);

export function setWorkoutItems(workoutId, items) {
  const workout = getWorkout(workoutId);
  if (workout) workout.items = items;
}

export function updateWorkoutItem(workoutId, exerciseId, changes) {
  setWorkoutItems(workoutId, getWorkoutItems(workoutId).map(item =>
    item.exerciseId === exerciseId ? { ...item, ...changes } : item));
}

const swap = (list, index, offset) => {
  const target = index + offset;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
};

export function moveWorkoutItem(workoutId, index, offset) {
  setWorkoutItems(workoutId, swap(getWorkoutItems(workoutId), index, offset));
}

export function createWorkout(name, items = []) {
  const workout = { id: `w-${createId()}`, name, items: items.map(item => ({ ...item })) };
  store.data.workouts.push(workout);
  return workout;
}

export function renameWorkout(workoutId, name) {
  const workout = getWorkout(workoutId);
  if (workout) workout.name = name;
}

// History keeps the workout's name in each session, so deleting a workout never erases past records.
export function deleteWorkout(workoutId) {
  store.data.workouts = store.data.workouts.filter(workout => workout.id !== workoutId);
}

export function moveWorkout(index, offset) {
  store.data.workouts = swap(store.data.workouts, index, offset);
}

export function addTemplate(templateId) {
  const template = TEMPLATES.find(item => item.id === templateId);
  template?.workouts.forEach(workout => createWorkout(workout.name, workout.items));
  return template;
}

export function sessionWorkoutName(session) {
  return session.workoutName || getWorkout(session.workoutId)?.name || TEMPLATE_WORKOUTS[session.workoutId]?.name || 'Treino';
}

/* ---------- Split workouts ---------- */
// A workout finished halfway keeps its remaining exercises here until the next session of that workout.

export function getPendingWorkout() {
  const pending = store.data.pendingWorkout;
  return pending && getWorkout(pending.workoutId) ? pending : null;
}

export function pendingItems() {
  const pending = getPendingWorkout();
  if (!pending) return [];
  const ids = new Set(pending.exerciseIds);
  return getWorkoutItems(pending.workoutId).filter(item => ids.has(item.exerciseId));
}

export function setPendingWorkout(workoutId, exerciseIds) {
  store.data.pendingWorkout = exerciseIds.length ? { workoutId, exerciseIds, date: new Date().toISOString() } : null;
}

export function clearPendingWorkout() {
  store.data.pendingWorkout = null;
}

export function nextWorkoutId() {
  const workouts = getWorkouts();
  if (!workouts.length) return null;
  if (pendingItems().length) return getPendingWorkout().workoutId;
  const ids = workouts.map(workout => workout.id);
  const last = [...store.data.sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find(session => ids.includes(session.workoutId));
  return last ? ids[(ids.indexOf(last.workoutId) + 1) % ids.length] : ids[0];
}

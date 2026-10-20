import { EXERCISES, DEFAULT_PLAN } from '../config/exercises.js';
import { WORKOUTS } from '../config/programs.js';
import { store } from './store.js';

export function getExercise(exerciseId) {
  return EXERCISES[exerciseId] || store.data.customExercises[exerciseId] || { name: exerciseId, group: 'other' };
}

export const isBuiltInExercise = exerciseId => Boolean(EXERCISES[exerciseId]);

export function imageIdFor(exerciseId) {
  return store.data.imageOverrides[exerciseId] || getExercise(exerciseId).imageId || null;
}

export function setImageOverride(exerciseId, imageId) {
  if (imageId) store.data.imageOverrides[exerciseId] = imageId;
  else delete store.data.imageOverrides[exerciseId];
}

export const getNote = exerciseId => store.data.notes[exerciseId] || '';

export function setNote(exerciseId, text) {
  const trimmed = text.trim();
  if (trimmed) store.data.notes[exerciseId] = trimmed;
  else delete store.data.notes[exerciseId];
}

export const getWorkoutItems = workoutId => store.data.customPlans[workoutId] || WORKOUTS[workoutId].items;
export const isWorkoutCustomized = workoutId => Boolean(store.data.customPlans[workoutId]);
export const isInWorkout = (workoutId, exerciseId) => getWorkoutItems(workoutId).some(item => item.exerciseId === exerciseId);

export function setWorkoutItems(workoutId, items) {
  store.data.customPlans[workoutId] = items;
}

export function restoreWorkout(workoutId) {
  delete store.data.customPlans[workoutId];
}

export function updateWorkoutItem(workoutId, exerciseId, changes) {
  setWorkoutItems(workoutId, getWorkoutItems(workoutId).map(item =>
    item.exerciseId === exerciseId ? { ...item, ...changes } : item));
}

export function moveWorkoutItem(workoutId, index, offset) {
  const items = [...getWorkoutItems(workoutId)];
  const target = index + offset;
  if (target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
  setWorkoutItems(workoutId, items);
}

export function planForEntry(entry, workoutId) {
  return entry.plan || getWorkoutItems(workoutId).find(item => item.exerciseId === entry.exerciseId) || DEFAULT_PLAN;
}

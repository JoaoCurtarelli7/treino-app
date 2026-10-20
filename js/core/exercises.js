import { EXERCISES, DEFAULT_PLAN } from '../config/exercises.js';
import { store } from './store.js';
import { getWorkoutItems } from './workouts.js';

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

export function planForEntry(entry, workoutId) {
  return entry.plan || getWorkoutItems(workoutId).find(item => item.exerciseId === entry.exerciseId) || DEFAULT_PLAN;
}

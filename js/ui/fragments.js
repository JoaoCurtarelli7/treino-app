import { getExercise } from '../core/exercises.js';
import { formatNumber } from '../core/format.js';

export function formatSet(set, exerciseId) {
  const unit = getExercise(exerciseId).repsLabel === 'seg' ? 's' : '';
  return set.weight ? `${formatNumber(set.weight)}×${set.reps}${unit}` : `${set.reps}${unit}`;
}

export const formatSets = (sets, exerciseId) => sets.map(set => formatSet(set, exerciseId)).join(' · ');

export function formatDelta(delta, unit = 'kg') {
  if (delta > 0) return `<span class="delta up">▲ ${formatNumber(delta)} ${unit}</span>`;
  if (delta < 0) return `<span class="delta down">▼ ${formatNumber(Math.abs(delta))} ${unit}</span>`;
  return '<span class="delta same">= mesma</span>';
}

export const emptyState = (title, text) => `<div class="empty"><strong>${title}</strong>${text}</div>`;

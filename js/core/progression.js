import { topWeight } from './history.js';

export function parseRepRange(reps) {
  const numbers = String(reps).match(/\d+/g)?.map(Number) || [];
  return numbers.length ? { min: numbers[0], max: numbers[numbers.length - 1] } : null;
}

const incrementFor = weight => (weight >= 40 ? 2.5 : weight >= 10 ? 2 : 1);

// Double progression: once every planned set reaches the top of the rep range, add load.
export function suggestNextWeight(lastSets, plan) {
  const range = parseRepRange(plan.reps);
  if (!range || !lastSets?.length || lastSets.length < plan.sets) return null;
  const top = topWeight(lastSets);
  if (!top) return null;
  const workingSets = lastSets.filter(set => set.weight === top);
  const reachedTop = workingSets.length >= Math.min(plan.sets, lastSets.length) && workingSets.every(set => set.reps >= range.max);
  if (!reachedTop) return null;
  return { weight: top + incrementFor(top), previous: top };
}

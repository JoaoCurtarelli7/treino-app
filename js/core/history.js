import { store } from './store.js';
import { startOfDay } from './format.js';

export const sessionsNewestFirst = () => [...store.data.sessions].sort((a, b) => b.date.localeCompare(a.date));

export const topWeight = sets => Math.max(0, ...sets.map(set => set.weight || 0));
export const bestReps = sets => Math.max(0, ...sets.map(set => set.reps || 0));
export const volumeOf = sets => sets.reduce((total, set) => total + (set.weight || 0) * (set.reps || 0), 0);

export function lastPerformance(exerciseId) {
  for (const session of sessionsNewestFirst()) {
    const entry = session.exercises.find(e => e.exerciseId === exerciseId);
    if (entry?.sets.length) return { date: session.date, sets: entry.sets };
  }
  return null;
}

export function exerciseHistory(exerciseId) {
  return [...store.data.sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(session => ({ session, entry: session.exercises.find(e => e.exerciseId === exerciseId) }))
    .filter(({ entry }) => entry?.sets.length)
    .map(({ session, entry }) => ({
      sessionId: session.id,
      date: session.date,
      sets: entry.sets,
      top: topWeight(entry.sets),
      reps: bestReps(entry.sets),
      volume: volumeOf(entry.sets),
    }));
}

// Bodyweight exercises (no load ever recorded) are tracked by reps instead of kg.
export function progressMetric(history) {
  return history.some(h => h.top > 0)
    ? { key: 'top', unit: 'kg', label: 'Carga máxima' }
    : { key: 'reps', unit: 'reps', label: 'Máx. repetições' };
}

export const trainedExerciseIds = () =>
  [...new Set(store.data.sessions.flatMap(session => session.exercises.map(entry => entry.exerciseId)))];

export const lastSessionOfWorkout = workoutId =>
  sessionsNewestFirst().find(session => session.workoutId === workoutId) || null;

// Week starts on Monday, as it does at the gym.
export function currentWeekSummary(today = new Date()) {
  const monday = startOfDay(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
  const sessions = store.data.sessions.filter(session => new Date(session.date) >= monday);
  const trainedDays = new Set(sessions.map(session => startOfDay(new Date(session.date)).getTime()));
  return {
    days: days.map(day => ({ date: day, trained: trainedDays.has(day.getTime()), isToday: day.getTime() === startOfDay(today).getTime() })),
    count: sessions.length,
    volume: volumeOf(sessions.flatMap(session => session.exercises.flatMap(entry => entry.sets))),
  };
}

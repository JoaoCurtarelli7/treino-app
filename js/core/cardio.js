import { CARDIO_TYPE_BY_ID } from '../config/cardio.js';
import { store } from './store.js';
import { createId, startOfDay, formatNumber } from './format.js';

export const cardioNewestFirst = () => [...store.data.cardio].sort((a, b) => b.date.localeCompare(a.date));
export const getCardio = cardioId => store.data.cardio.find(entry => entry.id === cardioId) || null;
export const cardioType = typeId => CARDIO_TYPE_BY_ID[typeId] || CARDIO_TYPE_BY_ID.other;
export const lastCardioTypeId = () => cardioNewestFirst()[0]?.type ?? 'treadmill';

export function saveCardio(fields, cardioId = null) {
  const existing = cardioId ? getCardio(cardioId) : null;
  if (existing) {
    Object.assign(existing, fields);
    return existing;
  }
  const entry = { id: createId(), ...fields };
  store.data.cardio.push(entry);
  return entry;
}

export function deleteCardio(cardioId) {
  store.data.cardio = store.data.cardio.filter(entry => entry.id !== cardioId);
}

export const minutesOf = entries => entries.reduce((total, entry) => total + (entry.minutes || 0), 0);

export function cardioSince(fromDate) {
  return store.data.cardio.filter(entry => new Date(entry.date) >= fromDate);
}

export function startOfWeek(date = new Date()) {
  const monday = startOfDay(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

// Always returns `weeks` points (zeros included) so the chart shows gaps honestly.
export function weeklyMinutes(weeks = 8, today = new Date()) {
  const currentMonday = startOfWeek(today);
  return Array.from({ length: weeks }, (_, index) => {
    const start = new Date(currentMonday);
    start.setDate(start.getDate() - (weeks - 1 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const entries = store.data.cardio.filter(entry => {
      const date = new Date(entry.date);
      return date >= start && date < end;
    });
    return { date: start.toISOString(), value: minutesOf(entries) };
  });
}

export function formatCardioMetrics(entry) {
  const parts = [`${formatNumber(entry.minutes)} min`];
  if (entry.distanceKm) {
    parts.push(`${formatNumber(entry.distanceKm)} km`);
    const hours = entry.minutes / 60;
    if (cardioType(entry.type).pace) {
      const secondsPerKm = Math.round((entry.minutes * 60) / entry.distanceKm);
      parts.push(`${Math.floor(secondsPerKm / 60)}:${String(secondsPerKm % 60).padStart(2, '0')}/km`);
    } else if (hours > 0) {
      parts.push(`${formatNumber(Math.round((entry.distanceKm / hours) * 10) / 10)} km/h`);
    }
  }
  if (entry.calories) parts.push(`${formatNumber(entry.calories)} kcal`);
  if (entry.heartRate) parts.push(`${entry.heartRate} bpm`);
  return parts.join(' · ');
}

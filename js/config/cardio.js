// `pace: true` shows min/km (running/walking); otherwise distance shows as km/h.
export const CARDIO_TYPES = [
  { id: 'treadmill', name: 'Esteira', icon: '🏃' },
  { id: 'incline-walk', name: 'Esteira inclinada', icon: '⛰️', pace: true },
  { id: 'bike', name: 'Bike', icon: '🚴' },
  { id: 'elliptical', name: 'Elíptico', icon: '🌀' },
  { id: 'stairs', name: 'Escada', icon: '🪜' },
  { id: 'rower', name: 'Remo', icon: '🚣' },
  { id: 'run', name: 'Corrida', icon: '🏃', pace: true },
  { id: 'walk', name: 'Caminhada', icon: '🚶', pace: true },
  { id: 'swim', name: 'Natação', icon: '🏊' },
  { id: 'jump-rope', name: 'Corda', icon: '➰' },
  { id: 'hiit', name: 'HIIT', icon: '🔥' },
  { id: 'other', name: 'Outro', icon: '❤️' },
];

export const CARDIO_TYPE_BY_ID = Object.fromEntries(CARDIO_TYPES.map(type => [type.id, type]));

export const INTENSITIES = [
  { id: 'light', name: 'Leve' },
  { id: 'moderate', name: 'Moderada' },
  { id: 'hard', name: 'Intensa' },
];

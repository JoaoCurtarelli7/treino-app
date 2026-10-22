import { store, persist } from '../core/store.js';
import { getExercise } from '../core/exercises.js';
import { sessionWorkoutName, workoutTag } from '../core/workouts.js';
import { sessionsNewestFirst, volumeOf } from '../core/history.js';
import { escapeHtml, formatDate, formatNumber } from '../core/format.js';
import { renderThumb } from '../ui/media.js';
import { formatSets, emptyState } from '../ui/fragments.js';
import { ui, navigate } from '../ui/state.js';
import { cardioNewestFirst } from '../core/cardio.js';
import { renderCardioItem } from './cardio.js';

export function renderHistory() {
  return ui.sessionId ? renderSessionDetail(ui.sessionId) : renderHistoryList();
}

function workoutLabel(session) {
  const tag = workoutTag(session.workoutId);
  return `${tag ? `${tag} · ` : ''}${escapeHtml(sessionWorkoutName(session))}${session.part === 'continuation' ? ' <small class="muted">(continuação)</small>' : ''}`;
}

function renderSessionItem(session) {
  const sets = session.exercises.flatMap(entry => entry.sets);
  return `
          <button class="item" data-action="open-session" data-id="${session.id}">
            <div class="main"><strong>${workoutLabel(session)}</strong>
              <small>${formatDate(session.date, { weekday: 'long', day: '2-digit', month: '2-digit' })}</small></div>
            <div class="side"><strong>${sets.length} séries</strong><small class="muted">${formatNumber(Math.round(volumeOf(sets)))} kg</small></div>
          </button>`;
}

// Strength sessions and cardio share one timeline, newest first.
function renderHistoryList() {
  const sessions = sessionsNewestFirst();
  const cardio = cardioNewestFirst();
  if (!sessions.length && !cardio.length) {
    return `<header class="top"><h1>Histórico</h1></header>${emptyState('Nenhum treino salvo', 'Os treinos finalizados e os cardios registrados aparecem aqui.')}`;
  }
  const timeline = [
    ...sessions.map(session => ({ date: session.date, html: renderSessionItem(session) })),
    ...cardio.map(entry => ({ date: entry.date, html: renderCardioItem(entry) })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const subtitle = [`${sessions.length} treino(s)`, cardio.length ? `${cardio.length} cardio` : ''].filter(Boolean).join(' · ');
  return `
    <header class="top"><h1>Histórico</h1><p class="sub">${subtitle}</p></header>
    <div class="list">${timeline.map(item => item.html).join('')}</div>`;
}

function renderSessionDetail(sessionId) {
  const session = store.data.sessions.find(s => s.id === sessionId);
  if (!session) return renderHistoryList();
  const minutes = session.startedAt ? Math.round((new Date(session.date) - new Date(session.startedAt)) / 60000) : null;
  return `
    <button class="back" data-action="back-history">‹ Histórico</button>
    <header class="top"><p class="eyebrow">${formatDate(session.date, { weekday: 'long', day: '2-digit', month: 'long' })}</p>
      <h1>${escapeHtml(sessionWorkoutName(session))}</h1>${minutes !== null ? `<p class="sub">${minutes} min</p>` : ''}</header>
    <div class="list">
      ${session.exercises.map(entry => {
        const { name } = getExercise(entry.exerciseId);
        return `
          <button class="item start" data-action="open-exercise" data-id="${escapeHtml(entry.exerciseId)}">${renderThumb(entry.exerciseId, name)}
            <div class="main"><strong>${escapeHtml(name)}</strong><span class="sets-line">${formatSets(entry.sets, entry.exerciseId)}</span></div></button>`;
      }).join('')}
    </div>
    <div class="finish" style="margin-top:16px"><button class="ghost danger" data-action="delete-session" data-id="${session.id}">Excluir este treino</button></div>`;
}

function deleteSession(sessionId) {
  if (!confirm('Excluir este treino do histórico?')) return;
  store.data.sessions = store.data.sessions.filter(session => session.id !== sessionId);
  persist();
  navigate({ sessionId: null });
}

export const historyActions = {
  'open-session': ({ id }) => navigate({ sessionId: id }),
  'back-history': () => navigate({ sessionId: null }),
  'delete-session': ({ id }) => deleteSession(id),
};

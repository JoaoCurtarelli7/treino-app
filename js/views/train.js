import { PROGRAMS } from '../config/programs.js';
import { store, persist } from '../core/store.js';
import { getWorkoutItems } from '../core/exercises.js';
import { lastSessionOfWorkout, nextWorkoutId, currentWeekSummary } from '../core/history.js';
import { escapeHtml, formatNumber, formatRelativeDays } from '../core/format.js';
import { ui, render } from '../ui/state.js';
import { renderSession, renderSummary } from './session.js';

const WEEKDAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export function renderTrain() {
  if (ui.summary) return renderSummary(ui.summary);
  if (store.data.draft) return renderSession();
  return renderHome();
}

function renderWeekCard() {
  const week = currentWeekSummary();
  return `
    <div class="week">
      <div class="week-head">
        <strong>Esta semana</strong>
        <span class="muted">${week.count} treino(s)${week.volume ? ` · ${formatNumber(Math.round(week.volume))} kg` : ''}</span>
      </div>
      <div class="week-days">
        ${week.days.map((day, index) => `
          <span class="day ${day.trained ? 'on' : ''} ${day.isToday ? 'today' : ''}">${WEEKDAY_LABELS[index]}</span>`).join('')}
      </div>
    </div>`;
}

function renderWorkoutCard(workout, isSuggested) {
  const last = lastSessionOfWorkout(workout.id);
  const lastLabel = last ? `último ${formatRelativeDays(last.date)}` : 'ainda não feito';
  return `
    <button class="wcard ${isSuggested ? 'next' : ''}" data-action="start" data-id="${workout.id}">
      <span class="tag">${workout.tag}</span>
      <span class="wbody"><strong>${escapeHtml(workout.name)}</strong><small>${getWorkoutItems(workout.id).length} exercícios · ${lastLabel}</small></span>
      ${isSuggested ? '<span class="pill">PRÓXIMO</span>' : ''}
    </button>`;
}

function renderHome() {
  const program = PROGRAMS.find(p => p.id === store.data.programId) || PROGRAMS[0];
  const suggestedId = nextWorkoutId(program);
  return `
    <header class="top"><h1>Treinar</h1><p class="sub">Escolha o treino de hoje</p></header>
    ${renderWeekCard()}
    <div class="segmented">
      ${PROGRAMS.map(p => `<button data-action="set-program" data-id="${p.id}" class="${p.id === program.id ? 'on' : ''}">${p.name}</button>`).join('')}
    </div>
    <div class="cards">${program.workouts.map(workout => renderWorkoutCard(workout, workout.id === suggestedId)).join('')}</div>`;
}

export const trainActions = {
  'set-program': ({ id }) => {
    store.data.programId = id;
    persist();
    render();
  },
};

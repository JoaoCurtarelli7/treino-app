import { store, persist } from '../core/store.js';
import {
  getWorkouts, getWorkout, nextWorkoutId, workoutTag, getPendingWorkout, pendingItems, clearPendingWorkout,
} from '../core/workouts.js';
import { getExercise } from '../core/exercises.js';
import { openSheet, closeSheet, toast } from '../ui/dom.js';
import { lastSessionOfWorkout, currentWeekSummary } from '../core/history.js';
import { escapeHtml, formatNumber, formatRelativeDays } from '../core/format.js';
import { activeProfile } from '../core/profiles.js';
import { ui, render } from '../ui/state.js';
import { profileInitial } from './profiles.js';
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
        <span class="muted">${week.count} treino(s)${week.cardioCount ? ` · ${week.cardioCount} cardio` : ''}${week.volume ? ` · ${formatNumber(Math.round(week.volume))} kg` : ''}</span>
      </div>
      <div class="week-days">
        ${week.days.map((day, index) => `
          <span class="day ${day.trained ? 'on' : day.cardio ? 'cardio' : ''} ${day.isToday ? 'today' : ''}">${WEEKDAY_LABELS[index]}</span>`).join('')}
      </div>
    </div>`;
}

const hasLeftovers = workoutId => getPendingWorkout()?.workoutId === workoutId && pendingItems().length > 0;

function renderWorkoutCard(workout, isSuggested) {
  const last = lastSessionOfWorkout(workout.id);
  const lastLabel = last ? `último ${formatRelativeDays(last.date)}` : 'ainda não feito';
  const leftovers = hasLeftovers(workout.id);
  const detail = leftovers
    ? `faltam ${pendingItems().length} exercício(s) · ${lastLabel}`
    : `${workout.items.length ? `${workout.items.length} exercícios` : 'sem exercícios'} · ${lastLabel}`;
  return `
    <button class="wcard ${isSuggested ? 'next' : ''} ${leftovers ? 'partial' : ''}" data-action="${leftovers ? 'open-leftovers' : 'start'}" data-id="${workout.id}">
      <span class="tag">${workoutTag(workout.id)}</span>
      <span class="wbody"><strong>${escapeHtml(workout.name)}</strong><small>${detail}</small></span>
      ${isSuggested ? `<span class="pill">${leftovers ? 'CONTINUAR' : 'PRÓXIMO'}</span>` : ''}
    </button>`;
}

function openLeftoversSheet(workoutId) {
  const workout = getWorkout(workoutId);
  const items = pendingItems();
  openSheet(`
    <div class="sheet-head"><h2>Treino ${workoutTag(workoutId)} · ${escapeHtml(workout.name)}</h2><button data-action="close-sheet">Fechar</button></div>
    <p class="text-block">Ficou pendente da última vez: <b>${items.map(item => escapeHtml(getExercise(item.exerciseId).name)).join(', ')}</b>.</p>
    <div class="choice">
      <button data-action="start-continuation" data-id="${workoutId}">▶️ Continuar de onde parei<small>Só os ${items.length} exercício(s) que faltaram</small></button>
      <button data-action="start" data-id="${workoutId}">🔁 Fazer o treino completo<small>Todos os ${workout.items.length} exercícios</small></button>
      <button class="danger" data-action="discard-leftovers">Esquecer o que faltou<small>Segue pro próximo treino da lista</small></button>
    </div>`);
}

export const trainActions = {
  'open-leftovers': ({ id }) => openLeftoversSheet(id),
  'discard-leftovers': () => {
    clearPendingWorkout();
    persist();
    closeSheet();
    render();
    toast('Pendência descartada');
  },
};

function renderSetup() {
  return `
    <div class="setup">
      <strong>Monte seu treino</strong>
      <p>Crie seus treinos do zero — por exemplo A: Peito e Tríceps, B: Costas e Bíceps — ou comece de um modelo pronto e ajuste depois.</p>
      <button class="primary" data-action="new-workout">+ Criar treino</button>
      <button class="ghost" data-action="open-templates">Usar um modelo (ABC, Full Body)</button>
    </div>
    <button class="ghost dashed" style="margin-top:12px" data-action="new-cardio">🏃 Registrar cardio</button>`;
}

function renderHome() {
  const workouts = getWorkouts();
  const suggestedId = nextWorkoutId();
  const header = `
    <header class="top row">
      <div><h1>Treinar</h1><p class="sub">Olá, ${escapeHtml(activeProfile().name)}${workouts.length ? ' · escolha o treino de hoje' : ''}</p></div>
      <button class="avatar large" data-action="open-profiles" aria-label="Trocar de pessoa">${profileInitial(activeProfile())}</button>
    </header>`;

  if (!workouts.length) return `${header}${renderSetup()}`;

  return `
    ${header}
    ${renderWeekCard()}
    <div class="cards">${workouts.map(workout => renderWorkoutCard(workout, workout.id === suggestedId)).join('')}</div>
    <div class="ex-actions home-actions">
      <button data-action="new-cardio">🏃 Registrar cardio</button>
      <button data-action="new-workout">+ Novo treino</button>
    </div>`;
}

import { store } from '../core/store.js';
import { getWorkouts, nextWorkoutId, workoutTag } from '../core/workouts.js';
import { lastSessionOfWorkout, currentWeekSummary } from '../core/history.js';
import { escapeHtml, formatNumber, formatRelativeDays } from '../core/format.js';
import { activeProfile } from '../core/profiles.js';
import { ui } from '../ui/state.js';
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
  const countLabel = workout.items.length ? `${workout.items.length} exercícios` : 'sem exercícios';
  return `
    <button class="wcard ${isSuggested ? 'next' : ''}" data-action="start" data-id="${workout.id}">
      <span class="tag">${workoutTag(workout.id)}</span>
      <span class="wbody"><strong>${escapeHtml(workout.name)}</strong><small>${countLabel} · ${lastLabel}</small></span>
      ${isSuggested ? '<span class="pill">PRÓXIMO</span>' : ''}
    </button>`;
}

function renderSetup() {
  return `
    <div class="setup">
      <strong>Monte seu treino</strong>
      <p>Crie seus treinos do zero — por exemplo A: Peito e Tríceps, B: Costas e Bíceps — ou comece de um modelo pronto e ajuste depois.</p>
      <button class="primary" data-action="new-workout">+ Criar treino</button>
      <button class="ghost" data-action="open-templates">Usar um modelo (ABC, Full Body)</button>
    </div>`;
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
    <button class="ghost dashed" style="margin-top:12px" data-action="new-workout">+ Novo treino</button>`;
}

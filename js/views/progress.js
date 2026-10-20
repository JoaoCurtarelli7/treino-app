import { getExercise } from '../core/exercises.js';
import { exerciseHistory, progressMetric, trainedExerciseIds } from '../core/history.js';
import { escapeHtml, formatDate, formatNumber } from '../core/format.js';
import { closeSheet } from '../ui/dom.js';
import { renderMedia, renderThumb } from '../ui/media.js';
import { renderLineChart } from '../ui/chart.js';
import { formatSets, formatDelta, emptyState } from '../ui/fragments.js';
import { ui, navigate } from '../ui/state.js';
import { renderBodyWeight } from './body-weight.js';

const MODES = [['exercises', 'Exercícios'], ['body', 'Peso corporal']];

export function renderProgress() {
  if (ui.exerciseId) return renderExerciseDetail(ui.exerciseId);
  return `
    <header class="top"><h1>Evolução</h1></header>
    <div class="segmented">
      ${MODES.map(([id, label]) => `<button data-action="progress-mode" data-mode="${id}" class="${ui.progressMode === id ? 'on' : ''}">${label}</button>`).join('')}
    </div>
    ${ui.progressMode === 'body' ? renderBodyWeight() : renderExerciseList()}`;
}

function renderExerciseList() {
  const trained = trainedExerciseIds()
    .map(id => ({ id, history: exerciseHistory(id) }))
    .filter(({ history }) => history.length)
    .sort((a, b) => b.history[b.history.length - 1].date.localeCompare(a.history[a.history.length - 1].date));

  if (!trained.length) return emptyState('Nada por aqui ainda', 'Finalize seu primeiro treino para acompanhar a evolução das cargas.');

  return `
    <div class="list">
      ${trained.map(({ id, history }) => {
        const metric = progressMetric(history);
        const last = history[history.length - 1];
        const previous = history[history.length - 2];
        const { name } = getExercise(id);
        return `
          <button class="item" data-action="open-exercise" data-id="${escapeHtml(id)}">
            ${renderThumb(id, name)}
            <div class="main grow"><strong>${escapeHtml(name)}</strong><small>${history.length} treino(s) · ${formatDate(last.date)}</small></div>
            <div class="side"><strong>${formatNumber(last[metric.key])} ${metric.unit}</strong>${previous ? formatDelta(last[metric.key] - previous[metric.key], metric.unit) : ''}</div>
          </button>`;
      }).join('')}
    </div>`;
}

function renderExerciseDetail(exerciseId) {
  const history = exerciseHistory(exerciseId);
  const { name } = getExercise(exerciseId);
  const header = `
    <button class="back" data-action="back-progress">‹ Evolução</button>
    <header class="top row"><h1>${escapeHtml(name)}</h1>
      <button class="small-btn" data-action="change-photo" data-id="${escapeHtml(exerciseId)}">📷 Foto</button></header>
    ${renderMedia(exerciseId, { large: true })}`;

  if (!history.length) return `${header}${emptyState('Sem registros', 'Esse exercício ainda não foi feito em nenhum treino finalizado.')}`;

  const metric = progressMetric(history);
  const values = history.map(h => h[metric.key]);
  const gain = values[values.length - 1] - values[0];
  const gainClass = gain > 0 ? 'up' : gain < 0 ? 'down' : '';

  return `
    ${header}
    <div class="stats">
      <div class="stat"><small>Recorde</small><strong>${formatNumber(Math.max(...values))}</strong></div>
      <div class="stat"><small>Evolução</small><strong class="${gainClass}">${gain > 0 ? '+' : ''}${formatNumber(gain)}</strong></div>
      <div class="stat"><small>Treinos</small><strong>${history.length}</strong></div>
    </div>
    <div class="panel">
      <h2>${metric.label} (${metric.unit}) por treino</h2>
      ${renderLineChart(history.map(h => ({ date: h.date, value: h[metric.key] })))}
    </div>
    <p class="section-title">Todas as sessões</p>
    <div class="list">
      ${[...history].reverse().map(h => `
        <div class="item">
          <div class="main"><strong>${formatDate(h.date, { weekday: 'short', day: '2-digit', month: '2-digit' })}</strong>
            <span class="sets-line">${formatSets(h.sets, exerciseId)}</span></div>
          <div class="side"><strong>${formatNumber(h[metric.key])} ${metric.unit}</strong></div>
        </div>`).join('')}
    </div>`;
}

export const progressActions = {
  'progress-mode': ({ mode }) => navigate({ progressMode: mode }),
  'open-exercise': ({ id }) => {
    closeSheet();
    navigate({ tab: 'progress', progressMode: 'exercises', exerciseId: id });
  },
  'back-progress': () => navigate({ exerciseId: null }),
};

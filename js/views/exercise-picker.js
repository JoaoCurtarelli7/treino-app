import { MUSCLE_GROUPS } from '../config/exercises.js';
import { store, persist } from '../core/store.js';
import { loadCatalog, getLoadedCatalog, searchExercises } from '../core/catalog.js';
import { createId, escapeHtml } from '../core/format.js';
import { openSheet, closeSheet } from '../ui/dom.js';
import { renderThumb, renderImageThumb } from '../ui/media.js';

const RESULTS_LIMIT = 60;
const SOURCE_LABELS = { builtin: 'do plano', custom: 'meu' };

const picker = { query: '', group: 'all', options: null, results: new Map(), catalogFailed: false };

/**
 * mode 'exercise' resolves to an exercise id (creating custom/catalog entries as needed);
 * mode 'photo' resolves to a catalog imageId.
 */
export function openExercisePicker({
  title, mode = 'exercise', group = 'all', excludeIds = new Set(), toggleLabel = '', onPick,
}) {
  Object.assign(picker, { query: '', group, options: { mode, excludeIds, onPick }, catalogFailed: false });
  const chips = [['all', 'Todos'], ...Object.entries(MUSCLE_GROUPS)];
  openSheet(`
    <div class="sheet-head"><h2>${escapeHtml(title)}</h2><button data-action="close-sheet">Fechar</button></div>
    <input class="search" id="exercise-search" type="search" placeholder="Buscar (ex.: voador, remada, rosca)" autocomplete="off" enterkeyhint="search">
    <div class="chips">
      ${chips.map(([id, label]) => `<button class="chip ${id === group ? 'on' : ''}" data-action="picker-group" data-group="${id}">${label}</button>`).join('')}
    </div>
    ${toggleLabel ? `<label class="toggle"><input type="checkbox" id="picker-toggle"> ${escapeHtml(toggleLabel)}</label>` : ''}
    <div class="results" id="exercise-results"></div>`, { full: true });

  updateResults();
  loadCatalog()
    .catch(() => { picker.catalogFailed = true; })
    .finally(() => { if (document.getElementById('exercise-results')) updateResults(); });
}

function currentMatches() {
  const isPhotoMode = picker.options.mode === 'photo';
  const matches = searchExercises({
    query: picker.query,
    group: picker.group,
    excludeIds: picker.options.excludeIds,
    includeCustom: !isPhotoMode,
  });
  return isPhotoMode ? matches.filter(exercise => exercise.imageId) : matches;
}

function renderResultRow(exercise) {
  const thumb = exercise.source === 'catalog' ? renderImageThumb(exercise.imageId, exercise.name) : renderThumb(exercise.id, exercise.name);
  const meta = [MUSCLE_GROUPS[exercise.group], exercise.equipment, SOURCE_LABELS[exercise.source]].filter(Boolean).join(' · ');
  return `
    <button class="pick" data-action="picker-select" data-id="${escapeHtml(exercise.id)}">
      ${thumb}
      <span class="meta"><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(meta)}</small></span>
    </button>`;
}

function updateResults() {
  const $results = document.getElementById('exercise-results');
  const matches = currentMatches();
  picker.results = new Map(matches.map(exercise => [exercise.id, exercise]));
  const query = picker.query.trim();
  const canCreate = picker.options.mode === 'exercise' && query;

  const createRow = canCreate ? `
    <button class="pick create" data-action="picker-create">
      <span class="thumb">+</span>
      <span class="meta"><strong>Criar “${escapeHtml(query)}”</strong><small>Exercício seu — dá pra pôr foto depois</small></span>
    </button>` : '';

  const notes = [
    matches.length > RESULTS_LIMIT ? `Mostrando ${RESULTS_LIMIT} de ${matches.length}. Refine a busca ou filtre pelo músculo.` : '',
    !getLoadedCatalog() && !picker.catalogFailed ? 'Carregando banco de exercícios…' : '',
    picker.catalogFailed ? 'Banco de exercícios indisponível agora.' : '',
    !matches.length && !canCreate && getLoadedCatalog() ? 'Nada encontrado.' : '',
  ].filter(Boolean).map(note => `<p class="results-note">${note}</p>`).join('');

  $results.innerHTML = createRow + matches.slice(0, RESULTS_LIMIT).map(renderResultRow).join('') + notes;
}

const keepToggleChecked = () => Boolean(document.getElementById('picker-toggle')?.checked);

function selectResult(resultId) {
  const exercise = picker.results.get(resultId);
  if (!exercise) return;
  const { mode, onPick } = picker.options;
  const keep = keepToggleChecked();
  closeSheet();

  if (mode === 'photo') {
    onPick(exercise.imageId);
    return;
  }
  if (exercise.source === 'catalog') {
    store.data.customExercises[exercise.id] = { name: exercise.name, group: exercise.group, imageId: exercise.imageId };
    persist();
  }
  onPick(exercise.id, { keep });
}

function createFromQuery() {
  const name = picker.query.trim();
  if (!name) return;
  const exerciseId = `custom:${createId()}`;
  store.data.customExercises[exerciseId] = { name, group: picker.group === 'all' ? 'other' : picker.group };
  persist();
  const keep = keepToggleChecked();
  closeSheet();
  picker.options.onPick(exerciseId, { keep });
}

export const pickerActions = {
  'picker-group': ({ group }, element) => {
    picker.group = group;
    element.parentElement.querySelectorAll('.chip').forEach(chip => chip.classList.toggle('on', chip === element));
    updateResults();
  },
  'picker-select': ({ id }) => selectResult(id),
  'picker-create': () => createFromQuery(),
};

export function handlePickerInput(input) {
  if (input.id !== 'exercise-search') return false;
  picker.query = input.value;
  updateResults();
  return true;
}

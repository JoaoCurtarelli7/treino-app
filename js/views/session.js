import { planItem } from '../config/templates.js';
import { DEFAULT_PLAN } from '../config/exercises.js';
import { store, persist } from '../core/store.js';
import { getExercise, getNote, setNote, planForEntry } from '../core/exercises.js';
import {
  getWorkout, getWorkoutItems, setWorkoutItems, updateWorkoutItem, isInWorkout, workoutTag, sessionWorkoutName,
} from '../core/workouts.js';
import { lastPerformance, exerciseHistory, progressMetric, topWeight, bestReps, volumeOf } from '../core/history.js';
import { suggestNextWeight } from '../core/progression.js';
import { escapeHtml, formatClock, formatDate, formatNumber, formatRest, parseNumber, createId } from '../core/format.js';
import { openSheet, closeSheet, toast } from '../ui/dom.js';
import { renderMedia } from '../ui/media.js';
import { formatSets, formatDelta } from '../ui/fragments.js';
import { renderPlanFields, readPlanFields } from '../ui/plan-fields.js';
import { startRest, stopRest } from '../ui/rest-timer.js';
import { render, navigate } from '../ui/state.js';
import { openExercisePicker } from './exercise-picker.js';

const draft = () => store.data.draft;
// The workout may be renamed or deleted mid-session; the draft keeps its own name as a fallback.
function currentWorkout() {
  const { workoutId, workoutName } = draft();
  const workout = getWorkout(workoutId);
  return { id: workoutId, name: workout?.name ?? workoutName ?? 'Treino', tag: workoutTag(workoutId) };
}
const createEmptySet = () => ({ weight: '', reps: '', done: false });
const countDone = entry => entry.sets.filter(set => set.done).length;

function createEntry({ exerciseId, sets, reps, rest }) {
  return { exerciseId, plan: { sets, reps, rest }, sets: Array.from({ length: sets }, createEmptySet) };
}

export function startWorkout(workoutId) {
  const workout = getWorkout(workoutId);
  if (!workout) return;
  if (!workout.items.length) {
    toast('Adicione exercícios a esse treino primeiro');
    navigate({ tab: 'settings', editingWorkoutId: workoutId });
    return;
  }
  store.data.draft = {
    workoutId, workoutName: workout.name, startedAt: new Date().toISOString(), exercises: workout.items.map(createEntry),
  };
  persist();
  navigate({});
}

export const elapsedLabel = () => formatClock((Date.now() - new Date(draft().startedAt)) / 1000);

/* ---------- Rendering ---------- */

export function renderSession() {
  const workout = currentWorkout();
  const entries = draft().exercises;
  const doneSets = entries.reduce((total, entry) => total + countDone(entry), 0);
  const totalSets = entries.reduce((total, entry) => total + entry.sets.length, 0);
  return `
    <header class="top row">
      <div><p class="eyebrow">${workout.tag ? `Treino ${workout.tag}` : 'Treino'}</p><h1>${escapeHtml(workout.name)}</h1></div>
      <span class="clock" id="clock">${elapsedLabel()}</span>
    </header>
    <div class="progress-track" aria-hidden="true"><span id="session-progress" style="transform:scaleX(${totalSets ? doneSets / totalSets : 0})"></span></div>
    ${entries.map(renderEntryCard).join('')}
    <button class="ghost dashed" data-action="add-entry">+ Adicionar exercício</button>
    <div class="finish">
      <button class="primary" data-action="finish">Finalizar treino</button>
      <button class="ghost danger" data-action="discard">Descartar treino</button>
    </div>`;
}

function renderEntryCard(entry, index) {
  const exercise = getExercise(entry.exerciseId);
  const plan = planForEntry(entry, draft().workoutId);
  const last = lastPerformance(entry.exerciseId);
  const suggestion = exercise.repsLabel === 'seg' ? null : suggestNextWeight(last?.sets, plan);
  const note = getNote(entry.exerciseId);
  const repsLabel = exercise.repsLabel || 'reps';

  return `
    <section class="ex" id="ex-${index}">
      <div class="ex-head">
        ${renderMedia(entry.exerciseId, { action: 'toggle-media' })}
        <button class="ex-title" data-action="open-entry" data-ex="${index}">
          <h3>${escapeHtml(exercise.name)}</h3>
          <p class="target">${plan.sets} × ${escapeHtml(plan.reps)} ${repsLabel} · ${formatRest(plan.rest)} · <span data-count="${index}">${countDone(entry)}/${entry.sets.length}</span></p>
        </button>
        <button class="icon-btn" data-action="open-entry" data-ex="${index}" aria-label="Opções do exercício">⋯</button>
      </div>
      ${note ? `<p class="note">📝 ${escapeHtml(note)}</p>` : ''}
      ${last
        ? `<p class="last"><b>Último · ${formatDate(last.date)}</b>${formatSets(last.sets, entry.exerciseId)}</p>`
        : '<p class="last muted">Primeira vez — anote a carga de hoje.</p>'}
      ${suggestion ? `<p class="tip">💡 Você fechou ${escapeHtml(plan.reps)} reps em todas as séries. Hoje tente <b>${formatNumber(suggestion.weight)} kg</b>.</p>` : ''}
      <div class="grid head"><span>Série</span><span>kg</span><span>${repsLabel}</span><span></span></div>
      ${entry.sets.map((set, setIndex) => renderSetRow(set, index, setIndex, last, suggestion)).join('')}
      <div class="ex-actions">
        <button data-action="add-set" data-ex="${index}">+ série</button>
        ${entry.sets.length > 1 ? `<button data-action="remove-set" data-ex="${index}">− série</button>` : ''}
      </div>
    </section>`;
}

// Placeholders show what to aim for; tapping ✓ on an empty field logs exactly that.
function renderSetRow(set, entryIndex, setIndex, last, suggestion) {
  const reference = last ? last.sets[setIndex] || last.sets[last.sets.length - 1] : null;
  const weightHint = suggestion ? formatNumber(suggestion.weight) : reference?.weight ? formatNumber(reference.weight) : '';
  const repsHint = reference ? String(reference.reps) : '';
  return `
    <div class="grid set ${set.done ? 'done' : ''}" data-row="${entryIndex}-${setIndex}">
      <span class="n">${setIndex + 1}</span>
      <input class="${suggestion ? 'suggested' : ''}" data-ex="${entryIndex}" data-set="${setIndex}" data-field="weight" inputmode="decimal" autocomplete="off"
        placeholder="${weightHint || '–'}" data-hint="${weightHint}" value="${escapeHtml(set.weight)}" aria-label="Carga série ${setIndex + 1}">
      <input data-ex="${entryIndex}" data-set="${setIndex}" data-field="reps" inputmode="numeric" autocomplete="off"
        placeholder="${repsHint || '–'}" data-hint="${repsHint}" value="${escapeHtml(set.reps)}" aria-label="Repetições série ${setIndex + 1}">
      <button class="check" data-action="toggle-set" data-ex="${entryIndex}" data-set="${setIndex}" aria-label="Concluir série">✓</button>
    </div>`;
}

function refreshProgressIndicators(entryIndex) {
  const entry = draft().exercises[entryIndex];
  document.querySelector(`[data-count="${entryIndex}"]`).textContent = `${countDone(entry)}/${entry.sets.length}`;
  const all = draft().exercises;
  const totalSets = all.reduce((total, item) => total + item.sets.length, 0);
  const doneSets = all.reduce((total, item) => total + countDone(item), 0);
  document.getElementById('session-progress').style.transform = `scaleX(${totalSets ? doneSets / totalSets : 0})`;
}

/* ---------- Set logging ---------- */

export function updateSetField(input) {
  const set = draft()?.exercises[input.dataset.ex]?.sets[input.dataset.set];
  if (!set) return;
  set[input.dataset.field] = input.value;
  persist();
}

function toggleSet(entryIndex, setIndex) {
  const entry = draft().exercises[entryIndex];
  const set = entry.sets[setIndex];
  const row = document.querySelector(`[data-row="${entryIndex}-${setIndex}"]`);
  const [weightInput, repsInput] = row.querySelectorAll('input');

  if (!set.done) {
    if (set.weight === '') set.weight = weightInput.dataset.hint;
    if (set.reps === '') set.reps = repsInput.dataset.hint;
    if (parseNumber(set.reps) === null) {
      toast('Informe as repetições');
      repsInput.focus();
      return;
    }
    weightInput.value = set.weight;
    repsInput.value = set.reps;
    startRest(planForEntry(entry, draft().workoutId).rest);
  }

  set.done = !set.done;
  row.classList.toggle('done', set.done);
  refreshProgressIndicators(entryIndex);
  persist();
}

function addSet(entryIndex) {
  const sets = draft().exercises[entryIndex].sets;
  sets.push({ weight: sets[sets.length - 1]?.weight ?? '', reps: '', done: false });
  persist();
  render();
}

function removeSet(entryIndex) {
  const sets = draft().exercises[entryIndex].sets;
  if (sets.length > 1) sets.pop();
  persist();
  render();
}

/* ---------- Exercise options sheet ---------- */

function openEntrySheet(entryIndex) {
  const entry = draft().exercises[entryIndex];
  const workout = currentWorkout();
  const exercise = getExercise(entry.exerciseId);
  const inPlan = isInWorkout(workout.id, entry.exerciseId);
  const isFirst = entryIndex === 0;
  const isLast = entryIndex === draft().exercises.length - 1;

  openSheet(`
    <div class="sheet-head"><h2>${escapeHtml(exercise.name)}</h2><button data-action="close-sheet">Fechar</button></div>
    <div class="sheet-scroll">
      ${renderMedia(entry.exerciseId, { large: true })}
      ${renderPlanFields(planForEntry(entry, workout.id))}
      <label class="field"><span>Anotação</span>
        <textarea id="entry-note" class="input" rows="2" placeholder="Ex.: banco na posição 4, pegada aberta">${escapeHtml(getNote(entry.exerciseId))}</textarea>
      </label>
      ${inPlan ? `<label class="toggle"><input type="checkbox" id="entry-apply-plan" checked> Usar essas séries/reps/descanso nos próximos Treinos ${workout.tag}</label>` : ''}
      <button class="primary" data-action="save-entry" data-ex="${entryIndex}">Salvar</button>
      <div class="choice">
        <button data-action="change-photo" data-id="${escapeHtml(entry.exerciseId)}">📷 Trocar foto</button>
        ${isFirst ? '' : `<button data-action="move-entry" data-ex="${entryIndex}" data-offset="-1">↑ Mover para cima</button>`}
        ${isLast ? '' : `<button data-action="move-entry" data-ex="${entryIndex}" data-offset="1">↓ Mover para baixo</button>`}
        <button data-action="open-exercise" data-id="${escapeHtml(entry.exerciseId)}">📈 Ver evolução</button>
        <button class="danger" data-action="remove-entry" data-ex="${entryIndex}" data-scope="today">Remover só do treino de hoje</button>
        ${inPlan ? `<button class="danger" data-action="remove-entry" data-ex="${entryIndex}" data-scope="plan">Remover deste e dos próximos Treinos ${workout.tag}</button>` : ''}
      </div>
    </div>`, { full: true });
}

function resizeSets(entry, targetCount) {
  while (entry.sets.length < targetCount) entry.sets.push(createEmptySet());
  // Never drop a set that was already logged.
  while (entry.sets.length > targetCount && !entry.sets[entry.sets.length - 1].done) entry.sets.pop();
}

function saveEntry(entryIndex) {
  const entry = draft().exercises[entryIndex];
  const plan = readPlanFields();
  entry.plan = plan;
  resizeSets(entry, plan.sets);
  setNote(entry.exerciseId, document.getElementById('entry-note').value);
  if (document.getElementById('entry-apply-plan')?.checked) updateWorkoutItem(draft().workoutId, entry.exerciseId, plan);
  persist();
  closeSheet();
  render();
}

function moveEntry(entryIndex, offset) {
  const entries = draft().exercises;
  const target = entryIndex + offset;
  if (target < 0 || target >= entries.length) return;
  [entries[entryIndex], entries[target]] = [entries[target], entries[entryIndex]];
  persist();
  closeSheet();
  render();
  document.getElementById(`ex-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function removeEntry(entryIndex, scope) {
  const workoutId = draft().workoutId;
  const [removed] = draft().exercises.splice(entryIndex, 1);
  if (scope === 'plan') {
    setWorkoutItems(workoutId, getWorkoutItems(workoutId).filter(item => item.exerciseId !== removed.exerciseId));
  }
  persist();
  closeSheet();
  render();
}

function openAddEntry() {
  const workout = currentWorkout();
  openExercisePicker({
    title: 'Adicionar exercício',
    excludeIds: new Set(draft().exercises.map(entry => entry.exerciseId)),
    toggleLabel: `Manter no Treino ${workout.tag} nos próximos treinos`,
    onPick: (exerciseId, { keep }) => {
      const item = planItem(exerciseId, DEFAULT_PLAN.sets, DEFAULT_PLAN.reps, DEFAULT_PLAN.rest);
      draft().exercises.push(createEntry(item));
      if (keep) setWorkoutItems(workout.id, [...getWorkoutItems(workout.id), item]);
      persist();
      render();
      document.getElementById(`ex-${draft().exercises.length - 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(keep ? `Adicionado ao Treino ${workout.tag}` : 'Adicionado ao treino de hoje');
    },
  });
}

/* ---------- Finish ---------- */

// Must run before the session is stored so comparisons use the previous history.
function buildSummary(session) {
  const rows = session.exercises.map(entry => {
    const history = exerciseHistory(entry.exerciseId);
    const metric = progressMetric([...history, { top: topWeight(entry.sets) }]);
    const current = metric.key === 'top' ? topWeight(entry.sets) : bestReps(entry.sets);
    const previous = history.length ? history[history.length - 1][metric.key] : null;
    const best = history.length ? Math.max(...history.map(h => h[metric.key])) : null;
    return { exerciseId: entry.exerciseId, sets: entry.sets, current, previous, unit: metric.unit, isRecord: best !== null && current > best };
  });
  const allSets = session.exercises.flatMap(entry => entry.sets);
  return {
    workoutName: sessionWorkoutName(session),
    minutes: Math.round((new Date(session.date) - new Date(session.startedAt)) / 60000),
    volume: volumeOf(allSets),
    setCount: allSets.length,
    rows,
  };
}

function finishWorkout() {
  const current = draft();
  const exercises = current.exercises
    .map(entry => ({
      exerciseId: entry.exerciseId,
      sets: entry.sets.filter(set => set.done).map(set => ({ weight: parseNumber(set.weight) ?? 0, reps: parseNumber(set.reps) })),
    }))
    .filter(entry => entry.sets.length);

  if (!exercises.length) {
    if (confirm('Nenhuma série marcada. Descartar este treino?')) discardWorkout();
    return;
  }
  const pending = current.exercises.reduce((total, entry) => total + entry.sets.filter(set => !set.done).length, 0);
  if (pending && !confirm(`${pending} série(s) sem ✓ serão ignoradas. Finalizar mesmo assim?`)) return;

  const session = {
    id: createId(), workoutId: current.workoutId, workoutName: currentWorkout().name,
    startedAt: current.startedAt, date: new Date().toISOString(), exercises,
  };
  const summary = buildSummary(session);
  store.data.sessions.push(session);
  store.data.draft = null;
  stopRest();
  persist();
  navigate({ summary });
}

function discardWorkout() {
  store.data.draft = null;
  stopRest();
  persist();
  navigate({});
}

export function renderSummary(summary) {
  const records = summary.rows.filter(row => row.isRecord).length;
  return `
    <div class="hero"><h1>Treino concluído 💪</h1><p>${escapeHtml(summary.workoutName)}${records ? ` · ${records} recorde(s)!` : ''}</p></div>
    <div class="stats">
      <div class="stat"><small>Duração</small><strong>${summary.minutes} min</strong></div>
      <div class="stat"><small>Séries</small><strong>${summary.setCount}</strong></div>
      <div class="stat"><small>Volume</small><strong>${formatNumber(Math.round(summary.volume))}</strong></div>
    </div>
    <p class="section-title">Comparado ao último treino</p>
    <div class="list">
      ${summary.rows.map(row => `
        <div class="item">
          <div class="main">
            <strong>${escapeHtml(getExercise(row.exerciseId).name)}${row.isRecord ? '<span class="badge">PR</span>' : ''}</strong>
            <span class="sets-line">${formatSets(row.sets, row.exerciseId)}</span>
          </div>
          <div class="side">${row.previous === null ? '<span class="delta same">1ª vez</span>' : formatDelta(row.current - row.previous, row.unit)}</div>
        </div>`).join('')}
    </div>
    <div class="finish" style="margin-top:16px"><button class="primary" data-action="close-summary">Fechar</button></div>`;
}

export const sessionActions = {
  start: ({ id }) => startWorkout(id),
  'toggle-set': ({ ex, set }) => toggleSet(Number(ex), Number(set)),
  'add-set': ({ ex }) => addSet(Number(ex)),
  'remove-set': ({ ex }) => removeSet(Number(ex)),
  'toggle-media': (_, element) => element.closest('.ex').classList.toggle('expanded'),
  'open-entry': ({ ex }) => openEntrySheet(Number(ex)),
  'save-entry': ({ ex }) => saveEntry(Number(ex)),
  'move-entry': ({ ex, offset }) => moveEntry(Number(ex), Number(offset)),
  'remove-entry': ({ ex, scope }) => removeEntry(Number(ex), scope),
  'add-entry': () => openAddEntry(),
  finish: () => finishWorkout(),
  discard: () => { if (confirm('Descartar o treino em andamento?')) discardWorkout(); },
  'close-summary': () => navigate({ summary: null }),
};

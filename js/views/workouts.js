import { TEMPLATES } from '../config/templates.js';
import { store, persist } from '../core/store.js';
import { getWorkout, createWorkout, renameWorkout, deleteWorkout, moveWorkout, addTemplate, workoutTag } from '../core/workouts.js';
import { escapeHtml } from '../core/format.js';
import { openSheet, closeSheet, toast } from '../ui/dom.js';
import { render, navigate } from '../ui/state.js';

const MAX_NAME_LENGTH = 40;

function openNameSheet({ title, value = '', placeholder, action, workoutId = '' }) {
  openSheet(`
    <div class="sheet-head"><h2>${title}</h2><button data-action="close-sheet">Fechar</button></div>
    <input id="workout-name" class="input" value="${escapeHtml(value)}" placeholder="${placeholder}"
      maxlength="${MAX_NAME_LENGTH}" autocomplete="off" enterkeyhint="done" data-submit="${action}" data-id="${workoutId}">
    <button class="primary" data-action="${action}" data-id="${workoutId}">Salvar</button>`);
  document.getElementById('workout-name').focus();
}

function readWorkoutName() {
  const name = document.getElementById('workout-name')?.value.trim().slice(0, MAX_NAME_LENGTH);
  if (!name) toast('Dê um nome ao treino');
  return name || null;
}

// A new workout goes straight to the editor, since the next step is always adding exercises.
function saveNewWorkout() {
  const name = readWorkoutName();
  if (!name) return;
  const workout = createWorkout(name);
  persist();
  closeSheet();
  navigate({ tab: 'settings', editingWorkoutId: workout.id });
}

function saveWorkoutName({ id }) {
  const name = readWorkoutName();
  if (!name) return;
  renameWorkout(id, name);
  persist();
  closeSheet();
  render();
}

function removeWorkout(workoutId) {
  if (store.data.draft?.workoutId === workoutId) {
    toast('Finalize ou descarte o treino em andamento antes');
    return;
  }
  const workout = getWorkout(workoutId);
  if (!confirm(`Excluir o treino "${workout.name}"? O histórico dele continua salvo.`)) return;
  deleteWorkout(workoutId);
  persist();
  navigate({ editingWorkoutId: null });
}

function openTemplates() {
  openSheet(`
    <div class="sheet-head"><h2>Modelos prontos</h2><button data-action="close-sheet">Fechar</button></div>
    <p class="text-block">Os treinos do modelo são copiados pra você — depois dá pra mudar tudo.</p>
    <div class="choice">
      ${TEMPLATES.map(template => `
        <button data-action="add-template" data-id="${template.id}">
          ${escapeHtml(template.name)} · ${template.workouts.length} treinos<small>${escapeHtml(template.description)}</small>
        </button>`).join('')}
    </div>`);
}

function applyTemplate(templateId) {
  const template = addTemplate(templateId);
  if (!template) return;
  persist();
  closeSheet();
  navigate({});
  toast(`${template.workouts.length} treinos adicionados`);
}

export function renderWorkoutListPanel() {
  const { workouts } = store.data;
  return `
    <div class="panel">
      <h2>Meus treinos</h2>
      ${workouts.length ? workouts.map((workout, index) => `
        <div class="row-between workout-row">
          <button class="link-row grow" data-action="open-plan-editor" data-id="${workout.id}">
            <span class="tag small">${workoutTag(workout.id)}</span>
            <span class="grow">${escapeHtml(workout.name)} <small class="muted">· ${workout.items.length} exerc.</small></span>
            <span class="chevron">›</span>
          </button>
          <span class="reorder">
            <button class="icon-btn" data-action="move-workout" data-index="${index}" data-offset="-1" ${index === 0 ? 'disabled' : ''} aria-label="Mover para cima">↑</button>
            <button class="icon-btn" data-action="move-workout" data-index="${index}" data-offset="1" ${index === workouts.length - 1 ? 'disabled' : ''} aria-label="Mover para baixo">↓</button>
          </span>
        </div>`).join('') : '<p class="text-block">Nenhum treino ainda.</p>'}
      <div class="ex-actions">
        <button data-action="new-workout">+ Novo treino</button>
        <button data-action="open-templates">Usar modelo</button>
      </div>
    </div>`;
}

export const workoutActions = {
  'new-workout': () => openNameSheet({ title: 'Novo treino', placeholder: 'Ex.: Peito e Tríceps', action: 'save-new-workout' }),
  'save-new-workout': () => saveNewWorkout(),
  'rename-workout': ({ id }) => openNameSheet({
    title: 'Renomear treino', value: getWorkout(id)?.name, placeholder: 'Nome do treino', action: 'save-workout-name', workoutId: id,
  }),
  'save-workout-name': dataset => saveWorkoutName(dataset),
  'delete-workout': ({ id }) => removeWorkout(id),
  'move-workout': ({ index, offset }) => {
    moveWorkout(Number(index), Number(offset));
    persist();
    render();
  },
  'open-templates': () => openTemplates(),
  'add-template': ({ id }) => applyTemplate(id),
};

// Enter on the name field behaves like tapping Salvar.
export function handleWorkoutKeydown(event) {
  if (event.key !== 'Enter' || event.target.id !== 'workout-name') return false;
  event.preventDefault();
  workoutActions[event.target.dataset.submit]?.(event.target.dataset);
  return true;
}

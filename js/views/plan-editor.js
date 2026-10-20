import { planItem } from '../config/templates.js';
import { DEFAULT_PLAN } from '../config/exercises.js';
import { persist } from '../core/store.js';
import { getExercise } from '../core/exercises.js';
import {
  getWorkout, getWorkoutItems, setWorkoutItems, updateWorkoutItem, moveWorkoutItem, workoutTag,
} from '../core/workouts.js';
import { escapeHtml, formatRest } from '../core/format.js';
import { openSheet, closeSheet, toast } from '../ui/dom.js';
import { renderThumb, renderMedia } from '../ui/media.js';
import { renderPlanFields, readPlanFields } from '../ui/plan-fields.js';
import { ui, render, navigate } from '../ui/state.js';
import { openExercisePicker } from './exercise-picker.js';

export function renderPlanEditor(workoutId) {
  const workout = getWorkout(workoutId);
  if (!workout) return '<button class="back" data-action="close-plan-editor">‹ Ajustes</button>';
  const items = workout.items;
  return `
    <button class="back" data-action="close-plan-editor">‹ Ajustes</button>
    <header class="top row">
      <div><p class="eyebrow">Treino ${workoutTag(workoutId)}</p><h1>${escapeHtml(workout.name)}</h1></div>
      <button class="small-btn" data-action="rename-workout" data-id="${workoutId}">Renomear</button>
    </header>
    <p class="sub muted" style="margin:-8px 0 12px">${items.length ? 'Toque num exercício para editar séries, reps, descanso e foto' : 'Adicione os exercícios desse treino'}</p>
    <div class="list">
      ${items.map((item, index) => {
        const { name } = getExercise(item.exerciseId);
        return `
          <div class="item plan-row">
            <button class="plan-main" data-action="edit-plan-item" data-index="${index}">
              ${renderThumb(item.exerciseId, name)}
              <span class="main"><strong>${escapeHtml(name)}</strong><small>${item.sets} × ${escapeHtml(item.reps)} · ${formatRest(item.rest)}</small></span>
            </button>
            <span class="reorder">
              <button class="icon-btn" data-action="move-plan-item" data-index="${index}" data-offset="-1" ${index === 0 ? 'disabled' : ''} aria-label="Mover para cima">↑</button>
              <button class="icon-btn" data-action="move-plan-item" data-index="${index}" data-offset="1" ${index === items.length - 1 ? 'disabled' : ''} aria-label="Mover para baixo">↓</button>
            </span>
          </div>`;
      }).join('')}
    </div>
    <button class="ghost dashed" style="margin-top:12px" data-action="add-plan-item">+ Adicionar exercício</button>
    <button class="ghost danger" data-action="delete-workout" data-id="${workoutId}">Excluir treino</button>`;
}

function openPlanItemSheet(index) {
  const item = getWorkoutItems(ui.editingWorkoutId)[index];
  openSheet(`
    <div class="sheet-head"><h2>${escapeHtml(getExercise(item.exerciseId).name)}</h2><button data-action="close-sheet">Fechar</button></div>
    <div class="sheet-scroll">
      ${renderMedia(item.exerciseId, { large: true })}
      ${renderPlanFields(item)}
      <button class="primary" data-action="save-plan-item" data-index="${index}">Salvar</button>
      <div class="choice">
        <button data-action="change-photo" data-id="${escapeHtml(item.exerciseId)}">📷 Trocar foto</button>
        <button class="danger" data-action="remove-plan-item" data-index="${index}">Remover do treino</button>
      </div>
    </div>`, { full: true });
}

function savePlanItem(index) {
  const item = getWorkoutItems(ui.editingWorkoutId)[index];
  updateWorkoutItem(ui.editingWorkoutId, item.exerciseId, readPlanFields());
  persist();
  closeSheet();
  render();
}

function removePlanItem(index) {
  setWorkoutItems(ui.editingWorkoutId, getWorkoutItems(ui.editingWorkoutId).filter((_, itemIndex) => itemIndex !== index));
  persist();
  closeSheet();
  render();
}

function addPlanItem() {
  const workoutId = ui.editingWorkoutId;
  openExercisePicker({
    title: 'Adicionar ao treino',
    excludeIds: new Set(getWorkoutItems(workoutId).map(item => item.exerciseId)),
    onPick: exerciseId => {
      setWorkoutItems(workoutId, [...getWorkoutItems(workoutId), planItem(exerciseId, DEFAULT_PLAN.sets, DEFAULT_PLAN.reps, DEFAULT_PLAN.rest)]);
      persist();
      render();
      toast('Exercício adicionado');
    },
  });
}

export const planEditorActions = {
  'open-plan-editor': ({ id }) => navigate({ editingWorkoutId: id }),
  'close-plan-editor': () => navigate({ editingWorkoutId: null }),
  'edit-plan-item': ({ index }) => openPlanItemSheet(Number(index)),
  'save-plan-item': ({ index }) => savePlanItem(Number(index)),
  'remove-plan-item': ({ index }) => removePlanItem(Number(index)),
  'move-plan-item': ({ index, offset }) => {
    moveWorkoutItem(ui.editingWorkoutId, Number(index), Number(offset));
    persist();
    render();
  },
  'add-plan-item': () => addPlanItem(),
};

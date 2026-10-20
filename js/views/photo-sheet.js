import { getExercise, setImageOverride } from '../core/exercises.js';
import { persist, store } from '../core/store.js';
import { hasPhoto, savePhoto, deletePhoto, resizeImage } from '../core/photos.js';
import { escapeHtml } from '../core/format.js';
import { openSheet, closeSheet, toast, pickFile } from '../ui/dom.js';
import { renderMedia } from '../ui/media.js';
import { render } from '../ui/state.js';
import { openExercisePicker } from './exercise-picker.js';

export function openPhotoSheet(exerciseId) {
  const exercise = getExercise(exerciseId);
  const canReset = hasPhoto(exerciseId) || Boolean(store.data.imageOverrides[exerciseId]);
  openSheet(`
    <div class="sheet-head"><h2>Foto · ${escapeHtml(exercise.name)}</h2><button data-action="close-sheet">Fechar</button></div>
    ${renderMedia(exerciseId, { large: true }) || '<div class="media-empty">Sem foto</div>'}
    <div class="choice">
      <button data-action="photo-upload" data-id="${escapeHtml(exerciseId)}">📷 Tirar ou escolher foto<small>Câmera ou galeria do iPhone</small></button>
      <button data-action="photo-catalog" data-id="${escapeHtml(exerciseId)}">🔎 Escolher do banco de exercícios<small>Mais de 500 exercícios com foto</small></button>
      ${canReset ? `<button class="danger" data-action="photo-reset" data-id="${escapeHtml(exerciseId)}">Voltar para a foto padrão</button>` : ''}
    </div>`);
}

async function uploadPhoto(exerciseId) {
  const file = await pickFile('image/*');
  if (!file) return;
  try {
    await savePhoto(exerciseId, await resizeImage(file));
    closeSheet();
    render();
    toast('Foto salva');
  } catch {
    toast('Não consegui salvar essa foto');
  }
}

function chooseFromCatalog(exerciseId) {
  const { group } = getExercise(exerciseId);
  openExercisePicker({
    title: 'Escolher foto',
    mode: 'photo',
    group: group && group !== 'other' ? group : 'all',
    onPick: async imageId => {
      if (hasPhoto(exerciseId)) await deletePhoto(exerciseId).catch(() => {});
      setImageOverride(exerciseId, imageId);
      persist();
      render();
      toast('Foto atualizada');
    },
  });
}

async function resetPhoto(exerciseId) {
  if (hasPhoto(exerciseId)) await deletePhoto(exerciseId).catch(() => {});
  setImageOverride(exerciseId, null);
  persist();
  closeSheet();
  render();
}

export const photoActions = {
  'change-photo': ({ id }) => openPhotoSheet(id),
  'photo-upload': ({ id }) => uploadPhoto(id),
  'photo-catalog': ({ id }) => chooseFromCatalog(id),
  'photo-reset': ({ id }) => resetPhoto(id),
};

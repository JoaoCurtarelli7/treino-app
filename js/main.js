import { store, onPersistError } from './core/store.js';
import { loadPhotos } from './core/photos.js';
import { loadCatalog } from './core/catalog.js';
import { toast, closeSheet, isSheetBackdrop } from './ui/dom.js';
import { installImageFallback } from './ui/media.js';
import { restActions } from './ui/rest-timer.js';
import { syncWakeLock } from './ui/wake-lock.js';
import { planFieldActions } from './ui/plan-fields.js';
import { ui, setRenderer, navigate } from './ui/state.js';
import { renderTrain, trainActions } from './views/train.js';
import { sessionActions, updateSetField, elapsedLabel } from './views/session.js';
import { pickerActions, handlePickerInput } from './views/exercise-picker.js';
import { photoActions } from './views/photo-sheet.js';
import { renderProgress, progressActions } from './views/progress.js';
import { bodyWeightActions } from './views/body-weight.js';
import { renderHistory, historyActions } from './views/history.js';
import { renderSettings, settingsActions, syncOfflinePhotos } from './views/settings.js';
import { planEditorActions } from './views/plan-editor.js';

const $app = document.getElementById('app');
const VIEWS = { train: renderTrain, progress: renderProgress, history: renderHistory, settings: renderSettings };

const actions = {
  ...trainActions,
  ...sessionActions,
  ...pickerActions,
  ...photoActions,
  ...progressActions,
  ...bodyWeightActions,
  ...historyActions,
  ...settingsActions,
  ...planEditorActions,
  ...planFieldActions,
  ...restActions,
  'close-sheet': () => closeSheet(),
};

function render() {
  $app.innerHTML = VIEWS[ui.tab]();
  document.querySelectorAll('.tabbar button').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === ui.tab);
  });
  syncWakeLock(Boolean(store.data.draft));
}

function bindEvents() {
  document.addEventListener('click', event => {
    if (isSheetBackdrop(event.target)) {
      closeSheet();
      return;
    }
    const tabButton = event.target.closest('[data-tab]');
    if (tabButton) {
      closeSheet();
      navigate({ tab: tabButton.dataset.tab, exerciseId: null, sessionId: null, editingWorkoutId: null });
      return;
    }
    const actionTarget = event.target.closest('[data-action]');
    if (actionTarget && !actionTarget.disabled) actions[actionTarget.dataset.action]?.(actionTarget.dataset, actionTarget);
  });

  document.addEventListener('input', event => {
    if (handlePickerInput(event.target)) return;
    if (event.target.matches('[data-field]')) updateSetField(event.target);
  });

  setInterval(() => {
    const clock = document.getElementById('clock');
    if (clock && store.data.draft) clock.textContent = elapsedLabel();
  }, 1000);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

async function boot() {
  onPersistError(() => toast('Não consegui salvar no aparelho'));
  installImageFallback();
  setRenderer(render);
  bindEvents();
  await loadPhotos();
  render();
  // Catalog load also upgrades names of exercises saved by older versions, so render again once it lands.
  loadCatalog().then(render).catch(() => {});
  registerServiceWorker();
  navigator.storage?.persist?.().catch(() => {});
  setTimeout(syncOfflinePhotos, 3000);
}

boot();

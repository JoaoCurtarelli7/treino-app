import { store, persist, normalizeData, createEmptyData, replaceData } from '../core/store.js';
import { exportPhotos, importPhotos, loadPhotos } from '../core/photos.js';
import { loadCatalog } from '../core/catalog.js';
import { imageCacheStatus, warmImageCache } from '../core/image-cache.js';
import { escapeHtml, formatNumber, normalizeText } from '../core/format.js';
import { toast, pickFile } from '../ui/dom.js';
import { stopRest } from '../ui/rest-timer.js';
import { ui, render, navigate } from '../ui/state.js';
import { renderPlanEditor } from './plan-editor.js';
import { renderWorkoutListPanel } from './workouts.js';
import { activeProfile } from '../core/profiles.js';
import { profileInitial } from './profiles.js';

const offlinePhotos = { status: null, downloading: false };

export function renderSettings() {
  if (ui.editingWorkoutId) return renderPlanEditor(ui.editingWorkoutId);
  return `
    <header class="top"><h1>Ajustes</h1></header>
    <div class="panel">
      <h2>Perfil</h2>
      <button class="row-between link-row" data-action="open-profiles">
        <span class="profile-current"><span class="avatar">${profileInitial(activeProfile())}</span>${escapeHtml(activeProfile().name)}</span>
        <span class="muted">Trocar ›</span>
      </button>
      <p class="text-block" style="margin-top:8px">Cada pessoa tem treinos, cargas, fotos e pesagens separados neste aparelho.</p>
      <div class="ex-actions">
        <button data-action="rename-profile">Renomear</button>
        <button class="danger" data-action="delete-profile">Excluir perfil</button>
      </div>
    </div>
    ${renderWorkoutListPanel()}
    <div class="panel">
      <h2>Fotos offline</h2>
      <p class="text-block" id="offline-status">${offlineStatusText()}</p>
      <div class="finish" style="margin-top:12px"><button class="ghost" data-action="download-photos">Baixar todas as fotos agora</button></div>
    </div>
    <div class="panel">
      <h2>Backup</h2>
      <p class="text-block">Os dados ficam salvos só neste iPhone. Exporte de vez em quando para não perder nada se limpar o Safari ou trocar de celular. Suas fotos vão junto.</p>
      <div class="finish" style="margin-top:12px">
        <button class="primary" data-action="export">Exportar backup</button>
        <button class="ghost" data-action="import">Importar backup</button>
      </div>
    </div>
    <div class="panel">
      <h2>Dados</h2>
      <p class="text-block">${store.data.sessions.length} treino(s) e ${store.data.bodyWeights.length} pesagem(ns) salvos.</p>
      <div class="finish" style="margin-top:12px"><button class="ghost danger" data-action="reset">Apagar treinos deste perfil</button></div>
    </div>`;
}

function offlineStatusText() {
  const { status, downloading } = offlinePhotos;
  if (!status) return 'As fotos são guardadas no iPhone automaticamente, pra funcionar sem internet na academia.';
  const label = `${formatNumber(status.cached)} de ${formatNumber(status.total)} fotos salvas no iPhone`;
  if (status.cached >= status.total) return `✅ ${label}.`;
  return downloading ? `⏳ Baixando… ${label}.` : `${label}. Abra o app com internet para completar.`;
}

function updateOfflineStatus(status) {
  offlinePhotos.status = status;
  const element = document.getElementById('offline-status');
  if (element) element.textContent = offlineStatusText();
}

export async function syncOfflinePhotos() {
  if (offlinePhotos.downloading) return;
  try {
    const catalog = await loadCatalog();
    updateOfflineStatus(await imageCacheStatus(catalog));
    if (!navigator.onLine) return;
    offlinePhotos.downloading = true;
    await warmImageCache(catalog, updateOfflineStatus);
    updateOfflineStatus(await imageCacheStatus(catalog));
  } catch {
    // Catalog or Cache API unavailable: photos still load online.
  } finally {
    offlinePhotos.downloading = false;
    const element = document.getElementById('offline-status');
    if (element) element.textContent = offlineStatusText();
  }
}

async function exportBackup() {
  const backup = { ...store.data, draft: null, photos: await exportPhotos(), exportedAt: new Date().toISOString() };
  const profileSlug = normalizeText(activeProfile().name).replace(/[^a-z0-9]+/g, '-') || 'perfil';
  const fileName = `treino-${profileSlug}-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify(backup)], fileName, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Backup do treino' });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Merges instead of replacing, so importing an older backup never loses newer workouts.
async function importBackup() {
  const file = await pickFile('application/json,.json');
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const incoming = normalizeData(raw);
    const knownSessions = new Set(store.data.sessions.map(session => session.id));
    const knownWeights = new Set(store.data.bodyWeights.map(entry => entry.id));
    const newSessions = incoming.sessions.filter(session => !knownSessions.has(session.id));
    if (!confirm(`Importar ${newSessions.length} treino(s) novo(s)?`)) return;

    const { data } = store;
    data.sessions.push(...newSessions);
    data.bodyWeights.push(...incoming.bodyWeights.filter(entry => !knownWeights.has(entry.id)));
    for (const key of ['customExercises', 'imageOverrides', 'notes']) {
      data[key] = { ...incoming[key], ...data[key] };
    }
    const knownWorkouts = new Set(data.workouts.map(workout => workout.id));
    data.workouts.push(...incoming.workouts.filter(workout => !knownWorkouts.has(workout.id)));
    persist();
    await importPhotos(raw.photos);
    await loadPhotos();
    toast(`${newSessions.length} treino(s) importado(s)`);
    render();
  } catch {
    toast('Arquivo de backup inválido');
  }
}

function resetAll() {
  if (!confirm(`Apagar TODOS os treinos e pesagens de ${activeProfile().name}? Isso não pode ser desfeito.`)) return;
  replaceData(createEmptyData());
  stopRest();
  navigate({ summary: null, exerciseId: null, sessionId: null, editingWorkoutId: null });
}

export const settingsActions = {
  'download-photos': () => {
    syncOfflinePhotos();
    toast('Baixando fotos em segundo plano');
  },
  export: () => exportBackup(),
  import: () => importBackup(),
  reset: () => resetAll(),
};

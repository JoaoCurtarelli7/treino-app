import { listProfiles, activeProfile, createProfile, setActiveProfile, renameProfile, removeProfile } from '../core/profiles.js';
import { reloadStore } from '../core/store.js';
import { loadPhotos, deleteProfilePhotos } from '../core/photos.js';
import { syncSavedCatalogNames } from '../core/catalog.js';
import { escapeHtml } from '../core/format.js';
import { openSheet, closeSheet, toast } from '../ui/dom.js';
import { stopRest } from '../ui/rest-timer.js';
import { navigate } from '../ui/state.js';

const MAX_NAME_LENGTH = 30;
const HOME = { tab: 'train', summary: null, exerciseId: null, sessionId: null, editingWorkoutId: null };

export const profileInitial = profile => escapeHtml((profile?.name || '?').trim().charAt(0).toUpperCase());

export function renderOnboarding() {
  const isFirstEver = !listProfiles().length;
  return `
    <div class="onboarding">
      <img class="onboarding-icon" src="icon.png" alt="">
      <h1>${isFirstEver ? 'Bem-vindo ao Treino' : 'Nova pessoa'}</h1>
      <p class="sub">Cada pessoa tem os próprios treinos, cargas e evolução. Tudo fica salvo só neste aparelho.</p>
      <input id="profile-name" class="input" placeholder="Seu nome" maxlength="${MAX_NAME_LENGTH}" autocomplete="given-name" enterkeyhint="go">
      <button class="primary" data-action="create-profile">Começar</button>
    </div>`;
}

function readName(inputId) {
  const name = document.getElementById(inputId)?.value.trim().slice(0, MAX_NAME_LENGTH);
  if (!name) toast('Digite um nome');
  return name || null;
}

// Every module reads store.data / photos lazily, so reloading them is all a switch needs.
async function enterProfile(greeting) {
  reloadStore();
  await loadPhotos();
  syncSavedCatalogNames();
  stopRest();
  closeSheet();
  navigate(HOME);
  toast(greeting);
}

async function addProfile(inputId) {
  const name = readName(inputId);
  if (!name) return;
  createProfile(name);
  await enterProfile(`Olá, ${name}!`);
}

async function switchProfile(profileId) {
  if (profileId === activeProfile()?.id) {
    closeSheet();
    return;
  }
  setActiveProfile(profileId);
  await enterProfile(`Olá, ${activeProfile().name}!`);
}

export function openProfilesSheet() {
  const current = activeProfile();
  openSheet(`
    <div class="sheet-head"><h2>Quem vai treinar?</h2><button data-action="close-sheet">Fechar</button></div>
    <div class="choice">
      ${listProfiles().map(profile => `
        <button class="profile-option ${profile.id === current?.id ? 'current' : ''}" data-action="switch-profile" data-id="${profile.id}">
          <span class="avatar">${profileInitial(profile)}</span>
          <span class="grow">${escapeHtml(profile.name)}</span>
          ${profile.id === current?.id ? '<span class="pill">ATUAL</span>' : ''}
        </button>`).join('')}
    </div>
    <div class="inline-form">
      <input id="new-profile-name" class="input" placeholder="Nome da nova pessoa" maxlength="${MAX_NAME_LENGTH}" autocomplete="off">
      <button class="small-btn solid" data-action="add-profile">Adicionar</button>
    </div>`);
}

function openRenameSheet() {
  const current = activeProfile();
  openSheet(`
    <div class="sheet-head"><h2>Renomear perfil</h2><button data-action="close-sheet">Fechar</button></div>
    <input id="rename-profile-name" class="input" value="${escapeHtml(current.name)}" maxlength="${MAX_NAME_LENGTH}" autocomplete="off">
    <button class="primary" data-action="save-profile-name">Salvar</button>`);
}

function saveProfileName() {
  const name = readName('rename-profile-name');
  if (!name) return;
  renameProfile(activeProfile().id, name);
  closeSheet();
  navigate({});
}

async function deleteCurrentProfile() {
  const current = activeProfile();
  if (!confirm(`Excluir o perfil "${current.name}" com todos os treinos, pesagens e fotos? Isso não pode ser desfeito.`)) return;
  removeProfile(current.id);
  await deleteProfilePhotos(current.photoPrefix);
  const next = activeProfile();
  await enterProfile(next ? `Agora em: ${next.name}` : 'Perfil excluído');
}

export const profileActions = {
  'create-profile': () => addProfile('profile-name'),
  'add-profile': () => addProfile('new-profile-name'),
  'open-profiles': () => openProfilesSheet(),
  'switch-profile': ({ id }) => switchProfile(id),
  'rename-profile': () => openRenameSheet(),
  'save-profile-name': () => saveProfileName(),
  'delete-profile': () => deleteCurrentProfile(),
};

// Enter key on the name fields submits, like a native form.
export function handleProfileKeydown(event) {
  if (event.key !== 'Enter') return false;
  const handlers = { 'profile-name': 'create-profile', 'new-profile-name': 'add-profile', 'rename-profile-name': 'save-profile-name' };
  const action = handlers[event.target.id];
  if (!action) return false;
  event.preventDefault();
  profileActions[action]();
  return true;
}

import { createId } from './format.js';

// Registry of the people using this device. Each profile owns its own data key and photo namespace.
const REGISTRY_KEY = 'treino-profiles:v1';
const LEGACY_DATA_KEY = 'treino-log:v1';
const LEGACY_PROFILE_ID = 'p-legacy';

function readRegistry() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REGISTRY_KEY));
    if (parsed && Array.isArray(parsed.profiles)) return parsed;
  } catch {
    // Corrupted or blocked storage: start with an empty registry.
  }
  return { activeId: null, profiles: [] };
}

const registry = readRegistry();

function saveRegistry() {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // Storage blocked: profiles still work for this session.
  }
}

function hasLegacyData() {
  try {
    return localStorage.getItem(LEGACY_DATA_KEY) !== null;
  } catch {
    return false;
  }
}

// Data from before profiles existed becomes the first profile in place: same key, nothing copied.
if (!registry.profiles.length && hasLegacyData()) {
  registry.profiles.push({
    id: LEGACY_PROFILE_ID, name: 'Eu', storageKey: LEGACY_DATA_KEY, photoPrefix: '', createdAt: new Date().toISOString(),
  });
  registry.activeId = LEGACY_PROFILE_ID;
  saveRegistry();
}

export const listProfiles = () => registry.profiles;
export const activeProfile = () => registry.profiles.find(profile => profile.id === registry.activeId) || null;

export function createProfile(name) {
  const id = `p-${createId()}`;
  const profile = { id, name, storageKey: `treino-log:${id}`, photoPrefix: `${id}|`, createdAt: new Date().toISOString() };
  registry.profiles.push(profile);
  registry.activeId = id;
  saveRegistry();
  return profile;
}

export function setActiveProfile(profileId) {
  if (!registry.profiles.some(profile => profile.id === profileId)) return;
  registry.activeId = profileId;
  saveRegistry();
}

export function renameProfile(profileId, name) {
  const profile = registry.profiles.find(item => item.id === profileId);
  if (!profile) return;
  profile.name = name;
  saveRegistry();
}

export function removeProfile(profileId) {
  const profile = registry.profiles.find(item => item.id === profileId);
  if (!profile) return null;
  try {
    localStorage.removeItem(profile.storageKey);
  } catch {
    // Nothing else to clean up if storage is blocked.
  }
  registry.profiles = registry.profiles.filter(item => item.id !== profileId);
  if (registry.activeId === profileId) registry.activeId = registry.profiles[0]?.id ?? null;
  saveRegistry();
  return profile;
}

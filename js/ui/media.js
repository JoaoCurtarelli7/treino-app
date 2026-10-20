import { imageIdFor } from '../core/exercises.js';
import { photoUrl } from '../core/photos.js';
import { escapeHtml } from '../core/format.js';

const REMOTE_IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const localFrame = (imageId, frame) => `img/${imageId}_${frame}.jpg`;
const remoteFrame = (imageId, frame) => `${REMOTE_IMAGE_BASE}${encodeURI(imageId)}/${frame}.jpg`;

// A user photo wins over the catalog pair; catalog photos fall back to the online repo if missing locally.
function framesFor(exerciseId) {
  const ownPhoto = photoUrl(exerciseId);
  if (ownPhoto) return [{ src: ownPhoto }];
  return framesForImage(imageIdFor(exerciseId));
}

function framesForImage(imageId) {
  if (!imageId) return [];
  return [0, 1].map(frame => ({ src: localFrame(imageId, frame), remote: remoteFrame(imageId, frame) }));
}

const imgTag = (frame, className = '', onFail = 'remove-self') => `
  <img ${className ? `class="${className}"` : ''} src="${escapeHtml(frame.src)}" alt="" loading="lazy" decoding="async"
    data-on-fail="${onFail}" ${frame.remote ? `data-remote="${escapeHtml(frame.remote)}"` : ''}>`;

function renderFrames(frames, { large, action }) {
  if (!frames.length) return '';
  const tag = action ? 'button' : 'div';
  const [start, end] = frames;
  return `
    <${tag} class="media ${large ? 'large' : ''}" ${action ? `data-action="${action}" aria-label="Ampliar foto"` : ''}>
      ${imgTag(start, '', 'remove-parent')}${end ? imgTag(end, 'alt') : ''}
    </${tag}>`;
}

export const renderMedia = (exerciseId, { large = false, action = '' } = {}) =>
  renderFrames(framesFor(exerciseId), { large, action });

export const renderImageMedia = (imageId, { large = false } = {}) =>
  renderFrames(framesForImage(imageId), { large, action: '' });

function renderThumbFrom(frames, label) {
  const initial = escapeHtml((label || '?').charAt(0).toUpperCase());
  return `<span class="thumb">${initial}${frames[0] ? imgTag(frames[0]) : ''}</span>`;
}

export const renderThumb = (exerciseId, label) => renderThumbFrom(framesFor(exerciseId), label);
export const renderImageThumb = (imageId, label) => renderThumbFrom(framesForImage(imageId), label);

export const hasAnyImage = exerciseId => framesFor(exerciseId).length > 0;

// One capture-phase listener handles every broken <img>: try the online copy, then hide it.
export function installImageFallback() {
  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const { remote, onFail } = image.dataset;
    if (remote && image.src !== remote) {
      image.src = remote;
      return;
    }
    if (onFail === 'remove-parent') image.parentElement?.remove();
    else image.remove();
  }, true);
}

const $toast = document.getElementById('toast');
const $sheetBackdrop = document.getElementById('sheet');
const $sheet = $sheetBackdrop.querySelector('.sheet');
let toastTimeout = null;

export function toast(message) {
  $toast.textContent = message;
  $toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $toast.classList.remove('show'), 2200);
}

export function openSheet(html, { full = false } = {}) {
  $sheet.innerHTML = `<div class="grabber"></div>${html}`;
  $sheet.classList.toggle('full', full);
  $sheetBackdrop.hidden = false;
  document.body.classList.add('locked');
}

export function closeSheet() {
  $sheetBackdrop.hidden = true;
  $sheet.innerHTML = '';
  document.body.classList.remove('locked');
}

export const isSheetBackdrop = element => element === $sheetBackdrop;

export function pickFile(accept) {
  return new Promise(resolve => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept });
    input.addEventListener('change', () => resolve(input.files[0] || null), { once: true });
    input.click();
  });
}

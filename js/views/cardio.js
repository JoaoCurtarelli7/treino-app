import { CARDIO_TYPES, INTENSITIES } from '../config/cardio.js';
import { persist } from '../core/store.js';
import {
  getCardio, saveCardio, deleteCardio, cardioType, lastCardioTypeId, cardioNewestFirst, cardioSince, minutesOf,
  weeklyMinutes, startOfWeek, formatCardioMetrics,
} from '../core/cardio.js';
import { escapeHtml, formatDate, formatNumber, parseNumber, startOfDay } from '../core/format.js';
import { openSheet, closeSheet, toast } from '../ui/dom.js';
import { renderLineChart } from '../ui/chart.js';
import { emptyState } from '../ui/fragments.js';
import { render } from '../ui/state.js';

const toDateInputValue = date => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

// Keeps the original time when the day didn't change; a past day is stored at noon to avoid timezone edges.
function dateFromInput(value, previousIso) {
  if (previousIso && toDateInputValue(new Date(previousIso)) === value) return previousIso;
  if (value === toDateInputValue(new Date())) return new Date().toISOString();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toISOString();
}

const optionalNumber = id => {
  const value = parseNumber(document.getElementById(id).value);
  return value ? value : null;
};

/* ---------- Form ---------- */

export function openCardioSheet(cardioId = null) {
  const entry = cardioId ? getCardio(cardioId) : null;
  const typeId = entry?.type ?? lastCardioTypeId();
  const intensity = entry?.intensity ?? 'moderate';
  const today = toDateInputValue(new Date());
  const numberValue = value => (value ? formatNumber(value) : '');

  openSheet(`
    <div class="sheet-head"><h2>${entry ? 'Editar cardio' : 'Registrar cardio'}</h2><button data-action="close-sheet">Fechar</button></div>
    <div class="sheet-scroll">
      <div class="field"><span>Tipo</span>
        <div class="chips wrap" id="cardio-types">
          ${CARDIO_TYPES.map(type => `
            <button class="chip ${type.id === typeId ? 'on' : ''}" data-action="cardio-pick" data-group="cardio-types" data-id="${type.id}">${type.icon} ${type.name}</button>`).join('')}
        </div>
      </div>
      <div class="field-row two">
        <label class="field"><span>Duração (min)</span><input id="cardio-minutes" class="input" inputmode="numeric" placeholder="30" value="${numberValue(entry?.minutes)}"></label>
        <label class="field"><span>Distância (km)</span><input id="cardio-distance" class="input" inputmode="decimal" placeholder="opcional" value="${numberValue(entry?.distanceKm)}"></label>
      </div>
      <div class="field-row two">
        <label class="field"><span>Calorias</span><input id="cardio-calories" class="input" inputmode="numeric" placeholder="opcional" value="${numberValue(entry?.calories)}"></label>
        <label class="field"><span>FC média (bpm)</span><input id="cardio-heart-rate" class="input" inputmode="numeric" placeholder="opcional" value="${numberValue(entry?.heartRate)}"></label>
      </div>
      <div class="field"><span>Intensidade</span>
        <div class="segmented compact" id="cardio-intensity">
          ${INTENSITIES.map(level => `
            <button class="${level.id === intensity ? 'on' : ''}" data-action="cardio-pick" data-group="cardio-intensity" data-id="${level.id}">${level.name}</button>`).join('')}
        </div>
      </div>
      <label class="field"><span>Data</span><input id="cardio-date" class="input" type="date" max="${today}" value="${entry ? toDateInputValue(new Date(entry.date)) : today}"></label>
      <label class="field"><span>Anotação</span><textarea id="cardio-note" class="input" rows="2" placeholder="Ex.: inclinação 12, velocidade 5,5">${escapeHtml(entry?.note ?? '')}</textarea></label>
      <button class="primary" data-action="save-cardio" data-id="${entry?.id ?? ''}">${entry ? 'Salvar alterações' : 'Salvar cardio'}</button>
      ${entry ? `<button class="ghost danger" data-action="delete-cardio" data-id="${entry.id}">Excluir registro</button>` : ''}
    </div>`, { full: true });
}

const selectedIn = groupId => document.querySelector(`#${groupId} .on`)?.dataset.id;

function submitCardio(cardioId) {
  const minutes = parseNumber(document.getElementById('cardio-minutes').value);
  if (!minutes || minutes > 600) {
    toast('Informe a duração em minutos');
    document.getElementById('cardio-minutes').focus();
    return;
  }
  const dateValue = document.getElementById('cardio-date').value || toDateInputValue(new Date());
  const heartRate = optionalNumber('cardio-heart-rate');
  saveCardio({
    type: selectedIn('cardio-types') ?? 'other',
    minutes,
    distanceKm: optionalNumber('cardio-distance'),
    calories: optionalNumber('cardio-calories'),
    heartRate: heartRate ? Math.round(heartRate) : null,
    intensity: selectedIn('cardio-intensity') ?? 'moderate',
    date: dateFromInput(dateValue, getCardio(cardioId)?.date),
    note: document.getElementById('cardio-note').value.trim(),
  }, cardioId || null);
  persist();
  closeSheet();
  render();
  toast(cardioId ? 'Cardio atualizado' : 'Cardio registrado 🏃');
}

function removeCardio(cardioId) {
  if (!confirm('Excluir este registro de cardio?')) return;
  deleteCardio(cardioId);
  persist();
  closeSheet();
  render();
}

/* ---------- Shared list item ---------- */

export function renderCardioItem(entry) {
  const type = cardioType(entry.type);
  return `
    <button class="item start" data-action="open-cardio" data-id="${entry.id}">
      <span class="thumb cardio-icon">${type.icon}</span>
      <div class="main grow"><strong>Cardio · ${escapeHtml(type.name)}</strong>
        <small>${formatDate(entry.date, { weekday: 'long', day: '2-digit', month: '2-digit' })}</small>
        <span class="sets-line">${formatCardioMetrics(entry)}</span></div>
    </button>`;
}

/* ---------- Evolução → Cardio ---------- */

export function renderCardioProgress() {
  const entries = cardioNewestFirst();
  const registerButton = '<button class="primary" style="margin-bottom:12px" data-action="new-cardio">🏃 Registrar cardio</button>';
  if (!entries.length) return `${registerButton}${emptyState('Nenhum cardio ainda', 'Registre esteira, bike, corrida… e acompanhe os minutos por semana aqui.')}`;

  const last30 = new Date(startOfDay(new Date()));
  last30.setDate(last30.getDate() - 29);
  const recent = cardioSince(last30);
  const distance = recent.reduce((total, entry) => total + (entry.distanceKm || 0), 0);

  return `
    ${registerButton}
    <div class="stats">
      <div class="stat"><small>Semana</small><strong>${formatNumber(minutesOf(cardioSince(startOfWeek())))}<small class="unit"> min</small></strong></div>
      <div class="stat"><small>30 dias</small><strong>${formatNumber(minutesOf(recent))}<small class="unit"> min</small></strong></div>
      <div class="stat"><small>${distance ? 'Km 30 dias' : 'Sessões 30d'}</small><strong>${distance ? formatNumber(Math.round(distance * 10) / 10) : recent.length}</strong></div>
    </div>
    <div class="panel"><h2>Minutos de cardio por semana</h2>${renderLineChart(weeklyMinutes(8))}</div>
    <p class="section-title">Registros</p>
    <div class="list">${entries.map(renderCardioItem).join('')}</div>`;
}

export const cardioActions = {
  'new-cardio': () => openCardioSheet(),
  'open-cardio': ({ id }) => openCardioSheet(id),
  'save-cardio': ({ id }) => submitCardio(id),
  'delete-cardio': ({ id }) => removeCardio(id),
  'cardio-pick': ({ group }, element) => {
    document.querySelectorAll(`#${group} .on`).forEach(option => option.classList.remove('on'));
    element.classList.add('on');
  },
};

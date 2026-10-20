import { store, persist } from '../core/store.js';
import { createId, formatDate, formatNumber, parseNumber, daysBetween } from '../core/format.js';
import { renderLineChart } from '../ui/chart.js';
import { toast } from '../ui/dom.js';
import { render } from '../ui/state.js';

const entriesOldestFirst = () => [...store.data.bodyWeights].sort((a, b) => a.date.localeCompare(b.date));

function weightChange(entries, maxDaysAgo) {
  const latest = entries[entries.length - 1];
  const baseline = entries.find(entry => daysBetween(entry.date, new Date(latest.date)) <= maxDaysAgo);
  return baseline && baseline !== latest ? latest.weight - baseline.weight : null;
}

const signed = value => (value === null ? '–' : `${value > 0 ? '+' : ''}${formatNumber(Math.round(value * 10) / 10)}`);
const changeClass = value => (value === null || value === 0 ? '' : value < 0 ? 'down-good' : 'up-neutral');

export function renderBodyWeight() {
  const entries = entriesOldestFirst();
  const latest = entries[entries.length - 1];
  const form = `
    <div class="panel">
      <h2>Registrar peso</h2>
      <div class="inline-form">
        <input id="body-weight-input" class="input" inputmode="decimal" placeholder="${latest ? formatNumber(latest.weight) : 'Ex.: 80'}" autocomplete="off" aria-label="Peso em kg">
        <span class="muted">kg</span>
        <button class="small-btn solid" data-action="add-body-weight">Salvar</button>
      </div>
      <p class="text-block">Pese-se em jejum, no mesmo dia da semana, pra comparar certo.</p>
    </div>`;

  if (!entries.length) return form;

  const total = entries.length > 1 ? latest.weight - entries[0].weight : null;
  const last30 = weightChange(entries, 30);
  return `
    ${form}
    <div class="stats">
      <div class="stat"><small>Atual</small><strong>${formatNumber(latest.weight)}</strong></div>
      <div class="stat"><small>30 dias</small><strong class="${changeClass(last30)}">${signed(last30)}</strong></div>
      <div class="stat"><small>Total</small><strong class="${changeClass(total)}">${signed(total)}</strong></div>
    </div>
    <div class="panel"><h2>Peso (kg)</h2>${renderLineChart(entries.map(e => ({ date: e.date, value: e.weight })), 'Registre mais uma pesagem para ver o gráfico.')}</div>
    <p class="section-title">Registros</p>
    <div class="list">
      ${[...entries].reverse().map(entry => `
        <div class="item">
          <div class="main"><strong>${formatNumber(entry.weight)} kg</strong><small>${formatDate(entry.date, { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })}</small></div>
          <button class="icon-btn" data-action="delete-body-weight" data-id="${entry.id}" aria-label="Excluir registro">×</button>
        </div>`).join('')}
    </div>`;
}

function addBodyWeight() {
  const weight = parseNumber(document.getElementById('body-weight-input').value);
  if (!weight || weight < 20 || weight > 400) {
    toast('Informe um peso válido');
    return;
  }
  store.data.bodyWeights.push({ id: createId(), date: new Date().toISOString(), weight });
  persist();
  render();
  toast('Peso registrado');
}

function deleteBodyWeight(entryId) {
  if (!confirm('Excluir este registro de peso?')) return;
  store.data.bodyWeights = store.data.bodyWeights.filter(entry => entry.id !== entryId);
  persist();
  render();
}

export const bodyWeightActions = {
  'add-body-weight': () => addBodyWeight(),
  'delete-body-weight': ({ id }) => deleteBodyWeight(id),
};

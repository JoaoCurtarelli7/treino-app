import { REST_OPTIONS } from '../config/exercises.js';
import { escapeHtml, formatRest } from '../core/format.js';

const MIN_SETS = 1;
const MAX_SETS = 10;

// Shared sets/reps/rest editor used by the workout session and the plan editor.
export function renderPlanFields(plan) {
  const restOptions = REST_OPTIONS.includes(plan.rest) ? REST_OPTIONS : [...REST_OPTIONS, plan.rest].sort((a, b) => a - b);
  return `
    <div class="field-row">
      <div class="field"><span>Séries</span>
        <div class="stepper">
          <button type="button" data-action="plan-sets-step" data-delta="-1" aria-label="Menos séries">−</button>
          <output id="plan-sets">${plan.sets}</output>
          <button type="button" data-action="plan-sets-step" data-delta="1" aria-label="Mais séries">+</button>
        </div>
      </div>
      <label class="field"><span>Reps</span><input id="plan-reps" class="input" value="${escapeHtml(plan.reps)}" autocomplete="off"></label>
      <label class="field"><span>Descanso</span>
        <select id="plan-rest" class="input">
          ${restOptions.map(seconds => `<option value="${seconds}" ${seconds === plan.rest ? 'selected' : ''}>${formatRest(seconds)}</option>`).join('')}
        </select>
      </label>
    </div>`;
}

export function readPlanFields() {
  return {
    sets: Number(document.getElementById('plan-sets').textContent),
    reps: document.getElementById('plan-reps').value.trim() || '8–12',
    rest: Number(document.getElementById('plan-rest').value),
  };
}

export const planFieldActions = {
  'plan-sets-step': ({ delta }) => {
    const output = document.getElementById('plan-sets');
    output.textContent = Math.min(MAX_SETS, Math.max(MIN_SETS, Number(output.textContent) + Number(delta)));
  },
};

import { formatDate, formatNumber } from '../core/format.js';

const WIDTH = 340;
const HEIGHT = 180;
const PADDING = { left: 36, right: 14, top: 16, bottom: 24 };

export function renderLineChart(points, emptyMessage = 'Registre mais um treino para ver o gráfico.') {
  if (points.length < 2) return `<div class="chart-empty">${emptyMessage}</div>`;

  const values = points.map(point => point.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const margin = (max - min) * 0.15;
  min = Math.max(0, min - margin);
  max += margin;

  const lastIndex = points.length - 1;
  const x = index => PADDING.left + (index * (WIDTH - PADDING.left - PADDING.right)) / lastIndex;
  const y = value => PADDING.top + ((max - value) * (HEIGHT - PADDING.top - PADDING.bottom)) / (max - min);
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
  const baseline = HEIGHT - PADDING.bottom;
  const area = `${line} L${x(lastIndex).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z`;
  const ticks = [min, (min + max) / 2, max];
  const gradientId = `fill-${Math.random().toString(36).slice(2, 8)}`;

  return `
    <svg class="chart" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Gráfico de evolução">
      <defs><linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" style="stop-color:var(--accent);stop-opacity:.3"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/>
      </linearGradient></defs>
      ${ticks.map(tick => `
        <line x1="${PADDING.left}" x2="${WIDTH - PADDING.right}" y1="${y(tick).toFixed(1)}" y2="${y(tick).toFixed(1)}" style="stroke:var(--line)"/>
        <text x="${PADDING.left - 6}" y="${(y(tick) + 4).toFixed(1)}" text-anchor="end">${formatNumber(Math.round(tick * 10) / 10)}</text>`).join('')}
      <path d="${area}" fill="url(#${gradientId})"/>
      <path d="${line}" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${points.map((point, index) => `
        <circle cx="${x(index).toFixed(1)}" cy="${y(point.value).toFixed(1)}" r="${index === lastIndex ? 5 : 3}"
          style="fill:${index === lastIndex ? 'var(--accent)' : 'var(--surface)'};stroke:var(--accent)" stroke-width="2"/>`).join('')}
      <text x="${x(0)}" y="${HEIGHT - 6}" text-anchor="start">${formatDate(points[0].date)}</text>
      <text x="${x(lastIndex)}" y="${HEIGHT - 6}" text-anchor="end">${formatDate(points[lastIndex].date)}</text>
    </svg>`;
}

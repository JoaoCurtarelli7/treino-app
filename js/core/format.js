const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export const formatNumber = value => numberFormat.format(value);

export function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(',', '.');
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function formatDate(iso, options = { day: '2-digit', month: '2-digit' }) {
  return new Date(iso).toLocaleDateString('pt-BR', options);
}

export const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function daysBetween(fromIso, to = new Date()) {
  return Math.round((startOfDay(to) - startOfDay(new Date(fromIso))) / 86400000);
}

export function formatRelativeDays(iso) {
  const days = daysBetween(iso);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}

export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}` : `${minutes}:${remainder}`;
}

export const formatRest = seconds => (seconds % 60 ? formatClock(seconds) : `${seconds / 60} min`);

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
}

export const normalizeText = value =>
  String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const createId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

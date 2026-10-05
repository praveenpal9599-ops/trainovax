const toDate = (v) => (v instanceof Date ? v : new Date(String(v).length === 10 ? `${v}T00:00:00` : String(v).replace(' ', 'T')));

export const formatDate = (v, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (v ? toDate(v).toLocaleDateString('en-IN', opts) : '—');
export const formatShortDate = (v) => formatDate(v, { day: 'numeric', month: 'short' });
export const formatDateTime = (v) => (v ? toDate(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
export const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};
export const formatMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' }); };

export function timeAgo(v) {
  if (!v) return '';
  const s = Math.round((Date.now() - toDate(v).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24); if (d < 7) return `${d}d ago`;
  return formatDate(v, { day: 'numeric', month: 'short' });
}
export const daysSince = (v) => (v ? Math.floor((Date.now() - toDate(v).getTime()) / 86400000) : null);

export const num = (v, digits = 1) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: digits }));
export const withUnit = (v, unit, digits = 1) => (v === null || v === undefined ? '—' : `${num(v, digits)}${unit ? ` ${unit}` : ''}`);
export const signed = (v, unit = '', digits = 1) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${num(v, digits)}${unit ? ` ${unit}` : ''}`);
export const currency = (v, code = 'INR') => Number(v || 0).toLocaleString('en-IN', { style: 'currency', currency: code, maximumFractionDigits: 0 });

export function duration(sec) {
  if (!sec) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60); const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m} min`;
}
export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
export const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

export function bmi(weight, heightCm) {
  if (!weight || !heightCm) return null;
  const m = heightCm / 100; return Math.round((weight / (m * m)) * 10) / 10;
}
export function bmiCategory(v) {
  if (!v) return { label: '—', color: 'default' };
  if (v < 18.5) return { label: 'Underweight', color: 'info' };
  if (v < 25) return { label: 'Healthy', color: 'success' };
  if (v < 30) return { label: 'Overweight', color: 'warning' };
  return { label: 'Obese', color: 'error' };
}

export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const addDaysISO = (iso, n) => { const d = toDate(iso); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

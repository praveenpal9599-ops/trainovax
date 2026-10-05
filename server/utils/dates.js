const pad = (n) => String(n).padStart(2, '0');
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISODate(new Date());
export const addDays = (date, n) => { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + n); return toISODate(d); };
/** ISO weekday: 1 = Monday … 7 = Sunday */
export const isoWeekday = (date) => { const d = new Date(`${date}T00:00:00`).getDay(); return d === 0 ? 7 : d; };
export const rangeFromPreset = (preset) => {
  const map = { '7d': 7, '30d': 30, '3m': 91, '6m': 182, '1y': 365 };
  return map[preset] ? addDays(today(), -map[preset]) : null;
};

import { Chip } from '@mui/material';
import './StatusChip.css';

const MAP = {
  active: 'success', inactive: 'default', draft: 'warning', completed: 'info', archived: 'default', trial: 'info', past_due: 'warning',
  cancelled: 'error', expired: 'default', present: 'success', late: 'warning', absent: 'error', excused: 'default', open: 'primary', done: 'success',
  skipped: 'warning', high: 'error', medium: 'warning', low: 'default', beginner: 'success', intermediate: 'warning', advanced: 'error',
};

/** Material 3 style tonal chip for statuses. Colours live in StatusChip.css. */
export default function StatusChip({ status, label, size = 'small', color: forced, className = '' }) {
  if (!status && !label) return null;
  const color = forced || MAP[status] || 'default';
  const text = label || String(status).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return <Chip size={size} label={text} className={`status-chip status-chip--${color} ${className}`.trim()} />;
}

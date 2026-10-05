import { CircularProgress } from '@mui/material';
import './ProgressRing.css';

/**
 * Circular percentage indicator.
 * Size is a CSS variable (--ring-size); `tone="light"` is for use on coloured backgrounds.
 */
export default function ProgressRing({ value = 0, size = 88, thickness = 5, color = 'primary', label, sublabel, tone }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  const light = tone === 'light' || color === 'inherit';
  return (
    <div className={`progress-ring progress-ring--${light ? 'light' : color}`} style={{ '--ring-size': `${size}px` }} role="img" aria-label={`${label || ''} ${v}%`}>
      <CircularProgress variant="determinate" value={100} size={size} thickness={thickness} className="progress-ring__track" />
      <CircularProgress variant="determinate" value={v} size={size} thickness={thickness} className="progress-ring__bar" />
      <div className="progress-ring__center">
        <div>
          <div className="progress-ring__value">{v}%</div>
          {sublabel && <div className="progress-ring__sublabel">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import './StatCard.css';

/** KPI tile: icon + label on top, large value, optional delta/hint. Styles: StatCard.css */
export default function StatCard({ icon: Icon, label, value, hint, delta, deltaGood = 'up', color = 'primary', loading, onClick, className = '' }) {
  const good = delta == null ? null : (deltaGood === 'up' ? delta >= 0 : delta <= 0);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={`card stat-card ${onClick ? 'card--clickable' : ''} ${className}`.trim()}>
      <div className="stat-card__head">
        {Icon && <span className={`icon-tile tone--${color}`}><Icon /></span>}
        <span className="stat-card__label">{label}</span>
      </div>
      {loading ? <Skeleton width={80} height={40} /> : <div className="stat-card__value">{value}</div>}
      {(hint || delta != null) && !loading && (
        <div className="stat-card__foot">
          {delta != null && (
            <span className={`stat-card__delta ${good ? 'stat-card__delta--good' : 'stat-card__delta--bad'}`}>
              {delta >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
          {hint && <span className="stat-card__hint">{hint}</span>}
        </div>
      )}
    </Tag>
  );
}

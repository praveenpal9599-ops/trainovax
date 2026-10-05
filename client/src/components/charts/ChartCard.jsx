import { Skeleton } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SectionCard from '../common/SectionCard';
import EmptyState from '../common/EmptyState';
import './charts.css';

/** Wraps a chart with a titled card and loading / empty states. Height is passed as a CSS variable. */
export default function ChartCard({ title, subtitle, action, loading, empty, emptyText = 'Not enough data to draw this chart yet.', height = 280, className = '', children }) {
  return (
    <SectionCard title={title} subtitle={subtitle} action={action} className={`chart-card ${className}`.trim()}>
      <div className="chart-card__body" style={{ '--chart-height': `${height}px` }}>
        {loading ? <Skeleton variant="rounded" height={height} /> : empty ? <EmptyState compact icon={ShowChartIcon} title="No data" description={emptyText} /> : children}
      </div>
    </SectionCard>
  );
}

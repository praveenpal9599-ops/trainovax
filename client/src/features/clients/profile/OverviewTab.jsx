import { Button, LinearProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import MonitorWeightOutlinedIcon from '@mui/icons-material/MonitorWeightOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import SectionCard from '../../../components/common/SectionCard';
import ChartCard from '../../../components/charts/ChartCard';
import TrendChart from '../../../components/charts/TrendChart';
import EmptyState from '../../../components/common/EmptyState';
import useFetch from '../../../hooks/useFetch';
import { clientService, progressService } from '../../../services';
import { MEASUREMENTS } from '../../../utils/constants';
import { formatDate, formatShortDate, num, timeAgo } from '../../../utils/format';
import './OverviewTab.css';

const ICONS = { progress: MonitorWeightOutlinedIcon, workout: FitnessCenterOutlinedIcon, diet: RestaurantMenuOutlinedIcon, photo: PhotoCameraOutlinedIcon, note: StickyNote2OutlinedIcon };

function adherence(logs) {
  const w = logs?.workout || []; const d = logs?.diet || [];
  const pct = (arr) => (arr.length ? Math.round((100 * arr.filter((x) => x.status === 'completed').length) / arr.length) : null);
  return { workout: pct(w), diet: pct(d), workoutCount: w.filter((x) => x.status === 'completed').length, dietCount: d.filter((x) => x.status === 'completed').length };
}

export default function OverviewTab({ client, basePath, onTab }) {
  const navigate = useNavigate();
  const { data: progress, loading } = useFetch(() => progressService.list(client.id, { range: '6m' }), [client.id]);
  const { data: logs } = useFetch(() => clientService.logs(client.id), [client.id]);
  const { data: history } = useFetch(() => clientService.history(client.id), [client.id]);
  const latest = client.latest_measurement;
  const a = adherence(logs);
  const rows = (progress?.data || []).map((r) => ({ ...r, date: r.record_date }));

  return (
    <div className="client-overview">
      <div className="client-overview__trend">
        <ChartCard title="Weight trend" subtitle="Last 6 months" loading={loading} empty={rows.length < 1} height={260}
          action={<Button size="small" onClick={() => onTab('progress')}>All charts</Button>}>
          <TrendChart data={rows} series={[{ key: 'weight_kg', label: 'Weight' }]} unit="kg" xFormatter={formatShortDate} referenceY={client.stats.target_weight_kg || undefined} />
        </ChartCard>
      </div>
      <div className="client-overview__latest">
        <SectionCard title="Latest measurements" subtitle={latest ? formatDate(latest.record_date) : 'No measurements yet'} action={<Button size="small" onClick={() => onTab('measurements')}>History</Button>}>
          {latest ? (
            <dl className="client-overview__measures">
              {MEASUREMENTS.filter((m) => m.key !== 'weight_kg').map((m) => (
                <div key={m.key}>
                  <dt className="client-overview__measure-label">{m.label}</dt>
                  <dd className="client-overview__measure-value">{num(latest[m.key])}<span className="client-overview__measure-unit"> {m.unit}</span></dd>
                </div>
              ))}
            </dl>
          ) : <EmptyState compact title="No data" description="Add the first measurement to see stats here." />}
        </SectionCard>
      </div>
      <div className="client-overview__plans">
        <SectionCard title="Current plans">
          <div className="client-overview__plan-list">
            {[{ label: 'Workout', value: client.active_workout, icon: FitnessCenterOutlinedIcon, tab: 'workout', to: `${basePath}/workouts/new?clientId=${client.id}` },
              { label: 'Diet', value: client.active_diet, icon: RestaurantMenuOutlinedIcon, tab: 'diet', to: `${basePath}/diets/new?clientId=${client.id}` }].map((p) => (
              <div key={p.label} className="client-overview__plan">
                <p.icon color={p.value ? 'primary' : 'disabled'} />
                <div className="flex-1"><span className="client-overview__plan-label">{p.label} plan</span><p className="client-overview__plan-name truncate">{p.value || 'Not assigned'}</p></div>
                {p.value ? <Button size="small" onClick={() => onTab(p.tab)}>View</Button> : <Button size="small" variant="outlined" onClick={() => navigate(p.to)}>Assign</Button>}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
      <div className="client-overview__adherence">
        <SectionCard title="Adherence" subtitle="Last 30 days">
          {[{ label: 'Workout completion', v: a.workout, hint: `${a.workoutCount} exercises completed` }, { label: 'Diet adherence', v: a.diet, hint: `${a.dietCount} meals followed` }].map((x) => (
            <div key={x.label} className="client-overview__meter">
              <div className="row row--between"><span className="text-small">{x.label}</span><span className="text-small text-strong">{x.v == null ? '—' : `${x.v}%`}</span></div>
              <LinearProgress variant="determinate" value={x.v || 0} className="client-overview__meter-bar" color={x.v >= 75 ? 'success' : x.v >= 50 ? 'primary' : 'warning'} />
              <span className="text-caption text-muted">{x.hint}</span>
            </div>
          ))}
          <span className="text-caption text-muted">{client.counts.sessions_30d} gym sessions attended in the last 30 days</span>
        </SectionCard>
      </div>
      <div className="client-overview__history" id="history">
        <SectionCard title="Activity history" subtitle="Plans, measurements, photos and notes">
          <div className="client-overview__timeline">
            {(history || []).length === 0 && <EmptyState compact title="No activity yet" />}
            {(history || []).slice(0, 30).map((h, i) => {
              const Icon = ICONS[h.type] || StickyNote2OutlinedIcon;
              return (
                <div key={`${h.type}-${h.id}`} className="client-overview__event">
                  <div className="client-overview__event-marker">
                    <span className="client-overview__event-icon"><Icon /></span>
                    {i < Math.min(29, history.length - 1) && <span className="client-overview__event-line" />}
                  </div>
                  <div className="client-overview__event-body">
                    <p className="client-overview__event-title">{h.title}</p>
                    {h.detail && <span className="client-overview__event-detail truncate">{h.detail}</span>}
                    <span className="text-caption text-disabled">{timeAgo(h.happened_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

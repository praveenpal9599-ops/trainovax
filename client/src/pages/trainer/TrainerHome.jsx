import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@mui/material';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import SectionLabel from '../../features/mobile/SectionLabel';
import TasksWidget from '../../features/clients/TasksWidget';
import InviteCodeCard from '../../features/auth/InviteCodeCard';
import UserAvatar from '../../components/common/UserAvatar';
import ProgressRing from '../../components/common/ProgressRing';
import ErrorState from '../../components/common/ErrorState';
import BarChartView from '../../components/charts/BarChartView';
import TrendChart from '../../components/charts/TrendChart';
import useFetch from '../../hooks/useFetch';
import { dashboardService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { formatMonth, greeting, num, signed, timeAgo, todayISO, formatDate } from '../../utils/format';
import './TrainerHome.css';

const FEATURES = [
  { title: 'My Clients', text: 'Add, manage and view all clients', icon: PeopleAltRoundedIcon, to: '/trainer/clients', color: '#1565C0' },
  { title: 'Workout Plans', text: 'Build day-by-day training plans', icon: FitnessCenterRoundedIcon, to: '/trainer/workouts', color: '#EF6C00' },
  { title: 'Diet Plans', text: 'Meals with automatic macros', icon: RestaurantRoundedIcon, to: '/trainer/diets', color: '#2E7D32' },
  { title: 'Progress', text: 'Measurements, charts & photos', icon: InsightsRoundedIcon, to: '/trainer/progress', color: '#6A1B9A' },
  { title: 'Messages', text: 'Chat with your clients', icon: ChatRoundedIcon, to: '/trainer/messages', color: '#0277BD' },
  { title: 'Library', text: 'Exercises & foods', icon: MenuBookRoundedIcon, to: '/trainer/library', color: '#AD1457' },
];

/** Overview tile. `color` picks a value colour: primary | warning | info | secondary. */
function Stat({ value, label, color = 'primary', loading, onClick }) {
  return (
    <button type="button" onClick={onClick} className="card card--clickable trainer-home__stat">
      {loading ? <Skeleton width={40} height={40} /> : <p className={`trainer-home__stat-value trainer-home__stat-value--${color}`}>{value}</p>}
      <p className="trainer-home__stat-label">{label}</p>
    </button>
  );
}

/** Trainer app home: profile, overview, charts, shortcuts, attention list and tasks. Styles: TrainerHome.css */
export default function TrainerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch(() => dashboardService.admin(), []);
  const s = data?.stats || {};
  const day = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'narrow' });

  return (
    <div className="trainer-home">
      <section className="card trainer-home__hero">
        <span aria-hidden className="trainer-home__hero-circle" />
        <div className="trainer-home__hero-row">
          <UserAvatar name={user.name} src={user.avatar_url} size={56} className="trainer-home__hero-avatar" />
          <div className="flex-1">
            <p className="trainer-home__greeting">{greeting()},</p>
            <p className="trainer-home__name truncate">{user.name}</p>
            <span className="trainer-home__meta">{user.organization_name || 'Personal Trainer'} · {formatDate(todayISO(), { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
          <ProgressRing value={s.workout_completion_pct} size={64} color="inherit" sublabel="7-day" />
        </div>
      </section>

      <ErrorState error={error} onRetry={reload} />
      <div className="trainer-home__invite"><InviteCodeCard compact /></div>

      <SectionLabel>Overview</SectionLabel>
      <div className="grid grid--2 trainer-home__grid">
        <Stat loading={loading} value={s.total_clients ?? 0} label="Total clients" onClick={() => navigate('/trainer/clients')} />
        <Stat loading={loading} value={s.workout_plans ?? 0} label="Workout plans" color="warning" onClick={() => navigate('/trainer/workouts')} />
        <Stat loading={loading} value={s.diet_plans ?? 0} label="Diet plans" color="info" onClick={() => navigate('/trainer/diets')} />
        <Stat loading={loading} value={s.progress_updates ?? 0} label="Progress records (30d)" color="secondary" onClick={() => navigate('/trainer/progress')} />
      </div>

      <SectionLabel>This week</SectionLabel>
      <section className="card trainer-home__chart-card">
        <div className="trainer-home__chart-head">
          <h3 className="trainer-home__chart-title">Workout completion</h3>
          <span className="trainer-home__chart-note">last 7 days</span>
        </div>
        <div className="trainer-home__chart">
          {loading ? <Skeleton variant="rounded" height={170} /> : (
            <BarChartView data={data?.adherence || []} xKey="date" xFormatter={day} showLegend={false}
              series={[{ key: 'workout_completed', label: 'Completed', stackId: 'a', color: '#1565C0' }, { key: 'workout_skipped', label: 'Skipped', stackId: 'a', color: '#FFA726' }]} />
          )}
        </div>
        <div className="trainer-home__legend">
          <span className="trainer-home__legend-item"><span className="trainer-home__legend-dot trainer-home__legend-dot--completed" />Completed</span>
          <span className="trainer-home__legend-item"><span className="trainer-home__legend-dot trainer-home__legend-dot--skipped" />Skipped</span>
        </div>
      </section>
      {/* <section className="card trainer-home__chart-card">
        <div className="trainer-home__chart-head">
          <h3 className="trainer-home__chart-title">Clients' average weight change</h3>
          <span className="trainer-home__chart-note">6 months</span>
        </div>
        <div className="trainer-home__chart trainer-home__chart--short">
          {loading ? <Skeleton variant="rounded" height={160} /> : <TrendChart data={data?.weightTrend || []} xKey="month" xFormatter={formatMonth} series={[{ key: 'avg_change_kg', label: 'Avg change' }]} unit="kg" referenceY={0} />}
        </div>
      </section> */}

      <SectionLabel>Features</SectionLabel>
      <div className="grid grid--2 trainer-home__grid">
        {FEATURES.map((f) => (
          <button type="button" key={f.title} onClick={() => navigate(f.to)} className="card card--clickable trainer-home__feature">
            <span className="trainer-home__feature-icon" style={{ '--feature-color': f.color }}><f.icon /></span>
            <h3 className="trainer-home__feature-title">{f.title}</h3>
            <span className="trainer-home__feature-text">{f.text}</span>
          </button>
        ))}
      </div>

      {(data?.attention || []).length > 0 && (
        <>
          <SectionLabel>Needs attention</SectionLabel>
          <div className="card trainer-home__attention-list">
            {data.attention.map((c) => (
              <button type="button" key={c.id} onClick={() => navigate(`/trainer/clients/${c.id}?tab=progress`)} className="trainer-home__attention">
                <UserAvatar name={c.full_name} src={c.photo_url} size={38} />
                <div className="flex-1">
                  <p className="trainer-home__attention-name">{c.full_name}</p>
                  <span className="trainer-home__attention-note">{c.last_progress_date ? `No update since ${timeAgo(c.last_progress_date)}` : 'No measurements yet'}</span>
                </div>
                <WarningAmberRoundedIcon color="warning" fontSize="small" />
              </button>
            ))}
          </div>
        </>
      )}

      {/* <SectionLabel>Recent clients</SectionLabel>
      <div className="trainer-home__recent">
        {(data?.recentClients || []).map((c) => (
          <button type="button" key={c.id} onClick={() => navigate(`/trainer/clients/${c.id}`)} className="card card--clickable trainer-home__recent-card">
            <UserAvatar name={c.full_name} src={c.photo_url} size={48} className="trainer-home__recent-avatar" />
            <p className="trainer-home__recent-name truncate">{c.full_name.split(' ')[0]}</p>
            <span className="trainer-home__recent-weight">{num(c.current_weight_kg)} kg</span>
            <span className={`trainer-home__recent-change${(c.fitness_goal === 'muscle_gain' ? c.current_weight_kg > c.starting_weight_kg : c.current_weight_kg < c.starting_weight_kg) ? ' trainer-home__recent-change--good' : ''}`}>{signed(c.current_weight_kg - c.starting_weight_kg, 'kg')}</span>
          </button>
        ))}
        <button type="button" onClick={() => navigate('/trainer/clients')} className="card card--clickable trainer-home__recent-card trainer-home__recent-card--more">
          <span className="text-center"><ChevronRightRoundedIcon color="primary" /><span className="trainer-home__recent-more">View all</span></span>
        </button>
      </div> */}

      <div className="trainer-home__tasks"><TasksWidget tasks={data?.tasks || []} onChange={() => reload({ silent: true })} /></div>
    </div>
  );
}

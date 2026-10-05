import { useNavigate } from 'react-router-dom';
import { Button, Chip, LinearProgress, Skeleton } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import SectionCard from '../../components/common/SectionCard';
import ProgressRing from '../../components/common/ProgressRing';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import TrendChart from '../../components/charts/TrendChart';
import TrainerCard from '../../features/clients/TrainerCard';
import WaterTracker from '../../features/diet/WaterTracker';
import { notificationMeta } from '../../features/notifications/notificationMeta';
import useFetch from '../../hooks/useFetch';
import { portalService } from '../../services';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { useAuth } from '../../features/auth/AuthContext';
import { formatDate, formatShortDate, formatTime, greeting, num, signed, timeAgo, todayISO } from '../../utils/format';
import { bmiCategory } from '../../utils/format';
import './ClientDashboard.css';

function Tile({ label, value, sub, subTone }) {
  return (
    <div className="card client-home__tile">
      <span className="client-home__tile-label">{label}</span>
      <p className="client-home__tile-value">{value}</p>
      {sub && <span className={`client-home__tile-sub ${subTone ? `text-${subTone}` : 'text-muted'}`}>{sub}</span>}
    </div>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifyError } = useFeedback();
  const { data, loading, error, reload, setData } = useFetch(() => portalService.dashboard(), []);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  const w = data?.workout; const d = data?.diet; const c = data?.client; const st = c?.stats || {};
  const lossGoal = c?.fitness_goal !== 'muscle_gain';
  const changeGood = st.weight_change_kg != null && (lossGoal ? st.weight_change_kg <= 0 : st.weight_change_kg >= 0);

  const water = async (ml) => {
    setData((x) => ({ ...x, diet: { ...x.diet, water: { ...x.diet.water, amount_ml: ml } } }));
    try { await portalService.logWater({ log_date: todayISO(), amount_ml: ml }); } catch (e) { notifyError(e); }
  };

  return (
    <div className="client-home">
      {/* Hero */}
      <section className="card client-home__hero">
        <div aria-hidden className="client-home__hero-blob" />
        <div className="client-home__hero-row">
          <div className="client-home__hero-text">
            <p className="client-home__hero-date">{formatDate(todayISO(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="client-home__hero-greeting">{greeting()}, {user.name.split(' ')[0]}</h1>
            {loading ? <Skeleton width={200} className="client-home__hero-skeleton" /> : (
              <p className="client-home__hero-summary">
                {w?.day ? `Today: ${w.day.name}${w.day.focus ? ` · ${w.day.focus}` : ''} — ${w.exercises.length} exercises` : w?.plan ? 'Rest & recovery day — stretch, walk and hydrate.' : 'Your trainer is preparing your plan.'}
              </p>
            )}
            {w?.day && <Button variant="contained" onClick={() => navigate('/client/workout')} endIcon={<ArrowForwardIcon />} className="client-home__hero-cta">{w.completion?.done ? 'Continue workout' : 'Start workout'}</Button>}
          </div>
          {w?.completion && <ProgressRing value={w.completion.pct} size={96} tone="light" sublabel={`${w.completion.done}/${w.completion.total} done`} />}
        </div>
      </section>

      <div className="client-home__grid">
        {/* Today's workout */}
        <SectionCard title="Today's workout" subtitle={w?.plan?.name} action={<Button size="small" onClick={() => navigate('/client/workout')}>Open</Button>}>
          {loading ? <Skeleton height={160} /> : !w?.plan ? <EmptyState compact icon={FitnessCenterRoundedIcon} title="No workout plan yet" description="Your trainer will assign one soon." />
            : !w.day ? <EmptyState compact icon={SelfImprovementIcon} title="Rest day" description="Recovery is part of the plan. Light stretching or a walk is great." /> : (
              <div>
                <LinearProgress variant="determinate" value={w.completion?.pct || 0} className="client-home__workout-progress" />
                <ul className="client-home__exercises">
                  {w.exercises.slice(0, 6).map((e) => (
                    <li key={e.id} className="client-home__exercise">
                      {e.log?.status === 'completed' ? <CheckCircleRoundedIcon color="success" fontSize="small" /> : e.log?.status === 'skipped' ? <RemoveCircleOutlineIcon color="warning" fontSize="small" /> : <RadioButtonUncheckedIcon color="disabled" fontSize="small" />}
                      <span className={`client-home__exercise-name${e.log ? ' client-home__exercise-name--logged' : ''}${e.log?.status === 'completed' ? ' client-home__exercise-name--done' : ''}`}>{e.exercise_name}</span>
                      <span className="text-caption text-muted">{e.sets ? `${e.sets} × ${e.reps || `${e.duration_sec}s`}` : ''}</span>
                    </li>
                  ))}
                </ul>
                {w.exercises.length > 6 && <span className="text-caption text-muted">+{w.exercises.length - 6} more</span>}
              </div>
            )}
        </SectionCard>

        {/* Today's diet */}
        <SectionCard title="Today's diet" subtitle={d?.plan?.name} action={<Button size="small" onClick={() => navigate('/client/diet')}>Open</Button>}>
          {loading ? <Skeleton height={160} /> : !d?.plan ? <EmptyState compact icon={RestaurantRoundedIcon} title="No diet plan yet" /> : (
            <div>
              <div className="client-home__diet-summary">
                <ProgressRing value={(100 * d.consumed.calories) / (d.totals.calories || 1)} size={72} thickness={6} color="success" />
                <div className="flex-1">
                  <p className="client-home__kcal">{num(d.consumed.calories, 0)} <span className="client-home__kcal-target">/ {num(d.totals.calories, 0)} kcal</span></p>
                  <p className="text-caption text-muted">Protein {num(d.consumed.protein_g, 0)}/{num(d.totals.protein_g, 0)}g · Carbs {num(d.consumed.carbs_g, 0)}/{num(d.totals.carbs_g, 0)}g · Fat {num(d.consumed.fat_g, 0)}/{num(d.totals.fat_g, 0)}g</p>
                </div>
              </div>
              <div className="row row--wrap client-home__meals">
                {d.meals.map((m) => <Chip key={m.id} size="small" icon={m.log?.status === 'completed' ? <CheckCircleRoundedIcon /> : undefined} color={m.log?.status === 'completed' ? 'success' : 'default'} variant={m.log ? 'filled' : 'outlined'} label={`${m.name}${m.meal_time ? ` · ${formatTime(m.meal_time)}` : ''}`} />)}
              </div>
              <WaterTracker amount={d.water.amount_ml} target={d.water.target_ml} onChange={water} />
            </div>
          )}
        </SectionCard>

        {/* Body stats */}
        <div className="client-home__tiles">
          <Tile label="Current weight" value={loading ? '…' : `${num(st.current_weight_kg)} kg`} sub={st.target_weight_kg ? `Target ${num(st.target_weight_kg)} kg` : undefined} />
          <Tile label="Weight change" value={loading ? '…' : signed(st.weight_change_kg, 'kg')} sub={st.weight_change_kg != null ? (changeGood ? 'On track' : 'Keep going') : undefined} subTone={changeGood ? 'success' : 'warning'} />
          <Tile label="Body fat" value={loading ? '…' : st.body_fat_pct != null ? `${num(st.body_fat_pct)}%` : '—'} sub={st.starting_body_fat_pct != null && st.body_fat_pct != null ? `${signed(st.body_fat_pct - st.starting_body_fat_pct, '%')} since start` : undefined} />
          <Tile label="BMI" value={loading ? '…' : num(st.bmi)} sub={bmiCategory(st.bmi).label} />
        </div>

        {/* Weekly consistency */}
        <SectionCard title="This week" subtitle="Workout completion and diet progress">
          <div className="client-home__week">
            <div className="client-home__week-ring"><ProgressRing value={data?.weekSummary?.workout_completion_pct} size={80} /><span className="text-caption text-muted">Workouts</span></div>
            <div className="client-home__week-ring"><ProgressRing value={data?.weekSummary?.diet_adherence_pct} size={80} color="success" /><span className="text-caption text-muted">Diet</span></div>
            <div className="client-home__week-bars">
              {(data?.week || []).map((dd) => (
                <div key={dd.date} className="client-home__week-day">
                  <div className="client-home__week-track">
                    <div className={`client-home__week-fill${dd.workout_scheduled ? ' client-home__week-fill--scheduled' : ''}`} style={{ '--bar-pct': `${dd.workout_pct ?? 0}%` }} />
                  </div>
                  <span className="client-home__week-label">{new Date(`${dd.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'narrow' })}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Upcoming workout */}
        <SectionCard title="Upcoming workout">
          {data?.upcoming ? (
            <div className="client-home__upcoming">
              <div className="client-home__upcoming-date">
                <div><span className="client-home__upcoming-weekday">{new Date(`${data.upcoming.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</span><span className="client-home__upcoming-day">{Number(data.upcoming.date.slice(8))}</span></div>
              </div>
              <div className="client-home__upcoming-text">
                <p className="client-home__upcoming-title">{data.upcoming.day.name}{data.upcoming.day.focus ? ` · ${data.upcoming.day.focus}` : ''}</p>
                <p className="text-caption text-muted">{data.upcoming.exercise_count} exercises · {data.upcoming.exercises.join(', ')}</p>
              </div>
            </div>
          ) : <EmptyState compact icon={EventOutlinedIcon} title="Nothing scheduled" />}
        </SectionCard>

        {/* Weight trend */}
        <SectionCard title="Weight trend" action={<Button size="small" onClick={() => navigate('/client/progress')}>My progress</Button>}>
          <div className="client-home__trend">
            {(data?.weightTrend || []).length ? <TrendChart data={data.weightTrend.map((r) => ({ ...r, date: r.record_date }))} series={[{ key: 'weight_kg', label: 'Weight' }]} unit="kg" xFormatter={formatShortDate} /> : <EmptyState compact title="No measurements yet" />}
          </div>
        </SectionCard>

        <TrainerCard trainer={c?.trainer} />

        {/* Notifications */}
        <SectionCard title="Notifications" subtitle={data?.unreadNotifications ? `${data.unreadNotifications} unread` : 'All caught up'} action={<Button size="small" onClick={() => navigate('/client/notifications')}>View all</Button>}>
          {(data?.notifications || []).length === 0 ? <EmptyState compact title="No notifications" /> : (data.notifications.map((n) => {
            const meta = notificationMeta(n.type);
            return (
              <div key={n.id} className={`client-home__notif${n.link ? ' client-home__notif--link' : ''}`} onClick={() => n.link && navigate(n.link)}>
                <meta.icon color={meta.color} fontSize="small" />
                <span className={`client-home__notif-title${n.read_at ? '' : ' client-home__notif-title--unread'}`}>{n.title}</span>
                <span className="text-caption text-muted">{timeAgo(n.created_at)}</span>
              </div>
            );
          }))}
        </SectionCard>
      </div>
    </div>
  );
}

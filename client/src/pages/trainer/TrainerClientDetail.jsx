import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, ButtonBase, Chip, IconButton, Tab, Tabs } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StraightenOutlinedIcon from '@mui/icons-material/StraightenOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import MobilePageHeader from '../../features/mobile/MobilePageHeader';
import UserAvatar from '../../components/common/UserAvatar';
import StatusChip from '../../components/common/StatusChip';
import LoadingScreen from '../../components/common/LoadingScreen';
import useFetch from '../../hooks/useFetch';
import { clientService } from '../../services';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import ClientFormDialog from '../../features/clients/ClientFormDialog';
import SendReminderDialog from '../../features/clients/SendReminderDialog';
import MeasurementDialog from '../../features/progress/MeasurementDialog';
import ProgressDashboard from '../../features/progress/ProgressDashboard';
import PhotoGallery from '../../features/progress/PhotoGallery';
import OverviewTab from '../../features/clients/profile/OverviewTab';
import { PersonalTab, FitnessTab } from '../../features/clients/profile/InfoTabs';
import PlansTab from '../../features/clients/profile/PlansTab';
import AttendanceTab from '../../features/clients/profile/AttendanceTab';
import NotesTab from '../../features/clients/profile/NotesTab';
import { GOALS, labelOf } from '../../utils/constants';
import { bmiCategory, num, signed } from '../../utils/format';
import './TrainerClientDetail.css';

const TABS = [['overview', 'Overview'], ['workout', 'Workout'], ['diet', 'Diet'], ['progress', 'Progress'], ['photos', 'Photos'], ['attendance', 'Attendance'], ['notes', 'Notes'], ['info', 'Info']];

/** Small stat tile. `tone` colours the sub-text: success | warning (default muted). */
function Tile({ label, value, sub, tone }) {
  return (
    <div className="card trainer-client-detail__tile">
      <span className="trainer-client-detail__tile-label">{label}</span>
      <p className="trainer-client-detail__tile-value">{value}</p>
      {sub && <span className={`trainer-client-detail__tile-sub${tone ? ` trainer-client-detail__tile-sub--${tone}` : ''}`}>{sub}</span>}
    </div>
  );
}

/** Trainer app: client profile with quick actions and tabbed details. Styles: TrainerClientDetail.css */
export default function TrainerClientDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'overview';
  const navigate = useNavigate();
  const { notify, notifyError } = useFeedback();
  const { data: c, loading, error, reload, setData } = useFetch(() => clientService.get(id), [id]);
  const [edit, setEdit] = useState(false);
  const [measure, setMeasure] = useState(false);
  const [remind, setRemind] = useState(false);

  if (loading && !c) return <LoadingScreen />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!c) return null;
  const s = c.stats;
  const lossGoal = c.fitness_goal !== 'muscle_gain';
  const good = s.weight_change_kg != null && (lossGoal ? s.weight_change_kg <= 0 : s.weight_change_kg >= 0);
  const uploadPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { await clientService.uploadPhoto(c.id, f); notify('Photo updated'); reload({ silent: true }); } catch (err) { notifyError(err); }
  };
  const actions = [
    [StraightenOutlinedIcon, 'Measure', () => setMeasure(true)],
    [FitnessCenterOutlinedIcon, 'Workout', () => setParams({ tab: 'workout' })],
    [RestaurantMenuOutlinedIcon, 'Diet', () => setParams({ tab: 'diet' })],
    [ChatBubbleOutlineIcon, 'Message', () => (c.user_id ? navigate(`/trainer/messages?with=${c.user_id}`) : notify('This client has no app login yet', 'info'))],
    [NotificationsActiveOutlinedIcon, 'Remind', () => setRemind(true)],
  ];

  return (
    <div className="trainer-client-detail">
      <MobilePageHeader title="" back="/trainer/clients" />
      <section className="card trainer-client-detail__profile">
        <div className="trainer-client-detail__head">
          <div className="trainer-client-detail__photo">
            <UserAvatar name={c.full_name} src={c.photo_url} size={68} />
            <IconButton component="label" size="small" aria-label="Change photo" className="trainer-client-detail__photo-btn">
              <PhotoCameraOutlinedIcon className="trainer-client-detail__photo-icon" /><input hidden type="file" accept="image/*" onChange={uploadPhoto} />
            </IconButton>
          </div>
          <div className="flex-1">
            <p className="trainer-client-detail__name">{c.full_name}</p>
            <p className="trainer-client-detail__sub">{[c.age && `${c.age}y`, c.gender, c.height_cm && `${num(c.height_cm, 0)} cm`].filter(Boolean).join(' • ')}</p>
            <div className="trainer-client-detail__chips"><StatusChip status={c.status} /><Chip size="small" color="primary" variant="outlined" label={labelOf(GOALS, c.fitness_goal)} /></div>
          </div>
          <IconButton onClick={() => setEdit(true)} aria-label="Edit client"><EditOutlinedIcon /></IconButton>
        </div>
        <div className="trainer-client-detail__actions">
          {actions.map(([Icon, label, fn]) => (
            <ButtonBase key={label} onClick={fn} className="trainer-client-detail__action">
              <span className="trainer-client-detail__action-icon"><Icon fontSize="small" /></span>
              <span className="trainer-client-detail__action-label">{label}</span>
            </ButtonBase>
          ))}
        </div>
      </section>

      <div className="grid grid--3 trainer-client-detail__tiles">
        <Tile label="Current" value={`${num(s.current_weight_kg)} kg`} />
        <Tile label="Starting" value={`${num(s.starting_weight_kg)} kg`} />
        <Tile label="Change" value={signed(s.weight_change_kg, 'kg')} sub={s.weight_change_kg != null ? (good ? 'On track' : 'Watch') : ''} tone={good ? 'success' : 'warning'} />
        <Tile label="BMI" value={num(s.bmi)} sub={bmiCategory(s.bmi).label} />
        <Tile label="Body fat" value={s.body_fat_pct != null ? `${num(s.body_fat_pct)}%` : '—'} />
        <Tile label="Target" value={s.target_weight_kg ? `${num(s.target_weight_kg)} kg` : '—'} />
      </div>

      <Tabs value={tab} onChange={(_, v) => setParams({ tab: v }, { replace: true })} variant="scrollable" scrollButtons={false} className="trainer-client-detail__tabs">
        {TABS.map(([k, l]) => <Tab key={k} value={k} label={l} className="trainer-client-detail__tab" />)}
      </Tabs>

      {tab === 'overview' && <OverviewTab client={c} basePath="/trainer" onTab={(t) => setParams({ tab: t === 'measurements' ? 'progress' : t })} />}
      {tab === 'workout' && <PlansTab client={c} kind="workout" basePath="/trainer" />}
      {tab === 'diet' && <PlansTab client={c} kind="diet" basePath="/trainer" />}
      {tab === 'progress' && <ProgressDashboard key={`${c.counts.progress_records}-${s.current_weight_kg}`} clientId={c.id} heightCm={c.height_cm} goal={c.fitness_goal} onChanged={() => reload({ silent: true })} />}
      {tab === 'photos' && <PhotoGallery clientId={c.id} />}
      {tab === 'attendance' && <AttendanceTab client={c} />}
      {tab === 'notes' && <NotesTab client={c} />}
      {tab === 'info' && <div className="stack"><PersonalTab client={c} /><FitnessTab client={c} /></div>}

      <ClientFormDialog open={edit} client={c} onClose={() => setEdit(false)} onSaved={(x) => { setEdit(false); setData(x); }} />
      <MeasurementDialog open={measure} clientId={c.id} heightCm={c.height_cm} onClose={() => setMeasure(false)} onSaved={() => { setMeasure(false); reload({ silent: true }); }} />
      <SendReminderDialog open={remind} clientIds={[c.id]} names={c.full_name} onClose={() => setRemind(false)} />
    </div>
  );
}

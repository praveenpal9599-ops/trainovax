import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Button, Chip, IconButton, ListItemIcon, Menu, MenuItem, Tab, Tabs, Tooltip } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StraightenOutlinedIcon from '@mui/icons-material/StraightenOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import MonitorWeightOutlinedIcon from '@mui/icons-material/MonitorWeightOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StartOutlinedIcon from '@mui/icons-material/StartOutlined';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusChip from '../../components/common/StatusChip';
import UserAvatar from '../../components/common/UserAvatar';
import LoadingScreen from '../../components/common/LoadingScreen';
import EmptyState from '../../components/common/EmptyState';
import useFetch from '../../hooks/useFetch';
import { clientService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import ClientFormDialog from '../../features/clients/ClientFormDialog';
import SendReminderDialog from '../../features/clients/SendReminderDialog';
import MeasurementDialog from '../../features/progress/MeasurementDialog';
import ProgressDashboard from '../../features/progress/ProgressDashboard';
import PhotoGallery from '../../features/progress/PhotoGallery';
import ChatThread from '../../features/messaging/ChatThread';
import OverviewTab from '../../features/clients/profile/OverviewTab';
import { PersonalTab, FitnessTab } from '../../features/clients/profile/InfoTabs';
import PlansTab from '../../features/clients/profile/PlansTab';
import AttendanceTab from '../../features/clients/profile/AttendanceTab';
import NotesTab from '../../features/clients/profile/NotesTab';
import { GOALS, labelOf } from '../../utils/constants';
import { bmiCategory, formatDate, num, signed } from '../../utils/format';
import './ClientProfilePage.css';

const TABS = [
  ['overview', 'Overview'], ['personal', 'Personal Information'], ['fitness', 'Fitness Information'], ['workout', 'Workout'], ['diet', 'Diet'],
  ['progress', 'Progress'], ['measurements', 'Measurements'], ['photos', 'Progress Photos'], ['attendance', 'Attendance'], ['notes', 'Notes'], ['messages', 'Messages'],
];

export default function ClientProfilePage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'overview';
  const setTab = (t) => setParams({ tab: t }, { replace: true });
  const navigate = useNavigate();
  const { user, basePath } = useAuth();
  const { confirm, notify, notifyError } = useFeedback();
  const { data: client, loading, error, reload, setData } = useFetch(() => clientService.get(id), [id]);
  const [edit, setEdit] = useState(false);
  const [measure, setMeasure] = useState(false);
  const [remind, setRemind] = useState(false);
  const [menu, setMenu] = useState(null);

  if (loading && !client) return <LoadingScreen />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!client) return null;

  const s = client.stats;
  const goalLossy = client.fitness_goal !== 'muscle_gain';
  const bmiCat = bmiCategory(s.bmi);
  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { await clientService.uploadPhoto(client.id, file); notify('Photo updated'); reload({ silent: true }); } catch (err) { notifyError(err); }
  };
  const toggleStatus = async () => {
    setMenu(null);
    const next = client.status === 'active' ? 'inactive' : 'active';
    try { setData(await clientService.setStatus(client.id, next)); notify(`Client ${next === 'active' ? 'activated' : 'deactivated'}`); } catch (e) { notifyError(e); }
  };
  const remove = async () => {
    setMenu(null);
    if (!(await confirm({ title: `Delete ${client.full_name}?`, message: 'The client and their login will be removed.', confirmText: 'Delete client', danger: true }))) return;
    try { await clientService.remove(client.id); notify('Client deleted'); navigate(`${basePath}/clients`); } catch (e) { notifyError(e); }
  };

  return (
    <>
      <PageHeader title="" breadcrumbs={[{ label: 'Clients', to: `${basePath}/clients` }, { label: client.full_name }]} />
      <section className="card client-profile__hero">
        <div className="client-profile__avatar">
          <UserAvatar name={client.full_name} src={client.photo_url} size={84} />
          <Tooltip title="Change photo">
            <IconButton component="label" size="small" className="client-profile__photo-btn" aria-label="Upload profile photo">
              <PhotoCameraOutlinedIcon /><input hidden type="file" accept="image/*" onChange={uploadPhoto} />
            </IconButton>
          </Tooltip>
        </div>
        <div className="client-profile__info">
          <div className="client-profile__title-row">
            <h1 className="client-profile__name">{client.full_name}</h1>
            <StatusChip status={client.status} />
            <Chip size="small" icon={<FlagOutlinedIcon />} label={labelOf(GOALS, client.fitness_goal)} color="primary" variant="outlined" />
          </div>
          <p className="client-profile__meta">
            {[client.age && `${client.age} yrs`, client.gender && client.gender[0].toUpperCase() + client.gender.slice(1), client.height_cm && `${num(client.height_cm, 0)} cm`, client.phone, client.email].filter(Boolean).join(' · ')}
          </p>
          <span className="client-profile__since">Client since {formatDate(client.joined_on)} · Trainer: {client.trainer_name || 'Unassigned'}{user.role === 'super_admin' && client.organization_name ? ` · ${client.organization_name}` : ''}</span>
        </div>
        <div className="client-profile__actions">
          <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setEdit(true)}>Edit</Button>
          {client.user_id && user.role === 'admin' && <Button variant="outlined" startIcon={<ChatBubbleOutlineIcon />} onClick={() => setTab('messages')}>Message</Button>}
          <Button variant="contained" startIcon={<StraightenOutlinedIcon />} onClick={() => setMeasure(true)}>Add measurement</Button>
          <IconButton onClick={(e) => setMenu(e.currentTarget)} aria-label="More actions"><MoreVertIcon /></IconButton>
        </div>
      </section>
      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => { setMenu(null); setRemind(true); }}><ListItemIcon><NotificationsActiveOutlinedIcon fontSize="small" /></ListItemIcon>Send reminder</MenuItem>
        <MenuItem onClick={toggleStatus}><ListItemIcon>{client.status === 'active' ? <ToggleOffOutlinedIcon fontSize="small" /> : <ToggleOnOutlinedIcon fontSize="small" />}</ListItemIcon>{client.status === 'active' ? 'Deactivate' : 'Activate'}</MenuItem>
        <MenuItem onClick={remove} className="menu-item--error"><ListItemIcon><DeleteOutlineIcon fontSize="small" /></ListItemIcon>Delete client</MenuItem>
      </Menu>

      <div className="client-profile__stats">
        <StatCard icon={MonitorWeightOutlinedIcon} label="Current weight" value={`${num(s.current_weight_kg)} kg`} />
        <StatCard icon={StartOutlinedIcon} label="Starting weight" value={`${num(s.starting_weight_kg)} kg`} color="secondary" />
        <StatCard icon={TrendingDownIcon} label="Weight difference" value={signed(s.weight_change_kg, 'kg')} color={s.weight_change_kg == null ? 'primary' : (goalLossy ? s.weight_change_kg <= 0 : s.weight_change_kg >= 0) ? 'success' : 'warning'} />
        <StatCard icon={SpeedOutlinedIcon} label="BMI" value={num(s.bmi)} hint={bmiCat.label} color={bmiCat.color === 'default' ? 'primary' : bmiCat.color} />
        <StatCard icon={WaterDropOutlinedIcon} label="Body fat" value={s.body_fat_pct != null ? `${num(s.body_fat_pct)}%` : '—'} hint={s.starting_body_fat_pct != null && s.body_fat_pct != null ? `${signed(s.body_fat_pct - s.starting_body_fat_pct, '%')} since start` : undefined} color="info" />
        <StatCard icon={FlagOutlinedIcon} label="Target weight" value={s.target_weight_kg ? `${num(s.target_weight_kg)} kg` : '—'} hint={s.target_weight_kg && s.current_weight_kg ? `${num(Math.abs(s.current_weight_kg - s.target_weight_kg))} kg to go` : labelOf(GOALS, client.fitness_goal)} color="secondary" />
      </div>

      <div className="client-profile__tabs">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Client profile sections">
          {TABS.map(([k, l]) => <Tab key={k} value={k} label={l} />)}
        </Tabs>
      </div>

      {tab === 'overview' && <OverviewTab client={client} basePath={basePath} onTab={setTab} />}
      {tab === 'personal' && <PersonalTab client={client} />}
      {tab === 'fitness' && <FitnessTab client={client} />}
      {tab === 'workout' && <PlansTab client={client} kind="workout" basePath={basePath} />}
      {tab === 'diet' && <PlansTab client={client} kind="diet" basePath={basePath} />}
      {tab === 'progress' && <ProgressDashboard key={`${tab}-${client.counts.progress_records}-${client.stats.current_weight_kg}`} clientId={client.id} heightCm={client.height_cm} goal={client.fitness_goal} showTable={false} onChanged={() => reload({ silent: true })} />}
      {tab === 'measurements' && <ProgressDashboard key={`${tab}-${client.counts.progress_records}-${client.stats.current_weight_kg}`} clientId={client.id} heightCm={client.height_cm} goal={client.fitness_goal} onChanged={() => reload({ silent: true })} />}
      {tab === 'photos' && <PhotoGallery clientId={client.id} />}
      {tab === 'attendance' && <AttendanceTab client={client} />}
      {tab === 'notes' && <NotesTab client={client} />}
      {tab === 'messages' && (
        client.user_id && user.role === 'admin'
          ? <div className="card client-profile__chat"><ChatThread contactId={client.user_id} /></div>
          : <div className="card"><EmptyState icon={ChatBubbleOutlineIcon} title={client.user_id ? 'Messaging is between the client and their trainer' : 'This client has no app login'} description={client.user_id ? 'Only the assigned trainer can chat with this client.' : 'Edit the client and enable "Create client login" to start messaging.'} /></div>
      )}

      <ClientFormDialog open={edit} client={client} onClose={() => setEdit(false)} onSaved={(c) => { setEdit(false); setData(c); }} />
      <MeasurementDialog open={measure} clientId={client.id} heightCm={client.height_cm} onClose={() => setMeasure(false)} onSaved={() => { setMeasure(false); reload({ silent: true }); }} />
      <SendReminderDialog open={remind} clientIds={[client.id]} names={client.full_name} onClose={() => setRemind(false)} />
    </>
  );
}

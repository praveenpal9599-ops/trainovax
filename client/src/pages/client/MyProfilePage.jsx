import { useEffect, useState } from 'react';
import { Button, TextField } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SectionCard from '../../components/common/SectionCard';
import InfoRow from '../../components/common/InfoRow';
import LoadingScreen from '../../components/common/LoadingScreen';
import LoadingButton from '../../components/common/LoadingButton';
import UserAvatar from '../../components/common/UserAvatar';
import StatusChip from '../../components/common/StatusChip';
import FormDialog from '../../components/common/FormDialog';
import TrainerCard from '../../features/clients/TrainerCard';
import useFetch from '../../hooks/useFetch';
import { authService, portalService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { ACTIVITY_LEVELS, DIET_PREFS, DIFFICULTIES, GENDERS, GOALS, labelOf } from '../../utils/constants';
import { formatDate, num } from '../../utils/format';
import './client-pages.css';
import './MyProfilePage.css';

const EDITABLE = [['phone', 'Phone'], ['address', 'Address'], ['occupation', 'Occupation'], ['emergency_contact_name', 'Emergency contact'], ['emergency_contact_phone', 'Emergency phone'], ['allergies', 'Food allergies'], ['injuries', 'Injuries / limitations'], ['sleep_hours', 'Sleep (hrs)'], ['water_goal_ml', 'Water goal (ml)']];

export default function MyProfilePage() {
  const { setUser } = useAuth();
  const { notify, notifyError } = useFeedback();
  const { data: c, loading, setData } = useFetch(() => portalService.profile(), []);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (c) setForm(Object.fromEntries(EDITABLE.map(([k]) => [k, (k === 'phone' ? c.phone : c.profile?.[k]) ?? '']))); }, [c, edit]);
  if (loading || !c) return <LoadingScreen />;
  const p = c.profile || {};
  const save = async () => {
    setBusy(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : ['sleep_hours', 'water_goal_ml'].includes(k) ? Number(v) : v]));
      setData(await portalService.updateProfile(payload)); notify('Profile updated'); setEdit(false);
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  const avatar = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setUser(await authService.uploadAvatar(f)); setData({ ...c, photo_url: URL.createObjectURL(f) }); notify('Photo updated'); } catch (err) { notifyError(err); } };

  return (
    <div className="my-profile">
      <section className="card my-profile__hero">
        <label className="my-profile__avatar" title="Change photo">
          <UserAvatar name={c.full_name} src={c.photo_url} size={80} />
          <input hidden type="file" accept="image/*" onChange={avatar} />
        </label>
        <div className="flex-1">
          <div className="row"><h1 className="client-page__title">{c.full_name}</h1><StatusChip status={c.status} /></div>
          <p className="my-profile__meta">{labelOf(GOALS, c.fitness_goal)} · Member since {formatDate(c.joined_on)}</p>
        </div>
        <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setEdit(true)}>Edit details</Button>
      </section>
      <div className="my-profile__cards">
        <SectionCard title="Personal information">
          <InfoRow label="Email" value={c.email} /><InfoRow label="Phone" value={c.phone} />
          <InfoRow label="Age / gender" value={`${c.age ?? '—'} · ${labelOf(GENDERS, c.gender)}`} /><InfoRow label="Occupation" value={p.occupation} />
          <InfoRow label="Address" value={p.address} /><InfoRow label="Emergency contact" value={p.emergency_contact_name ? `${p.emergency_contact_name} · ${p.emergency_contact_phone || ''}` : null} />
        </SectionCard>
        <SectionCard title="Fitness information">
          <InfoRow label="Height" value={c.height_cm ? `${num(c.height_cm, 0)} cm` : null} />
          <InfoRow label="Starting → current weight" value={`${num(c.stats.starting_weight_kg)} → ${num(c.stats.current_weight_kg)} kg`} />
          <InfoRow label="Target weight" value={p.target_weight_kg ? `${num(p.target_weight_kg)} kg` : null} />
          <InfoRow label="Experience / activity" value={`${labelOf(DIFFICULTIES, p.experience_level)} · ${labelOf(ACTIVITY_LEVELS, p.activity_level)}`} />
          <InfoRow label="Diet preference" value={labelOf(DIET_PREFS, p.dietary_preference)} />
          <InfoRow label="Allergies / injuries" value={[p.allergies, p.injuries].filter(Boolean).join(' · ') || 'None reported'} />
        </SectionCard>
        <TrainerCard trainer={c.trainer} />
      </div>
      <FormDialog open={edit} onClose={() => setEdit(false)} title="Edit my details" onSubmit={save} loading={busy}>
        <div className="form-grid form-grid--2">
          {EDITABLE.map(([k, label]) => (
            <div key={k} className={['address', 'injuries'].includes(k) ? 'span-full' : undefined}>
              <TextField label={label} value={form[k] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} type={['sleep_hours', 'water_goal_ml'].includes(k) ? 'number' : 'text'} />
            </div>
          ))}
        </div>
        <p className="text-caption text-muted my-profile__form-note">Goals, height and plan details are managed by your trainer.</p>
      </FormDialog>
    </div>
  );
}

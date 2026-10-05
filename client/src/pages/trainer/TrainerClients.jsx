import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, IconButton, InputAdornment, ListItemIcon, Menu, MenuItem, Skeleton, TextField } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import StraightenOutlinedIcon from '@mui/icons-material/StraightenOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import MobilePageHeader from '../../features/mobile/MobilePageHeader';
import UserAvatar from '../../components/common/UserAvatar';
import StatusChip from '../../components/common/StatusChip';
import EmptyState from '../../components/common/EmptyState';
import ClientFormDialog from '../../features/clients/ClientFormDialog';
import MeasurementDialog from '../../features/progress/MeasurementDialog';
import SendReminderDialog from '../../features/clients/SendReminderDialog';
import usePagedList from '../../hooks/usePagedList';
import { clientService } from '../../services';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { GENDERS, GOALS, labelOf } from '../../utils/constants';
import { daysSince, num, signed, timeAgo } from '../../utils/format';
import '../../features/mobile/mobile.css';
import './TrainerClients.css';

/** Trainer app: client list as cards with quick actions. Styles: TrainerClients.css */
export default function TrainerClients() {
  const navigate = useNavigate();
  const { confirm, notify, notifyError } = useFeedback();
  const list = usePagedList(useCallback((p) => clientService.list(p), []), { pageSize: 50, sortBy: 'name', sortDir: 'asc', filters: { status: '' } });
  const [form, setForm] = useState({ open: false, client: null });
  const [menu, setMenu] = useState(null);
  const [measure, setMeasure] = useState(null);
  const [remind, setRemind] = useState(null);

  const edit = async (c) => { try { setForm({ open: true, client: await clientService.get(c.id) }); } catch (e) { notifyError(e); } };
  const remove = async (c) => {
    if (!(await confirm({ title: `Delete ${c.full_name}?`, message: 'The client and their app login will be removed.', confirmText: 'Delete', danger: true }))) return;
    try { await clientService.remove(c.id); notify('Client deleted'); list.reload({ silent: true }); } catch (e) { notifyError(e); }
  };
  const toggle = async (c) => {
    try { await clientService.setStatus(c.id, c.status === 'active' ? 'inactive' : 'active'); notify('Status updated'); list.reload({ silent: true }); } catch (e) { notifyError(e); }
  };

  return (
    <div className="trainer-clients">
      <MobilePageHeader title="My Clients" subtitle={`${list.total} client${list.total === 1 ? '' : 's'}`} back="/trainer/dashboard" />
      <Button fullWidth size="large" variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setForm({ open: true, client: null })} className="trainer-clients__add">Add new client</Button>
      <TextField value={list.search} onChange={(e) => list.setSearch(e.target.value)} placeholder="Search clients…" inputProps={{ 'aria-label': 'Search clients' }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }} className="mobile-search" />
      <div className="mobile-filter-row">
        {[['', 'All'], ['active', 'Active'], ['inactive', 'Inactive']].map(([v, l]) => (
          <Chip key={l} label={l} onClick={() => list.setFilter('status', v)} color={list.filters.status === v ? 'primary' : 'default'} variant={list.filters.status === v ? 'filled' : 'outlined'} />
        ))}
        {GOALS.map((g) => (
          <Chip key={g.value} label={g.label} onClick={() => list.setFilter('goal', list.filters.goal === g.value ? '' : g.value)} color={list.filters.goal === g.value ? 'primary' : 'default'} variant={list.filters.goal === g.value ? 'filled' : 'outlined'} />
        ))}
      </div>

      {list.loading && [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={150} className="trainer-clients__skeleton" />)}
      {!list.loading && list.rows.length === 0 && (
        <div className="card"><EmptyState icon={PeopleAltOutlinedIcon} title={list.search ? 'No clients match your search' : 'No clients yet'} description="Add your first client to start building plans." /></div>
      )}
      <div className="trainer-clients__list">
        {!list.loading && list.rows.map((c) => {
          const change = c.current_weight_kg != null && c.starting_weight_kg != null ? c.current_weight_kg - c.starting_weight_kg : null;
          const good = change != null && (c.fitness_goal === 'muscle_gain' ? change > 0 : change < 0);
          const stale = daysSince(c.last_progress_date);
          return (
            <div key={c.id} className="card card--padded-sm">
              <div className="trainer-clients__head" onClick={() => navigate(`/trainer/clients/${c.id}`)}>
                <UserAvatar name={c.full_name} src={c.photo_url} size={48} />
                <div className="flex-1">
                  <div className="trainer-clients__name-row"><h3 className="trainer-clients__name truncate">{c.full_name}</h3>{c.status !== 'active' && <StatusChip status={c.status} />}</div>
                  <p className="trainer-clients__sub truncate">{[c.age && `${c.age}y`, c.gender && labelOf(GENDERS, c.gender), `Goal: ${labelOf(GOALS, c.fitness_goal)}`].filter(Boolean).join(' • ')}</p>
                </div>
                <IconButton onClick={(e) => { e.stopPropagation(); setMenu({ anchor: e.currentTarget, c }); }} aria-label="More actions"><MoreVertIcon /></IconButton>
              </div>
              <div className="trainer-clients__chips">
                <Chip size="small" label={`${num(c.current_weight_kg)} kg`} />
                {change != null && change !== 0 && <Chip size="small" label={signed(change, 'kg')} color={good ? 'success' : 'default'} variant="outlined" />}
                <Chip size="small" variant="outlined" color={stale === null || stale > 14 ? 'warning' : 'default'} label={c.last_progress_date ? `Updated ${timeAgo(c.last_progress_date)}` : 'No measurements'} />
              </div>
              <div className="trainer-clients__actions">
                <Button size="small" variant="outlined" color="inherit" className="trainer-clients__btn trainer-clients__btn--neutral" onClick={() => navigate(`/trainer/clients/${c.id}`)}>View</Button>
                <Button size="small" variant="outlined" color="inherit" className="trainer-clients__btn trainer-clients__btn--neutral" onClick={() => edit(c)}>Edit</Button>
                <Button size="small" variant="outlined" color="error" className="trainer-clients__btn" onClick={() => remove(c)}>Delete</Button>
              </div>
            </div>
          );
        })}
      </div>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {menu && [
          [FitnessCenterOutlinedIcon, 'Assign workout', () => navigate(`/trainer/workouts/new?clientId=${menu.c.id}`)],
          [RestaurantMenuOutlinedIcon, 'Assign diet', () => navigate(`/trainer/diets/new?clientId=${menu.c.id}`)],
          [StraightenOutlinedIcon, 'Add measurement', () => setMeasure(menu.c)],
          [NotificationsActiveOutlinedIcon, 'Send reminder', () => setRemind(menu.c)],
          [menu.c.status === 'active' ? ToggleOffOutlinedIcon : ToggleOnOutlinedIcon, menu.c.status === 'active' ? 'Deactivate' : 'Activate', () => toggle(menu.c)],
        ].map(([Icon, label, fn]) => <MenuItem key={label} onClick={() => { setMenu(null); fn(); }}><ListItemIcon><Icon fontSize="small" /></ListItemIcon>{label}</MenuItem>)}
      </Menu>

      <ClientFormDialog open={form.open} client={form.client} onClose={() => setForm({ open: false, client: null })}
        onSaved={(c) => { const isNew = !form.client; setForm({ open: false, client: null }); list.reload({ silent: true }); if (isNew) navigate(`/trainer/clients/${c.id}`); }} />
      <MeasurementDialog open={!!measure} clientId={measure?.id} heightCm={measure?.height_cm} onClose={() => setMeasure(null)} onSaved={() => { setMeasure(null); list.reload({ silent: true }); }} />
      <SendReminderDialog open={!!remind} clientIds={remind ? [remind.id] : []} names={remind?.full_name} onClose={() => setRemind(null)} />
    </div>
  );
}

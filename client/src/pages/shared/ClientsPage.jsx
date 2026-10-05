import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Tab, Tabs, Tooltip } from '@mui/material';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import StraightenOutlinedIcon from '@mui/icons-material/StraightenOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/table/DataTable';
import TableToolbar from '../../components/table/TableToolbar';
import FilterSelect from '../../components/table/FilterSelect';
import UserAvatar from '../../components/common/UserAvatar';
import StatusChip from '../../components/common/StatusChip';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import usePagedList from '../../hooks/usePagedList';
import { clientService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { useLookups } from '../../features/lookups/LookupsContext';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import ClientFormDialog from '../../features/clients/ClientFormDialog';
import SendReminderDialog from '../../features/clients/SendReminderDialog';
import MeasurementDialog from '../../features/progress/MeasurementDialog';
import { GENDERS, GOALS, labelOf } from '../../utils/constants';
import { daysSince, formatDate, num, signed, timeAgo } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';
import './ClientsPage.css';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, basePath } = useAuth();
  const isSuper = user.role === 'super_admin';
  const { trainers } = useLookups();
  const { confirm, notify, notifyError } = useFeedback();
  const list = usePagedList(useCallback((p) => clientService.list(p), []), { sortBy: 'created', filters: { status: '', organizationId: params.get('organizationId') || '' } });
  const [form, setForm] = useState({ open: false, client: null });
  const [measure, setMeasure] = useState(null);
  const [remind, setRemind] = useState(null);

  const openEdit = async (row) => { try { setForm({ open: true, client: await clientService.get(row.id) }); } catch (e) { notifyError(e); } };
  const toggleStatus = async (row) => {
    const next = row.status === 'active' ? 'inactive' : 'active';
    if (next === 'inactive' && !(await confirm({ title: `Deactivate ${row.full_name}?`, message: 'They will lose access to the client app until reactivated. Their data is kept.', confirmText: 'Deactivate' }))) return;
    try { await clientService.setStatus(row.id, next); notify(`${row.full_name} ${next === 'active' ? 'activated' : 'deactivated'}`); list.reload({ silent: true }); } catch (e) { notifyError(e); }
  };
  const remove = async (row) => {
    if (!(await confirm({ title: `Delete ${row.full_name}?`, message: 'The client and their login will be removed. This cannot be undone from the app.', confirmText: 'Delete client', danger: true }))) return;
    try { await clientService.remove(row.id); notify('Client deleted'); list.reload({ silent: true }); } catch (e) { notifyError(e); }
  };
  const bulk = async (action) => {
    const ids = list.selected;
    if (action === 'delete' && !(await confirm({ title: `Delete ${ids.length} clients?`, message: 'Selected clients and their logins will be removed.', confirmText: 'Delete', danger: true }))) return;
    try {
      if (action === 'delete') await clientService.bulkDelete(ids); else await clientService.bulkStatus(ids, action);
      notify(`Updated ${ids.length} client(s)`); list.reload({ silent: true });
    } catch (e) { notifyError(e); }
  };
  const doExport = async () => {
    const all = await list.fetchAll();
    exportCsv('clients', [
      { header: 'Name', value: (r) => r.full_name }, { header: 'Email', value: (r) => r.email }, { header: 'Phone', value: (r) => r.phone },
      { header: 'Age', value: (r) => r.age }, { header: 'Gender', value: (r) => r.gender }, { header: 'Height (cm)', value: (r) => r.height_cm },
      { header: 'Starting weight (kg)', value: (r) => r.starting_weight_kg }, { header: 'Current weight (kg)', value: (r) => r.current_weight_kg },
      { header: 'Goal', value: (r) => labelOf(GOALS, r.fitness_goal) }, { header: 'Trainer', value: (r) => r.trainer_name }, { header: 'Status', value: (r) => r.status },
      { header: 'Last progress', value: (r) => r.last_progress_date }, { header: 'Joined', value: (r) => r.joined_on },
    ], all.data);
  };

  const columns = [
    {
      field: 'full_name', header: 'Client', sortKey: 'name', render: (r) => (
        <div className="clients-page__client">
          <UserAvatar name={r.full_name} src={r.photo_url} />
          <div className="clients-page__client-text">
            <p className="clients-page__client-name truncate">{r.full_name}</p>
            <span className="clients-page__client-contact truncate">{r.phone || r.email || '—'}</span>
          </div>
        </div>
      ),
    },
    { field: 'age', header: 'Age / Gender', sortKey: 'age', hideBelow: 'md', render: (r) => <span className="text-small">{r.age ?? '—'}{r.gender ? ` · ${labelOf(GENDERS, r.gender)}` : ''}</span> },
    { field: 'height_cm', header: 'Height', hideBelow: 'lg', render: (r) => (r.height_cm ? `${num(r.height_cm, 0)} cm` : '—') },
    {
      field: 'current_weight_kg', header: 'Weight', sortKey: 'weight', render: (r) => {
        const change = r.current_weight_kg != null && r.starting_weight_kg != null ? r.current_weight_kg - r.starting_weight_kg : null;
        return (
          <div>
            <p className="clients-page__weight">{r.current_weight_kg ? `${num(r.current_weight_kg)} kg` : '—'}</p>
            {change != null && change !== 0 && <span className={`clients-page__weight-change ${(r.fitness_goal === 'muscle_gain' ? change > 0 : change < 0) ? 'clients-page__weight-change--good' : ''}`}>{signed(change, 'kg')}</span>}
          </div>
        );
      },
    },
    { field: 'fitness_goal', header: 'Goal', sortKey: 'goal', hideBelow: 'sm', render: (r) => <StatusChip status="goal" label={labelOf(GOALS, r.fitness_goal)} color="primary" /> },
    { field: 'trainer_name', header: 'Trainer', sortKey: 'trainer', hideBelow: 'lg', render: (r) => r.trainer_name || <span className="text-small text-disabled">Unassigned</span> },
    { field: 'status', header: 'Status', sortKey: 'status', render: (r) => <StatusChip status={r.status} /> },
    {
      field: 'last_progress_date', header: 'Last update', sortKey: 'lastProgress', hideBelow: 'md', render: (r) => {
        const d = daysSince(r.last_progress_date);
        return (
          <Tooltip title={r.last_progress_date ? formatDate(r.last_progress_date) : 'No measurements yet'}>
            <div className="clients-page__last-update">
              {(d === null || d > 14) && r.status === 'active' && <WarningAmberRoundedIcon className="clients-page__stale-icon" />}
              <span className={`clients-page__last-update-text ${d === null || d > 14 ? 'clients-page__last-update-text--stale' : ''}`}>{r.last_progress_date ? timeAgo(r.last_progress_date) : 'Never'}</span>
            </div>
          </Tooltip>
        );
      },
    },
  ];

  const actions = (r) => [
    { label: 'View profile', icon: VisibilityOutlinedIcon, onClick: () => navigate(`${basePath}/clients/${r.id}`) },
    { label: 'Edit', icon: EditOutlinedIcon, onClick: openEdit },
    { label: 'Assign workout', icon: FitnessCenterOutlinedIcon, onClick: () => navigate(`${basePath}/workouts/new?clientId=${r.id}`) },
    { label: 'Assign diet', icon: RestaurantMenuOutlinedIcon, onClick: () => navigate(`${basePath}/diets/new?clientId=${r.id}`) },
    { label: 'Add measurement', icon: StraightenOutlinedIcon, onClick: () => setMeasure(r) },
    { label: 'View progress', icon: TimelineOutlinedIcon, onClick: () => navigate(`${basePath}/clients/${r.id}?tab=progress`) },
    { label: 'View history', icon: HistoryOutlinedIcon, onClick: () => navigate(`${basePath}/clients/${r.id}?tab=overview#history`) },
    { label: 'Send reminder', icon: NotificationsActiveOutlinedIcon, onClick: () => setRemind({ ids: [r.id], names: r.full_name }), divider: true },
    { label: r.status === 'active' ? 'Deactivate' : 'Activate', icon: r.status === 'active' ? ToggleOffOutlinedIcon : ToggleOnOutlinedIcon, onClick: toggleStatus },
    { label: 'Delete', icon: DeleteOutlineIcon, onClick: remove, color: 'error' },
  ];

  return (
    <>
      <PageHeader title="Clients" subtitle={isSuper ? 'All clients across every organization.' : 'Manage your clients, their plans and progress.'}
        breadcrumbs={[{ label: 'Dashboard', to: `${basePath}/dashboard` }, { label: 'Clients' }]}
        actions={<Button variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => setForm({ open: true, client: null })}>Add client</Button>} />
      <ErrorState error={list.error} onRetry={list.reload} />
      <Tabs value={list.filters.status} onChange={(_, v) => list.setFilter('status', v)} className="clients-page__tabs" aria-label="Client status">
        <Tab value="" label="All clients" /><Tab value="active" label="Active" /><Tab value="inactive" label="Inactive" />
      </Tabs>
      <DataTable
        columns={columns} rows={list.rows} loading={list.loading} total={list.total} page={list.page} pageSize={list.pageSize}
        onPageChange={list.setPage} onPageSizeChange={list.setPageSize} sort={list.sort} onSortChange={list.setSort}
        selectable selected={list.selected} onSelectionChange={list.setSelected} rowActions={actions} onRowClick={(r) => navigate(`${basePath}/clients/${r.id}`)}
        empty={<EmptyState icon={PeopleAltOutlinedIcon} title={list.search || list.filters.goal ? 'No clients match your filters' : 'No clients yet'} description="Add your first client to start building plans and tracking progress."
          action={<Button variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => setForm({ open: true, client: null })}>Add new client</Button>} />}
        toolbar={(
          <TableToolbar search={list.search} onSearch={list.setSearch} placeholder="Search by name, phone or email" onExport={doExport} selectedCount={list.selected.length}
            filters={(
              <>
                <FilterSelect label="Goal" value={list.filters.goal} onChange={(v) => list.setFilter('goal', v)} options={GOALS} />
                <FilterSelect label="Gender" value={list.filters.gender} onChange={(v) => list.setFilter('gender', v)} options={GENDERS} />
                {isSuper && <FilterSelect label="Trainer" value={list.filters.trainerId} onChange={(v) => list.setFilter('trainerId', v)} options={trainers.map((t) => ({ value: t.id, label: t.name }))} />}
              </>
            )}
            bulkActions={(
              <>
                <Button size="small" startIcon={<NotificationsActiveOutlinedIcon />} onClick={() => setRemind({ ids: list.selected })}>Send reminder</Button>
                <Button size="small" onClick={() => bulk('active')}>Activate</Button>
                <Button size="small" onClick={() => bulk('inactive')}>Deactivate</Button>
                <Button size="small" color="error" onClick={() => bulk('delete')}>Delete</Button>
              </>
            )} />
        )} />
      <ClientFormDialog open={form.open} client={form.client} onClose={() => setForm({ open: false, client: null })}
        onSaved={(c) => { setForm({ open: false, client: null }); list.reload({ silent: true }); if (!form.client) navigate(`${basePath}/clients/${c.id}`); }} />
      <MeasurementDialog open={!!measure} clientId={measure?.id} heightCm={measure?.height_cm} onClose={() => setMeasure(null)} onSaved={() => { setMeasure(null); list.reload({ silent: true }); }} />
      <SendReminderDialog open={!!remind} clientIds={remind?.ids} names={remind?.names} onClose={() => setRemind(null)} />
    </>
  );
}

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, LinearProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewQuiltOutlinedIcon from '@mui/icons-material/ViewQuiltOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/table/DataTable';
import TableToolbar from '../../components/table/TableToolbar';
import FilterSelect from '../../components/table/FilterSelect';
import StatusChip from '../../components/common/StatusChip';
import UserAvatar from '../../components/common/UserAvatar';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import AssignTemplateDialog from '../../features/workout/AssignTemplateDialog';
import usePagedList from '../../hooks/usePagedList';
import useFetch from '../../hooks/useFetch';
import { clientService, dietService, workoutService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { DIET_TYPES, PLAN_STATUSES, labelOf } from '../../utils/constants';
import { formatDate, timeAgo } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';
import './PlansPage.css';

/** Workout Plans / Diet Plans list for trainers. */
export default function PlansPage({ kind }) {
  const isDiet = kind === 'diet';
  const svc = isDiet ? dietService : workoutService;
  const noun = isDiet ? 'diet plan' : 'workout plan';
  const navigate = useNavigate();
  const { basePath } = useAuth();
  const { confirm, notify, notifyError } = useFeedback();
  const [assign, setAssign] = useState(false);
  const list = usePagedList(useCallback((p) => svc.list(p), [svc]), { sortBy: 'updated' });
  const { data: clients } = useFetch(() => clientService.list({ all: 'true', sortBy: 'name', sortDir: 'asc' }).then((r) => r.data), []);
  const path = `${basePath}/${isDiet ? 'diets' : 'workouts'}`;
  const clientOptions = useMemo(() => (clients || []).map((c) => ({ value: c.id, label: c.full_name })), [clients]);

  const act = async (fn, msg) => { try { await fn(); notify(msg); list.reload({ silent: true }); } catch (e) { notifyError(e); } };
  const actions = (r) => [
    { label: 'Open builder', icon: EditOutlinedIcon, onClick: () => navigate(`${path}/${r.id}`) },
    { label: 'Duplicate', icon: ContentCopyOutlinedIcon, onClick: () => act(() => svc.duplicate(r.id), 'Plan duplicated as draft') },
    { label: 'Save as template', icon: BookmarkAddOutlinedIcon, onClick: () => act(() => svc.saveAsTemplate(r.id, `${r.name} (template)`), 'Saved as template') },
    { label: 'Set active', icon: PlayCircleOutlineIcon, hidden: r.status === 'active', onClick: () => act(() => svc.setStatus(r.id, 'active'), 'Plan activated') },
    { label: 'Archive', icon: ArchiveOutlinedIcon, hidden: r.status === 'archived', onClick: () => act(() => svc.setStatus(r.id, 'archived'), 'Plan archived'), divider: true },
    { label: 'Delete', icon: DeleteOutlineIcon, color: 'error', onClick: async () => { if (await confirm({ title: `Delete "${r.name}"?`, message: 'The plan and its logs will be removed.', confirmText: 'Delete', danger: true })) act(() => svc.remove(r.id), 'Plan deleted'); } },
  ];

  const pct = (v) => (v == null ? <span className="plans-page__no-logs">No logs</span> : (
    <div className="plans-page__pct">
      <LinearProgress variant="determinate" value={Number(v)} className="plans-page__pct-bar" color={v >= 75 ? 'success' : v >= 50 ? 'primary' : 'warning'} />
      <span className="plans-page__pct-value">{v}%</span>
    </div>
  ));

  const columns = [
    {
      field: 'name', header: 'Plan', sortKey: 'name', render: (r) => (
        <div className="plans-page__plan">
          <div className="plans-page__plan-name">{r.name}</div>
          <span className="plans-page__plan-meta">{isDiet ? labelOf(DIET_TYPES, r.diet_type) : r.difficulty?.replace(/^\w/, (c) => c.toUpperCase())}</span>
        </div>
      ),
    },
    { field: 'client_name', header: 'Client', sortKey: 'client', render: (r) => <div className="plans-page__client"><UserAvatar name={r.client_name} src={r.client_photo} size={28} /><span>{r.client_name}</span></div> },
    isDiet
      ? { field: 'meals', header: 'Meals · kcal', hideBelow: 'md', render: (r) => `${r.meals_count} meals · ${r.total_calories ?? 0} kcal` }
      : { field: 'days', header: 'Structure', hideBelow: 'md', render: (r) => `${r.days_count} days · ${r.exercises_count} exercises` },
    { field: 'pct', header: isDiet ? 'Adherence (30d)' : 'Completion (30d)', hideBelow: 'sm', render: (r) => pct(isDiet ? r.adherence_pct : r.completion_pct) },
    { field: 'status', header: 'Status', sortKey: 'status', render: (r) => <StatusChip status={r.status} /> },
    { field: 'start_date', header: 'Start', sortKey: 'start', hideBelow: 'lg', render: (r) => formatDate(r.start_date) },
    { field: 'updated_at', header: 'Updated', sortKey: 'updated', hideBelow: 'lg', render: (r) => timeAgo(r.updated_at) },
  ];

  const doExport = async () => {
    const all = await svc.list({ ...list.filters, search: list.search, pageSize: 100 });
    exportCsv(isDiet ? 'diet-plans' : 'workout-plans', [
      { header: 'Plan', value: (r) => r.name }, { header: 'Client', value: (r) => r.client_name }, { header: 'Status', value: (r) => r.status },
      { header: 'Start', value: (r) => r.start_date }, isDiet ? { header: 'Calories', value: (r) => r.total_calories } : { header: 'Exercises', value: (r) => r.exercises_count },
      { header: isDiet ? 'Adherence %' : 'Completion %', value: (r) => (isDiet ? r.adherence_pct : r.completion_pct) },
    ], all.data);
  };

  const Icon = isDiet ? RestaurantMenuOutlinedIcon : FitnessCenterOutlinedIcon;
  return (
    <>
      <PageHeader title={isDiet ? 'Diet Plans' : 'Workout Plans'}
        subtitle={isDiet ? 'Meal schedules with automatic calorie and macro totals.' : 'Structured programmes: plans → days → exercises.'}
        breadcrumbs={[{ label: 'Dashboard', to: `${basePath}/dashboard` }, { label: isDiet ? 'Diet Plans' : 'Workout Plans' }]}
        actions={(
          <>
            <Button variant="outlined" startIcon={<ViewQuiltOutlinedIcon />} onClick={() => setAssign(true)}>Assign from template</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`${path}/new`)}>Create {noun}</Button>
          </>
        )} />
      <ErrorState error={list.error} onRetry={list.reload} />
      <DataTable columns={columns} rows={list.rows} loading={list.loading} total={list.total} page={list.page} pageSize={list.pageSize}
        onPageChange={list.setPage} onPageSizeChange={list.setPageSize} sort={list.sort} onSortChange={list.setSort} rowActions={actions} onRowClick={(r) => navigate(`${path}/${r.id}`)}
        empty={<EmptyState icon={Icon} title={`No ${noun}s yet`} description={`Create a ${noun} from scratch or start from a template.`} action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`${path}/new`)}>Create {noun}</Button>} />}
        toolbar={(
          <TableToolbar search={list.search} onSearch={list.setSearch} placeholder="Search plans or clients" onExport={doExport}
            filters={(
              <>
                <FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={PLAN_STATUSES} />
                <FilterSelect label="Client" value={list.filters.clientId} onChange={(v) => list.setFilter('clientId', v)} options={clientOptions} className="plans-page__client-filter" />
              </>
            )} />
        )} />
      <AssignTemplateDialog open={assign} kind={kind} onClose={() => setAssign(false)} />
    </>
  );
}

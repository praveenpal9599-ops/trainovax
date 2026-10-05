import { useCallback, useState } from 'react';
import { Button, Chip, Drawer, IconButton, Link } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import SportsGymnasticsOutlinedIcon from '@mui/icons-material/SportsGymnasticsOutlined';
import CloseIcon from '@mui/icons-material/Close';
import OndemandVideoOutlinedIcon from '@mui/icons-material/OndemandVideoOutlined';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/table/DataTable';
import TableToolbar from '../../components/table/TableToolbar';
import FilterSelect from '../../components/table/FilterSelect';
import StatusChip from '../../components/common/StatusChip';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import InfoRow from '../../components/common/InfoRow';
import ExerciseThumb from '../../features/masters/ExerciseThumb';
import ExerciseFormDialog from '../../features/masters/ExerciseFormDialog';
import usePagedList from '../../hooks/usePagedList';
import { exerciseService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { useLookups } from '../../features/lookups/LookupsContext';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { DIFFICULTIES } from '../../utils/constants';
import { duration } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';
import './ExercisesPage.css';

export default function ExercisesPage() {
  const { user, basePath } = useAuth();
  const isSuper = user.role === 'super_admin';
  const { exerciseCategories, muscleGroups, equipment } = useLookups();
  const { confirm, notify, notifyError } = useFeedback();
  const list = usePagedList(useCallback((p) => exerciseService.list(p), []), { sortBy: 'name', sortDir: 'asc' });
  const [form, setForm] = useState({ open: false, exercise: null });
  const [detail, setDetail] = useState(null);
  const canEdit = (r) => isSuper || r.created_by === user.id;

  const act = async (fn, msg) => { try { await fn(); notify(msg); list.reload({ silent: true }); } catch (e) { notifyError(e); } };
  const bulkStatus = async (status) => { for (const id of list.selected) await exerciseService.setStatus(id, status).catch(() => {}); notify(`Updated ${list.selected.length} exercise(s)`); list.reload({ silent: true }); };
  const actions = (r) => [
    { label: 'View details', icon: VisibilityOutlinedIcon, onClick: setDetail },
    { label: 'Edit', icon: EditOutlinedIcon, hidden: !canEdit(r), onClick: () => setForm({ open: true, exercise: r }) },
    { label: r.status === 'active' ? 'Deactivate' : 'Activate', icon: r.status === 'active' ? ToggleOffOutlinedIcon : ToggleOnOutlinedIcon, hidden: !canEdit(r), onClick: () => act(() => exerciseService.setStatus(r.id, r.status === 'active' ? 'inactive' : 'active'), 'Status updated') },
    { label: 'Delete', icon: DeleteOutlineIcon, color: 'error', hidden: !canEdit(r), onClick: async () => { if (await confirm({ title: `Delete "${r.name}"?`, message: 'Existing plans keep this exercise, but it will no longer be available for new plans.', confirmText: 'Delete', danger: true })) act(() => exerciseService.remove(r.id), 'Exercise deleted'); } },
  ];
  const columns = [
    {
      field: 'name', header: 'Exercise', sortKey: 'name', render: (r) => (
        <div className="exercises__name-cell">
          <ExerciseThumb category={r.category} image={r.image_url} />
          <div className="exercises__name-text"><p className="exercises__name">{r.name}</p><span className="exercises__desc truncate">{r.description}</span></div>
        </div>
      ),
    },
    { field: 'category', header: 'Category', sortKey: 'category', render: (r) => <Chip size="small" label={r.category || '—'} variant="outlined" /> },
    { field: 'primary_muscle', header: 'Muscle group', sortKey: 'muscle', hideBelow: 'sm', render: (r) => <span className="exercises__muscle">{r.primary_muscle}{r.secondary_muscle && <span className="exercises__muscle-secondary"> · {r.secondary_muscle}</span>}</span> },
    { field: 'equipment', header: 'Equipment', hideBelow: 'lg' },
    { field: 'difficulty', header: 'Difficulty', sortKey: 'difficulty', hideBelow: 'md', render: (r) => <StatusChip status={r.difficulty} /> },
    { field: 'defaults', header: 'Default', hideBelow: 'lg', render: (r) => <span className="exercises__defaults">{r.exercise_type === 'time' ? `${r.default_sets ?? 1} × ${duration(r.default_duration_sec)}` : `${r.default_sets ?? '—'} × ${r.default_reps ?? '—'}`}</span> },
    { field: 'status', header: 'Status', sortKey: 'status', render: (r) => <StatusChip status={r.status} /> },
  ];
  const doExport = async () => {
    const all = await list.fetchAll();
    exportCsv('exercise-master', [
      { header: 'Name', value: (r) => r.name }, { header: 'Category', value: (r) => r.category }, { header: 'Muscle', value: (r) => r.primary_muscle }, { header: 'Secondary', value: (r) => r.secondary_muscle },
      { header: 'Equipment', value: (r) => r.equipment }, { header: 'Difficulty', value: (r) => r.difficulty }, { header: 'Type', value: (r) => r.exercise_type }, { header: 'Sets', value: (r) => r.default_sets },
      { header: 'Reps', value: (r) => r.default_reps }, { header: 'Duration (s)', value: (r) => r.default_duration_sec }, { header: 'Rest (s)', value: (r) => r.default_rest_sec }, { header: 'Status', value: (r) => r.status },
    ], all.data);
  };

  return (
    <>
      <PageHeader title={isSuper ? 'Exercise Master' : 'Exercise Library'} subtitle="The exercise database used by every workout builder."
        breadcrumbs={[{ label: 'Dashboard', to: `${basePath}/dashboard` }, { label: isSuper ? 'Exercise Master' : 'Exercise Library' }]}
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm({ open: true, exercise: null })}>Add exercise</Button>} />
      <ErrorState error={list.error} onRetry={list.reload} />
      <DataTable columns={columns} rows={list.rows} loading={list.loading} total={list.total} page={list.page} pageSize={list.pageSize} onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize} sort={list.sort} onSortChange={list.setSort} rowActions={actions} onRowClick={setDetail}
        selectable={isSuper} selected={list.selected} onSelectionChange={list.setSelected}
        empty={<EmptyState icon={SportsGymnasticsOutlinedIcon} title="No exercises found" description="Adjust the filters or add a new exercise." />}
        toolbar={(
          <TableToolbar search={list.search} onSearch={list.setSearch} placeholder="Search exercises or equipment" onExport={doExport} selectedCount={list.selected.length}
            bulkActions={<><Button size="small" onClick={() => bulkStatus('active')}>Activate</Button><Button size="small" onClick={() => bulkStatus('inactive')}>Deactivate</Button></>}
            filters={(
              <>
                <FilterSelect label="Category" value={list.filters.categoryId} onChange={(v) => list.setFilter('categoryId', v)} options={exerciseCategories.map((c) => ({ value: c.id, label: c.name }))} />
                <FilterSelect label="Muscle group" value={list.filters.muscleId} onChange={(v) => list.setFilter('muscleId', v)} options={muscleGroups.map((c) => ({ value: c.id, label: c.name }))} />
                <FilterSelect label="Difficulty" value={list.filters.difficulty} onChange={(v) => list.setFilter('difficulty', v)} options={DIFFICULTIES} />
                <FilterSelect label="Equipment" value={list.filters.equipment} onChange={(v) => list.setFilter('equipment', v)} options={equipment.map((e) => ({ value: e, label: e }))} />
                {isSuper && <FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />}
              </>
            )} />
        )} />
      <ExerciseFormDialog open={form.open} exercise={form.exercise} onClose={() => setForm({ open: false, exercise: null })} onSaved={() => { setForm({ open: false, exercise: null }); list.reload({ silent: true }); }} />
      <Drawer anchor="right" open={!!detail} onClose={() => setDetail(null)} PaperProps={{ className: 'exercises__drawer' }}>
        {detail && (
          <div className="exercises__detail">
            <div className="row row--between row--top">
              <div className="exercises__detail-head"><ExerciseThumb category={detail.category} image={detail.image_url} size={56} /><div><h2 className="exercises__detail-title">{detail.name}</h2><p className="exercises__detail-sub">{detail.category} · {detail.primary_muscle}</p></div></div>
              <IconButton onClick={() => setDetail(null)} aria-label="Close"><CloseIcon /></IconButton>
            </div>
            <p className="exercises__detail-desc">{detail.description}</p>
            <div className="exercises__detail-chips"><StatusChip status={detail.difficulty} /><StatusChip status={detail.status} /></div>
            <InfoRow label="Equipment" value={detail.equipment} />
            <InfoRow label="Secondary muscle" value={detail.secondary_muscle} />
            <InfoRow label="Defaults" value={detail.exercise_type === 'time' ? `${detail.default_sets ?? 1} × ${duration(detail.default_duration_sec)}, rest ${duration(detail.default_rest_sec)}` : `${detail.default_sets} sets × ${detail.default_reps} reps, rest ${duration(detail.default_rest_sec)}`} />
            <h3 className="exercises__detail-heading">Instructions</h3>
            <ol className="exercises__steps">{(detail.instructions || '').split('\n').filter(Boolean).map((l) => <li className="exercises__step" key={l}>{l}</li>)}</ol>
            {detail.video_url && <Button component={Link} href={detail.video_url} target="_blank" rel="noopener" startIcon={<OndemandVideoOutlinedIcon />} className="exercises__video">Watch video</Button>}
            {canEdit(detail) && <Button variant="outlined" fullWidth className="exercises__edit" startIcon={<EditOutlinedIcon />} onClick={() => { setForm({ open: true, exercise: detail }); setDetail(null); }}>Edit exercise</Button>}
          </div>
        )}
      </Drawer>
    </>
  );
}

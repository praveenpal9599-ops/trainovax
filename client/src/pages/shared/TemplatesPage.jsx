import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, IconButton, InputAdornment, ListItemIcon, Menu, MenuItem, Skeleton, TextField, Pagination } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import StatusChip from '../../components/common/StatusChip';
import FilterSelect from '../../components/table/FilterSelect';
import AssignTemplateDialog from '../../features/workout/AssignTemplateDialog';
import usePagedList from '../../hooks/usePagedList';
import { dietService, workoutService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { DIET_TYPES, GOALS, labelOf } from '../../utils/constants';
import './TemplatesPage.css';

/** Workout or diet template library (card grid). */
export default function TemplatesPage({ kind }) {
  const isDiet = kind === 'diet';
  const svc = isDiet ? dietService.templates : workoutService.templates;
  const navigate = useNavigate();
  const { user, basePath } = useAuth();
  const isSuper = user.role === 'super_admin';
  const { confirm, notify, notifyError } = useFeedback();
  const list = usePagedList(useCallback((p) => svc.list(p), [svc]), { pageSize: 12, sortBy: 'name', sortDir: 'asc' });
  const [menu, setMenu] = useState(null);
  const [assign, setAssign] = useState(null);
  const path = `${basePath}/${isDiet ? 'diet' : 'workout'}-templates`;
  const canEdit = (t) => isSuper || t.organization_id === user.organization_id;

  const run = async (fn, msg) => { setMenu(null); try { await fn(); notify(msg); list.reload({ silent: true }); } catch (e) { notifyError(e); } };
  const Icon = isDiet ? RestaurantMenuOutlinedIcon : FitnessCenterOutlinedIcon;

  return (
    <>
      <PageHeader title={isDiet ? 'Diet Templates' : 'Workout Templates'}
        subtitle={isSuper ? 'Global templates are available to every trainer on the platform.' : 'Proven programmes you can assign to any client in seconds.'}
        breadcrumbs={[{ label: 'Dashboard', to: `${basePath}/dashboard` }, { label: isDiet ? 'Diet Templates' : 'Workout Templates' }]}
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`${path}/new`)}>New template</Button>} />
      <ErrorState error={list.error} onRetry={list.reload} />
      <div className="templates-page__filters">
        <TextField value={list.search} onChange={(e) => list.setSearch(e.target.value)} placeholder="Search templates" className="templates-page__search" inputProps={{ 'aria-label': 'Search templates' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        <FilterSelect label="Goal" value={list.filters.goal} onChange={(v) => list.setFilter('goal', v)} options={GOALS} />
        {isSuper && <FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />}
      </div>
      <div className="templates-page__grid">
        {list.loading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="rounded" height={190} />)}
        {!list.loading && list.rows.length === 0 && (
          <div className="card span-full"><EmptyState icon={Icon} title="No templates found" description="Create a template once and reuse it for every client with the same goal."
            action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`${path}/new`)}>New template</Button>} /></div>
        )}
        {!list.loading && list.rows.map((t) => (
          <article className="card templates-page__card" key={t.id}>
            <button type="button" className="templates-page__card-main" onClick={() => navigate(`${path}/${t.id}`)}>
              <div className="templates-page__chips">
                <Chip size="small" icon={t.organization_id ? <BusinessOutlinedIcon /> : <PublicOutlinedIcon />} label={t.organization_id ? (t.organization_name || 'Organization') : 'Global'} variant="outlined" />
                {t.goal && <StatusChip status="goal" label={labelOf(GOALS, t.goal)} color="primary" />}
                {t.status === 'inactive' && <StatusChip status="inactive" />}
              </div>
              <h3 className="templates-page__name">{t.name}</h3>
              <p className="templates-page__desc clamp-2">{t.description || 'No description'}</p>
              <div className="templates-page__metrics">
                {isDiet ? (
                  <>
                    <div><div className="templates-page__metric-value">{t.total_calories ?? 0}</div><span className="templates-page__metric-label">kcal / day</span></div>
                    <div><div className="templates-page__metric-value">{t.total_protein ?? 0}g</div><span className="templates-page__metric-label">protein</span></div>
                    <div><div className="templates-page__metric-value">{t.meals_count}</div><span className="templates-page__metric-label">meals</span></div>
                  </>
                ) : (
                  <>
                    <div><div className="templates-page__metric-value">{t.days_count}</div><span className="templates-page__metric-label">days / week</span></div>
                    <div><div className="templates-page__metric-value">{t.exercises_count}</div><span className="templates-page__metric-label">exercises</span></div>
                    <div><div className="templates-page__metric-value">{t.duration_weeks ?? '—'}</div><span className="templates-page__metric-label">weeks</span></div>
                  </>
                )}
              </div>
            </button>
            <div className="templates-page__card-foot">
              <span className="templates-page__card-meta">
                {isDiet ? labelOf(DIET_TYPES, t.diet_type) : t.difficulty?.replace(/^\w/, (c) => c.toUpperCase())} · assigned {t.times_assigned}×
              </span>
              {!isSuper && <Button size="small" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => setAssign(t)}>Assign</Button>}
              <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, t })} aria-label="Template actions"><MoreVertIcon fontSize="small" /></IconButton>
            </div>
          </article>
        ))}
      </div>
      {list.total > list.pageSize && <div className="templates-page__pagination"><Pagination count={Math.ceil(list.total / list.pageSize)} page={list.page + 1} onChange={(_, p) => list.setPage(p - 1)} color="primary" /></div>}

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => { setMenu(null); navigate(`${path}/${menu.t.id}`); }}><ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon>{canEdit(menu?.t || {}) ? 'Edit' : 'View'}</MenuItem>
        <MenuItem onClick={() => run(() => svc.duplicate(menu.t.id), 'Template duplicated')}><ListItemIcon><ContentCopyOutlinedIcon fontSize="small" /></ListItemIcon>Duplicate{!isSuper && menu?.t && !canEdit(menu.t) ? ' to my library' : ''}</MenuItem>
        {!isSuper && <MenuItem onClick={() => { setAssign(menu.t); setMenu(null); }}><ListItemIcon><PersonAddAlt1OutlinedIcon fontSize="small" /></ListItemIcon>Assign to client</MenuItem>}
        {menu?.t && canEdit(menu.t) && isSuper && menu.t.status === 'active' && (
          <MenuItem onClick={() => run(async () => { const full = await svc.get(menu.t.id); await svc.update(menu.t.id, { ...full, status: 'inactive' }); }, 'Template deactivated')}>
            <ListItemIcon><ToggleOffOutlinedIcon fontSize="small" /></ListItemIcon>Deactivate
          </MenuItem>
        )}
        {menu?.t && canEdit(menu.t) && (
          <MenuItem className="menu-item--error" onClick={async () => { const t = menu.t; setMenu(null); if (await confirm({ title: `Delete "${t.name}"?`, message: 'Plans already assigned from this template are not affected.', confirmText: 'Delete', danger: true })) run(() => svc.remove(t.id), 'Template deleted'); }}>
            <ListItemIcon><DeleteOutlineIcon fontSize="small" /></ListItemIcon>Delete
          </MenuItem>
        )}
      </Menu>
      <AssignTemplateDialog open={!!assign} kind={kind} template={assign} onClose={() => setAssign(null)} />
    </>
  );
}

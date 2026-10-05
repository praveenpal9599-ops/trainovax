import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, InputAdornment, LinearProgress, Skeleton, TextField } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchIcon from '@mui/icons-material/Search';
import ViewQuiltOutlinedIcon from '@mui/icons-material/ViewQuiltOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import MobilePageHeader from '../../features/mobile/MobilePageHeader';
import UserAvatar from '../../components/common/UserAvatar';
import StatusChip from '../../components/common/StatusChip';
import EmptyState from '../../components/common/EmptyState';
import AssignTemplateDialog from '../../features/workout/AssignTemplateDialog';
import usePagedList from '../../hooks/usePagedList';
import { dietService, workoutService } from '../../services';
import { DIET_TYPES, labelOf } from '../../utils/constants';
import { formatDate } from '../../utils/format';
import '../../features/mobile/mobile.css';
import './TrainerPlans.css';

const STATUS = [['', 'All'], ['active', 'Active'], ['draft', 'Draft'], ['completed', 'Completed'], ['archived', 'Archived']];

/** Trainer app: workout or diet plans as cards. Styles: TrainerPlans.css */
export default function TrainerPlans({ kind }) {
  const isDiet = kind === 'diet';
  const svc = isDiet ? dietService : workoutService;
  const navigate = useNavigate();
  const base = `/trainer/${isDiet ? 'diets' : 'workouts'}`;
  const list = usePagedList(useCallback((p) => svc.list(p), [svc]), { pageSize: 50, sortBy: 'updated', filters: { status: 'active' } });
  const [assign, setAssign] = useState(false);
  const pct = (r) => (isDiet ? r.adherence_pct : r.completion_pct);

  return (
    <div className="trainer-plans">
      <MobilePageHeader title={isDiet ? 'Diet Plans' : 'Workout Plans'} subtitle={isDiet ? 'Meals with automatic calories & macros' : 'Weekly training schedules'} back="/trainer/dashboard" />
      <div className="trainer-plans__actions">
        <Button fullWidth size="large" variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate(`${base}/new`)}>Create {isDiet ? 'diet' : 'workout'} plan</Button>
        <Button size="large" variant="outlined" onClick={() => setAssign(true)} aria-label="Assign from template" className="trainer-plans__assign"><ViewQuiltOutlinedIcon /></Button>
      </div>
      <TextField value={list.search} onChange={(e) => list.setSearch(e.target.value)} placeholder="Search plans or clients…" inputProps={{ 'aria-label': 'Search plans' }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }} className="mobile-search" />
      <div className="mobile-filter-row">
        {STATUS.map(([v, l]) => <Chip key={l} label={l} onClick={() => list.setFilter('status', v)} color={list.filters.status === v ? 'primary' : 'default'} variant={list.filters.status === v ? 'filled' : 'outlined'} />)}
      </div>
      {list.loading && [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={130} className="trainer-plans__skeleton" />)}
      {!list.loading && list.rows.length === 0 && (
        <div className="card"><EmptyState icon={isDiet ? RestaurantMenuOutlinedIcon : FitnessCenterOutlinedIcon} title="No plans here" description="Create a plan or assign one from a template." /></div>
      )}
      <div className="trainer-plans__list">
        {!list.loading && list.rows.map((r) => (
          <button type="button" key={r.id} onClick={() => navigate(`${base}/${r.id}`)} className="card card--clickable trainer-plans__card">
            <div className="trainer-plans__head">
              <UserAvatar name={r.client_name} src={r.client_photo} size={42} />
              <div className="flex-1">
                <h3 className="trainer-plans__name truncate">{r.name}</h3>
                <p className="trainer-plans__client truncate">{r.client_name}{r.start_date ? ` · from ${formatDate(r.start_date, { day: 'numeric', month: 'short' })}` : ''}</p>
              </div>
              <StatusChip status={r.status} />
            </div>
            <div className="trainer-plans__chips">
              {isDiet ? (
                <>
                  <Chip size="small" label={`${r.total_calories ?? 0} kcal`} color="primary" variant="outlined" />
                  <Chip size="small" label={`${r.total_protein ?? 0} g protein`} variant="outlined" />
                  <Chip size="small" label={`${r.meals_count} meals`} variant="outlined" />
                  <Chip size="small" label={labelOf(DIET_TYPES, r.diet_type)} variant="outlined" />
                </>
              ) : (
                <>
                  <Chip size="small" label={`${r.days_count} days / week`} color="primary" variant="outlined" />
                  <Chip size="small" label={`${r.exercises_count} exercises`} variant="outlined" />
                  <Chip size="small" label={r.difficulty} variant="outlined" className="text-capitalize" />
                </>
              )}
            </div>
            <div className="trainer-plans__progress">
              <span className="trainer-plans__progress-label">{isDiet ? 'Adherence' : 'Completion'} (30d)</span>
              <LinearProgress variant="determinate" value={Number(pct(r)) || 0} className="trainer-plans__progress-bar" color={pct(r) >= 75 ? 'success' : pct(r) >= 50 ? 'primary' : 'warning'} />
              <span className="trainer-plans__progress-value">{pct(r) == null ? '—' : `${pct(r)}%`}</span>
            </div>
          </button>
        ))}
      </div>
      <AssignTemplateDialog open={assign} kind={kind} onClose={() => setAssign(false)} />
    </div>
  );
}

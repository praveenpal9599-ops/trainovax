import { useNavigate } from 'react-router-dom';
import { Button, List, ListItemButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ViewQuiltOutlinedIcon from '@mui/icons-material/ViewQuiltOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import { useState } from 'react';
import useFetch from '../../../hooks/useFetch';
import { dietService, workoutService } from '../../../services';
import SectionCard from '../../../components/common/SectionCard';
import StatusChip from '../../../components/common/StatusChip';
import EmptyState from '../../../components/common/EmptyState';
import LoadingScreen from '../../../components/common/LoadingScreen';
import WorkoutPlanView from '../../workout/WorkoutPlanView';
import DietPlanView from '../../diet/DietPlanView';
import AssignTemplateDialog from '../../workout/AssignTemplateDialog';
import { formatDate } from '../../../utils/format';
import './PlansTab.css';

/** Workout or Diet tab on the client profile. */
export default function PlansTab({ client, kind, basePath }) {
  const isDiet = kind === 'diet';
  const svc = isDiet ? dietService : workoutService;
  const navigate = useNavigate();
  const [assign, setAssign] = useState(false);
  const { data: plans, loading } = useFetch(() => svc.list({ clientId: client.id, pageSize: 50 }).then((r) => r.data), [client.id, kind]);
  const active = plans?.find((p) => p.status === 'active');
  const { data: detail, loading: loadingDetail } = useFetch(() => svc.get(active.id), [active?.id], { enabled: !!active });
  const path = `${basePath}/${isDiet ? 'diets' : 'workouts'}`;
  const Icon = isDiet ? RestaurantMenuOutlinedIcon : FitnessCenterOutlinedIcon;

  if (loading) return <LoadingScreen />;
  return (
    <div className="client-plans">
      <div className="client-plans__head">
        <div>
          <h2 className="client-plans__title">{active ? active.name : `No active ${kind} plan`}</h2>
          {active && <p className="client-plans__meta">Started {formatDate(active.start_date)}{isDiet ? ` · ${active.total_calories} kcal / day` : ` · ${active.days_count} days / week`}</p>}
        </div>
        <div className="client-plans__actions">
          <Button variant="outlined" startIcon={<ViewQuiltOutlinedIcon />} onClick={() => setAssign(true)}>From template</Button>
          {active && <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => navigate(`${path}/${active.id}`)}>Edit plan</Button>}
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`${path}/new?clientId=${client.id}`)}>New plan</Button>
        </div>
      </div>
      {!active && <div className="card client-plans__empty"><EmptyState icon={Icon} title={`No active ${kind} plan`} description={`Create a ${kind} plan from scratch or assign a template.`} /></div>}
      {active && (loadingDetail || !detail ? <LoadingScreen /> : isDiet ? <DietPlanView plan={detail} /> : <WorkoutPlanView plan={detail} />)}
      {plans?.length > 0 && (
        <div className="client-plans__history">
          <SectionCard title="Plan history" noPadding>
            <List disablePadding>
              {plans.map((p) => (
                <ListItemButton key={p.id} onClick={() => navigate(`${path}/${p.id}`)} className="client-plans__item">
                  <div className="flex-1"><p className="client-plans__item-name">{p.name}</p><span className="client-plans__item-meta">{formatDate(p.start_date)} · {isDiet ? `${p.meals_count} meals` : `${p.days_count} days, ${p.exercises_count} exercises`}</span></div>
                  <StatusChip status={p.status} />
                </ListItemButton>
              ))}
            </List>
          </SectionCard>
        </div>
      )}
      <AssignTemplateDialog open={assign} kind={kind} clientId={client.id} onClose={() => setAssign(false)} />
    </div>
  );
}

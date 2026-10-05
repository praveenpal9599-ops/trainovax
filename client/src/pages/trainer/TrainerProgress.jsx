import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ButtonBase } from '@mui/material';
import MonitorWeightOutlinedIcon from '@mui/icons-material/MonitorWeightOutlined';
import MobilePageHeader from '../../features/mobile/MobilePageHeader';
import UserAvatar from '../../components/common/UserAvatar';
import EmptyState from '../../components/common/EmptyState';
import ProgressDashboard from '../../features/progress/ProgressDashboard';
import useFetch from '../../hooks/useFetch';
import { clientService } from '../../services';
import './TrainerProgress.css';

/** Trainer app: pick a client (avatar strip) and see their progress charts & history. Styles: TrainerProgress.css */
export default function TrainerProgress() {
  const [params, setParams] = useSearchParams();
  const { data: clients, loading } = useFetch(() => clientService.list({ all: 'true', status: 'active', sortBy: 'name', sortDir: 'asc' }).then((r) => r.data), []);
  const selectedId = Number(params.get('clientId')) || null;
  const selected = clients?.find((c) => c.id === selectedId);
  useEffect(() => { if (!selectedId && clients?.length) setParams({ clientId: clients[0].id }, { replace: true }); }, [clients, selectedId, setParams]);
  return (
    <div className="trainer-progress">
      <MobilePageHeader title="Progress" subtitle="Measurements, charts and history" back="/trainer/dashboard" />
      <div className="trainer-progress__clients">
        {(clients || []).map((c) => (
          <ButtonBase key={c.id} onClick={() => setParams({ clientId: c.id })} className="trainer-progress__client">
            <UserAvatar name={c.full_name} src={c.photo_url} size={52} className={c.id === selectedId ? 'trainer-progress__avatar--active' : ''} />
            <span className={`trainer-progress__name${c.id === selectedId ? ' trainer-progress__name--active' : ''}`}>{c.full_name.split(' ')[0]}</span>
          </ButtonBase>
        ))}
      </div>
      {selected ? <ProgressDashboard key={selected.id} clientId={selected.id} heightCm={selected.height_cm} goal={selected.fitness_goal} />
        : !loading && <div className="card"><EmptyState icon={MonitorWeightOutlinedIcon} title="No active clients" /></div>}
    </div>
  );
}

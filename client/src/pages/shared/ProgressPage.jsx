import { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Autocomplete, Button, TextField } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MonitorWeightOutlinedIcon from '@mui/icons-material/MonitorWeightOutlined';
import PageHeader from '../../components/common/PageHeader';
import UserAvatar from '../../components/common/UserAvatar';
import EmptyState from '../../components/common/EmptyState';
import ProgressDashboard from '../../features/progress/ProgressDashboard';
import useFetch from '../../hooks/useFetch';
import { clientService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { GOALS, labelOf } from '../../utils/constants';
import './ProgressPage.css';

/** Trainer progress tracking: pick a client, see charts & measurement history. */
export default function ProgressPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { basePath } = useAuth();
  const { data: clients, loading } = useFetch(() => clientService.list({ all: 'true', sortBy: 'name', sortDir: 'asc' }).then((r) => r.data), []);
  const selectedId = Number(params.get('clientId')) || null;
  const selected = useMemo(() => clients?.find((c) => c.id === selectedId) || null, [clients, selectedId]);
  useEffect(() => { if (!selectedId && clients?.length) setParams({ clientId: clients.find((c) => c.status === 'active')?.id || clients[0].id }, { replace: true }); }, [clients, selectedId, setParams]);

  return (
    <>
      <PageHeader title="Progress Tracking" subtitle="Weight, body-fat and body measurements with trend charts." breadcrumbs={[{ label: 'Dashboard', to: `${basePath}/dashboard` }, { label: 'Progress' }]} />
      <section className="card progress-page__picker">
        <Autocomplete className="progress-page__select" loading={loading} options={clients || []} value={selected} getOptionLabel={(o) => o.full_name} isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_, v) => v && setParams({ clientId: v.id })}
          renderOption={(props, o) => <li {...props} key={o.id} className={`${props.className || ''} progress-page__option`}><UserAvatar name={o.full_name} src={o.photo_url} size={28} /><div><p className="text-small">{o.full_name}</p><span className="text-caption text-muted">{labelOf(GOALS, o.fitness_goal)}{o.status === 'inactive' ? ' · inactive' : ''}</span></div></li>}
          renderInput={(p) => <TextField {...p} label="Select client" />} />
        {selected && (
          <div className="progress-page__client">
            <UserAvatar name={selected.full_name} src={selected.photo_url} />
            <div className="flex-1"><p className="progress-page__client-name">{selected.full_name}</p><span className="text-caption text-muted">{labelOf(GOALS, selected.fitness_goal)} · {selected.height_cm ? `${selected.height_cm} cm` : 'height not set'}</span></div>
            <Button endIcon={<OpenInNewIcon />} onClick={() => navigate(`${basePath}/clients/${selected.id}?tab=progress`)}>Profile</Button>
          </div>
        )}
      </section>
      {selected ? <ProgressDashboard key={selected.id} clientId={selected.id} heightCm={selected.height_cm} goal={selected.fitness_goal} />
        : !loading && <div className="card"><EmptyState icon={MonitorWeightOutlinedIcon} title="No clients yet" description="Add a client to start tracking progress." /></div>}
    </>
  );
}

import { useEffect, useState } from 'react';
import { FormControlLabel, Switch, TextField } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import LoadingButton from '../../components/common/LoadingButton';
import ErrorState from '../../components/common/ErrorState';
import useFetch from '../../hooks/useFetch';
import { settingsService } from '../../services';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import './superadmin.css';

const GROUPS = { general: 'General', access: 'Access & registration', billing: 'Billing', client: 'Client experience', system: 'System' };

export default function SystemSettingsPage() {
  const { data, loading, error, reload, setData } = useFetch(() => settingsService.list(), []);
  const { notify, notifyError } = useFeedback();
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setValues(Object.fromEntries(data.map((s) => [s.setting_key, s.setting_value]))); }, [data]);
  if (loading && !data) return <LoadingScreen />;
  const dirty = data?.some((s) => values[s.setting_key] !== s.setting_value);
  const save = async () => {
    setSaving(true);
    try { setData(await settingsService.update(values)); notify('Settings saved'); } catch (e) { notifyError(e); } finally { setSaving(false); }
  };
  const groups = Object.entries(GROUPS).map(([g, label]) => [label, (data || []).filter((s) => s.setting_group === g)]).filter(([, items]) => items.length);

  return (
    <>
      <PageHeader title="System settings" subtitle="Platform-wide configuration." breadcrumbs={[{ label: 'Dashboard', to: '/super-admin/dashboard' }, { label: 'System Settings' }]}
        actions={<LoadingButton variant="contained" startIcon={<SaveOutlinedIcon />} loading={saving} disabled={!dirty} onClick={save}>Save changes</LoadingButton>} />
      <ErrorState error={error} onRetry={reload} />
      <div className="sa-settings">
        {groups.map(([label, items]) => (
          <div key={label}>
            <SectionCard title={label}>
              <div className="sa-settings__fields">
                {items.map((s) => (s.value_type === 'boolean' ? (
                  <div key={s.setting_key}>
                    <FormControlLabel control={<Switch checked={!!values[s.setting_key]} onChange={(e) => setValues((v) => ({ ...v, [s.setting_key]: e.target.checked }))} />} label={s.label} />
                    {s.setting_key === 'maintenance_mode' && values.maintenance_mode && <span className="sa-settings__notice">Clients and trainers will see a maintenance notice.</span>}
                  </div>
                ) : (
                  <TextField key={s.setting_key} label={s.label} type={s.value_type === 'number' ? 'number' : 'text'} value={values[s.setting_key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [s.setting_key]: s.value_type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value }))} helperText={s.is_public ? 'Visible to all users' : undefined} />
                )))}
              </div>
            </SectionCard>
          </div>
        ))}
      </div>
    </>
  );
}

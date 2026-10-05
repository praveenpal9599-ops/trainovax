import { useRef, useState } from 'react';
import { Alert, Button } from '@mui/material';
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import LoadingButton from '../../components/common/LoadingButton';
import ProfileSettings from '../../features/settings/ProfileSettings';
import InviteCodeCard from '../../features/auth/InviteCodeCard';
import { backupService } from '../../services';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { useAuth } from '../../features/auth/AuthContext';
import { downloadJson } from '../../utils/exportCsv';
import { todayISO } from '../../utils/format';
import './AdminSettingsPage.css';

/** Trainer settings — profile, password and the JSON Data Backup & Restore carried over from legacy v1. */
export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { notify, confirm } = useFeedback();
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const input = useRef(null);

  const doExport = async () => {
    setBusy('export'); setError(null);
    try { downloadJson(`trainovax-backup-${todayISO()}.json`, await backupService.exportJson()); notify('Backup downloaded'); } catch (e) { setError(e.message); } finally { setBusy(null); }
  };
  const doImport = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setError(null); setResult(null);
    let json;
    try { json = JSON.parse(await file.text()); } catch { setError('That file is not valid JSON.'); return; }
    const count = (Array.isArray(json) ? json : json.clients || []).length;
    if (!(await confirm({ title: `Import ${count} client(s)?`, message: 'Clients and their measurements will be added to your account as new records. Existing clients are not changed.', confirmText: 'Import' }))) return;
    setBusy('import');
    try { const r = await backupService.importJson(json); setResult(r); notify(`Imported ${r.imported} client(s)`); } catch (err) { setError(err.message); } finally { setBusy(null); }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle={`${user.organization_name || 'Your studio'} · profile, security and data`} />
      <div className="admin-settings__invite"><InviteCodeCard /></div>
      <ProfileSettings />
      <div className="admin-settings__backup">
        <SectionCard title="Data backup & restore" subtitle="Export all your clients, measurements and plans as JSON, or import a backup (including legacy v1 exports).">
          {error && <Alert severity="error" className="admin-settings__alert">{error}</Alert>}
          {result && <Alert severity="success" className="admin-settings__alert">Imported {result.imported} client(s) and {result.measurements} measurement(s).</Alert>}
          <div className="admin-settings__options">
            <div className="admin-settings__option">
              <div className="admin-settings__option-head"><CloudDownloadOutlinedIcon color="primary" /><h3 className="admin-settings__option-title">Export backup</h3></div>
              <p className="admin-settings__option-text">Download a JSON file with every client, profile, progress record and plan summary.</p>
              <LoadingButton variant="contained" loading={busy === 'export'} onClick={doExport}>Export JSON</LoadingButton>
            </div>
            <div className="admin-settings__option">
              <div className="admin-settings__option-head"><CloudUploadOutlinedIcon color="primary" /><h3 className="admin-settings__option-title">Import backup</h3></div>
              <p className="admin-settings__option-text">Restore clients and measurements from a JSON backup. Fields like name, age, gender, phone, height, weight, goal, notes and progress entries are recognised.</p>
              <Button variant="outlined" disabled={busy === 'import'} onClick={() => input.current?.click()}>{busy === 'import' ? 'Importing…' : 'Choose JSON file'}</Button>
              <input ref={input} hidden type="file" accept="application/json,.json" onChange={doImport} />
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

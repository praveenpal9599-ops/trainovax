import { useMemo, useState } from 'react';
import { Button, Chip, Dialog, IconButton, MenuItem, TextField, Tooltip, Alert } from '@mui/material';
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import CompareIcon from '@mui/icons-material/Compare';
import CloseIcon from '@mui/icons-material/Close';
import useFetch from '../../hooks/useFetch';
import { progressService } from '../../services';
import { assetUrl } from '../../api/http';
import EmptyState from '../../components/common/EmptyState';
import FormDialog from '../../components/common/FormDialog';
import { useFeedback } from '../feedback/FeedbackProvider';
import { formatDate, todayISO } from '../../utils/format';
import './PhotoGallery.css';

const POSES = [{ value: 'front', label: 'Front' }, { value: 'side', label: 'Side' }, { value: 'back', label: 'Back' }, { value: 'other', label: 'Other' }];

function UploadDialog({ open, onClose, clientId, onUploaded }) {
  const [form, setForm] = useState({ pose: 'front', taken_on: todayISO(), notes: '', file: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const preview = useMemo(() => (form.file ? URL.createObjectURL(form.file) : null), [form.file]);
  const submit = async () => {
    if (!form.file) { setError('Choose a photo to upload'); return; }
    setBusy(true); setError(null);
    try { await progressService.uploadPhoto({ ...form, client_id: clientId }); onUploaded(); setForm({ pose: 'front', taken_on: todayISO(), notes: '', file: null }); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <FormDialog open={open} onClose={onClose} title="Upload progress photo" onSubmit={submit} loading={busy} submitText="Upload">
      {error && <Alert severity="error" className="photo-upload__error">{error}</Alert>}
      <div className="stack">
        <label className="photo-upload__drop">
          {preview ? <img src={preview} alt="Preview" className="photo-upload__preview" /> : (
            <div className="text-center"><AddAPhotoOutlinedIcon color="primary" /><p className="photo-upload__cta">Click to choose a photo</p><span className="text-caption text-muted">JPG, PNG or WebP up to 5 MB</span></div>
          )}
          <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} />
        </label>
        <div className="photo-upload__row">
          <TextField select label="Pose" value={form.pose} onChange={(e) => setForm((f) => ({ ...f, pose: e.target.value }))}>{POSES.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}</TextField>
          <TextField type="date" label="Date taken" value={form.taken_on} onChange={(e) => setForm((f) => ({ ...f, taken_on: e.target.value }))} InputLabelProps={{ shrink: true }} required />
        </div>
        <TextField label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
      </div>
    </FormDialog>
  );
}

/** Progress photo grid with upload, lightbox and side-by-side comparison. */
export default function PhotoGallery({ clientId, canEdit = true }) {
  const { confirm, notify, notifyError } = useFeedback();
  const { data, loading, reload } = useFetch(() => progressService.photos(clientId), [clientId], { enabled: !!clientId });
  const [upload, setUpload] = useState(false);
  const [view, setView] = useState(null);
  const [pose, setPose] = useState('');
  const [compare, setCompare] = useState(false);
  const photos = (data || []).filter((p) => !pose || p.pose === pose);

  const remove = async (p) => {
    if (!(await confirm({ title: 'Delete photo?', message: 'This progress photo will be permanently removed.', confirmText: 'Delete', danger: true }))) return;
    try { await progressService.deletePhoto(p.id); notify('Photo deleted'); reload(); } catch (e) { notifyError(e); }
  };
  const first = photos[photos.length - 1]; const last = photos[0];

  return (
    <div className="photo-gallery">
      <div className="row row--wrap photo-gallery__toolbar">
        {[{ value: '', label: 'All' }, ...POSES].map((p) => <Chip key={p.value} label={p.label} onClick={() => setPose(p.value)} color={pose === p.value ? 'primary' : 'default'} variant={pose === p.value ? 'filled' : 'outlined'} />)}
        <div className="flex-1" />
        {photos.length > 1 && <Button startIcon={<CompareIcon />} onClick={() => setCompare(true)}>Compare first vs latest</Button>}
        {canEdit && <Button variant="contained" startIcon={<AddAPhotoOutlinedIcon />} onClick={() => setUpload(true)}>Upload photo</Button>}
      </div>
      {!loading && photos.length === 0 ? (
        <div className="card"><EmptyState icon={PhotoLibraryOutlinedIcon} title="No progress photos yet" description="Photos taken in the same pose and lighting every 2–4 weeks make changes easy to see."
          action={canEdit && <Button variant="contained" startIcon={<AddAPhotoOutlinedIcon />} onClick={() => setUpload(true)}>Upload first photo</Button>} /></div>
      ) : (
        <ul className="photo-gallery__grid">
          {photos.map((p) => (
            <li key={p.id} className="card photo-gallery__item">
              <button type="button" onClick={() => setView(p)} className="photo-gallery__open" aria-label={`Open ${p.pose} photo from ${formatDate(p.taken_on)}`}>
                <img src={assetUrl(p.photo_url)} alt={`${p.pose} progress photo`} loading="lazy" className="photo-gallery__img" />
              </button>
              <div className="photo-gallery__meta">
                <div className="flex-1"><p className="photo-gallery__date">{formatDate(p.taken_on)}</p><span className="text-caption text-muted text-capitalize">{p.pose}</span></div>
                {canEdit && <Tooltip title="Delete"><IconButton size="small" onClick={() => remove(p)} aria-label="Delete photo"><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <UploadDialog open={upload} onClose={() => setUpload(false)} clientId={clientId} onUploaded={() => { setUpload(false); notify('Photo uploaded'); reload(); }} />
      <Dialog open={!!view} onClose={() => setView(null)} maxWidth="md">
        {view && (
          <div className="photo-lightbox">
            <IconButton onClick={() => setView(null)} className="photo-lightbox__close" aria-label="Close"><CloseIcon /></IconButton>
            <img src={assetUrl(view.photo_url)} alt="" className="photo-lightbox__img" />
            <div className="photo-lightbox__caption"><p className="photo-lightbox__title">{formatDate(view.taken_on)} · <span className="text-capitalize">{view.pose}</span></p>{view.notes && <p className="text-small text-muted">{view.notes}</p>}</div>
          </div>
        )}
      </Dialog>
      <Dialog open={compare} onClose={() => setCompare(false)} maxWidth="md" fullWidth>
        <div className="photo-compare">
          <div className="row row--between photo-compare__header"><h2 className="photo-compare__title">Before & after</h2><IconButton onClick={() => setCompare(false)} aria-label="Close"><CloseIcon /></IconButton></div>
          <div className="photo-compare__grid">
            {[first, last].filter(Boolean).map((p, i) => (
              <figure key={p.id} className="photo-compare__item">
                <figcaption className="text-overline photo-compare__caption">{i === 0 ? 'Before' : 'Latest'} · {formatDate(p.taken_on)}</figcaption>
                <img src={assetUrl(p.photo_url)} alt="" className="photo-compare__img" />
              </figure>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  );
}

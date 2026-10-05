import { useRef, useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { assetUrl } from '../../api/http';
import './ImageUpload.css';

/** Image picker with preview. onUpload(file) should return a promise. */
export default function ImageUpload({ value, onUpload, label = 'Upload image', round }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { await onUpload(file); } finally { setBusy(false); e.target.value = ''; }
  };
  return (
    <div className="image-upload">
      <div className={`image-upload__preview${round ? ' image-upload__preview--round' : ''}`}>
        {busy ? <CircularProgress size={24} /> : value ? <img src={assetUrl(value)} alt="" /> : <CloudUploadOutlinedIcon className="text-disabled" />}
      </div>
      <div>
        <Button variant="outlined" size="small" onClick={() => input.current?.click()} disabled={busy}>{label}</Button>
        <p className="image-upload__hint">JPG, PNG or WebP · up to 5 MB</p>
        <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={pick} />
      </div>
    </div>
  );
}

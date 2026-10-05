import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import LoadingButton from './LoadingButton';
import './FormDialog.css';

/** Reusable modal wrapper for forms. Full-screen on phones. */
export default function FormDialog({ open, title, onClose, onSubmit, submitText = 'Save', loading, children, maxWidth = 'sm', hideActions, extraActions, submitDisabled }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth={maxWidth} fullScreen={fullScreen} className="form-dialog"
      PaperProps={{ component: onSubmit ? 'form' : 'div', noValidate: true, onSubmit: onSubmit ? (e) => { e.preventDefault(); onSubmit(e); } : undefined }}>
      <DialogTitle className="form-dialog__title">
        {title}
        <IconButton aria-label="Close" onClick={onClose} disabled={loading} className="form-dialog__close"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers className={`form-dialog__content${hideActions ? ' form-dialog__content--no-actions' : ''}`}>{children}</DialogContent>
      {!hideActions && (
        <DialogActions className="form-dialog__actions">
          {extraActions}
          <Button onClick={onClose} color="inherit" disabled={loading}>Cancel</Button>
          {onSubmit && <LoadingButton type="submit" variant="contained" loading={loading} disabled={submitDisabled}>{submitText}</LoadingButton>}
        </DialogActions>
      )}
    </Dialog>
  );
}

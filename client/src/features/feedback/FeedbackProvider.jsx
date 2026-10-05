import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import './FeedbackProvider.css';

const FeedbackContext = createContext(null);

/** Global snackbar + confirmation dialog. Styles: FeedbackProvider.css */
export function FeedbackProvider({ children }) {
  const [snack, setSnack] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const resolver = useRef(null);

  const notify = useCallback((message, severity = 'success') => setSnack({ message, severity, key: Date.now() }), []);
  const notifyError = useCallback((err) => notify(err?.message || String(err) || 'Something went wrong', 'error'), [notify]);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setConfirmState({ title: 'Are you sure?', confirmText: 'Confirm', cancelText: 'Cancel', danger: false, ...opts });
  }), []);
  const close = (result) => { resolver.current?.(result); setConfirmState(null); };

  return (
    <FeedbackContext.Provider value={{ notify, notifyError, confirm }}>
      {children}
      <Snackbar key={snack?.key} open={!!snack} autoHideDuration={4000} onClose={(_, r) => r !== 'clickaway' && setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert variant="filled" severity={snack.severity} onClose={() => setSnack(null)} className="feedback__snack">{snack.message}</Alert> : undefined}
      </Snackbar>
      <Dialog open={!!confirmState} onClose={() => close(false)} maxWidth="xs" fullWidth aria-labelledby="confirm-title">
        {confirmState && (
          <>
            <DialogTitle id="confirm-title" className="feedback__confirm-title">
              {confirmState.danger && (
                <span className="feedback__danger-icon">
                  <WarningAmberRoundedIcon color="error" fontSize="small" />
                </span>
              )}
              {confirmState.title}
            </DialogTitle>
            <DialogContent><DialogContentText>{confirmState.message}</DialogContentText></DialogContent>
            <DialogActions>
              <Button onClick={() => close(false)} color="inherit">{confirmState.cancelText}</Button>
              <Button onClick={() => close(true)} variant="contained" color={confirmState.danger ? 'error' : 'primary'} autoFocus>{confirmState.confirmText}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => useContext(FeedbackContext);

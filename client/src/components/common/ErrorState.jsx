import { Alert, Button } from '@mui/material';

export default function ErrorState({ error, onRetry }) {
  if (!error) return null;
  return (
    <Alert severity="error" className="error-state" action={onRetry && <Button color="inherit" size="small" onClick={() => onRetry()}>Retry</Button>}>
      {error.status === 403 ? 'You do not have permission to view this.' : error.message || 'Something went wrong.'}
    </Alert>
  );
}

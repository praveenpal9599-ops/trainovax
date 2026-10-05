import { Button, CircularProgress } from '@mui/material';
export default function LoadingButton({ loading, children, disabled, startIcon, ...props }) {
  return (
    <Button {...props} disabled={disabled || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon} aria-busy={loading || undefined}>
      {children}
    </Button>
  );
}

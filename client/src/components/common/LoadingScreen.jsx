import { CircularProgress } from '@mui/material';
import './LoadingScreen.css';

export default function LoadingScreen({ label = 'Loading…', fullScreen }) {
  return (
    <div className={`loading-screen${fullScreen ? ' loading-screen--full' : ''}`} role="progressbar" aria-label={label}>
      <div className="loading-screen__inner">
        <CircularProgress size={32} />
        <p className="loading-screen__label">{label}</p>
      </div>
    </div>
  );
}

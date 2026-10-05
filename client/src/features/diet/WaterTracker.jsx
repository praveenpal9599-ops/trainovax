import { IconButton, LinearProgress, Tooltip } from '@mui/material';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import LocalDrinkOutlinedIcon from '@mui/icons-material/LocalDrinkOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import './WaterTracker.css';

const GLASS = 250;
/** Water intake: tap glasses (250 ml each) to log. Styles: WaterTracker.css */
export default function WaterTracker({ amount = 0, target = 3000, onChange, disabled }) {
  const glasses = Math.ceil(target / GLASS);
  const filled = Math.floor(amount / GLASS);
  const set = (ml) => !disabled && onChange(Math.max(0, Math.min(10000, ml)));
  return (
    <div className="water-tracker">
      <div className="water-tracker__head">
        <h3 className="water-tracker__title">Water intake</h3>
        <p className="water-tracker__amount"><b>{(amount / 1000).toFixed(2).replace(/0$/, '')} L</b> <span className="text-caption text-muted">/ {(target / 1000).toFixed(1)} L</span></p>
      </div>
      <LinearProgress variant="determinate" value={Math.min(100, (100 * amount) / target)} className="progress--water water-tracker__progress" />
      <div className="water-tracker__glasses">
        <IconButton size="small" onClick={() => set(amount - GLASS)} disabled={disabled || amount <= 0} aria-label="Remove a glass"><RemoveIcon fontSize="small" /></IconButton>
        {Array.from({ length: glasses }).map((_, i) => (
          <Tooltip key={i} title={`${(i + 1) * GLASS} ml`}>
            <IconButton size="small" onClick={() => set(i < filled ? i * GLASS : (i + 1) * GLASS)} disabled={disabled} aria-label={`Set water to ${(i + 1) * GLASS} ml`}
              className={`water-tracker__glass${i < filled ? ' water-tracker__glass--filled' : ''}`}>
              {i < filled ? <LocalDrinkIcon /> : <LocalDrinkOutlinedIcon />}
            </IconButton>
          </Tooltip>
        ))}
        <IconButton size="small" onClick={() => set(amount + GLASS)} disabled={disabled} aria-label="Add a glass"><AddIcon fontSize="small" /></IconButton>
      </div>
    </div>
  );
}

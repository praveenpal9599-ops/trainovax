import { Tooltip } from '@mui/material';
import './VegDot.css';

/** Indian-style veg / non-veg marker. Styles: VegDot.css */
export default function VegDot({ veg, vegan }) {
  const label = vegan ? 'Vegan' : veg ? 'Vegetarian' : 'Non-vegetarian';
  return (
    <Tooltip title={label}>
      <span role="img" aria-label={label} className={`veg-dot ${veg ? 'veg-dot--veg' : 'veg-dot--nonveg'}`}>
        <span className="veg-dot__dot" />
      </span>
    </Tooltip>
  );
}

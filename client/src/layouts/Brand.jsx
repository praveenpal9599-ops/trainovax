import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';
import { APP_NAME } from '../utils/constants';
import './Brand.css';

/** Logo mark + app name. Styles: Brand.css */
export default function Brand({ compact, inverted, subtitle }) {
  return (
    <div className={`brand ${inverted ? 'brand--inverted' : ''}`}>
      <span className="brand__mark"><FitnessCenterRoundedIcon /></span>
      {!compact && (
        <span className="brand__text">
          <span className="brand__name">{APP_NAME}</span>
          {subtitle && <span className="brand__subtitle">{subtitle}</span>}
        </span>
      )}
    </div>
  );
}

import { IconButton } from '@mui/material';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import { useNavigate } from 'react-router-dom';
import './mobile.css';

/** App-style page title with optional back button and trailing action. Styles: mobile.css */
export default function MobilePageHeader({ title, subtitle, back, action }) {
  const navigate = useNavigate();
  return (
    <header className="mobile-page-header">
      {back && (
        <div className="mobile-page-header__back">
          <IconButton size="small" onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))} aria-label="Back" color="primary">
            <ArrowBackIosNewRoundedIcon className="mobile-page-header__back-icon" />
          </IconButton>
          <span className="mobile-page-header__back-label" onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}>Back</span>
        </div>
      )}
      <div className="mobile-page-header__row">
        <div className="mobile-page-header__text">
          <h1 className="mobile-page-header__title">{title}</h1>
          {subtitle && <p className="mobile-page-header__subtitle">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

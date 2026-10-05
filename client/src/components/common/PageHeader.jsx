import { Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import './PageHeader.css';

/** Page title + optional breadcrumbs and action buttons. */
export default function PageHeader({ title, subtitle, breadcrumbs, actions, children }) {
  return (
    <header className={`page-header${title || actions ? '' : ' page-header--compact'}`}>
      {breadcrumbs?.length > 0 && (
        <Breadcrumbs className="page-header__crumbs" separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          {breadcrumbs.map((b, i) => (b.to && i < breadcrumbs.length - 1
            ? <Link key={b.label} component={RouterLink} to={b.to} underline="hover" className="page-header__crumb-link">{b.label}</Link>
            : <span key={b.label} className="page-header__crumb-current">{b.label}</span>))}
        </Breadcrumbs>
      )}
      {(title || actions) && (
        <div className="page-header__row">
          <div className="page-header__text">
            <h1 className="page-header__title">{title}</h1>
            {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="page-header__actions">{actions}</div>}
        </div>
      )}
      {children}
    </header>
  );
}

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Brand from './Brand';
import './AuthLayout.css';

const POINTS = [
  'Build structured workout & diet plans in minutes',
  'Track weight, measurements and body-fat with clear charts',
  'Give every client a personal app with today’s plan',
  'Message clients and send reminders in one place',
];

/** Split-screen layout for login / sign-up pages. Styles: AuthLayout.css */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth__hero">
        <span className="auth__ring" aria-hidden />
        <span className="auth__bubble" aria-hidden />
        <Brand inverted subtitle="Personal Training Platform" />
        <div className="auth__pitch">
          <h2 className="auth__headline">Coach smarter. Deliver results your clients can see.</h2>
          <p className="auth__lead">The all-in-one platform for personal trainers and gyms — from first assessment to final transformation.</p>
          <ul className="auth__points">
            {POINTS.map((p) => (
              <li key={p} className="auth__point"><CheckCircleRoundedIcon fontSize="small" className="auth__check" />{p}</li>
            ))}
          </ul>
        </div>
        <small className="auth__copy">© {new Date().getFullYear()} TrainovaX · Built for trainers</small>
      </aside>
      <section className="auth__panel">
        <div className="auth__form">
          <div className="auth__mobile-brand"><Brand subtitle="Personal Training Platform" /></div>
          <h1 className="auth__title">{title}</h1>
          {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          {children}
          {footer && <div className="auth__footer">{footer}</div>}
        </div>
      </section>
    </div>
  );
}

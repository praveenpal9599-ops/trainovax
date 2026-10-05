import './mobile.css';

/** Small uppercase section label with an accent bar. Styles: mobile.css */
export default function SectionLabel({ children, action }) {
  return (
    <div className="section-label">
      <div className="section-label__title">
        <span className="section-label__bar" />
        <span className="text-overline section-label__text">{children}</span>
      </div>
      {action}
    </div>
  );
}

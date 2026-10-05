import './SectionCard.css';

/** Card with a consistent header row (title, subtitle, action) and body. */
export default function SectionCard({ title, subtitle, action, children, noPadding, className = '', bodyClassName = '', id }) {
  return (
    <section className={`section-card card ${className}`} id={id}>
      {(title || action) && (
        <div className={`section-card__header${noPadding ? ' section-card__header--flush' : ''}`}>
          <div className="section-card__heading">
            {title && <h2 className="section-card__title truncate">{title}</h2>}
            {subtitle && <p className="section-card__subtitle">{subtitle}</p>}
          </div>
          {action && <div className="section-card__action">{action}</div>}
        </div>
      )}
      <div className={`section-card__body${noPadding ? ' section-card__body--flush' : ''}${!title && !action ? ' section-card__body--no-header' : ''} ${bodyClassName}`}>{children}</div>
    </section>
  );
}

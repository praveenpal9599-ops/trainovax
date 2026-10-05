import './InfoRow.css';

/** Label/value pair for detail views. */
export default function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="info-row">
      {Icon && <Icon className="info-row__icon" fontSize="small" />}
      <div className="info-row__text">
        <span className="info-row__label">{label}</span>
        <span className="info-row__value">{value ?? '—'}</span>
      </div>
    </div>
  );
}

import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import './EmptyState.css';

export default function EmptyState({ icon: Icon = InboxOutlinedIcon, title = 'Nothing here yet', description, action, compact }) {
  return (
    <div className={`empty-state${compact ? ' empty-state--compact' : ''}`} role="status">
      <div className="empty-state__icon"><Icon /></div>
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__desc">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

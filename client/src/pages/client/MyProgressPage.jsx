import ProgressDashboard from '../../features/progress/ProgressDashboard';
import { useAuth } from '../../features/auth/AuthContext';
import './client-pages.css';

export default function MyProgressPage() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="client-page__title">My progress</h1>
      <p className="client-page__subtitle">Log your measurements every 1–2 weeks to see how far you've come.</p>
      <ProgressDashboard clientId={user.client_id} canEdit />
    </div>
  );
}

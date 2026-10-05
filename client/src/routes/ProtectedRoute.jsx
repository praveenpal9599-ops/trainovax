import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROLE_HOME, useAuth } from '../features/auth/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';

/** Requires authentication and one of `roles`. Users of another role are sent to their own home. */
export default function ProtectedRoute({ roles }) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingScreen fullScreen label="Loading your workspace…" />;
  if (status !== 'authenticated' || !user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { status, user } = useAuth();
  if (status === 'loading') return <LoadingScreen fullScreen />;
  return <Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />;
}

import PhotoGallery from '../../features/progress/PhotoGallery';
import { useAuth } from '../../features/auth/AuthContext';
import './client-pages.css';

export default function MyPhotosPage() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="client-page__title">Progress photos</h1>
      <p className="client-page__subtitle">Private to you and your trainer. Use the same pose and lighting each time.</p>
      <PhotoGallery clientId={user.client_id} />
    </div>
  );
}

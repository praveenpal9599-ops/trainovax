import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SectionCard from '../../components/common/SectionCard';
import UserAvatar from '../../components/common/UserAvatar';
import EmptyState from '../../components/common/EmptyState';
import './TrainerCard.css';

export default function TrainerCard({ trainer }) {
  const navigate = useNavigate();
  return (
    <SectionCard title="Your trainer">
      {!trainer ? <EmptyState compact title="No trainer assigned yet" /> : (
        <div>
          <div className="trainer-card__head">
            <UserAvatar name={trainer.name} src={trainer.avatar_url} size={52} />
            <div className="trainer-card__info">
              <h3 className="trainer-card__name">{trainer.name}</h3>
              <span className="text-caption text-muted">{trainer.specialization}{trainer.experience_years ? ` · ${trainer.experience_years} yrs experience` : ''}</span>
            </div>
          </div>
          {trainer.bio && <p className="text-small text-muted trainer-card__bio">{trainer.bio}</p>}
          {trainer.certifications && <span className="text-caption text-muted trainer-card__certs">Certified: {trainer.certifications}</span>}
          <div className="row trainer-card__actions">
            <Button variant="contained" startIcon={<ChatBubbleOutlineIcon />} onClick={() => navigate(`/client/messages?with=${trainer.user_id}`)}>Message</Button>
            {trainer.phone && <Button variant="outlined" href={`tel:${trainer.phone.replace(/\s/g, '')}`}>Call</Button>}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

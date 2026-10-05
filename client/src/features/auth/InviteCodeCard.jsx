import { Button } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import { useAuth } from './AuthContext';
import { useFeedback } from '../feedback/FeedbackProvider';
import './InviteCodeCard.css';

/** Shows the trainer's client invite code with copy / share actions. Styles: InviteCodeCard.css */
export default function InviteCodeCard({ compact }) {
  const { user } = useAuth();
  const { notify } = useFeedback();
  if (!user?.invite_code) return null;
  const link = `${window.location.origin}/register?as=client&code=${user.invite_code}`;
  const text = `Join me on TrainovaX! Sign up as a client with my trainer code ${user.invite_code}: ${link}`;
  const copy = async () => { try { await navigator.clipboard.writeText(user.invite_code); notify('Code copied'); } catch { notify(user.invite_code, 'info'); } };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'TrainovaX', text }); } catch { /* cancelled */ } return; }
    try { await navigator.clipboard.writeText(text); notify('Invite message copied'); } catch { notify(text, 'info'); }
  };
  return (
    <div className={`card invite-code ${compact ? 'invite-code--compact' : ''}`.trim()}>
      <div className="invite-code__row">
        <span className="invite-code__icon"><QrCode2RoundedIcon /></span>
        <div className="flex-1">
          <span className="invite-code__label">Your client code</span>
          <p className="invite-code__code">{user.invite_code}</p>
        </div>
        <Button size="small" variant="outlined" onClick={copy} startIcon={<ContentCopyRoundedIcon />}>Copy</Button>
        <Button size="small" variant="contained" onClick={share} startIcon={<ShareRoundedIcon />}>Invite</Button>
      </div>
      {!compact && <span className="invite-code__help">Clients enter this code when they sign up in the app — they’re added to your client list automatically.</span>}
    </div>
  );
}

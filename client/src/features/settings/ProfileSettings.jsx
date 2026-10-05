import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '@mui/material';
import SectionCard from '../../components/common/SectionCard';
import LoadingButton from '../../components/common/LoadingButton';
import ImageUpload from '../../components/common/ImageUpload';
import { FormTextField } from '../../components/form/FormFields';
import { password } from '../../components/form/zod';
import { authService } from '../../services';
import { useAuth } from '../auth/AuthContext';
import { useFeedback } from '../feedback/FeedbackProvider';
import './ProfileSettings.css';

/** Shared profile + password settings for every role. Styles: ProfileSettings.css */
export default function ProfileSettings() {
  const { user, setUser } = useAuth();
  const { notify } = useFeedback();
  const [pErr, setPErr] = useState(null);
  const profile = useForm({ resolver: zodResolver(z.object({ name: z.string().trim().min(2, 'Name is required'), phone: z.string().optional().nullable() })), defaultValues: { name: user.name, phone: user.phone || '' } });
  const pwd = useForm({ resolver: zodResolver(z.object({ currentPassword: z.string().min(1, 'Current password is required'), newPassword: password, confirm: z.string() }).refine((d) => d.newPassword === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });

  const saveProfile = profile.handleSubmit(async (v) => { try { setUser(await authService.updateMe(v)); notify('Profile updated'); } catch (e) { notify(e.message, 'error'); } });
  const savePwd = pwd.handleSubmit(async (v) => {
    setPErr(null);
    try { await authService.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }); notify('Password changed'); pwd.reset(); } catch (e) { setPErr(e.message); }
  });

  return (
    <div className="profile-settings">
      <div>
        <SectionCard title="Profile" subtitle="How you appear across the platform">
          <div className="profile-settings__photo"><ImageUpload round value={user.avatar_url} label="Change photo" onUpload={async (file) => { setUser(await authService.uploadAvatar(file)); notify('Photo updated'); }} /></div>
          <form className="stack" noValidate onSubmit={saveProfile}>
            <FormTextField control={profile.control} name="name" label="Full name" required />
            <FormTextField control={profile.control} name="phone" label="Phone" />
            <div><span className="profile-settings__label">Email</span><p className="profile-settings__value">{user.email}</p></div>
            <div><LoadingButton type="submit" variant="contained" loading={profile.formState.isSubmitting}>Save profile</LoadingButton></div>
          </form>
        </SectionCard>
      </div>
      <div>
        <SectionCard title="Change password" subtitle="Use at least 8 characters with a letter and a number">
          {pErr && <Alert severity="error" className="profile-settings__alert">{pErr}</Alert>}
          <form className="stack profile-settings__password" noValidate onSubmit={savePwd}>
            <FormTextField control={pwd.control} name="currentPassword" label="Current password" type="password" required autoComplete="current-password" />
            <FormTextField control={pwd.control} name="newPassword" label="New password" type="password" required autoComplete="new-password" />
            <FormTextField control={pwd.control} name="confirm" label="Confirm new password" type="password" required autoComplete="new-password" />
            <div><LoadingButton type="submit" variant="contained" loading={pwd.formState.isSubmitting}>Update password</LoadingButton></div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}

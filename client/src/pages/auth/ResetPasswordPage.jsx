import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Link } from '@mui/material';
import AuthLayout from '../../layouts/AuthLayout';
import { FormTextField } from '../../components/form/FormFields';
import LoadingButton from '../../components/common/LoadingButton';
import { password } from '../../components/form/zod';
import { authService } from '../../services';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import './auth-pages.css';

const schema = z.object({ password, confirm: z.string() }).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const [error, setError] = useState(null);
  const { control, handleSubmit, formState: { isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });
  const onSubmit = async (v) => {
    setError(null);
    try { await authService.resetPassword(token, v.password); notify('Password updated — please sign in'); navigate('/login'); } catch (err) { setError(err.message); }
  };
  return (
    <AuthLayout title="Choose a new password" subtitle="Your new password must be at least 8 characters and include a letter and a number."
      footer={<Link component={RouterLink} to="/login" className="auth-page__link">← Back to sign in</Link>}>
      {!token && <Alert severity="warning" className="auth-page__alert">This reset link is missing its token. Request a new link.</Alert>}
      {error && <Alert severity="error" className="auth-page__alert">{error}</Alert>}
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="auth-page__fields">
          <FormTextField control={control} name="password" label="New password" type="password" required autoComplete="new-password" size="medium" />
          <FormTextField control={control} name="confirm" label="Confirm new password" type="password" required autoComplete="new-password" size="medium" />
          <LoadingButton type="submit" variant="contained" size="large" loading={isSubmitting} disabled={!token} fullWidth>Update password</LoadingButton>
        </div>
      </form>
    </AuthLayout>
  );
}

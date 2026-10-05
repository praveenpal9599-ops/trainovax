import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Link } from '@mui/material';
import AuthLayout from '../../layouts/AuthLayout';
import { FormTextField } from '../../components/form/FormFields';
import LoadingButton from '../../components/common/LoadingButton';
import { authService } from '../../services';
import './auth-pages.css';

export default function ForgotPasswordPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const { control, handleSubmit, formState: { isSubmitting } } = useForm({ resolver: zodResolver(z.object({ email: z.string().trim().email('Enter a valid email address') })), defaultValues: { email: '' } });
  const onSubmit = async ({ email }) => {
    setError(null);
    try { setResult(await authService.forgotPassword(email)); } catch (err) { setError(err.message); }
  };
  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we'll send you a link to reset it."
      footer={<Link component={RouterLink} to="/login" className="auth-page__link">← Back to sign in</Link>}>
      {error && <Alert severity="error" className="auth-page__alert">{error}</Alert>}
      {result ? (
        <div className="auth-page__fields">
          <Alert severity="success">{result.message}</Alert>
          {result.devResetUrl && (
            <Alert severity="info">
              <p className="text-small text-medium">Development mode</p>
              <p className="text-small">No email service is configured, so here is your reset link:</p>
              <Link component={RouterLink} to={new URL(result.devResetUrl).pathname + new URL(result.devResetUrl).search} className="forgot__reset-link">Open reset page</Link>
            </Alert>
          )}
        </div>
      ) : (
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <div className="auth-page__fields">
            <FormTextField control={control} name="email" label="Email address" type="email" required placeholder="you@example.com" autoFocus size="medium" />
            <LoadingButton type="submit" variant="contained" size="large" loading={isSubmitting} fullWidth>Send reset link</LoadingButton>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

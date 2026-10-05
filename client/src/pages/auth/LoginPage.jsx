import { useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Chip, Divider, IconButton, InputAdornment, Link } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AuthLayout from '../../layouts/AuthLayout';
import { FormCheckbox, FormTextField } from '../../components/form/FormFields';
import LoadingButton from '../../components/common/LoadingButton';
import AccountTypeTabs, { useAccountType } from '../../features/auth/AccountTypeTabs';
import { ROLE_HOME, useAuth } from '../../features/auth/AuthContext';
import './auth-pages.css';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
});

const DEMO = import.meta.env.DEV ? {
  trainer: [
    { label: 'Trainer', email: 'rohit@trainovax.fit', password: 'Trainer@123' },
    { label: 'Gym admin', email: 'ajay@trainovax.fit', password: 'Trainer@123' },
    { label: 'Super Admin', email: 'admin@trainovax.fit', password: 'Admin@123' },
  ],
  client: [{ label: 'Client', email: 'rahul@example.com', password: 'Client@123' }],
} : { trainer: [], client: [] };

const COPY = {
  trainer: { title: 'Trainer sign in', subtitle: 'Manage your clients, plans and progress. Gym admins sign in here too.', cta: 'Sign in as trainer' },
  client: { title: 'Client sign in', subtitle: 'See today’s workout and diet, and track your progress.', cta: 'Sign in as client' },
};

export default function LoginPage() {
  const { login, status, user, expired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [type, setType] = useAccountType();
  const [error, setError] = useState(null);
  const [show, setShow] = useState(false);
  const { control, handleSubmit, setValue, formState: { isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '', remember: true } });

  if (status === 'authenticated' && user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const onSubmit = async (values) => {
    setError(null);
    try {
      const u = await login({ ...values, portal: type });
      const from = location.state?.from;
      navigate(from && from.startsWith(ROLE_HOME[u.role].split('/').slice(0, 2).join('/')) ? from : ROLE_HOME[u.role], { replace: true });
    } catch (err) { setError(err.message); }
  };
  const switchType = (t) => { setType(t); setError(null); };

  return (
    <AuthLayout title={COPY[type].title} subtitle={COPY[type].subtitle}
      footer={(
        <p className="auth-page__footer-text">
          {type === 'client' ? 'New client? ' : 'New trainer or gym? '}
          <Link component={RouterLink} to={`/register?as=${type}`} className="auth-page__link">Create an account</Link>
        </p>
      )}>
      <AccountTypeTabs value={type} onChange={switchType} />
      {expired && !error && <Alert severity="info" className="auth-page__alert">Your session expired. Please sign in again.</Alert>}
      {error && (
        <Alert severity="error" className="auth-page__alert"
          action={/Switch to the (Client|Trainer) tab/.test(error) ? <Link component="button" type="button" className="login__switch" onClick={() => switchType(type === 'client' ? 'trainer' : 'client')}>Switch</Link> : undefined}>
          {error}
        </Alert>
      )}
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="auth-page__fields login__fields">
          <FormTextField control={control} name="email" label="Email address" type="email" required autoComplete="email" placeholder={type === 'client' ? 'you@example.com' : 'coach@studio.com'} size="medium" />
          <FormTextField control={control} name="password" label="Password" type={show ? 'text' : 'password'} required autoComplete="current-password" placeholder="Enter your password" size="medium"
            InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShow((s) => !s)} edge="end" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment> }} />
          <div className="row row--between">
            <FormCheckbox control={control} name="remember" label="Keep me signed in" />
            <Link component={RouterLink} to="/forgot-password" variant="body2" className="auth-page__link">Forgot password?</Link>
          </div>
          <LoadingButton type="submit" variant="contained" size="large" loading={isSubmitting} fullWidth>{COPY[type].cta}</LoadingButton>
        </div>
      </form>
      {DEMO[type].length > 0 && (
        <div className="login__demo">
          <Divider className="login__demo-divider"><span className="login__demo-label">Demo accounts</span></Divider>
          <div className="login__demo-chips">
            {DEMO[type].map((d) => <Chip key={d.label} label={d.label} variant="outlined" clickable onClick={() => { setValue('email', d.email); setValue('password', d.password); }} />)}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

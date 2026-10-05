import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Collapse, InputAdornment, Link } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import AuthLayout from '../../layouts/AuthLayout';
import { FormCheckbox, FormSelect, FormTextField } from '../../components/form/FormFields';
import { optionalNumber, password } from '../../components/form/zod';
import LoadingButton from '../../components/common/LoadingButton';
import UserAvatar from '../../components/common/UserAvatar';
import AccountTypeTabs, { useAccountType } from '../../features/auth/AccountTypeTabs';
import { ROLE_HOME, useAuth } from '../../features/auth/AuthContext';
import useDebounce from '../../hooks/useDebounce';
import { authService } from '../../services';
import { GENDERS, GOALS } from '../../utils/constants';
import './auth-pages.css';

const common = {
  name: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().optional(),
  password,
  confirm: z.string(),
};
const match = (d) => d.password === d.confirm;
const trainerSchema = z.object({ ...common, organizationName: z.string().trim().max(150).optional(), specialization: z.string().trim().max(150).optional(), isGymOwner: z.boolean() })
  .refine(match, { message: 'Passwords do not match', path: ['confirm'] })
  .refine((d) => !d.isGymOwner || (d.organizationName && d.organizationName.length >= 2), { message: 'Gym / studio name is required', path: ['organizationName'] });
const clientSchema = z.object({
  ...common,
  trainerCode: z.string().trim().min(4, 'Enter the code your trainer gave you'),
  gender: z.string().nullable().optional(),
  age: optionalNumber(10, 100, 'Age'),
  height_cm: optionalNumber(80, 250, 'Height'),
  weight_kg: optionalNumber(20, 400, 'Weight'),
  fitness_goal: z.string(),
}).refine(match, { message: 'Passwords do not match', path: ['confirm'] });

const blankTrainer = { name: '', email: '', phone: '', password: '', confirm: '', organizationName: '', specialization: '', isGymOwner: false };
const blankClient = { name: '', email: '', phone: '', password: '', confirm: '', trainerCode: '', gender: null, age: null, height_cm: null, weight_kg: null, fitness_goal: 'general_fitness' };

/** Looks up the trainer code as the client types and shows who they are joining. */
function TrainerCodeStatus({ code, onResult }) {
  const q = useDebounce((code || '').trim().toUpperCase(), 400);
  const [state, setState] = useState({ status: 'idle' });
  useEffect(() => {
    if (q.length < 4) { setState({ status: 'idle' }); onResult(null); return; }
    let alive = true;
    setState({ status: 'loading' });
    authService.trainerByCode(q)
      .then((t) => { if (alive) { setState({ status: 'ok', trainer: t }); onResult(t); } })
      .catch(() => { if (alive) { setState({ status: 'missing' }); onResult(null); } });
    return () => { alive = false; };
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  if (state.status === 'ok') {
    return (
      <div className="register__trainer-found">
        <UserAvatar name={state.trainer.name} src={state.trainer.avatar_url} size={36} />
        <div className="flex-1">
          <p className="register__trainer-name">You'll join {state.trainer.name}</p>
          <span className="register__trainer-meta">{[state.trainer.organization_name, state.trainer.specialization].filter(Boolean).join(' · ')}</span>
        </div>
        <CheckCircleRoundedIcon color="success" />
      </div>
    );
  }
  if (state.status === 'missing') return <span className="register__trainer-missing"><ErrorOutlineRoundedIcon />No trainer found with this code</span>;
  return null;
}

function TrainerForm({ onDone, setError }) {
  const { register } = useAuth();
  const { control, handleSubmit, formState: { isSubmitting } } = useForm({ resolver: zodResolver(trainerSchema), defaultValues: blankTrainer });
  const isGymOwner = useWatch({ control, name: 'isGymOwner' });
  const submit = handleSubmit(async ({ confirm, ...v }) => { // eslint-disable-line no-unused-vars
    setError(null);
    try { onDone(await register({ accountType: 'trainer', ...v, organizationName: v.organizationName || undefined, specialization: v.specialization || undefined })); } catch (e) { setError(e.message); }
  });
  return (
    <form noValidate onSubmit={submit}>
      <div className="auth-page__fields">
        <FormTextField control={control} name="name" label="Your full name" required placeholder="e.g. Rohit Kumar" autoComplete="name" />
        <div className="register__contact">
          <FormTextField control={control} name="email" label="Email" type="email" required placeholder="coach@studio.com" autoComplete="email" />
          <FormTextField control={control} name="phone" label="Phone" placeholder="+91 98xxx xxxxx" autoComplete="tel" />
        </div>
        <FormTextField control={control} name="organizationName" label={isGymOwner ? 'Gym / studio name' : 'Studio / brand name'} required={isGymOwner}
          placeholder={isGymOwner ? 'e.g. Elevate Fitness Studio' : 'Optional — e.g. Rohit Fitness'} />
        <FormTextField control={control} name="specialization" label="Specialization" placeholder="Optional — e.g. Fat loss, strength" />
        <FormTextField control={control} name="password" label="Password" type="password" required helperText="At least 8 characters with a letter and a number" autoComplete="new-password" />
        <FormTextField control={control} name="confirm" label="Confirm password" type="password" required autoComplete="new-password" />
        <div className="register__owner">
          <FormCheckbox control={control} name="isGymOwner" label="I own a gym / studio and will manage other trainers" />
          <Collapse in={isGymOwner}><span className="register__owner-hint">You'll get the desktop admin panel to add trainers and see every client in your gym.</span></Collapse>
        </div>
        <LoadingButton type="submit" variant="contained" size="large" loading={isSubmitting} fullWidth>Create trainer account</LoadingButton>
        <span className="auth-page__note">14-day free trial · no card required. You'll get a client code to share with your clients.</span>
      </div>
    </form>
  );
}

function ClientForm({ onDone, setError }) {
  const { register } = useAuth();
  const [params] = useSearchParams();
  const [trainer, setTrainer] = useState(null);
  const { control, handleSubmit, setError: setFieldError, formState: { isSubmitting } } = useForm({ resolver: zodResolver(clientSchema), defaultValues: { ...blankClient, trainerCode: (params.get('code') || '').toUpperCase() } });
  const code = useWatch({ control, name: 'trainerCode' });
  const submit = handleSubmit(async ({ confirm, ...v }) => { // eslint-disable-line no-unused-vars
    setError(null);
    if (!trainer) { setFieldError('trainerCode', { message: 'Enter a valid trainer code' }); return; }
    try { onDone(await register({ accountType: 'client', ...v, trainerCode: v.trainerCode.trim().toUpperCase(), gender: v.gender || null })); } catch (e) { setError(e.message); }
  });
  return (
    <form noValidate onSubmit={submit}>
      <div className="auth-page__fields">
        <FormTextField control={control} name="trainerCode" label="Trainer code" required placeholder="e.g. ROHIT01" helperText="Ask your trainer for their code"
          transform={(v) => v.toUpperCase().replace(/\s/g, '')} inputProps={{ className: 'register__code-input' }}
          InputProps={{ endAdornment: trainer ? <InputAdornment position="end"><CheckCircleRoundedIcon color="success" /></InputAdornment>  : undefined }} />
        <TrainerCodeStatus code={code} onResult={setTrainer} />
        <FormTextField control={control} name="name" label="Your full name" required placeholder="e.g. Rahul Verma" autoComplete="name" />
        <div className="register__contact">
          <FormTextField control={control} name="email" label="Email" type="email" required placeholder="you@example.com" autoComplete="email" />
          <FormTextField control={control} name="phone" label="Phone" placeholder="+91 98xxx xxxxx" autoComplete="tel" />
        </div>
        <span className="text-overline register__about">About you (optional)</span>
        <div className="register__about-grid">
          <FormSelect control={control} name="gender" label="Gender" options={GENDERS} emptyLabel="—" />
          <FormTextField control={control} name="age" label="Age" type="number" unit="yrs" />
          <FormTextField control={control} name="height_cm" label="Height" type="number" unit="cm" />
          <FormTextField control={control} name="weight_kg" label="Weight" type="number" unit="kg" />
          <div className="span-full"><FormSelect control={control} name="fitness_goal" label="Main goal" options={GOALS} /></div>
        </div>
        <FormTextField control={control} name="password" label="Password" type="password" required helperText="At least 8 characters with a letter and a number" autoComplete="new-password" />
        <FormTextField control={control} name="confirm" label="Confirm password" type="password" required autoComplete="new-password" />
        <LoadingButton type="submit" variant="contained" size="large" loading={isSubmitting} fullWidth>Create client account</LoadingButton>
        <span className="auth-page__note">Your trainer is notified as soon as you join and will set up your plans.</span>
      </div>
    </form>
  );
}

const COPY = {
  trainer: { title: 'Create your trainer account', subtitle: 'Coach clients from your phone — plans, progress and chat in one app.' },
  client: { title: 'Join your trainer', subtitle: 'Sign up with the code your trainer shared to get your workouts and diet.' },
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [type, setType] = useAccountType();
  const [error, setError] = useState(null);
  const done = (user) => navigate(ROLE_HOME[user.role], { replace: true });
  return (
    <AuthLayout title={COPY[type].title} subtitle={COPY[type].subtitle}
      footer={<p className="auth-page__footer-text">Already have an account? <Link component={RouterLink} to={`/login?as=${type}`} className="auth-page__link">Sign in</Link></p>}>
      <AccountTypeTabs value={type} onChange={(t) => { setType(t); setError(null); }} />
      {error && <Alert severity="error" className="auth-page__alert">{error}</Alert>}
      {type === 'trainer' ? <TrainerForm key="t" onDone={done} setError={setError} /> : <ClientForm key="c" onDone={done} setError={setError} />}
    </AuthLayout>
  );
}

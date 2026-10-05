import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Step, StepLabel, Stepper, useMediaQuery, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FormDialog from '../../components/common/FormDialog';
import LoadingButton from '../../components/common/LoadingButton';
import { FormAutocomplete, FormSelect, FormSwitch, FormTextField } from '../../components/form/FormFields';
import FormSection from '../../components/form/FormSection';
import { optionalNumber, requiredString, optionalEmail } from '../../components/form/zod';
import { ACTIVITY_LEVELS, DIET_PREFS, DIFFICULTIES, GENDERS, GOALS, WORKOUT_TIMES, labelOf } from '../../utils/constants';
import { bmi, todayISO } from '../../utils/format';
import { clientService } from '../../services';
import { useFeedback } from '../feedback/FeedbackProvider';
import { useAuth } from '../auth/AuthContext';
import { useLookups } from '../lookups/LookupsContext';
import './ClientFormDialog.css';

const STEPS = ['Personal details', 'Body & goals', 'Health & lifestyle', 'Account & review'];
const STEP_FIELDS = [
  ['full_name', 'gender', 'age', 'phone', 'email', 'date_of_birth', 'occupation', 'address'],
  ['height_cm', 'weight_kg', 'fitness_goal', 'target_weight_kg', 'activity_level', 'experience_level', 'workout_days_per_week', 'preferred_workout_time'],
  ['dietary_preference', 'medical_conditions', 'injuries', 'allergies', 'medications', 'sleep_hours', 'water_goal_ml', 'emergency_contact_name', 'emergency_contact_phone', 'notes'],
  ['trainer_id', 'status', 'joined_on', 'create_login', 'password'],
];
const PROFILE_KEYS = ['date_of_birth', 'address', 'occupation', 'emergency_contact_name', 'emergency_contact_phone', 'target_weight_kg', 'activity_level', 'experience_level',
  'dietary_preference', 'medical_conditions', 'injuries', 'allergies', 'medications', 'workout_days_per_week', 'preferred_workout_time', 'sleep_hours', 'water_goal_ml'];

const schema = z.object({
  full_name: requiredString('Full name', 120),
  gender: z.string().nullable().optional(),
  age: optionalNumber(10, 100, 'Age'),
  phone: z.string().trim().regex(/^([+\d][\d\s-]{6,19})?$/, 'Enter a valid phone number').optional().nullable(),
  email: optionalEmail,
  date_of_birth: z.string().optional().nullable(),
  occupation: z.string().max(120).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  height_cm: optionalNumber(80, 250, 'Height'),
  weight_kg: optionalNumber(20, 400, 'Weight'),
  fitness_goal: z.string({ required_error: 'Select a goal' }).min(1, 'Select a goal'),
  target_weight_kg: optionalNumber(20, 400, 'Target weight'),
  activity_level: z.string().nullable().optional(),
  experience_level: z.string().nullable().optional(),
  workout_days_per_week: optionalNumber(0, 7, 'Days per week'),
  preferred_workout_time: z.string().nullable().optional(),
  dietary_preference: z.string().nullable().optional(),
  medical_conditions: z.string().max(500).optional().nullable(),
  injuries: z.string().max(500).optional().nullable(),
  allergies: z.string().max(255).optional().nullable(),
  medications: z.string().max(255).optional().nullable(),
  sleep_hours: optionalNumber(0, 24, 'Sleep'),
  water_goal_ml: optionalNumber(0, 10000, 'Water goal'),
  emergency_contact_name: z.string().max(120).optional().nullable(),
  emergency_contact_phone: z.string().max(30).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  trainer_id: z.any().optional(),
  status: z.enum(['active', 'inactive']),
  joined_on: z.string().optional().nullable(),
  create_login: z.boolean(),
  password: z.string().optional().nullable(),
  has_login: z.boolean().optional(),
}).superRefine((d, ctx) => {
  if (d.create_login && !d.has_login) {
    if (!d.email) ctx.addIssue({ path: ['email'], code: 'custom', message: 'Email is required to create a login' });
    if (!d.password || d.password.length < 8 || !/[A-Za-z]/.test(d.password) || !/\d/.test(d.password)) ctx.addIssue({ path: ['password'], code: 'custom', message: 'Min 8 characters incl. a letter and a number' });
  }
});

const blank = {
  full_name: '', gender: null, age: null, phone: '', email: '', date_of_birth: '', occupation: '', address: '', height_cm: null, weight_kg: null,
  fitness_goal: 'general_fitness', target_weight_kg: null, activity_level: null, experience_level: 'beginner', workout_days_per_week: 4, preferred_workout_time: null,
  dietary_preference: null, medical_conditions: '', injuries: '', allergies: '', medications: '', sleep_hours: null, water_goal_ml: 3000,
  emergency_contact_name: '', emergency_contact_phone: '', notes: '', trainer_id: null, status: 'active', joined_on: todayISO(), create_login: true, password: '', has_login: false,
};

function toForm(client) {
  if (!client) return blank;
  const p = client.profile || {};
  const v = { ...blank };
  Object.keys(blank).forEach((k) => { if (client[k] !== undefined && client[k] !== null) v[k] = client[k]; if (p[k] !== undefined && p[k] !== null) v[k] = p[k]; });
  v.weight_kg = client.current_weight_kg;
  v.has_login = !!client.user_id;
  v.create_login = false;
  v.password = '';
  return v;
}

/** Multi-step Add / Edit client wizard. */
export default function ClientFormDialog({ open, client, onClose, onSaved }) {
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { trainers } = useLookups();
  const { notify } = useFeedback();
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const editing = !!client;
  const { control, handleSubmit, reset, trigger, getValues, formState: { isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: toForm(client), mode: 'onTouched' });
  const [createLogin, hasLogin, height, weight] = useWatch({ control, name: ['create_login', 'has_login', 'height_cm', 'weight_kg'] });

  useEffect(() => { if (open) { reset(toForm(client)); setStep(0); setError(null); } }, [open, client, reset]);

  const trainerOptions = useMemo(() => trainers.map((t) => ({ value: t.id, label: `${t.name}${t.organization_name ? ` · ${t.organization_name}` : ''}` })), [trainers]);
  const next = async () => { if (await trigger(STEP_FIELDS[step])) setStep((s) => s + 1); };

  const submit = handleSubmit(async (v) => {
    setError(null);
    const profile = Object.fromEntries(PROFILE_KEYS.map((k) => [k, v[k] === '' ? null : v[k]]));
    const payload = {
      full_name: v.full_name, gender: v.gender || null, age: v.age, phone: v.phone || null, email: v.email || null, height_cm: v.height_cm,
      fitness_goal: v.fitness_goal, notes: v.notes || null, status: v.status, joined_on: v.joined_on || null, profile,
      create_login: !v.has_login && v.create_login, password: v.password || undefined,
      ...(['super_admin', 'admin'].includes(user.role) ? { trainer_id: v.trainer_id || null } : {}),
      ...(editing ? { current_weight_kg: v.weight_kg } : { weight_kg: v.weight_kg }),
    };
    try {
      const saved = editing ? await clientService.update(client.id, payload) : await clientService.create(payload);
      notify(editing ? 'Client updated' : `${saved.full_name} added`);
      onSaved?.(saved);
    } catch (err) {
      setError(err.message);
      const field = err.details?.[0]?.field?.split('.').pop();
      const idx = STEP_FIELDS.findIndex((f) => f.includes(field));
      if (idx >= 0) setStep(idx);
    }
  }, (errs) => {
    const idx = STEP_FIELDS.findIndex((f) => f.some((k) => errs[k]));
    if (idx >= 0) setStep(idx);
  });

  const b = bmi(Number(weight), Number(height));
  const values = getValues();

  return (
    <FormDialog open={open} onClose={onClose} title={editing ? `Edit ${client.full_name}` : 'Add new client'} maxWidth="md" hideActions onSubmit={() => (step < 3 ? next() : submit())}>
      <Stepper activeStep={step} alternativeLabel={!small} orientation="horizontal" className="client-form__stepper">
        {STEPS.map((s, i) => <Step key={s}><StepLabel>{small && i !== step ? '' : s}</StepLabel></Step>)}
      </Stepper>
      {error && <Alert severity="error" className="client-form__alert">{error}</Alert>}

      <div hidden={step !== 0}>
        <div className="client-form__grid">
          <div className="client-form__col--sm-8"><FormTextField control={control} name="full_name" label="Full name" required placeholder="e.g. Rahul Verma" autoFocus /></div>
          <div className="client-form__col--half client-form__col--sm-4"><FormSelect control={control} name="gender" label="Gender" options={GENDERS} emptyLabel="Not specified" /></div>
          <div className="client-form__col--half client-form__col--sm-4"><FormTextField control={control} name="age" label="Age" type="number" placeholder="e.g. 30" unit="yrs" /></div>
          <div className="client-form__col--sm-4"><FormTextField control={control} name="phone" label="Phone" placeholder="+91 98xxx xxxxx" /></div>
          <div className="client-form__col--sm-6"><FormTextField control={control} name="email" label="Email" type="email" placeholder="client@example.com" helperText="Needed for the client app login" /></div>
        </div>
      </div>

      <div hidden={step !== 1}>
        <div className="client-form__grid">
          <div className="client-form__col--half client-form__col--sm-4"><FormTextField control={control} name="height_cm" label="Height" type="number" unit="cm" placeholder="175" /></div>
          <div className="client-form__col--half client-form__col--sm-4"><FormTextField control={control} name="weight_kg" label={editing ? 'Current weight' : 'Starting weight'} type="number" unit="kg" placeholder="80"/></div>
          <div className="client-form__col--sm-4">
            <div className="client-form__bmi">
              <span className="client-form__bmi-label">BMI</span><span className="client-form__bmi-value">{b ?? '—'}</span>
            </div>
          </div>
          <div className="client-form__col--sm-6"><FormSelect control={control} name="fitness_goal" label="Fitness goal" options={GOALS} required /></div>
          <div className="client-form__col--sm-6"><FormTextField control={control} name="target_weight_kg" label="Target weight" type="number" unit="kg" /></div>
          <div className="client-form__col--sm-6"><FormSelect control={control} name="activity_level" label="Activity level" options={ACTIVITY_LEVELS} emptyLabel="Not specified" /></div>
          <div className="client-form__col--sm-6"><FormSelect control={control} name="experience_level" label="Training experience" options={DIFFICULTIES} emptyLabel="Not specified" /></div>
          <div className="client-form__col--sm-6"><FormTextField control={control} name="workout_days_per_week" label="Workout days per week" type="number" placeholder="4" /></div>
          <div className="client-form__col--sm-6"><FormSelect control={control} name="preferred_workout_time" label="Preferred workout time" options={WORKOUT_TIMES} emptyLabel="No preference" /></div>
        </div>
      </div>

      <div hidden={step !== 2}>
        <div className="client-form__grid">
          <div className="client-form__col--sm-6"><FormSelect control={control} name="dietary_preference" label="Dietary preference" options={DIET_PREFS} emptyLabel="Not specified" /></div>
          <div className="client-form__col--half client-form__col--sm-3"><FormTextField control={control} name="sleep_hours" label="Sleep" type="number" unit="hrs" /></div>
          <div className="client-form__col--half client-form__col--sm-3"><FormTextField control={control} name="water_goal_ml" label="Water goal" type="number" unit="ml" /></div>
          <div className="client-form__col--sm-6"><FormTextField control={control} name="allergies" label="Food allergies" placeholder="e.g. Peanuts, lactose" /></div>
          <div className="client-form__col--sm-6"><FormTextField control={control} name="medical_conditions" label="Medical conditions" placeholder="e.g. Hypertension, PCOS" multiline minRows={2} /></div>
        </div>
      </div>

      <div hidden={step !== 3}>
        <div className="client-form__grid">
          {['super_admin', 'admin'].includes(user.role) && <div><FormAutocomplete control={control} name="trainer_id" label="Assigned trainer" options={trainerOptions} /></div>}
          <div className="client-form__col--sm-6"><FormSelect control={control} name="status" label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} required /></div>
          <div className="client-form__col--sm-6"><FormTextField control={control} name="joined_on" label="Joined on" type="date" InputLabelProps={{ shrink: true }} /></div>
          <div>
            <FormSection title="Client app access" description={hasLogin ? 'This client already has a login. Enter a new password below to reset it.' : 'Create a login so the client can see their plans, log workouts and message you.'}>
              {!hasLogin && <FormSwitch control={control} name="create_login" label="Create client login" />}
              {(createLogin || hasLogin) && <div className="client-form__password"><FormTextField control={control} name="password" label={hasLogin ? 'New password (optional)' : 'Temporary password'} type="password" required={!hasLogin} helperText="Min 8 characters incl. a letter and a number" autoComplete="new-password" /></div>}
            </FormSection>
          </div>
          <div>
            <hr className="divider client-form__divider" />
            <h3 className="client-form__summary-title">Summary</h3>
            <dl className="client-form__summary">
              {[['Name', values.full_name], ['Goal', labelOf(GOALS, values.fitness_goal)], ['Height', values.height_cm ? `${values.height_cm} cm` : '—'], ['Weight', values.weight_kg ? `${values.weight_kg} kg` : '—'], ['BMI', b ?? '—'], ['Email', values.email || '—']].map(([k, v]) => (
                <div className="client-form__summary-item" key={k}><dt className="client-form__summary-label">{k}</dt><dd className="client-form__summary-value">{v}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <div className="client-form__actions">
        <Button onClick={step === 0 ? onClose : () => setStep((s) => s - 1)} color="inherit">{step === 0 ? 'Cancel' : 'Back'}</Button>
        <div className="form-actions__end">
          {editing && step < 3 && <LoadingButton onClick={submit} loading={isSubmitting}>Save now</LoadingButton>}
          {step < 3 ? <Button variant="contained" onClick={next}>Continue</Button> : <LoadingButton variant="contained" onClick={submit} loading={isSubmitting}>{editing ? 'Save changes' : 'Create client'}</LoadingButton>}
        </div>
      </div>
    </FormDialog>
  );
}

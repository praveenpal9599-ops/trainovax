import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '@mui/material';
import FormDialog from '../../components/common/FormDialog';
import { FormTextField } from '../../components/form/FormFields';
import { optionalNumber } from '../../components/form/zod';
import { progressService } from '../../services';
import { useFeedback } from '../feedback/FeedbackProvider';
import { bmi, todayISO } from '../../utils/format';
import { useState } from 'react';
import './MeasurementDialog.css';

const FIELDS = ['weight_kg', 'chest_cm', 'waist_cm', 'arms_cm', 'thighs_cm', 'hips_cm', 'neck_cm', 'calves_cm', 'body_fat_pct'];
const schema = z.object({
  record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date is required'),
  weight_kg: optionalNumber(20, 400, 'Weight'),
  chest_cm: optionalNumber(0, 250, 'Chest'), waist_cm: optionalNumber(0, 250, 'Waist'), arms_cm: optionalNumber(0, 100, 'Arms'),
  thighs_cm: optionalNumber(0, 150, 'Thighs'), hips_cm: optionalNumber(0, 250, 'Hips'), neck_cm: optionalNumber(0, 100, 'Neck'), calves_cm: optionalNumber(0, 100, 'Calves'),
  body_fat_pct: optionalNumber(1, 70, 'Body fat'),
  notes: z.string().max(500).optional().nullable(),
}).refine((d) => FIELDS.some((k) => d[k] != null), { message: 'Enter at least one measurement', path: ['weight_kg'] });

/** Add / edit a progress measurement (the original 8 fields + neck, calves, notes). */
export default function MeasurementDialog({ open, onClose, clientId, heightCm, record, onSaved }) {
  const { notify } = useFeedback();
  const [error, setError] = useState(null);
  const defaults = { record_date: todayISO(), notes: '', ...Object.fromEntries(FIELDS.map((k) => [k, null])) };
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: defaults });
  const weight = useWatch({ control, name: 'weight_kg' });
  useEffect(() => { if (open) { setError(null); reset(record ? { ...defaults, ...Object.fromEntries(Object.entries(record).filter(([k]) => k in defaults)) } : defaults); } }, [open, record]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      const saved = record ? await progressService.update(record.id, { ...v, client_id: clientId }) : await progressService.create({ ...v, client_id: clientId });
      notify(record ? 'Measurement updated' : 'Measurement saved');
      onSaved?.(saved);
    } catch (err) { setError(err.message); }
  });
  const b = bmi(Number(weight), Number(heightCm));
  const f = (name, label, unit) => <div><FormTextField control={control} name={name} label={label} type="number" unit={unit} /></div>;

  return (
    <FormDialog open={open} onClose={onClose} title={record ? 'Edit measurement' : 'Add measurement'} onSubmit={submit} loading={isSubmitting} submitText="Save measurement">
      {error && <Alert severity="error" className="measurement-form__error">{error}</Alert>}
      <div className="measurement-form">
        <div className="measurement-form__grid">
          <div className="measurement-form__date"><FormTextField control={control} name="record_date" label="Date" type="date" required InputLabelProps={{ shrink: true }} /></div>
          {f('weight_kg', 'Weight', 'kg')}
          {f('body_fat_pct', 'Body fat', '%')}
          <div className="span-full"><span className="text-overline">Body measurements</span></div>
          {f('chest_cm', 'Chest', 'cm')}{f('waist_cm', 'Waist', 'cm')}{f('arms_cm', 'Arms', 'cm')}
          {f('thighs_cm', 'Thighs', 'cm')}{f('hips_cm', 'Hips', 'cm')}{f('neck_cm', 'Neck', 'cm')}
          {f('calves_cm', 'Calves', 'cm')}
          <div>
            <div className="measurement-form__bmi">
              <span className="text-small text-muted">BMI (auto)</span><span className="measurement-form__bmi-value">{b ?? '—'}</span>
            </div>
          </div>
          <div className="span-full"><FormTextField control={control} name="notes" label="Notes" multiline minRows={2} placeholder="How is the client feeling? Any observations?" /></div>
        </div>
      </div>
    </FormDialog>
  );
}

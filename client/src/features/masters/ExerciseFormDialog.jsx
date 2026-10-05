import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Autocomplete, TextField } from '@mui/material';
import FormDialog from '../../components/common/FormDialog';
import ImageUpload from '../../components/common/ImageUpload';
import { FormSelect, FormTextField } from '../../components/form/FormFields';
import { optionalNumber, requiredString } from '../../components/form/zod';
import { exerciseService, uploadService } from '../../services';
import { useLookups } from '../lookups/LookupsContext';
import { useFeedback } from '../feedback/FeedbackProvider';
import './masters.css';
import { DIFFICULTIES, EXERCISE_TYPES } from '../../utils/constants';

const schema = z.object({
  name: requiredString('Exercise name', 120),
  description: z.string().max(2000).optional().nullable(),
  category_id: z.number({ required_error: 'Select a category', invalid_type_error: 'Select a category' }),
  primary_muscle_id: z.number({ required_error: 'Select the primary muscle', invalid_type_error: 'Select the primary muscle' }),
  secondary_muscle_id: z.number().nullable().optional(),
  equipment: z.string().max(100).optional().nullable(),
  difficulty: z.string(),
  exercise_type: z.string(),
  instructions: z.string().max(5000).optional().nullable(),
  default_sets: optionalNumber(0, 50, 'Sets'),
  default_reps: z.string().max(20).optional().nullable(),
  default_duration_sec: optionalNumber(0, 86400, 'Duration'),
  default_rest_sec: optionalNumber(0, 3600, 'Rest'),
  video_url: z.union([z.literal(''), z.string().url('Enter a valid URL (https://…)')]).optional().nullable(),
  image_url: z.string().optional().nullable(),
  status: z.string(),
});
const blank = { name: '', description: '', category_id: null, primary_muscle_id: null, secondary_muscle_id: null, equipment: '', difficulty: 'beginner', exercise_type: 'reps', instructions: '', default_sets: 3, default_reps: '10-12', default_duration_sec: null, default_rest_sec: 60, video_url: '', image_url: null, status: 'active' };

export default function ExerciseFormDialog({ open, exercise, onClose, onSaved }) {
  const { exerciseCategories, muscleGroups, equipment, reload } = useLookups();
  const { notify } = useFeedback();
  const [error, setError] = useState(null);
  const { control, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: blank });
  useEffect(() => { if (open) { setError(null); reset(exercise ? { ...blank, ...Object.fromEntries(Object.entries(exercise).filter(([k]) => k in blank)) } : blank); } }, [open, exercise, reset]);
  const cat = exerciseCategories.map((c) => ({ value: c.id, label: c.name }));
  const mus = muscleGroups.map((c) => ({ value: c.id, label: c.name }));

  const submit = handleSubmit(async (v) => {
    setError(null);
    const payload = { ...v, video_url: v.video_url || null };
    try {
      const saved = exercise ? await exerciseService.update(exercise.id, payload) : await exerciseService.create(payload);
      notify(exercise ? 'Exercise updated' : 'Exercise added to the master');
      reload(); onSaved(saved);
    } catch (e) { setError(e.message); }
  });

  return (
    <FormDialog open={open} onClose={onClose} title={exercise ? 'Edit exercise' : 'Add exercise'} maxWidth="md" onSubmit={submit} loading={isSubmitting}>
      {error && <Alert severity="error" className="master-form__alert">{error}</Alert>}
      <div className="master-form">
        <div className="master-form__cell master-form__cell--sm-8"><FormTextField control={control} name="name" label="Exercise name" required placeholder="e.g. Goblet Squat" autoFocus /></div>
        <div className="master-form__cell master-form__cell--sm-4"><FormSelect control={control} name="status" label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></div>
        <div className="master-form__cell master-form__cell--sm-4"><FormSelect control={control} name="category_id" label="Category" options={cat} required /></div>
        <div className="master-form__cell master-form__cell--sm-4"><FormSelect control={control} name="primary_muscle_id" label="Muscle group" options={mus} required /></div>
        <div className="master-form__cell master-form__cell--sm-4"><FormSelect control={control} name="secondary_muscle_id" label="Secondary muscle" options={mus} emptyLabel="None" /></div>
        <div className="master-form__cell master-form__cell--sm-4">
          <Controller name="equipment" control={control} render={({ field }) => (
            <Autocomplete freeSolo options={equipment} value={field.value || ''} onInputChange={(_, v) => field.onChange(v)} renderInput={(p) => <TextField {...p} label="Equipment" placeholder="e.g. Dumbbells" />} />
          )} />
        </div>
        <div className="master-form__cell master-form__cell--xs-6 master-form__cell--sm-4"><FormSelect control={control} name="difficulty" label="Difficulty" options={DIFFICULTIES} /></div>
        <div className="master-form__cell master-form__cell--xs-6 master-form__cell--sm-4"><FormSelect control={control} name="exercise_type" label="Exercise type" options={EXERCISE_TYPES} /></div>
        <div className="master-form__cell master-form__cell--xs-6 master-form__cell--sm-3"><FormTextField control={control} name="default_sets" label="Default sets" type="number" /></div>
        <div className="master-form__cell master-form__cell--xs-6 master-form__cell--sm-3"><FormTextField control={control} name="default_reps" label="Default reps" placeholder="8-12" /></div>
        <div className="master-form__cell master-form__cell--xs-6 master-form__cell--sm-3"><FormTextField control={control} name="default_duration_sec" label="Duration" type="number" unit="sec" /></div>
        <div className="master-form__cell master-form__cell--xs-6 master-form__cell--sm-3"><FormTextField control={control} name="default_rest_sec" label="Rest" type="number" unit="sec" /></div>
        <div className="master-form__cell"><FormTextField control={control} name="description" label="Description" multiline minRows={2} placeholder="What is this exercise and what does it train?" /></div>
        <div className="master-form__cell"><FormTextField control={control} name="instructions" label="Instructions" multiline minRows={4} placeholder={'One step per line, e.g.\nStand with feet shoulder-width apart\nLower until thighs are parallel'} helperText="Shown to clients step-by-step" /></div>
        <div className="master-form__cell master-form__cell--sm-6"><FormTextField control={control} name="video_url" label="Video URL" placeholder="https://…" /></div>
        <div className="master-form__cell master-form__cell--sm-6"><ImageUpload value={watch('image_url')} label="Upload image" onUpload={async (file) => setValue('image_url', await uploadService.image(file))} /></div>
      </div>
    </FormDialog>
  );
}

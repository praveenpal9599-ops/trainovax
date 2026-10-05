import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '@mui/material';
import FormDialog from '../../components/common/FormDialog';
import { FormSelect, FormSwitch, FormTextField } from '../../components/form/FormFields';
import { requiredNumber, requiredString, optionalNumber } from '../../components/form/zod';
import { foodService } from '../../services';
import { useLookups } from '../lookups/LookupsContext';
import { useFeedback } from '../feedback/FeedbackProvider';
import './masters.css';

const schema = z.object({
  name: requiredString('Food name', 120),
  category_id: z.number({ required_error: 'Select a category', invalid_type_error: 'Select a category' }),
  serving_size: requiredNumber(0.1, 10000, 'Serving size'),
  serving_unit: requiredString('Unit', 20),
  calories: requiredNumber(0, 10000, 'Calories'),
  protein_g: optionalNumber(0, 1000, 'Protein'), carbs_g: optionalNumber(0, 1000, 'Carbs'), fat_g: optionalNumber(0, 1000, 'Fat'),
  fiber_g: optionalNumber(0, 1000, 'Fiber'), sugar_g: optionalNumber(0, 1000, 'Sugar'), sodium_mg: optionalNumber(0, 100000, 'Sodium'),
  is_vegetarian: z.boolean(), is_vegan: z.boolean(),
  allergens: z.string().max(255).optional().nullable(),
  status: z.string(),
});
const blank = { name: '', category_id: null, serving_size: 100, serving_unit: 'g', calories: null, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0, is_vegetarian: true, is_vegan: false, allergens: '', status: 'active' };
const UNITS = ['g', 'ml', 'piece', 'cup', 'tbsp', 'tsp', 'slice', 'scoop'].map((u) => ({ value: u, label: u }));

export default function FoodFormDialog({ open, food, onClose, onSaved }) {
  const { foodCategories } = useLookups();
  const { notify } = useFeedback();
  const [error, setError] = useState(null);
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: blank });
  useEffect(() => {
    if (!open) return;
    setError(null);
    reset(food ? { ...blank, ...Object.fromEntries(Object.entries(food).filter(([k]) => k in blank)), is_vegetarian: !!food.is_vegetarian, is_vegan: !!food.is_vegan } : blank);
  }, [open, food, reset]);

  const submit = handleSubmit(async (v) => {
    setError(null);
    const payload = { ...v, is_vegetarian: v.is_vegan ? true : v.is_vegetarian, protein_g: v.protein_g ?? 0, carbs_g: v.carbs_g ?? 0, fat_g: v.fat_g ?? 0, fiber_g: v.fiber_g ?? 0, sugar_g: v.sugar_g ?? 0, sodium_mg: v.sodium_mg ?? 0 };
    try { const saved = food ? await foodService.update(food.id, payload) : await foodService.create(payload); notify(food ? 'Food updated' : 'Food added'); onSaved(saved); } catch (e) { setError(e.message); }
  });
  const n = (name, label, unit) => <div className="master-form__cell master-form__cell--xs-6 master-form__cell--sm-4"><FormTextField control={control} name={name} label={label} type="number" unit={unit} /></div>;

  return (
    <FormDialog open={open} onClose={onClose} title={food ? 'Edit food' : 'Add food'} maxWidth="md" onSubmit={submit} loading={isSubmitting}>
      {error && <Alert severity="error" className="master-form__alert">{error}</Alert>}
      <div className="master-form">
        <div className="master-form__cell master-form__cell--sm-6"><FormTextField control={control} name="name" label="Food name" required placeholder="e.g. Moong Dal (cooked)" autoFocus /></div>
        <div className="master-form__cell master-form__cell--sm-3"><FormSelect control={control} name="category_id" label="Category" required options={foodCategories.map((c) => ({ value: c.id, label: c.name }))} /></div>
        <div className="master-form__cell master-form__cell--sm-3"><FormSelect control={control} name="status" label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></div>
        <div className="master-form__cell master-form__cell--xs-6 master-form__cell--sm-3"><FormTextField control={control} name="serving_size" label="Serving size" type="number" required /></div>
        <div className="master-form__cell master-form__cell--xs-6 master-form__cell--sm-3"><FormSelect control={control} name="serving_unit" label="Unit" options={UNITS} required /></div>
        <div className="master-form__cell"><span className="text-overline">Nutrition per serving</span></div>
        <div className="master-form__cell master-form__cell--xs-6 master-form__cell--sm-4"><FormTextField control={control} name="calories" label="Calories" type="number" unit="kcal" required /></div>
        {n('protein_g', 'Protein', 'g')}{n('carbs_g', 'Carbohydrates', 'g')}{n('fat_g', 'Fat', 'g')}{n('fiber_g', 'Fiber', 'g')}{n('sugar_g', 'Sugar', 'g')}{n('sodium_mg', 'Sodium', 'mg')}
        <div className="master-form__cell master-form__cell--sm-8"><FormTextField control={control} name="allergens" label="Allergens" placeholder="e.g. Milk, Gluten, Tree nuts" /></div>
        <div className="master-form__cell master-form__cell--xs-6"><FormSwitch control={control} name="is_vegetarian" label="Vegetarian" /></div>
        <div className="master-form__cell master-form__cell--xs-6"><FormSwitch control={control} name="is_vegan" label="Vegan" /></div>
      </div>
    </FormDialog>
  );
}

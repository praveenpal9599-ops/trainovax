export const APP_NAME = import.meta.env.VITE_APP_NAME || 'TrainovaX';

export const GOALS = [
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'strength_training', label: 'Strength Training' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'flexibility', label: 'Flexibility' },
];
export const GENDERS = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }];
export const DIFFICULTIES = [{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }];
export const EXERCISE_TYPES = [{ value: 'reps', label: 'Reps based' }, { value: 'time', label: 'Time based' }, { value: 'distance', label: 'Distance based' }];
export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', time: '08:00' },
  { value: 'mid_morning', label: 'Mid-Morning', time: '10:30' },
  { value: 'lunch', label: 'Lunch', time: '13:00' },
  { value: 'snack', label: 'Snack', time: '17:00' },
  { value: 'pre_workout', label: 'Pre-Workout', time: '17:30' },
  { value: 'post_workout', label: 'Post-Workout', time: '19:00' },
  { value: 'dinner', label: 'Dinner', time: '20:30' },
  { value: 'bedtime', label: 'Bedtime', time: '22:30' },
];
export const DIET_TYPES = [
  { value: 'vegetarian', label: 'Vegetarian' }, { value: 'non_vegetarian', label: 'Non-Vegetarian' }, { value: 'vegan', label: 'Vegan' },
  { value: 'eggetarian', label: 'Eggetarian' }, { value: 'mixed', label: 'Mixed' },
];
export const WEEKDAYS = [
  { value: 1, label: 'Monday', short: 'Mon' }, { value: 2, label: 'Tuesday', short: 'Tue' }, { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' }, { value: 5, label: 'Friday', short: 'Fri' }, { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 7, label: 'Sunday', short: 'Sun' },
];
export const PLAN_STATUSES = [
  { value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'completed', label: 'Completed' }, { value: 'archived', label: 'Archived' },
];
export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary' }, { value: 'light', label: 'Lightly active' }, { value: 'moderate', label: 'Moderately active' },
  { value: 'active', label: 'Active' }, { value: 'very_active', label: 'Very active' },
];
export const DIET_PREFS = [
  { value: 'vegetarian', label: 'Vegetarian' }, { value: 'non_vegetarian', label: 'Non-Vegetarian' }, { value: 'vegan', label: 'Vegan' }, { value: 'eggetarian', label: 'Eggetarian' },
];
export const WORKOUT_TIMES = [
  { value: 'early_morning', label: 'Early morning' }, { value: 'morning', label: 'Morning' }, { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' }, { value: 'night', label: 'Night' },
];
export const MEASUREMENTS = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg' },
  { key: 'body_fat_pct', label: 'Body Fat', unit: '%' },
  { key: 'chest_cm', label: 'Chest', unit: 'cm' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm' },
  { key: 'arms_cm', label: 'Arms', unit: 'cm' },
  { key: 'thighs_cm', label: 'Thighs', unit: 'cm' },
  { key: 'hips_cm', label: 'Hips', unit: 'cm' },
  { key: 'neck_cm', label: 'Neck', unit: 'cm' },
  { key: 'calves_cm', label: 'Calves', unit: 'cm' },
  { key: 'bmi', label: 'BMI', unit: '' },
];
export const RANGE_PRESETS = [
  { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' }, { value: '1y', label: '1 year' }, { value: 'all', label: 'All' }, { value: 'custom', label: 'Custom' },
];

export const labelOf = (list, value) => list.find((x) => x.value === value)?.label ?? (value ? String(value).replace(/_/g, ' ') : '—');

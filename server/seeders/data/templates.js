// Workout & diet templates. Exercise/food references use names from the master seed files.
// Workout exercise tuple: [exerciseName, sets, reps, durationSec, restSec, weightKg?, tempo?, notes?]

export const WORKOUT_TEMPLATES = [
  {
    name: 'Weight Loss Program', goal: 'weight_loss', difficulty: 'beginner', duration_weeks: 8,
    description: 'Six-day fat-loss programme mixing steady cardio, circuits and core work. Keep heart rate in zone 2–3 on cardio days.',
    days: [
      { dow: 1, name: 'Monday', focus: 'Lower body + cardio', ex: [['Treadmill Run', 1, null, 1200, 0], ['Bodyweight Squats', 3, '20', null, 60], ['Walking Lunges', 3, '12/leg', null, 60], ['Plank', 3, null, 45, 30]] },
      { dow: 2, name: 'Tuesday', focus: 'Upper body + HIIT', ex: [['Stationary Cycling', 1, null, 900, 0], ['Push Ups', 3, '12', null, 60], ['Burpees', 3, '10', null, 45], ['Mountain Climbers', 3, null, 40, 20]] },
      { dow: 3, name: 'Wednesday', focus: 'Core & mobility', ex: [['Cat-Cow Stretch', 2, '10', null, 15], ['Bicycle Crunches', 3, '20', null, 45], ['Plank', 3, null, 45, 30], ['Hip Flexor Stretch', 2, null, 45, 15]] },
      { dow: 4, name: 'Thursday', focus: 'Full-body circuit', ex: [['Kettlebell Swing', 4, '15', null, 60, 12], ['Lat Pulldown', 3, '12', null, 60, 30], ['Leg Press', 3, '12', null, 75, 60], ['Jump Rope', 5, null, 60, 30]] },
      { dow: 5, name: 'Friday', focus: 'HIIT conditioning', ex: [['Burpees', 4, '12', null, 45], ['Mountain Climbers', 4, null, 40, 20], ['Jump Rope', 4, null, 60, 30], ['Bicycle Crunches', 3, '20', null, 45]] },
      { dow: 6, name: 'Saturday', focus: 'Long cardio + stretch', ex: [['Treadmill Run', 1, null, 1800, 0], ["World's Greatest Stretch", 2, '5/side', null, 15]] },
    ],
  },
  {
    name: 'Muscle Gain – Push / Pull / Legs', goal: 'muscle_gain', difficulty: 'intermediate', duration_weeks: 12,
    description: 'Classic PPL split run twice per week. Add weight or reps each week (progressive overload).',
    days: [
      { dow: 1, name: 'Push A', focus: 'Chest, shoulders, triceps', ex: [['Barbell Bench Press', 4, '8-10', null, 120, 60, '3-1-1'], ['Incline Dumbbell Press', 3, '10-12', null, 90, 22], ['Overhead Shoulder Press', 3, '8-12', null, 90, 16], ['Lateral Raises', 3, '15', null, 60, 8], ['Tricep Rope Pushdown', 3, '12-15', null, 60, 25]] },
      { dow: 2, name: 'Pull A', focus: 'Back & biceps', ex: [['Pull Ups', 4, '6-10', null, 120], ['Bent Over Barbell Row', 4, '8-10', null, 90, 50], ['Lat Pulldown', 3, '10-12', null, 75, 50], ['Barbell Bicep Curl', 3, '10-12', null, 60, 25]] },
      { dow: 3, name: 'Legs A', focus: 'Quads, glutes, hamstrings', ex: [['Barbell Back Squat', 4, '6-8', null, 150, 80, '3-1-1'], ['Romanian Deadlift', 3, '10', null, 90, 24], ['Leg Press', 3, '12', null, 90, 140], ['Standing Calf Raises', 4, '15', null, 45, 40]] },
      { dow: 4, name: 'Push B', focus: 'Shoulder emphasis', ex: [['Overhead Shoulder Press', 4, '8', null, 120, 18], ['Incline Dumbbell Press', 3, '10', null, 90, 24], ['Push Ups', 3, '15', null, 60], ['Lateral Raises', 4, '15', null, 45, 8]] },
      { dow: 5, name: 'Pull B', focus: 'Back thickness', ex: [['Deadlift', 4, '5', null, 180, 110], ['Lat Pulldown', 3, '12', null, 75, 55], ['Barbell Bicep Curl', 3, '12', null, 60, 25], ['Hanging Leg Raises', 3, '12', null, 60]] },
      { dow: 6, name: 'Legs B', focus: 'Glutes & posterior chain', ex: [['Hip Thrust', 4, '10', null, 90, 80], ['Walking Lunges', 3, '12/leg', null, 75, 14], ['Romanian Deadlift', 3, '12', null, 90, 26], ['Standing Calf Raises', 4, '20', null, 45, 40]] },
    ],
  },
  {
    name: 'Strength Foundations 5×5', goal: 'strength_training', difficulty: 'intermediate', duration_weeks: 10,
    description: 'Three heavy full-body sessions per week built around the big lifts. Rest 2–3 minutes between work sets.',
    days: [
      { dow: 1, name: 'Day A', focus: 'Squat · Bench · Row', ex: [['Barbell Back Squat', 5, '5', null, 180, 90], ['Barbell Bench Press', 5, '5', null, 180, 65], ['Bent Over Barbell Row', 5, '5', null, 150, 55], ['Plank', 3, null, 60, 30]] },
      { dow: 3, name: 'Day B', focus: 'Squat · Press · Deadlift', ex: [['Barbell Back Squat', 5, '5', null, 180, 90], ['Overhead Shoulder Press', 5, '5', null, 150, 20], ['Deadlift', 1, '5', null, 240, 120], ['Hanging Leg Raises', 3, '10', null, 60]] },
      { dow: 5, name: 'Day A (heavy)', focus: 'Squat · Bench · Row', ex: [['Barbell Back Squat', 5, '5', null, 180, 92.5], ['Barbell Bench Press', 5, '5', null, 180, 67.5], ['Bent Over Barbell Row', 5, '5', null, 150, 57.5], ['Hip Thrust', 3, '8', null, 90, 90]] },
    ],
  },
  {
    name: 'Beginner Full Body', goal: 'general_fitness', difficulty: 'beginner', duration_weeks: 6,
    description: 'Three simple full-body sessions to learn the key movement patterns and build a habit.',
    days: [
      { dow: 1, name: 'Monday', focus: 'Full body', ex: [['Leg Press', 3, '12', null, 90, 40], ['Lat Pulldown', 3, '12', null, 75, 25], ['Push Ups', 3, '10', null, 60], ['Plank', 3, null, 30, 30], ['Stationary Cycling', 1, null, 600, 0]] },
      { dow: 3, name: 'Wednesday', focus: 'Full body', ex: [['Bodyweight Squats', 3, '15', null, 60], ['Overhead Shoulder Press', 3, '10', null, 75, 6], ['Romanian Deadlift', 3, '12', null, 75, 10], ['Bicycle Crunches', 3, '15', null, 45], ['Treadmill Run', 1, null, 600, 0]] },
      { dow: 5, name: 'Friday', focus: 'Full body + mobility', ex: [['Walking Lunges', 3, '10/leg', null, 60], ['Incline Dumbbell Press', 3, '12', null, 75, 8], ['Kettlebell Swing', 3, '12', null, 60, 8], ["World's Greatest Stretch", 2, '5/side', null, 15], ['Cat-Cow Stretch', 2, '10', null, 15]] },
    ],
  },
  {
    name: 'HIIT & Endurance Conditioning', goal: 'endurance', difficulty: 'intermediate', duration_weeks: 8,
    description: 'Builds aerobic base and work capacity with intervals, circuits and long steady sessions.',
    days: [
      { dow: 1, name: 'Intervals', focus: 'Treadmill intervals', ex: [['Treadmill Run', 1, null, 1500, 0, null, null, '1 min fast / 1 min easy'], ['Mountain Climbers', 4, null, 40, 20], ['Plank', 3, null, 60, 30]] },
      { dow: 2, name: 'Circuit', focus: 'Full-body circuit', ex: [['Burpees', 4, '15', null, 45], ['Kettlebell Swing', 4, '20', null, 45, 16], ['Jump Rope', 5, null, 90, 30], ['Bicycle Crunches', 3, '25', null, 30]] },
      { dow: 4, name: 'Tempo', focus: 'Bike tempo + legs', ex: [['Stationary Cycling', 1, null, 1800, 0], ['Walking Lunges', 3, '15/leg', null, 60], ['Standing Calf Raises', 3, '20', null, 45]] },
      { dow: 6, name: 'Long Session', focus: 'Aerobic base', ex: [['Treadmill Run', 1, null, 2700, 0], ['Hip Flexor Stretch', 2, null, 60, 15], ["World's Greatest Stretch", 2, '5/side', null, 15]] },
    ],
  },
];

// Diet meal: { type, name, time, foods: [[foodName, quantity(servings), notes?]] }
export const DIET_TEMPLATES = [
  {
    name: 'Weight Loss Plan', goal: 'weight_loss', diet_type: 'mixed', target_calories: 1600,
    description: 'Moderate calorie deficit with high protein to preserve muscle. Drink 3 L of water daily.',
    meals: [
      { type: 'breakfast', name: 'Breakfast', time: '08:00', foods: [['Rolled Oats', 1], ['Boiled Egg', 2], ['Banana', 1]] },
      { type: 'lunch', name: 'Lunch', time: '13:00', foods: [['Brown Rice (cooked)', 1], ['Grilled Chicken Breast', 1], ['Green Salad', 1]] },
      { type: 'snack', name: 'Evening Snack', time: '17:00', foods: [['Greek Yogurt (plain, low-fat)', 1], ['Almonds', 0.5]] },
      { type: 'dinner', name: 'Dinner', time: '20:30', foods: [['Paneer', 0.75], ['Mixed Vegetable Sabzi', 1]] },
    ],
  },
  {
    name: 'Lean Muscle Gain', goal: 'muscle_gain', diet_type: 'non_vegetarian', target_calories: 2700,
    description: 'Calorie surplus of ~300 kcal with 1.8–2 g protein per kg body weight. Time carbs around training.',
    meals: [
      { type: 'breakfast', name: 'Breakfast', time: '07:30', foods: [['Rolled Oats', 2], ['Toned Milk', 1], ['Boiled Egg', 3], ['Banana', 1]] },
      { type: 'mid_morning', name: 'Mid-Morning', time: '10:30', foods: [['Peanut Butter', 1], ['Multigrain Bread', 1]] },
      { type: 'lunch', name: 'Lunch', time: '13:30', foods: [['White Rice (cooked)', 1.5], ['Chicken Curry', 1], ['Green Salad', 1]] },
      { type: 'post_workout', name: 'Post-Workout', time: '18:30', foods: [['Whey Protein', 1], ['Banana', 1]] },
      { type: 'dinner', name: 'Dinner', time: '21:00', foods: [['Whole Wheat Roti', 3], ['Grilled Salmon', 1], ['Steamed Broccoli', 1]] },
    ],
  },
  {
    name: 'Vegetarian Fat Loss (Indian)', goal: 'weight_loss', diet_type: 'vegetarian', target_calories: 1500,
    description: 'High-fibre Indian vegetarian plan built on dal, paneer, curd and sabzi.',
    meals: [
      { type: 'breakfast', name: 'Breakfast', time: '08:00', foods: [['Vegetable Poha', 1], ['Curd (Dahi)', 1]] },
      { type: 'lunch', name: 'Lunch', time: '13:00', foods: [['Whole Wheat Roti', 2], ['Moong Dal (cooked)', 1], ['Palak (Spinach) Sabzi', 1], ['Green Salad', 1]] },
      { type: 'snack', name: 'Snack', time: '17:00', foods: [['Roasted Makhana', 1], ['Green Tea', 1]] },
      { type: 'dinner', name: 'Dinner', time: '20:00', foods: [['Paneer', 0.75], ['Mixed Vegetable Sabzi', 1], ['Buttermilk (Chaas)', 1]] },
    ],
  },
  {
    name: 'Vegan Balanced', goal: 'general_fitness', diet_type: 'vegan', target_calories: 2000,
    description: 'Plant-based plan with complete proteins from tofu, soya, legumes and seeds.',
    meals: [
      { type: 'breakfast', name: 'Breakfast', time: '08:00', foods: [['Rolled Oats', 1.5], ['Chia Seeds', 1], ['Mixed Berries', 1], ['Plant Protein (Pea)', 1]] },
      { type: 'lunch', name: 'Lunch', time: '13:00', foods: [['Quinoa (cooked)', 1], ['Chole (Chickpea Curry)', 1], ['Green Salad', 1]] },
      { type: 'snack', name: 'Snack', time: '16:30', foods: [['Hummus', 1], ['Apple', 1], ['Pumpkin Seeds', 0.5]] },
      { type: 'dinner', name: 'Dinner', time: '20:00', foods: [['Tofu (firm)', 1.5], ['Brown Rice (cooked)', 1], ['Steamed Broccoli', 1]] },
    ],
  },
  {
    name: 'Performance & Endurance Fuel', goal: 'endurance', diet_type: 'eggetarian', target_calories: 2400,
    description: 'Carb-forward plan to fuel endurance training and recovery, with eggs and dairy for protein.',
    meals: [
      { type: 'breakfast', name: 'Breakfast', time: '07:00', foods: [['Masala Omelette (2 eggs)', 1], ['Multigrain Bread', 1], ['Orange', 1]] },
      { type: 'pre_workout', name: 'Pre-Workout', time: '10:00', foods: [['Banana', 1], ['Black Coffee', 1]] },
      { type: 'lunch', name: 'Lunch', time: '13:30', foods: [['White Rice (cooked)', 1.5], ['Rajma Curry', 1], ['Curd (Dahi)', 1]] },
      { type: 'snack', name: 'Snack', time: '17:00', foods: [['Coconut Water', 1], ['Sprouts Salad', 1]] },
      { type: 'dinner', name: 'Dinner', time: '20:30', foods: [['Whole Wheat Roti', 2], ['Paneer', 0.75], ['Boiled Sweet Potato', 1]] },
    ],
  },
];

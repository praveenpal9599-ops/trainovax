// Food master seed — nutrition values are per serving, based on common reference values.
// Created for TrainovaX; not extracted from the original reference site.
import { INDIAN_FOODS, EXTRA_FOOD_CATEGORIES } from './foodsIndia.js';

const BASE_FOOD_CATEGORIES = ['Grains', 'Fruits', 'Vegetables', 'Dairy', 'Meat', 'Fish', 'Eggs', 'Nuts', 'Seeds', 'Legumes', 'Beverages', 'Snacks', 'Supplements'];

// [name, category, servingSize, unit, kcal, protein, carbs, fat, fiber, sugar, sodiumMg, veg, vegan, allergens]
const BASE_FOODS = [
  ['Rolled Oats', 'Grains', 40, 'g', 150, 5, 27, 2.5, 4, 0.5, 2, 1, 1, 'Gluten (may contain)'],
  ['Brown Rice (cooked)', 'Grains', 150, 'g', 165, 3.5, 34, 1.3, 2.7, 0.5, 8, 1, 1, null],
  ['White Rice (cooked)', 'Grains', 150, 'g', 195, 4, 42, 0.4, 0.6, 0.1, 2, 1, 1, null],
  ['Whole Wheat Roti', 'Grains', 40, 'g', 120, 3.5, 20, 3, 3, 0.4, 10, 1, 1, 'Gluten'],
  ['Quinoa (cooked)', 'Grains', 150, 'g', 180, 6.6, 32, 2.9, 4.2, 1.3, 10, 1, 1, null],
  ['Multigrain Bread', 'Grains', 60, 'g', 160, 7, 26, 2.5, 4, 3, 260, 1, 1, 'Gluten'],
  ['Vegetable Poha', 'Grains', 150, 'g', 180, 3.5, 32, 4.5, 2, 1.5, 250, 1, 1, 'Peanuts (may contain)'],
  ['Banana', 'Fruits', 118, 'g', 105, 1.3, 27, 0.4, 3.1, 14.4, 1, 1, 1, null],
  ['Apple', 'Fruits', 182, 'g', 95, 0.5, 25, 0.3, 4.4, 19, 2, 1, 1, null],
  ['Papaya', 'Fruits', 150, 'g', 65, 0.7, 16, 0.4, 2.5, 11.7, 12, 1, 1, null],
  ['Orange', 'Fruits', 131, 'g', 62, 1.2, 15.4, 0.2, 3.1, 12.2, 0, 1, 1, null],
  ['Mixed Berries', 'Fruits', 100, 'g', 57, 0.7, 14, 0.3, 2.4, 10, 1, 1, 1, null],
  ['Green Salad', 'Vegetables', 150, 'g', 35, 2, 7, 0.3, 2.5, 3.5, 30, 1, 1, null],
  ['Steamed Broccoli', 'Vegetables', 100, 'g', 35, 2.4, 7.2, 0.4, 3.3, 1.4, 41, 1, 1, null],
  ['Mixed Vegetable Sabzi', 'Vegetables', 150, 'g', 120, 3, 14, 6, 4, 5, 350, 1, 1, null],
  ['Palak (Spinach) Sabzi', 'Vegetables', 150, 'g', 95, 4, 8, 5.5, 3.5, 1.5, 280, 1, 1, null],
  ['Boiled Sweet Potato', 'Vegetables', 150, 'g', 130, 2.4, 30, 0.2, 4.5, 9, 55, 1, 1, null],
  ['Greek Yogurt (plain, low-fat)', 'Dairy', 170, 'g', 100, 17, 6, 0.7, 0, 6, 60, 1, 0, 'Milk'],
  ['Paneer', 'Dairy', 100, 'g', 265, 18, 3.5, 20, 0, 2.6, 20, 1, 0, 'Milk'],
  ['Toned Milk', 'Dairy', 250, 'ml', 145, 8, 12, 7.5, 0, 12, 110, 1, 0, 'Milk'],
  ['Curd (Dahi)', 'Dairy', 150, 'g', 90, 5, 7, 4.5, 0, 7, 50, 1, 0, 'Milk'],
  ['Grilled Chicken Breast', 'Meat', 150, 'g', 248, 46.5, 0, 5.4, 0, 0, 110, 0, 0, null],
  ['Chicken Curry', 'Meat', 200, 'g', 290, 28, 8, 16, 1.5, 3, 600, 0, 0, null],
  ['Lean Mutton (cooked)', 'Meat', 100, 'g', 250, 26, 0, 16, 0, 0, 72, 0, 0, null],
  ['Grilled Salmon', 'Fish', 150, 'g', 310, 33, 0, 19, 0, 0, 90, 0, 0, 'Fish'],
  ['Rohu Fish Curry', 'Fish', 200, 'g', 260, 26, 6, 14, 1, 2, 550, 0, 0, 'Fish'],
  ['Boiled Egg', 'Eggs', 50, 'g', 78, 6.3, 0.6, 5.3, 0, 0.6, 62, 0, 0, 'Eggs'],
  ['Egg Whites', 'Eggs', 132, 'g', 68, 14.4, 1, 0.2, 0, 1, 220, 0, 0, 'Eggs'],
  ['Masala Omelette (2 eggs)', 'Eggs', 130, 'g', 190, 13, 3, 14, 0.7, 1.5, 320, 0, 0, 'Eggs'],
  ['Almonds', 'Nuts', 28, 'g', 164, 6, 6, 14, 3.5, 1.2, 0, 1, 1, 'Tree nuts'],
  ['Walnuts', 'Nuts', 28, 'g', 185, 4.3, 3.9, 18.5, 1.9, 0.7, 1, 1, 1, 'Tree nuts'],
  ['Peanut Butter', 'Nuts', 32, 'g', 190, 7, 8, 16, 2, 3, 140, 1, 1, 'Peanuts'],
  ['Chia Seeds', 'Seeds', 15, 'g', 73, 2.5, 6.3, 4.6, 5.2, 0, 2, 1, 1, null],
  ['Flax Seeds', 'Seeds', 10, 'g', 53, 1.8, 2.9, 4.2, 2.7, 0.2, 3, 1, 1, null],
  ['Pumpkin Seeds', 'Seeds', 28, 'g', 158, 8.5, 3, 13.9, 1.7, 0.4, 2, 1, 1, null],
  ['Moong Dal (cooked)', 'Legumes', 150, 'g', 170, 10, 26, 3.5, 6, 2, 300, 1, 1, null],
  ['Rajma Curry', 'Legumes', 150, 'g', 210, 11, 32, 4, 9, 2, 400, 1, 1, null],
  ['Chole (Chickpea Curry)', 'Legumes', 150, 'g', 240, 11, 36, 6, 9, 5, 450, 1, 1, null],
  ['Sprouts Salad', 'Legumes', 100, 'g', 90, 7, 15, 0.5, 4, 3, 150, 1, 1, null],
  ['Tofu (firm)', 'Legumes', 100, 'g', 144, 17, 3, 9, 2.3, 0.6, 14, 1, 1, 'Soy'],
  ['Soya Chunks (dry)', 'Legumes', 30, 'g', 104, 15.6, 9.9, 0.2, 3.9, 0, 3, 1, 1, 'Soy'],
  ['Black Coffee', 'Beverages', 240, 'ml', 2, 0.3, 0, 0, 0, 0, 5, 1, 1, null],
  ['Green Tea', 'Beverages', 240, 'ml', 2, 0, 0, 0, 0, 0, 2, 1, 1, null],
  ['Coconut Water', 'Beverages', 240, 'ml', 46, 1.7, 9, 0.5, 2.6, 6.3, 252, 1, 1, null],
  ['Buttermilk (Chaas)', 'Beverages', 250, 'ml', 40, 2.5, 5, 1, 0, 5, 300, 1, 0, 'Milk'],
  ['Roasted Makhana', 'Snacks', 30, 'g', 105, 2.9, 23, 0.3, 4.3, 0, 150, 1, 1, null],
  ['Hummus', 'Snacks', 50, 'g', 83, 4, 7, 5, 3, 0.2, 190, 1, 1, 'Sesame'],
  ['Dark Chocolate (70%)', 'Snacks', 20, 'g', 120, 1.6, 9, 8.5, 2.2, 5, 4, 1, 0, 'Milk (may contain)'],
  ['Whey Protein', 'Supplements', 32, 'g', 120, 24, 3, 1.5, 0, 2, 50, 1, 0, 'Milk'],
  ['Plant Protein (Pea)', 'Supplements', 33, 'g', 120, 24, 2, 2, 1, 0, 290, 1, 1, null],
];

export const FOOD_CATEGORIES = [...BASE_FOOD_CATEGORIES, ...EXTRA_FOOD_CATEGORIES];
export const FOODS = [...BASE_FOODS, ...INDIAN_FOODS];

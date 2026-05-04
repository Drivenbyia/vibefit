import { dayTypeFromKey } from '../utils/dateUtils.js';

export const emptyDay = () => ({
  typeOverride: null,
  intake: { kcal: '', protein: '', carbs: '', fat: '' },
  expenditure: { kcal: '', steps: '' },
  workout: null,
  waist: '',
  weight: '',
  notes: '',
});

export const dayType = (key, day) => day?.typeOverride || dayTypeFromKey(key);

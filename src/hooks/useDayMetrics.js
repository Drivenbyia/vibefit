import { num } from '../utils/mathUtils.js';
import { dayType } from '../models/day.js';

/**
 * Dérive les métriques d'une journée pour TodayView :
 * cibles du jour, totaux saisis, alertes de cohérence macro et de sous-alimentation.
 */
export function useDayMetrics(dateKey, day, targets) {
  const t = dayType(dateKey, day);
  const dt = targets[t];
  const intake = num(day.intake.kcal);
  const expenditure = num(day.expenditure.kcal);
  const steps = num(day.expenditure.steps);
  const isMonday = new Date(dateKey + 'T12:00:00').getDay() === 1;

  const computedKcal = num(day.intake.protein) * 4 + num(day.intake.carbs) * 4 + num(day.intake.fat) * 9;
  const macroDelta = Math.abs(computedKcal - intake);

  return {
    dt,
    intake,
    expenditure,
    steps,
    isMonday,
    computedKcal,
    macroDelta,
    showMacroWarning: intake > 0 && computedKcal > 0 && macroDelta > 100,
    showUndereatAlert: intake > 0 && intake < 1600,
  };
}
